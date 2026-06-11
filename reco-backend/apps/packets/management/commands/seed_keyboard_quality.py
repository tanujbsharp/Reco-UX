"""
Seed a `keyboard_quality` feature for every product, dormant by default.

Keyboard feel is a real differentiator ("I type all day" should favor
ThinkPads) but it isn't in the spec sheet, so we seed it from family-level
reputation heuristics. Values are editable per-product in admin afterwards.

Deliberately inert until asked for:
  - ScoringConfig weight is pinned to 0.0 (recommendations unchanged), and
  - a `keyboard` BenefitMapping (+0.5) raises the weight only when the shopper
    actually mentions typing/keyboard (synonyms live in scoring.BENEFIT_SYNONYMS).

Idempotent; safe to re-run.

Usage:
    python manage.py seed_keyboard_quality
"""
from django.core.management.base import BaseCommand

from apps.packets.models import (
    BenefitMapping,
    Feature,
    FeatureValue,
    Packet,
    Product,
    ScoringConfig,
)

# (match substring in model/family, normalized score, customer-facing label)
FAMILY_KEYBOARD_SCORES = [
    ("thinkpad", 0.9, "Best-in-class ThinkPad keyboard"),
    ("thinkbook", 0.72, "Comfortable business keyboard"),
    ("legion", 0.7, "Gaming-grade keyboard with good travel"),
    ("loq", 0.68, "Solid gaming keyboard"),
    ("yoga book", 0.4, "Detached / on-screen keyboard"),
    ("duet", 0.35, "Compact detachable keyboard"),
    ("yoga", 0.65, "Comfortable low-travel premium keyboard"),
    ("ideapad", 0.55, "Standard everyday keyboard"),
    ("v1", 0.5, "Basic office keyboard"),  # V14/V15/V17
]
DEFAULT_SCORE = (0.55, "Standard everyday keyboard")


def _keyboard_for(product):
    signature = f"{product.model} {product.family}".lower()
    for token, score, label in FAMILY_KEYBOARD_SCORES:
        if token in signature:
            return score, label
    return DEFAULT_SCORE


class Command(BaseCommand):
    help = "Seed family-heuristic keyboard_quality values (weight 0 until shopper mentions typing)."

    def handle(self, *args, **options):
        for packet in Packet.objects.all():
            feature, created = Feature.objects.get_or_create(
                packet=packet,
                feature_code="keyboard_quality",
                defaults={
                    "feature_name": "Keyboard Quality",
                    "feature_type": "derived",
                    "is_comparable": True,
                    "is_scoreable": True,
                },
            )
            if created:
                self.stdout.write(f"  packet {packet.packet_id}: created Feature keyboard_quality")

            seeded = 0
            for product in Product.objects.filter(packet=packet):
                score, label = _keyboard_for(product)
                FeatureValue.objects.update_or_create(
                    product=product,
                    feature=feature,
                    defaults={"value": label, "normalized_value": score},
                )
                seeded += 1
            self.stdout.write(f"  packet {packet.packet_id}: keyboard_quality on {seeded} products")

            BenefitMapping.objects.update_or_create(
                packet=packet,
                benefit_name="keyboard",
                feature_code="keyboard_quality",
                defaults={"weight_impact": 0.5},
            )

            config = ScoringConfig.objects.filter(packet=packet).first()
            if config is not None:
                weights = dict(config.default_weights or {})
                if weights.get("keyboard_quality") != 0.0:
                    weights["keyboard_quality"] = 0.0
                    config.default_weights = weights
                    config.save(update_fields=["default_weights"])
                    self.stdout.write(f"  packet {packet.packet_id}: pinned keyboard_quality weight=0.0")

        self.stdout.write(self.style.SUCCESS("Done. keyboard_quality seeded; dormant until shopper mentions typing."))
