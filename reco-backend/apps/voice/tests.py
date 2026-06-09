from unittest.mock import patch

from django.test import SimpleTestCase

from apps.voice.tag_extractor import analyze_customer_intent, extract_tags


class TagExtractorTests(SimpleTestCase):
    @patch('apps.voice.tag_extractor.BedrockClient')
    def test_analyze_customer_intent_parses_tags_and_archetype(self, bedrock_client_cls):
        bedrock_client_cls.return_value.invoke.return_value = (
            '{"tags":['
            '{"tag":"college coding","category":"usage","confidence":0.92},'
            '{"tag":"daily carry","category":"portability","confidence":0.74}'
            '],'
            '"archetype":{"label":"student","confidence":0.88}}'
        )

        result = analyze_customer_intent('Need a laptop for college and coding.')

        self.assertEqual(len(result['tags']), 2)
        self.assertEqual(result['archetype'], {'label': 'student', 'confidence': 0.88})

    @patch('apps.voice.tag_extractor.BedrockClient')
    def test_extract_tags_remains_compatible_with_list_response(self, bedrock_client_cls):
        bedrock_client_cls.return_value.invoke.return_value = (
            '['
            '{"tag":"gaming","category":"usage","confidence":0.93},'
            '{"tag":"high refresh","category":"features","confidence":0.69}'
            ']'
        )

        result = extract_tags('Gaming laptop with a smooth screen.')

        self.assertEqual(
            result,
            [
                {'tag': 'gaming', 'category': 'usage', 'confidence': 0.93},
                {'tag': 'high refresh', 'category': 'features', 'confidence': 0.69},
            ],
        )
