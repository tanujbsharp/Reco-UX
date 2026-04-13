"""
Question Orchestrator for Bsharp Reco.

Generates adaptive follow-up questions using Amazon Bedrock (Claude).
No pre-authored question bank — every question is LLM-generated based
on session state, product catalog dimensions, and moderation rules.

Stopping condition: confidence >= 0.85 or question_number > max_questions.
"""
import json
import logging
import time
import re

from apps.common.bedrock_client import BedrockClient
from apps.sessions_app.models import CustomerSession, SessionAnswer
from apps.questions.models import LLMCallLog

try:
    from apps.packets.models import FeatureValue, Product
    PACKETS_AVAILABLE = True
except (ImportError, Exception):
    PACKETS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Orchestrator defaults
DEFAULT_MAX_QUESTIONS = 5
MIN_QUESTIONS_BEFORE_DONE = 5
CONFIDENCE_THRESHOLD = 0.85

SYSTEM_PROMPT = (
    "You are a retail product recommendation assistant for Bsharp Reco. "
    "Your job is to ask the next best question to understand the customer's "
    "needs and narrow down product recommendations.\n\n"
    "RULES:\n"
    "1. Generate exactly ONE question at a time.\n"
    "2. Each question must bring the conversation closer to a confident recommendation.\n"
    "3. Consider the customer's previous answers and voice tags to avoid redundancy.\n"
    "4. You must continue asking follow-up questions until at least 5 follow-up questions "
    "have been answered. Before that point, done MUST be false.\n"
    "5. If discovery input exists and zero follow-up questions have been answered so far, "
    "you MUST ask a targeted clarifying question based on that discovery input. "
    "In that case, done MUST be false.\n"
    "6. You may signal done only after at least 5 follow-up questions have been answered "
    "or if there is no discovery input at all and the customer already provided enough "
    "structured information.\n"
    "7. Keep questions conversational and easy to understand.\n"
    "8. Use ONLY question types supported by the UI: single-choice or multi-choice.\n"
    "9. Always provide 3 to 5 options. Include an 'Other' option only when it materially helps.\n"
    "10. Provide meaningful options with short descriptions and icon suggestions.\n\n"
    "11. NEVER ask about budget, price range, or affordability.\n"
    "12. NEVER ask the customer to choose a processor, CPU, chip, GPU, RAM size, or storage tier directly.\n"
    "13. NEVER mention Apple, Mac, M1, M2, M3, M4, Ryzen, Intel, Core, Ultra, Snapdragon, NVIDIA, RTX, GTX, Radeon, or GeForce.\n"
    "14. Ask outcome-based questions only: workload, carry pattern, screen feel, battery vs headroom, gaming/3D need, touch/2-in-1 need, desk-vs-travel, or final tie-breakers.\n"
    "15. Only mention capabilities that are actually represented in the active catalog summary.\n"
    "16. If discovery input exists, personalize the question to that discovery input instead of using a generic question.\n"
    "17. If discovery input does not exist, ask a general question that still helps differentiate the best fit.\n\n"
    "You MUST respond with ONLY valid JSON matching this schema:\n"
    "{\n"
    '  "question": "string — the question text",\n'
    '  "type": "single-choice | multi-choice",\n'
    '  "options": [{"label": "string", "description": "string", "icon": "string"}],\n'
    '  "question_number": integer,\n'
    '  "total_estimated": integer — estimated total questions needed,\n'
    '  "confidence": float 0.0-1.0 — how confident you are about recommending,\n'
    '  "done": boolean — true if confidence >= 0.85 or all info gathered\n'
    "}\n\n"
    "Do NOT include any text outside the JSON object."
)

QUESTION_GOALS = {
    1: "Clarify the main real-world use case or workload in plain language.",
    2: "Clarify carry pattern, mobility, or daily environment.",
    3: "Clarify preferred screen feel, size, or form factor in plain language.",
    4: "Clarify how much performance headroom is actually needed, without using processor or GPU jargon.",
    5: "Clarify the final tie-breaker: value, portability, display quality, flexibility, or long-term headroom.",
}

