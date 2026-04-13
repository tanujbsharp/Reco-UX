import unittest

from apps.recommendations.fit_profiles import (
    build_requirement_profile,
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


if __name__ == "__main__":
    unittest.main()
