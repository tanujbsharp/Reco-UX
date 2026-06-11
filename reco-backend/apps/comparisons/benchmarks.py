"""
Chip / GPU benchmark lookup for Bsharp Reco comparisons.

Why this exists
---------------
"Which chip is stronger?" cannot be answered by the model name alone. A naive
tier map (Ultra 7 > Ultra 5, RTX 4070 > RTX 3090) is wrong across generations.
So we keep a curated table of real measured benchmark scores (PassMark-style:
CPU Mark for processors, G3D Mark for GPUs). Higher = faster. Because these are
measured numbers, cross-generation comparisons just work.

Coverage
--------
The keys below cover every processor and graphics value currently in the
catalog (Django admin), plus a few common extras for headroom. Add a row when a
new chip/GPU enters the catalog. Numbers are approximate published values and
should be refreshed periodically — directional accuracy is what matters for
declaring a per-spec winner.

Matching
--------
Catalog values are free-form ("12th Gen Intel Core i7-1260P"). We normalize and
match the most specific known key first (longest key wins), so "i7-1260p" beats
the generic "i7" fallback. Truly unknown strings return ``None`` ("can't
compare"), never 0.
"""
from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# CPU Mark (approx, multi-thread). Specific models first; generic family
# tiers and descriptive ("HX-class") variants as fallbacks.
# ---------------------------------------------------------------------------
CPU_BENCHMARKS = {
    # --- Intel Core (specific) ---
    "i7-1260p": 18500,
    "i5-1335u": 15000,
    "i5-13420h": 18500,
    "i5-13450hx": 24000,
    "i7-13620h": 24000,
    "i7-14650hx": 35000,
    # --- Intel Core Ultra (specific) ---
    "core ultra 5 125h": 22000,
    "core ultra 5 125u": 16000,
    "core ultra 7 155h": 26000,
    "core ultra 7 155u": 18000,
    "core ultra 7 255h": 28000,
    "core ultra 7 258v": 20000,
    "core ultra 9 185h": 30000,
    "core 5 210h": 17000,
    # --- Intel descriptive / HX-class ---
    "core ultra 9 hx-class": 40000,
    "core ultra 7 hx-class": 33000,
    "core ultra 7 processor": 26000,
    "i9 hx-series": 42000,
    "i7 hx-class": 30000,
    # --- AMD Ryzen (specific) ---
    "ryzen 5 7530u": 14000,
    "ryzen 7 5825u": 15000,
    "ryzen 7 8845hs": 27000,
    "ryzen 7 pro 7840u": 22000,
    "ryzen 7 pro 8840hs": 26000,
    "ryzen 7 pro processor": 23000,
    # --- MediaTek ---
    "kompanio": 5000,
    # --- Generic family fallbacks (lowest priority; short keys) ---
    "core ultra 9": 30000,
    "core ultra 7": 26000,
    "core ultra 5": 21000,
    "ryzen 7 pro": 23000,
    "ryzen 7": 23000,
    "ryzen 5": 16000,
    "ryzen 3": 11000,
    "i9": 32000,
    "i7": 22000,
    "i5": 16000,
    "i3": 11000,
}

# ---------------------------------------------------------------------------
# G3D Mark (approx). Note 3090 (~26k) ~ 4070 (~27k): correctly near-equal.
# ---------------------------------------------------------------------------
GPU_BENCHMARKS = {
    # --- NVIDIA discrete (specific) ---
    "rtx 5080": 38000,
    "rtx 5070": 31000,
    "rtx 5060": 23000,
    "rtx 4090": 38000,
    "rtx 4080": 34000,
    "rtx 4070": 27000,
    "rtx 4060": 19000,
    "rtx 4050": 14000,
    "rtx 4000 ada": 20000,
    "rtx 4000": 20000,
    "rtx 3090": 26000,
    "rtx 3080": 25000,
    "rtx 3070": 22000,
    "rtx 3060": 17000,
    "rtx 3050": 12000,
    "gtx 1660": 11000,
    # --- Integrated (specific first) ---
    "arc graphics 140v": 4200,
    "radeon 780m": 3800,
    "intel arc": 3500,
    "iris xe": 2200,
    "iris": 2000,
    "radeon": 2500,
    "uhd": 1200,
    "intel graphics": 1500,
    "arm graphics": 800,
}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _lookup(value: str, table: dict) -> float | None:
    """Return the score for the most specific (longest) table key contained in
    ``value``; ``None`` if nothing matches."""
    text = _normalize(value)
    if not text:
        return None
    for key in sorted(table, key=len, reverse=True):
        if key in text:
            return float(table[key])
    return None


def cpu_score(value: str) -> float | None:
    """Benchmark score for a processor string, or None if unrecognized."""
    return _lookup(value, CPU_BENCHMARKS)


def gpu_score(value: str) -> float | None:
    """Benchmark score for a graphics string, or None if unrecognized."""
    return _lookup(value, GPU_BENCHMARKS)