QUESTION_BANNED_PATTERNS = [
    r"\bbudget\b",
    r"\bprice\b",
    r"\bcost\b",
    r"\bafford",
    r"\bprocessor\b",
    r"\bcpu\b",
    r"\bchip\b",
    r"\bram\b",
    r"\bstorage\b",
    r"\bssd\b",
    r"\bapple\b",
    r"\bmac\b",
    r"\bm[1-4]\b",
    r"\bintel\b",
    r"\bryzen\b",
    r"\bcore\b",
    r"\bultra\b",
    r"\bsnapdragon\b",
    r"\bnvidia\b",
    r"\brtx\b",
    r"\bgtx\b",
    r"\bradeon\b",
    r"\bgeforce\b",
]


def _extract_discovery_tags(answer):
    """Extract normalized discovery tags from a voice/text discovery answer."""
    score_effect = answer.score_effect if isinstance(answer.score_effect, dict) else {}
    raw_tags = score_effect.get('tags', [])
    tags = []

    if isinstance(raw_tags, list):
        for raw_tag in raw_tags:
            if isinstance(raw_tag, dict):
                text = (
                    raw_tag.get('text')
                    or raw_tag.get('tag')
                    or ''
                )
                category = raw_tag.get('category', '')
                confidence = raw_tag.get('confidence', 0.0)
            else:
                text = str(raw_tag)
                category = ''
                confidence = 0.0

            text = str(text).strip()
            if not text:
                continue

            try:
                confidence = float(confidence)
            except (TypeError, ValueError):
                confidence = 0.0

            tags.append({
                'text': text,
                'category': str(category).strip(),
                'confidence': confidence,
            })

    return tags


def _build_session_context(session, answers):
    """
    Build a context string from session state for the LLM prompt.

    Includes: discovery mode, voice tags (from answers flagged as from_voice),
    previous Q&A pairs, and session metadata.
    """
    context_parts = []

    # Session metadata
    context_parts.append(f"Session ID: {session.session_id}")
    context_parts.append(f"Discovery mode: {session.discovery_mode or 'guided'}")

    if session.packet_id:
        context_parts.append(f"Packet ID: {session.packet_id}")

    # Collect discovery inputs and structured tags from voice/text discovery answers.
    voice_inputs = [a for a in answers if a.from_voice]
    if voice_inputs:
        context_parts.append("\nDiscovery inputs:")
        for vi in voice_inputs:
            score_effect = vi.score_effect if isinstance(vi.score_effect, dict) else {}
            discovery_text = str(score_effect.get('discovery_text', '')).strip()

            if discovery_text:
                context_parts.append(f"  - Discovery brief: \"{discovery_text}\"")
            else:
                context_parts.append(f"  - Discovery brief: \"{vi.answer_value}\"")

            discovery_mode = str(score_effect.get('discovery_mode', '')).strip()
            if discovery_mode:
                context_parts.append(f"    Mode: {discovery_mode}")

            tags = _extract_discovery_tags(vi)
            if tags:
                context_parts.append("    Extracted tags:")
                for tag in tags:
                    category = tag['category'] or 'uncategorized'
                    confidence = tag['confidence']
                    context_parts.append(
                        f"      - {category}: {tag['text']} (confidence={confidence:.2f})"
                    )

    # Previous Q&A history
    non_voice_answers = [a for a in answers if not a.from_voice]
    if non_voice_answers:
        context_parts.append("\nPrevious questions and answers:")
        for idx, ans in enumerate(non_voice_answers, 1):
            context_parts.append(f"  Q{idx}: {ans.question_text}")
            context_parts.append(f"  A{idx}: {ans.answer_value}")

    # Summary
    total_answered = len(non_voice_answers)
    context_parts.append(f"\nQuestions answered so far: {total_answered}")

    return "\n".join(context_parts)


def _has_discovery_signal(answers):
    """Return True when discovery text or extracted tags exist in the session."""
    for answer in answers:
        if not answer.from_voice:
            continue

        if str(answer.answer_value).strip():
            return True

        if _extract_discovery_tags(answer):
            return True

    return False


