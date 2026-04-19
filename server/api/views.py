from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django_ratelimit.decorators import ratelimit
from django.conf import settings
import logging
import os
from .models import Transaction, Offer, UserProfile, PromoCode
from google import genai


# ──────────────────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

@ratelimit(key='ip', rate='5/m', block=True)
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

    if len(password) < 8 or not any(char.isdigit() for char in password) or not any(char.isalpha() for char in password):
        return Response({'error': 'Password must be at least 8 characters and contain both letters and numbers.'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    token, _ = Token.objects.get_or_create(user=user)

    response = Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'plan': user.profile.plan,
            'downloads_used': user.profile.downloads_used,
        }
    }, status=status.HTTP_201_CREATED)
    response.set_cookie(
        'rf_session', token.key,
        max_age=86400,     # expires in exactly 24 hours
        httponly=True,
        secure=True,       # always secure (required for SameSite=None)
        samesite='None',   # must be None for cross-origin cookie sending
    )
    return response


@ratelimit(key='ip', rate='10/m', block=True)
@api_view(['POST'])
def login_view(request):
    """Login with email + password, returns token."""
    data = request.data
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = authenticate(username=email, password=password)
    if not user:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Rotate token on every login to prevent session fixation attacks.
    # Old tokens from previous sessions are invalidated immediately.
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    response = Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'plan': user.profile.plan if hasattr(user, 'profile') else 'free',
            'downloads_used': user.profile.downloads_used if hasattr(user, 'profile') else 0,
        }
    })
    response.set_cookie(
        'rf_session', token.key,
        max_age=86400,     # expires in exactly 24 hours
        httponly=True,
        secure=True,       # always secure (required for SameSite=None)
        samesite='None',   # must be None for cross-origin cookie sending
    )
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Delete auth token (logout)."""
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    response = Response({'message': 'Logged out successfully.'})
    response.delete_cookie('rf_session')
    return response


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
        'download_limit': 2,  # free plan limit exposed to frontend
        'ats_reports_used': user.profile.ats_reports_used if hasattr(user, 'profile') else 0,
        'ats_report_limit': 3,
    })


@ratelimit(key='user_or_ip', rate='20/m', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_download(request):
    """
    Called when a user downloads their resume as PDF.
    Checks the plan limit for free users, increments counter, and returns
    the updated usage so the frontend can keep the UI in sync.
    """
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile:
        return Response({'error': 'Profile not found.'}, status=status.HTTP_400_BAD_REQUEST)

    FREE_LIMIT = 2

    # Pro users have unlimited downloads — just acknowledge
    if profile.plan == 'pro':
        return Response({
            'allowed': True,
            'downloads_used': profile.downloads_used,
            'download_limit': None,  # unlimited
        })

    # Free users: enforce limit
    if profile.downloads_used >= FREE_LIMIT:
        return Response({
            'allowed': False,
            'downloads_used': profile.downloads_used,
            'download_limit': FREE_LIMIT,
            'error': f'You have used all {FREE_LIMIT} free downloads. Upgrade to Pro for unlimited PDF downloads.',
        }, status=status.HTTP_402_PAYMENT_REQUIRED)

    # Increment and save
    profile.downloads_used += 1
    profile.save()

    return Response({
        'allowed': True,
        'downloads_used': profile.downloads_used,
        'download_limit': FREE_LIMIT,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    Permanently deletes the authenticated user's account and ALL associated data.
    This satisfies the GDPR 'Right to Erasure' requirement.
    The user must confirm by sending { "confirm": true } in the request body.
    """
    confirm = request.data.get('confirm', False)
    if not confirm:
        return Response(
            {'error': 'Confirmation required. Send { "confirm": true } to permanently delete your account.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user

    # Delete the auth token first so the cookie becomes invalid immediately
    try:
        user.auth_token.delete()
    except Exception:
        pass

    # Deleting the User cascades to UserProfile, Resume, and Transaction
    # because all those models use on_delete=models.CASCADE
    user.delete()

    response = Response({'message': 'Account permanently deleted.'}, status=status.HTTP_200_OK)
    response.delete_cookie('rf_session')
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_plan(request):
    """Endpoint to upgrade a user to the 'pro' plan by verifying a transaction."""
    user = request.user
    transaction_id = request.data.get('transaction_id')
    
    if not transaction_id:
        return Response({'error': 'No transaction ID provided. Upgrades require valid payment verification.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        txn = Transaction.objects.get(id=transaction_id, user=user)
        if txn.status != 'captured':
            return Response({'error': 'Payment not completed.'}, status=status.HTTP_402_PAYMENT_REQUIRED)
            
        if hasattr(user, 'profile'):
            user.profile.plan = 'pro'
            user.profile.save()
            return Response({
                'message': 'Successfully upgraded to Pro',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.email,
                    'plan': 'pro',
                    'downloads_used': user.profile.downloads_used,
                }
            })
    except Transaction.DoesNotExist:
        return Response({'error': 'Invalid transaction.'}, status=status.HTTP_404_NOT_FOUND)
        
    return Response({'error': 'Profile not found.'}, status=status.HTTP_400_BAD_REQUEST)


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


@ratelimit(key='user_or_ip', rate='10/m', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
                    # SECURITY: Always filter by request.user to prevent IDOR —
                    # a user must own the transaction they're redeeming.
                    txn = Transaction.objects.get(id=transaction_id, user=request.user)
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
        logging.error(f"optimize_resume error: {e}", exc_info=True)
        return Response({'error': 'An internal error occurred while optimizing. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@ratelimit(key='user_or_ip', rate='10/m', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_resume(request):
    """
    Takes extracted resume text and uses Gemini to parse it into a structured JSON
    format that matches the frontend's initData schema.
    """
    try:
        data = request.data
        resume_text = data.get('text', '')

        if not resume_text or len(resume_text.strip()) < 50:
            return Response({'error': 'Resume text is too short or empty.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if len(resume_text) > 20000:
            return Response({'error': 'Resume text is too large to process. Please reduce the size.'}, status=status.HTTP_400_BAD_REQUEST)

        if not api_key:
            return Response({'error': 'Gemini API not configured on server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        genai_client = genai.Client(api_key=api_key)

        prompt = f"""
        You are an expert resume parser. I will provide you with the raw text extracted from a resume.
        Your task is to parse this information into a highly structured JSON format.
        
        Extract as much information as possible.
        If a field is not found in the resume, leave it as an empty string (or empty array).
        Do not make up information.
        
        The JSON MUST perfectly match this exact schema:
        {{
          "personal": {{ "firstName": "", "lastName": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "", "github": "" }},
          "summary": "",
          "experience": [{{ "id": 1, "jobTitle": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "bullets": "" }}],
          "education": [{{ "id": 1, "degree": "", "field": "", "school": "", "location": "", "startDate": "", "endDate": "", "gpa": "", "honors": "" }}],
          "skills": [{{ "id": 1, "category": "Technical Skills", "skills": [] }}],
          "projects": [{{ "id": 1, "name": "", "tech": "", "link": "", "desc": "" }}],
          "certifications": [{{ "id": 1, "name": "", "issuer": "", "date": "", "expiry": "" }}],
          "languages": [{{ "id": 1, "language": "", "proficiency": "Fluent" }}]
        }}
        
        Important formatting rules for the JSON:
        - "experience.bullets" should be a single string containing the job description/bullets. If there are multiple bullets, join them with a newline block or space.
        - Date formats can be kept as they are found (e.g. "Jan 2020", "2021").
        - For "skills", you can group them under different categories if applicable, or just put them all under "Technical Skills". "skills" array must be an array of strings.
        - Ensure IDs are unique sequential integers starting from 1 for each array.
        - Return ONLY the valid JSON object, without markdown formatting or code blocks.
        
        Here is the raw resume text:
        ---
        {resume_text}
        """

        response = genai_client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )

        parsed_json_str = response.text
        # Clean up if Gemini returns markdown block
        if parsed_json_str.startswith('```json'):
            parsed_json_str = parsed_json_str[7:]
        if parsed_json_str.startswith('```'):
            parsed_json_str = parsed_json_str[3:]
        if parsed_json_str.endswith('```'):
            parsed_json_str = parsed_json_str[:-3]
            
        import json
        parsed_data = json.loads(parsed_json_str.strip())

        return Response(parsed_data, status=status.HTTP_200_OK)

    except Exception as e:
        logging.error(f"parse_resume error: {e}", exc_info=True)
        return Response({'error': 'An internal error occurred while parsing. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_promo_code(request):
    """Apply a promo code for 100% off (direct Pro upgrade) or valid discount."""
    code = request.data.get('code', '').strip().upper()
    if not code:
        return Response({'error': 'No promo code provided.'}, status=400)

    try:
        promo = PromoCode.objects.get(code=code)
    except PromoCode.DoesNotExist:
        return Response({'error': 'Invalid promo code.'}, status=400)

    if not promo.is_valid():
        return Response({'error': 'This promo code is inactive or has reached its usage limit.'}, status=400)

    user = request.user

    # If it's a 100% free promo code, upgrade them instantly
    if promo.discount_percentage == 100:
        if hasattr(user, 'profile'):
            user.profile.plan = 'pro'
            user.profile.save()
            promo.times_used += 1
            promo.save()
            return Response({
                'message': 'Promo code applied! You have been upgraded to Pro for free.',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'plan': 'pro',
                    'downloads_used': user.profile.downloads_used,
                }
            })
    
    # If it's a discount percentage
    return Response({
        'message': 'Promo code applied successfully!',
        'discount_percentage': promo.discount_percentage
    })

# run_setup endpoint has been removed for security.
# Use: python manage.py migrate && python manage.py createsuperuser
# or set DJANGO_SUPERUSER_* env vars with manage.py createsuperuser --no-input

@ratelimit(key='user_or_ip', rate='20/m', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_ats(request):
    """
    Called when a user views their ATS report.
    Free users get 3 views.
    """
    user = request.user
    profile = getattr(user, 'profile', None)
    if not profile:
        return Response({'error': 'Profile not found.'}, status=status.HTTP_400_BAD_REQUEST)

    limit = 3

    if profile.plan == 'pro':
        return Response({
            'allowed': True,
            'ats_reports_used': profile.ats_reports_used,
            'ats_report_limit': None
        })

    if profile.ats_reports_used >= limit:
        return Response({
            'allowed': False,
            'ats_reports_used': profile.ats_reports_used,
            'ats_report_limit': limit,
            'error': f'You have used all {limit} free ATS reports. Upgrade to Pro for unlimited reports.',
        }, status=status.HTTP_402_PAYMENT_REQUIRED)

    profile.ats_reports_used += 1
    profile.save()

    return Response({
        'allowed': True,
        'ats_reports_used': profile.ats_reports_used,
        'ats_report_limit': limit,
    })
