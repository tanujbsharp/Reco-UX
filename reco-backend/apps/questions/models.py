from django.db import models


class PromptTemplate(models.Model):
    template_id = models.AutoField(primary_key=True)
    template_name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=50)  # question_generation, tag_extraction, explanation, comparison, chat
    template_content = models.TextField()
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prompt_templates'

    def __str__(self):
        return f'{self.template_name} v{self.version} ({self.template_type})'


class LLMCallLog(models.Model):
    call_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        null=True,
        related_name='llm_calls',
    )
    call_type = models.CharField(max_length=50)  # question_gen, tag_extraction, explanation, comparison, chat
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    latency_ms = models.IntegerField(default=0)
    cache_hit = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'llm_call_logs'

    def __str__(self):
        return f'LLMCall {self.call_id} ({self.call_type}) session={self.session_id}'
