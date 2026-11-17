import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { OptimizerWorkspace } from './OptimizerWorkspace';

/**
 * Las paginas del workspace leen el contexto que crea el layout, asi que las
 * pruebas montan la ruta completa en lugar de la pagina suelta. La URL inicial
 * decide que seccion queda activa.
 */
export function workspaceElement(initialPath: string) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="optimizer/:id/*" element={<OptimizerWorkspace />} />
      </Routes>
    </MemoryRouter>
  );
}

export function renderWorkspace(initialPath: string) {
  return render(workspaceElement(initialPath));
}
