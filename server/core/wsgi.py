"""
WSGI config for core project.

CORS is handled HERE at the raw WSGI/PEP-3333 protocol level.
This is the most reliable approach for Vercel's @vercel/python runtime because:
  - The @vercel/python adapter reads WSGI response tuples directly
  - Headers set at this level CANNOT be stripped by the adapter's conversion layer
  - Options preflight requests are handled immediately without touching Django
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

_django_app = get_wsgi_application()

# Frontend origin — reads from env var, falls back to production URL
FRONTEND_ORIGIN = os.environ.get(
    'FRONTEND_URL',
    'https://resume-builder-ytvj.vercel.app'
)


class CORSMiddleware:
    """
    WSGI-level CORS middleware.

    Wraps the Django WSGI application and injects Access-Control-* headers into
    every HTTP response at the WSGI protocol layer, bypassing all higher-level
    header stripping that the @vercel/python Lambda adapter may perform.
    """

    def __init__(self, app):
        self.app = app

    def _cors_headers(self, environ):
        # Echo the actual request Origin if present; otherwise use known frontend
        origin = environ.get('HTTP_ORIGIN') or FRONTEND_ORIGIN
        return [
            ('Access-Control-Allow-Origin', origin),
            ('Access-Control-Allow-Credentials', 'true'),
            ('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS'),
            ('Access-Control-Allow-Headers',
             'Content-Type, Authorization, X-CSRFToken, X-Requested-With'),
            ('Access-Control-Max-Age', '86400'),
        ]

    def __call__(self, environ, start_response):
        cors = self._cors_headers(environ)

        # Handle preflight OPTIONS immediately — no Django processing needed
        if environ.get('REQUEST_METHOD') == 'OPTIONS':
            start_response('200 OK', cors)
            return [b'']

        def custom_start_response(status, response_headers, exc_info=None):
            # Strip any CORS headers Django may have already set (avoid duplicates)
            filtered = [
                (k, v) for k, v in response_headers
                if not k.lower().startswith('access-control-')
            ]
            # Inject our guaranteed CORS headers
            filtered.extend(cors)
            return start_response(status, filtered, exc_info)

        return self.app(environ, custom_start_response)


# Exported WSGI application — Vercel reads this
application = CORSMiddleware(_django_app)
