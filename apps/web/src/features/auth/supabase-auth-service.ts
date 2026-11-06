import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { ProfileRow } from '../../lib/database.types';

import { prepareAvatar } from './avatar';
import {
  AuthError,
  type AuthErrorCode,
  type AuthService,
  type ProfilePatch,
  type SessionUser,
  type SignUpInput,
} from './auth-service';

const PROFILE_COLUMNS = 'id, display_name, avatar_url, bio, role, created_at, updated_at';
const AVATAR_BUCKET = 'avatars';

const CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid-credentials',
  invalid_grant: 'invalid-credentials',
  email_exists: 'email-taken',
  user_already_exists: 'email-taken',
  weak_password: 'weak-password',
  email_not_confirmed: 'email-not-confirmed',
  over_email_send_rate_limit: 'rate-limited',
  over_request_rate_limit: 'rate-limited',
};

const toAuthError = (error: { code?: string; message?: string }): AuthError => {
  const code = error.code ? CODE_MAP[error.code] : undefined;
  if (code) return new AuthError(code);
  if (error.message && /invalid login credentials/i.test(error.message)) {
    return new AuthError('invalid-credentials');
  }
  return new AuthError('unknown');
};

export function createSupabaseAuthService(client: SupabaseClient): AuthService {
  async function loadProfile(user: User): Promise<SessionUser> {
    const { data } = await client
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();

    const profile = data as ProfileRow | null;
    const fromMetadata = (user.user_metadata?.display_name as string | undefined) ?? '';
    const fallback = user.email?.split('@')[0] ?? 'player';

    return {
      id: user.id,
      email: user.email ?? null,
      displayName: profile?.display_name || fromMetadata || fallback,
      avatarUrl: profile?.avatar_url ?? undefined,
      bio: profile?.bio ?? '',
    };
  }

  return {
    async currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) return null;
      return loadProfile(data.user);
    },

    onChange(listener) {
      const { data } = client.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          listener(null);
          return;
        }
        listener(await loadProfile(session.user));
      });

      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw toAuthError(error);
    },

    async signUp({ email, password, displayName }: SignUpInput) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw toAuthError(error);

      // Con confirmacion por correo no hay sesion todavia.
      return { needsConfirmation: !data.session };
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw toAuthError(error);
    },

    async updateProfile(patch: ProfilePatch) {
      const { data: current, error: userError } = await client.auth.getUser();
      if (userError || !current.user) throw new AuthError('unconfigured');

      const update: Record<string, string> = {};
      if (patch.displayName !== undefined) update.display_name = patch.displayName.trim();
      if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;

      const { error } = await client.from('profiles').update(update).eq('id', current.user.id);
      if (error) throw toAuthError(error);

      return loadProfile(current.user);
    },

    async uploadAvatar(file: File) {
      const { data: current, error: userError } = await client.auth.getUser();
      if (userError || !current.user) throw new AuthError('unconfigured');

      const blob = await prepareAvatar(file);
      const path = `${current.user.id}/avatar.webp`;

      const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, blob, {
        upsert: true,
        contentType: 'image/webp',
        cacheControl: '60',
      });
      if (error) throw new AuthError('unknown');

      const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      return `${data.publicUrl}?v=${Date.now()}`;
    },
  };
}
