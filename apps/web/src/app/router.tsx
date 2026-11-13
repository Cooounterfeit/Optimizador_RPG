import { Navigate, createBrowserRouter } from 'react-router-dom';

import { copy } from '../features/catalog/copy';
import { HomePage } from '../features/catalog/HomePage';
import { DamageCalculatorPage } from '../features/damage/DamageCalculatorPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { SkillTreePage } from '../features/skills/SkillTreePage';
import { LoginPage } from '../features/auth/LoginPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RedirectIfSignedIn, RequireSession } from '../features/auth/guards';
import { CharacterSheetPage } from '../features/sheet/CharacterSheetPage';
import { AppLayout } from './AppLayout';
import { OptimizerPage } from './OptimizerPage';
import { SimplePage } from './SimplePage';

export const routes = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'login',
        element: (
          <RedirectIfSignedIn>
            <LoginPage />
          </RedirectIfSignedIn>
        ),
      },
      {
        path: 'registro',
        element: (
          <RedirectIfSignedIn>
            <RegisterPage />
          </RedirectIfSignedIn>
        ),
      },
      {
        path: 'perfil',
        element: (
          <RequireSession>
            <ProfilePage />
          </RequireSession>
        ),
      },
      { path: 'optimizer/:id', element: <OptimizerPage /> },
      { path: 'optimizer/:id/personaje', element: <CharacterSheetPage /> },
      { path: 'optimizer/:id/inventario', element: <InventoryPage /> },
      { path: 'optimizer/:id/habilidades', element: <SkillTreePage /> },
      { path: 'optimizer/:id/dano', element: <DamageCalculatorPage /> },
      { path: 'calculadora-dano', element: <Navigate to="/" replace /> },
      { path: 'inventario', element: <Navigate to="/" replace /> },
      {
        path: '*',
        element: <SimplePage title={copy.pages.notFoundTitle} note={copy.pages.notFoundBody} />,
      },
    ],
  },
]);
