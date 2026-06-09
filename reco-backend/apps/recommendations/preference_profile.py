from __future__ import annotations

import json
import logging
import re

from apps.common.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)

PROFILE_FEATURE_KEYS = {
    "processor",
    "ram",
    "storage",
    "graphics",
    "display_size",
    "battery",
    "weight",
    "connectivity",
    "build_quality",
    "price",
    "compactness",
    "large_display",
    "portability",
    "value_for_money",
    "everyday_fit",
    "creative_headroom",
    "right_sized_performance",
    "media_comfort",
    "audio_quality",
    "readability",
    "simplicity",
    "touch_flexibility",
    "couch_comfort",
    "shared_viewing",
    "premium_experience",
    "gaming_orientation",
}

ANTI_FEATURE_KEYS = {
    "business_orientation",
    "gaming_orientation",
    "creator_orientation",
    "bulk_risk",
    "complexity_risk",
    "performance_overkill_risk",
}

LEVEL_FIELDS = {
    "performance_need_level",
    "portability_need_level",
    "battery_priority",
    "readability_priority",
    "simplicity_priority",
    "media_audio_priority",
    "touch_flexibility_preference",
    "shared_use_likelihood",
    "premium_preference",
    "value_sensitivity",
    "overkill_tolerance",
}


def _normalize_text(*parts) -> str:
    text = " ".join(str(part or "") for part in parts).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+\- ]+", " ", text)).strip()