def _forced_first_question(answers, question_number, max_questions):
    """
    Defensive fallback when the model tries to skip question generation
    despite having discovery input. Keeps the flow moving with a
    discovery-aware clarifying card.
    """
    categories = set()
    for answer in answers:
        if not answer.from_voice:
            continue
        for tag in _extract_discovery_tags(answer):
            if tag['category']:
                categories.add(tag['category'])

    if 'usage' in categories:
        return {
            'question': 'Which workflow should this recommendation prioritize most?',
            'type': 'single-choice',
            'options': [
                {'label': 'Study & everyday use', 'description': 'Classes, research, streaming, daily tasks', 'icon': 'BookOpen'},
                {'label': 'Work & productivity', 'description': 'Office apps, browsing, multitasking', 'icon': 'BriefcaseBusiness'},
                {'label': 'Coding & technical work', 'description': 'Development tools, terminals, heavier workflows', 'icon': 'Code2'},
                {'label': 'Creative work', 'description': 'Editing, design, rendering, media-heavy tasks', 'icon': 'Clapperboard'},
                {'label': 'Gaming & 3D work', 'description': 'Modern games, streaming, or graphics-heavy tools', 'icon': 'Gauge'},
            ],
            'question_number': question_number,
            'total_estimated': max_questions,
            'confidence': 0.35,
            'done': False,
        }

    if 'performance' in categories or 'portability' in categories:
        return {
            'question': 'If we have to trade off, which matters more for you?',
            'type': 'single-choice',
            'options': [
                {'label': 'Performance first', 'description': 'Prioritize speed, headroom, and heavier workloads', 'icon': 'Gauge'},
                {'label': 'Balanced', 'description': 'Keep both performance and mobility in good shape', 'icon': 'Scaling'},
                {'label': 'Portability first', 'description': 'Prioritize lighter carry and easier daily movement', 'icon': 'Feather'},
                {'label': 'Battery first', 'description': 'Prioritize unplugged usage as much as possible', 'icon': 'BatteryFull'},
            ],
            'question_number': question_number,
            'total_estimated': max_questions,
            'confidence': 0.35,
            'done': False,
        }

    return {
        'question': 'Which of these sounds closest to how you will use the laptop most?',
        'type': 'single-choice',
        'options': [
            {'label': 'Classes, browsing, and Office work', 'description': 'Daily student or productivity use', 'icon': 'BookOpen'},
            {'label': 'Coding and assignments', 'description': 'Development tools and multitasking', 'icon': 'Code2'},
            {'label': 'Creative projects', 'description': 'Design, editing, and media work', 'icon': 'Clapperboard'},
            {'label': 'Gaming or 3D-heavy work', 'description': 'Modern games, streaming, or graphics-heavy tools', 'icon': 'Gauge'},
            {'label': 'A mix of everything', 'description': 'A balanced all-round fit', 'icon': 'Scaling'},
        ],
        'prefill_from_tags': ['usage'],
        'question_number': question_number,
        'total_estimated': max_questions,
        'confidence': 0.30,
        'done': False,
    }


def _catalog_capabilities(session):
    caps = {
        'has_dedicated_graphics': False,
        'has_convertible': False,
        'has_large_screen': False,
        'has_compact_screen': False,
    }
    if not PACKETS_AVAILABLE:
        return caps

    products = Product.objects.none()
    if session.packet_id:
        products = Product.objects.filter(packet_id=session.packet_id)
    else:
        products = Product.objects.filter(packet__cmid=session.cmid)

    for product in products:
        signature = f"{product.family} {product.model}".lower()
        if '2-in-1' in signature or 'convertible' in signature:
            caps['has_convertible'] = True
        if any(token in signature for token in ['15', '16']):
            caps['has_large_screen'] = True
        if any(token in signature for token in ['13', '14']):
            caps['has_compact_screen'] = True

    feature_values = FeatureValue.objects.filter(product__in=products).select_related('feature')
    for fv in feature_values:
        code = fv.feature.feature_code
        value = str(fv.value or '').lower()
        if code == 'graphics' and any(token in value for token in ['nvidia', 'rtx', 'gtx']):
            caps['has_dedicated_graphics'] = True
        if code == 'display_size' and any(token in value for token in ['15', '16']):
            caps['has_large_screen'] = True
        if code == 'display_size' and any(token in value for token in ['13', '14']):
            caps['has_compact_screen'] = True

    return caps


