from __future__ import annotations

from collections import defaultdict
import re


SIMPLE_USE_TERMS = [
    "excel", "spreadsheet", "office", "presentation", "powerpoint", "student",
    "study", "class", "docs", "document", "browsing", "browser", "everyday",
    "basic", "travel", "meeting", "presentations", "productivity",
]
TECHNICAL_TERMS = [
    "coding", "developer", "development", "programming", "software", "engineering",
    "terminal", "compile", "app development", "full stack",
]
HEAVY_TECHNICAL_TERMS = [
    "android studio", "docker", "virtual machine", "vm", "machine learning",
    "data science", "large codebase", "large codebases", "heavy compile", "ai training",
    "big apps", "big codebases",
]
CREATIVE_TERMS = [
    "design", "designer", "photoshop", "illustrator", "video", "editing",
    "render", "rendering", "creative", "premiere", "after effects", "graphic",
    "cad", "3d",
]
GAMING_TERMS = [
    "gaming", "gamer", "games", "fps", "valorant", "cs2", "fortnite", "minecraft",
    "streaming", "stream", "unreal", "blender", "gpu", "rtx", "graphics card",
    "aaa", "esports", "valo", "f1", "formula 1",
]
DEMANDING_GAMING_TERMS = [
    "high-performance gaming", "high performance gaming", "modern aaa", "aaa titles",
    "aaa", "latest games", "demanding games", "graphically rich", "maximum gaming power",
    "raw gaming power", "highest settings", "modern games", "gaming laptop", "gaming pc",
    "f1", "formula 1",
]
COMPETITIVE_GAMING_TERMS = [
    "competitive gaming", "esports", "valorant", "valo", "cs2", "high refresh",
    "smooth gaming", "without any stutter",
]
REAL_GPU_TERMS = [
    "rtx", "dedicated graphics", "dedicated gpu", "real gpu", "graphics card",
]
PORTABILITY_TERMS = [
    "lightweight", "portable", "carry", "travel", "mobility", "commute",
    "all day", "backpack",
]
BUDGET_TERMS = [
    "budget", "affordable", "value", "50-70", "50 70", "40-60", "cheap",
    "low cost", "mid-range", "mid range",
]
BATTERY_TERMS = ["battery", "10+ hours", "10 hours", "all-day", "all day", "unplugged"]
CONNECTIVITY_TERMS = ["ports", "hdmi", "usb", "ethernet", "connectivity", "dongle", "sd card", "rj45"]
COMPACT_SCREEN_TERMS = [
    "13 inch", "13-inch", "14 inch", "14-inch", "13 14", "compact", "small screen",
    "compact 13 14 inch", "compact 13-14 inch", "easy to carry",
]
LARGE_SCREEN_TERMS = [
    "15 inch", "15-inch", "16 inch", "16-inch", "17 inch", "17-inch", "big screen",
    "larger display", "more screen", "more screen space", "large immersive display",
    "standard 15 16", "standard 15-16", "large 16", "16 high-refresh",
    "16 high refresh", "large 16 high-refresh", "large 16 high refresh",
]
PERFORMANCE_HIGH_TERMS = [
    "best", "powerful", "high-end", "high end", "strongest", "heavy workloads",
    "pro apps", "maximum", "lots of ram", "highest settings", "raw performance",
    "raw gaming power", "maximum settings",
]
MODERATE_PERFORMANCE_TERMS = [
    "mid-range", "mid range", "balanced", "enough", "moderate",
    "standard development", "basic gaming performance",
]
DISPLAY_NEUTRAL_TERMS = [
    "display isnt a huge deal", "display isn't a huge deal", "not a huge deal",
    "anything average or above is fine", "average or above is fine", "display isnt important",
]
RELIABILITY_TERMS = [
    "business reliability", "more ports and durability", "durability", "reliability",
]
MIXED_MOBILITY_TERMS = [
    "mix of desk and mobile", "a few times a week", "balance of comfort and mobility",
]
DESK_FIRST_TERMS = [
    "mostly stays on a desk", "mostly at home", "mostly at a desk", "desk first",
]


def _normalize(*parts: str) -> str:
    text = " ".join(str(part or "") for part in parts).lower()
    text = text.replace("&", " and ")
    return re.sub(r"[^a-z0-9+\- ]+", " ", text)


