from __future__ import annotations

import re


def _normalize(*parts: str) -> str:
    text = " ".join(str(part or "") for part in parts).lower()
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9+\- ]+", " ", text)


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _has_any(text: str, phrases: list[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _voice_tag_text(voice_tags) -> str:
    collected: list[str] = []
    for tag in voice_tags or []:
        if isinstance(tag, dict):
            collected.append(str(tag.get("text") or tag.get("tag") or ""))
        else:
            collected.append(str(tag))
    return " ".join(collected)


def build_requirement_profile(answer_texts, voice_tags, weights) -> dict[str, float | str]:
    answer_blob = _normalize(" ".join(str(text or "") for text in answer_texts or []))
    voice_blob = _normalize(_voice_tag_text(voice_tags))
    text = _normalize(answer_blob, voice_blob)

    required_capability = 0.56
    headroom_preference = 0.04

    if _has_any(text, ["student", "office", "browsing", "everyday", "productivity", "study", "class"]):
        required_capability -= 0.08
    if _has_any(text, ["coding", "development", "programming", "software", "full stack"]):
        required_capability += 0.04
    if _has_any(text, ["docker", "virtual machine", "large codebase", "large codebases", "big apps", "big codebases"]):
        required_capability += 0.08
    if _has_any(text, ["creative", "design", "editing", "rendering", "3d", "cad"]):
        required_capability += 0.12
    if _has_any(text, ["gaming", "rtx", "gpu", "latest games", "aaa", "esports", "maximum settings", "raw gaming power"]):
        required_capability += 0.18

    if _has_any(text, ["standard development", "balanced", "not a huge deal", "average or above is fine"]):
        required_capability -= 0.05
    if "business reliability" in text:
        required_capability -= 0.02
    if "best fit for today" in text or "avoid paying for more than i need" in text:
        required_capability -= 0.06
    if "room to grow over time" in text:
        required_capability += 0.05
        headroom_preference += 0.04

    weight_delta = (
        (float(weights.get("processor", 0.66) or 0.66) - 0.66) * 0.12
        + (float(weights.get("ram", 0.56) or 0.56) - 0.56) * 0.1
        + (float(weights.get("graphics", 0.28) or 0.28) - 0.28) * 0.2
        + (float(weights.get("creative_headroom", 0.26) or 0.26) - 0.26) * 0.12
    )
    required_capability = _clamp(required_capability + weight_delta, 0.42, 0.88)

    if _has_any(text, ["heavy workloads", "maximum power", "highest settings", "raw performance", "future needs"]):
        headroom_preference += 0.03
    if _has_any(text, ["budget", "value", "affordable", "best fit for today"]):
        headroom_preference -= 0.01
    headroom_preference = _clamp(headroom_preference, 0.03, 0.12)

    overshoot_penalty = 0.85
    overshoot_penalty += max(0.0, float(weights.get("right_sized_performance", 0.22) or 0.22) - 0.22) * 1.0
    overshoot_penalty += max(0.0, float(weights.get("price", 0.64) or 0.64) - 0.64) * 0.7
    overshoot_penalty += max(0.0, float(weights.get("value_for_money", 0.62) or 0.62) - 0.62) * 0.8
    overshoot_penalty += max(0.0, float(weights.get("portability", 0.58) or 0.58) - 0.58) * 0.45
    overshoot_penalty += max(0.0, float(weights.get("weight", 0.7) or 0.7) - 0.7) * 0.4
    overshoot_penalty += max(0.0, float(weights.get("battery", 0.66) or 0.66) - 0.66) * 0.3
    overshoot_penalty -= max(0.0, float(weights.get("graphics", 0.28) or 0.28) - 0.28) * 0.6
    overshoot_penalty -= max(0.0, float(weights.get("creative_headroom", 0.26) or 0.26) - 0.26) * 0.45
    if "room to grow over time" in text:
        overshoot_penalty -= 0.12
    if "standard development" in text or "best fit for today" in text:
        overshoot_penalty += 0.12
    overshoot_penalty = _clamp(overshoot_penalty, 0.55, 1.5)

    undershoot_penalty = 1.05
    undershoot_penalty += max(0.0, float(weights.get("processor", 0.66) or 0.66) - 0.66) * 0.5
    undershoot_penalty += max(0.0, float(weights.get("ram", 0.56) or 0.56) - 0.56) * 0.4
    undershoot_penalty += max(0.0, float(weights.get("graphics", 0.28) or 0.28) - 0.28) * 0.75
    undershoot_penalty += max(0.0, float(weights.get("creative_headroom", 0.26) or 0.26) - 0.26) * 0.55
    if _has_any(text, ["docker", "virtual machine", "large codebase", "large codebases", "big apps", "big codebases"]):
        undershoot_penalty += 0.1
    if _has_any(text, ["creative", "design", "editing", "gaming", "rtx", "gpu"]):
        undershoot_penalty += 0.16
    undershoot_penalty = _clamp(undershoot_penalty, 0.95, 1.85)

    ideal_capability = _clamp(required_capability + headroom_preference, required_capability, 0.96)
    overshoot_buffer = _clamp(0.03 + headroom_preference * 0.45, 0.03, 0.09)

    if required_capability < 0.54:
        capability_label = "lean"
    elif required_capability < 0.66:
        capability_label = "balanced"
    elif required_capability < 0.78:
        capability_label = "performance"
    else:
        capability_label = "high-performance"

    if overshoot_penalty >= 1.1:
        overkill_label = "high"
    elif overshoot_penalty >= 0.8:
        overkill_label = "medium"
    else:
        overkill_label = "low"

    return {
        "required_capability": round(required_capability, 3),
        "ideal_capability": round(ideal_capability, 3),
        "headroom_preference": round(headroom_preference, 3),
        "overshoot_buffer": round(overshoot_buffer, 3),
        "overshoot_penalty": round(overshoot_penalty, 3),
        "undershoot_penalty": round(undershoot_penalty, 3),
        "capability_label": capability_label,
        "overkill_sensitivity": overkill_label,
    }


def compute_right_sized_performance_fit(capability: float, profile: dict[str, float | str]) -> tuple[float, dict[str, float]]:
    required_capability = float(profile.get("required_capability", 0.56) or 0.56)
    ideal_capability = float(profile.get("ideal_capability", required_capability) or required_capability)
    overshoot_buffer = float(profile.get("overshoot_buffer", 0.04) or 0.04)
    overshoot_penalty = float(profile.get("overshoot_penalty", 0.85) or 0.85)
    undershoot_penalty = float(profile.get("undershoot_penalty", 1.05) or 1.05)

    undershoot_risk = max(0.0, required_capability - capability)
    overkill_risk = max(0.0, capability - ideal_capability - overshoot_buffer)

    fit = 1.0
    fit -= undershoot_risk * undershoot_penalty * 1.9
    fit -= overkill_risk * overshoot_penalty * 1.6
    fit = _clamp(fit, 0.0, 1.0)

    return fit, {
        "required_capability": round(required_capability, 3),
        "ideal_capability": round(ideal_capability, 3),
        "capability": round(capability, 3),
        "undershoot_risk": round(undershoot_risk, 3),
        "overkill_risk": round(overkill_risk, 3),
    }


def compute_session_value_for_money(price_fit: float, capability: float, right_sized_fit: float) -> float:
    value = price_fit * 0.5 + right_sized_fit * 0.35 + capability * 0.15
    return _clamp(value, 0.0, 1.0)
