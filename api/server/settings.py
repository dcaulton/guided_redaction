"""
Django settings for api project.

Generated by 'django-admin startproject' using Django 2.2.6.

For more information on this file, see
https://docs.djangoproject.com/en/2.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.2/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'y9*^g!mt!)!7*ealqqr0gd2s()9u^m5#-&hi&h42yjd)ns=6k1'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'guided_redaction',
    'guided_redaction.parse',
    'guided_redaction.analyze',
    'guided_redaction.redact',
    'guided_redaction.jobs',
    'django_extensions',
    'rest_framework',
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

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'


# Database
# https://docs.djangoproject.com/en/2.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'step',
        'USER': 'root',
        'PASSWORD': 'admin',
        'HOST': '127.0.0.1',
        'PORT': 3306,
    },
    'sqlite': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/2.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.2/howto/static-files/

STATIC_URL = '/static/'


#CUSTOM SETTINGS
REDACT_EAST_FILE_PATH = 'guided_redaction/analyze/bin/frozen_east_text_detection.pb'
CORS_ORIGIN_ALLOW_ALL = True
REDACT_FILE_STORAGE_DIR = './guided_redaction/work'
REDACT_FILE_BASE_URL = 'http://localhost:8080'
REDACT_MYSQL_BASE_URL = '/v1/parse/asset'
REDACT_AZURE_BASE_URL = 'https://redactblob.blob.core.windows.net/mycontainer'
REDACT_AZURE_BLOB_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=redactblob;AccountKey=pTkHJ1dws5dtiVmX5FF+vYxkp1qNgaz62LeSLcxijoWFUXVzWFkn3BxoGMKxJs4tjjHaI/zI80zeIcfdPPz7sw==;EndpointSuffix=core.windows.net'
REDACT_SYKES_DEV_AZURE_BLOB_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=sykesdevcustomertile;AccountKey=Q573TWuD3wefJDPk4zP9kVIZXuISaqzQR/gGy597111IuGx9yY/EWCztopDO1ufi4sK5s4Jwfz0U3f4EWLJMYQ==;EndpointSuffix=core.windows.net'
REDACT_SYKES_DEV_AZURE_BLOB_CONTAINER_NAME = 'redaction'
REDACT_IMAGE_STORAGE='redis'  # file, redis,  mysql or azure_blob
REDACT_REDIS_HOST="127.0.0.1"
REDACT_REDIS_PORT=6379
REDACT_REDIS_DB=2
