import { describe, expect, it } from 'vitest';

import { planSync, type LocalMeta, type RemoteMeta } from './syncPlan.js';

const accion = (l: LocalMeta[], r: RemoteMeta[], ign?: Set<string>) => planSync(l, r, ign)[0]?.kind;
const H = 3_600_000;

describe('un solo lado', () => {
  it('local con nube activa y nada arriba: sube', () => {
    expect(accion([{ id: 'a', updatedAt: 10 * H, cloud: true }], [])).toBe('push');
  });
  it('local sin nube activa: no se toca', () => {
    expect(accion([{ id: 'a', updatedAt: 10 * H }], [])).toBe('none');
  });
  it('solo en la nube: se baja (otro dispositivo)', () => {
    expect(accion([], [{ id: 'a', updatedAt: 10 * H }])).toBe('pull');
  });
  it('borrado aqui a proposito: queda solo en la nube', () => {
    expect(accion([], [{ id: 'a', updatedAt: 10 * H }], new Set(['a']))).toBe('remote-only');
  });
});

describe('los dos lados', () => {
  const base = 10 * H;

  it('iguales: nada', () => {
    expect(accion([{ id: 'a', updatedAt: base, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }])).toBe('none');
  });
  it('cambio solo aqui: sube', () => {
    expect(accion([{ id: 'a', updatedAt: base + H, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }])).toBe('push');
  });
  it('cambio solo en la nube: baja', () => {
    expect(accion([{ id: 'a', updatedAt: base, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base + H }])).toBe('pull');
  });
  it('cambiaron los dos: conflicto', () => {
    expect(accion([{ id: 'a', updatedAt: base + H, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base + 2 * H }])).toBe('conflict');
  });
  it('diferencias de menos de 1 s no cuentan', () => {
    expect(accion([{ id: 'a', updatedAt: base + 300, cloud: true, syncedAt: base }], [{ id: 'a', updatedAt: base }])).toBe('none');
  });
  it('dispositivo nuevo con el mismo juego distinto: pregunta', () => {
    expect(accion([{ id: 'a', updatedAt: base }], [{ id: 'a', updatedAt: base + H }])).toBe('conflict');
  });
  it('dispositivo nuevo con el mismo juego identico: nada', () => {
    expect(accion([{ id: 'a', updatedAt: base }], [{ id: 'a', updatedAt: base }])).toBe('none');
  });
  it('nube apagada para ese juego: no se toca', () => {
    expect(accion([{ id: 'a', updatedAt: base + H, cloud: false, syncedAt: base }], [{ id: 'a', updatedAt: base + 2 * H }])).toBe('none');
  });
});

describe('varios juegos', () => {
  it('una accion por juego, en orden', () => {
    const base = 10 * H;
    const plan = planSync(
      [{ id: 'a', updatedAt: 5, cloud: true }, { id: 'b', updatedAt: 5 }, { id: 'c', updatedAt: base + H, cloud: true, syncedAt: base }],
      [{ id: 'c', updatedAt: base }, { id: 'd', updatedAt: 1 }],
    );
    expect(plan.map((p) => `${p.id}:${p.kind}`).join(' '), plan.map((p) => `${p.id}:${p.kind}`).join(' '))
      .toBe('a:push b:none c:push d:pull');
  });
});
