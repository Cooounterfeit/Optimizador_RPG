import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EquipmentRepository } from '@zenith/data-access';
import type { Equipment, Item } from '@zenith/shared-types';

import { setEquipmentRepository } from './repositories';
import { useEquipment } from './useEquipment';

/** Repositorio en memoria: guarda lo que se escribe para simular una recarga. */
const memoryRepo = (saved: Equipment = {}): EquipmentRepository => {
  let current: Equipment = { ...saved };
  return {
    get: vi.fn(async () => ({ ...current })),
    save: vi.fn(async (_gameId: string, _profileId: string, slots: Equipment) => {
      current = { ...slots };
    }),
    removeProfile: vi.fn(async () => undefined),
    removeByGame: vi.fn(async () => undefined),
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useEquipment', () => {
  it('carga el equipo guardado del personaje', async () => {
    setEquipmentRepository(memoryRepo({ weapon: 'sword' }));

    const { result } = renderHook(() => useEquipment('g1', 'nova'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.equipment).toEqual({ weapon: 'sword' });
  });

  it('guarda el equipo por juego y perfil', async () => {
    const repo = memoryRepo();
    setEquipmentRepository(repo);

    const { result } = renderHook(() => useEquipment('g1', 'nova'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.save({ weapon: 'sword', flower: '' });
    });

    expect(repo.save).toHaveBeenCalledWith('g1', 'nova', { weapon: 'sword', flower: '' });
    expect(result.current.equipment).toEqual({ weapon: 'sword', flower: '' });
  });

  it('sigue equipado al volver a montar la pantalla', async () => {
    setEquipmentRepository(memoryRepo());

    const first = renderHook(() => useEquipment('g1', 'nova'));
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    await act(async () => {
      await first.result.current.save({ weapon: 'sword' });
    });
    first.unmount();

    const second = renderHook(() => useEquipment('g1', 'nova'));
    await waitFor(() => expect(second.result.current.ready).toBe(true));
    expect(second.result.current.equipment).toEqual({ weapon: 'sword' });
  });

  it('no esta listo hasta que resuelve la lectura', async () => {
    let resolve!: (equipment: Equipment) => void;
    const pending = new Promise<Equipment>((done) => {
      resolve = done;
    });
    setEquipmentRepository({
      ...memoryRepo(),
      get: vi.fn(() => pending),
    });

    const { result } = renderHook(() => useEquipment('g1', 'nova'));
    expect(result.current.ready).toBe(false);

    await act(async () => {
      resolve({ weapon: 'sword' });
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.equipment).toEqual({ weapon: 'sword' });
  });

  it('queda listo sin equipo cuando la lectura falla', async () => {
    setEquipmentRepository({
      ...memoryRepo(),
      get: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    const { result } = renderHook(() => useEquipment('g1', 'nova'));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.equipment).toEqual({});
  });

  it('no esta listo sin juego o perfil', () => {
    const { result } = renderHook(() => useEquipment(undefined, undefined));

    expect(result.current.ready).toBe(false);
    expect(result.current.equipment).toEqual({});
  });

  it('descarta las piezas que ya no estan en el inventario', async () => {
    const repo = memoryRepo({ weapon: 'gone', flower: 'kept' });
    setEquipmentRepository(repo);

    const items = [{ id: 'kept' }] as unknown as Item[];
    const { result } = renderHook(() => useEquipment('g1', 'nova', items));

    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(result.current.equipment).toEqual({ flower: 'kept' }));
    expect(repo.save).toHaveBeenCalledWith('g1', 'nova', { flower: 'kept' });
  });

  it('no limpia nada mientras el inventario es desconocido', async () => {
    const repo = memoryRepo({ weapon: 'sword' });
    setEquipmentRepository(repo);

    const { result } = renderHook(() => useEquipment('g1', 'nova', null));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.equipment).toEqual({ weapon: 'sword' });
    expect(repo.save).not.toHaveBeenCalled();
  });
});
