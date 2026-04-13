"""
Amazon S3 client wrapper for Bsharp Reco.
Handles upload, download, and presigned URL generation for:
- Product images and content
- Moderation documents
- Audio recordings (voice discovery)
- Excel upload files

Used by: Packet Builder, Voice Pipeline, Moderation, Product Chat.
"""
import logging
import mimetypes

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

def _get_setting(name, fallback):
    try:
        from django.conf import settings
        return getattr(settings, name, fallback)
    except Exception:
        return fallback


class S3Client:
    """
    Wrapper around AWS S3 for file operations.
    """

    def __init__(self, bucket_name=None, region_name=None):
        self.bucket_name = bucket_name or _get_setting('AWS_S3_BUCKET', 'bsharp-reco-media')
        self.region_name = region_name or _get_setting('AWS_REGION', 'ap-south-1')
        self._client = None

    @property
    def client(self):
        """Lazy-initialize the S3 client."""
        if self._client is None:
            self._client = boto3.client(
                's3',
                region_name=self.region_name,
            )
        return self._client

    def upload_file(self, file_obj, key, content_type=None):
        """
        Upload a file-like object to S3.

        Args:
            file_obj: File-like object to upload.
            key: The S3 object key (path).
            content_type: Optional MIME type.

        Returns:
            str: The S3 key of the uploaded object.
        """
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        elif hasattr(file_obj, 'name'):
            mime_type, _ = mimetypes.guess_type(file_obj.name)
            if mime_type:
                extra_args['ContentType'] = mime_type

        try:
            self.client.upload_fileobj(
                file_obj,
                self.bucket_name,
                key,
                ExtraArgs=extra_args,
            )
            logger.info('Uploaded file to s3://%s/%s', self.bucket_name, key)
            return key
        except ClientError as e:
            logger.error('S3 upload failed for %s: %s', key, str(e))
            raise

    def download_file(self, key):
        """
        Download a file from S3.

        Args:
            key: The S3 object key.

        Returns:
            bytes: The file contents.
        """
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except ClientError as e:
            logger.error('S3 download failed for %s: %s', key, str(e))
            raise

    def generate_presigned_url(self, key, expiration=3600):
        """
        Generate a presigned URL for temporary access to an S3 object.

        Args:
            key: The S3 object key.
            expiration: URL expiry in seconds (default: 1 hour).

        Returns:
            str: The presigned URL.
        """
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            logger.error('Presigned URL generation failed for %s: %s', key, str(e))
            raise

    def delete_file(self, key):
        """
        Delete a file from S3.

        Args:
            key: The S3 object key.
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info('Deleted s3://%s/%s', self.bucket_name, key)
        except ClientError as e:
            logger.error('S3 delete failed for %s: %s', key, str(e))
            raise


# Module-level singleton for convenience
s3_client = S3Client()
