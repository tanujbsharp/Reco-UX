"""
Amazon SES client wrapper for Bsharp Reco.
Handles transactional email sending for:
- Recommendation share emails
- Lead capture confirmation
- Admin notifications

Used by: Lead Capture, Email Share.
"""
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

def _get_setting(name, fallback):
    try:
        from django.conf import settings
        return getattr(settings, name, fallback)
    except Exception:
        return fallback


class SESClient:
    """
    Wrapper around Amazon SES for sending emails.
    """

    def __init__(self, region_name=None, sender_email=None):
        self.region_name = region_name or _get_setting('AWS_REGION', 'ap-south-1')
        self.sender_email = sender_email or _get_setting('SES_FROM_EMAIL', 'noreply@bsharpcorp.com')
        self._client = None

    @property
    def client(self):
        """Lazy-initialize the SES client."""
        if self._client is None:
            self._client = boto3.client(
                'ses',
                region_name=self.region_name,
            )
        return self._client

    def send_email(self, to_addresses, subject, body_html, body_text=None, reply_to=None):
        """
        Send an email via SES.

        Args:
            to_addresses: List of recipient email addresses.
            subject: Email subject line.
            body_html: HTML body content.
            body_text: Optional plain-text body (fallback).
            reply_to: Optional reply-to address.

        Returns:
            dict: SES response with MessageId.
        """
        if isinstance(to_addresses, str):
            to_addresses = [to_addresses]

        message = {
            'Subject': {'Data': subject, 'Charset': 'UTF-8'},
            'Body': {
                'Html': {'Data': body_html, 'Charset': 'UTF-8'},
            },
        }

        if body_text:
            message['Body']['Text'] = {'Data': body_text, 'Charset': 'UTF-8'}

        destination = {'ToAddresses': to_addresses}

        kwargs = {
            'Source': self.sender_email,
            'Destination': destination,
            'Message': message,
        }

        if reply_to:
            kwargs['ReplyToAddresses'] = [reply_to] if isinstance(reply_to, str) else reply_to

        try:
            response = self.client.send_email(**kwargs)
            logger.info(
                'Email sent to %s, MessageId: %s',
                ', '.join(to_addresses),
                response['MessageId'],
            )
            return response
        except ClientError as e:
            logger.error('SES send_email failed: %s', str(e))
            raise

    def send_templated_email(self, to_addresses, template_name, template_data):
        """
        Send a templated email via SES.

        Args:
            to_addresses: List of recipient email addresses.
            template_name: The SES template name.
            template_data: JSON string of template data.

        Returns:
            dict: SES response.
        """
        import json

        if isinstance(to_addresses, str):
            to_addresses = [to_addresses]
        if not isinstance(template_data, str):
            template_data = json.dumps(template_data)

        try:
            response = self.client.send_templated_email(
                Source=self.sender_email,
                Destination={'ToAddresses': to_addresses},
                Template=template_name,
                TemplateData=template_data,
            )
            logger.info(
                'Templated email sent to %s using template %s',
                ', '.join(to_addresses),
                template_name,
            )
            return response
        except ClientError as e:
            logger.error('SES send_templated_email failed: %s', str(e))
            raise


# Module-level singleton for convenience
ses_client = SESClient()
