import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { copy } from '../catalog/copy';
import { monogram } from '../catalog/monogram';
import { AuthError } from './auth-service';
import { AuthLoading } from './AuthStatus';
import { errorClass, fieldClass, labelClass } from './AuthShell';
import { useAuth } from './AuthProvider';
import { validateAvatar } from './avatar';
import { authErrorMessage } from './error-message';

const sectionClass = 'rounded-[4px] border border-line p-5';

export function ProfilePage() {
  const { user, updateProfile, uploadAvatar, signOut } = useAuth();
  const navigate = useNavigate();

  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) return <AuthLoading />;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const displayName = name.trim();
    if (!displayName || displayName.length > 40) {
      setError(copy.auth.nameRequired);
      return;
    }

    setPending(true);
    try {
      await updateProfile({ displayName });
      setSaved(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function pickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      validateAvatar(file);
      const url = await uploadAvatar(file);
      await updateProfile({ avatarUrl: url });
      setAvatarUrl(url);
    } catch (cause) {
      if (cause instanceof AuthError && cause.code === 'unconfigured') {
        setError(copy.auth.errors.unconfigured);
      } else {
        setError(authErrorMessage(cause));
      }
    } finally {
      setUploading(false);
    }
  }

  async function leave() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16">
      <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">{copy.profile.title}</h1>
      <p className="mb-10 text-sm text-muted-foreground">{copy.profile.lede}</p>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <form className={sectionClass} onSubmit={save} noValidate>
          {error ? (
            <p className={errorClass} role="alert">
              {error}
            </p>
          ) : null}

          <span className={labelClass}>{copy.profile.avatar}</span>
          <div className="mb-6 flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-16 w-16 place-items-center rounded-full border border-line bg-muted font-mono text-lg font-semibold"
              >
                {monogram(name || user.displayName)}
              </span>
            )}
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? copy.auth.working : copy.profile.changeAvatar}
              </Button>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{copy.profile.avatarHint}</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={pickAvatar}
                aria-label={copy.profile.avatar}
              />
            </div>
          </div>

          <label className={labelClass} htmlFor="profile-name">
            {copy.profile.displayName}
          </label>
          <input
            id="profile-name"
            className={fieldClass}
            type="text"
            maxLength={40}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
          />

          <label className={`${labelClass} mt-4`} htmlFor="profile-email">
            {copy.profile.email}
          </label>
          <input
            id="profile-email"
            className={`${fieldClass} opacity-70`}
            type="email"
            value={user.email ?? ''}
            readOnly
          />
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{copy.profile.emailNote}</p>

          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? copy.profile.saving : copy.profile.save}
            </Button>
            {saved ? (
              <span role="status" className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {copy.profile.saved}
              </span>
            ) : null}
            <Button variant="ghost" className="ml-auto" onClick={leave}>
              {copy.profile.signOut}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-6">
          <section className={sectionClass}>
            <h2 className={labelClass}>{copy.profile.subscription}</h2>
            <p className="text-lg font-bold">{copy.profile.planFree}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">{copy.profile.planNote}</p>
          </section>

          <section className={sectionClass}>
            <h2 className={labelClass}>{copy.profile.myOptimizers}</h2>
            <p className="text-[12.5px] text-muted-foreground">{copy.profile.myOptimizersNote}</p>
          </section>

          <section className="rounded-[4px] border border-dashed border-line p-5">
            <h2 className={labelClass}>{copy.profile.danger}</h2>
            <Button variant="outline" size="sm" disabled title={copy.soon}>
              {copy.profile.deleteAccount}
            </Button>
            <p className="mt-2 text-[11.5px] text-muted-foreground">{copy.profile.deleteNote}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
