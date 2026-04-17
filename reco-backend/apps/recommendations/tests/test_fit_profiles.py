import unittest

from apps.recommendations.fit_profiles import (
    build_intent_profile,
    build_requirement_profile,
    compute_intent_fit,
    compute_right_sized_performance_fit,
)


class FitProfileTests(unittest.TestCase):
    def test_balanced_development_prefers_adequate_capability_over_premium_overkill(self):
        weights = {
            "processor": 0.86,
            "ram": 0.78,
            "graphics": 0.18,
            "creative_headroom": 0.18,
            "price": 0.8,
            "value_for_money": 0.92,
            "portability": 0.66,
            "weight": 0.78,
            "battery": 0.72,
            "right_sized_performance": 0.72,
        }
        profile = build_requirement_profile(
            answer_texts=[
                "I want a laptop for coding and development",
                "Standard Development",
                "Business Reliability",
                "display isnt a huge deal, anything average or above is fine",
            ],
            voice_tags=[],
            weights=weights,
        )

        adequate_fit, _ = compute_right_sized_performance_fit(0.64, profile)
        overkill_fit, _ = compute_right_sized_performance_fit(0.81, profile)

        self.assertGreater(adequate_fit, overkill_fit)
        self.assertLess(profile["required_capability"], 0.72)

    def test_gaming_profile_prefers_high_capability(self):
        weights = {
            "processor": 1.0,
            "ram": 0.9,
            "graphics": 1.0,
            "creative_headroom": 0.6,
            "price": 0.35,
            "value_for_money": 0.4,
            "portability": 0.4,
            "weight": 0.35,
            "battery": 0.5,
            "right_sized_performance": 0.05,
        }
        profile = build_requirement_profile(
            answer_texts=[
                "I want a strong gaming laptop",
                "Maximum settings",
                "Raw gaming power",
                "Room to grow over time",
            ],
            voice_tags=[],
            weights=weights,
        )

        high_fit, _ = compute_right_sized_performance_fit(0.89, profile)
        moderate_fit, _ = compute_right_sized_performance_fit(0.62, profile)

        self.assertGreater(high_fit, moderate_fit)
        self.assertGreater(profile["required_capability"], 0.72)

    def test_everyday_intent_penalizes_expensive_gaming_overkill(self):
        profile = build_intent_profile(
            answer_texts=[
                "Classes browsing and Office work",
                "Best fit for today's needs",
            ],
            voice_tags=[],
            weights={},
        )

        everyday_fit, _ = compute_intent_fit(
            {
                "capability": 0.6,
                "value_for_money": 0.9,
                "everyday_fit": 0.86,
                "right_sized_performance": 0.9,
                "weight": 0.7,
                "battery": 0.7,
                "processor": 0.62,
                "ram": 0.62,
                "display_size": 0.58,
                "graphics": 0.3,
                "price": 0.82,
            },
            profile,
        )
        gaming_fit, _ = compute_intent_fit(
            {
                "capability": 0.92,
                "value_for_money": 0.45,
                "everyday_fit": 0.35,
                "right_sized_performance": 0.3,
                "weight": 0.1,
                "battery": 0.62,
                "processor": 0.96,
                "ram": 0.96,
                "display_size": 0.92,
                "graphics": 1.0,
                "price": 0.17,
            },
            profile,
        )

        self.assertEqual(profile["intent"], "everyday")
        self.assertGreater(everyday_fit, gaming_fit)

    def test_demanding_gaming_intent_prefers_dgpu_gaming_laptop(self):
        profile = build_intent_profile(
            answer_texts=[
                "High-performance gaming",
                "Modern AAA titles",
                "Room to grow over time",
            ],
            voice_tags=[],
            weights={},
        )

        dgpu_fit, _ = compute_intent_fit(
            {
                "capability": 0.9,
                "graphics": 0.96,
                "processor": 0.9,
                "ram": 0.62,
                "display_size": 0.88,
                "storage": 0.78,
                "build_quality": 0.88,
                "connectivity": 0.94,
                "battery": 0.86,
                "weight": 0.14,
                "price": 0.46,
            },
            profile,
        )
        integrated_fit, _ = compute_intent_fit(
            {
                "capability": 0.82,
                "graphics": 0.5,
                "processor": 0.88,
                "ram": 0.96,
                "display_size": 0.7,
                "storage": 0.78,
                "build_quality": 0.9,
                "connectivity": 0.88,
                "battery": 0.82,
                "weight": 0.64,
                "price": 0.4,
            },
            profile,
        )

        self.assertEqual(profile["intent"], "gaming_demanding")
        self.assertGreaterEqual(profile["required_floors"]["graphics"], 0.8)
        self.assertGreater(dgpu_fit, integrated_fit)


if __name__ == "__main__":
    unittest.main()
