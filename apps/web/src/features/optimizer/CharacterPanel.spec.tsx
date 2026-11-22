import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { CharacterPanel } from './CharacterPanel';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
  baseProfiles: [{ id: 'nova', name: 'Nova', base: { nivel: 1, atk: 10, hp: 100 } }],
  leveling: {
    levelKey: 'nivel',
    min: 1,
    max: 10,
    growth: { atk: '10', hp: '100' },
  },
} as unknown as GameTemplate;

const profile = {
  id: 'nova',
  name: 'Nova',
  base: { nivel: 1, atk: 10, hp: 100 },
} as unknown as BaseProfile;

const rows = () => screen.getAllByRole('rowheader').map((row) => row.getAttribute('aria-label'));
const levelInput = () => screen.getByLabelText('Character level') as HTMLInputElement;

describe('CharacterPanel', () => {
  it('ordena por valor y permite ordenar por nombre', () => {
    render(<CharacterPanel template={template} profile={profile} />);

    expect(rows()).toEqual(['HP', 'ATK']);

    fireEvent.click(screen.getByRole('button', { name: /Stat/ }));
    expect(rows()).toEqual(['ATK', 'HP']);
  });

  it('fija el nivel escrito al salir del campo y guarda la base derivada', async () => {
    const onSaveBase = vi.fn(async () => undefined);
    render(<CharacterPanel template={template} profile={profile} onSaveBase={onSaveBase} />);

    expect(levelInput().type).toBe('number');
    expect(levelInput().value).toBe('1');

    fireEvent.change(levelInput(), { target: { value: '3' } });
    expect(onSaveBase).not.toHaveBeenCalled();

    fireEvent.blur(levelInput());

    await waitFor(() =>
      expect(onSaveBase).toHaveBeenCalledWith(expect.objectContaining({ nivel: 3, atk: 30, hp: 300 })),
    );
  });

  it('permite bajar el nivel de un perfil que ya subió', async () => {
    const onSaveBase = vi.fn(async () => undefined);
    const high = { ...profile, base: { nivel: 9, atk: 90, hp: 900 } } as BaseProfile;
    render(<CharacterPanel template={template} profile={high} onSaveBase={onSaveBase} />);

    fireEvent.change(levelInput(), { target: { value: '2' } });
    fireEvent.blur(levelInput());

    await waitFor(() =>
      expect(onSaveBase).toHaveBeenCalledWith(expect.objectContaining({ nivel: 2, atk: 20, hp: 200 })),
    );
  });

  it('recorta el nivel al rango de la escala', async () => {
    const onSaveBase = vi.fn(async () => undefined);
    render(<CharacterPanel template={template} profile={profile} onSaveBase={onSaveBase} />);

    fireEvent.change(levelInput(), { target: { value: '99' } });
    fireEvent.blur(levelInput());

    await waitFor(() =>
      expect(onSaveBase).toHaveBeenCalledWith(expect.objectContaining({ nivel: 10 })),
    );
    expect(levelInput().value).toBe('10');
  });

  it('explica cuando el juego no define niveles', () => {
    const sinNiveles = { stats: template.stats } as unknown as GameTemplate;
    render(<CharacterPanel template={sinNiveles} profile={profile} onSaveBase={vi.fn()} />);

    expect(screen.getByText(/Levels are not available/)).toBeTruthy();
    expect(levelInput().disabled).toBe(true);
  });

  it('muestra un mensaje si el perfil no tiene stats', () => {
    const sinStats = { ...profile, base: { nivel: 1 } } as BaseProfile;
    render(<CharacterPanel template={template} profile={sinStats} />);

    expect(screen.getByText(/This game has no stats/)).toBeTruthy();
  });

  it('cambia de personaje desde el retrato', () => {
    const onChangeCharacter = vi.fn();
    render(
      <CharacterPanel
        template={template}
        profile={profile}
        onChangeCharacter={onChangeCharacter}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect(onChangeCharacter).toHaveBeenCalledTimes(1);
  });
});
