"""
DRF serializers for the Packet Builder.

Provides nested read serializers for the full packet configuration
and write serializers for product upload and packet management.
"""
from rest_framework import serializers

from apps.packets.models import (
    Packet,
    Product,
    Feature,
    FeatureValue,
    BenefitMapping,
    Dimension,
    ScoringConfig,
    ProductContent,
    Accessory,
    FinanceScheme,
    RetailOutlet,
)


# ---------------------------------------------------------------------------
# Leaf serializers
# ---------------------------------------------------------------------------

class FeatureValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureValue
        fields = ('value_id', 'feature', 'value', 'normalized_value')


class ProductContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductContent
        fields = (
            'content_id', 'hero_image_url', 'gallery_urls',
            'fit_summary', 'key_highlights', 'best_for', 'salesperson_tips',
        )


class AccessorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Accessory
        fields = ('accessory_id', 'accessory_name', 'price', 'image_url')


class FinanceSchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceScheme
        fields = ('scheme_id', 'scheme_name', 'valid_from', 'valid_until')


# ---------------------------------------------------------------------------
# Product serializer (nested read)
# ---------------------------------------------------------------------------

class ProductSerializer(serializers.ModelSerializer):
    feature_values = FeatureValueSerializer(many=True, read_only=True)
    content = ProductContentSerializer(read_only=True)
    accessories = AccessorySerializer(many=True, read_only=True)
    finance_schemes = FinanceSchemeSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = (
            'product_id', 'product_code', 'model', 'family', 'price',
            'product_url', 'crawl_status', 'created_at',
            'feature_values', 'content', 'accessories', 'finance_schemes',
        )


# ---------------------------------------------------------------------------
# Packet sub-entity serializers
# ---------------------------------------------------------------------------

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = (
            'feature_id', 'feature_code', 'feature_name',
            'feature_type', 'is_comparable', 'is_scoreable',
        )


class BenefitMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenefitMapping
        fields = ('mapping_id', 'benefit_name', 'feature_code', 'weight_impact')


class DimensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dimension
        fields = ('dimension_id', 'dimension_name', 'priority', 'seed_questions')


class ScoringConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringConfig
        fields = ('config_id', 'default_weights', 'hard_filters', 'stopping_rules')


# ---------------------------------------------------------------------------
# Full Packet serializer (nested read for GET /api/packets/{id})
# ---------------------------------------------------------------------------

class PacketDetailSerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True, read_only=True)
    features = FeatureSerializer(many=True, read_only=True)
    benefit_mappings = BenefitMappingSerializer(many=True, read_only=True)
    dimensions = DimensionSerializer(many=True, read_only=True)
    scoring_configs = ScoringConfigSerializer(many=True, read_only=True)

    class Meta:
        model = Packet
        fields = (
            'packet_id', 'cmid', 'category', 'brand', 'launch_status',
            'created_at', 'products', 'features', 'benefit_mappings',
            'dimensions', 'scoring_configs',
        )


class PacketListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Packet
        fields = ('packet_id', 'cmid', 'category', 'brand', 'launch_status', 'created_at')


# ---------------------------------------------------------------------------
# RetailOutlet serializer
# ---------------------------------------------------------------------------

class RetailOutletSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetailOutlet
        fields = (
            'outlet_id', 'cmid', 'outlet_name', 'city',
            'geography_zone', 'assigned_packets', 'is_active',
        )
