"""
Question Orchestrator for Bsharp Reco.

Flow:
1. Ask who the primary user is.
2. Ask the top intended use cases.
3-5. Generate Bedrock-driven follow-up questions tailored to the
   primary user, use cases, discovery brief, manual tags, and any
   detected user archetype.

Stopping condition: question_number > max_questions.
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

PRIMARY_USER_QUESTION_TEXT = 'Who is the primary user for this laptop?'
USE_CASE_QUESTION_TEXT = 'What will it mainly be used for?'

PRIMARY_USER_QUESTION = {
    'question': PRIMARY_USER_QUESTION_TEXT,
    'type': 'single-choice',
    'options': [
        {'label': 'Myself', 'description': 'I am choosing for my own use', 'icon': 'CircleHelp'},
        {'label': 'My spouse or partner', 'description': 'For my husband, wife, or partner', 'icon': 'CircleHelp'},
        {'label': 'My parent', 'description': 'For my mother, father, or an older parent', 'icon': 'CircleHelp'},
        {'label': 'My child who is a student', 'description': 'For school, college, or academic use', 'icon': 'BookOpen'},
        {'label': 'My sibling or another family member', 'description': 'For someone else in the family', 'icon': 'CircleHelp'},
        {'label': 'My team or employee', 'description': 'For work or business use by someone else', 'icon': 'BriefcaseBusiness'},
        {'label': 'A shared family device', 'description': 'More than one person will use it regularly', 'icon': 'Laptop2'},
    ],
}

USE_CASE_QUESTION = {
    'question': USE_CASE_QUESTION_TEXT,
    'type': 'multi-choice',
    'options': [
        {'label': 'Study and assignments', 'description': 'Schoolwork, notes, research, and projects', 'icon': 'BookOpen'},
        {'label': 'College classes and project work', 'description': 'Presentations, coursework, and submissions', 'icon': 'BookOpen'},
        {'label': 'Work and productivity', 'description': 'Docs, spreadsheets, browsing, and multitasking', 'icon': 'BriefcaseBusiness'},
        {'label': 'Coding and software development', 'description': 'Development tools, terminals, and local builds', 'icon': 'Code2'},
        {'label': 'Content creation and design', 'description': 'Design, editing, and creative tools', 'icon': 'Clapperboard'},
        {'label': 'Video editing, 3D, or CAD', 'description': 'Heavier creative or technical workloads', 'icon': 'Clapperboard'},
        {'label': 'Gaming and esports', 'description': 'Casual to competitive gaming needs', 'icon': 'Gauge'},
        {'label': 'Streaming and content consumption', 'description': 'Movies, YouTube, OTT, and music', 'icon': 'MonitorSpeaker'},
        {'label': 'Remote work and video calls', 'description': 'Meetings, collaboration, and home-office use', 'icon': 'ScreenShare'},
        {'label': 'Business travel and presentations', 'description': 'Frequent carry, travel, and client meetings', 'icon': 'Backpack'},
        {'label': 'Everyday browsing and home use', 'description': 'Simple daily use for general tasks', 'icon': 'Laptop2'},
        {'label': 'Shared family use', 'description': 'A mix of different household needs', 'icon': 'CircleHelp'},
    ],
}

SYSTEM_PROMPT = (
    "You are a retail product recommendation assistant for Bsharp Reco. "
    "Your job is to ask the next best question to understand the customer's "
    "needs and narrow down product recommendations.\n\n"
    "RULES:\n"
    "1. Generate exactly ONE question at a time.\n"
    "2. This generator is used only for questions 3, 4, and 5. "
    "Questions 1 and 2 have already established the primary user and use cases.\n"
    "3. Each question must become more specific to that primary user and those use cases.\n"
    "4. Consider the customer's previous answers, discovery brief, manual tags, and detected archetype to avoid redundancy.\n"
    "5. Ask only the most decision-useful unresolved question for recommending the right laptop.\n"
    "6. Keep questions conversational and easy to understand.\n"
    "7. Use ONLY question types supported by the UI: single-choice or multi-choice.\n"
    "8. Always provide 3 to 5 options with short descriptions and icon suggestions.\n"
    "9. done MUST be false for these follow-up questions.\n\n"
    "10. NEVER ask about budget, price range, or affordability.\n"
    "11. NEVER ask the customer to choose a processor, CPU, chip, GPU, RAM size, or storage tier directly.\n"
    "12. NEVER mention Apple, Mac, M1, M2, M3, M4, Ryzen, Intel, Core, Ultra, Snapdragon, NVIDIA, RTX, GTX, Radeon, or GeForce.\n"
    "13. Ask outcome-based questions only: workflow intensity, portability pattern, screen/form factor feel, collaboration habits, creative/gaming intensity, desk-vs-travel context, accessory needs, battery expectations, or final deal-breakers.\n"
    "14. Only mention capabilities that are actually represented in the active catalog summary.\n\n"
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

    detected_archetype = str(score_effect.get('detected_archetype', '')).strip()
    if detected_archetype:
        archetype_confidence = score_effect.get('detected_archetype_confidence', 0.0)
        try:
            archetype_confidence = float(archetype_confidence)
        except (TypeError, ValueError):
            archetype_confidence = 0.0
        tags.append({
            'text': detected_archetype,
            'category': 'user-archetype',
            'confidence': archetype_confidence,
        })

    return tags


def _extract_profile_answers(answers):
    primary_user = ''
    use_cases = ''

    for answer in answers:
        if answer.from_voice:
            continue

        question_text = str(answer.question_text or '').strip()
        answer_value = str(answer.answer_value or '').strip()
        if question_text == PRIMARY_USER_QUESTION_TEXT:
            primary_user = answer_value
        elif question_text == USE_CASE_QUESTION_TEXT:
            use_cases = answer_value

    return primary_user, use_cases


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

            detected_archetype = str(score_effect.get('detected_archetype', '')).strip()
            if detected_archetype:
                confidence = score_effect.get('detected_archetype_confidence', 0.0)
                try:
                    confidence = float(confidence)
                except (TypeError, ValueError):
                    confidence = 0.0
                context_parts.append(
                    f"    Detected user archetype: {detected_archetype} (confidence={confidence:.2f})"
                )

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
    primary_user, use_cases = _extract_profile_answers(answers)
    if primary_user:
        context_parts.append(f"\nPrimary user: {primary_user}")
    if use_cases:
        context_parts.append(f"Declared use cases: {use_cases}")
    if non_voice_answers:
        context_parts.append("\nPrevious questions and answers:")
        for idx, ans in enumerate(non_voice_answers, 1):
            context_parts.append(f"  Q{idx}: {ans.question_text}")
            context_parts.append(f"  A{idx}: {ans.answer_value}")

    # Summary
    total_answered = len(non_voice_answers)
    context_parts.append(f"\nQuestions answered so far: {total_answered}")

    return "\n".join(context_parts)


def _fixed_question(question_number, max_questions):
    if question_number == 1:
        payload = dict(PRIMARY_USER_QUESTION)
    else:
        payload = dict(USE_CASE_QUESTION)

    payload.update({
        'question_number': question_number,
        'total_estimated': max_questions,
        'confidence': round(0.18 * question_number, 2),
        'done': False,
    })
    return payload


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


def _deterministic_question(session, answers, question_number, max_questions):
    del session, answers
    return _fallback_question(question_number, max_questions)


def _build_generation_prompt(session, answers, question_number, max_questions):
    context = _build_session_context(session, answers)
    catalog_context = _build_catalog_context(session)
    return (
        f"Ask question {question_number} of {max_questions}.\n"
        "You are generating one of the final three recommendation questions. "
        "Questions 1 and 2 already captured the primary user and intended use cases. "
        "Use the discovery brief, detected archetype, manual tags, and previous answers to tailor the next question. "
        "The next question must be more specific to that exact person and use case combination.\n\n"
        "Question design requirements:\n"
        "- Ask the single most useful unresolved question for narrowing the shortlist.\n"
        "- Questions 3, 4, and 5 should progressively get more specific.\n"
        "- Ask in plain English, not tech jargon.\n"
        "- Do not ask for budget.\n"
        "- Do not ask for processor, CPU, chip, RAM, storage, or GPU selection.\n"
        "- Do not mention brands or chips outside the Lenovo catalog.\n"
        "- Keep options short and realistic.\n"
        "- Prefer real-life scenarios, workload intensity, portability patterns, collaboration setup, display/form-factor feel, content creation intensity, gaming intensity, or deal-breakers.\n"
        "- If gaming or 3D is relevant, ask about that need in plain language rather than GPU names.\n"
        "- If touch/2-in-1 is relevant, only ask about it when the catalog supports it.\n"
        "- Use multi-choice when multiple answers can reasonably apply.\n\n"
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

    if current_question_number <= 2:
        return _fixed_question(current_question_number, max_q)

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
        'question': 'Which situation should we optimize for most when picking the final laptop?',
        'type': 'multi-choice',
        'options': [
            {'label': 'Heavy multitasking days', 'description': 'Many apps, tabs, and background tools open together', 'icon': 'Gauge'},
            {'label': 'Frequent travel or daily carry', 'description': 'Lower weight and easier mobility matter a lot', 'icon': 'Backpack'},
            {'label': 'Long meetings or classes away from a charger', 'description': 'Battery reliability matters more', 'icon': 'BatteryFull'},
            {'label': 'Creative or visual work', 'description': 'Editing, design, presentations, or richer visuals', 'icon': 'Clapperboard'},
            {'label': 'Shared or flexible use', 'description': 'More than one kind of workload needs to fit well', 'icon': 'Scaling'},
        ],
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
