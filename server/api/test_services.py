import re
import json
from datetime import timedelta
from unittest.mock import patch, Mock
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import PasswordRecovery, WorkspaceSettings
from .test_workspace import resume_data


@override_settings(RECOVERY_EMAIL_ENABLED=True, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RecoveryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user=User.objects.create_user('recovery-admin',email='recovery@example.com',password='PreviousPassword!2026',is_staff=True)
        self.client=APIClient()

    def request_code(self):
        result=self.client.post('/api/auth/recovery/request/',{'email':self.user.email},format='json')
        self.assertEqual(result.status_code,200)
        code=re.search(r'code is (\d{6})',mail.outbox[-1].body).group(1)
        return result.data['challenge'],code

    def test_verified_reset_is_one_use_and_revokes_tokens(self):
        token=Token.objects.create(user=self.user)
        challenge,code=self.request_code()
        row=PasswordRecovery.objects.get(pk=challenge)
        self.assertNotEqual(row.code_hash,code)
        verified=self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':code},format='json')
        self.assertEqual(verified.status_code,200)
        body={'challenge':challenge,'reset_token':verified.data['reset_token'],'password':'NewSecurePassword!2026'}
        self.assertEqual(self.client.post('/api/auth/recovery/reset/',body,format='json').status_code,200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(body['password']))
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())
        self.assertEqual(self.client.post('/api/auth/recovery/reset/',body,format='json').status_code,400)

    def test_expiry_guess_limit_and_code_replacement(self):
        challenge,code=self.request_code()
        for _ in range(5):
            self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':'wrong'},format='json').status_code,400)
        self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':code},format='json').status_code,400)
        challenge,code=self.request_code()
        PasswordRecovery.objects.filter(pk=challenge).update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':code},format='json').status_code,400)

    def test_no_account_disclosure_or_code_in_response(self):
        challenge,code=self.request_code()
        unknown=self.client.post('/api/auth/recovery/request/',{'email':'unknown@example.com'},format='json')
        self.assertEqual(unknown.status_code,200)
        self.assertNotIn('code',unknown.data)
        self.assertEqual(len(mail.outbox),1)
        self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':unknown.data['challenge'],'code':code},format='json').status_code,400)

    def test_new_code_invalidates_previous_code_and_four_errors_allow_last_guess(self):
        old_challenge,old_code=self.request_code()
        challenge,code=self.request_code()
        self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':old_challenge,'code':old_code},format='json').status_code,400)
        for _ in range(4):
            self.assertEqual(self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':'wrong'},format='json').status_code,400)
        verified=self.client.post('/api/auth/recovery/verify/',{'challenge':challenge,'code':code},format='json')
        self.assertEqual(verified.status_code,200)
        self.assertEqual(self.client.post('/api/auth/recovery/reset/',{'challenge':challenge,'reset_token':verified.data['reset_token'],'password':'NewSecurePassword!2026'},format='json').status_code,200)

    def test_email_failure_does_not_leave_usable_challenge(self):
        with patch('api.recovery.send_mail',side_effect=RuntimeError('Delivery unavailable')):
            response=self.client.post('/api/auth/recovery/request/',{'email':self.user.email},format='json')
        self.assertEqual(response.status_code,200)
        self.assertTrue(PasswordRecovery.objects.get(pk=response.data['challenge']).consumed)

    @override_settings(RECOVERY_EMAIL_ENABLED=False)
    def test_missing_smtp_and_admin_recovery_link(self):
        self.assertEqual(self.client.post('/api/auth/recovery/request/',{'email':self.user.email},format='json').status_code,503)
        self.assertContains(self.client.get('/admin/login/'),'Forgot password?')
        self.assertContains(self.client.get('/admin/password-recovery/'),'Six-digit verification code')


class AITests(TestCase):
    @patch.dict('os.environ',{'RAZORPAY_KEY_ID':'private-id','RAZORPAY_KEY_SECRET':'private-secret','RAZORPAY_WEBHOOK_SECRET':'','LLM_API_KEY':''})
    def test_admin_readiness_does_not_expose_secrets(self):
        from .integrations import integration_readiness
        from .admin import WorkspaceSettingsAdmin
        from django.contrib import admin
        statuses=integration_readiness()
        self.assertFalse(statuses[0][1])
        html=str(WorkspaceSettingsAdmin(WorkspaceSettings,admin.site).integration_status(None))
        self.assertIn('RAZORPAY_WEBHOOK_SECRET',html)
        self.assertNotIn('private-id',html)
        self.assertNotIn('private-secret',html)

    def setUp(self):
        cache.clear()
        self.user=User.objects.create_user('writer',email='writer@example.com')
        self.user.profile.plan='pro';self.user.profile.save()
        self.client=APIClient();self.client.force_authenticate(self.user)

    @patch('api.ai.complete_json')
    @patch.dict('os.environ',{'LLM_API_KEY':'test-key'})
    def test_resume_tasks_and_validation(self,complete):
        for task,result in [('summary',{'summary':'Early-career designer with project experience.'}),('experience',{'bullets':'Built a prototype from supplied project facts.'}),('skills',{'skills':['User research','Accessibility']}),('resume_review',{'recommendations':['Add evidence for your project.']})]:
            complete.return_value=result
            response=self.client.post('/api/workspace/assist/',{'task':task,'resume':resume_data(),'experience_index':0},format='json')
            if task=='experience':
                self.assertEqual(response.status_code,400)
                data=resume_data();data['experience']=[{'jobTitle':'Designer','bullets':'Built a prototype.'}]
                response=self.client.post('/api/workspace/assist/',{'task':task,'resume':data,'experience_index':0},format='json')
            self.assertEqual(response.status_code,200)
            self.assertEqual(response.data,result)
        complete.return_value={'skills':'not a list'}
        self.assertEqual(self.client.post('/api/workspace/assist/',{'task':'skills','resume':resume_data()},format='json').status_code,502)

    def test_gating_missing_credentials_and_no_url_scraping(self):
        self.user.profile.plan='starter';self.user.profile.save()
        self.assertEqual(self.client.post('/api/workspace/assist/',{'task':'summary','resume':resume_data()},format='json').status_code,403)
        self.user.profile.plan='pro';self.user.profile.save()
        with patch.dict('os.environ',{'LLM_API_KEY':'','LINKEDIN_PROFILE_API_URL':'','LINKEDIN_PROFILE_API_KEY':''}):
            self.assertEqual(self.client.post('/api/workspace/assist/',{'task':'summary','resume':resume_data()},format='json').status_code,503)
            self.assertEqual(self.client.post('/api/workspace/linkedin/import/',{'url':'https://www.linkedin.com/in/example'},format='json').status_code,503)
        for url in ['http://127.0.0.1/admin','https://linkedin.com.evil.test/in/example','https://www.linkedin.com:443/in/example']:
            self.assertEqual(self.client.post('/api/workspace/linkedin/import/',{'url':url},format='json').status_code,400)

    @patch('api.ai.complete_json',return_value={'letter':'Dear hiring team, I bring relevant project experience.'})
    @patch.dict('os.environ',{'LLM_API_KEY':'test-key'})
    def test_cover_letter_uses_uploaded_resume_text(self,complete):
        response=self.client.post('/api/workspace/generate/',{'task':'cover','resume':resume_data(),'context':'Designer at Example','source_text':'Uploaded resume source with project facts.'},format='json')
        self.assertEqual(response.status_code,200)
        self.assertEqual(complete.call_args.args[1]['source_text'],'Uploaded resume source with project facts.')

    @patch('api.ai.complete_json',return_value={'recommendations':['Make your headline more specific.']})
    @patch.dict('os.environ',{'LLM_API_KEY':'test-key'})
    def test_linkedin_review_requires_actual_source(self,complete):
        body={'task':'linkedin_review','resume':resume_data(),'profile_url':'https://www.linkedin.com/in/example'}
        self.assertEqual(self.client.post('/api/workspace/assist/',body,format='json').status_code,400)
        body['source_text']='My current headline and experience text.'
        self.assertEqual(self.client.post('/api/workspace/assist/',body,format='json').status_code,200)

    def test_admin_model_and_endpoint_override(self):
        from .ai import client_config
        WorkspaceSettings.objects.create(ai_model='custom-model',ai_base_url='https://provider.example/v1')
        cfg=client_config()
        self.assertEqual(cfg['model'],'custom-model')
        self.assertEqual(cfg['base_url'],'https://provider.example/v1')

    @patch.dict('os.environ',{'LINKEDIN_PROFILE_API_URL':'https://provider.example/profile','LINKEDIN_PROFILE_API_KEY':'provider-key'})
    @patch('requests.post')
    def test_connected_profile_provider_contract(self,post):
        response=Mock(status_code=200)
        response.iter_content.return_value=[json.dumps({'profile_text':'Existing headline, about section and experience.'}).encode()]
        post.return_value=response
        result=self.client.post('/api/workspace/linkedin/import/',{'url':'https://www.linkedin.com/in/example?tracking=1'},format='json')
        self.assertEqual(result.status_code,200)
        self.assertIn('Existing headline',result.data['profile_text'])
        self.assertEqual(post.call_args.args[0],'https://provider.example/profile')
        self.assertEqual(post.call_args.kwargs['json'],{'url':'https://www.linkedin.com/in/example'})
        self.assertFalse(post.call_args.kwargs['allow_redirects'])
