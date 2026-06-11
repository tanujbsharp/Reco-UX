"""
Seed gap-filling BenefitMapping rows.

The original mappings left the highest-traffic use cases (work, study, college,
streaming, remote work, everyday browsing, shared family, etc.) with no weight
nudge at all. This command adds a sensible default set so every use-case option
moves at least one feature weight.

It is idempotent (update_or_create keyed on packet + benefit_name +
feature_code), so it is safe to re-run, and it never deletes or overwrites
benefit names you have hand-tuned in the admin — it only adds/updates the
canonical set below.

Pair this with the synonym-aware matcher in apps.recommendations.scoring
(BENEFIT_SYNONYMS) so these benefits fire on meaning, not exact spelling.

Usage:
    python manage.py seed_benefit_mappings            # all packets
    python manage.py seed_benefit_mappings --packet 1 # one packet
"""
from django.core.management.base import BaseCommand

from apps.packets.models import BenefitMapping, Packet

# benefit_name -> [(feature_code, weight_impact), ...]
SEED_BENEFIT_MAPPINGS = {
    "work":          [("processor", 0.25), ("ram", 0.20), ("everyday_fit", 0.15)],
    "study":         [("price", 0.30), ("everyday_fit", 0.25), ("value_for_money", 0.20)],
    "college":       [("processor", 0.20), ("ram", 0.20), ("portability", 0.15)],
    "streaming":     [("display_size", 0.25), ("audio_quality", 0.30), ("media_comfort", 0.30)],
    "remote_work":   [("connectivity", 0.30), ("battery", 0.25), ("audio_quality", 0.20)],
    "browsing":      [("everyday_fit", 0.30), ("price", 0.25), ("value_for_money", 0.20), ("simplicity", 0.20)],
    "shared_family": [("everyday_fit", 0.25), ("value_for_money", 0.20), ("build_quality", 0.15)],
    "parent":        [("simplicity", 0.30), ("readability", 0.25), ("everyday_fit", 0.20)],
    "performance":   [("processor", 0.30), ("ram", 0.25), ("graphics", 0.15)],
    "portability":   [("portability", 0.30), ("weight", 0.25)],
}


class Command(BaseCommand):
    help = "Seed gap-filling benefit mappings for one or all packets."

    def add_arguments(self, parser):
        parser.add_argument(
            "--packet",
            type=int,
            default=None,
            help="Packet ID to seed (defaults to all packets).",
        )

    def handle(self, *args, **options):
        packet_id = options.get("packet")
        if packet_id is not None:
            packets = Packet.objects.filter(packet_id=packet_id)
            if not packets.exists():
                self.stderr.write(self.style.ERROR(f"Packet {packet_id} not found."))
                return
        else:
            packets = Packet.objects.all()

        if not packets.exists():
            self.stderr.write(self.style.ERROR("No packets found."))
            return

        total_created = 0
        total_updated = 0
        for packet in packets:
            created_here = 0
            updated_here = 0
            for benefit_name, feature_rows in SEED_BENEFIT_MAPPINGS.items():
                for feature_code, weight_impact in feature_rows:
                    _, created = BenefitMapping.objects.update_or_create(
                        packet=packet,
                        benefit_name=benefit_name,
                        feature_code=feature_code,
                        defaults={"weight_impact": weight_impact},
                    )
                    if created:
                        created_here += 1
                    else:
                        updated_here += 1
            total_created += created_here
            total_updated += updated_here
            self.stdout.write(
                f"  packet {packet.packet_id}: {created_here} created, {updated_here} updated"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {total_created} created, {total_updated} updated across "
                f"{packets.count()} packet(s)."
            )
        )
