import { expectTypeOf, it } from 'vitest';

import type {
  InventoryItem,
  LocalInventoryItem,
  Optimizer,
  Profile,
  Subscription,
  Vote,
} from '../index.js';

it('expone los tipos de dominio de TEC-07', () => {
  expectTypeOf<Profile>().toHaveProperty('display_name');
  expectTypeOf<Profile>().toHaveProperty('role');
  expectTypeOf<Optimizer>().toHaveProperty('template');
  expectTypeOf<Optimizer>().toHaveProperty('published');
  expectTypeOf<Vote>().toHaveProperty('value');
  expectTypeOf<Subscription>().toHaveProperty('plan');
  expectTypeOf<InventoryItem>().toHaveProperty('stats');
  expectTypeOf<LocalInventoryItem>().toHaveProperty('id');
});
