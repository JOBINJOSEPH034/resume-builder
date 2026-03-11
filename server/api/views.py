from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
import os
from .models import Transaction, Offer, UserProfile
from google import genai


# ──────────────────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['POST'])
def register(request):
    """Register a new user with name, email, password."""
    data = request.data
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=email).exists():
        return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'plan': user.profile.plan,
            'downloads_used': user.profile.downloads_used,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_view(request):
    """Login with email + password, returns token."""
    data = request.data
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = authenticate(username=email, password=password)
    if not user:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'plan': user.profile.plan if hasattr(user, 'profile') else 'free',
            'downloads_used': user.profile.downloads_used if hasattr(user, 'profile') else 0,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Delete auth token (logout)."""
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user info."""
    user = request.user
    return Response({
        'id': user.id,
        'email': user.email,
        'name': f"{user.first_name} {user.last_name}".strip() or user.email,
        'plan': user.profile.plan if hasattr(user, 'profile') else 'free',
        'downloads_used': user.profile.downloads_used if hasattr(user, 'profile') else 0,
    })


# ──────────────────────────────────────────────────────────────────────────────
# OFFER ENDPOINT
# ──────────────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def get_active_offer(request):
    """Returns the currently active offer, or null if none."""
    try:
        offer = Offer.objects.get(is_active=True)
        return Response({
            'is_active': True,
            'title': offer.title,
            'description': offer.description,
            'discount_text': offer.discount_text,
            'free_downloads_allowed': offer.free_downloads_allowed,
            'ai_optimize_free': offer.ai_optimize_free,
        })
    except Offer.DoesNotExist:
        return Response({'is_active': False})


# ──────────────────────────────────────────────────────────────────────────────
# GEMINI AI OPTIMIZE
# ──────────────────────────────────────────────────────────────────────────────

api_key = os.getenv("GEMINI_API_KEY", "")


@api_view(['POST'])
def optimize_resume(request):
    """
    Takes the user's resume and JD, checks if free offer allows it or a valid
    transaction exists, then rewrites bullet points using Gemini.
    """
    try:
        data = request.data
        transaction_id = data.get('transaction_id')
        resume_data = data.get('resumeData', {})
        job_desc = data.get('jobDesc', '')

        # Check access: free offer OR valid transaction
        try:
            offer = Offer.objects.get(is_active=True)
            if offer.ai_optimize_free:
                access_granted = True
            else:
                access_granted = False
        except Offer.DoesNotExist:
            access_granted = False

        if not access_granted:
            if transaction_id:
                try:
                    txn = Transaction.objects.get(id=transaction_id)
                    if txn.status != 'captured':
                        return Response({'error': 'Payment not completed.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
                    access_granted = True
                except Transaction.DoesNotExist:
                    return Response({'error': 'Invalid transaction ID.'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'No active free offer. Payment required.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

        if not api_key:
            return Response({'error': 'Gemini API not configured on server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai_client = genai.Client(api_key=api_key)

        prompt = f"""
        You are an expert ATS Optimization tool.
        Here is the job description:
        {job_desc}

        Here is the user's current experience bullet points:
        {[exp.get('bullets', '') for exp in resume_data.get('experience', [])]}

        Rewrite these bullet points to better match the job description's keywords without making up false experience. Make them sound professional, action-oriented, and highlight the matching skills.
        Return the exact rewritten bullets in plain text, do NOT wrap in markdown or json. Use simple dashes or bullet points.
        """

        response = genai_client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )

        optimized_bullets = response.text
        return Response({'optimizedBullets': optimized_bullets}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
