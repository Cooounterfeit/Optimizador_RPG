import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { OptimizerWorkspace } from './OptimizerWorkspace';

/**
 * Las paginas del workspace leen el contexto que crea el layout, asi que las
 * pruebas montan la ruta completa en lugar de la pagina suelta. La URL inicial
 * decide que seccion queda activa.
 *
 * Acepta tambien una entrada con estado, porque algunas pantallas reaccionan a
 * como se llego a ellas y no solo a donde: el aviso de "creado" de
 * `ConfigurationPage` viaja ahi.
 */
type Entrada = string | { pathname: string; state?: unknown };

export function workspaceElement(initialPath: Entrada) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="optimizer/:id/*" element={<OptimizerWorkspace />} />
      </Routes>
    </MemoryRouter>
  );
}

export function renderWorkspace(initialPath: Entrada) {
  return render(workspaceElement(initialPath));
}
