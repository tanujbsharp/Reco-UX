"""
Amazon Bedrock client wrapper for Bsharp Reco.
Provides a unified interface for invoking Claude Sonnet via Bedrock.

Used by: Question Orchestrator, Recommendation Engine, Explanation Engine,
         Comparison Engine, Product Chat, Feedback Pattern Analyzer.
"""
import json
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Defaults — overridden by Django settings (populated from .env)
def _get_setting(name, fallback):
    try:
        from django.conf import settings
        return getattr(settings, name, fallback)
    except Exception:
        return fallback

DEFAULT_MAX_TOKENS = 4096


class BedrockClient:
    """
    Wrapper around Amazon Bedrock Runtime for invoking Claude Sonnet.
    Handles request formatting, error handling, and response parsing.
    """

    def __init__(self, region_name=None, model_id=None, max_tokens=None):
        self.region_name = region_name or _get_setting('AWS_REGION', 'ap-south-1')
        self.model_id = model_id or _get_setting('BEDROCK_MODEL_ID', 'anthropic.claude-sonnet-4-20250514')
        self.max_tokens = max_tokens or DEFAULT_MAX_TOKENS
        self._client = None

    @property
    def client(self):
        """Lazy-initialize the Bedrock Runtime client."""
        if self._client is None:
            self._client = boto3.client(
                'bedrock-runtime',
                region_name=self.region_name,
            )
        return self._client

    def invoke(self, prompt, system_prompt=None, temperature=0.7, max_tokens=None):
        """
        Invoke Claude Sonnet with the given prompt.

        Args:
            prompt: The user prompt text.
            system_prompt: Optional system prompt for context/instructions.
            temperature: Sampling temperature (0.0-1.0).
            max_tokens: Maximum tokens in response.

        Returns:
            str: The model's text response.

        Raises:
            ClientError: If the Bedrock API call fails.
        """
        messages = [{'role': 'user', 'content': prompt}]

        body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': max_tokens or self.max_tokens,
            'temperature': temperature,
            'messages': messages,
        }

        if system_prompt:
            body['system'] = system_prompt

        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(body),
            )

            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']

        except ClientError as e:
            logger.error('Bedrock invocation failed: %s', str(e))
            raise

    def invoke_with_messages(self, messages, system_prompt=None, temperature=0.7, max_tokens=None):
        """
        Invoke Claude Sonnet with a full message history.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            system_prompt: Optional system prompt.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens in response.

        Returns:
            str: The model's text response.
        """
        body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': max_tokens or self.max_tokens,
            'temperature': temperature,
            'messages': messages,
        }

        if system_prompt:
            body['system'] = system_prompt

        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(body),
            )

            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']

        except ClientError as e:
            logger.error('Bedrock invocation failed: %s', str(e))
            raise


# Module-level singleton for convenience
bedrock_client = BedrockClient()
