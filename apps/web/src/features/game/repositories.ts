import {
  gameRepository,
  imagesRepository,
  inventoryRepository,
  type GameRepository,
  type ImagesRepository,
  type InventoryRepository,
} from '@zenith/data-access';

let games: GameRepository = gameRepository;
let inventory: InventoryRepository = inventoryRepository;
let images: ImagesRepository = imagesRepository;

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

export function getImagesRepository(): ImagesRepository {
  return images;
}

export function setImagesRepository(next: ImagesRepository): void {
  images = next;
}