def _clamp(value, lower=0.0, upper=1.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = 0.0
    return max(lower, min(upper, numeric))


def _has_any(text: str, phrases: list[str]) -> bool:
    normalized_text = _normalize_text(text)
    for phrase in phrases:
        normalized_phrase = _normalize_text(phrase)
        if not normalized_phrase:
            continue
        pattern = r"(?<![a-z0-9])" + re.escape(normalized_phrase).replace(r"\ ", r"\s+") + r"(?![a-z0-9])"
        if re.search(pattern, normalized_text):
            return True
    return False


def _is_high_performance_gaming_context(context: str, voice_tags=None) -> bool:
    text = _normalize_text(context, _tag_text(voice_tags))
    gaming_signal = _has_any(text, [
        "gaming", "gamer", "games", "game", "esports", "aaa", "gta", "fc 27",
    ])
    if not gaming_signal:
        return False
    return _has_any(text, [
        "high performance", "high-performance", "high end gpu", "high-end gpu",
        "strong gpu", "powerful gpu", "lag free", "lag-free", "smooth aaa",
        "heavy games", "demanding games", "latest titles", "latest games",
        "aaa story", "aaa titles", "gta 6", "gta vi", "pro gaming display",
        "high refresh", "high-refresh", "competitive esports", "thermal cooling",
        "cooling", "raw gaming power", "maximum settings", "heavy lag-free gaming",
    ])


def _is_explicit_capability_context(context: str, voice_tags=None) -> bool:
    text = _normalize_text(context, _tag_text(voice_tags))
    return _has_any(text, [
        "high performance", "high-performance", "powerful", "fast", "lag free", "lag-free",
        "heavy multitasking", "heavy workload", "room to grow", "future proof",
        "future-proof", "future ready", "premium", "latest", "pro", "professional",
        "full stack", "full-stack", "app development", "software development",
        "development tools", "compile", "compiling", "virtual machines", "docker",
        "video editing", "3d", "cad", "rendering", "creator", "creative work",
        "large spreadsheets", "stock trading", "data analysis", "engineering",
        "high refresh", "high-refresh", "strong gpu", "high end gpu", "high-end gpu",
    ])


def _uses_any(profile: dict, modes: set[str]) -> bool:
    return bool(set(profile.get("primary_usage_modes", []) or []) & modes)


def _has_creative_or_visual_context(context: str, voice_tags=None) -> bool:
    text = _normalize_text(context, _tag_text(voice_tags))
    return _has_any(text, [
        "video editing", "editing", "3d", "cad", "rendering", "creative",
        "creator", "visual work", "game development", "development tools",
    ])


def _has_explicit_value_context(context: str, voice_tags=None) -> bool:
    text = _normalize_text(context, _tag_text(voice_tags))
    return _has_any(text, [
        "value", "budget", "affordable", "cheap", "lowest price", "best deal",
        "balanced value", "practical", "right sized", "right-sized",
    ])


def _has_explicit_mobility_context(context: str, voice_tags=None) -> bool:
    text = _normalize_text(context, _tag_text(voice_tags))
    return _has_any(text, [
        "travel", "commute", "carry", "classes", "campus", "portable",
        "lightweight", "moving between", "on the go", "mobile",
    ])


def _tag_text(voice_tags) -> str:
    parts = []
    for tag in voice_tags or []:
        if isinstance(tag, dict):
            parts.append(str(tag.get("text") or tag.get("tag") or ""))
            parts.append(str(tag.get("category") or ""))
        else:
            parts.append(str(tag))
    return " ".join(parts)


def _answer_context(session, answers, voice_tags) -> str:
    lines = [
        f"Session ID: {getattr(session, 'session_id', '')}",
        f"Discovery mode: {getattr(session, 'discovery_mode', '') or 'guided'}",
    ]

    if voice_tags:
        lines.append("Detected input tags:")
        lines.append(_tag_text(voice_tags))

    if answers:
        lines.append("Captured inputs and answers:")
        for answer in answers:
            source = "discovery" if getattr(answer, "from_voice", False) else "question"
            question = str(getattr(answer, "question_text", "") or "").strip()
            value = str(getattr(answer, "answer_value", "") or "").strip()
            if not question and not value:
                continue
            lines.append(f"- [{source}] {question}: {value}")

    return "\n".join(lines)


def build_preference_profile(session, answers, voice_tags) -> dict:
    """
    Build a rich, profile-centric representation of the buyer need.

    This is intentionally separate from product scoring weights. The LLM turns
    all captured inputs into a stable semantic schema; scoring and reranking
    then evaluate products against that profile.
    """
    context = _answer_context(session, answers, voice_tags)
    if not context.strip():
        return _fallback_preference_profile("", voice_tags)

    prompt = (
        "Convert the following laptop recommendation inputs into a structured preference profile.\n"
        "Do not recommend products. Do not add assumptions beyond the evidence.\n"
        "Return ONLY valid JSON with this shape:\n"
        "{\n"
        '  "profile_confidence": 0.0,\n'
        '  "primary_user_type": "student|professional|coder|gamer|creator|parent|teacher|casual_user|shared_family|unknown",\n'
        '  "buyer_relation": "self|spouse_partner|parent|child_student|family_member|team_employee|shared|unknown",\n'
        '  "primary_usage_modes": ["study","productivity","coding","gaming","creative","streaming","browsing","remote_work","travel","shared_family"],\n'
        '  "performance_need_level": 0.0,\n'
        '  "portability_need_level": 0.0,\n'
        '  "battery_priority": 0.0,\n'
        '  "readability_priority": 0.0,\n'
        '  "simplicity_priority": 0.0,\n'
        '  "media_audio_priority": 0.0,\n'
        '  "touch_flexibility_preference": 0.0,\n'
        '  "shared_use_likelihood": 0.0,\n'
        '  "premium_preference": 0.0,\n'
        '  "value_sensitivity": 0.0,\n'
        '  "overkill_tolerance": 0.0,\n'
        '  "form_factor_preference": "traditional|convertible|flexible|no_preference|unknown",\n'
        '  "screen_preference": "compact|standard|large|quality|no_preference|unknown",\n'
        '  "feature_priorities": {"feature_key": 0.0},\n'
        '  "anti_priorities": {"feature_key": 0.0},\n'
        '  "must_haves": ["string"],\n'
        '  "deal_breakers": ["string"],\n'
        '  "profile_summary": "one short sentence"\n'
        "}\n\n"
        "Feature priority keys may include only: "
        f"{', '.join(sorted(PROFILE_FEATURE_KEYS))}.\n"
        "Anti-priority keys may include only: "
        f"{', '.join(sorted(ANTI_FEATURE_KEYS))}.\n"
        "Use numeric levels from 0 to 1. Higher means more important.\n"
        "Map the evidence into human-fit dimensions such as comfort, simplicity, media, readability, portability, right-sized performance, and flexibility.\n\n"
        f"INPUTS:\n{context}"
    )

    try:
        raw_response = BedrockClient().invoke(
            prompt=prompt,
            temperature=0.15,
            max_tokens=1600,
        )
        return _normalize_preference_profile(_parse_json_object(raw_response), context, voice_tags)
    except Exception as exc:
        logger.warning("Preference profile generation failed: %s", exc)
        return _fallback_preference_profile(context, voice_tags)


def _parse_json_object(raw_response: str) -> dict:
    text = str(raw_response or "").strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1:]
        if text.endswith("```"):
            text = text[:-3].strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise
        payload = json.loads(text[start:end + 1])

    return payload if isinstance(payload, dict) else {}


