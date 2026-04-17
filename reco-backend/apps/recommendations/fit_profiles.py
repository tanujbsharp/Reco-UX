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


def _normalized_session_text(answer_texts, voice_tags) -> str:
    answer_blob = _normalize(" ".join(str(text or "") for text in answer_texts or []))
    voice_blob = _normalize(_voice_tag_text(voice_tags))
    return _normalize(answer_blob, voice_blob)


def _normalized_weights(priority_weights: dict[str, float]) -> dict[str, float]:
    total = sum(max(0.0, float(weight or 0.0)) for weight in priority_weights.values())
    if total <= 0:
        return {}
    return {
        feature: max(0.0, float(weight or 0.0)) / total
        for feature, weight in priority_weights.items()
        if max(0.0, float(weight or 0.0)) > 0
    }


def _bump(priority_weights: dict[str, float], feature: str, delta: float) -> None:
    priority_weights[feature] = max(0.0, priority_weights.get(feature, 0.0) + delta)


def _has_gaming(text: str) -> bool:
    return _has_any(text, [
        "gaming", "game", "games", "valorant", "valo", "f1", "formula 1",
        "aaa", "esports", "fps", "rtx", "gpu", "graphics card",
    ])


def _has_heavy_gaming(text: str) -> bool:
    return _has_any(text, [
        "high-performance gaming", "high performance gaming", "modern aaa",
        "aaa titles", "aaa", "f1", "formula 1", "latest games",
        "demanding games", "maximum gaming power", "raw gaming power",
        "highest settings", "modern games",
    ])


def _has_competitive_gaming(text: str) -> bool:
    return _has_any(text, [
        "competitive gaming", "esports", "valorant", "valo", "cs2",
        "high refresh", "high-refresh", "smooth gaming",
    ])


def _has_creative(text: str) -> bool:
    return _has_any(text, [
        "creative", "design", "designer", "photoshop", "illustrator", "video",
        "editing", "render", "rendering", "cad", "3d", "blender", "unreal",
    ])


def _has_heavy_creative(text: str) -> bool:
    return _has_any(text, [
        "render", "rendering", "3d", "cad", "blender", "unreal",
        "heavy editing", "gpu heavy", "graphics-heavy", "motion graphics",
    ])


def _has_coding(text: str) -> bool:
    return _has_any(text, [
        "coding", "developer", "development", "programming", "software",
        "terminal", "compile", "app development", "full stack",
    ])


def _has_heavy_coding(text: str) -> bool:
    return _has_any(text, [
        "docker", "virtual machine", "vm", "machine learning", "data science",
        "large codebase", "large codebases", "heavy compile", "ai training",
        "big apps", "big codebases",
    ])


