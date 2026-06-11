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
import re
from collections import defaultdict

from apps.sessions_app.models import CustomerSession, SessionAnswer
from apps.recommendations.fit_profiles import (
    build_intent_profile,
    build_requirement_profile,
    compute_intent_fit,
    compute_right_sized_performance_fit,
    compute_session_value_for_money,
)
from apps.recommendations.preference_profile import (
    build_preference_profile,
    build_product_semantic_features,
    compute_preference_profile_fit,
)
from apps.recommendations.preference_inference import (
    infer_answer_score_effect,
    infer_tag_weight_adjustments,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Intent detection (used to nudge weights toward "right for today / value" vs
# "room to grow / headroom").
#
# This replaces brittle exact-phrase matching (e.g. looking for the literal
# string "room to grow over time"). Question options 3-5 are written fresh by
# the LLM each session, so any exact wording match silently stopped firing the
# moment the model rephrased an option. Detection is now meaning-based: it reads
# the structured preference profile first, and falls back to a broad synonym set
# rather than a single literal phrase.
# ---------------------------------------------------------------------------
VALUE_TODAY_PATTERNS = [
    r"best fit for today",
    r"\bfor (now|today)\b",
    r"\b(current|present) needs?\b",
    r"\bjust (regular|basic|simple|normal|everyday)\b",
    r"\b(regular|basic|simple) (student|office|home|daily) use\b",
    r"\bstudent or office\b",
    r"\bdon'?t need (much|a lot|that much|high|extra) (power|performance|specs?)\b",
    r"\bkeep it (simple|affordable|cheap|basic|light)\b",
    r"\bvalue for money\b",
    r"\bnothing fancy\b",
]
FUTURE_HEADROOM_PATTERNS = [
    r"\broom to grow\b",
    r"\bfuture[- ]?proof",
    r"\bgrow over time\b",
    r"\bhead ?room\b",
    r"\blong[- ]?term\b",
    r"\b(last|lasts) (me )?(a few|several|many|\d+)\b",
    r"\bso it lasts\b",
    r"\bwon'?t outgrow\b",
    r"\bmore power (later|down the line|in (the )?future)\b",
]


def _text_matches_any(text, patterns):
    """True if any regex pattern is found in the (lowercased) text."""
    return any(re.search(pattern, text) for pattern in patterns)


def _parse_display_inches(text):
    """Extract the screen diagonal (e.g. 14, 15.6) from a raw display string
    like '15.6\" FHD IPS, 144Hz'. Returns None when not stated."""
    match = re.search(r'(\d{2}(?:\.\d{1,2})?)\s*(?:"|”|-inch|inch)', str(text or ''))
    if not match:
        return None
    inches = float(match.group(1))
    return inches if 9 <= inches <= 19 else None


def _product_form_factor(model_name):
    """Classify form factor from the model name. Clamshell is the default;
    only clearly-named exotics are classified away from it."""
    name = str(model_name or '').lower()
    if 'yoga book' in name or 'dual ' in name:
        return 'dual_screen'
    if 'duet' in name:
        return 'detachable'
    if '2-in-1' in name or '2 in 1' in name or 'flex' in name:
        return 'convertible'
    return 'clamshell'


# Size-preference detection: which band did the shopper explicitly ask for?
SIZE_NEUTRAL_PATTERNS = [
    r"doesn'?t matter", r"isn'?t a huge deal", r"no preference", r"\bflexible\b",
    r"\bany size\b", r"average or above is fine",
]
SIZE_COMPACT_PATTERNS = [r"\b13\b", r"\b14\b", r"13-14", r"\bcompact\b", r"small screen"]
SIZE_LARGE_PATTERNS = [r"\b15\b", r"\b16\b", r"15-16", r"big screen", r"\blarger\b", r"large screen"]
SIZE_XL_PATTERNS = [r"\b17\b"]


# ---------------------------------------------------------------------------
# Benefit-mapping synonyms.
#
# BenefitMapping rows (Django admin) translate a stated benefit into feature
# weight boosts, but they used to match by literal substring of the answer text
# — so "work", "study", "streaming" etc. only fired if that exact word appeared.
# This maps each benefit_name to a set of synonym patterns so a mapping fires on
# meaning, not exact spelling. Unknown benefit_names fall back to a literal match
# (so admin-entered benefits still work).
# ---------------------------------------------------------------------------
BENEFIT_SYNONYMS = {
    "work": [r"\bwork\b", r"\bproductivity\b", r"\boffice\b", r"\bbusiness\b", r"\bdocs?\b", r"\bdocuments?\b", r"\bspreadsheets?\b", r"\bexcel\b", r"\bword\b", r"\bemail\b", r"\bmultitask"],
    "excel": [r"\bexcel\b", r"\bspreadsheets?\b"],
    "student": [r"\bstudent\b", r"\bstudy\b", r"\bstudying\b", r"\bschool\b", r"\bschoolwork\b", r"\bhomework\b", r"\bassignments?\b", r"\bexam\b"],
    "study": [r"\bstudy\b", r"\bstudying\b", r"\bstudent\b", r"\bschool\b", r"\bhomework\b", r"\bassignments?\b", r"\bexam\b", r"\brevision\b"],
    "college": [r"\bcollege\b", r"\buniversity\b", r"\bcampus\b", r"\bcoursework\b", r"\blectures?\b", r"\bsemester\b"],
    "coding": [r"\bcod(e|ing)\b", r"\bprogramming\b", r"\bdevelop(er|ment|ing)?\b", r"\bsoftware\b", r"\bterminal\b", r"\bide\b", r"\bgithub\b"],
    "design": [r"\bdesign(ing)?\b", r"\bgraphics?\b", r"\bphoto(shop)?\b", r"\billustrat", r"\bfigma\b", r"\bcreative\b", r"\bcontent creation\b"],
    "editing": [r"\bvideo edit(ing)?\b", r"\bediting\b", r"\bpremiere\b", r"\bafter effects\b", r"\brender(ing)?\b", r"\b3d\b", r"\bcad\b", r"\banimation\b"],
    "gaming": [r"\bgam(e|es|ing)\b", r"\besports?\b", r"\bvalorant\b", r"\bfps\b", r"\bsteam\b"],
    "streaming": [r"\bstream(ing)?\b", r"\bnetflix\b", r"\byoutube\b", r"\bmovies?\b", r"\bott\b", r"\bbinge\b", r"\bmedia\b", r"\bmusic\b", r"\bshows?\b"],
    "remote_work": [r"\bremote\b", r"\bvideo calls?\b", r"\bzoom\b", r"\bmeetings?\b", r"\bms teams\b", r"\bconferenc(e|ing)\b", r"\bwebcam\b", r"\bwork from home\b", r"\bwfh\b", r"\bhybrid\b"],
    "browsing": [r"\bbrowsing\b", r"\bbrowse\b", r"\beveryday\b", r"\bhome use\b", r"\bcasual\b", r"\bgeneral use\b", r"\bweb\b", r"\binternet\b", r"\bbasic\b"],
    "travel": [r"\btravel(ling|ing)?\b", r"\bbusiness trip\b", r"\bcommut(e|ing)\b", r"\bon the go\b", r"\bportable\b"],
    "portability": [r"\blight(weight)?\b", r"\bcarry\b", r"\bportable\b", r"\bon the go\b", r"\beasy to carry\b"],
    "battery": [r"\bbattery\b", r"\ball[- ]day\b", r"\bunplugged\b", r"\blong[- ]?lasting\b", r"\bcharge\b"],
    "value": [r"\bvalue\b", r"\baffordable\b", r"\bbudget\b", r"\bcheap\b", r"\beconomical\b", r"\bworth\b"],
    "premium": [r"\bpremium\b", r"\bhigh[- ]?end\b", r"\bflagship\b", r"\bluxury\b", r"\bbuild quality\b", r"\bsturdy\b"],
    "shared_family": [r"\bshared\b", r"\bfamily\b", r"\beveryone\b", r"\bhousehold\b", r"\bmultiple users\b"],
    "keyboard": [r"\bkeyboard\b", r"\btyping\b", r"\btypes? a lot\b", r"\btypist\b", r"\bwrites? (a lot|all day)\b"],
    "parent": [r"\bparent\b", r"\bmother\b", r"\bfather\b", r"\bmom\b", r"\bdad\b", r"\belderly\b", r"\bsenior\b", r"\bgrandparent\b"],
    "performance": [r"\bfast\b", r"\bpowerful\b", r"\bperformance\b", r"\bspeed\b", r"\bheavy\b", r"\bdemanding\b", r"\bpower user\b"],
}


def _merge_hard_filters(target, incoming):
    for feature_code, min_value in (incoming or {}).items():
        try:
            target[feature_code] = max(
                float(target.get(feature_code, 0.0) or 0.0),
                float(min_value),
            )
        except (TypeError, ValueError):
            continue
    return target

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
        'profile_fit': 0.0,
        'media_comfort': 0.0,
        'audio_quality': 0.0,
        'readability': 0.0,
        'simplicity': 0.0,
        'touch_flexibility': 0.0,
        'couch_comfort': 0.0,
        'shared_viewing': 0.0,
        'premium_experience': 0.0,
        'business_orientation': 0.0,
        'creator_orientation': 0.0,
        'gaming_orientation': 0.0,
        'bulk_risk': 0.0,
        'complexity_risk': 0.0,
        # Dormant unless the shopper mentions typing/keyboard (benefit mapping
        # raises it); default 0 so it never shifts results unprompted.
        'keyboard_quality': 0.0,
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
        self.preference_profile = build_preference_profile(
            self.session,
            self.answers,
            self.voice_tags,
        )

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
        weights = self._apply_preference_profile_adjustments(weights)

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
        self.intent_profile = build_intent_profile(
            answer_texts=[answer.answer_value for answer in self.answers if answer.answer_value],
            voice_tags=self.voice_tags,
            weights=weights,
        )
        products = self._apply_requirement_profile(products)

        scored = self._calculate_base_scores(products, weights)

        # Step 5: Hard filters — disqualify products
        scored = self._apply_hard_filters(scored)

        # Step 5b: Blend generic spec score with session intent fit.
        scored = self._apply_intent_fit_modifiers(scored)

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
                    detected_archetype = str(effect.get('detected_archetype', '')).strip()
                    if detected_archetype:
                        tags.append({
                            'text': detected_archetype,
                            'category': 'user-archetype',
                            'confidence': effect.get('detected_archetype_confidence', 0.0),
                        })
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

        # Also apply benefit_mappings from the packet (if available).
        # Matching is synonym-aware: a benefit fires when the answer text
        # expresses that meaning, not only when the exact benefit word appears.
        if PACKETS_AVAILABLE and self.session.packet_id:
            try:
                all_answer_text = " ".join(
                    str(answer.answer_value or "").lower() for answer in self.answers
                )
                mappings = BenefitMapping.objects.filter(
                    packet_id=self.session.packet_id,
                )
                for mapping in mappings:
                    benefit_name = str(mapping.benefit_name or "").strip().lower()
                    if not benefit_name:
                        continue
                    patterns = BENEFIT_SYNONYMS.get(benefit_name, [re.escape(benefit_name)])
                    if _text_matches_any(all_answer_text, patterns):
                        code = mapping.feature_code
                        impact = float(mapping.weight_impact)
                        current = weights.get(code, self._weight_floor_for_feature(code))
                        weights[code] = max(0.0, min(1.5, current + impact))
            except Exception as e:
                logger.warning('Error applying benefit mappings: %s', e)

        combined_answers = " ".join(
            str(answer.answer_value or "").lower() for answer in self.answers if not answer.from_voice
        )
        if self._wants_value_for_today(combined_answers):
            weights['processor'] = min(weights.get('processor', 0.66), 0.72)
            weights['ram'] = min(weights.get('ram', 0.56), 0.68)
            weights['graphics'] = min(weights.get('graphics', 0.28), 0.18)
            weights['creative_headroom'] = min(weights.get('creative_headroom', 0.26), 0.24)
            weights['build_quality'] = min(weights.get('build_quality', 0.42), 0.55)
            weights['price'] = max(weights.get('price', 0.64), 1.25)
            weights['value_for_money'] = max(weights.get('value_for_money', 0.62), 1.3)
            weights['everyday_fit'] = max(weights.get('everyday_fit', 0.6), 1.15)
            weights['right_sized_performance'] = max(weights.get('right_sized_performance', 0.22), 1.2)

        if self._wants_future_headroom(combined_answers):
            weights['processor'] = max(weights.get('processor', 0.66), 0.9)
            weights['ram'] = max(weights.get('ram', 0.56), 0.86)
            weights['graphics'] = max(weights.get('graphics', 0.28), 0.32)
            weights['creative_headroom'] = max(weights.get('creative_headroom', 0.26), 0.7)
            weights['right_sized_performance'] = min(weights.get('right_sized_performance', 0.22), 0.4)

        return weights

    def _profile_intent_signals(self):
        """Return (performance_need, value_sensitivity, overkill_tolerance) from
        the structured preference profile, defaulting to 0.0 when missing."""
        profile = getattr(self, 'preference_profile', {}) or {}

        def _read(key):
            try:
                return float(profile.get(key, 0.0) or 0.0)
            except (TypeError, ValueError):
                return 0.0

        return (
            _read('performance_need_level'),
            _read('value_sensitivity'),
            _read('overkill_tolerance'),
        )

    def _extract_size_preference(self):
        """Return (lo, hi, firmness) when the shopper explicitly answered a
        screen-size question, else None.

        firmness 1.0 when mobility context corroborates the size ask (travel /
        daily carry — size genuinely matters), 0.5 when it reads as taste.
        """
        size_answers = []
        all_text_parts = []
        for answer in self.answers:
            if answer.from_voice:
                continue
            q = str(answer.question_text or '').lower()
            a = str(answer.answer_value or '').lower()
            all_text_parts.append(a)
            if any(k in q for k in ('screen', 'display', 'size')) or 'inch' in a:
                size_answers.append(a)

        if not size_answers:
            return None
        size_text = ' '.join(size_answers)
        if _text_matches_any(size_text, SIZE_NEUTRAL_PATTERNS):
            return None

        compact = _text_matches_any(size_text, SIZE_COMPACT_PATTERNS)
        large = _text_matches_any(size_text, SIZE_LARGE_PATTERNS)
        xl = _text_matches_any(size_text, SIZE_XL_PATTERNS)
        # Ambiguous (mentions both bands) -> don't enforce anything.
        if sum([compact, large, xl]) != 1:
            return None

        all_text = ' '.join(all_text_parts)
        mobile = _text_matches_any(all_text, [
            r"\btravel", r"\bcarry\b", r"\bcarries\b", r"\blight ?weight\b",
            r"\bportable\b", r"\bon the go\b", r"\bcommut",
        ])
        firmness = 1.0 if mobile else 0.5

        if compact:
            return (12.4, 14.5, firmness)
        if large:
            return (14.9, 16.7, firmness)
        return (16.8, 18.5, firmness)

    def _extract_touch_preference(self):
        """'standard' | 'touch' | None, from the touch/tablet question and the
        discovery brief."""
        voice_text = ' '.join(
            str(a.answer_value or '').lower() for a in self.answers if a.from_voice
        )
        for answer in self.answers:
            if answer.from_voice:
                continue
            q = str(answer.question_text or '').lower()
            if not any(k in q for k in ('touch', 'tablet', 'convertible', '2-in-1')):
                continue
            a = str(answer.answer_value or '').lower()
            if any(k in a for k in ('standard', 'no ', 'not ', "don't", 'regular laptop')):
                return 'standard'
            if any(k in a for k in ('touch', 'tablet', 'important', 'love', 'prefer', 'yes')):
                return 'touch'

        # The LLM doesn't always put "touch" in the question text (e.g. "How
        # would your father prefer to interact with the laptop screen?" ->
        # "Traditional laptop display"). A traditional/standard-laptop phrase in
        # any answer is an explicit no-touch stance, and beats the voice brief.
        qa_text = ' '.join(
            str(a.answer_value or '').lower() for a in self.answers if not a.from_voice
        )
        if _text_matches_any(qa_text, [
            r"\btraditional laptop\b", r"\bstandard laptop\b", r"\bno touch\b",
            r"\bwithout touch\b", r"\bnon[- ]touch\b",
        ]):
            return 'standard'

        if _text_matches_any(voice_text, [r"\btouch ?screen\b", r"\btablet mode\b", r"\bstylus\b", r"\bpen support\b", r"\b2-in-1\b"]):
            return 'touch'
        return None

    def _wants_value_for_today(self, combined_answers):
        """Shopper wants the right tool for today's needs / value, not headroom.

        Reads the structured profile first (meaning-based, robust to wording),
        then falls back to a broad synonym match over the answer text.
        """
        performance_need, value_sensitivity, overkill_tolerance = self._profile_intent_signals()
        if value_sensitivity >= 0.6 and performance_need <= 0.45 and overkill_tolerance <= 0.45:
            return True
        return _text_matches_any(combined_answers, VALUE_TODAY_PATTERNS)

    def _wants_future_headroom(self, combined_answers):
        """Shopper wants performance headroom to grow into over time."""
        performance_need, _value_sensitivity, overkill_tolerance = self._profile_intent_signals()
        if overkill_tolerance >= 0.6 or performance_need >= 0.7:
            return True
        return _text_matches_any(combined_answers, FUTURE_HEADROOM_PATTERNS)

    def _apply_preference_profile_adjustments(self, weights):
        """
        Add profile-driven semantic dimensions to the scoring space.

        The LLM profile chooses generic feature priorities; this method only
        translates those priorities into scorer weights so the scorer can rank
        products using the same product feature matrix as the rest of the app.
        """
        profile = getattr(self, 'preference_profile', {}) or {}
        if not profile:
            return weights

        weights = dict(weights)
        confidence = max(0.35, min(1.0, float(profile.get('profile_confidence', 0.55) or 0.55)))
        feature_priorities = profile.get('feature_priorities', {}) or {}
        anti_priorities = profile.get('anti_priorities', {}) or {}

        for feature_code, raw_priority in feature_priorities.items():
            try:
                priority = max(0.0, min(1.0, float(raw_priority or 0.0)))
            except (TypeError, ValueError):
                continue
            current = weights.get(feature_code, self._weight_floor_for_feature(feature_code))
            weights[feature_code] = max(0.0, min(1.6, current + priority * confidence * 0.55))

        # Anti-priority signals are handled as penalties inside profile_fit.
        # Give profile_fit itself enough weight to influence ordering even
        # when catalog metadata contains dimensions that are not in default
        # scoring configs, such as simplicity, media comfort, or touch use.
        if feature_priorities or anti_priorities:
            weights['profile_fit'] = max(weights.get('profile_fit', 0.0), 1.15 * confidence)

        if self._is_capability_seeking_profile(profile):
            weights = self._apply_capability_weight_calibration(weights, profile, confidence)
        elif self._is_value_simple_profile(profile):
            weights = self._apply_value_simple_calibration(weights, profile)

        return weights

    def _is_value_simple_profile(self, profile):
        """A value-focused, low-performance everyday shopper (e.g. a parent who
        wants streaming/email/browsing). For these, mobility and premium should
        not dominate — value, simplicity, and right-sized fit should lead."""
        try:
            performance = float(profile.get('performance_need_level', 0.0) or 0.0)
            value_sensitivity = float(profile.get('value_sensitivity', 0.0) or 0.0)
            overkill_tolerance = float(profile.get('overkill_tolerance', 0.0) or 0.0)
        except (TypeError, ValueError):
            return False
        # perf threshold sits at 0.65 (not 0.5) on purpose: the LLM profile
        # jitters +/-0.1 between runs, and a strongly value-sensitive shopper
        # shouldn't lose price discipline to that noise.
        return value_sensitivity >= 0.55 and performance <= 0.65 and overkill_tolerance <= 0.5

    def _apply_value_simple_calibration(self, weights, profile):
        """Mirror of the capability calibration, for value/simple profiles.

        Caps mobility and premium dimensions (unless the shopper actually asked
        for portability/travel) so an expensive ultralight does not float to the
        top for someone optimizing for simple, affordable everyday use.
        """
        weights = dict(weights)
        usage_modes = set(profile.get('primary_usage_modes', []) or [])
        has_mobility_need = bool(usage_modes & {'travel'})

        # Mobility only matters if explicitly asked for. A small-screen / home
        # profile should not chase the lightest premium machine.
        if not has_mobility_need:
            mobility_caps = {
                'portability': 0.7,
                'weight': 0.7,
                'compactness': 0.8,
            }
            for code, cap in mobility_caps.items():
                if code in weights:
                    weights[code] = min(weights[code], cap)

        # Premium / headroom are never the point for a simple value shopper.
        premium_caps = {
            'premium_experience': 0.3,
            'creative_headroom': 0.3,
            'graphics': 0.25,
        }
        for code, cap in premium_caps.items():
            if code in weights:
                weights[code] = min(weights[code], cap)

        # Keep value, everyday fit, simplicity, and right-sized fit in front.
        weights['price'] = max(weights.get('price', 0.0), 1.2)
        weights['value_for_money'] = max(weights.get('value_for_money', 0.0), 1.2)
        weights['everyday_fit'] = max(weights.get('everyday_fit', 0.0), 1.1)
        weights['simplicity'] = max(weights.get('simplicity', 0.0), 0.9)
        weights['right_sized_performance'] = max(weights.get('right_sized_performance', 0.0), 1.0)

        return weights

    def _is_capability_seeking_profile(self, profile):
        usage_modes = set(profile.get('primary_usage_modes', []) or [])
        try:
            performance = float(profile.get('performance_need_level', 0.0) or 0.0)
            overkill_tolerance = float(profile.get('overkill_tolerance', 0.0) or 0.0)
        except (TypeError, ValueError):
            return False
        capability_modes = {'gaming', 'creative', 'coding', 'productivity', 'remote_work'}
        return bool(usage_modes & capability_modes) and performance >= 0.78 and overkill_tolerance >= 0.65

    def _apply_capability_weight_calibration(self, weights, profile, confidence):
        """
        For explicit headroom/performance profiles, stronger relevant specs are
        part of fit. Keep value as a tie-breaker unless the profile asks for it.
        """
        weights = dict(weights)
        usage_modes = set(profile.get('primary_usage_modes', []) or [])
        value_sensitivity = float(profile.get('value_sensitivity', 0.0) or 0.0)
        heavy_visual = bool(usage_modes & {'gaming', 'creative'})
        work_heavy = bool(usage_modes & {'coding', 'productivity', 'remote_work'})

        floors = {
            'processor': 1.45,
            'ram': 1.22 if work_heavy else 1.0,
            'storage': 0.72 if work_heavy else 0.48,
            'creative_headroom': 1.0 if heavy_visual or work_heavy else 0.72,
            'premium_experience': 0.86,
            'build_quality': 1.02,
            'profile_fit': 1.25 * confidence,
        }
        if heavy_visual:
            floors['graphics'] = 1.6 if 'gaming' in usage_modes else 1.28
            floors['display_size'] = 1.42
        elif work_heavy:
            floors['display_size'] = 1.12
        if 'gaming' in usage_modes:
            floors['gaming_orientation'] = 1.05
        if work_heavy:
            floors['connectivity'] = 0.82

        for feature_code, floor in floors.items():
            weights[feature_code] = max(weights.get(feature_code, 0.0), floor)

        if value_sensitivity < 0.38:
            caps = {
                'price': 0.18,
                'value_for_money': 0.38,
                'everyday_fit': 0.3,
                'simplicity': 0.18,
                'right_sized_performance': 0.46,
            }
            for feature_code, cap in caps.items():
                if feature_code in weights:
                    weights[feature_code] = min(weights.get(feature_code, 0.0), cap)

        # Performance-first shoppers who aren't mobile (e.g. a stationary gaming
        # desk) shouldn't have the strongest machine penalized just for being
        # heavy. Cap mobility weights unless they actually expressed travel/carry
        # needs — mirror of the value-profile mobility cap.
        has_mobility_need = bool(usage_modes & {'travel'})
        if not has_mobility_need:
            mobility_caps = {
                'weight': 0.5,
                'portability': 0.5,
                'compactness': 0.6,
            }
            for feature_code, cap in mobility_caps.items():
                if feature_code in weights:
                    weights[feature_code] = min(weights.get(feature_code, 0.0), cap)

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
            content_by_product = {}
            try:
                from apps.packets.models import ProductContent
                content_by_product = {
                    content.product_id: content
                    for content in ProductContent.objects.filter(product__in=products)
                }
            except Exception:
                content_by_product = {}

            for product in products:
                features = {}
                raw_feature_values = []
                display_inches = None
                display_touch = False
                try:
                    fv_qs = FeatureValue.objects.filter(product=product).select_related('feature')
                    for fv in fv_qs:
                        raw_feature_values.append(
                            f"{fv.feature.feature_name}: {str(fv.value or '').strip()}"
                        )
                        if fv.feature.feature_code == 'display_size':
                            display_inches = _parse_display_inches(fv.value)
                            display_touch = 'touch' in str(fv.value or '').lower()
                        if fv.normalized_value is None:
                            continue
                        features[fv.feature.feature_code] = fv.normalized_value
                except Exception:
                    pass

                content = content_by_product.get(product.product_id)
                content_parts = []
                if content:
                    content_parts.extend([
                        getattr(content, 'best_for', '') or '',
                        getattr(content, 'fit_summary', '') or '',
                        ' '.join(getattr(content, 'key_highlights', []) or []),
                        ' '.join(getattr(content, 'salesperson_tips', []) or []),
                    ])

                result.append({
                    'product_id': product.product_id,
                    'product_name': product.model,
                    'family': product.family,
                    'price': float(product.price),
                    'display_inches': display_inches,
                    'display_touch': display_touch,
                    'features': features,
                    'product_text': ' | '.join([
                        product.model,
                        product.family,
                        *raw_feature_values,
                        *content_parts,
                    ]),
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

            semantic_features = build_product_semantic_features(
                product.get('product_text', ''),
                features,
            )
            features.update(semantic_features)
            profile_fit, profile_fit_details = compute_preference_profile_fit(
                features,
                getattr(self, 'preference_profile', {}) or {},
            )
            features['profile_fit'] = round(profile_fit, 3)
            product['preference_profile_fit'] = profile_fit_details

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
            profile_fit, profile_fit_details = compute_preference_profile_fit(
                features,
                getattr(self, 'preference_profile', {}) or {},
            )
            features['profile_fit'] = round(profile_fit, 3)
            product['preference_profile_fit'] = profile_fit_details

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
                'display_inches': product.get('display_inches'),
                'display_touch': product.get('display_touch', False),
                'base_score': round(total_score, 4),
                'final_score': round(total_score, 4),
                'match_percentage': match_pct,
                'scoring_breakdown': {
                    'feature_scores': feature_scores,
                    'weights_used': {k: round(v, 3) for k, v in weights.items()},
                    'requirement_profile': getattr(self, 'requirement_profile', {}),
                    'preference_profile': getattr(self, 'preference_profile', {}),
                    'preference_profile_fit': product.get('preference_profile_fit', {}),
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

        _merge_hard_filters(
            hard_filters,
            getattr(self, 'intent_profile', {}).get('required_floors', {}),
        )

        # Also derive implicit hard filters from answers
        for answer in self.answers:
            inferred_effect = infer_answer_score_effect(
                answer.question_text,
                answer.answer_value,
            )
            _merge_hard_filters(hard_filters, inferred_effect.get('hard_filters', {}))

            if answer.from_voice:
                if answer.score_effect and isinstance(answer.score_effect, dict):
                    _merge_hard_filters(
                        hard_filters,
                        answer.score_effect.get('hard_filters', {}),
                    )
                continue

            if answer.score_effect and isinstance(answer.score_effect, dict):
                _merge_hard_filters(
                    hard_filters,
                    answer.score_effect.get('hard_filters', {}),
                )

        # When the shopper explicitly asked for touch, touch-capable machines
        # are exempt from screen-size floors: a stated need (touch) must not be
        # silently disqualified by a size preference it cannot coexist with
        # (the catalog may have no large touch devices at all). They still face
        # every other floor, and the soft size penalty handles the trade-off.
        touch_pref = self._extract_touch_preference()

        # Apply: if product feature < minimum threshold, disqualify
        for product in scored:
            breakdown = product['scoring_breakdown']['feature_scores']
            touch_capable = bool(product.get('display_touch')) or _product_form_factor(
                product.get('product_name')
            ) in ('convertible', 'detachable', 'dual_screen')
            for feature_code, min_value in hard_filters.items():
                if (
                    touch_pref == 'touch'
                    and touch_capable
                    and feature_code in ('display_size', 'large_display')
                ):
                    continue
                fit = breakdown.get(feature_code, {}).get('fit', 0.0)
                if fit < float(min_value):
                    product['disqualified'] = True
                    product['scoring_breakdown']['disqualified_by'] = feature_code
                    break

        return [p for p in scored if not p['disqualified']]

    def _apply_intent_fit_modifiers(self, scored):
        """
        Blend the generic weighted spec score with a session-intent fit score.

        The weighted score answers "how much spec is present"; the intent score
        answers "is this the right kind of laptop for this buyer". Blending both
        prevents overselling high-end hardware for simple use cases while still
        letting gaming, creator, workstation, and business profiles win when the
        answers justify them.
        """
        intent_profile = getattr(self, 'intent_profile', {}) or {}
        if not intent_profile:
            return scored

        # Session-level stated preferences (None when not expressed).
        size_pref = self._extract_size_preference()
        touch_pref = self._extract_touch_preference()
        # Form-factor penalty/boost per stance. Stated preferences are strong
        # defaults, not handcuffs: every value here is small enough that a
        # clearly superior machine can still overcome it.
        if touch_pref == 'standard':
            form_factor_adjust = {'convertible': 0.06, 'detachable': 0.10, 'dual_screen': 0.12}
        elif touch_pref == 'touch':
            form_factor_adjust = {'convertible': -0.05, 'detachable': -0.03, 'dual_screen': -0.02}
        else:
            # Never asked: exotic form factors shouldn't lead unprompted,
            # but only get a mild dampening.
            form_factor_adjust = {'convertible': 0.02, 'detachable': 0.05, 'dual_screen': 0.07}

        for product in scored:
            breakdown = product.get('scoring_breakdown', {})
            feature_scores = breakdown.get('feature_scores', {})
            features = {
                feature_code: detail.get('fit', 0.0)
                for feature_code, detail in feature_scores.items()
            }
            intent_fit, intent_details = compute_intent_fit(features, intent_profile)
            profile_fit, profile_fit_details = compute_preference_profile_fit(
                features,
                getattr(self, 'preference_profile', {}) or {},
            )
            raw_fit = max(0.0, min(1.0, float(product.get('match_percentage', 0) or 0) / 100.0))
            if getattr(self, 'preference_profile', None):
                final_fit = max(0.0, min(1.0, raw_fit * 0.25 + intent_fit * 0.30 + profile_fit * 0.45))
            else:
                final_fit = max(0.0, min(1.0, raw_fit * 0.45 + intent_fit * 0.55))

            # Price discipline for value-sensitive, simple-use shoppers.
            # The intent/profile layers reward "the right kind of laptop" but
            # ignore price, so an expensive premium machine can edge out a
            # much cheaper one that fits just as well. Penalize price for these
            # profiles, scaled by how value-sensitive the shopper is and how
            # expensive the product is (price fit: 1=cheapest, 0=priciest).
            preference_profile = getattr(self, 'preference_profile', {}) or {}
            if self._is_value_simple_profile(preference_profile):
                try:
                    value_sensitivity = float(preference_profile.get('value_sensitivity', 0.0) or 0.0)
                except (TypeError, ValueError):
                    value_sensitivity = 0.0
                price_fit = float(features.get('price', 0.5) or 0.5)
                price_penalty = 0.6 * value_sensitivity * (1.0 - price_fit)
                final_fit = max(0.0, final_fit - price_penalty)

            # Stated screen-size preference: a per-inch fine for sitting outside
            # the asked band. ~7 pts/inch when mobility makes size load-bearing,
            # half that when it reads as taste; capped so it can never bury an
            # otherwise dramatically better machine on its own.
            # When the shopper explicitly asked for touch, touch-capable
            # machines are exempt from the size fine: an explicitly stated
            # need (touch) outranks a size preference it cannot coexist with
            # (e.g. catalog has no 15-16" touch devices). A salesperson would
            # say "the touch one only comes in 14-inch" — not hide it.
            form = _product_form_factor(product.get('product_name'))
            touch_capable = bool(product.get('display_touch')) or form in (
                'convertible', 'detachable', 'dual_screen',
            )
            size_waived = touch_pref == 'touch' and touch_capable

            size_penalty = 0.0
            inches = product.get('display_inches')
            if size_pref and inches and not size_waived:
                lo, hi, firmness = size_pref
                inches_off = max(0.0, lo - inches, inches - hi)
                size_penalty = min(0.18, inches_off * 0.07 * firmness)
                final_fit = max(0.0, final_fit - size_penalty)

            # Form-factor alignment with the touch/tablet answer.
            form_adjust = form_factor_adjust.get(form, 0.0)
            if form_adjust:
                final_fit = max(0.0, min(1.0, final_fit - form_adjust))

            breakdown['stated_preference_adjustments'] = {
                'size_penalty': round(size_penalty, 3),
                'size_penalty_waived_for_touch': size_waived,
                'form_factor': form,
                'form_factor_adjustment': round(form_adjust, 3),
            }
            max_possible = sum(
                float(detail.get('weight', 0.0) or 0.0)
                for detail in feature_scores.values()
            )
            product['final_score'] = round(final_fit * max_possible, 4)
            product['match_percentage'] = int(round(final_fit * 100))
            breakdown['intent_profile'] = intent_profile
            breakdown['preference_profile'] = getattr(self, 'preference_profile', {}) or {}
            breakdown['preference_profile_fit'] = {
                'fit': round(profile_fit, 3),
                **profile_fit_details,
            }
            breakdown['intent_fit'] = {
                'fit': round(intent_fit, 3),
                **intent_details,
                'raw_weighted_fit': round(raw_fit, 3),
                'blended_fit': round(final_fit, 3),
            }

        return scored

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
        conditional_promotions = []

        for rule in all_rules:
            rule_type = rule.get('type', '')
            product_id = rule.get('product_id')
            factor = rule.get('factor', 1.0)
            min_fit_threshold = float(rule.get('min_fit_threshold', 0.3) or 0.3)
            threshold_percentage = min_fit_threshold * 100 if min_fit_threshold <= 1 else min_fit_threshold

            if rule_type == 'suppress':
                scored = [
                    p for p in scored if p['product_id'] != product_id
                ]

            elif rule_type == 'boost':
                for product in scored:
                    if product['product_id'] == product_id:
                        # Only boost if product meets minimum fit threshold
                        if product['match_percentage'] >= threshold_percentage:
                            product['final_score'] *= float(factor)
                            product['scoring_breakdown']['moderation_boost'] = float(factor)

            elif rule_type == 'push':
                target_rank = rule.get('rank', 1)
                pushed_products.append({
                    'product_id': product_id,
                    'target_rank': target_rank,
                })

            elif rule_type == 'promote_if_close':
                conditional_promotions.append({
                    'product_id': product_id,
                    'max_rank': int(rule.get('max_rank', 2) or 2),
                    'max_gap_percent': float(rule.get('max_gap_percent', 3.0) or 3.0),
                })

        # Store push directives for use in ranking step
        self._pushed_products = pushed_products
        self._conditional_promotions = conditional_promotions

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
                    'type': rule.target_type,
                    'product_id': rule.target_product_id,
                    'factor': float(rule.boost_strength or 1.0),
                    'min_fit_threshold': float(rule.min_fit_threshold or 0.3),
                    'rank': int(rule.target_rank or 1),
                    'max_rank': int(rule.max_rank or 2),
                    'max_gap_percent': float(rule.max_gap_percent or 3.0),
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

        promotions = getattr(self, '_conditional_promotions', [])
        for promotion in promotions:
            if not scored:
                break

            top_match = float(scored[0].get('match_percentage', 0) or 0)
            pid = promotion['product_id']
            max_rank = max(1, int(promotion.get('max_rank', 2) or 2))
            max_gap_percent = max(0.0, float(promotion.get('max_gap_percent', 3.0) or 3.0))

            idx = next(
                (i for i, p in enumerate(scored) if p['product_id'] == pid),
                None,
            )
            if idx is None:
                continue

            current_rank = idx + 1
            candidate_match = float(scored[idx].get('match_percentage', 0) or 0)
            gap = top_match - candidate_match

            if current_rank <= max_rank and gap <= max_gap_percent:
                product = scored.pop(idx)
                scored.insert(0, product)
                product.setdefault('scoring_breakdown', {})['conditional_promotion'] = {
                    'applied': True,
                    'max_rank': max_rank,
                    'max_gap_percent': max_gap_percent,
                    'gap_to_top': gap,
                }

        # For explicit capability/headroom profiles, family diversity is less
        # important than keeping the strongest fit-to-need machines together.
        if self._is_capability_seeking_profile(getattr(self, 'preference_profile', {}) or {}):
            for rank_idx, product in enumerate(scored):
                product['rank'] = rank_idx + 1
                product['match_percentage'] = min(100, max(0, product['match_percentage']))
            return scored

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
