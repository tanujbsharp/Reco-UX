from rest_framework import serializers
from .models import CustomerSession, SessionAnswer


class SessionAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionAnswer
        fields = [
            'answer_id',
            'session',
            'question_text',
            'answer_value',
            'from_voice',
            'score_effect',
            'created_at',
        ]
        read_only_fields = ['answer_id', 'created_at']


class CustomerSessionSerializer(serializers.ModelSerializer):
    answers = SessionAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerSession
        fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'outlet_id',
            'user_id',
            'packet_id',
            'discovery_mode',
            'status',
            'recommendation_feedback_stars',
            'created_at',
            'updated_at',
            'answers',
        ]
        read_only_fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'user_id',
            'created_at',
            'updated_at',
        ]


class CustomerSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for session creation — accepts only optional fields."""

    class Meta:
        model = CustomerSession
        fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'outlet_id',
            'user_id',
            'packet_id',
            'discovery_mode',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'user_id',
            'status',
            'created_at',
            'updated_at',
        ]


class CustomerSessionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for session updates — only mutable fields."""

    class Meta:
        model = CustomerSession
        fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'outlet_id',
            'user_id',
            'packet_id',
            'discovery_mode',
            'status',
            'recommendation_feedback_stars',
            'updated_at',
        ]
        read_only_fields = [
            'session_id',
            'conversation_id',
            'cmid',
            'user_id',
            'updated_at',
        ]
