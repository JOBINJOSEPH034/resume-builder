from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('starter', 'Starter'), ('pro', 'Pro')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    downloads_used = models.PositiveIntegerField(default=0)
    ats_reports_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.plan})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


class Offer(models.Model):
    title = models.CharField(max_length=200, default='Free Starter Offer')
    description = models.TextField(default='Get started for free — no payment needed!')
    discount_text = models.CharField(max_length=100, blank=True, default='100% Free')
    free_downloads_allowed = models.PositiveIntegerField(
        default=3,
        help_text='How many free PDF downloads each user gets while this offer is active'
    )
    ai_optimize_free = models.BooleanField(
        default=True,
        help_text='Allow free AI Optimize usage while this offer is active'
    )
    is_active = models.BooleanField(
        default=False,
        help_text='Only ONE offer should be active at a time. Toggle here.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Offer / Free Tier Config'
        verbose_name_plural = 'Offers / Free Tier Configs'

    def __str__(self):
        status = '✅ ACTIVE' if self.is_active else '⬜ inactive'
        return f"[{status}] {self.title}"

    def save(self, *args, **kwargs):
        # Ensure only one active offer at a time
        if self.is_active:
            Offer.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class PromoCode(models.Model):
    code = models.CharField(max_length=50, unique=True, help_text="e.g. FREEPRO100")
    discount_percentage = models.PositiveIntegerField(default=100, help_text="0 to 100")
    is_active = models.BooleanField(default=True)
    max_uses = models.PositiveIntegerField(default=100, help_text="How many times this code can be used.")
    times_used = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = '✅ ACTIVE' if self.is_active else '⬜ inactive'
        return f"[{status}] {self.code} ({self.discount_percentage}% off)"

    def is_valid(self):
        return self.is_active and self.times_used < self.max_uses



class Resume(models.Model):
    title = models.CharField(max_length=160, default='My resume')
    template = models.CharField(max_length=30, default='classic')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    content_json = models.JSONField(help_text="The resume data structure")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume {self.id} - {self.user.email if self.user else 'Anonymous'}"


class WorkspaceDocument(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    kind = models.CharField(max_length=20, choices=[('linkedin', 'LinkedIn profile'), ('cover', 'Cover letter')])
    title = models.CharField(max_length=160)
    content = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class TutorialVideo(models.Model):
    title = models.CharField(max_length=180)
    section = models.CharField(max_length=20, choices=[('resume', 'Resume Studio'), ('linkedin', 'LinkedIn Studio'), ('cover', 'Cover Letters'), ('account', 'Account')])
    description = models.TextField(blank=True)
    youtube_url = models.URLField()
    duration = models.CharField(max_length=30, blank=True, help_text='For example: 6 min')
    position = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['position', 'id']

    def clean(self):
        from urllib.parse import urlparse
        from django.core.exceptions import ValidationError
        url = urlparse(self.youtube_url)
        if url.scheme != 'https' or url.hostname not in ('youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'):
            raise ValidationError({'youtube_url': 'Use an HTTPS YouTube video link.'})

    def __str__(self):
        return self.title


class WorkspaceSettings(models.Model):
    dashboard_title = models.CharField(max_length=180, default='Your next chapter starts here.')
    dashboard_description = models.TextField(default='A considered resume. A confident profile. Everything you need to introduce yourself well.')
    announcement = models.CharField(max_length=250, blank=True)
    starter_price = models.PositiveIntegerField(default=199, help_text='INR for Starter plan.')
    pro_price = models.PositiveIntegerField(default=499, help_text='INR for Pro plan.')
    starter_resume_limit = models.PositiveIntegerField(default=5)
    pro_resume_limit = models.PositiveIntegerField(default=50)
    starter_ats_limit = models.PositiveIntegerField(default=5)
    starter_download_limit = models.PositiveIntegerField(default=5)
    free_download_limit = models.PositiveIntegerField(default=2)
    free_ats_limit = models.PositiveIntegerField(default=3)
    free_resume_limit = models.PositiveIntegerField(default=5)
    payments_enabled = models.BooleanField(default=False)
    ai_enabled = models.BooleanField(default=True)
    support_email = models.EmailField(blank=True)

    class Meta:
        verbose_name_plural = 'Workspace settings'

    def __str__(self):
        return 'Ready Candidate workspace'


class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    plan = models.CharField(max_length=20, default='pro')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=50, default='pending',
        choices=(('pending', 'Pending'), ('captured', 'Captured'), ('failed', 'Failed')))
    razorpay_order_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.amount} {self.currency} ({self.plan}) - {self.status}"

