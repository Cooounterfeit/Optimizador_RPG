import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthProvider';
import '../features/auth/default-auth-service';
import { routes } from './router';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routes} />
    </AuthProvider>
  );
}

export default App;
