from django.apps import AppConfig


class ComparisonsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.comparisons'
    label = 'comparisons'
    verbose_name = 'Comparison Engine with Caching'
