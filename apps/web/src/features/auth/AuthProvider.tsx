import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  AuthError,
  getAuthService,
  type AuthService,
  type ProfilePatch,
  type SessionUser,
  type SignUpInput,
} from './auth-service';

export type AuthStatus = 'unconfigured' | 'loading' | 'anonymous' | 'authenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<SessionUser>;
  uploadAvatar(file: File): Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  service?: AuthService | null;
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  const resolved = service === undefined ? getAuthService() : service;
  const [status, setStatus] = useState<AuthStatus>(resolved ? 'loading' : 'unconfigured');
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!resolved) {
      setStatus('unconfigured');
      return;
    }

    let alive = true;
    const apply = (next: SessionUser | null) => {
      if (!alive) return;
      setUser(next);
      setStatus(next ? 'authenticated' : 'anonymous');
    };

    resolved
      .currentUser()
      .then(apply)
      .catch(() => apply(null));

    const stop = resolved.onChange(apply);

    return () => {
      alive = false;
      stop();
    };
  }, [resolved]);

  const require = useCallback((): AuthService => {
    if (!resolved) throw new AuthError('unconfigured');
    return resolved;
  }, [resolved]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        await require().signIn(email, password);
        setUser(await require().currentUser());
        setStatus('authenticated');
      },
      signUp: (input) => require().signUp(input),
      async signOut() {
        await require().signOut();
        setUser(null);
        setStatus('anonymous');
      },
      async updateProfile(patch) {
        const next = await require().updateProfile(patch);
        setUser(next);
        return next;
      },
      uploadAvatar: (file) => require().uploadAvatar(file),
    }),
    [require, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth fuera de AuthProvider');
  return context;
}
