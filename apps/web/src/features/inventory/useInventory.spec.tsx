import 'fake-indexeddb/auto';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb, createInventoryRepository, type ZenithDatabase } from '@zenith/data-access';

import { setInventoryRepository } from '../game/repositories';
import { useInventory } from './useInventory';

function Probe({ tag }: { tag: string }) {
  const inventory = useInventory('genshin');

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
});
