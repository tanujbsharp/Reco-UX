"""
OpenSearch index definitions for Bsharp Reco.

Four indexes:
  1. reco_journey_trails   — records of customer session trails
  2. reco_moderation_docs  — moderation / business override documents
  3. reco_product_kb       — product knowledge-base chunks (RAG)
  4. reco_feedback          — feedback patterns for learning loops
"""

# -----------------------------------------------------------------------
# Index names (use these constants everywhere to avoid typos)
# -----------------------------------------------------------------------
INDEX_JOURNEY_TRAILS = 'reco_journey_trails'
INDEX_MODERATION_DOCS = 'reco_moderation_docs'
INDEX_PRODUCT_KB = 'reco_product_kb'
INDEX_FEEDBACK = 'reco_feedback'

# -----------------------------------------------------------------------
# Shared settings
# -----------------------------------------------------------------------
DEFAULT_INDEX_SETTINGS = {
    'number_of_shards': 1,
    'number_of_replicas': 0,
}

# -----------------------------------------------------------------------
# 1. Journey Trails
# -----------------------------------------------------------------------
JOURNEY_TRAILS_MAPPING = {
    'properties': {
        'session_id': {'type': 'integer'},
        'conversation_id': {'type': 'keyword'},
        'cmid': {'type': 'integer'},
        'outlet_id': {'type': 'integer'},
        'user_id': {'type': 'integer'},
        'packet_id': {'type': 'integer'},
        'discovery_mode': {'type': 'keyword'},
        'trail': {
            'type': 'nested',
            'properties': {
                'step': {'type': 'integer'},
                'question': {'type': 'text'},
                'answer': {'type': 'text'},
                'dimension': {'type': 'keyword'},
                'timestamp': {'type': 'date'},
            },
        },
        'final_recommendations': {'type': 'integer'},  # array of product_ids
        'feedback_stars': {'type': 'integer'},
        'status': {'type': 'keyword'},
        'created_at': {'type': 'date'},
        'updated_at': {'type': 'date'},
    },
}

# -----------------------------------------------------------------------
# 2. Moderation Docs
# -----------------------------------------------------------------------
MODERATION_DOCS_MAPPING = {
    'properties': {
        'doc_id': {'type': 'keyword'},
        'cmid': {'type': 'integer'},
        'packet_id': {'type': 'integer'},
        'doc_type': {'type': 'keyword'},       # e.g. 'policy', 'guideline', 'faq'
        'title': {'type': 'text'},
        'content': {'type': 'text'},
        'chunk_index': {'type': 'integer'},
        'metadata': {'type': 'object', 'enabled': True},
        'created_at': {'type': 'date'},
    },
}

# -----------------------------------------------------------------------
# 3. Product Knowledge Base
# -----------------------------------------------------------------------
PRODUCT_KB_MAPPING = {
    'properties': {
        'chunk_id': {'type': 'keyword'},
        'cmid': {'type': 'integer'},
        'packet_id': {'type': 'integer'},
        'product_id': {'type': 'integer'},
        'product_code': {'type': 'keyword'},
        'product_model': {'type': 'text'},
        'family': {'type': 'keyword'},
        'chunk_type': {'type': 'keyword'},     # e.g. 'feature', 'spec', 'review', 'content'
        'content': {'type': 'text'},
        'feature_code': {'type': 'keyword'},
        'feature_name': {'type': 'text'},
        'value': {'type': 'text'},
        'price': {'type': 'float'},
        'metadata': {'type': 'object', 'enabled': True},
        'created_at': {'type': 'date'},
    },
}

# -----------------------------------------------------------------------
# 4. Feedback
# -----------------------------------------------------------------------
FEEDBACK_MAPPING = {
    'properties': {
        'feedback_id': {'type': 'integer'},
        'session_id': {'type': 'integer'},
        'cmid': {'type': 'integer'},
        'outlet_id': {'type': 'integer'},
        'packet_id': {'type': 'integer'},
        'stars': {'type': 'integer'},
        'comment': {'type': 'text'},
        'recommended_products': {'type': 'integer'},  # array
        'selected_product': {'type': 'integer'},
        'discovery_mode': {'type': 'keyword'},
        'created_at': {'type': 'date'},
    },
}

# -----------------------------------------------------------------------
# Registry: mapping index name -> (mapping, settings)
# -----------------------------------------------------------------------
INDEX_DEFINITIONS = {
    INDEX_JOURNEY_TRAILS: {
        'mappings': JOURNEY_TRAILS_MAPPING,
        'settings': DEFAULT_INDEX_SETTINGS,
    },
    INDEX_MODERATION_DOCS: {
        'mappings': MODERATION_DOCS_MAPPING,
        'settings': DEFAULT_INDEX_SETTINGS,
    },
    INDEX_PRODUCT_KB: {
        'mappings': PRODUCT_KB_MAPPING,
        'settings': DEFAULT_INDEX_SETTINGS,
    },
    INDEX_FEEDBACK: {
        'mappings': FEEDBACK_MAPPING,
        'settings': DEFAULT_INDEX_SETTINGS,
    },
}
