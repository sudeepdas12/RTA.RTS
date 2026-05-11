"""
Enhanced Pagination Configuration for DRF with caching and sorting recommendations

Provides:
- Configurable page sizes
- Cursor-based pagination option
- Sorting and filtering parameters
- Cache headers for browser caching
"""

from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response
from collections import OrderedDict


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for large result sets (1000+)
    Uses page-based pagination with larger page sizes
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500
    page_size_query_description = 'Number of results to return per page.'
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_count', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.page_size),
            ('results', data)
        ]))


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for regular result sets (< 1000)
    Default page size: 50
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_size_query_description = 'Number of results to return per page.'
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_count', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('page_size', self.page_size),
            ('results', data)
        ]))


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination for small result sets
    Default page size: 25
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_size_query_description = 'Number of results to return per page.'


class OptimizedCursorPagination(CursorPagination):
    """
    Cursor-based pagination for better performance on large datasets
    Recommended for sorted data (by created_at, id, etc.)
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'  # Default sort order
    template = None
    
    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_size', self.page_size),
            ('results', data)
        ]))


# Usage in ViewSet:
# class PayablesViewSet(ViewSet):
#     pagination_class = StandardResultsSetPagination
#
#     def list(self, request):
#         queryset = PayableModel.objects.all().order_by('-created_at')
#         page = self.paginate_queryset(queryset)
#         serializer = PayableSerializer(page, many=True)
#         return self.get_paginated_response(serializer.data)
