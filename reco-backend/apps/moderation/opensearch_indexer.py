"""
Moderation document indexer for OpenSearch.

Accepts raw text (policies, guidelines, FAQs, business rules) from the
brand admin, chunks it, and indexes the chunks to the reco_moderation_docs
index.  These chunks are used by the RAG pipeline to apply business
context during product chat and recommendation explanations.
"""
import logging
import uuid
from datetime import datetime, timezone

from apps.common.opensearch_client import opensearch_client
from apps.common.opensearch_indexes import INDEX_MODERATION_DOCS

logger = logging.getLogger(__name__)

# Approximate max characters per chunk — tuned for typical LLM context windows
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200


def _chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Split text into overlapping chunks.

    Returns:
        list[str]
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def index_moderation_doc(cmid, packet_id, doc_type, title, content, metadata=None):
    """
    Chunk and index a single moderation document.

    Args:
        cmid: Tenant id.
        packet_id: Associated Packet id.
        doc_type: 'policy' | 'guideline' | 'faq' | etc.
        title: Human-readable title.
        content: Full document text.
        metadata: Optional dict of extra fields.

    Returns:
        int: number of chunks indexed.
    """
    chunks = _chunk_text(content)
    doc_id_prefix = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()

    documents = []
    for idx, chunk in enumerate(chunks):
        documents.append({
            'doc_id': f'{doc_id_prefix}-{idx}',
            'cmid': cmid,
            'packet_id': packet_id,
            'doc_type': doc_type,
            'title': title,
            'content': chunk,
            'chunk_index': idx,
            'metadata': metadata or {},
            'created_at': now,
        })

    if documents:
        try:
            opensearch_client.bulk_index(INDEX_MODERATION_DOCS, documents)
            logger.info(
                'Indexed %d moderation doc chunks for packet %d (type=%s)',
                len(documents), packet_id, doc_type,
            )
        except Exception as exc:
            logger.error('Failed to index moderation doc: %s', exc)

    return len(documents)
