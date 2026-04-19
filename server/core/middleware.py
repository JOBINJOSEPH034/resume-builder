import os
from django.http import HttpResponse


# Origins that are explicitly allowed to make cross-origin credentialed requests.
# Add your custom domain here if you use one.
_RAW_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '')
_EXTRA_ORIGINS = [o.strip() for o in _RAW_ORIGINS.split(',') if o.strip()]

ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    *_EXTRA_ORIGINS,
]


class CORSMiddleware:
    """
    CORS middleware with an explicit origin allowlist.
    Reflecting any incoming Origin with Allow-Credentials: true is equivalent
    to a wildcard CORS policy and allows any site to make authenticated requests.
    This implementation only reflects origins that are pre-approved.
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
        origin = request.META.get('HTTP_ORIGIN', '')

        # Only allow pre-approved origins. Also allow *.vercel.app dynamically.
        is_allowed = (
            origin in ALLOWED_ORIGINS
            or (origin.startswith('https://') and origin.endswith('.vercel.app'))
        )

        if is_allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = (
                'Content-Type, Authorization, X-CSRFToken, X-Requested-With'
            )
            response['Access-Control-Max-Age'] = '86400'
