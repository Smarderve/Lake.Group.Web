import { describe, expect, it } from 'vitest';
import { formsProductionConfigProblems, resolveConfig } from '../src/config.js';

const base = {
  NODE_ENV: 'production', DATABASE_URL_RUNTIME: 'postgresql://lake_app:secret@127.0.0.1:5432/lakegroup',
  PUBLIC_FORM_TOKEN_SECRET: 'x'.repeat(32), CONTACT_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com',
  CAREERS_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com', CONTACT_ALLOWED_ORIGINS: 'https://www.lakeoilgroup.com',
  CAREERS_ALLOWED_ORIGINS: 'https://www.lakeoilgroup.com', SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587',
  SMTP_SECURE: 'false', SMTP_USER: 'projectdevemail001@gmail.com', SMTP_PASS: 'app-password',
  MAIL_FROM: 'Lake Group Website Test <projectdevemail001@gmail.com>', CAREERS_CLAMD_HOST: '127.0.0.1', CAREERS_CLAMD_PORT: '3310',
};

describe('forms-only production configuration', () => {
  it('accepts the zero-cost Lake server form configuration without CMS/S3 settings', () => {
    expect(formsProductionConfigProblems(resolveConfig(base))).toEqual([]);
  });
  it('fails closed when SMTP, scanner, persistence, or exact origin is missing', () => {
    for (const partial of [{ SMTP_PASS: '' }, { CAREERS_CLAMD_HOST: '' }, { DATABASE_URL_RUNTIME: '' }, { CONTACT_ALLOWED_ORIGINS: 'https://evil.example' }]) {
      expect(formsProductionConfigProblems(resolveConfig({ ...base, ...partial }))).not.toEqual([]);
    }
  });
});