def _normalize_preference_profile(payload: dict, context: str, voice_tags) -> dict:
    fallback = _fallback_preference_profile(context, voice_tags)
    profile = {
        "profile_confidence": _clamp(payload.get("profile_confidence", fallback["profile_confidence"])),
        "primary_user_type": _safe_string(payload.get("primary_user_type"), fallback["primary_user_type"]),
        "buyer_relation": _safe_string(payload.get("buyer_relation"), fallback["buyer_relation"]),
        "primary_usage_modes": _safe_string_list(payload.get("primary_usage_modes"), fallback["primary_usage_modes"]),
        "form_factor_preference": _safe_string(payload.get("form_factor_preference"), fallback["form_factor_preference"]),
        "screen_preference": _safe_string(payload.get("screen_preference"), fallback["screen_preference"]),
        "must_haves": _safe_string_list(payload.get("must_haves"), fallback["must_haves"])[:8],
        "deal_breakers": _safe_string_list(payload.get("deal_breakers"), fallback["deal_breakers"])[:8],
        "profile_summary": _safe_string(payload.get("profile_summary"), fallback["profile_summary"])[:280],
    }

    for field in LEVEL_FIELDS:
        profile[field] = _clamp(payload.get(field, fallback.get(field, 0.0)))

    feature_priorities = _normalize_priority_dict(
        payload.get("feature_priorities"),
        PROFILE_FEATURE_KEYS,
    )
    anti_priorities = _normalize_priority_dict(
        payload.get("anti_priorities"),
        ANTI_FEATURE_KEYS,
    )

    profile["feature_priorities"] = _merge_priority_dicts(
        _derive_priorities_from_profile(profile),
        feature_priorities,
    )
    profile["anti_priorities"] = _merge_priority_dicts(
        _derive_anti_priorities_from_profile(profile),
        anti_priorities,
    )

    profile = _apply_context_calibrations(profile, context, voice_tags)

    return profile


