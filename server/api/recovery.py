import secrets
import uuid
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.shortcuts import render
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from .models import PasswordRecovery


class RecoveryThrottle(AnonRateThrottle):
    rate = '5/hour'
    scope = 'password_recovery'
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class VerifyThrottle(RecoveryThrottle):
    rate = '30/hour'
    scope = 'password_recovery_verify'


def page(request):
    return render(request, 'admin/password_recovery.html')


@api_view(['POST'])
@throttle_classes([RecoveryThrottle])
def request_code(request):
    email = request.data.get('email', '')
    if not isinstance(email, str):
        return Response({'error': 'Enter a valid email address.'}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return Response({'error': 'Enter a valid email address.'}, status=400)
    if not settings.RECOVERY_EMAIL_ENABLED:
        return Response({'error': 'Email recovery is not configured. Contact the administrator.'}, status=503)
    challenge = uuid.uuid4()
    users = list(User.objects.filter(email__iexact=email.strip(), is_active=True)[:2])
    # Ambiguous addresses must be fixed by an administrator, never pick an account.
    if len(users) == 1:
        user = users[0]
        code = f'{secrets.randbelow(1000000):06d}'
        with transaction.atomic():
            User.objects.select_for_update().get(pk=user.pk)
            PasswordRecovery.objects.filter(user=user, consumed=False).update(consumed=True)
            row = PasswordRecovery.objects.create(id=challenge, user=user, code_hash=make_password(code), expires_at=timezone.now()+timedelta(minutes=10))
        try:
            send_mail('Ready Candidate password recovery', f'Your verification code is {code}. It expires in 10 minutes. Do not share this code. If you did not request a reset, ignore this email.', settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        except Exception:
            row.consumed = True
            row.save(update_fields=['consumed'])
            # Preserve the same public response as unknown accounts.
    return Response({'challenge': str(challenge), 'message': 'If this email belongs to an active account, a verification code has been sent.'})


def locked_challenge(value):
    try:
        challenge_id = uuid.UUID(str(value))
        user_id = PasswordRecovery.objects.filter(pk=challenge_id).values_list('user_id', flat=True).first()
        if user_id is None:
            return None
        # Use the same lock order as code issuance, including on PostgreSQL.
        User.objects.select_for_update().get(pk=user_id)
        return PasswordRecovery.objects.select_for_update().select_related('user').filter(pk=challenge_id, consumed=False, expires_at__gt=timezone.now(), attempts__lt=5).first()
    except User.DoesNotExist:
        return None
    except (ValueError, TypeError, AttributeError):
        return None


@api_view(['POST'])
@throttle_classes([VerifyThrottle])
@transaction.atomic
def verify_code(request):
    row = locked_challenge(request.data.get('challenge'))
    code = request.data.get('code')
    if not row or row.reset_hash:
        return Response({'error': 'Invalid or expired verification code.'}, status=400)
    row.attempts += 1
    if not isinstance(code, str) or len(code) != 6 or not check_password(code, row.code_hash):
        row.save(update_fields=['attempts'])
        return Response({'error': 'Invalid or expired verification code.'}, status=400)
    secret = secrets.token_urlsafe(32)
    row.attempts -= 1
    row.reset_hash = make_password(secret)
    row.save(update_fields=['attempts', 'reset_hash'])
    return Response({'reset_token': secret})


@api_view(['POST'])
@throttle_classes([VerifyThrottle])
@transaction.atomic
def reset_password(request):
    row = locked_challenge(request.data.get('challenge'))
    secret = request.data.get('reset_token')
    password = request.data.get('password')
    if not row or not row.reset_hash or not isinstance(secret, str) or len(secret)>100 or not check_password(secret, row.reset_hash):
        return Response({'error': 'Recovery session is invalid or expired. Request a new code.'}, status=400)
    if not isinstance(password, str) or len(password)>128:
        return Response({'error': 'Use a password between 8 and 128 characters.'}, status=400)
    try:
        validate_password(password, row.user)
    except ValidationError as exc:
        return Response({'error': ' '.join(exc.messages)}, status=400)
    row.user.set_password(password)
    row.user.save(update_fields=['password'])
    Token.objects.filter(user=row.user).delete()
    PasswordRecovery.objects.filter(user=row.user).update(consumed=True)
    return Response({'message': 'Password updated. Sign in with your new password.'})
