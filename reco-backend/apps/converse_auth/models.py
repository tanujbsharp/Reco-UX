"""
Converse auth models — read-only, unmanaged models that map to the
existing Converse/Celebrate database tables.

These models are routed to the 'converse' database by db_router.ConverseRouter.
Django will NOT create or modify these tables (managed = False).
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class CelebrateUsersManager(BaseUserManager):
    """Custom manager for CelebrateUsers (email-based auth)."""

    def get_by_natural_key(self, email_id):
        return self.get(email_id=email_id)

    def create_user(self, email_id, password=None, **extra_fields):
        if not email_id:
            raise ValueError('Users must have an email_id')
        user = self.model(email_id=email_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email_id, password=None, **extra_fields):
        extra_fields.setdefault('user_role', 1)
        return self.create_user(email_id, password, **extra_fields)


class CelebrateUsers(AbstractBaseUser):
    """
    Maps to the celebrate_users table in the Converse database.
    This is the user table used for authentication.

    Fields match FSD Section 3.2.
    """
    id = models.AutoField(primary_key=True)
    cmid = models.IntegerField(default=0, help_text='FK to CelebrateCompanies.cmid (tenant)')
    email_id = models.TextField(unique=True, help_text='Login credential (USERNAME_FIELD)')
    mobile_no = models.CharField(max_length=225, blank=True, null=True)
    first_name = models.CharField(max_length=225, blank=True, null=True)
    last_name = models.CharField(max_length=225, blank=True, null=True)
    password = models.TextField(blank=True, null=True)
    user_role = models.IntegerField(default=2, help_text='1=admin, 2=user')
    status = models.IntegerField(default=5, help_text='5=active, 4=blocked, 1=invited')
    designation = models.TextField(blank=True, null=True)
    manager_email = models.TextField(blank=True, null=True)
    access_key = models.TextField(blank=True, default='')
    azure_id = models.TextField(blank=True, null=True)
    bsharp_uid = models.IntegerField(blank=True, null=True)
    whatsapp_opt = models.IntegerField(default=0)
    first_login = models.IntegerField(default=0, help_text='Timestamp of first login')
    profile_file_name = models.TextField(blank=True, null=True)

    objects = CelebrateUsersManager()

    USERNAME_FIELD = 'email_id'
    REQUIRED_FIELDS = []

    class Meta:
        managed = False
        db_table = 'celebrate_users'
        app_label = 'converse_auth'
        verbose_name = 'Celebrate User'
        verbose_name_plural = 'Celebrate Users'

    def __str__(self):
        return self.email_id or f'User {self.id}'

    @property
    def is_active(self):
        """User status 5 = active in Converse."""
        return self.status == 5

    @property
    def is_staff(self):
        """Admins (user_role=1) can access Django admin."""
        return self.user_role == 1

    @property
    def is_superuser(self):
        return self.user_role == 1

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class CelebrateCompanies(models.Model):
    """
    Maps to the celebrate_companies table in the Converse database.
    Each record represents a tenant/brand.

    Fields match FSD Section 3.3.
    """
    cmid = models.AutoField(primary_key=True)
    cm_name = models.CharField(max_length=255, blank=True, null=True, help_text='Company/brand name')
    cm_domain = models.TextField(blank=True, null=True, help_text='Email domain (e.g., lenovo.com)')
    cm_color = models.CharField(max_length=255, blank=True, null=True, help_text='Brand accent color')
    logo_image_url = models.TextField(blank=True, null=True, help_text='Brand logo S3 path')
    bsharp_token = models.CharField(max_length=255, blank=True, null=True)
    allow_access = models.PositiveIntegerField(default=1)
    emp_count = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'celebrate_companies'
        app_label = 'converse_auth'
        verbose_name = 'Celebrate Company'
        verbose_name_plural = 'Celebrate Companies'

    def __str__(self):
        return self.cm_name or f'Company {self.cmid}'


class UserRoles(models.Model):
    """
    Maps to the user_roles table in the Converse database.
    Links users to roles within companies.

    Fields match FSD Section 3.4.
    """
    urid = models.AutoField(primary_key=True)
    uid = models.IntegerField(help_text='FK to CelebrateUsers.id')
    rid = models.IntegerField(help_text='1=admin, 2=regular user')
    cmid = models.IntegerField(help_text='FK to CelebrateCompanies.cmid')
    status = models.IntegerField(default=0, help_text='0=active')

    class Meta:
        managed = False
        db_table = 'user_roles'
        app_label = 'converse_auth'
        verbose_name = 'User Role'
        verbose_name_plural = 'User Roles'

    def __str__(self):
        return f'User {self.uid} - Role {self.rid} - Company {self.cmid}'