def _apply_context_calibrations(profile: dict, context: str, voice_tags=None) -> dict:
    high_performance_gaming = _is_high_performance_gaming_context(context, voice_tags)
    capability_context = high_performance_gaming or _is_explicit_capability_context(context, voice_tags)
    if not capability_context:
        return profile

    profile = dict(profile)
    usage_modes = list(profile.get("primary_usage_modes", []) or [])
    text = _normalize_text(context, _tag_text(voice_tags))
    if high_performance_gaming and "gaming" not in usage_modes:
        usage_modes.append("gaming")
    if _has_creative_or_visual_context(context, voice_tags) and "creative" not in usage_modes:
        usage_modes.append("creative")
    if _has_any(text, ["coding", "programming", "development", "full stack", "full-stack", "app development", "software"]) and "coding" not in usage_modes:
        usage_modes.append("coding")
    if _has_any(text, ["office", "productivity", "spreadsheets", "presentation", "stock trading", "data analysis"]) and "productivity" not in usage_modes:
        usage_modes.append("productivity")
    profile["primary_usage_modes"] = usage_modes

    usage_mode_set = set(usage_modes)
    if high_performance_gaming and profile.get("primary_user_type") in {"unknown", "casual_user"}:
        profile["primary_user_type"] = "gamer"

    heavy_modes = usage_mode_set & {"gaming", "creative"}
    work_modes = usage_mode_set & {"coding", "productivity", "remote_work"}
    performance_floor = 0.9 if high_performance_gaming or heavy_modes else 0.78
    premium_floor = 0.72 if high_performance_gaming or _has_any(text, ["premium", "latest", "pro", "future proof", "future-proof"]) else 0.52
    overkill_floor = 0.9 if high_performance_gaming else 0.72

    profile["performance_need_level"] = max(_clamp(profile.get("performance_need_level")), performance_floor)
    profile["premium_preference"] = max(_clamp(profile.get("premium_preference")), premium_floor)
    profile["overkill_tolerance"] = max(_clamp(profile.get("overkill_tolerance")), overkill_floor)
    if not _has_any(text, ["simple", "easy", "basic", "low tech", "older adult", "parent", "grandparent"]):
        profile["simplicity_priority"] = min(_clamp(profile.get("simplicity_priority")), 0.28)

    if _has_explicit_value_context(context, voice_tags):
        profile["value_sensitivity"] = min(_clamp(profile.get("value_sensitivity")), 0.45)
    else:
        profile["value_sensitivity"] = min(_clamp(profile.get("value_sensitivity")), 0.18)

    if not _has_explicit_mobility_context(context, voice_tags):
        profile["portability_need_level"] = min(_clamp(profile.get("portability_need_level")), 0.28)
        profile["battery_priority"] = min(_clamp(profile.get("battery_priority")), 0.42)

    feature_priorities = dict(profile.get("feature_priorities", {}) or {})

    def bump_priority(key: str, value: float) -> None:
        feature_priorities[key] = max(_clamp(feature_priorities.get(key, 0.0)), _clamp(value))

    bump_priority("processor", 0.92 if high_performance_gaming or heavy_modes else 0.84)
    bump_priority("ram", 0.78 if work_modes else 0.62)
    bump_priority("storage", 0.5 if work_modes or heavy_modes else 0.34)
    bump_priority("display_size", 0.82 if high_performance_gaming or _has_any(text, ["display", "screen", "visual", "video", "3d", "cad", "spreadsheets"]) else 0.58)
    bump_priority("premium_experience", premium_floor)
    bump_priority("creative_headroom", 0.76 if heavy_modes or work_modes else 0.58)
    bump_priority("build_quality", 0.66)
    if high_performance_gaming or heavy_modes or _has_any(text, ["gpu", "graphics", "3d", "cad", "rendering", "video editing"]):
        bump_priority("graphics", 1.0 if high_performance_gaming else 0.82)
    if high_performance_gaming:
        bump_priority("gaming_orientation", 0.78)
    if work_modes:
        bump_priority("connectivity", 0.54)

    if not _has_explicit_value_context(context, voice_tags):
        for key, cap in {
            "price": 0.14,
            "value_for_money": 0.3,
            "everyday_fit": 0.24,
            "right_sized_performance": 0.42,
            "simplicity": 0.18,
        }.items():
            if key in feature_priorities:
                feature_priorities[key] = min(_clamp(feature_priorities[key]), cap)

    anti_priorities = dict(profile.get("anti_priorities", {}) or {})
    for key in ("performance_overkill_risk", "complexity_risk"):
        anti_priorities.pop(key, None)
    if high_performance_gaming or "creative" in usage_mode_set:
        anti_priorities.pop("creator_orientation", None)
    if work_modes or "study" in usage_mode_set:
        anti_priorities.pop("business_orientation", None)

    profile["feature_priorities"] = {
        key: round(value, 3)
        for key, value in sorted(feature_priorities.items())
        if _clamp(value) >= 0.03
    }
    profile["anti_priorities"] = {
        key: round(value, 3)
        for key, value in sorted(anti_priorities.items())
        if _clamp(value) >= 0.03
    }
    return profile


def _safe_string(value, fallback="") -> str:
    text = str(value or "").strip().lower().replace(" ", "_")
    return text or fallback


def _safe_string_list(value, fallback=None) -> list[str]:
    fallback = fallback or []
    if not isinstance(value, list):
        return list(fallback)
    output = []
    for item in value:
        text = str(item or "").strip().lower().replace(" ", "_")
        if text and text not in output:
            output.append(text)
    return output or list(fallback)


