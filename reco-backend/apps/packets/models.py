"""
Packet Builder models for Bsharp Reco.

Defines the full packet configuration hierarchy:
- Packet (top-level container per brand/category)
- Product, Feature, FeatureValue
- BenefitMapping, Dimension, ScoringConfig
- ProductContent, Accessory, FinanceScheme
- RetailOutlet (store assignment)

Ref: FSD Section 17.2
"""
from django.db import models


class Packet(models.Model):
    packet_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField(db_index=True)
    category = models.CharField(max_length=100)
    brand = models.CharField(max_length=100)
    launch_status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'packets'

    def __str__(self):
        return f'Packet {self.packet_id}: {self.brand} — {self.category}'


class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE, related_name='products')
    product_code = models.CharField(max_length=50, unique=True)
    model = models.CharField(max_length=255)
    family = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    product_url = models.URLField(blank=True)
    crawl_status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'products'

    def __str__(self):
        return f'{self.product_code}: {self.model}'


class Feature(models.Model):
    feature_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE, related_name='features')
    feature_code = models.CharField(max_length=50)
    feature_name = models.CharField(max_length=100)
    feature_type = models.CharField(max_length=50)
    is_comparable = models.BooleanField(default=True)
    is_scoreable = models.BooleanField(default=True)

    class Meta:
        db_table = 'features'

    def __str__(self):
        return f'{self.feature_code}: {self.feature_name}'


class FeatureValue(models.Model):
    value_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='feature_values')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name='values')
    value = models.TextField()
    normalized_value = models.FloatField(null=True)

    class Meta:
        db_table = 'feature_values'

    def __str__(self):
        return f'{self.feature.feature_code}={self.value} (product {self.product_id})'


class BenefitMapping(models.Model):
    mapping_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE, related_name='benefit_mappings')
    benefit_name = models.CharField(max_length=100)
    feature_code = models.CharField(max_length=50)
    weight_impact = models.FloatField()

    class Meta:
        db_table = 'benefit_mappings'

    def __str__(self):
        return f'{self.benefit_name} -> {self.feature_code} (w={self.weight_impact})'


class Dimension(models.Model):
    dimension_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE, related_name='dimensions')
    dimension_name = models.CharField(max_length=100)
    priority = models.IntegerField(default=1)
    seed_questions = models.JSONField()

    class Meta:
        db_table = 'dimensions'

    def __str__(self):
        return f'{self.dimension_name} (priority {self.priority})'


class ScoringConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(Packet, on_delete=models.CASCADE, related_name='scoring_configs')
    default_weights = models.JSONField()
    hard_filters = models.JSONField(null=True)
    stopping_rules = models.JSONField(null=True)

    class Meta:
        db_table = 'scoring_configs'

    def __str__(self):
        return f'ScoringConfig {self.config_id} for Packet {self.packet_id}'


class ProductContent(models.Model):
    content_id = models.AutoField(primary_key=True)
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='content')
    hero_image_url = models.URLField(blank=True)
    gallery_urls = models.JSONField(default=list)
    fit_summary = models.TextField(blank=True)
    key_highlights = models.JSONField(default=list)
    best_for = models.CharField(max_length=255, blank=True)
    salesperson_tips = models.JSONField(default=list)

    class Meta:
        db_table = 'product_content'

    def __str__(self):
        return f'Content for Product {self.product_id}'


class Accessory(models.Model):
    accessory_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='accessories')
    accessory_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    image_url = models.URLField(blank=True)

    class Meta:
        db_table = 'accessories'
        verbose_name_plural = 'Accessories'

    def __str__(self):
        return self.accessory_name


class FinanceScheme(models.Model):
    scheme_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='finance_schemes')
    scheme_name = models.CharField(max_length=255)
    valid_from = models.DateField(null=True)
    valid_until = models.DateField(null=True)

    class Meta:
        db_table = 'finance_schemes'

    def __str__(self):
        return self.scheme_name


class RetailOutlet(models.Model):
    outlet_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField(db_index=True)
    outlet_name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    geography_zone = models.CharField(max_length=50, blank=True)
    assigned_packets = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'retail_outlets'

    def __str__(self):
        return f'{self.outlet_name} ({self.city})'