def _has_any(text: str, phrases: list[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _add(adjustments: defaultdict[str, float], feature_code: str, delta: float) -> None:
    adjustments[feature_code] += delta


def _question_context(question_text: str) -> dict[str, bool]:
    normalized = _normalize(question_text)
    return {
        "screen": _has_any(normalized, ["screen", "display", "size"]),
        "mobility": _has_any(normalized, ["carry", "throughout the day", "throughout your day", "mobile", "desk"]),
        "headroom": _has_any(normalized, ["performance", "headroom", "graphics", "development work", "development laptop"]),
        "priority": _has_any(normalized, ["priority", "final pick", "decide the final pick"]),
    }


def infer_answer_score_effect(question_text: str, answer_value: str) -> dict:
    question_text_norm = _normalize(question_text)
    answer_text = _normalize(answer_value)
    adjustments: defaultdict[str, float] = defaultdict(float)
    hard_filters: dict[str, float] = {}
    contexts = _question_context(question_text_norm)

    # Interpret the customer's answer directly. Avoid matching against
    # generic question wording such as "best", "graphics", or "performance".
    if _has_any(answer_text, SIMPLE_USE_TERMS):
        _add(adjustments, "price", 0.45)
        _add(adjustments, "value_for_money", 0.4)
        _add(adjustments, "everyday_fit", 0.45)
        _add(adjustments, "right_sized_performance", 0.28)
        _add(adjustments, "portability", 0.2)
        _add(adjustments, "battery", 0.2)
        _add(adjustments, "weight", 0.2)
        _add(adjustments, "processor", -0.2)
        _add(adjustments, "ram", -0.15)
        _add(adjustments, "storage", -0.1)

    if _has_any(answer_text, TECHNICAL_TERMS):
        _add(adjustments, "processor", 0.2)
        _add(adjustments, "ram", 0.18)
        _add(adjustments, "storage", 0.08)
        _add(adjustments, "connectivity", 0.15)
        _add(adjustments, "build_quality", 0.1)
        _add(adjustments, "creative_headroom", 0.05)
        _add(adjustments, "everyday_fit", 0.12)

    if _has_any(answer_text, HEAVY_TECHNICAL_TERMS):
        _add(adjustments, "processor", 0.24)
        _add(adjustments, "ram", 0.22)
        _add(adjustments, "storage", 0.15)
        _add(adjustments, "creative_headroom", 0.12)

    if _has_any(answer_text, CREATIVE_TERMS):
        _add(adjustments, "creative_headroom", 0.5)
        _add(adjustments, "processor", 0.45)
        _add(adjustments, "ram", 0.4)
        _add(adjustments, "storage", 0.35)
        _add(adjustments, "graphics", 0.25)
        _add(adjustments, "right_sized_performance", -0.22)
        _add(adjustments, "large_display", 0.35)
        _add(adjustments, "display_size", 0.25)
        _add(adjustments, "build_quality", 0.1)
        _add(adjustments, "compactness", -0.2)
        _add(adjustments, "price", -0.1)

    if _has_any(answer_text, GAMING_TERMS):
        _add(adjustments, "graphics", 0.65)
        _add(adjustments, "processor", 0.45)
        _add(adjustments, "ram", 0.3)
        _add(adjustments, "right_sized_performance", -0.3)
        _add(adjustments, "display_size", 0.2)
        _add(adjustments, "battery", 0.1)
        _add(adjustments, "price", -0.2)
        _add(adjustments, "portability", -0.15)
        _add(adjustments, "compactness", -0.2)

        if _has_any(answer_text, DEMANDING_GAMING_TERMS + REAL_GPU_TERMS):
            hard_filters["graphics"] = max(hard_filters.get("graphics", 0.0), 0.8)
            hard_filters["processor"] = max(hard_filters.get("processor", 0.0), 0.78)
        elif _has_any(answer_text, COMPETITIVE_GAMING_TERMS):
            hard_filters["graphics"] = max(hard_filters.get("graphics", 0.0), 0.72)
            hard_filters["processor"] = max(hard_filters.get("processor", 0.0), 0.7)

    if _has_any(answer_text, PORTABILITY_TERMS):
        _add(adjustments, "portability", 0.45)
        _add(adjustments, "weight", 0.35)
        _add(adjustments, "battery", 0.25)
        _add(adjustments, "compactness", 0.25)
        _add(adjustments, "large_display", -0.15)

    if _has_any(answer_text, BUDGET_TERMS):
        _add(adjustments, "price", 0.6)
        _add(adjustments, "value_for_money", 0.45)
        _add(adjustments, "processor", -0.1)
        _add(adjustments, "ram", -0.05)

    if (
        _has_any(answer_text, SIMPLE_USE_TERMS)
        and _has_any(answer_text, TECHNICAL_TERMS)
        and not _has_any(answer_text, CREATIVE_TERMS + GAMING_TERMS + HEAVY_TECHNICAL_TERMS)
    ):
        _add(adjustments, "price", 0.28)
        _add(adjustments, "value_for_money", 0.3)
        _add(adjustments, "everyday_fit", 0.3)
        _add(adjustments, "right_sized_performance", 0.42)
        _add(adjustments, "battery", 0.12)
        _add(adjustments, "weight", 0.1)
        _add(adjustments, "graphics", -0.18)
        _add(adjustments, "creative_headroom", -0.08)

    if _has_any(answer_text, BATTERY_TERMS):
        _add(adjustments, "battery", 0.45)
        _add(adjustments, "portability", 0.15)

    if _has_any(answer_text, CONNECTIVITY_TERMS):
        _add(adjustments, "connectivity", 0.45)
        _add(adjustments, "build_quality", 0.1)

    if _has_any(answer_text, COMPACT_SCREEN_TERMS):
        _add(adjustments, "compactness", 0.55)
        _add(adjustments, "portability", 0.15)
        _add(adjustments, "large_display", -0.35)
        _add(adjustments, "display_size", -0.2)

    if _has_any(answer_text, LARGE_SCREEN_TERMS):
        _add(adjustments, "large_display", 0.55)
        _add(adjustments, "display_size", 0.35)
        _add(adjustments, "compactness", -0.35)

        if _has_any(answer_text, ["high-refresh", "high refresh", "gaming", "16 high-refresh", "16 high refresh"]):
            hard_filters["display_size"] = max(hard_filters.get("display_size", 0.0), 0.72)

    if _has_any(answer_text, PERFORMANCE_HIGH_TERMS):
        _add(adjustments, "processor", 0.5)
        _add(adjustments, "ram", 0.35)
        _add(adjustments, "creative_headroom", 0.3)
        _add(adjustments, "right_sized_performance", -0.2)
        _add(adjustments, "price", -0.15)

        if _has_any(answer_text, GAMING_TERMS):
            hard_filters["graphics"] = max(hard_filters.get("graphics", 0.0), 0.8)
            hard_filters["processor"] = max(hard_filters.get("processor", 0.0), 0.78)

    if _has_any(answer_text, MODERATE_PERFORMANCE_TERMS):
        _add(adjustments, "processor", -0.18)
        _add(adjustments, "ram", -0.12)
        _add(adjustments, "value_for_money", 0.25)
        _add(adjustments, "everyday_fit", 0.2)
        _add(adjustments, "right_sized_performance", 0.18)
        _add(adjustments, "graphics", -0.12)

    # Context-aware interpretations for the guided / text follow-up flow.
    if contexts["screen"] and _has_any(answer_text, DISPLAY_NEUTRAL_TERMS):
        _add(adjustments, "value_for_money", 0.18)
        _add(adjustments, "right_sized_performance", 0.14)
        _add(adjustments, "large_display", -0.08)
        _add(adjustments, "display_size", -0.06)
        _add(adjustments, "creative_headroom", -0.06)

    if contexts["mobility"] and _has_any(answer_text, MIXED_MOBILITY_TERMS):
        _add(adjustments, "portability", 0.22)
        _add(adjustments, "weight", 0.16)
        _add(adjustments, "battery", 0.14)
        _add(adjustments, "everyday_fit", 0.1)

    if contexts["mobility"] and _has_any(answer_text, DESK_FIRST_TERMS):
        _add(adjustments, "large_display", 0.14)
        _add(adjustments, "display_size", 0.1)
        _add(adjustments, "connectivity", 0.08)
        _add(adjustments, "portability", -0.12)
        _add(adjustments, "weight", -0.08)

    if contexts["headroom"] and "standard development" in answer_text:
        _add(adjustments, "processor", 0.12)
        _add(adjustments, "ram", 0.12)
        _add(adjustments, "storage", 0.06)
        _add(adjustments, "connectivity", 0.12)
        _add(adjustments, "build_quality", 0.12)
        _add(adjustments, "value_for_money", 0.18)
        _add(adjustments, "everyday_fit", 0.12)
        _add(adjustments, "right_sized_performance", 0.3)
        _add(adjustments, "graphics", -0.18)
        _add(adjustments, "creative_headroom", -0.05)

    if contexts["headroom"] and "coding and multitasking" in answer_text:
        _add(adjustments, "processor", 0.12)
        _add(adjustments, "ram", 0.14)
        _add(adjustments, "connectivity", 0.1)
        _add(adjustments, "value_for_money", 0.08)
        _add(adjustments, "everyday_fit", 0.08)
        _add(adjustments, "right_sized_performance", 0.12)
        _add(adjustments, "graphics", -0.12)

    if contexts["priority"] and _has_any(answer_text, RELIABILITY_TERMS):
        _add(adjustments, "build_quality", 0.34)
        _add(adjustments, "connectivity", 0.28)
        _add(adjustments, "everyday_fit", 0.16)
        _add(adjustments, "value_for_money", 0.08)
        _add(adjustments, "right_sized_performance", 0.08)

    if contexts["priority"] and "lighter carry and battery" in answer_text:
        _add(adjustments, "portability", 0.32)
        _add(adjustments, "weight", 0.26)
        _add(adjustments, "battery", 0.28)
        _add(adjustments, "compactness", 0.12)

    if contexts["priority"] and (
        "touch or 2 in 1 flexibility" in answer_text or "touch or 2-in-1 flexibility" in answer_text
    ):
        _add(adjustments, "build_quality", 0.12)
        _add(adjustments, "display_size", 0.06)

    if contexts["priority"] and (
        "better display quality" in answer_text or "premium display quality" in answer_text
    ):
        _add(adjustments, "creative_headroom", 0.14)
        _add(adjustments, "display_size", 0.08)
        _add(adjustments, "price", -0.05)

    if "best fit for today" in answer_text or "avoid paying for more than i need" in answer_text:
        _add(adjustments, "price", 0.5)
        _add(adjustments, "value_for_money", 0.45)
        _add(adjustments, "everyday_fit", 0.35)
        _add(adjustments, "right_sized_performance", 0.55)
        _add(adjustments, "processor", -0.45)
        _add(adjustments, "ram", -0.35)
        _add(adjustments, "graphics", -0.28)
        _add(adjustments, "build_quality", -0.12)
        _add(adjustments, "creative_headroom", -0.7)

    if "room to grow over time" in answer_text:
        _add(adjustments, "processor", 0.18)
        _add(adjustments, "ram", 0.16)
        _add(adjustments, "graphics", 0.08)
        _add(adjustments, "creative_headroom", 0.15)
        _add(adjustments, "right_sized_performance", -0.18)
        _add(adjustments, "price", -0.1)

    if "classes browsing and office work" in answer_text or "classes browsing and office" in answer_text:
        _add(adjustments, "price", 0.32)
        _add(adjustments, "value_for_money", 0.28)
        _add(adjustments, "everyday_fit", 0.3)
        _add(adjustments, "graphics", -0.22)

    if "balanced 14 inch feel" in answer_text or "balanced 14-inch feel" in answer_text:
        _add(adjustments, "compactness", 0.2)
        _add(adjustments, "portability", 0.14)
        _add(adjustments, "large_display", -0.08)

    if "every day" in answer_text and not contexts["mobility"]:
        _add(adjustments, "portability", 0.22)
        _add(adjustments, "weight", 0.18)
        _add(adjustments, "battery", 0.1)

    if "512gb" in answer_text:
        _add(adjustments, "storage", -0.2)
        _add(adjustments, "price", 0.15)
        _add(adjustments, "value_for_money", 0.1)
    elif "1tb" in answer_text:
        _add(adjustments, "storage", 0.1)
    elif "2tb" in answer_text:
        _add(adjustments, "storage", 0.35)
        _add(adjustments, "price", -0.05)

    return {
        "weight_adjustments": {
            key: round(value, 3)
            for key, value in adjustments.items()
            if abs(value) >= 0.01
        },
        "hard_filters": {
            key: round(value, 3)
            for key, value in hard_filters.items()
            if value > 0
        },
    }


def infer_tag_weight_adjustments(tag_text: str, category: str = "", confidence: float = 1.0) -> dict[str, float]:
    inferred = infer_answer_score_effect(category, tag_text).get("weight_adjustments", {})
    scale = max(0.25, min(1.0, confidence or 0.5))
    return {key: round(value * scale, 3) for key, value in inferred.items()}