def _normalize_priority_dict(value, allowed_keys) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    output = {}
    for key, raw_priority in value.items():
        normalized_key = str(key or "").strip()
        if normalized_key not in allowed_keys:
            continue
        priority = _clamp(raw_priority)
        if priority >= 0.03:
            output[normalized_key] = priority
    return output


def _merge_priority_dicts(base: dict[str, float], incoming: dict[str, float]) -> dict[str, float]:
    merged = dict(base)
    for key, value in incoming.items():
        merged[key] = max(merged.get(key, 0.0), _clamp(value))
    return {
        key: round(value, 3)
        for key, value in sorted(merged.items())
        if value >= 0.03
    }


def _fallback_preference_profile(context: str, voice_tags) -> dict:
    text = _normalize_text(context, _tag_text(voice_tags))
    usage_modes = []
    for mode, phrases in {
        "study": ["study", "student", "school", "college", "assignment", "class"],
        "productivity": ["office", "productivity", "docs", "spreadsheet", "presentation"],
        "coding": ["coding", "programming", "development", "software"],
        "gaming": ["gaming", "games", "esports", "aaa"],
        "creative": ["creative", "design", "editing", "render", "3d", "cad"],
        "streaming": ["streaming", "entertainment", "media", "movie", "youtube", "netflix"],
        "browsing": ["browsing", "browser", "everyday", "home use"],
        "remote_work": ["remote work", "video call", "meeting"],
        "travel": ["travel", "commute", "carry", "portable"],
        "shared_family": ["shared", "family"],
    }.items():
        if _has_any(text, phrases):
            usage_modes.append(mode)

    primary_user_type = "unknown"
    if _has_any(text, ["my parent", "parent", "mother", "father"]):
        primary_user_type = "parent"
    elif _has_any(text, ["student", "school", "college", "child"]):
        primary_user_type = "student"
    elif _has_any(text, ["gamer", "gaming"]):
        primary_user_type = "gamer"
    elif _has_any(text, ["coder", "coding", "developer", "programming"]):
        primary_user_type = "coder"
    elif _has_any(text, ["creator", "creative", "editing", "design"]):
        primary_user_type = "creator"
    elif _has_any(text, ["work", "professional", "office"]):
        primary_user_type = "professional"

    buyer_relation = "unknown"
    if "my child" in text:
        buyer_relation = "child_student"
    elif "my parent" in text:
        buyer_relation = "parent"
    elif "myself" in text:
        buyer_relation = "self"
    elif "shared" in text:
        buyer_relation = "shared"

    profile = {
        "profile_confidence": 0.62 if usage_modes else 0.45,
        "primary_user_type": primary_user_type,
        "buyer_relation": buyer_relation,
        "primary_usage_modes": usage_modes or ["browsing"],
        "performance_need_level": 0.18,
        "portability_need_level": 0.32,
        "battery_priority": 0.34,
        "readability_priority": 0.28,
        "simplicity_priority": 0.3,
        "media_audio_priority": 0.18,
        "touch_flexibility_preference": 0.12,
        "shared_use_likelihood": 0.18,
        "premium_preference": 0.18,
        "value_sensitivity": 0.34,
        "overkill_tolerance": 0.28,
        "form_factor_preference": "no_preference",
        "screen_preference": "no_preference",
        "must_haves": [],
        "deal_breakers": [],
        "profile_summary": "Balanced everyday laptop fit.",
    }

    if "coding" in usage_modes:
        profile["performance_need_level"] = max(profile["performance_need_level"], 0.48)
    if "gaming" in usage_modes or "creative" in usage_modes:
        profile["performance_need_level"] = max(profile["performance_need_level"], 0.72)
        profile["premium_preference"] = max(profile["premium_preference"], 0.42)
    if "streaming" in usage_modes:
        profile["media_audio_priority"] = max(profile["media_audio_priority"], 0.72)
        profile["readability_priority"] = max(profile["readability_priority"], 0.62)
        profile["simplicity_priority"] = max(profile["simplicity_priority"], 0.52)
    if "shared_family" in usage_modes:
        profile["shared_use_likelihood"] = max(profile["shared_use_likelihood"], 0.65)
    if _has_any(text, ["portable", "moving around", "couch", "bed", "carry"]):
        profile["portability_need_level"] = max(profile["portability_need_level"], 0.68)
    if _has_any(text, ["battery", "long battery"]):
        profile["battery_priority"] = max(profile["battery_priority"], 0.68)
    if _has_any(text, ["easy to read", "readable", "comfortable viewing"]):
        profile["readability_priority"] = max(profile["readability_priority"], 0.78)
    if _has_any(text, ["simple", "easy", "navigation"]):
        profile["simplicity_priority"] = max(profile["simplicity_priority"], 0.75)
    if _has_any(text, ["touch", "2-in-1", "convertible", "pen"]):
        profile["touch_flexibility_preference"] = max(profile["touch_flexibility_preference"], 0.65)
        profile["form_factor_preference"] = "flexible"
    if _has_any(text, ["traditional laptop"]):
        profile["form_factor_preference"] = "traditional"
    if _has_any(text, ["compact", "13", "14"]):
        profile["screen_preference"] = "compact"
    elif _has_any(text, ["large", "15", "16", "big screen"]):
        profile["screen_preference"] = "large"

    profile["feature_priorities"] = _derive_priorities_from_profile(profile)
    profile["anti_priorities"] = _derive_anti_priorities_from_profile(profile)
    return _apply_context_calibrations(profile, context, voice_tags)


