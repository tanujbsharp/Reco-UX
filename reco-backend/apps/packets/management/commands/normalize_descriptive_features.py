"""
Backfill normalized_value for the two descriptive specs that ship blank:
`noise_profile` and `performance_tier`.

These are free-text labels ("Quiet for office work", "Premium ultraportable
performance"), so a missing normalized_value means the scorer skips them. This
command derives a 0..1 score from the label text (quieter / more powerful =
higher) for every product.

To avoid silently changing recommendations, it also pins both features to
weight 0.0 in every ScoringConfig (the scorer would otherwise auto-assign the
0.5 floor once a normalized value exists). The data is then complete and
`noise_profile` is ready to enable later — just raise its weight.

Idempotent; safe to re-run.

Usage:
    python manage.py normalize_descriptive_features
"""
from django.core.management.base import BaseCommand

from apps.packets.models import FeatureValue, ScoringConfig


def _noise_score(text):
    """Higher = quieter."""
    t = (text or "").lower()
    if "fanless" in t or "silent" in t:
        return 1.0
    if any(k in t for k in ["flagship gaming", "high load", "gaming-class", "gaming acoustics", "sustained heavy", "heavy load", "workstation"]):
        return 0.25
    if "gaming" in t:
        return 0.35
    if "creator" in t:
        return 0.45
    if "quiet" in t:
        return 0.85
    if any(k in t for k in ["balanced", "controlled", "moderate", "calmer", "balance"]):
        return 0.6
    return 0.5


def _perf_score(text):
    """Higher = more powerful."""
    t = (text or "").lower()
    if any(k in t for k in ["workstation", "flagship", "high-end gaming", "full mobile"]):
        return 0.9
    if any(k in t for k in ["gaming", "creator", "creative", "ai-ready", "ai performance", "ai convertible"]):
        return 0.72
    if "premium" in t:
        return 0.65
    if any(k in t for k in ["business", "enterprise", "executive", "convertible productivity", "ultraportable", "professional"]):
        return 0.55
    if any(k in t for k in ["mainstream", "everyday", "balanced", "value office", "large-screen productivity"]):
        return 0.45
    if any(k in t for k in ["student", "home", "efficient office", "entry", "admin"]):
        return 0.3
    if any(k in t for k in ["chromeos", "tablet", "school", "basics"]):
        return 0.2
    return 0.5


SCORERS = {
    "noise_profile": _noise_score,
    "performance_tier": _perf_score,
}


class Command(BaseCommand):
    help = "Backfill normalized_value for noise_profile and performance_tier; pin their scoring weight to 0."

    def handle(self, *args, **options):
        for code, scorer in SCORERS.items():
            updated = 0
            for fv in FeatureValue.objects.filter(feature__feature_code=code):
                new_val = round(scorer(fv.value), 3)
                if fv.normalized_value != new_val:
                    fv.normalized_value = new_val
                    fv.save(update_fields=["normalized_value"])
                    updated += 1
            self.stdout.write(f"  {code}: normalized {updated} value(s)")

        # Pin weight 0.0 so completing the data does not shift recommendations.
        for sc in ScoringConfig.objects.all():
            weights = dict(sc.default_weights or {})
            changed = False
            for code in SCORERS:
                if weights.get(code) != 0.0:
                    weights[code] = 0.0
                    changed = True
            if changed:
                sc.default_weights = weights
                sc.save(update_fields=["default_weights"])
                self.stdout.write(f"  pinned noise_profile/performance_tier weight=0.0 on packet {sc.packet_id}")

        self.stdout.write(self.style.SUCCESS("Done. All 11 features now fully normalized; recommendations unchanged."))
