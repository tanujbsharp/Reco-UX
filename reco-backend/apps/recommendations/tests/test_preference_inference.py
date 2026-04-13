import unittest

from apps.recommendations.preference_inference import infer_answer_score_effect


class PreferenceInferenceTests(unittest.TestCase):
    def _adjustments(self, question_text: str, answer_value: str) -> dict[str, float]:
        return infer_answer_score_effect(question_text, answer_value)["weight_adjustments"]

    def test_display_neutral_answer_does_not_trigger_high_end_performance(self):
        adjustments = self._adjustments(
            "What screen size and style would work best for your development work?",
            "display isnt a huge deal, anything average or above is fine",
        )

        self.assertLess(abs(adjustments.get("processor", 0.0)), 0.11)
        self.assertGreater(adjustments.get("right_sized_performance", 0.0), 0.0)
        self.assertLess(adjustments.get("creative_headroom", 0.0), 0.1)

    def test_standard_development_stays_moderate_and_right_sized(self):
        adjustments = self._adjustments(
            "For your development work, which performance profile best matches your needs?",
            "Standard Development",
        )

        self.assertLess(adjustments.get("processor", 0.0), 0.2)
        self.assertGreater(adjustments.get("right_sized_performance", 0.0), 0.2)
        self.assertLess(adjustments.get("graphics", 0.0), 0.0)

    def test_more_screen_space_targets_display_without_fake_processor_boost(self):
        adjustments = self._adjustments(
            "What screen feel sounds best for you?",
            "More screen space",
        )

        self.assertGreater(adjustments.get("large_display", 0.0), 0.4)
        self.assertGreater(adjustments.get("display_size", 0.0), 0.2)
        self.assertLess(abs(adjustments.get("processor", 0.0)), 0.11)

    def test_business_reliability_strengthens_build_and_connectivity(self):
        adjustments = self._adjustments(
            "What's your top priority for this development laptop?",
            "Business Reliability",
        )

        self.assertGreater(adjustments.get("build_quality", 0.0), 0.25)
        self.assertGreater(adjustments.get("connectivity", 0.0), 0.2)
        self.assertLess(abs(adjustments.get("processor", 0.0)), 0.11)


if __name__ == "__main__":
    unittest.main()
