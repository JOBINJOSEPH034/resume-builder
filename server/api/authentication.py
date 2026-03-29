from rest_framework.authentication import TokenAuthentication


class CookieTokenAuthentication(TokenAuthentication):
    """
    Reads the auth token from an httpOnly cookie 'rf_session'.
    Falls back to the standard Authorization header for backward compatibility.
    """

    def authenticate(self, request):
        cookie_token = request.COOKIES.get('rf_session')
        if cookie_token:
            return self.authenticate_credentials(cookie_token)
        # Fallback to Authorization: Token <key> header
        return super().authenticate(request)
