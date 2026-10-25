import os
from django.conf import settings


def integration_readiness():
    """Configuration checks only; do not contact providers or reveal secret values."""
    groups = [
        ('Razorpay checkout', ('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET')),
        ('AI assistance', ('LLM_API_KEY',)),
        ('LinkedIn URL import', ('LINKEDIN_PROFILE_API_URL', 'LINKEDIN_PROFILE_API_KEY')),
    ]
    result = []
    for label, names in groups:
        missing = [name for name in names if not os.getenv(name)]
        result.append((label, not missing, 'Configured; live testing required.' if not missing else 'Missing: '+', '.join(missing)))
    ready = settings.RECOVERY_EMAIL_ENABLED
    result.append(('Email OTP recovery', ready, 'SMTP configured; test email delivery.' if ready else 'Configure EMAIL_HOST and a valid DEFAULT_FROM_EMAIL. Add the SMTP login if your provider requires it.'))
    return result
