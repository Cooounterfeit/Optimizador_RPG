import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../../auth/AuthProvider';
import type { SessionUser } from '../../auth/auth-service';
import { fakeAuthService } from '../../auth/test-auth';

import { OptimizerWorkspace } from './OptimizerWorkspace';

/**
 * Las paginas del workspace leen el contexto que crea el layout, asi que las
 * pruebas montan la ruta completa en lugar de la pagina suelta. La URL inicial
 * decide que seccion queda activa.
 *
 * Acepta tambien una entrada con estado, porque algunas pantallas reaccionan a
 * como se llego a ellas y no solo a donde: el aviso de "creado" de
 * `ConfigurationPage` viaja ahi.
 *
 * El arbol incluye `AuthProvider` porque en la aplicacion real envuelve al
 * router entero (`app.tsx`), y hay pantallas del workspace que preguntan por la
 * sesion. Montar sin el daba un arbol que no existe en produccion, y la pagina
 * se caia con "useAuth fuera de AuthProvider".
 *
 * Por defecto hay servicio pero no hay nadie dentro: anonimo, que es el caso
 * mas comun. `user` abre sesion y `auth: null` simula una instalacion sin
 * cuentas configuradas.
 */
type Entrada = string | { pathname: string; state?: unknown };

export interface WorkspaceOptions {
  /** Quien tiene la sesion. `null` o sin pasar, nadie. */
  user?: SessionUser | null;
  /** `null` deja la app sin cuentas, como sin Supabase. */
  auth?: null;
}

export function workspaceElement(initialPath: Entrada, options: WorkspaceOptions = {}) {
  const service =
    options.auth === null ? null : fakeAuthService({ initialUser: options.user ?? null }).service;

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider service={service}>
        <Routes>
          <Route path="optimizer/:id/*" element={<OptimizerWorkspace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

export function renderWorkspace(initialPath: Entrada, options: WorkspaceOptions = {}) {
  return render(workspaceElement(initialPath, options));
}
