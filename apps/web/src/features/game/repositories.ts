import {
  gameRepository,
  inventoryRepository,
  type GameRepository,
  type InventoryRepository,
} from '@zenith/data-access';

let games: GameRepository = gameRepository;
let inventory: InventoryRepository = inventoryRepository;

export function getGameRepository(): GameRepository {
  return games;
}

export function setGameRepository(next: GameRepository): void {
  games = next;
}

export function getInventoryRepository(): InventoryRepository {
  return inventory;
}

export function setInventoryRepository(next: InventoryRepository): void {
  inventory = next;
}
