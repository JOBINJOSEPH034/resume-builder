from django.http import HttpResponse


class CORSMiddleware:
    """
    Minimal CORS middleware that directly injects Access-Control-* headers.
    Used because django-cors-headers does not work reliably in the
    Vercel @vercel/python serverless runtime.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle preflight OPTIONS requests immediately — before Django routing
        if request.method == 'OPTIONS':
            response = HttpResponse(status=200)
            self._add_cors_headers(request, response)
            return response

        response = self.get_response(request)
        self._add_cors_headers(request, response)
        return response

    def _add_cors_headers(self, request, response):
        origin = request.META.get('HTTP_ORIGIN', '*')
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-CSRFToken, X-Requested-With'
        )
        response['Access-Control-Max-Age'] = '86400'
