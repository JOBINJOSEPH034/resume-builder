from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile, Offer, Resume, Transaction


# ── Inline UserProfile inside User admin ──────────────────────────────────────
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ('plan', 'downloads_used', 'created_at')
    readonly_fields = ('created_at',)


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('email', 'first_name', 'last_name', 'get_plan', 'get_downloads', 'date_joined', 'is_active')
    list_filter = ('is_active', 'profile__plan')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    @admin.display(description='Plan')
    def get_plan(self, obj):
        return obj.profile.plan if hasattr(obj, 'profile') else '-'

    @admin.display(description='Downloads Used')
    def get_downloads(self, obj):
        return obj.profile.downloads_used if hasattr(obj, 'profile') else 0


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ── Offer admin ───────────────────────────────────────────────────────────────
@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'free_downloads_allowed', 'ai_optimize_free', 'discount_text', 'created_at')
    list_editable = ('is_active',)
    fields = ('title', 'description', 'discount_text', 'free_downloads_allowed', 'ai_optimize_free', 'is_active')
    readonly_fields = ('created_at',)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

    class Media:
        css = {}


# ── Resume admin ──────────────────────────────────────────────────────────────
@admin.register(Resume)
class ResumeAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_user_email', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    @admin.display(description='User Email')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'


# ── Transaction admin ─────────────────────────────────────────────────────────
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_user_email', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'currency')
    search_fields = ('user__email', 'razorpay_order_id', 'razorpay_payment_id')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

    @admin.display(description='User Email')
    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Anonymous'
