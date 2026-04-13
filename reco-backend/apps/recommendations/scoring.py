"""
Recommendation Scoring Engine for Bsharp Reco.

Implements the weighted scoring pipeline described in FSD Section 9
and Architecture Section 11:

    Score = SUM(Feature_Weight * Feature_Fit) for all features

Pipeline:
    1. Load default weights from scoring_configs (per packet)
    2. Adjust weights based on voice tags
    3. Adjust weights based on session answers via benefit_mappings
    4. Calculate base score per product
    5. Apply hard filters (disqualify products)
    6. Apply geography modifiers (from outlet zone)
    7. Apply moderation overrides (campaign boosts, suppression, push)
    8. Apply feedback pattern context
    9. Rank and apply diversity rules (avoid all 3 from same family)
   10. Return top 3

Handles missing dependencies gracefully — packets/products models
may not exist yet (Phase 12).
"""
import logging
from collections import defaultdict

from apps.sessions_app.models import CustomerSession, SessionAnswer
from apps.recommendations.fit_profiles import (
    build_requirement_profile,
    compute_right_sized_performance_fit,
    compute_session_value_for_money,
)
from apps.recommendations.preference_inference import (
    infer_answer_score_effect,
    infer_tag_weight_adjustments,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Safe imports — packets models may not exist yet (Phase 12)
# ---------------------------------------------------------------------------
try:
    from apps.packets.models import (
        Product,
        Feature,
        FeatureValue,
        BenefitMapping,
        ScoringConfig,
    )
    PACKETS_AVAILABLE = True
except (ImportError, Exception):
    PACKETS_AVAILABLE = False
    logger.info(
        'packets models not available yet — scoring will use stub data'
    )

# ---------------------------------------------------------------------------
# Safe imports — moderation models may not exist yet (Phase 14)
# ---------------------------------------------------------------------------
try:
    from apps.moderation.models import ModerationRule
    MODERATION_AVAILABLE = True
except (ImportError, Exception):
    MODERATION_AVAILABLE = False

# ---------------------------------------------------------------------------
# Safe imports — feedback models may not exist yet
# ---------------------------------------------------------------------------
try:
    from apps.feedback.models import FeedbackPattern
    FEEDBACK_AVAILABLE = True
except (ImportError, Exception):
    FEEDBACK_AVAILABLE = False


class RecommendationScorer:
    """
    Runs the full scoring pipeline for a customer session.

    Usage:
        scorer = RecommendationScorer(session_id)
        results = scorer.calculate_scores()
        # results is a list of dicts sorted by rank, top 3
    """

    TOP_N = 3  # Number of recommendations to return
    DERIVED_FEATURE_DEFAULT_WEIGHTS = {
        'price': 0.0,
        'capability': 0.0,
        'compactness': 0.0,
        'large_display': 0.0,
        'portability': 0.0,
        'value_for_money': 0.0,
        'everyday_fit': 0.0,
        'creative_headroom': 0.0,
        'right_sized_performance': 0.0,
        'performance_overkill_risk': 0.0,
        'performance_undershoot_risk': 0.0,
    }

    def _weight_floor_for_feature(self, feature_code):
        return self.DERIVED_FEATURE_DEFAULT_WEIGHTS.get(feature_code, 0.5)

    def __init__(self, session_id):
        self.session_id = session_id
        self.session = CustomerSession.objects.get(pk=session_id)
        self.answers = list(
            SessionAnswer.objects.filter(session=self.session)
            .order_by('created_at')
        )
        self.voice_tags = self._extract_voice_tags()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def calculate_scores(self, top_n=None):
        """
        Execute the full 10-step scoring pipeline.

        Returns:
            list[dict]: Ranked product results, each containing:
                - product_id (int)
                - product_name (str)
                - rank (int, 1-based)
                - final_score (float)
                - match_percentage (int, 0-100)
                - scoring_breakdown (dict)
                - product_family (str)
        """
        # Step 1: Load default weights from scoring_configs
        default_weights = self._load_default_weights()

        # Step 2: Adjust weights from voice tags
        weights = self._apply_voice_tag_adjustments(default_weights)

        # Step 3: Adjust weights from session answers / benefit mappings
        weights = self._apply_answer_adjustments(weights)

        # Step 4: Load products and calculate base scores
        products = self._load_products()
        if not products:
            logger.warning(
                'No products available for session %s — returning empty results',
                self.session_id,
            )
            return []

        self.requirement_profile = build_requirement_profile(
            answer_texts=[answer.answer_value for answer in self.answers if answer.answer_value],
            voice_tags=self.voice_tags,
            weights=weights,
        )
        products = self._apply_requirement_profile(products)

        scored = self._calculate_base_scores(products, weights)

        # Step 5: Hard filters — disqualify products
        scored = self._apply_hard_filters(scored)

        # Step 6: Geography modifiers
        scored = self._apply_geography_modifiers(scored)

        # Step 7: Moderation overrides (campaign boosts, suppression, push)
        scored = self._apply_moderation_overrides(scored)

        # Step 8: Feedback pattern context
        scored = self._apply_feedback_patterns(scored)

        # Step 9: Rank and apply diversity rules
        limit = top_n or self.TOP_N
        ranked = self._rank_with_diversity(scored)

        # Step 10: Return top N
        return ranked[:limit]

    # ------------------------------------------------------------------
    # Step helpers
    # ------------------------------------------------------------------

    def _extract_voice_tags(self):
        """
        Extract preference tags from voice-sourced answers.

        Voice answers carry free-form customer statements; their
        score_effect JSON may contain extracted tags.
        """
        tags = []
        for answer in self.answers:
            if answer.from_voice and answer.score_effect:
                effect = answer.score_effect
                if isinstance(effect, dict) and 'tags' in effect:
                    tags.extend(effect['tags'])
                elif isinstance(effect, list):
                    tags.extend(effect)
        return tags

    def _load_default_weights(self):
        """
        Load default feature weights from scoring_configs for this
        session's packet.

        Returns a dict mapping feature_code -> weight (float).
        Falls back to empty dict if packets not available.
        """
        if not PACKETS_AVAILABLE:
            return {}

        try:
            if self.session.packet_id:
                config = ScoringConfig.objects.get(packet_id=self.session.packet_id)
            else:
                config = ScoringConfig.objects.order_by('packet_id').first()
                if config is None:
                    return {}
            weights = config.default_weights or {}
            return dict(weights)  # ensure mutable copy
        except ScoringConfig.DoesNotExist:
            logger.warning(
                'No scoring config for packet %s', self.session.packet_id,
            )
            return {}
        except Exception as e:
            logger.warning('Error loading scoring config: %s', e)
            return {}

    def _apply_voice_tag_adjustments(self, weights):
        """
        Voice tags adjust feature weights. Tags with a category that
        maps to a known feature dimension get a weight boost.

        Tag categories (from tag_extractor): usage, portability,
        screen-size, priority, features, budget, brand-preference,
        performance.
        """
        weights = dict(weights)  # work on a copy

        for tag in self.voice_tags:
            if isinstance(tag, dict):
                category = tag.get('category', '')
                tag_text = tag.get('text') or tag.get('tag') or ''
                confidence = float(tag.get('confidence', 0.5) or 0.5)
            else:
                category = ''
                tag_text = str(tag)
                confidence = 0.5

            boosts = infer_tag_weight_adjustments(str(tag_text), str(category), confidence)
            for feature_code, boost_amount in boosts.items():
                current = weights.get(feature_code, self._weight_floor_for_feature(feature_code))
                weights[feature_code] = max(0.0, min(1.5, current + boost_amount))

        return weights

    def _apply_answer_adjustments(self, weights):
        """
        Each session answer may carry a score_effect that maps to
        benefit_mappings. Apply those weight adjustments.
        """
        weights = dict(weights)

        for answer in self.answers:
            if answer.from_voice:
                continue  # voice tags handled separately

            inferred_effect = infer_answer_score_effect(
                answer.question_text,
                answer.answer_value,
            )
            stored_effect = answer.score_effect if isinstance(answer.score_effect, dict) else {}
            effect = {
                'weight_adjustments': inferred_effect.get('weight_adjustments', {}),
                'hard_filters': stored_effect.get('hard_filters', {}) or inferred_effect.get('hard_filters', {}),
            }

            if effect and isinstance(effect, dict):
                adjustments = effect.get('weight_adjustments', {})
                for feature_code, delta in adjustments.items():
                    current = weights.get(feature_code, self._weight_floor_for_feature(feature_code))
                    weights[feature_code] = max(0.0, min(1.5, current + float(delta)))

        # Also apply benefit_mappings from the packet (if available)
        if PACKETS_AVAILABLE and self.session.packet_id:
            try:
                mappings = BenefitMapping.objects.filter(
                    packet_id=self.session.packet_id,
                )
                for mapping in mappings:
                    # Check if any answer mentions this benefit
                    benefit_name = mapping.benefit_name.lower()
                    for answer in self.answers:
                        if benefit_name in answer.answer_value.lower():
                            code = mapping.feature_code
                            impact = float(mapping.weight_impact)
                            current = weights.get(code, 0.5)
                            weights[code] = max(
                                0.0, min(1.0, current + impact),
                            )
            except Exception as e:
                logger.warning('Error applying benefit mappings: %s', e)

        combined_answers = " ".join(
            str(answer.answer_value or "").lower() for answer in self.answers if not answer.from_voice
        )
        if (
            "best fit for today" in combined_answers
            or "just regular student or office use" in combined_answers
        ):
            weights['processor'] = min(weights.get('processor', 0.66), 0.72)
            weights['ram'] = min(weights.get('ram', 0.56), 0.68)
            weights['graphics'] = min(weights.get('graphics', 0.28), 0.18)
            weights['creative_headroom'] = min(weights.get('creative_headroom', 0.26), 0.24)
            weights['build_quality'] = min(weights.get('build_quality', 0.42), 0.55)
            weights['price'] = max(weights.get('price', 0.64), 1.25)
            weights['value_for_money'] = max(weights.get('value_for_money', 0.62), 1.3)
            weights['everyday_fit'] = max(weights.get('everyday_fit', 0.6), 1.15)
            weights['right_sized_performance'] = max(weights.get('right_sized_performance', 0.22), 1.2)

        if "room to grow over time" in combined_answers:
            weights['processor'] = max(weights.get('processor', 0.66), 0.9)
            weights['ram'] = max(weights.get('ram', 0.56), 0.86)
            weights['graphics'] = max(weights.get('graphics', 0.28), 0.32)
            weights['creative_headroom'] = max(weights.get('creative_headroom', 0.26), 0.7)
            weights['right_sized_performance'] = min(weights.get('right_sized_performance', 0.22), 0.4)

        return weights

    def _load_products(self):
        """
        Load products for this session's packet.

        Returns list of dicts: [{product_id, product_name, family, features: {code: value}}]
        Falls back to stub data when packets models are not available.
        """
        if not PACKETS_AVAILABLE:
            return self._get_stub_products()

        try:
            # If session has a packet_id, filter by it; otherwise load all products for the tenant
            if self.session.packet_id:
                products = Product.objects.filter(packet_id=self.session.packet_id)
            else:
                # Fallback: load products from any packet belonging to this tenant (cmid)
                from apps.packets.models import Packet
                packet_ids = Packet.objects.filter(cmid=self.session.cmid).values_list('packet_id', flat=True)
                products = Product.objects.filter(packet_id__in=packet_ids)

            if not products.exists():
                return self._get_stub_products()

            result = []
            for product in products:
                features = {}
                try:
                    fv_qs = FeatureValue.objects.filter(product=product).select_related('feature')
                    for fv in fv_qs:
                        if fv.normalized_value is None:
                            continue
                        features[fv.feature.feature_code] = fv.normalized_value
                except Exception:
                    pass

                result.append({
                    'product_id': product.product_id,
                    'product_name': product.model,
                    'family': product.family,
                    'price': float(product.price),
                    'features': features,
                })
            return self._add_derived_features(result)

        except Exception as e:
            logger.warning('Error loading products: %s — using stubs', e)
            return self._get_stub_products()

    def _get_stub_products(self):
        """
        Return placeholder product data when real product models
        are not yet available. Ensures the scoring pipeline is
        exercisable end-to-end during development.
        """
        return self._add_derived_features([
            {
                'product_id': 1001,
                'product_name': 'Product Alpha',
                'family': 'family_a',
                'features': {
                    'price': 0.8, 'performance': 0.7, 'battery_life': 0.9,
                    'display_quality': 0.6, 'portability': 0.8,
                },
            },
            {
                'product_id': 1002,
                'product_name': 'Product Beta',
                'family': 'family_a',
                'features': {
                    'price': 0.6, 'performance': 0.9, 'battery_life': 0.5,
                    'display_quality': 0.9, 'portability': 0.5,
                },
            },
            {
                'product_id': 1003,
                'product_name': 'Product Gamma',
                'family': 'family_b',
                'features': {
                    'price': 0.9, 'performance': 0.5, 'battery_life': 0.8,
                    'display_quality': 0.7, 'portability': 0.9,
                },
            },
            {
                'product_id': 1004,
                'product_name': 'Product Delta',
                'family': 'family_b',
                'features': {
                    'price': 0.5, 'performance': 0.8, 'battery_life': 0.7,
                    'display_quality': 0.8, 'portability': 0.6,
                },
            },
            {
                'product_id': 1005,
                'product_name': 'Product Epsilon',
                'family': 'family_c',
                'features': {
                    'price': 0.7, 'performance': 0.6, 'battery_life': 0.6,
                    'display_quality': 0.5, 'portability': 0.7,
                },
            },
        ])

    def _add_derived_features(self, products):
        if not products:
            return products

        prices = [float(p.get('price', 0) or 0) for p in products]
        min_price = min(prices)
        max_price = max(prices)
        price_range = max(max_price - min_price, 1.0)

        for product in products:
            features = product.setdefault('features', {})
            display_size = float(features.get('display_size', 0.5) or 0.5)
            weight = float(features.get('weight', 0.5) or 0.5)
            battery = float(features.get('battery', 0.5) or 0.5)
            processor = float(features.get('processor', 0.5) or 0.5)
            ram = float(features.get('ram', 0.5) or 0.5)
            storage = float(features.get('storage', 0.5) or 0.5)
            graphics = float(features.get('graphics', 0.5) or 0.5)
            connectivity = float(features.get('connectivity', 0.5) or 0.5)
            build_quality = float(features.get('build_quality', 0.5) or 0.5)
            price = float(product.get('price', 0) or 0)

            price_fit = 1.0 - ((price - min_price) / price_range)
            compactness = max(0.0, min(1.0, 1.0 - display_size))
            portability = min(1.0, weight * 0.45 + battery * 0.35 + compactness * 0.20)
            capability = (processor + ram + storage + graphics + connectivity + build_quality) / 6.0
            value_for_money = min(1.0, price_fit * 0.55 + capability * 0.45)
            everyday_fit = min(1.0, price_fit * 0.35 + weight * 0.2 + battery * 0.25 + connectivity * 0.1 + build_quality * 0.1)
            creative_headroom = min(1.0, processor * 0.3 + ram * 0.22 + storage * 0.16 + graphics * 0.22 + display_size * 0.1)
            average_power = (processor + ram + graphics) / 3.0
            right_sized_performance = max(0.0, min(1.0, 1.0 - abs(average_power - 0.58) * 1.8))

            features['price'] = round(price_fit, 3)
            features['capability'] = round(capability, 3)
            features['compactness'] = round(compactness, 3)
            features['large_display'] = round(display_size, 3)
            features['portability'] = round(portability, 3)
            features['value_for_money'] = round(value_for_money, 3)
            features['everyday_fit'] = round(everyday_fit, 3)
            features['creative_headroom'] = round(creative_headroom, 3)
            features['right_sized_performance'] = round(right_sized_performance, 3)
            features['performance_overkill_risk'] = 0.0
            features['performance_undershoot_risk'] = 0.0

        return products

    def _apply_requirement_profile(self, products):
        profile = getattr(self, 'requirement_profile', None) or {}
        if not profile:
            return products

        for product in products:
            features = product.setdefault('features', {})
            capability = float(features.get('capability', 0.5) or 0.5)
            price_fit = float(features.get('price', 0.5) or 0.5)

            right_sized_fit, performance_details = compute_right_sized_performance_fit(
                capability,
                profile,
            )
            session_value = compute_session_value_for_money(
                price_fit,
                capability,
                right_sized_fit,
            )

            features['right_sized_performance'] = round(right_sized_fit, 3)
            features['value_for_money'] = round(session_value, 3)
            features['performance_overkill_risk'] = performance_details['overkill_risk']
            features['performance_undershoot_risk'] = performance_details['undershoot_risk']
            product['session_fit_profile'] = performance_details

        return products

    def _calculate_base_scores(self, products, weights):
        """
        Calculate Score = SUM(Feature_Weight * Feature_Fit) per product.

        If no weights are specified, use uniform weights of 0.5 for
        all features present in the product.
        """
        scored = []

        # Collect all feature codes across all products
        all_features = set()
        for p in products:
            all_features.update(p['features'].keys())

        # Assign uniform default weight where missing
        for code in all_features:
            weights.setdefault(code, self._weight_floor_for_feature(code))

        for product in products:
            feature_scores = {}
            total_score = 0.0
            max_possible = 0.0

            for code in all_features:
                weight = weights.get(code, 0.5)
                fit = float(product['features'].get(code, 0.0))
                contribution = weight * fit
                feature_scores[code] = {
                    'weight': round(weight, 3),
                    'fit': round(fit, 3),
                    'contribution': round(contribution, 3),
                }
                total_score += contribution
                max_possible += weight  # max fit is 1.0

            match_pct = int(round(
                (total_score / max_possible * 100) if max_possible > 0 else 0,
            ))

            scored.append({
                'product_id': product['product_id'],
                'product_name': product['product_name'],
                'family': product.get('family', 'default'),
                'base_score': round(total_score, 4),
                'final_score': round(total_score, 4),
                'match_percentage': match_pct,
                'scoring_breakdown': {
                    'feature_scores': feature_scores,
                    'weights_used': {k: round(v, 3) for k, v in weights.items()},
                    'requirement_profile': getattr(self, 'requirement_profile', {}),
                    'session_fit_profile': product.get('session_fit_profile', {}),
                },
                'disqualified': False,
            })

        return scored

    def _apply_hard_filters(self, scored):
        """
        Step 5: Disqualify products that fail hard-filter rules.

        Hard filters come from scoring_configs.hard_filters — e.g.,
        if a customer requires a feature that the product lacks entirely.
        """
        hard_filters = {}

        if PACKETS_AVAILABLE and self.session.packet_id:
            try:
                config = ScoringConfig.objects.get(
                    packet_id=self.session.packet_id,
                )
                hard_filters = config.hard_filters or {}
            except (ScoringConfig.DoesNotExist, Exception):
                pass

        # Also derive implicit hard filters from answers
        for answer in self.answers:
            if answer.from_voice:
                if answer.score_effect and isinstance(answer.score_effect, dict):
                    hard_filters.update(answer.score_effect.get('hard_filters', {}))
                continue

            inferred_effect = infer_answer_score_effect(
                answer.question_text,
                answer.answer_value,
            )
            hard_filters.update(inferred_effect.get('hard_filters', {}))
            if answer.score_effect and isinstance(answer.score_effect, dict):
                hard_filters.update(answer.score_effect.get('hard_filters', {}))

        # Apply: if product feature < minimum threshold, disqualify
        for product in scored:
            breakdown = product['scoring_breakdown']['feature_scores']
            for feature_code, min_value in hard_filters.items():
                fit = breakdown.get(feature_code, {}).get('fit', 0.0)
                if fit < float(min_value):
                    product['disqualified'] = True
                    product['scoring_breakdown']['disqualified_by'] = feature_code
                    break

        return [p for p in scored if not p['disqualified']]

    def _apply_geography_modifiers(self, scored):
        """
        Step 6: Apply geography-based score modifiers.

        Products may have regional availability or pricing differences
        based on the outlet's zone.
        """
        outlet_id = self.session.outlet_id
        if not outlet_id:
            return scored

        # Geography modifiers will be loaded from outlet/zone config
        # when the outlets model is fully wired. For now, pass-through.
        try:
            # Placeholder: in Phase 12+ this will query retail_outlets
            # for zone-specific multipliers.
            pass
        except Exception as e:
            logger.warning('Error applying geography modifiers: %s', e)

        return scored

    def _apply_moderation_overrides(self, scored):
        """
        Step 7: Apply business overrides from moderation_rules table.

        Types:
            - boost: multiply score by factor
            - suppress: remove from results
            - push: force into top N at given rank

        Also queries OpenSearch for relevant moderation docs (stub —
        OpenSearch index may not be populated yet).
        """
        # --- OpenSearch moderation docs (stub) ---
        opensearch_rules = self._query_opensearch_moderation()

        # --- MySQL moderation overrides ---
        mysql_overrides = self._load_mysql_moderation_overrides()

        # Combine rules
        all_rules = opensearch_rules + mysql_overrides

        pushed_products = []

        for rule in all_rules:
            rule_type = rule.get('type', '')
            product_id = rule.get('product_id')
            factor = rule.get('factor', 1.0)

            if rule_type == 'suppress':
                scored = [
                    p for p in scored if p['product_id'] != product_id
                ]

            elif rule_type == 'boost':
                for product in scored:
                    if product['product_id'] == product_id:
                        # Only boost if product meets minimum fit threshold
                        if product['match_percentage'] >= 30:
                            product['final_score'] *= float(factor)
                            product['scoring_breakdown']['moderation_boost'] = float(factor)

            elif rule_type == 'push':
                target_rank = rule.get('rank', 1)
                pushed_products.append({
                    'product_id': product_id,
                    'target_rank': target_rank,
                })

        # Store push directives for use in ranking step
        self._pushed_products = pushed_products

        return scored

    def _query_opensearch_moderation(self):
        """
        Query OpenSearch reco_moderation_docs index for rules relevant
        to this session's packet and context.

        Returns list of moderation rule dicts.
        Stub implementation — OpenSearch may not be populated yet.
        """
        try:
            from apps.common.opensearch_client import opensearch_client

            query = {
                'query': {
                    'bool': {
                        'must': [
                            {'term': {'packet_id': self.session.packet_id}},
                            {'term': {'rule_type': 'scoring_override'}},
                        ],
                    },
                },
            }
            response = opensearch_client.search(
                'reco_moderation_docs', query, size=20,
            )
            hits = response.get('hits', {}).get('hits', [])
            return [hit['_source'] for hit in hits]

        except Exception as e:
            logger.debug(
                'OpenSearch moderation query unavailable (expected during '
                'early phases): %s', e,
            )
            return []

    def _load_mysql_moderation_overrides(self):
        """
        Load business overrides from the moderation_rules MySQL table.

        Returns list of rule dicts: {type, product_id, factor, rank}.
        Handles gracefully when moderation models are not yet available.
        """
        if not MODERATION_AVAILABLE:
            return []

        try:
            rules = ModerationRule.objects.filter(
                packet_id=self.session.packet_id,
                is_active=True,
            )
            return [
                {
                    'type': rule.rule_type,
                    'product_id': rule.product_id,
                    'factor': getattr(rule, 'boost_factor', 1.0),
                    'rank': getattr(rule, 'target_rank', 1),
                }
                for rule in rules
            ]
        except Exception as e:
            logger.debug('Moderation rules query failed (expected): %s', e)
            return []

    def _apply_feedback_patterns(self, scored):
        """
        Step 8: Apply feedback pattern context.

        Looks for patterns where similar input profiles led to high
        or low ratings for specific product combinations. Adjusts
        scores accordingly.
        """
        if not FEEDBACK_AVAILABLE:
            return scored

        try:
            patterns = FeedbackPattern.objects.filter(
                packet_id=self.session.packet_id,
                is_active=True,
            )
            for pattern in patterns:
                product_id = getattr(pattern, 'product_id', None)
                adjustment = getattr(pattern, 'score_adjustment', 0.0)
                if product_id and adjustment:
                    for product in scored:
                        if product['product_id'] == product_id:
                            product['final_score'] += float(adjustment)
                            product['scoring_breakdown']['feedback_adjustment'] = float(adjustment)
        except Exception as e:
            logger.debug('Feedback patterns unavailable: %s', e)

        return scored

    def _rank_with_diversity(self, scored):
        """
        Step 9: Sort by final_score descending, then apply diversity
        rules to avoid all top 3 coming from the same product family.

        Also honor any push directives from moderation overrides.
        """
        # Sort by final_score descending
        scored.sort(key=lambda p: p['final_score'], reverse=True)

        # Apply push directives (from moderation overrides)
        pushed = getattr(self, '_pushed_products', [])
        for push in pushed:
            pid = push['product_id']
            target_rank = push['target_rank'] - 1  # 0-indexed
            # Find the product in scored list
            idx = next(
                (i for i, p in enumerate(scored) if p['product_id'] == pid),
                None,
            )
            if idx is not None and idx != target_rank:
                product = scored.pop(idx)
                scored.insert(min(target_rank, len(scored)), product)

        # Diversity rule: no more than 2 from the same family in top 3
        final = []
        family_count = defaultdict(int)
        overflow = []

        for product in scored:
            family = product.get('family', 'default')
            if len(final) < self.TOP_N:
                if family_count[family] < 2:
                    final.append(product)
                    family_count[family] += 1
                else:
                    overflow.append(product)
            else:
                overflow.append(product)

        # If we didn't fill top N due to diversity constraints, backfill
        while len(final) < self.TOP_N and overflow:
            final.append(overflow.pop(0))

        ordered = final + overflow

        # Assign ranks
        for rank_idx, product in enumerate(ordered):
            product['rank'] = rank_idx + 1
            # Recalculate match percentage based on final score
            product['match_percentage'] = min(
                100,
                max(0, product['match_percentage']),
            )

        return ordered
