import { describe, expect, it } from 'vitest';
import { formsLocalTestConfigProblems, formsProductionConfigProblems, resolveConfig } from '../src/config.js';

const base = {
  NODE_ENV: 'production', FORMS_MODE: 'production', DATABASE_URL_RUNTIME: 'postgresql://lake_app:secret@127.0.0.1:5432/lakegroup',
  PUBLIC_FORM_TOKEN_SECRET: 'x'.repeat(32), CONTACT_RECIPIENT_EMAIL: 'admin@lakeoilgroup.com',
  CAREERS_RECIPIENT_EMAIL: 'admin@lakeoilgroup.com', CONTACT_ALLOWED_ORIGINS: 'https://www.lakeoilgroup.com',
  CAREERS_ALLOWED_ORIGINS: 'https://www.lakeoilgroup.com', SMTP_HOST: 'smtp.lakeoilgroup.com', SMTP_PORT: '587',
  SMTP_SECURE: 'false', SMTP_USER: 'forms-service', SMTP_PASS: 'app-password',
  MAIL_FROM: 'Lake Forms <forms@lakeoilgroup.com>', CAREERS_CLAMD_HOST: '127.0.0.1', CAREERS_CLAMD_PORT: '3310',
};

describe('forms-only production configuration', () => {
  it('accepts the zero-cost Lake server form configuration without CMS/S3 settings', () => {
    expect(formsProductionConfigProblems(resolveConfig(base))).toEqual([]);
  });
  it('keeps production SMTP provider-neutral', () => {
    const productionSmtp = resolveConfig({ ...base, SMTP_HOST: 'smtp.lakeoilgroup.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'forms-service', MAIL_FROM: 'Lake Forms <forms@lakeoilgroup.com>' });
    expect(formsProductionConfigProblems(productionSmtp)).toEqual([]);
  });
  it('fails closed when SMTP, scanner, persistence, or exact origin is missing', () => {
    for (const partial of [{ SMTP_PASS: '' }, { CAREERS_CLAMD_HOST: '' }, { DATABASE_URL_RUNTIME: '' }, { CONTACT_ALLOWED_ORIGINS: 'https://evil.example' }]) {
      expect(formsProductionConfigProblems(resolveConfig({ ...base, ...partial }))).not.toEqual([]);
    }
  });
  it('rejects the local-test Gmail recipient in production', () => {
    expect(formsProductionConfigProblems(resolveConfig({ ...base, CONTACT_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com' }))).not.toEqual([]);
    expect(formsProductionConfigProblems(resolveConfig({ ...base, CAREERS_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com' }))).not.toEqual([]);
  });
});

describe('local forms lab configuration', () => {
  const local = {
    NODE_ENV: 'development', FORMS_MODE: 'local-test', DATABASE_URL_RUNTIME: 'postgresql://lake_app:secret@127.0.0.1:5432/lakegroup_forms_test',
    PUBLIC_FORM_TOKEN_SECRET: 'x'.repeat(32), CONTACT_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com', CAREERS_RECIPIENT_EMAIL: 'projectdevemail001@gmail.com',
    CONTACT_ALLOWED_ORIGINS: 'http://127.0.0.1:8080', CAREERS_ALLOWED_ORIGINS: 'http://127.0.0.1:8080', SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587', SMTP_SECURE: 'false',
    SMTP_USER: 'projectdevemail001@gmail.com', SMTP_PASS: 'app-password', MAIL_FROM: 'Lake Group Website Test <projectdevemail001@gmail.com>', CAREERS_CLAMD_HOST: '127.0.0.1', CAREERS_CLAMD_PORT: '3310',
  };
  it('accepts only the isolated Gmail localhost profile', () => {
    expect(formsLocalTestConfigProblems(resolveConfig(local))).toEqual([]);
  });
  it.each([{ CONTACT_RECIPIENT_EMAIL: 'admin@lakeoilgroup.com' }, { CONTACT_ALLOWED_ORIGINS: 'https://www.lakeoilgroup.com' }, { FORMS_MODE: 'production' }])('rejects local profile crossover', (override) => {
    expect(formsLocalTestConfigProblems(resolveConfig({ ...local, ...override }))).not.toEqual([]);
  });
});
