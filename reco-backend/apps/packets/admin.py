"""
Django admin configuration for the Packet Builder.

Registers all packet-related models with appropriate inlines
so brand admins can manage packets, products, features, dimensions,
scoring, content, accessories, and finance schemes from the admin UI.
"""
from django.contrib import admin

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
# Inlines for PacketAdmin
# ---------------------------------------------------------------------------

class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ('product_code', 'model', 'family', 'price', 'product_url', 'crawl_status')
    show_change_link = True


class FeatureInline(admin.TabularInline):
    model = Feature
    extra = 0
    fields = ('feature_code', 'feature_name', 'feature_type', 'is_comparable', 'is_scoreable')


class DimensionInline(admin.TabularInline):
    model = Dimension
    extra = 0
    fields = ('dimension_name', 'priority', 'seed_questions')


class BenefitMappingInline(admin.TabularInline):
    model = BenefitMapping
    extra = 0
    fields = ('benefit_name', 'feature_code', 'weight_impact')


class ScoringConfigInline(admin.StackedInline):
    model = ScoringConfig
    extra = 0


# ---------------------------------------------------------------------------
# Inlines for ProductAdmin
# ---------------------------------------------------------------------------

class FeatureValueInline(admin.TabularInline):
    model = FeatureValue
    extra = 0
    fields = ('feature', 'value', 'normalized_value')


class ProductContentInline(admin.StackedInline):
    model = ProductContent
    extra = 0
    max_num = 1


class AccessoryInline(admin.TabularInline):
    model = Accessory
    extra = 0
    fields = ('accessory_name', 'price', 'image_url')


class FinanceSchemeInline(admin.TabularInline):
    model = FinanceScheme
    extra = 0
    fields = ('scheme_name', 'valid_from', 'valid_until')


# ---------------------------------------------------------------------------
# ModelAdmins
# ---------------------------------------------------------------------------

@admin.register(Packet)
class PacketAdmin(admin.ModelAdmin):
    list_display = ('packet_id', 'cmid', 'brand', 'category', 'launch_status', 'created_at')
    list_filter = ('launch_status', 'brand', 'cmid')
    search_fields = ('brand', 'category')
    inlines = [
        ProductInline,
        FeatureInline,
        DimensionInline,
        BenefitMappingInline,
        ScoringConfigInline,
    ]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('product_id', 'product_code', 'model', 'family', 'price', 'crawl_status')
    list_filter = ('crawl_status', 'packet')
    search_fields = ('product_code', 'model', 'family')
    inlines = [
        FeatureValueInline,
        ProductContentInline,
        AccessoryInline,
        FinanceSchemeInline,
    ]


@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('feature_id', 'feature_code', 'feature_name', 'feature_type', 'is_comparable', 'is_scoreable')
    list_filter = ('feature_type', 'is_comparable', 'is_scoreable', 'packet')
    search_fields = ('feature_code', 'feature_name')


@admin.register(BenefitMapping)
class BenefitMappingAdmin(admin.ModelAdmin):
    list_display = ('mapping_id', 'benefit_name', 'feature_code', 'weight_impact', 'packet')
    list_filter = ('packet',)
    search_fields = ('benefit_name', 'feature_code')


@admin.register(Dimension)
class DimensionAdmin(admin.ModelAdmin):
    list_display = ('dimension_id', 'dimension_name', 'priority', 'packet')
    list_filter = ('packet',)
    search_fields = ('dimension_name',)


@admin.register(ScoringConfig)
class ScoringConfigAdmin(admin.ModelAdmin):
    list_display = ('config_id', 'packet')
    list_filter = ('packet',)


@admin.register(ProductContent)
class ProductContentAdmin(admin.ModelAdmin):
    list_display = ('content_id', 'product', 'best_for')
    search_fields = ('best_for', 'fit_summary')


@admin.register(Accessory)
class AccessoryAdmin(admin.ModelAdmin):
    list_display = ('accessory_id', 'accessory_name', 'price', 'product')
    list_filter = ('product',)
    search_fields = ('accessory_name',)


@admin.register(FinanceScheme)
class FinanceSchemeAdmin(admin.ModelAdmin):
    list_display = ('scheme_id', 'scheme_name', 'valid_from', 'valid_until', 'product')
    list_filter = ('product',)
    search_fields = ('scheme_name',)


@admin.register(RetailOutlet)
class RetailOutletAdmin(admin.ModelAdmin):
    list_display = ('outlet_id', 'outlet_name', 'city', 'geography_zone', 'cmid', 'is_active')
    list_filter = ('is_active', 'cmid', 'city', 'geography_zone')
    search_fields = ('outlet_name', 'city')
