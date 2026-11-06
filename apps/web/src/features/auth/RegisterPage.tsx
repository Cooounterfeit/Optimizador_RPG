import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { copy } from '../catalog/copy';

import { AuthUnavailable } from './AuthStatus';
import { AuthShell, errorClass, fieldClass, labelClass } from './AuthShell';
import { useAuth } from './AuthProvider';
import { authErrorMessage } from './error-message';

export function RegisterPage() {
  const { status, signUp } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  if (status === 'unconfigured') return <AuthUnavailable />;

  if (sent) {
    return (
      <AuthShell title={copy.auth.confirmationTitle} lede={copy.auth.confirmationBody}>
        <Link className="text-[13px] font-semibold underline underline-offset-4" to="/login">
          {copy.auth.goLogin}
        </Link>
      </AuthShell>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = displayName.trim();
    if (!name) return setError(copy.auth.nameRequired);
    if (!email.includes('@')) return setError(copy.auth.requiredEmail);
    if (password.length < 8) return setError(copy.auth.errors['weak-password']);
    if (password !== confirm) return setError(copy.auth.passwordMismatch);

    setPending(true);

    try {
      const result = await signUp({ email: email.trim(), password, displayName: name });
      if (result.needsConfirmation) {
        setSent(true);
        return;
      }
      navigate('/perfil', { replace: true });
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title={copy.auth.registerTitle}
      lede={copy.auth.registerLede}
      footer={
        <>
          {copy.auth.hasAccount}{' '}
          <Link className="font-semibold text-foreground underline underline-offset-4" to="/login">
            {copy.auth.goLogin}
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

        <label className={labelClass} htmlFor="register-name">
          {copy.auth.displayName}
        </label>
        <input
          id="register-name"
          className={fieldClass}
          type="text"
          autoComplete="nickname"
          maxLength={40}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        <label className={`${labelClass} mt-4`} htmlFor="register-email">
          {copy.auth.email}
        </label>
        <input
          id="register-email"
          className={fieldClass}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <label className={`${labelClass} mt-4`} htmlFor="register-password">
          {copy.auth.password}
        </label>
        <input
          id="register-password"
          className={fieldClass}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <label className={`${labelClass} mt-4`} htmlFor="register-confirm">
          {copy.auth.passwordConfirm}
        </label>
        <input
          id="register-confirm"
          className={fieldClass}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <Button className="mt-6 w-full" type="submit" disabled={pending}>
          {pending ? copy.auth.working : copy.auth.registerSubmit}
        </Button>
      </form>
    </AuthShell>
  );
}
