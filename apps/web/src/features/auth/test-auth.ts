import type { AuthService, SessionUser } from './auth-service';

export const SAMPLE_USER: SessionUser = {
  id: 'user-1',
  email: 'ana@ejemplo.cl',
  displayName: 'Ana',
};

interface FakeOptions {
  initialUser?: SessionUser | null;
  service?: Partial<AuthService>;
}

/** Servicio de auth en memoria para pruebas: sin red y sin Supabase. */
export function fakeAuthService(options: FakeOptions = {}): {
  service: AuthService;
  current(): SessionUser | null;
} {
  let user = options.initialUser ?? null;

  const service: AuthService = {
    async currentUser() {
      return user;
    },
    onChange() {
      return () => undefined;
    },
    async signIn() {
      user = SAMPLE_USER;
    },
    async signUp() {
      user = SAMPLE_USER;
      return { needsConfirmation: false };
    },
    async signOut() {
      user = null;
    },
    async updateProfile(patch) {
      const base = user ?? SAMPLE_USER;
      user = {
        ...base,
        displayName: patch.displayName ?? base.displayName,
        avatarUrl: patch.avatarUrl ?? base.avatarUrl,
      };
      return user;
    },
    async uploadAvatar() {
      return 'https://cdn.ejemplo.cl/avatar.webp?v=1';
    },
    ...options.service,
  };

  return { service, current: () => user };
}
