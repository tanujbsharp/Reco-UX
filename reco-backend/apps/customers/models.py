from django.db import models


class CustomerProfile(models.Model):
    customer_id = models.AutoField(primary_key=True)
    session = models.OneToOneField(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='customer',
    )
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    consent_given = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customer_profiles'

    def __str__(self):
        return f'{self.name} ({self.phone})'
