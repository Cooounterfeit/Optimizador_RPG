import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { copy } from '../catalog/copy';

import { AuthUnavailable } from './AuthStatus';
import { AuthShell, errorClass, fieldClass, labelClass } from './AuthShell';
import { useAuth } from './AuthProvider';
import { authErrorMessage } from './error-message';
import { safeNext } from './guards';
import { rememberSession, setRememberSession } from '../../lib/supabase';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => rememberSession());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'unconfigured') return <AuthUnavailable />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.includes('@')) return setError(copy.auth.requiredEmail);
    if (!password) return setError(copy.auth.requiredPassword);

    setPending(true);
    setRememberSession(remember);

    try {
      await signIn(email.trim(), password);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title={copy.auth.signInTitle}
      lede={copy.auth.signInLede}
      footer={
        <>
          {copy.auth.noAccount}{' '}
          <Link className="font-semibold text-foreground underline underline-offset-4" to="/registro">
            {copy.auth.goRegister}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}

        <label className={labelClass} htmlFor="login-email">
          {copy.auth.email}
        </label>
        <input
          id="login-email"
          className={fieldClass}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className={`${labelClass} mt-4`} htmlFor="login-password">
          {copy.auth.password}
        </label>
        <input
          id="login-password"
          className={fieldClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label className="mt-4 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--color-primary)]"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          {copy.auth.remember}
        </label>

        <Button className="mt-6 w-full" type="submit" disabled={pending}>
          {pending ? copy.auth.working : copy.auth.signInSubmit}
        </Button>
      </form>
    </AuthShell>
  );
}
