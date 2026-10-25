import json
import logging
import os
import uuid

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .models import Resume, WorkspaceDocument, WorkspaceSettings, TutorialVideo, Transaction, Offer

TEMPLATES = ['classic', 'modern', 'minimal', 'professional', 'executive', 'creative', 'tech', 'startup', 'elegant', 'folio', 'atlas', 'meridian', 'ledger', 'nordic', 'column', 'editorial', 'horizon', 'architect', 'scholar', 'contour', 'perspective', 'studio', 'precise', 'signature', 'civic', 'lattice', 'framework', 'terrace', 'summit', 'outline', 'journal', 'gridline', 'monograph', 'balance', 'crest', 'notebook', 'orbit', 'linear', 'beacon', 'mosaic', 'keystone', 'slate', 'canvas', 'vertex', 'portrait', 'anchor', 'interval', 'ribbon', 'milestone', 'journey']


class WritingThrottle(UserRateThrottle):
    rate = '10/hour'
    scope = 'workspace_writing'


class CheckoutThrottle(UserRateThrottle):
    rate = '10/minute'
    scope = 'workspace_checkout'


def config():
    return WorkspaceSettings.objects.order_by('pk').first() or WorkspaceSettings()


def download_limit():
    return config().starter_download_limit


def validate_resume(value):
    if not isinstance(value, dict) or len(json.dumps(value)) > 150000:
        raise serializers.ValidationError('Resume must be an object smaller than 150 KB.')
    personal = value.get('personal')
    if not isinstance(personal, dict) or not all(isinstance(v, str) for v in personal.values()):
        raise serializers.ValidationError('Personal details must be text fields.')
    if not isinstance(value.get('summary', ''), str):
        raise serializers.ValidationError('Summary must be text.')
    for key in ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'custom']:
        rows = value.get(key)
        if not isinstance(rows, list) or len(rows) > 100 or not all(isinstance(row, dict) for row in rows):
            raise serializers.ValidationError(f'{key} must contain a list of entries.')
        for row in rows:
            if key == 'skills' and (not isinstance(row.get('skills', []), list) or not all(isinstance(s, str) for s in row.get('skills', []))):
                raise serializers.ValidationError('Skills must be a list of text values.')
            if any(not isinstance(v, (str, int, float, bool, list)) for v in row.values()):
                raise serializers.ValidationError('Resume entries contain unsupported values.')
    return value


