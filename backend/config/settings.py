import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
 
load_dotenv()
BASE_DIR = Path(__file__).resolve().parent.parent
 
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-non-securisee-changer-en-prod')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
 
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Packages tiers
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    # Tes applications
    'apps.users',
    'apps.documents',
    'apps.memoires',
    'apps.sessions_reseau',
    'apps.journal',
    'apps.messagerie',
    'apps.notifications',
]
 
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
 
ROOT_URLCONF = 'config.urls'
 
TEMPLATES = [{'BACKEND':'django.template.backends.django.DjangoTemplates',
    'DIRS':[],'APP_DIRS':True,
    'OPTIONS':{'context_processors':[
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},}]
 
WSGI_APPLICATION = 'config.wsgi.application'
 
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.environ.get('DB_NAME',     'sis_enset_db'),
        'USER':     os.environ.get('DB_USER',     'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST':     os.environ.get('DB_HOST',     'localhost'),
        'PORT':     os.environ.get('DB_PORT',     '5432'),
    }
}
 
AUTH_USER_MODEL = 'users.Utilisateur'
 
AUTH_PASSWORD_VALIDATORS = [
    {'NAME':'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME':'django.contrib.auth.password_validation.MinimumLengthValidator'},
]
 
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE     = 'Africa/Douala'
USE_I18N      = True
USE_TZ        = True
 
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'
 
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
 
# ── CORS ──────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True   # En dev seulement
 
# ── JWT ───────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
 
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS':  True,
    'AUTH_HEADER_TYPES':      ('Bearer',),
}
 
# ── MikroTik ─────────────────────────────────────────
MIKROTIK_HOST     = os.environ.get('MIKROTIK_HOST',     '192.168.1.1')
MIKROTIK_USER     = os.environ.get('MIKROTIK_USER',     'admin')
MIKROTIK_PASSWORD = os.environ.get('MIKROTIK_PASSWORD', 'admin')
MIKROTIK_PORT     = os.environ.get('MIKROTIK_PORT',     '8728')
