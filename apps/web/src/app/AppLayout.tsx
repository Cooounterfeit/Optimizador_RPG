import { Outlet, useMatch } from 'react-router-dom';

import { Footer } from '../features/catalog/components/Footer';
import { TopBar } from '../features/catalog/components/TopBar';
import { copy } from '../features/catalog/copy';

export function AppLayout() {
  /**
   * En el workspace el footer lo dibuja la propia seccion, dentro de la columna
   * de contenido: si quedara aqui, ocuparia todo el ancho y el rail (sticky)
   * chocaria contra su borde al llegar al fondo de la pagina.
   */
  const inWorkspace = Boolean(useMatch('optimizer/:id/*'));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <a
        href="#main-content"
        className="absolute left-4 top-[-60px] z-[300] rounded-[2px] bg-primary px-3 py-2 font-bold text-primary-foreground transition-[top] duration-150 focus-visible:top-3"
      >
        {copy.skipToCatalog}
      </a>
      <TopBar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      {inWorkspace ? null : <Footer />}
    </div>
  );
}
