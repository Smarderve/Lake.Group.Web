import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@iconify/react';
import eyeOffOutline from '@iconify-icons/mdi/eye-off-outline';
import eyeOutline from '@iconify-icons/mdi/eye-outline';
import lockOutline from '@iconify-icons/mdi/lock-outline';
import shieldCheckOutline from '@iconify-icons/mdi/shield-check-outline';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../../components/brand/BrandMark';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Field } from '../../../components/ui/Field';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../AuthProvider';
import { apiErrorMessage } from '../../../services/api';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const mfaSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});

type LoginForm = z.infer<typeof loginSchema>;
type MfaForm = z.infer<typeof mfaSchema>;

/**
 * Real sign-in (spec §36): POST /auth/login with the session cookie, then the
 * TOTP step when the account has MFA enabled. Errors surface from the backend
 * contract; on success the router's guard hands off to the app.
 */
export function LoginPage() {
  const { login, verifyMfa, status } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  // Already signed in – skip the form entirely.
  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [status, from, navigate]);

  async function onLogin(values: LoginForm) {
    try {
      const result = await login(values.email, values.password);
      if (result === 'mfa-required') {
        setEmail(values.email);
        setStep('mfa');
        mfaForm.reset();
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Sign in failed', description: apiErrorMessage(err) });
      loginForm.setError('password', { message: apiErrorMessage(err, 'Invalid email or password') });
    }
  }

  async function onMfa(values: MfaForm) {
    try {
      await verifyMfa(values.code);
      toast({ variant: 'success', title: 'Signed in' });
      navigate(from, { replace: true });
    } catch (err) {
      toast({ variant: 'error', title: 'Verification failed', description: apiErrorMessage(err) });
      mfaForm.setError('code', { message: apiErrorMessage(err, 'Invalid code') });
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="space-y-5">
        <div className="flex justify-center pb-1">
          <BrandMark size="md" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            {step === 'credentials' ? 'Sign in' : 'Two-step verification'}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {step === 'credentials'
              ? 'Use your Lake Group account to manage content.'
              : `Enter the code from your authenticator app for ${email}.`}
          </p>
        </div>

        {step === 'credentials' ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" noValidate>
            <Field id="login-email" label="Email" required error={loginForm.formState.errors.email?.message}>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@lake-group.com"
                aria-invalid={Boolean(loginForm.formState.errors.email)}
                {...loginForm.register('email')}
              />
            </Field>
            <Field
              id="login-password"
              label="Password"
              required
              error={loginForm.formState.errors.password?.message}
            >
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(loginForm.formState.errors.password)}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    {showPassword ? (
                      <Icon icon={eyeOffOutline} className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Icon icon={eyeOutline} className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
                {...loginForm.register('password')}
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
              loading={loginForm.formState.isSubmitting}
              leftIcon={<Icon icon={lockOutline} className="h-4 w-4" />}
            >
              Sign in
            </Button>
          </form>
        ) : (
          <form onSubmit={mfaForm.handleSubmit(onMfa)} className="space-y-4" noValidate>
            <Field id="login-mfa-code" label="Authenticator code" required error={mfaForm.formState.errors.code?.message}>
              <Input
                id="login-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                aria-invalid={Boolean(mfaForm.formState.errors.code)}
                {...mfaForm.register('code')}
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
              loading={mfaForm.formState.isSubmitting}
              leftIcon={<Icon icon={shieldCheckOutline} className="h-4 w-4" />}
            >
              Verify and sign in
            </Button>
            <button
              type="button"
              onClick={() => setStep('credentials')}
              className="w-full text-center text-[13px] font-medium text-lake-600 hover:text-lake-700 hover:underline"
            >
              Use a different account
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