def build_intent_profile(answer_texts, voice_tags, weights=None) -> dict:
    text = _normalized_session_text(answer_texts, voice_tags)
    weights = weights or {}

    gaming = _has_gaming(text)
    demanding_gaming = gaming and _has_heavy_gaming(text)
    competitive_gaming = gaming and _has_competitive_gaming(text)
    creative = _has_creative(text)
    heavy_creative = creative and _has_heavy_creative(text)
    coding = _has_coding(text)
    heavy_coding = coding and _has_heavy_coding(text)
    business = _has_any(text, [
        "business", "work and productivity", "business reliability", "reliability",
        "durability", "ports", "connectivity", "more ports and durability",
    ])
    everyday = _has_any(text, [
        "student", "study", "class", "classes", "browsing", "browser",
        "docs", "document", "presentation", "powerpoint", "excel", "everyday",
        "basic", "regular student or office use",
    ])

    if demanding_gaming:
        intent = "gaming_demanding"
        priorities = {
            "graphics": 0.32, "processor": 0.18, "ram": 0.12,
            "display_size": 0.16, "storage": 0.08, "build_quality": 0.06,
            "connectivity": 0.04, "battery": 0.03, "weight": 0.01,
        }
        target_capability = 0.9
        overkill_sensitivity = 0.08
    elif competitive_gaming:
        intent = "gaming_competitive"
        priorities = {
            "graphics": 0.22, "processor": 0.2, "display_size": 0.18,
            "connectivity": 0.1, "ram": 0.1, "storage": 0.06,
            "value_for_money": 0.08, "price": 0.04, "build_quality": 0.02,
        }
        target_capability = 0.76
        overkill_sensitivity = 0.28
    elif heavy_creative:
        intent = "creative_heavy"
        priorities = {
            "graphics": 0.24, "processor": 0.2, "ram": 0.16,
            "storage": 0.12, "display_size": 0.12, "build_quality": 0.08,
            "connectivity": 0.04, "battery": 0.02, "weight": 0.02,
        }
        target_capability = 0.84
        overkill_sensitivity = 0.14
    elif creative:
        intent = "creative_display"
        priorities = {
            "display_size": 0.24, "build_quality": 0.14, "ram": 0.14,
            "processor": 0.14, "storage": 0.12, "graphics": 0.08,
            "battery": 0.07, "weight": 0.07,
        }
        target_capability = 0.76
        overkill_sensitivity = 0.28
    elif heavy_coding:
        intent = "coding_heavy"
        priorities = {
            "processor": 0.24, "ram": 0.22, "storage": 0.16,
            "connectivity": 0.1, "build_quality": 0.1, "display_size": 0.08,
            "battery": 0.04, "weight": 0.04, "graphics": 0.02,
        }
        target_capability = 0.78
        overkill_sensitivity = 0.24
    elif coding:
        intent = "coding"
        priorities = {
            "processor": 0.2, "ram": 0.18, "storage": 0.12,
            "connectivity": 0.12, "build_quality": 0.1, "display_size": 0.08,
            "battery": 0.08, "weight": 0.06, "value_for_money": 0.06,
        }
        target_capability = 0.7
        overkill_sensitivity = 0.34
    elif _has_any(text, ["every day", "daily carry", "travel", "commute", "lightweight", "portable"]):
        intent = "portability"
        priorities = {
            "weight": 0.24, "battery": 0.2, "build_quality": 0.12,
            "processor": 0.1, "ram": 0.08, "storage": 0.08,
            "value_for_money": 0.08, "price": 0.04, "display_size": 0.06,
        }
        target_capability = 0.66
        overkill_sensitivity = 0.42
    elif business:
        intent = "business"
        priorities = {
            "build_quality": 0.24, "connectivity": 0.18, "weight": 0.12,
            "battery": 0.12, "processor": 0.1, "ram": 0.1,
            "price": 0.08, "display_size": 0.06,
        }
        target_capability = 0.66
        overkill_sensitivity = 0.38
    elif everyday:
        intent = "everyday"
        priorities = {
            "value_for_money": 0.24, "everyday_fit": 0.2,
            "right_sized_performance": 0.18, "weight": 0.12,
            "battery": 0.12, "processor": 0.06, "ram": 0.05,
            "display_size": 0.03,
        }
        target_capability = 0.58
        overkill_sensitivity = 0.58
    else:
        intent = "balanced"
        priorities = {
            "capability": 0.18, "value_for_money": 0.18,
            "right_sized_performance": 0.16, "portability": 0.14,
            "display_size": 0.1, "build_quality": 0.1,
            "connectivity": 0.08, "storage": 0.06,
        }
        target_capability = 0.66
        overkill_sensitivity = 0.36

    mobility = "balanced"
    if _has_any(text, ["few times a week", "balance of comfort and mobility", "mix of desk and mobile", "desk and mobile"]):
        mobility = "medium"
        _bump(priorities, "weight", 0.04)
        _bump(priorities, "battery", 0.03)
    elif _has_any(text, ["mostly at home", "mostly at a desk", "mostly stays on a desk", "desk"]):
        mobility = "desk"
        _bump(priorities, "display_size", 0.05)
        _bump(priorities, "connectivity", 0.03)
        _bump(priorities, "weight", -0.04)
        overkill_sensitivity = max(0.05, overkill_sensitivity - 0.04)
    elif _has_any(text, ["every day", "daily carry", "travel", "commute", "lightweight", "portable"]):
        mobility = "high"
        _bump(priorities, "weight", 0.08)
        _bump(priorities, "battery", 0.06)
        _bump(priorities, "display_size", -0.03)
        overkill_sensitivity += 0.05

    screen_preference = "balanced"
    if _has_any(text, ["large 16", "16 inch", "16-inch", "15 inch", "15-inch", "more screen", "big screen"]):
        screen_preference = "large"
        _bump(priorities, "display_size", 0.08)
        _bump(priorities, "weight", -0.03)
    elif _has_any(text, ["13 inch", "13-inch", "14 inch", "14-inch", "compact", "easy to carry"]):
        screen_preference = "compact"
        _bump(priorities, "weight", 0.06)
        _bump(priorities, "display_size", -0.04)
    if _has_any(text, ["better display", "premium display", "high quality display", "oled", "sharp display"]):
        screen_preference = "quality"
        _bump(priorities, "display_size", 0.06)
        _bump(priorities, "build_quality", 0.03)

    final_priority = "balanced"
    if _has_any(text, ["best fit for today", "avoid paying for more than i need", "value", "budget", "affordable"]):
        final_priority = "right_sized"
        _bump(priorities, "value_for_money", 0.12)
        _bump(priorities, "price", 0.08)
        _bump(priorities, "right_sized_performance", 0.1)
        overkill_sensitivity += 0.18
        target_capability -= 0.04
    elif _has_any(text, ["room to grow over time", "future needs", "future proof", "headroom"]):
        final_priority = "headroom"
        _bump(priorities, "processor", 0.05)
        _bump(priorities, "ram", 0.05)
        _bump(priorities, "storage", 0.04)
        if gaming or creative:
            _bump(priorities, "graphics", 0.04)
        overkill_sensitivity = max(0.05, overkill_sensitivity - 0.16)
        target_capability += 0.06
    elif _has_any(text, ["lighter carry and battery", "battery first"]):
        final_priority = "mobility"
        _bump(priorities, "weight", 0.1)
        _bump(priorities, "battery", 0.1)
        overkill_sensitivity += 0.08
    elif _has_any(text, ["more ports and durability", "business reliability"]):
        final_priority = "durability"
        _bump(priorities, "build_quality", 0.1)
        _bump(priorities, "connectivity", 0.08)

    required_floors: dict[str, float] = {}
    if demanding_gaming:
        required_floors.update({"graphics": 0.8, "processor": 0.78, "ram": 0.62})
    elif competitive_gaming:
        required_floors.update({"graphics": 0.46, "processor": 0.62, "ram": 0.52})
    if heavy_creative:
        required_floors.update({"graphics": 0.72, "processor": 0.74, "ram": 0.62})
    if heavy_coding:
        required_floors.update({"processor": 0.74, "ram": 0.62, "storage": 0.52})
    if "business reliability" in text or "more ports and durability" in text:
        required_floors.update({"build_quality": 0.7, "connectivity": 0.75})
    if screen_preference == "large" and _has_any(text, ["high refresh", "high-refresh", "gaming"]):
        required_floors["display_size"] = max(required_floors.get("display_size", 0.0), 0.72)
    elif screen_preference == "large" and not _has_any(text, ["not sure"]):
        required_floors["display_size"] = max(required_floors.get("display_size", 0.0), 0.68)
    if mobility == "high" and not (demanding_gaming or heavy_creative):
        required_floors.update({"weight": 0.58, "battery": 0.52})

    target_capability = _clamp(
        target_capability
        + (float(weights.get("processor", 0.66) or 0.66) - 0.66) * 0.05
        + (float(weights.get("graphics", 0.28) or 0.28) - 0.28) * 0.06
        + (float(weights.get("ram", 0.56) or 0.56) - 0.56) * 0.04,
        0.46,
        0.94,
    )
    target_caps = {
        "everyday": 0.62,
        "business": 0.72,
        "coding": 0.76,
        "coding_heavy": 0.84,
        "creative_display": 0.78,
        "creative_heavy": 0.9,
        "portability": 0.7,
        "balanced": 0.74,
        "gaming_competitive": 0.82,
        "gaming_demanding": 0.94,
    }
    target_capability = min(target_capability, target_caps.get(intent, 0.82))

    return {
        "intent": intent,
        "mobility": mobility,
        "screen_preference": screen_preference,
        "final_priority": final_priority,
        "priority_weights": _normalized_weights(priorities),
        "required_floors": required_floors,
        "target_capability": round(target_capability, 3),
        "overkill_sensitivity": round(_clamp(overkill_sensitivity, 0.04, 0.85), 3),
    }


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


