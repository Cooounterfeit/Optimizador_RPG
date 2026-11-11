import 'fake-indexeddb/auto';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, createInventoryRepository, type ZenithDatabase } from '@zenith/data-access';
import type { Item } from '@zenith/shared-types';

import { setInventoryRepository } from '../game/repositories';
import { useInventory } from './useInventory';

function Probe({ tag }: { tag: string }) {
  const inventory = useInventory('gacha-demo');

  return (
    <div>
      <span data-testid={`count-${tag}`}>
        {inventory.items === null ? '…' : inventory.items.length}
      </span>
      <button
        onClick={() =>
          void inventory.add({
            id: `item-${tag}`,
            slot: 'weapon',
            setId: null,
            name: `Item ${tag}`,
            stats: { atk: 1 },
          })
        }
      >
        add {tag}
      </button>
    </div>
  );
}

const item = (id: string): Item => ({
  id,
  slot: 'weapon',
  setId: null,
  name: id,
  stats: { atk: 1 },
});

describe('useInventory', () => {
  let database: ZenithDatabase;
  let name: string;

  beforeEach(() => {
    name = `web-inventory-${crypto.randomUUID()}`;
    database = createDb(name);
    setInventoryRepository(createInventoryRepository(database));
  });

  afterEach(async () => {
    database.close();
    await indexedDB.deleteDatabase(name);
  });

  it('sincroniza dos pantallas que comparten el juego', async () => {
    render(
      <>
        <Probe tag="left" />
        <Probe tag="right" />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('count-left').textContent).toBe('0'));
    await waitFor(() => expect(screen.getByTestId('count-right').textContent).toBe('0'));

    fireEvent.click(screen.getByRole('button', { name: 'add left' }));

    await waitFor(() => expect(screen.getByTestId('count-left').textContent).toBe('1'));
    await waitFor(() => expect(screen.getByTestId('count-right').textContent).toBe('1'));
  });

  it('una lectura vieja no pisa a la mas nueva', async () => {
    const reads: Array<(items: Item[]) => void> = [];
    setInventoryRepository({
      addItem: async () => undefined,
      getAll: () =>
        new Promise<Item[]>((resolve) => {
          reads.push(resolve);
        }),
      getById: async () => undefined,
      updateItem: async () => undefined,
      removeItem: async () => undefined,
      searchItems: async () => [],
      removeByGame: async () => undefined,
    });

    render(<Probe tag="left" />);

    await waitFor(() => expect(reads.length).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'add left' }));
    await waitFor(() => expect(reads.length).toBe(2));

    reads[1]([item('new')]);
    await waitFor(() => expect(screen.getByTestId('count-left').textContent).toBe('1'));

    reads[0]([]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId('count-left').textContent).toBe('1');
  });
});