def _build_catalog_context(session):
    if not PACKETS_AVAILABLE:
        return "Catalog summary unavailable."

    if session.packet_id:
        products = Product.objects.filter(packet_id=session.packet_id).order_by('product_id')
    else:
        products = Product.objects.filter(packet__cmid=session.cmid).order_by('product_id')

    if not products.exists():
        return "Catalog summary unavailable."

    summary_lines = []
    feature_qs = (
        FeatureValue.objects
        .filter(product__in=products)
        .select_related('feature', 'product')
    )
    feature_map = {}
    for feature_value in feature_qs:
        product_features = feature_map.setdefault(feature_value.product_id, {})
        product_features[feature_value.feature.feature_code] = str(feature_value.value or '').strip()

    for product in products[:12]:
        features = feature_map.get(product.product_id, {})
        display = features.get('display_size') or ''
        graphics = features.get('graphics') or ''
        processor = features.get('processor') or ''
        line_parts = [
            product.model,
            f"family={product.family}",
            f"price={product.price}",
        ]
        if display:
            line_parts.append(f"display={display}")
        if processor:
            line_parts.append(f"processor={processor}")
        if graphics:
            line_parts.append(f"graphics={graphics}")
        if '2-in-1' in product.model.lower():
            line_parts.append("form=2-in-1")
        summary_lines.append(f"- {' | '.join(line_parts)}")

    caps = _catalog_capabilities(session)
    capability_line = (
        "Catalog capabilities: "
        f"dedicated_graphics={caps.get('has_dedicated_graphics')}, "
        f"convertible={caps.get('has_convertible')}, "
        f"large_screen={caps.get('has_large_screen')}, "
        f"compact_screen={caps.get('has_compact_screen')}"
    )

    return "\n".join([capability_line, "Available products:", *summary_lines])