def _derive_priorities_from_profile(profile: dict) -> dict[str, float]:
    priorities: dict[str, float] = {}

    def bump(key: str, amount: float) -> None:
        priorities[key] = max(priorities.get(key, 0.0), _clamp(amount))

    performance = _clamp(profile.get("performance_need_level", 0.0))
    if performance:
        bump("right_sized_performance", max(0.18, 1.0 - abs(performance - 0.5)))
        bump("processor", performance * 0.55)
        bump("ram", performance * 0.5)
        bump("storage", performance * 0.28)
        if performance >= 0.62:
            bump("graphics", (performance - 0.45) * 0.7)
            bump("creative_headroom", performance * 0.45)
        if performance >= 0.82 and "gaming" in set(profile.get("primary_usage_modes", []) or []):
            bump("graphics", 1.0)
            bump("processor", 0.88)
            bump("display_size", 0.78)
            bump("premium_experience", 0.65)
            bump("creative_headroom", 0.66)

    portability = _clamp(profile.get("portability_need_level", 0.0))
    if portability:
        bump("portability", portability)
        bump("weight", portability * 0.95)
        bump("compactness", portability * 0.7)

    battery = _clamp(profile.get("battery_priority", 0.0))
    if battery:
        bump("battery", battery)
        bump("portability", battery * 0.42)

    readability = _clamp(profile.get("readability_priority", 0.0))
    if readability:
        bump("readability", readability)
        bump("media_comfort", readability * 0.45)
        bump("display_size", readability * 0.3)

    media = _clamp(profile.get("media_audio_priority", 0.0))
    if media:
        bump("media_comfort", media)
        bump("audio_quality", media)
        bump("battery", media * 0.36)
        bump("readability", media * 0.55)

    simplicity = _clamp(profile.get("simplicity_priority", 0.0))
    if simplicity:
        bump("simplicity", simplicity)
        bump("everyday_fit", simplicity * 0.72)
        bump("right_sized_performance", simplicity * 0.62)
        bump("value_for_money", simplicity * 0.45)

    touch = _clamp(profile.get("touch_flexibility_preference", 0.0))
    if touch:
        bump("touch_flexibility", touch)
        bump("couch_comfort", touch * 0.55)

    shared = _clamp(profile.get("shared_use_likelihood", 0.0))
    if shared:
        bump("shared_viewing", shared)
        bump("readability", shared * 0.5)
        bump("media_comfort", shared * 0.45)

    premium = _clamp(profile.get("premium_preference", 0.0))
    if premium:
        bump("premium_experience", premium)
        bump("build_quality", premium * 0.58)

    value = _clamp(profile.get("value_sensitivity", 0.0))
    if value:
        bump("value_for_money", value)
        bump("price", value * 0.72)
        bump("right_sized_performance", value * 0.42)

    screen_preference = str(profile.get("screen_preference", ""))
    if screen_preference == "compact":
        bump("compactness", 0.78)
        bump("weight", 0.62)
    elif screen_preference == "large":
        bump("large_display", 0.78)
        bump("display_size", 0.72)
    elif screen_preference == "quality":
        bump("readability", 0.78)
        bump("media_comfort", 0.62)

    if str(profile.get("form_factor_preference", "")) in {"convertible", "flexible"}:
        bump("touch_flexibility", 0.82)
        bump("couch_comfort", 0.6)

    return {key: round(value, 3) for key, value in priorities.items() if value >= 0.03}


