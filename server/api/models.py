from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    PLAN_CHOICES = [('free', 'Free'), ('pro', 'Pro')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default='free')
    downloads_used = models.PositiveIntegerField(default=0)
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
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    content_json = models.JSONField(help_text="The resume data structure")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume {self.id} - {self.user.email if self.user else 'Anonymous'}"


class Transaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=50, default='pending',
        choices=(('pending', 'Pending'), ('captured', 'Captured'), ('failed', 'Failed')))
    razorpay_order_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transaction {self.id} - {self.amount} {self.currency} - {self.status}"
