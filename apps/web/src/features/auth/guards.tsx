import type { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { AuthLoading, AuthUnavailable } from './AuthStatus';

/** Solo deja pasar con sesion; sin sesion manda a /login y recuerda el destino. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'unconfigured') return <AuthUnavailable />;
  if (status === 'loading') return <AuthLoading />;
  if (status === 'anonymous') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

/** Con sesion abierta, /login y /registro vuelven al destino o al hub. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;

  return <>{children}</>;
}

/** Solo rutas internas: evita que `next` mande a otro sitio. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
