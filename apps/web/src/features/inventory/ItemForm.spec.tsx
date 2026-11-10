import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { ItemForm } from './ItemForm';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'test',
  name: 'Test game',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'flower', name: 'Flower' },
  ],
  sets: [{ id: 'gladiator', name: 'Gladiator', tiers: [] }],
  derived: [],
  objectives: [{ id: 'score', name: 'Score', description: '', kind: 'linear', formula: 'atk' }],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 100 } }],
  constrainableStats: [],
  extensions: {
    inventory: {
      kind: 'inventory',
      catalogUrl: '/catalog.json',
      rules: {
        format: 'good',
        slots: { weapon: 'weapon', flower: 'flower' },
        stats: { atk: 'atk', hp: 'hp' },
        rarities: [1, 2, 3, 4, 5],
        artifactLevelRange: { min: 0, max: 20 },
        itemLevelRange: { min: 0, max: 99 },
      },
    },
  },
};

const item: Item = {
  id: 'item-1',
  slot: 'weapon',
  setId: null,
  name: 'Sword',
  rarity: 5,
  level: 90,
  stats: { atk: 100 },
};

const renderForm = (onSubmit = vi.fn(async () => undefined), initial?: Item) =>
  render(
    <ItemForm
      template={template}
      initial={initial}
      onSubmit={onSubmit}
      onCancel={() => undefined}
    />,
  );

const fillName = (value: string) =>
  fireEvent.change(screen.getByLabelText('Name'), { target: { value } });

const chooseSlot = (value: string) =>
  fireEvent.change(screen.getByLabelText('Slot'), { target: { value } });

describe('ItemForm', () => {
  it('exige el nombre antes de guardar', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm(onSubmit);

    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Enter a name.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige la ranura', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm(onSubmit);

    fillName('Sword');
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Choose a slot.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('agrega y quita estadisticas y guarda el objeto', async () => {
    const onSubmit = vi.fn(async (_item: Item) => undefined);
    renderForm(onSubmit);

    fillName('Sword');
    chooseSlot('weapon');

    fireEvent.click(screen.getByRole('button', { name: 'Add stat' }));
    fireEvent.change(screen.getByLabelText('Stat 1'), { target: { value: 'atk' } });
    fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: '42' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add stat' }));
    fireEvent.change(screen.getByLabelText('Stat 2'), { target: { value: 'hp' } });
    fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: '10' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove stat' })[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const saved = onSubmit.mock.calls[0][0] as Item;
    expect(saved).toMatchObject({
      name: 'Sword',
      slot: 'weapon',
      setId: null,
      rarity: 1,
      level: 0,
      stats: { atk: 42 },
    });
    expect(saved.id).toMatch(/^item-\d+-/);
  });

  it('rechaza estadisticas repetidas', async () => {
    const onSubmit = vi.fn(async () => undefined);
    renderForm(onSubmit);

    fillName('Sword');
    chooseSlot('weapon');
    fireEvent.click(screen.getByRole('button', { name: 'Add stat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add stat' }));
    fireEvent.change(screen.getByLabelText('Stat 1'), { target: { value: 'atk' } });
    fireEvent.change(screen.getByLabelText('Value 1'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Stat 2'), { target: { value: 'atk' } });
    fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Each stat can appear only once.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('prellena los datos en modo edicion', () => {
    renderForm(vi.fn(async () => undefined), item);

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Sword');
    expect(screen.getByLabelText('Slot')).toHaveProperty('value', 'weapon');
    expect(screen.getByLabelText('Level')).toHaveProperty('value', '90');
    expect(screen.getByLabelText('Stat 1')).toHaveProperty('value', 'atk');
    expect(screen.getByLabelText('Value 1')).toHaveProperty('value', '100');
  });

  it('muestra el error que devuelve el repositorio', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('Disk full');
    });
    renderForm(onSubmit);

    fillName('Sword');
    chooseSlot('weapon');
    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Disk full');
  });
});
