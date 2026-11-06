/** Puerto de autenticacion (F5). La UI depende de esto, no de Supabase. */

export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-taken'
  | 'weak-password'
  | 'email-not-confirmed'
  | 'rate-limited'
  | 'avatar-type'
  | 'avatar-size'
  | 'unconfigured'
  | 'unknown';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface ProfilePatch {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AuthService {
  currentUser(): Promise<SessionUser | null>;
  /** Avisa cada cambio de sesion. Devuelve la funcion para dejar de escuchar. */
  onChange(listener: (user: SessionUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<SessionUser>;
  uploadAvatar(file: File): Promise<string>;
}

let current: AuthService | null = null;

export function getAuthService(): AuthService | null {
  return current;
}

export function setAuthService(next: AuthService | null): void {
  current = next;
}
