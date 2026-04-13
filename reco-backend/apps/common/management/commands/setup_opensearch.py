"""
Django management command to create (or recreate) all OpenSearch indexes
used by Bsharp Reco.

Usage:
    python manage.py setup_opensearch
    python manage.py setup_opensearch --recreate   # drop + create
"""
from django.core.management.base import BaseCommand

from apps.common.opensearch_client import opensearch_client
from apps.common.opensearch_indexes import INDEX_DEFINITIONS


class Command(BaseCommand):
    help = 'Create OpenSearch indexes defined in opensearch_indexes.py'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Drop existing indexes before creating them.',
        )

    def handle(self, *args, **options):
        recreate = options['recreate']

        for index_name, definition in INDEX_DEFINITIONS.items():
            if recreate:
                self.stdout.write(f'Deleting index: {index_name} ...')
                try:
                    opensearch_client.delete_index(index_name)
                    self.stdout.write(self.style.WARNING(f'  Deleted {index_name}'))
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f'  Delete failed: {exc}'))

            self.stdout.write(f'Creating index: {index_name} ...')
            try:
                result = opensearch_client.create_index(
                    index_name,
                    mappings=definition['mappings'],
                    settings=definition['settings'],
                )
                if result:
                    self.stdout.write(self.style.SUCCESS(f'  Created {index_name}'))
                else:
                    self.stdout.write(self.style.NOTICE(f'  {index_name} already exists — skipped'))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  Failed to create {index_name}: {exc}'))

        self.stdout.write(self.style.SUCCESS('OpenSearch setup complete.'))