def _catalog_question_bank(caps):
    screen_options = [
        {'label': 'Easy to carry', 'description': 'A smaller, lighter everyday carry', 'icon': 'Feather'},
        {'label': 'Balanced 14-inch feel', 'description': 'A middle ground between comfort and portability', 'icon': 'Laptop2'},
    ]
    if caps.get('has_large_screen'):
        screen_options.append(
            {'label': 'More screen space', 'description': 'Better for split-screen work and spreadsheets', 'icon': 'MonitorUp'}
        )
    if caps.get('has_convertible'):
        screen_options.append(
            {'label': 'Touch or pen-friendly', 'description': 'Useful for handwriting, sketching, or flexible use', 'icon': 'PanelLeftOpen'}
        )
    screen_options.append(
        {'label': 'Not sure yet', 'description': 'Let the recommendation decide the best fit', 'icon': 'CircleHelp'}
    )

    headroom_options = [
        {'label': 'Just regular student or office use', 'description': 'No need to overspend for extra power', 'icon': 'BriefcaseBusiness'},
        {'label': 'Coding and multitasking', 'description': 'More room for development tools and tabs', 'icon': 'Code2'},
        {'label': 'Creative work with a better display', 'description': 'Editing, design, or media projects', 'icon': 'Clapperboard'},
    ]
    if caps.get('has_dedicated_graphics'):
        headroom_options.append(
            {'label': 'Gaming, 3D, or heavier editing', 'description': 'A real graphics boost is important', 'icon': 'Gauge'}
        )
    headroom_options.append(
        {'label': 'Not sure yet', 'description': 'Show me the safest fit', 'icon': 'CircleHelp'}
    )

    final_priority_options = [
        {'label': "Best fit for today's needs", 'description': 'Avoid paying for more than I need right now', 'icon': 'Scaling'},
        {'label': 'Room to grow over time', 'description': 'A bit more headroom for future needs', 'icon': 'Sparkles'},
        {'label': 'Lighter carry and battery', 'description': 'Easy daily movement matters most', 'icon': 'BatteryFull'},
        {'label': 'More ports and durability', 'description': 'Better for long-term practical use', 'icon': 'PlugZap'},
    ]
    if caps.get('has_convertible'):
        final_priority_options.append(
            {'label': 'Touch or 2-in-1 flexibility', 'description': 'A convertible design would be useful', 'icon': 'PanelLeftOpen'}
        )
    else:
        final_priority_options.append(
            {'label': 'Better display quality', 'description': 'A nicer panel matters more than extras', 'icon': 'Monitor'}
        )

    return [
        {
            'question': 'Which of these sounds closest to how you will use the laptop most?',
            'type': 'single-choice',
            'options': [
                {'label': 'Classes, browsing, and Office work', 'description': 'Student use, docs, slides, and everyday tasks', 'icon': 'BookOpen'},
                {'label': 'Coding and assignments', 'description': 'Development tools, terminals, and multitasking', 'icon': 'Code2'},
                {'label': 'Creative projects', 'description': 'Design, editing, and media work', 'icon': 'Clapperboard'},
                {'label': 'Gaming or 3D-heavy work', 'description': 'Modern games, streaming, or graphics-heavy tools', 'icon': 'Gauge'},
                {'label': 'A bit of everything', 'description': 'I want a balanced all-round laptop', 'icon': 'Scaling'},
            ],
            'prefill_from_tags': ['usage'],
        },
        {
            'question': 'How often will you carry it around?',
            'type': 'single-choice',
            'options': [
                {'label': 'Every day', 'description': 'Weight and battery matter a lot', 'icon': 'Backpack'},
                {'label': 'A few times a week', 'description': 'I want a balance of comfort and mobility', 'icon': 'MoveRight'},
                {'label': 'Mostly stays on a desk', 'description': 'Screen and performance can matter more', 'icon': 'Monitor'},
                {'label': 'Not sure yet', 'description': 'Keep both options open', 'icon': 'CircleHelp'},
            ],
            'prefill_from_tags': ['portability'],
        },
        {
            'question': 'What screen feel sounds best for you?',
            'type': 'single-choice',
            'options': screen_options[:5],
            'prefill_from_tags': ['screen-size'],
        },
        {
            'question': 'How much extra graphics or performance headroom do you really need?',
            'type': 'single-choice',
            'options': headroom_options[:5],
            'prefill_from_tags': ['performance', 'features'],
        },
        {
            'question': 'What should decide the final pick if two options both fit?',
            'type': 'single-choice',
            'options': final_priority_options[:5],
            'prefill_from_tags': ['priority', 'features'],
        },
    ]


def _deterministic_question(session, answers, question_number, max_questions):
    caps = _catalog_capabilities(session)
    bank = _catalog_question_bank(caps)
    index = min(max(question_number - 1, 0), len(bank) - 1)
    question = dict(bank[index])
    question.update({
        'question_number': question_number,
        'total_estimated': max_questions,
        'confidence': round(min(0.2 + 0.13 * (question_number - 1), 0.8), 2),
        'done': False,
    })
    return question


def _build_generation_prompt(session, answers, question_number, max_questions):
    goal = QUESTION_GOALS.get(question_number, QUESTION_GOALS[5])
    context = _build_session_context(session, answers)
    catalog_context = _build_catalog_context(session)
    return (
        f"Ask question {question_number} of {max_questions}.\n"
        f"Current question goal: {goal}\n\n"
        "You are asking a Lenovo-laptop recommendation question. "
        "Use the discovery brief and previous answers to tailor the next question. "
        "If the customer already hinted at a dimension, ask the next unresolved trade-off instead of repeating it.\n\n"
        "Question design requirements:\n"
        "- Ask in plain English, not tech jargon.\n"
        "- Do not ask for budget.\n"
        "- Do not ask for processor, CPU, chip, RAM, storage, or GPU selection.\n"
        "- Do not mention brands or chips outside the Lenovo catalog.\n"
        "- Keep options short and realistic.\n"
        "- If gaming or 3D is relevant, ask about that need in plain language rather than GPU names.\n"
        "- If touch/2-in-1 is relevant, only ask about it when the catalog supports it.\n\n"
        f"SESSION CONTEXT:\n{context}\n\n"
        f"CATALOG CONTEXT:\n{catalog_context}\n\n"
        "Return only the next question JSON."
    )


