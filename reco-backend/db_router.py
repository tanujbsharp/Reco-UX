"""
Database router for Bsharp Reco.
Routes auth models to Converse DB, everything else to Reco DB.
"""


class ConverseRouter:
    """Route auth models to Converse DB, everything else to Reco DB."""
    converse_apps = {'converse_auth'}
    skip_on_reco = {'admin', 'auth'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.converse_apps:
            return 'converse'
        return 'default'

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.converse_apps:
            return 'converse'  # Will be read-only in practice
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.converse_apps:
            return db == 'converse'
        if app_label in self.skip_on_reco:
            return False
        return db == 'default'