def _derive_anti_priorities_from_profile(profile: dict) -> dict[str, float]:
    anti: dict[str, float] = {}

    def bump(key: str, amount: float) -> None:
        anti[key] = max(anti.get(key, 0.0), _clamp(amount))

    performance = _clamp(profile.get("performance_need_level", 0.0))
    overkill_tolerance = _clamp(profile.get("overkill_tolerance", 0.0))
    if performance < 0.42 and overkill_tolerance < 0.5:
        bump("performance_overkill_risk", 0.72 - performance)
        bump("gaming_orientation", 0.35)

    usage_modes = set(profile.get("primary_usage_modes", []) or [])
    if "gaming" not in usage_modes:
        bump("gaming_orientation", 0.35)
    if (
        "gaming" not in usage_modes
        and "creative" not in usage_modes
        and _clamp(profile.get("premium_preference", 0.0)) < 0.45
    ):
        bump("creator_orientation", 0.22)
    home_media_modes = usage_modes & {"streaming", "browsing", "shared_family"}
    work_or_study_modes = usage_modes & {"study", "productivity", "coding", "remote_work", "travel"}
    if home_media_modes and not work_or_study_modes:
        bump("business_orientation", 0.45)
    if _clamp(profile.get("portability_need_level", 0.0)) >= 0.58:
        bump("bulk_risk", 0.62)

    return {key: round(value, 3) for key, value in anti.items() if value >= 0.03}


