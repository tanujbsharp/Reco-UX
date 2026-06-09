from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.packets.catalog_seed import replace_lenovo_catalog, upsert_lenovo_catalog


class Command(BaseCommand):
    help = "Seed or update the Lenovo laptop master catalog used by recommendations."

    def add_arguments(self, parser):
        parser.add_argument("--cmid", type=int, default=1)
        parser.add_argument("--packet-id", type=int, default=1)
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete and recreate products for the Lenovo packet. Default is non-destructive upsert.",
        )

    def handle(self, *args, **options):
        cmid = options["cmid"]
        packet_id = options["packet_id"]

        if options["replace"]:
            result = replace_lenovo_catalog(cmid=cmid, packet_id=packet_id)
            mode = "replaced"
        else:
            result = upsert_lenovo_catalog(cmid=cmid, packet_id=packet_id)
            mode = "upserted"

        self.stdout.write(self.style.SUCCESS(f"Lenovo catalog {mode}: {result}"))
