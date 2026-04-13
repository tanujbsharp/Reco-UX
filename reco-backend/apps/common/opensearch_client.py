"""
Amazon OpenSearch client wrapper for Bsharp Reco.
Provides connection management and query helpers for:
- Journey trails index
- Moderation documents index
- Product knowledge base index
- Feedback patterns index

Used by: Product Chat (RAG), Moderation Engine, Feedback Learning, Analytics.
"""
import logging

from opensearchpy import OpenSearch, RequestsHttpConnection

logger = logging.getLogger(__name__)

# Defaults — overridden by Django settings (populated from .env)
def _get_setting(name, fallback):
    try:
        from django.conf import settings
        return getattr(settings, name, fallback)
    except Exception:
        return fallback


class OpenSearchClient:
    """
    Wrapper around the OpenSearch Python client.
    Handles connection, indexing, searching, and bulk operations.
    """

    def __init__(self, host=None, port=None, scheme=None, auth=None, verify_certs=True):
        self.host = host or _get_setting('OPENSEARCH_HOST', 'localhost')
        self.port = port or _get_setting('OPENSEARCH_PORT', 9200)
        self.scheme = scheme or 'https'
        self.auth = auth or (_get_setting('OPENSEARCH_USER', 'admin'), _get_setting('OPENSEARCH_PASSWORD', 'admin'))
        self.verify_certs = verify_certs
        self._client = None

    @property
    def client(self):
        """Lazy-initialize the OpenSearch client."""
        if self._client is None:
            self._client = OpenSearch(
                hosts=[{'host': self.host, 'port': self.port}],
                http_auth=self.auth,
                use_ssl=(self.scheme == 'https'),
                verify_certs=self.verify_certs,
                connection_class=RequestsHttpConnection,
            )
        return self._client

    def index_document(self, index_name, document, doc_id=None):
        """
        Index a single document.

        Args:
            index_name: The target index.
            document: Dict of document fields.
            doc_id: Optional document ID.

        Returns:
            dict: OpenSearch response.
        """
        try:
            return self.client.index(
                index=index_name,
                body=document,
                id=doc_id,
                refresh='wait_for',
            )
        except Exception as e:
            logger.error('Failed to index document to %s: %s', index_name, str(e))
            raise

    def search(self, index_name, query, size=10):
        """
        Execute a search query.

        Args:
            index_name: The target index.
            query: OpenSearch query DSL dict.
            size: Maximum number of results.

        Returns:
            dict: OpenSearch search response.
        """
        try:
            return self.client.search(
                index=index_name,
                body=query,
                size=size,
            )
        except Exception as e:
            logger.error('Search failed on %s: %s', index_name, str(e))
            raise

    def bulk_index(self, index_name, documents):
        """
        Bulk index multiple documents.

        Args:
            index_name: The target index.
            documents: List of document dicts.

        Returns:
            dict: OpenSearch bulk response.
        """
        from opensearchpy.helpers import bulk

        actions = [
            {
                '_index': index_name,
                '_source': doc,
            }
            for doc in documents
        ]

        try:
            return bulk(self.client, actions)
        except Exception as e:
            logger.error('Bulk index failed on %s: %s', index_name, str(e))
            raise

    def delete_index(self, index_name):
        """Delete an index if it exists."""
        try:
            if self.client.indices.exists(index=index_name):
                return self.client.indices.delete(index=index_name)
        except Exception as e:
            logger.error('Failed to delete index %s: %s', index_name, str(e))
            raise

    def create_index(self, index_name, mappings=None, settings=None):
        """
        Create an index with optional mappings and settings.

        Args:
            index_name: The index name.
            mappings: Optional field mapping dict.
            settings: Optional index settings dict.

        Returns:
            dict: OpenSearch response.
        """
        body = {}
        if mappings:
            body['mappings'] = mappings
        if settings:
            body['settings'] = settings

        try:
            if not self.client.indices.exists(index=index_name):
                return self.client.indices.create(index=index_name, body=body)
        except Exception as e:
            logger.error('Failed to create index %s: %s', index_name, str(e))
            raise


# Module-level singleton for convenience
opensearch_client = OpenSearchClient()
