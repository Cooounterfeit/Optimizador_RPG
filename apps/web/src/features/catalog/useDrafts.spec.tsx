import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GameRepository } from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { buildSkeleton } from '../editor/skeleton';
import {
  getGameRepository,
  setGameRepository,
  setInventoryRepository,
} from '../game/repositories';
import { fakeInventoryRepository } from '../game/testing';

import { DraftsRail } from './components/DraftsRail';
import { useDrafts } from './useDrafts';

const real = getGameRepository();

interface Fila {
  id: string;
  template: GameTemplate;
  updatedAt: number;
  cloud?: boolean;
}

/** Lo que se pidio borrar, para comprobar que se borran las dos cosas. */
let borrados: { remove: string[]; clear: string[] };

const repoCon = (filas: Fila[]) => {
  borrados = { remove: [], clear: [] };
  setGameRepository({
    list: async () => filas,
    get: async (id: string) => filas.find((f) => f.id === id),
    save: async (game: unknown) => game,
    remove: async (id: string) => {
      borrados.remove.push(id);
    },
    clearLocalData: async (id: string) => {
      borrados.clear.push(id);
    },
  } as unknown as GameRepository);
};

const conPiezas = (items: Item[]) => setInventoryRepository(fakeInventoryRepository(items));

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
  conPiezas([]);
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

describe('borrar un borrador', () => {
  const pieza = (id: string): Item => ({
    id,
    slot: 'arma',
    setId: null,
    name: `Pieza ${id}`,
    stats: {},
  });

  it('pregunta antes, diciendo cuantas piezas se lleva por delante', async () => {
    repoCon([juego('mi-juego', 'Mi juego')]);
    conPiezas([pieza('a'), pieza('b'), pieza('c')]);
    render(<Sonda />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Mi juego' }));

    expect(await screen.findByText('Delete Mi juego?')).toBeTruthy();
    expect(screen.getByText(/deletes the 3 items/i)).toBeTruthy();
    expect(borrados.remove).toEqual([]);
  });

  it('lo dice distinto cuando todavia no hay piezas', async () => {
    repoCon([juego('mi-juego', 'Mi juego')]);
    render(<Sonda />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Mi juego' }));

    expect(await screen.findByText(/no items yet/i)).toBeTruthy();
  });

  it('al confirmar borra la ficha Y los datos del juego', async () => {
    repoCon([juego('mi-juego', 'Mi juego')]);
    render(<Sonda />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Mi juego' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete everything' }));

    // Las dos: `remove` sola dejaria el inventario huerfano para siempre.
    await waitFor(() => expect(borrados.remove).toEqual(['mi-juego']));
    expect(borrados.clear).toEqual(['mi-juego']);
  });

  it('cancelar no borra nada', async () => {
    repoCon([juego('mi-juego', 'Mi juego')]);
    render(<Sonda />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Mi juego' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete Mi juego?')).toBeNull());
    expect(borrados.remove).toEqual([]);
    expect(borrados.clear).toEqual([]);
  });
});
