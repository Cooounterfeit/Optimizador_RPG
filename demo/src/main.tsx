import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './cloud/auth'
import ErrorBoundary from './ui/ErrorBoundary'
import { installGlobalHandlers } from './ui/errors'
import './styles.css'

// Errores fuera de React (promesas sin catch, eventos): se registran y se avisan.
installGlobalHandlers()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Ultima red: si falla hasta la cabecera, se ve un mensaje y no una pantalla en blanco. */}
    <ErrorBoundary where="aplicacion" full>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