def compute_intent_fit(features: dict, intent_profile: dict) -> tuple[float, dict]:
    priority_weights = intent_profile.get("priority_weights", {}) or {}
    if not priority_weights:
        return 0.5, {"raw_fit": 0.5, "overkill_penalty": 0.0, "floor_penalty": 0.0}

    raw_fit = 0.0
    for feature_code, weight in priority_weights.items():
        raw_fit += float(weight or 0.0) * float(features.get(feature_code, 0.0) or 0.0)

    capability = float(features.get("capability", 0.5) or 0.5)
    target_capability = float(intent_profile.get("target_capability", 0.66) or 0.66)
    overkill_sensitivity = float(intent_profile.get("overkill_sensitivity", 0.36) or 0.36)
    overkill_penalty = max(0.0, capability - target_capability) * overkill_sensitivity

    intent = str(intent_profile.get("intent", "balanced"))
    mobility = str(intent_profile.get("mobility", "balanced"))
    final_priority = str(intent_profile.get("final_priority", "balanced"))

    graphics = float(features.get("graphics", 0.0) or 0.0)
    weight_fit = float(features.get("weight", 0.0) or 0.0)
    price_fit = float(features.get("price", 0.5) or 0.5)

    if intent in {"everyday", "business", "coding", "portability", "balanced"} and graphics >= 0.85:
        overkill_penalty += 0.08 + (1.0 - price_fit) * 0.05
    if intent == "creative_display" and graphics >= 0.85:
        overkill_penalty += 0.12 + (1.0 - price_fit) * 0.05
        if weight_fit < 0.3:
            overkill_penalty += 0.04
    if final_priority == "right_sized" and capability > target_capability:
        overkill_penalty += (capability - target_capability) * 0.28
    if mobility == "high" and weight_fit < 0.45:
        overkill_penalty += (0.45 - weight_fit) * 0.35
    if mobility == "desk":
        overkill_penalty *= 0.8

    floor_penalty = 0.0
    floor_details = {}
    for feature_code, floor in (intent_profile.get("required_floors", {}) or {}).items():
        fit = float(features.get(feature_code, 0.0) or 0.0)
        gap = max(0.0, float(floor) - fit)
        if gap > 0:
            floor_details[feature_code] = round(gap, 3)
            floor_penalty += gap * 0.65

    fit = _clamp(raw_fit - overkill_penalty - floor_penalty, 0.0, 1.0)
    return fit, {
        "raw_fit": round(raw_fit, 3),
        "overkill_penalty": round(overkill_penalty, 3),
        "floor_penalty": round(floor_penalty, 3),
        "floor_gaps": floor_details,
    }
