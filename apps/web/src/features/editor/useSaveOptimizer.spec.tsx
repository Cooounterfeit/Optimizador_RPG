import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DataAccessError } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { AuthProvider } from '../auth/AuthProvider';
import { SAMPLE_USER, fakeAuthService } from '../auth/test-auth';
import { getGameRepository, setGameRepository } from '../game/repositories';
import { fakeGameRepository, fakeOptimizerRepository } from '../game/testing';
import {
  getOptimizerRepository,
  setOptimizerRepository,
  type OptimizerDraft,
} from '../optimizer/optimizer-repository';

import { buildSkeleton } from './skeleton';
import { useSaveOptimizer } from './useSaveOptimizer';

/**
 * El guardado en la cuenta tiene cuatro caminos y tres de ellos NO guardan.
 * Son los que se prueban con mas cuidado: guardar sin sesion es lo que la RLS
 * rechazaria, y un boton que lo intente igual deja al autor con un error de
 * Postgres en la cara en vez de una pantalla de login.
 */

const plantilla: GameTemplate = buildSkeleton({ name: 'Mi juego' }, 'mi-juego');

const realGames = getGameRepository();
const realOptimizers = getOptimizerRepository();

let juegos = fakeGameRepository();
let enviados: { id?: string; draft: OptimizerDraft }[] = [];

const nubeOk = () => {
  enviados = [];
  setOptimizerRepository(
    fakeOptimizerRepository({
      createOptimizer: async (draft) => {
        enviados.push({ draft });
        return 'uuid-nuevo';
      },
      updateOptimizer: async (id, draft) => {
        enviados.push({ id, draft });
      },
    }),
  );
};

/** Deja ver a donde navego el hook. */
let ruta = '';
function Donde() {
  ruta = useLocation().pathname + useLocation().search;
  return null;
}

const envoltura =
  (user: Parameters<typeof fakeAuthService>[0]) =>
  ({ children }: { children: ReactNode }) => {
    const { service } = fakeAuthService(user);
    return (
      <MemoryRouter initialEntries={['/optimizer/mi-juego/configuracion']}>
        <AuthProvider service={service}>
          {children}
          <Donde />
        </AuthProvider>
      </MemoryRouter>
    );
  };

const conSesion = envoltura({ initialUser: SAMPLE_USER });
const sinSesion = envoltura({ initialUser: null });

/** Sin Supabase el proveedor no recibe servicio: `service={null}`. */
const sinCuentas = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider service={null}>{children}</AuthProvider>
  </MemoryRouter>
);

type Envoltura = ({ children }: { children: ReactNode }) => JSX.Element;

const montar = (wrapper: Envoltura) =>
  renderHook(() => useSaveOptimizer(plantilla), { wrapper });

beforeEach(() => {
  juegos = fakeGameRepository();
  setGameRepository(juegos.repo);
  nubeOk();
  ruta = '';
});

afterEach(() => {
  setGameRepository(realGames);
  setOptimizerRepository(realOptimizers);
});

describe('sin cuentas configuradas', () => {
  it('no ofrece guardar', async () => {
    const { result } = montar(sinCuentas);

    await waitFor(() => expect(result.current.availability).toBe('unavailable'));
  });

  it('y si alguien llama a guardar igual, no manda nada', async () => {
    const { result } = montar(sinCuentas);
    await waitFor(() => expect(result.current.availability).toBe('unavailable'));

    await act(async () => {
      await result.current.save(false);
    });

    expect(enviados).toEqual([]);
  });
});

describe('sin sesion', () => {
  it('pide iniciar sesion', async () => {
    const { result } = montar(sinSesion);

    await waitFor(() => expect(result.current.availability).toBe('needsSession'));
  });

  it('manda a /login recordando donde estaba', async () => {
    const { result } = montar(sinSesion);
    await waitFor(() => expect(result.current.availability).toBe('needsSession'));

    act(() => result.current.goSignIn());

    expect(ruta).toBe(
      '/login?next=%2Foptimizer%2Fmi-juego%2Fconfiguracion',
    );
  });

  it('guardar no llega a la nube', async () => {
    const { result } = montar(sinSesion);
    await waitFor(() => expect(result.current.availability).toBe('needsSession'));

    await act(async () => {
      await result.current.save(true);
    });

    expect(enviados).toEqual([]);
    expect(juegos.saved).toEqual([]);
  });
});

describe('con sesion', () => {
  it('el primer guardado inserta', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(false);
    });

    expect(enviados).toHaveLength(1);
    expect(enviados[0].id).toBeUndefined();
    expect(result.current.link).toEqual({ remoteId: 'uuid-nuevo', shared: false });
    expect(result.current.phase).toBe('saved');
  });

  it('el segundo actualiza la misma fila en vez de duplicarla', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(false);
    });
    await act(async () => {
      await result.current.save(false);
    });

    expect(enviados).toHaveLength(2);
    expect(enviados[1].id).toBe('uuid-nuevo');
  });

  it('compartir con la comunidad es decision del autor y viaja tal cual', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(true);
    });

    expect(enviados[0].draft.shared).toBe(true);
  });

  it('el vinculo queda en la fila local, para reconocerla la proxima vez', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(true);
    });

    expect(juegos.saved).toHaveLength(1);
    expect(juegos.saved[0]).toMatchObject({
      id: 'mi-juego',
      remoteId: 'uuid-nuevo',
      shared: true,
    });
  });

  it('los objetos del jugador no van en el envio', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(false);
    });

    expect(Object.keys(enviados[0].draft).sort()).toEqual(['shared', 'template']);
  });
});

describe('cuando la nube falla', () => {
  beforeEach(() => {
    enviados = [];
    setOptimizerRepository(
      fakeOptimizerRepository({
        createOptimizer: async () => {
          throw new DataAccessError('value too long for type character varying(80)');
        },
      }),
    );
  });

  it('lo dice, con el detalle, en vez de fingir que guardo', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(false);
    });

    expect(result.current.phase).toBe('failed');
    expect(result.current.error).toBeTruthy();
    expect(result.current.detail).toContain('character varying(80)');
  });

  it('no deja un vinculo a una fila que no existe', async () => {
    const { result } = montar(conSesion);
    await waitFor(() => expect(result.current.availability).toBe('ready'));

    await act(async () => {
      await result.current.save(false);
    });

    expect(result.current.link).toBeNull();
    expect(juegos.saved).toEqual([]);
  });
});
