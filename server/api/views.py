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
from .models import Transaction, Offer, UserProfile
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
    response.set_cookie('rf_session', token.key, httponly=True, secure=not settings.DEBUG, samesite='Lax')
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

    token, _ = Token.objects.get_or_create(user=user)

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
    response.set_cookie('rf_session', token.key, httponly=True, secure=not settings.DEBUG, samesite='Lax')
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
    })


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
        logging.error(f"optimize_resume error: {e}", exc_info=True)
        return Response({'error': 'An internal error occurred while optimizing. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
