from rest_framework import serializers
from .models import CustomerProfile


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = [
            'customer_id',
            'session',
            'cmid',
            'outlet_id',
            'name',
            'phone',
            'email',
            'consent_given',
            'created_at',
        ]
        read_only_fields = ['customer_id', 'cmid', 'outlet_id', 'created_at']


class CustomerProfileCreateSerializer(serializers.Serializer):
    """
    Serializer for the POST /api/customers/ endpoint.
    Accepts session_id + PII fields; cmid/outlet_id are derived from the session.
    """
    session_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    consent_given = serializers.BooleanField(default=False)
