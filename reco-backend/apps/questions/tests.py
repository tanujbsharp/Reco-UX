from unittest.mock import patch

from django.test import TestCase

from apps.questions.orchestrator import (
    PRIMARY_USER_QUESTION_TEXT,
    USE_CASE_QUESTION_TEXT,
    generate_next_question,
)
from apps.sessions_app.models import CustomerSession, SessionAnswer


class QuestionOrchestratorTests(TestCase):
    def setUp(self):
        self.session = CustomerSession.objects.create(
            cmid=1,
            user_id=7,
            discovery_mode='guided',
        )

    def test_first_question_is_primary_user(self):
        question = generate_next_question(self.session.session_id)

        self.assertEqual(question['question'], PRIMARY_USER_QUESTION_TEXT)
        self.assertEqual(question['type'], 'single-choice')
        self.assertEqual(question['question_number'], 1)

    def test_second_question_is_use_case(self):
        SessionAnswer.objects.create(
            session=self.session,
            question_text=PRIMARY_USER_QUESTION_TEXT,
            answer_value='My child who is a student',
            from_voice=False,
        )

        question = generate_next_question(self.session.session_id)

        self.assertEqual(question['question'], USE_CASE_QUESTION_TEXT)
        self.assertEqual(question['type'], 'multi-choice')
        self.assertEqual(question['question_number'], 2)

    @patch('apps.questions.orchestrator.BedrockClient')
    def test_third_question_prompt_includes_primary_user_use_case_and_archetype(self, bedrock_client_cls):
        SessionAnswer.objects.create(
            session=self.session,
            question_text='Customer discovery brief',
            answer_value='For my daughter in college who will also code.',
            from_voice=True,
            score_effect={
                'discovery_mode': 'text',
                'discovery_text': 'For my daughter in college who will also code.',
                'tags': [
                    {'text': 'college projects', 'category': 'usage', 'confidence': 0.91},
                ],
                'detected_archetype': 'student',
                'detected_archetype_confidence': 0.88,
            },
        )
        SessionAnswer.objects.create(
            session=self.session,
            question_text=PRIMARY_USER_QUESTION_TEXT,
            answer_value='My child who is a student',
            from_voice=False,
        )
        SessionAnswer.objects.create(
            session=self.session,
            question_text=USE_CASE_QUESTION_TEXT,
            answer_value='Study and assignments, Coding and software development',
            from_voice=False,
        )

        captured = {}

        def fake_invoke(*args, **kwargs):
            captured['prompt'] = kwargs.get('prompt') or (args[0] if args else '')
            return (
                '{"question":"Which environment will matter most day to day?",'
                '"type":"single-choice",'
                '"options":['
                '{"label":"Campus and commute","description":"Carried daily between classes","icon":"Backpack"},'
                '{"label":"Mostly dorm or desk","description":"Used mainly from one place","icon":"Monitor"},'
                '{"label":"A mix of both","description":"Some carry, some desk time","icon":"Scaling"}'
                '],'
                '"question_number":3,'
                '"total_estimated":5,'
                '"confidence":0.62,'
                '"done":false}'
            )

        bedrock_client_cls.return_value.invoke.side_effect = fake_invoke

        question = generate_next_question(self.session.session_id)

        self.assertEqual(question['question_number'], 3)
        self.assertIn('Primary user: My child who is a student', captured['prompt'])
        self.assertIn('Declared use cases: Study and assignments, Coding and software development', captured['prompt'])
        self.assertIn('Detected user archetype: student', captured['prompt'])
