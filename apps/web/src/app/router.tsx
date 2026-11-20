import { Navigate, createBrowserRouter } from 'react-router-dom';

import { copy } from '../features/catalog/copy';
import { HomePage } from '../features/catalog/HomePage';
import { LoginPage } from '../features/auth/LoginPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RedirectIfSignedIn, RequireSession } from '../features/auth/guards';
import { CreateOptimizerPage } from '../features/editor/CreateOptimizerPage';
import { OptimizerWorkspace } from '../features/optimizer/workspace/OptimizerWorkspace';
import { AppLayout } from './AppLayout';
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
      { path: 'crear', element: <CreateOptimizerPage /> },
      { path: 'optimizer/:id/*', element: <OptimizerWorkspace /> },
      { path: 'calculadora-dano', element: <Navigate to="/" replace /> },
      { path: 'inventario', element: <Navigate to="/" replace /> },
      {
        path: '*',
        element: <SimplePage title={copy.pages.notFoundTitle} note={copy.pages.notFoundBody} />,
      },
    ],
  },
]);
