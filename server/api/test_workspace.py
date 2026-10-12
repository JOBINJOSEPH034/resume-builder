import hashlib
import hmac
import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import Resume, WorkspaceDocument, WorkspaceSettings, TutorialVideo, Transaction, Offer


def resume_data():
    return {'personal': {'firstName': 'Test', 'email': 'test@example.com'}, 'summary': '', **{key: [] for key in ['experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'custom']}}


class WorkspaceTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user('alice', email='alice@example.com', password='test-password-1')
        self.bob = User.objects.create_user('bob', email='bob@example.com', password='test-password-2')
        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def test_resume_crud_and_ownership(self):
        response = self.client.post('/api/resumes/', {'title': 'Design', 'template': 'classic', 'content_json': resume_data()}, format='json')
        self.assertEqual(response.status_code, 201)
        pk = response.data['id']
        self.assertEqual(self.client.patch(f'/api/resumes/{pk}/', {'title': 'Updated'}, format='json').status_code, 200)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get('/api/resumes/').data, [])
        for method in ['get', 'patch', 'delete']:
            self.assertEqual(getattr(self.client, method)(f'/api/resumes/{pk}/').status_code, 404)
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.delete(f'/api/resumes/{pk}/').status_code, 204)

    def test_invalid_resume_and_limits(self):
        self.assertEqual(self.client.post('/api/resumes/', {'title': 'Bad', 'template': 'unknown', 'content_json': []}, format='json').status_code, 400)
        WorkspaceSettings.objects.create(free_resume_limit=0)
        self.assertEqual(self.client.post('/api/resumes/', {'title': 'Test', 'template': 'classic', 'content_json': resume_data()}, format='json').status_code, 403)

    def test_private_documents_and_authentication(self):
        doc = WorkspaceDocument.objects.create(user=self.alice, title='Private', kind='cover', content={'letter': 'Private text'})
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.get('/api/documents/').data, [])
        self.assertEqual(self.client.delete(f'/api/documents/{doc.pk}/').status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/resumes/').status_code, 401)

    def test_cookie_writes_reject_untrusted_origins(self):
        self.client.force_authenticate(None)
        token, _ = Token.objects.get_or_create(user=self.alice)
        self.client.cookies['rf_session'] = token.key
        body = {'title': 'Test', 'template': 'classic', 'content_json': resume_data()}
        self.assertEqual(self.client.post('/api/resumes/', body, format='json', HTTP_ORIGIN='https://untrusted.vercel.app').status_code, 401)
        self.assertEqual(self.client.post('/api/resumes/', body, format='json', HTTP_ORIGIN='http://127.0.0.1:5175').status_code, 201)

    def test_login_rejects_untrusted_origins_without_a_cookie(self):
        self.client.force_authenticate(None)
        response = self.client.post('/api/auth/login/', {'email': 'alice@example.com', 'password': 'test-password-1'}, format='json', HTTP_ORIGIN='https://untrusted.vercel.app')
        self.assertEqual(response.status_code, 401)
        self.assertIn('Untrusted', str(response.data['detail']))

    def test_admin_quotas_are_enforced(self):
        WorkspaceSettings.objects.create(free_download_limit=0, free_ats_limit=0)
        self.assertEqual(self.client.post('/api/track-download/').status_code, 402)
        self.assertEqual(self.client.post('/api/track-ats/').status_code, 402)

    def test_active_offer_controls_the_download_limit(self):
        WorkspaceSettings.objects.create(free_download_limit=0)
        Offer.objects.create(is_active=True, free_downloads_allowed=7)
        self.assertEqual(self.client.get('/api/workspace/config/').data['free_download_limit'], 7)
        self.assertEqual(self.client.post('/api/track-download/').data['download_limit'], 7)

    def test_tutorial_validation_and_publication(self):
        bad = TutorialVideo(title='Bad', section='resume', youtube_url='https://example.com/video')
        with self.assertRaises(ValidationError):
            bad.full_clean()
        TutorialVideo.objects.create(title='Live', section='resume', youtube_url='https://youtu.be/example')
        TutorialVideo.objects.create(title='Draft', section='resume', youtube_url='https://youtu.be/example', is_active=False)
        self.assertEqual([row['title'] for row in self.client.get('/api/tutorials/').data], ['Live'])

    def test_config_does_not_expose_payment_credentials(self):
        WorkspaceSettings.objects.create(payments_enabled=True, free_resume_limit=7)
        with patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'private-id', 'RAZORPAY_KEY_SECRET': 'secret'}):
            response = self.client.get('/api/workspace/config/')
        self.assertEqual(response.data['free_resume_limit'], 7)
        self.assertNotIn('secret', json.dumps(response.data))
        self.assertTrue(response.data['payments_enabled'])

    @patch('api.workspace.payment_client')
    def test_checkout_uses_server_price_and_unique_receipts(self, client):
        WorkspaceSettings.objects.create(payments_enabled=True, pro_price=499)
        client.return_value.order.create.return_value = {'id': 'order_server'}
        with patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'key', 'RAZORPAY_KEY_SECRET': 'secret'}):
            response = self.client.post('/api/payments/orders/', {'amount': 1, 'currency': 'USD'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['amount'], 49900)
        self.assertEqual(response.data['currency'], 'INR')
        order = client.return_value.order.create.call_args.args[0]
        self.assertTrue(order['receipt'].startswith(f'rc-{self.alice.pk}-'))
        self.assertLessEqual(len(order['receipt']), 40)
        self.assertEqual(Transaction.objects.get(razorpay_order_id='order_server').user, self.alice)

    @patch('api.workspace.payment_client')
    def test_payment_verification_checks_amount_and_owner(self, client):
        row = Transaction.objects.create(user=self.alice, amount=499, currency='INR', razorpay_order_id='order_test')
        payload = {'razorpay_order_id': row.razorpay_order_id, 'razorpay_payment_id': 'pay_test', 'razorpay_signature': 'signature'}
        client.return_value.payment.fetch.return_value = {'status': 'captured', 'order_id': row.razorpay_order_id, 'amount': 1, 'currency': 'INR'}
        self.assertEqual(self.client.post('/api/payments/verify/', payload, format='json').status_code, 409)
        self.alice.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.plan, 'free')
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.post('/api/payments/verify/', payload, format='json').status_code, 404)
        self.client.force_authenticate(self.alice)
        client.return_value.payment.fetch.return_value['amount'] = 49900
        self.assertEqual(self.client.post('/api/payments/verify/', payload, format='json').status_code, 200)
        self.alice.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.plan, 'pro')

    def test_signed_webhook_is_idempotent(self):
        Transaction.objects.create(user=self.alice, amount=499, currency='INR', razorpay_order_id='order_test')
        body = json.dumps({'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_test', 'order_id': 'order_test', 'status': 'captured', 'amount': 49900, 'currency': 'INR'}}}})
        signature = hmac.new(b'test-secret', body.encode(), hashlib.sha256).hexdigest()
        self.client.force_authenticate(None)
        with patch.dict('os.environ', {'RAZORPAY_WEBHOOK_SECRET': 'test-secret'}):
            self.assertEqual(self.client.post('/api/payments/webhook/', body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE='wrong').status_code, 400)
            for _ in range(2):
                self.assertEqual(self.client.post('/api/payments/webhook/', body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=signature, HTTP_ORIGIN='https://api.razorpay.com').status_code, 200)
        self.alice.profile.refresh_from_db()
        self.assertEqual(self.alice.profile.plan, 'pro')

    @patch('api.workspace.payment_client')
    def test_starter_plan_and_feature_gating(self, client):
        WorkspaceSettings.objects.create(payments_enabled=True, starter_price=199, pro_price=499, starter_resume_limit=5)
        # Test starter order creation
        client.return_value.order.create.return_value = {'id': 'order_starter'}
        with patch.dict('os.environ', {'RAZORPAY_KEY_ID': 'key', 'RAZORPAY_KEY_SECRET': 'secret'}):
            response = self.client.post('/api/payments/orders/', {'plan': 'starter'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['amount'], 19900)
        self.assertEqual(response.data['plan'], 'starter')

        # Test LinkedIn document restriction for starter plan
        self.alice.profile.plan = 'starter'
        self.alice.profile.save()
        linkedin_doc = self.client.post('/api/documents/', {'title': 'Profile', 'kind': 'linkedin', 'content': {'headline': 'Designer'}}, format='json')
        self.assertEqual(linkedin_doc.status_code, 403)

        # Test Cover letter document allowed for starter plan
        cover_doc = self.client.post('/api/documents/', {'title': 'Letter', 'kind': 'cover', 'content': {'letter': 'Hello'}}, format='json')
        self.assertEqual(cover_doc.status_code, 201)

        # Test AI optimize restriction for starter plan
        opt_res = self.client.post('/api/optimize/', {'resumeData': resume_data(), 'jobDesc': 'Software Engineer'}, format='json')
        self.assertEqual(opt_res.status_code, 403)