def build_product_semantic_features(product_text: str, features: dict) -> dict[str, float]:
    text = _normalize_text(product_text)

    display_size = _clamp(features.get("display_size", 0.5))
    compactness = _clamp(features.get("compactness", 1.0 - display_size))
    large_display = _clamp(features.get("large_display", display_size))
    battery = _clamp(features.get("battery", 0.5))
    weight = _clamp(features.get("weight", 0.5))
    build_quality = _clamp(features.get("build_quality", 0.5))
    everyday_fit = _clamp(features.get("everyday_fit", 0.5))
    right_sized = _clamp(features.get("right_sized_performance", 0.5))
    price = _clamp(features.get("price", 0.5))

    touch = 0.0
    if _has_any(text, ["2-in-1", "2 in 1", "convertible", "pen support", "with pen"]):
        touch = 0.95
    elif "touch" in text or "pen" in text:
        touch = 0.68

    display_quality = 0.5
    if _has_any(text, ["oled", "2.8k", "2.5k", "wqxga", "100% dci-p3"]):
        display_quality = 0.92
    elif _has_any(text, ["100% srgb", "90hz", "120hz", "165hz"]):
        display_quality = 0.78
    elif _has_any(text, ["ips", "wuxga", "anti-glare", "300 nits"]):
        display_quality = 0.64
    elif "fhd" in text:
        display_quality = 0.54

    audio_quality = 0.5
    if _has_any(text, ["dolby", "speaker", "speakers", "audio", "sound"]):
        audio_quality = 0.82
    elif _has_any(text, ["yoga", "premium"]):
        audio_quality = 0.62

    gaming_orientation = 0.0
    if _has_any(text, ["legion", "loq"]):
        gaming_orientation = 0.9
    elif _has_any(text, ["g-sync", "esports", "gaming laptop", "pro gaming"]):
        gaming_orientation = 0.76
    elif _has_any(text, ["rtx", "gpu"]) and _has_any(text, ["high refresh", "high-refresh", "165hz", "240hz"]):
        gaming_orientation = 0.62
    elif _has_any(text, ["rtx", "gpu"]):
        gaming_orientation = 0.34

    business_orientation = 0.0
    if _has_any(text, ["thinkpad", "thinkbook", "business", "executive", "workhorse"]):
        business_orientation = 0.78

    creator_orientation = 0.0
    if _has_any(text, ["creator", "creative", "sketch", "pen", "oled", "design", "presenting"]):
        creator_orientation = 0.74

    premium_experience = _clamp(build_quality * 0.68 + display_quality * 0.22 + max(touch, audio_quality) * 0.1)
    readability = _clamp(display_quality * 0.45 + large_display * 0.24 + battery * 0.08 + (0.12 if "anti-glare" in text else 0.0) + (0.11 if "touch" in text else 0.0))
    media_comfort = _clamp(display_quality * 0.34 + audio_quality * 0.24 + battery * 0.18 + weight * 0.12 + max(touch, large_display) * 0.12)
    simplicity = _clamp(everyday_fit * 0.35 + right_sized * 0.25 + price * 0.15 + weight * 0.12 + max(touch, 0.35) * 0.13)
    couch_comfort = _clamp(weight * 0.32 + compactness * 0.26 + battery * 0.2 + touch * 0.22)
    shared_viewing = _clamp(display_quality * 0.32 + large_display * 0.22 + audio_quality * 0.22 + battery * 0.1 + touch * 0.14)
    bulk_risk = _clamp(1.0 - weight)
    complexity_risk = _clamp(gaming_orientation * 0.44 + creator_orientation * 0.18 + business_orientation * 0.16 + (1.0 - right_sized) * 0.22)

    return {
        "media_comfort": round(media_comfort, 3),
        "audio_quality": round(audio_quality, 3),
        "readability": round(readability, 3),
        "simplicity": round(simplicity, 3),
        "touch_flexibility": round(touch, 3),
        "couch_comfort": round(couch_comfort, 3),
        "shared_viewing": round(shared_viewing, 3),
        "premium_experience": round(premium_experience, 3),
        "business_orientation": round(business_orientation, 3),
        "creator_orientation": round(creator_orientation, 3),
        "gaming_orientation": round(gaming_orientation, 3),
        "bulk_risk": round(bulk_risk, 3),
        "complexity_risk": round(complexity_risk, 3),
    }


def compute_preference_profile_fit(features: dict, preference_profile: dict) -> tuple[float, dict]:
    priorities = preference_profile.get("feature_priorities", {}) if isinstance(preference_profile, dict) else {}
    anti_priorities = preference_profile.get("anti_priorities", {}) if isinstance(preference_profile, dict) else {}

    if not priorities and not anti_priorities:
        return 0.5, {
            "raw_profile_fit": 0.5,
            "anti_penalty": 0.0,
            "priority_matches": {},
            "anti_matches": {},
        }

    total_priority = sum(max(0.0, float(value or 0.0)) for value in priorities.values())
    raw_fit = 0.0
    priority_matches = {}
    if total_priority > 0:
        for key, raw_weight in priorities.items():
            weight = max(0.0, float(raw_weight or 0.0)) / total_priority
            fit = _clamp(features.get(key, 0.0))
            priority_matches[key] = round(fit, 3)
            raw_fit += weight * fit
    else:
        raw_fit = 0.5

    total_anti = sum(max(0.0, float(value or 0.0)) for value in anti_priorities.values())
    anti_penalty = 0.0
    anti_matches = {}
    if total_anti > 0:
        for key, raw_weight in anti_priorities.items():
            weight = max(0.0, float(raw_weight or 0.0)) / total_anti
            fit = _clamp(features.get(key, 0.0))
            anti_matches[key] = round(fit, 3)
            anti_penalty += weight * fit

    overkill_tolerance = _clamp(preference_profile.get("overkill_tolerance", 0.35))
    penalty_strength = 0.18 + (1.0 - overkill_tolerance) * 0.32
    final_fit = _clamp(raw_fit - anti_penalty * penalty_strength)

    return final_fit, {
        "raw_profile_fit": round(raw_fit, 3),
        "anti_penalty": round(anti_penalty * penalty_strength, 3),
        "priority_matches": priority_matches,
        "anti_matches": anti_matches,
    }
