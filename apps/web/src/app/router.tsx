import { createBrowserRouter } from 'react-router-dom';

import { copy } from '../features/catalog/copy';
import { HomePage } from '../features/catalog/HomePage';
import { LoginPage } from '../features/auth/LoginPage';
import { ProfilePage } from '../features/auth/ProfilePage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RedirectIfSignedIn, RequireSession } from '../features/auth/guards';
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
      {
        path: '*',
        element: <SimplePage title={copy.pages.notFoundTitle} note={copy.pages.notFoundBody} />,
      },
    ],
  },
]);