class ResumeSerializer(serializers.ModelSerializer):
    template = serializers.ChoiceField(choices=TEMPLATES)
    content_json = serializers.JSONField(validators=[validate_resume])

    class Meta:
        model = Resume
        fields = ['id', 'title', 'template', 'content_json', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentSerializer(serializers.ModelSerializer):
    def validate_content(self, value):
        if not isinstance(value, dict) or len(json.dumps(value)) > 100000 or not all(isinstance(v, str) for v in value.values()):
            raise serializers.ValidationError('Document content must contain text fields smaller than 100 KB.')
        return value

    class Meta:
        model = WorkspaceDocument
        fields = ['id', 'kind', 'title', 'content', 'updated_at']
        read_only_fields = ['id', 'updated_at']


@api_view(['GET'])
def public_config(request):
    cfg = config()
    return Response({key: getattr(cfg, key) for key in [
        'dashboard_title', 'dashboard_description', 'announcement',
        'starter_price', 'pro_price',
        'starter_resume_limit', 'pro_resume_limit',
        'starter_ats_limit', 'starter_download_limit',
        'resume_enabled', 'linkedin_enabled', 'cover_enabled', 'learning_enabled',
        'ai_enabled', 'support_email'
    ]} | {
        'payments_enabled': cfg.payments_enabled and bool(os.getenv('RAZORPAY_KEY_ID') and os.getenv('RAZORPAY_KEY_SECRET')),
    })


@api_view(['GET'])
def tutorials(request):
    if not config().learning_enabled:
        return Response([])
    rows = TutorialVideo.objects.filter(is_active=True)
    if request.query_params.get('section'):
        rows = rows.filter(section=request.query_params['section'])
    return Response(list(rows.values('id', 'title', 'section', 'description', 'youtube_url', 'material_url', 'written_content', 'duration')))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def resumes(request):
    if request.method == 'GET':
        return Response(ResumeSerializer(Resume.objects.filter(user=request.user).order_by('-updated_at'), many=True).data)
    if not config().resume_enabled:
        return Response({'error': 'Resume editing is temporarily disabled by the administrator.'}, status=403)
    with transaction.atomic():
        # Lock the account before counting to enforce limits on concurrent saves.
        profile = type(request.user.profile).objects.select_for_update().get(user=request.user)
        if profile.plan not in ('starter', 'pro'):
            return Response({'error': 'Choose Basic or Pro to save your resume.'}, status=402)
        cfg = config()
        limit = cfg.pro_resume_limit if profile.plan == 'pro' else cfg.starter_resume_limit if profile.plan == 'starter' else cfg.free_resume_limit
        if Resume.objects.filter(user=request.user).count() >= limit:
            return Response({'error': 'Your saved resume limit is reached. Update an existing resume or manage your plan.'}, status=403)
        serializer = ResumeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
    return Response(serializer.data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def resume_detail(request, pk):
    row = get_object_or_404(Resume, pk=pk, user=request.user)
    if request.method == 'DELETE':
        row.delete()
        return Response(status=204)
    serializer = ResumeSerializer(row, data=request.data, partial=True) if request.method == 'PATCH' else ResumeSerializer(row)
    if request.method == 'PATCH':
        if not config().resume_enabled:
            return Response({'error': 'Resume editing is temporarily disabled.'}, status=403)
        if request.user.profile.plan not in ('starter', 'pro'):
            return Response({'error': 'Choose Basic or Pro to save changes.'}, status=402)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents(request):
    if request.method == 'GET':
        return Response(DocumentSerializer(WorkspaceDocument.objects.filter(user=request.user).order_by('-updated_at'), many=True).data)
    kind = request.data.get('kind')
    cfg = config()
    if (kind == 'linkedin' and not cfg.linkedin_enabled) or (kind == 'cover' and not cfg.cover_enabled):
        return Response({'error': 'This writing service is temporarily disabled.'}, status=403)
    if request.user.profile.plan != 'pro':
        return Response({'error': 'Writing services require Pro.'}, status=403)
    if WorkspaceDocument.objects.filter(user=request.user).count() >= 100:
        return Response({'error': 'Document limit reached. Delete an older draft first.'}, status=403)
    if request.data.get('kind') == 'linkedin' and getattr(request.user, 'profile', None) and request.user.profile.plan != 'pro':
        return Response({'error': 'LinkedIn Studio is exclusively available on the ₹499 Pro plan.'}, status=403)
    serializer = DocumentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)
    return Response(serializer.data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def document_detail(request, pk):
    get_object_or_404(WorkspaceDocument, pk=pk, user=request.user).delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([WritingThrottle])
def generate(request):
    cfg = config()
    if not cfg.ai_enabled:
        return Response({'error': 'AI assistance is currently disabled by the administrator.'}, status=403)
    if request.user.profile.plan != 'pro':
        return Response({'error': 'AI assistance is exclusively available on the ₹499 Pro plan.'}, status=403)
    task = request.data.get('task')
    if (task == 'linkedin' and not cfg.linkedin_enabled) or (task == 'cover' and not cfg.cover_enabled):
        return Response({'error': 'This writing service is temporarily disabled.'}, status=403)
    if task not in ('linkedin', 'cover'):
        return Response({'error': 'Choose a supported writing task.'}, status=400)
    if task == 'linkedin' and request.user.profile.plan != 'pro':
        return Response({'error': 'LinkedIn Studio is exclusively available on the ₹499 Pro plan.'}, status=403)
    resume = request.data.get('resume')
    try:
        validate_resume(resume)
    except serializers.ValidationError as exc:
        return Response({'error': str(exc.detail)}, status=400)
    context = request.data.get('context', '')
    if not isinstance(context, str) or len(context) > 12000:
        return Response({'error': 'Context must be text under 12,000 characters.'}, status=400)
    source_text = request.data.get('source_text', '')
    if not isinstance(source_text, str) or len(source_text)>20000:
        return Response({'error': 'Source text must be under 20,000 characters.'},status=400)
    key = os.getenv('LLM_API_KEY')
    if not key:
        return Response({'error': 'AI writing is not configured yet. You can edit and save your draft manually.'}, status=503)
    from .ai import complete_json
    fields = 'headline, about, experience' if task == 'linkedin' else 'letter'
    try:
        content = complete_json(f'Write a {task} draft using only supplied facts. Return text fields: {fields}. For cover letters, tailor to the supplied role and company; mark missing details as placeholders.', {'resume':resume,'context':context,'source_text':source_text})
        required = ['headline', 'about', 'experience'] if task == 'linkedin' else ['letter']
        if not isinstance(content, dict) or any(not isinstance(content.get(k), str) for k in required):
            raise ValueError('Invalid model output')
        return Response({k: content[k][:20000] for k in required})
    except Exception:
        logging.getLogger(__name__).exception('Workspace AI generation failed')
        return Response({'error': 'Writing assistance is temporarily unavailable. Your existing draft is unchanged.'}, status=502)


def payment_client():
    import razorpay
    import requests
    class CheckoutSession(requests.Session):
        def request(self, method, url, **kwargs):
            kwargs.setdefault('timeout', (5, 20))
            return super().request(method, url, **kwargs)
    return razorpay.Client(session=CheckoutSession(), auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CheckoutThrottle])
def payment_order(request):
    cfg = config()
    if not cfg.payments_enabled or not os.getenv('RAZORPAY_KEY_ID') or not os.getenv('RAZORPAY_KEY_SECRET'):
        return Response({'error': 'Online checkout is not enabled yet.'}, status=503)
    target_plan = request.data.get('plan', 'pro')
    if target_plan not in ('starter', 'pro'):
        return Response({'error': 'Choose Basic or Pro.'}, status=400)
    if request.user.profile.plan == 'pro':
        return Response({'error': 'Your account already has Pro.'}, status=400)
    if request.user.profile.plan == 'starter' and target_plan == 'starter':
        return Response({'error': 'Your account already has the Starter plan. You can upgrade to Pro.'}, status=400)
    price = cfg.starter_price if target_plan == 'starter' else cfg.pro_price
    if price < 1:
        return Response({'error': 'Checkout pricing is not configured.'}, status=503)
    try:
        order = payment_client().order.create({'amount': price * 100, 'currency': 'INR', 'receipt': f'rc-{request.user.pk}-{uuid.uuid4().hex[:16]}'})
        Transaction.objects.create(user=request.user, amount=price, currency='INR', razorpay_order_id=order['id'], plan=target_plan)
        return Response({'order_id': order['id'], 'amount': price * 100, 'currency': 'INR', 'key': os.environ['RAZORPAY_KEY_ID'], 'plan': target_plan})
    except Exception:
        logging.getLogger(__name__).exception('Checkout creation failed')
        return Response({'error': 'Checkout is temporarily unavailable.'}, status=502)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_verify(request):
    required = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
    if any(not isinstance(request.data.get(k), str) or len(request.data[k]) > 255 for k in required):
        return Response({'error': 'Payment verification fields are required.'}, status=400)
    row = get_object_or_404(Transaction, user=request.user, razorpay_order_id=request.data['razorpay_order_id'])
    try:
        client = payment_client()
        client.utility.verify_payment_signature({**{k: request.data[k] for k in required}, 'razorpay_order_id': row.razorpay_order_id})
        payment = client.payment.fetch(request.data['razorpay_payment_id'])
        if payment.get('status') != 'captured' or payment.get('order_id') != row.razorpay_order_id or payment.get('amount') != int(row.amount * 100) or payment.get('currency') != row.currency:
            return Response({'error': 'Payment is not captured or does not match this order. Contact support if you were charged.'}, status=409)
        with transaction.atomic():
            row = Transaction.objects.select_for_update().get(pk=row.pk)
            row.status = 'captured'
            row.razorpay_payment_id = request.data['razorpay_payment_id']
            row.razorpay_signature = request.data['razorpay_signature']
            row.save()
            target_plan = row.plan
            profile = type(request.user.profile).objects.select_for_update().get(user=request.user)
            if profile.plan != 'pro':
                profile.plan = target_plan
            profile.save(update_fields=['plan'])
        return Response({'verified': True, 'plan': target_plan})
    except Exception:
        logging.getLogger(__name__).exception('Payment verification failed')
        return Response({'error': 'Payment could not be verified. Contact support if you were charged.'}, status=400)


@api_view(['POST'])
@authentication_classes([])
def payment_webhook(request):
    import hashlib
    import hmac
    secret = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
    if not secret:
        return Response(status=503)
    expected = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get('X-Razorpay-Signature', '')):
        return Response(status=400)
    try:
        event = json.loads(request.body)
        if event.get('event') != 'payment.captured':
            return Response({'received': True})
        payment = event['payload']['payment']['entity']
        with transaction.atomic():
            row = Transaction.objects.select_for_update().filter(razorpay_order_id=payment.get('order_id')).first()
            if not row:
                return Response({'received': True})
            if payment.get('status') != 'captured' or payment.get('amount') != int(row.amount * 100) or payment.get('currency') != row.currency:
                return Response(status=400)
            row.status = 'captured'
            row.razorpay_payment_id = payment['id']
            row.save()
            if row.user:
                profile = type(row.user.profile).objects.select_for_update().get(user=row.user)
                if profile.plan != 'pro':
                    profile.plan = row.plan
                profile.save(update_fields=['plan'])
        return Response({'received': True})
    except (KeyError, TypeError, ValueError):
        return Response(status=400)