def _question_has_banned_content(question_obj):
    text_parts = [str(question_obj.get('question', '')).strip().lower()]
    for option in question_obj.get('options', []):
        if not isinstance(option, dict):
            continue
        text_parts.append(str(option.get('label', '')).strip().lower())
        text_parts.append(str(option.get('description', '')).strip().lower())

    combined = " ".join(part for part in text_parts if part)
    return any(re.search(pattern, combined) for pattern in QUESTION_BANNED_PATTERNS)


def _question_repeats_history(question_obj, answers):
    new_question = str(question_obj.get('question', '')).strip().lower()
    if not new_question:
        return False
    previous_questions = {
        str(answer.question_text or '').strip().lower()
        for answer in answers
        if not answer.from_voice
    }
    return new_question in previous_questions


def _validate_llm_question(question_obj, session, answers, question_number, max_questions):
    normalized = _normalize_question_response(question_obj, question_number, max_questions)
    normalized['question_number'] = question_number
    normalized['total_estimated'] = max_questions
    normalized['done'] = False

    if _question_has_banned_content(normalized) or _question_repeats_history(normalized, answers):
        if _has_discovery_signal(answers) and question_number == 1:
            return _forced_first_question(answers, question_number, max_questions)
        return _deterministic_question(session, answers, question_number, max_questions)

    return normalized


def generate_next_question(session_id, max_questions=None):
    """
    Generate the next question for a customer session using Bedrock.

    Args:
        session_id: The CustomerSession primary key.
        max_questions: Override for maximum number of questions (default 5).

    Returns:
        dict: A question object with keys: question, type, options,
              question_number, total_estimated, confidence, done.
              If done is True, includes a 'message' field instead of question details.

    Raises:
        CustomerSession.DoesNotExist: If session not found.
    """
    max_q = max_questions or DEFAULT_MAX_QUESTIONS

    # Step 1: Load session with answers
    session = CustomerSession.objects.get(pk=session_id)
    answers = list(
        SessionAnswer.objects.filter(session=session).order_by('created_at')
    )

    # Count non-voice answers (these are the actual Q&A interactions)
    qa_answers = [a for a in answers if not a.from_voice]
    current_question_number = len(qa_answers) + 1
    has_discovery_signal = _has_discovery_signal(answers)

    # Step 2: Check stopping condition — max questions reached
    if current_question_number > max_q:
        logger.info(
            'Session %s reached max questions (%d). Signaling done.',
            session_id,
            max_q,
        )
        return {
            'done': True,
            'confidence': 1.0,
            'question_number': current_question_number,
            'total_estimated': max_q,
            'message': 'Ready for recommendations',
        }

    if not has_discovery_signal:
        return _deterministic_question(session, answers, current_question_number, max_q)

    start_ms = _now_ms()
    try:
        prompt = _build_generation_prompt(session, answers, current_question_number, max_q)
        client = BedrockClient()
        raw_response = client.invoke(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=0.35,
            max_tokens=768,
        )
        question_obj = _parse_question_response(raw_response, current_question_number, max_q)
        question_obj = _validate_llm_question(
            question_obj, session, answers, current_question_number, max_q,
        )
        _log_llm_call(session, 'question', _now_ms() - start_ms)
        return question_obj
    except Exception:
        logger.exception('Question generation failed for session %s', session_id)
        _log_llm_call(session, 'question', _now_ms() - start_ms)
        if has_discovery_signal and current_question_number == 1:
            return _forced_first_question(answers, current_question_number, max_q)
        return _deterministic_question(session, answers, current_question_number, max_q)


