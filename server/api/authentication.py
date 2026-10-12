from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from urllib.parse import urlsplit

class CookieTokenAuthentication(TokenAuthentication):
    """
    Reads the auth token from an httpOnly cookie 'rf_session'.
    Falls back to the standard Authorization header for backward compatibility.
    Catches AuthenticationFailed to gracefully degrade so old cookies don't crash AllowAny routes.
    """

    def authenticate(self, request):
        cookie_token = request.COOKIES.get('rf_session')
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            origin = request.headers.get('Origin')
            if origin:
                from core.middleware import ALLOWED_ORIGINS
                same_origin = urlsplit(origin).netloc == request.get_host() and urlsplit(origin).scheme == request.scheme
                if not same_origin and origin not in ALLOWED_ORIGINS:
                    raise AuthenticationFailed('Untrusted request origin.')
        
        try:
            if cookie_token:
                return self.authenticate_credentials(cookie_token)
            # Fallback to Authorization: Token <key> header
            return super().authenticate(request)
        except AuthenticationFailed:
            # If the token is invalid/expired, act as if no token was provided.
            return None
