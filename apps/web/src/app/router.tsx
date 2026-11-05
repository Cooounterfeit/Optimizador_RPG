import { createBrowserRouter } from 'react-router-dom';

import { copy } from '../features/catalog/copy';
import { HomePage } from '../features/catalog/HomePage';
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
        element: <SimplePage title={copy.pages.loginTitle} note={copy.pages.loginNote} />,
      },
      {
        path: 'registro',
        element: <SimplePage title={copy.pages.registerTitle} note={copy.pages.registerNote} />,
      },
      {
        path: 'perfil',
        element: <SimplePage title={copy.pages.profileTitle} note={copy.pages.profileNote} />,
      },
      { path: 'optimizer/:id', element: <OptimizerPage /> },
      {
        path: '*',
        element: <SimplePage title={copy.pages.notFoundTitle} note={copy.pages.notFoundBody} />,
      },
    ],
  },
]);
