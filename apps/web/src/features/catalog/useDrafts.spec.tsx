import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GameRepository } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { buildSkeleton } from '../editor/skeleton';
import { getGameRepository, setGameRepository } from '../game/repositories';

import { DraftsRail } from './components/DraftsRail';
import { useDrafts } from './useDrafts';

const real = getGameRepository();

interface Fila {
  id: string;
  template: GameTemplate;
  updatedAt: number;
  cloud?: boolean;
}

const repoCon = (filas: Fila[]) =>
  setGameRepository({
    list: async () => filas,
    get: async (id: string) => filas.find((f) => f.id === id),
    save: async (game: unknown) => game,
    remove: async () => undefined,
    clearLocalData: async () => undefined,
  } as unknown as GameRepository);

const juego = (id: string, name: string, cloud?: boolean): Fila => ({
  id,
  template: { ...buildSkeleton({ name }, id) },
  updatedAt: 1,
  ...(cloud === undefined ? {} : { cloud }),
});

/** Monta el hook a traves del componente que lo consume. */
function Sonda() {
  const drafts = useDrafts();
  if (!drafts) return <p>cargando</p>;
  return (
    <MemoryRouter>
      <DraftsRail drafts={drafts} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  repoCon([]);
});

afterEach(() => {
  setGameRepository(real);
});

describe('useDrafts', () => {
  it('lista los borradores de este navegador', async () => {
    repoCon([juego('mi-juego', 'Mi juego'), juego('otro', 'Otro')]);
    render(<Sonda />);

    expect(await screen.findByText('Mi juego')).toBeTruthy();
    expect(screen.getByText('Otro')).toBeTruthy();
  });

  it('no lista lo que solo es copia de algo del catalogo', async () => {
    // `cloud` marca lo que vino de fuera. Sin el filtro, abrir un optimizador
    // ajeno una vez lo haria aparecer como tuyo.
    repoCon([juego('mio', 'Mio'), juego('ajeno', 'Ajeno', true)]);
    render(<Sonda />);

    expect(await screen.findByText('Mio')).toBeTruthy();
    expect(screen.queryByText('Ajeno')).toBeNull();
  });

  it('no ocupa sitio cuando no hay ninguno', async () => {
    repoCon([juego('ajeno', 'Ajeno', true)]);
    render(<Sonda />);

    await waitFor(() => expect(screen.queryByText('cargando')).toBeNull());
    expect(screen.queryByText('Your drafts')).toBeNull();
  });

  it('lleva a la configuracion, que es donde se sigue trabajando', async () => {
    repoCon([juego('mi-juego', 'Mi juego')]);
    render(<Sonda />);

    const enlace = await screen.findByRole('link', { name: /Mi juego/ });
    expect(enlace.getAttribute('href')).toBe('/optimizer/mi-juego/configuracion');
  });

  it('si el repositorio falla, la portada no se rompe', async () => {
    setGameRepository({
      list: async () => {
        throw new Error('sin IndexedDB');
      },
    } as unknown as GameRepository);
    render(<Sonda />);

    await waitFor(() => expect(screen.queryByText('cargando')).toBeNull());
    expect(screen.queryByText('Your drafts')).toBeNull();
  });
});
