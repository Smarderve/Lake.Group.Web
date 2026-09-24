# CMS V2 production configuration readiness

This audit reports variable names only. It does not read or print secret values. Local presence cannot prove that the deployment platform has the same configuration.

## Ready locally

- DATABASE_URL
- DATABASE_URL_RUNTIME
- SESSION_SECRET
- CMS_ALLOWED_ORIGINS
- CSRF_ALLOWED_ORIGINS
- MEDIA_STORAGE_DRIVER
- MEDIA_PUBLIC_BASE_URL
- CMS_V2_RELEASE_DIR

## Missing locally / deployment verification required

- BACKUP_ENCRYPTION_KEY
- BACKUP_STORAGE_PREFIX
- S3_REGION
- S3_BUCKET
- CMS_V2_PUBLIC_SITE_ORIGIN
- CMS_V2_DEPLOYMENT_TOKEN

## Optional

Present: none
Absent: BACKUP_RETENTION_DAYS, MEDIA_UPLOAD_MAX_BYTES, SESSION_COOKIE_SECURE
