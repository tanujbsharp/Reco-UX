"""
Custom pagination classes for Bsharp Reco.
Standard pagination used across all list endpoints.
"""
from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Default pagination for all DRF list endpoints.
    Page size: 20 (configurable via query param).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class SmallPagination(PageNumberPagination):
    """
    Smaller page size for endpoints returning lightweight data
    (e.g., product chat messages, feedback items).
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LargePagination(PageNumberPagination):
    """
    Larger page size for admin/analytics endpoints
    where more data is needed per request.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