def _parse_question_response(raw_response, question_number, max_questions):
    """
    Parse and validate the LLM response into a structured question dict.

    Handles cases where the LLM wraps JSON in markdown code fences
    or returns extra text around the JSON.
    """
    text = raw_response.strip()

    # Strip markdown code fences if present
    if text.startswith('```'):
        # Remove opening fence (with optional language identifier)
        first_newline = text.index('\n')
        text = text[first_newline + 1:]
        # Remove closing fence
        if text.endswith('```'):
            text = text[:-3].strip()

    try:
        question_obj = json.loads(text)
    except json.JSONDecodeError:
        # Attempt to extract JSON object from the response
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                question_obj = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.error('Failed to parse LLM question response: %s', text[:500])
                # Return a sensible fallback
                return _fallback_question(question_number, max_questions)
        else:
            logger.error('No JSON object found in LLM response: %s', text[:500])
            return _fallback_question(question_number, max_questions)

    # Ensure required fields exist with correct types
    question_obj.setdefault('question_number', question_number)
    question_obj.setdefault('total_estimated', max_questions)
    question_obj.setdefault('confidence', 0.0)
    question_obj.setdefault('done', False)
    question_obj.setdefault('type', 'single-choice')
    question_obj.setdefault('options', [])

    # Coerce confidence to float
    try:
        question_obj['confidence'] = float(question_obj['confidence'])
    except (ValueError, TypeError):
        question_obj['confidence'] = 0.0

    return question_obj


def _normalize_question_response(question_obj, question_number, max_questions):
    """Normalize LLM output into a UI-safe question payload."""
    normalized = dict(question_obj or {})
    raw_type = str(normalized.get('type', 'single-choice')).strip()
    normalized['type'] = 'multi-choice' if raw_type == 'multi-choice' else 'single-choice'

    options = normalized.get('options', [])
    safe_options = []
    if isinstance(options, list):
        for option in options:
            if not isinstance(option, dict):
                continue
            label = str(option.get('label', '')).strip()
            if not label:
                continue
            safe_options.append({
                'label': label,
                'description': str(option.get('description', '')).strip(),
                'icon': str(option.get('icon', 'CircleHelp')).strip() or 'CircleHelp',
            })

    if not normalized.get('done') and len(safe_options) < 3:
        return _fallback_question(question_number, max_questions)

    normalized['options'] = safe_options[:5]
    normalized['question'] = str(normalized.get('question', '')).strip()
    prefill_from_tags = normalized.get('prefill_from_tags', [])
    normalized['prefill_from_tags'] = [
        str(tag).strip() for tag in prefill_from_tags if str(tag).strip()
    ] if isinstance(prefill_from_tags, list) else []
    if not normalized.get('done') and not normalized['question']:
        return _fallback_question(question_number, max_questions)

    return normalized


def _fallback_question(question_number, max_questions):
    """
    Return a safe fallback question when LLM parsing fails.
    This keeps the conversation going rather than erroring out.
    """
    return {
        'question': 'Which of these matters most for the laptop you want us to recommend?',
        'type': 'single-choice',
        'options': [
            {'label': 'Everyday student or office fit', 'description': 'Simple, practical, and enough for daily work', 'icon': 'BriefcaseBusiness'},
            {'label': 'More headroom for coding or heavier use', 'description': 'A bit more power for future needs', 'icon': 'Gauge'},
            {'label': 'Gaming or 3D capability', 'description': 'Useful for graphics-heavy work and modern games', 'icon': 'Clapperboard'},
            {'label': 'Easy daily carry', 'description': 'Lower weight and better mobility', 'icon': 'Feather'},
            {'label': 'Better screen or overall quality', 'description': 'A nicer premium experience', 'icon': 'Sparkles'},
        ],
        'prefill_from_tags': ['priority', 'features'],
        'question_number': question_number,
        'total_estimated': max_questions,
        'confidence': 0.0,
        'done': False,
    }


def _log_llm_call(session, call_type, latency_ms):
    """Log the LLM call for observability and cost tracking."""
    try:
        LLMCallLog.objects.create(
            session=session,
            call_type=call_type,
            latency_ms=int(latency_ms),
            cache_hit=False,
        )
    except Exception:
        logger.warning('Failed to log LLM call for session %s', session.session_id)


def _now_ms():
    """Current time in milliseconds."""
    return int(time.time() * 1000)
