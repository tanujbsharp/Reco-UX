from django import forms
from django.contrib import admin

from apps.moderation.models import ModerationRule


class ModerationRuleAdminForm(forms.ModelForm):
    class Meta:
        model = ModerationRule
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['target_product_id'].required = True
        self.fields['target_type'].help_text = (
            'Boost multiplies score, suppress removes a product, push forces a target rank, and Promote If Close conditionally moves a product to the top.'
        )
        self.fields['target_product_id'].help_text = 'Required. Enter the product id this rule should affect.'
        self.fields['boost_strength'].required = False
        self.fields['boost_strength'].help_text = (
            'Used only for Boost. Example: 1.2 adds a 20% lift, 2.0 doubles the score.'
        )
        self.fields['min_fit_threshold'].required = False
        self.fields['min_fit_threshold'].help_text = (
            'Used only for Boost. Enter a decimal from 0.0 to 1.0, such as 0.3 for 30% fit.'
        )
        self.fields['target_rank'].required = False
        self.fields['target_rank'].help_text = 'Used only for Push. Example: 1 means push to the top, 2 means push to second.'
        self.fields['max_rank'].required = False
        self.fields['max_rank'].help_text = 'Used only for Promote If Close. The product must already be within this rank or better.'
        self.fields['max_gap_percent'].required = False
        self.fields['max_gap_percent'].help_text = 'Used only for Promote If Close. Example: 3 means within 3 percentage points of the current top result.'

    def clean(self):
        cleaned_data = super().clean()
        target_type = cleaned_data.get('target_type')
        target_product_id = cleaned_data.get('target_product_id')

        if target_product_id in (None, ''):
            self.add_error('target_product_id', 'Target product id is required.')

        if target_type == ModerationRule.TARGET_TYPE_BOOST:
            boost_strength = cleaned_data.get('boost_strength')
            min_fit_threshold = cleaned_data.get('min_fit_threshold')

            if boost_strength is None:
                self.add_error('boost_strength', 'Boost strength is required for boost rules.')
            elif boost_strength <= 0:
                self.add_error('boost_strength', 'Boost strength must be greater than 0.')

            if min_fit_threshold is None:
                self.add_error('min_fit_threshold', 'Min fit threshold is required for boost rules.')
            elif not 0 <= min_fit_threshold <= 1:
                self.add_error('min_fit_threshold', 'Min fit threshold must be between 0.0 and 1.0.')

            cleaned_data['target_rank'] = 1
            cleaned_data['max_rank'] = 2
            cleaned_data['max_gap_percent'] = 3.0
        elif target_type == ModerationRule.TARGET_TYPE_PUSH:
            target_rank = cleaned_data.get('target_rank')

            if target_rank is None:
                self.add_error('target_rank', 'Target rank is required for push rules.')
            elif target_rank < 1:
                self.add_error('target_rank', 'Target rank must be 1 or greater.')

            cleaned_data['boost_strength'] = 1.0
            cleaned_data['min_fit_threshold'] = 0.3
            cleaned_data['max_rank'] = 2
            cleaned_data['max_gap_percent'] = 3.0
        elif target_type == ModerationRule.TARGET_TYPE_PROMOTE_IF_CLOSE:
            max_rank = cleaned_data.get('max_rank')
            max_gap_percent = cleaned_data.get('max_gap_percent')

            if max_rank is None:
                self.add_error('max_rank', 'Max rank is required for Promote If Close rules.')
            elif max_rank < 1:
                self.add_error('max_rank', 'Max rank must be 1 or greater.')

            if max_gap_percent is None:
                self.add_error('max_gap_percent', 'Max gap percent is required for Promote If Close rules.')
            elif max_gap_percent < 0:
                self.add_error('max_gap_percent', 'Max gap percent must be 0 or greater.')

            cleaned_data['boost_strength'] = 1.0
            cleaned_data['min_fit_threshold'] = 0.3
            cleaned_data['target_rank'] = 1
        else:
            cleaned_data['boost_strength'] = 1.0
            cleaned_data['min_fit_threshold'] = 0.3
            cleaned_data['target_rank'] = 1
            cleaned_data['max_rank'] = 2
            cleaned_data['max_gap_percent'] = 3.0

        return cleaned_data


@admin.register(ModerationRule)
class ModerationRuleAdmin(admin.ModelAdmin):
    form = ModerationRuleAdminForm
    list_display = (
        'rule_id', 'packet', 'target_type', 'target_product_id',
        'boost_strength', 'min_fit_threshold', 'target_rank',
        'max_rank', 'max_gap_percent', 'is_active', 'created_at',
    )
    list_filter = ('target_type', 'is_active', 'packet')
    search_fields = ('target_type',)
    fieldsets = (
        (
            None,
            {
                'fields': ('packet', 'target_type', 'target_product_id', 'is_active'),
            },
        ),
        (
            'Boost Settings',
            {
                'fields': ('boost_strength', 'min_fit_threshold'),
                'description': 'These settings apply only when Target type is Boost.',
            },
        ),
        (
            'Push Settings',
            {
                'fields': ('target_rank',),
                'description': 'This setting applies only when Target type is Push.',
            },
        ),
        (
            'Conditional Promotion Settings',
            {
                'fields': ('max_rank', 'max_gap_percent'),
                'description': 'These settings apply only when Target type is Promote If Close.',
            },
        ),
    )

    class Media:
        js = ('admin/js/moderation_rule_admin.js',)
