from unittest.mock import patch

from django.test import SimpleTestCase

from apps.recommendations.preference_inference import infer_answer_score_effect
from apps.recommendations.preference_profile import (
    build_product_semantic_features,
    compute_preference_profile_fit,
    build_preference_profile,
    _normalize_preference_profile,
)


class PreferenceProfileTests(SimpleTestCase):
    @patch("apps.recommendations.preference_profile.BedrockClient")
    def test_build_preference_profile_parses_human_fit_dimensions(self, bedrock_client_cls):
        bedrock_client_cls.return_value.invoke.return_value = (
            '{"profile_confidence":0.86,'
            '"primary_user_type":"parent",'
            '"buyer_relation":"parent",'
            '"primary_usage_modes":["streaming","browsing","shared_family"],'
            '"performance_need_level":0.18,'
            '"portability_need_level":0.66,'
            '"battery_priority":0.72,'
            '"readability_priority":0.82,'
            '"simplicity_priority":0.9,'
            '"media_audio_priority":0.86,'
            '"touch_flexibility_preference":0.58,'
            '"shared_use_likelihood":0.76,'
            '"premium_preference":0.3,'
            '"value_sensitivity":0.42,'
            '"overkill_tolerance":0.22,'
            '"form_factor_preference":"flexible",'
            '"screen_preference":"compact",'
            '"feature_priorities":{"media_comfort":0.9,"simplicity":0.8},'
            '"anti_priorities":{"business_orientation":0.7,"gaming_orientation":0.6},'
            '"must_haves":["good speakers"],'
            '"deal_breakers":[],'
            '"profile_summary":"Parent-focused streaming and simple daily use."}'
        )

        profile = build_preference_profile(
            session=object(),
            answers=[],
            voice_tags=[{"text": "media streaming", "category": "usage"}],
        )

        self.assertEqual(profile["primary_user_type"], "parent")
        self.assertGreater(profile["feature_priorities"]["media_comfort"], 0.8)
        self.assertGreater(profile["anti_priorities"]["business_orientation"], 0.6)

    def test_semantic_product_fit_rewards_profile_match_and_penalizes_anti_fit(self):
        yoga_features = {
            "display_size": 0.62,
            "battery": 0.8,
            "weight": 0.78,
            "build_quality": 0.92,
            "price": 0.35,
            "everyday_fit": 0.7,
            "right_sized_performance": 0.8,
            "compactness": 0.38,
            "large_display": 0.62,
        }
        thinkpad_features = {
            "display_size": 0.58,
            "battery": 0.46,
            "weight": 0.74,
            "build_quality": 0.84,
            "price": 0.62,
            "everyday_fit": 0.66,
            "right_sized_performance": 0.76,
            "compactness": 0.42,
            "large_display": 0.58,
        }

        yoga_features.update(
            build_product_semantic_features(
                'Yoga 7i 2-in-1 14" 2.8K OLED touch, 70 Wh, convertible with pen',
                yoga_features,
            )
        )
        thinkpad_features.update(
            build_product_semantic_features(
                'ThinkPad E14 business durability and ports, 14" WUXGA IPS anti-glare',
                thinkpad_features,
            )
        )
        profile = {
            "overkill_tolerance": 0.2,
            "feature_priorities": {
                "media_comfort": 0.9,
                "simplicity": 0.8,
                "touch_flexibility": 0.7,
                "battery": 0.7,
            },
            "anti_priorities": {
                "business_orientation": 0.8,
                "gaming_orientation": 0.5,
            },
        }

        yoga_fit, _ = compute_preference_profile_fit(yoga_features, profile)
        thinkpad_fit, _ = compute_preference_profile_fit(thinkpad_features, profile)

        self.assertGreater(yoga_fit, thinkpad_fit)

    def test_media_streaming_does_not_trigger_gaming_graphics_boost(self):
        effect = infer_answer_score_effect(
            "What will it mainly be used for?",
            "Streaming and content consumption, media streaming, entertainment",
        )

        self.assertLessEqual(effect["weight_adjustments"].get("graphics", 0.0), 0.0)

    def test_high_performance_gaming_calibration_prefers_stronger_relevant_hardware(self):
        context = (
            "Customer wants gaming and esports, AAA story games, video editing, 3D or CAD, "
            "pro gaming display, heavy lag-free gaming, and must run heavy games like GTA 6."
        )
        profile = _normalize_preference_profile({}, context, [])

        self.assertIn("gaming", profile["primary_usage_modes"])
        self.assertIn("creative", profile["primary_usage_modes"])
        self.assertGreaterEqual(profile["performance_need_level"], 0.9)
        self.assertGreaterEqual(profile["overkill_tolerance"], 0.9)
        self.assertGreater(profile["feature_priorities"]["graphics"], 0.95)
        self.assertNotIn("creator_orientation", profile["anti_priorities"])
        self.assertNotIn("business_orientation", profile["anti_priorities"])

        legion_5_features = {
            "processor": 0.94,
            "graphics": 0.98,
            "display_size": 0.86,
            "battery": 0.86,
            "build_quality": 0.88,
            "creative_headroom": 0.92,
            "premium_experience": 0.78,
            "ram": 0.9,
            "price": 0.65,
            "value_for_money": 0.81,
            "everyday_fit": 0.69,
            "right_sized_performance": 0.72,
            "compactness": 0.3,
            "large_display": 0.86,
            "weight": 0.5,
        }
        legion_7_features = {
            "processor": 0.98,
            "graphics": 1.0,
            "display_size": 0.94,
            "battery": 0.88,
            "build_quality": 0.94,
            "creative_headroom": 0.95,
            "premium_experience": 0.88,
            "ram": 0.9,
            "price": 0.44,
            "value_for_money": 0.71,
            "everyday_fit": 0.63,
            "right_sized_performance": 0.66,
            "compactness": 0.25,
            "large_display": 0.94,
            "weight": 0.5,
        }
        legion_5_features.update(build_product_semantic_features(
            "Legion 5 high-end GPU performance pick RTX 5060 OLED high-refresh gaming display",
            legion_5_features,
        ))
        legion_7_features.update(build_product_semantic_features(
            "Legion 7 pro gaming and creative powerhouse RTX 5070 OLED high-refresh gaming display",
            legion_7_features,
        ))

        legion_5_fit, _ = compute_preference_profile_fit(legion_5_features, profile)
        legion_7_fit, _ = compute_preference_profile_fit(legion_7_features, profile)

        self.assertGreater(legion_7_fit, legion_5_fit)

    def test_coding_headroom_calibration_rewards_relevant_specs_without_forcing_gpu(self):
        context = (
            "Primary user is a student developer doing full-stack app development, "
            "Docker, compiling, Office work, and wants room to grow over time."
        )
        profile = _normalize_preference_profile({}, context, [])

        self.assertIn("coding", profile["primary_usage_modes"])
        self.assertGreaterEqual(profile["performance_need_level"], 0.78)
        self.assertGreaterEqual(profile["overkill_tolerance"], 0.72)
        self.assertGreaterEqual(profile["feature_priorities"]["processor"], 0.8)
        self.assertGreaterEqual(profile["feature_priorities"]["ram"], 0.7)
        self.assertGreaterEqual(profile["feature_priorities"]["creative_headroom"], 0.7)
        self.assertLess(profile["feature_priorities"].get("graphics", 0.0), 0.8)
        self.assertNotIn("business_orientation", profile["anti_priorities"])

    def test_light_simple_context_still_keeps_overkill_sensitivity(self):
        context = "Laptop for an older parent to browse, watch YouTube, and keep things simple."
        profile = _normalize_preference_profile({}, context, [])

        self.assertLess(profile["performance_need_level"], 0.5)
        self.assertLess(profile["overkill_tolerance"], 0.5)
        self.assertGreater(profile["feature_priorities"]["simplicity"], 0.7)
        self.assertIn("gaming_orientation", profile["anti_priorities"])
