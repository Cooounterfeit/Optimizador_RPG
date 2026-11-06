import { Link } from 'react-router-dom';

import { copy } from '../catalog/copy';

export function AuthLoading() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-24" role="status">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {copy.auth.checking}
      </p>
    </div>
  );
}

/** Sin variables de entorno no se simula una sesion: se explica como activarla. */
export function AuthUnavailable() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-24">
      <h1 className="mb-3 text-2xl font-extrabold tracking-[-0.03em]">
        {copy.auth.unavailableTitle}
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">{copy.auth.unavailableBody}</p>
      <code className="mb-8 block rounded-[2px] border border-line bg-surface px-3 py-2 font-mono text-[11px] text-muted-foreground">
        apps/web/.env.local → VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
      </code>
      <Link to="/" className="text-[13px] font-semibold underline underline-offset-4">
        {copy.pages.back}
      </Link>
    </div>
  );
}
