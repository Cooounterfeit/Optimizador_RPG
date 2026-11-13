import {
  equipmentRepository,
  gameRepository,
  imagesRepository,
  inventoryRepository,
  levelHistoryRepository,
  profileBaseRepository,
  skillsRepository,
  type EquipmentRepository,
  type GameRepository,
  type ImagesRepository,
  type InventoryRepository,
  type LevelHistoryRepository,
  type ProfileBaseRepository,
  type SkillsRepository,
} from '@zenith/data-access';

let games: GameRepository = gameRepository;
let inventory: InventoryRepository = inventoryRepository;
let images: ImagesRepository = imagesRepository;
let equipment: EquipmentRepository = equipmentRepository;
let levels: LevelHistoryRepository = levelHistoryRepository;
let profileBase: ProfileBaseRepository = profileBaseRepository;
let skills: SkillsRepository = skillsRepository;

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

export function getEquipmentRepository(): EquipmentRepository {
  return equipment;
}

export function setEquipmentRepository(next: EquipmentRepository): void {
  equipment = next;
}

export function getLevelHistoryRepository(): LevelHistoryRepository {
  return levels;
}

export function setLevelHistoryRepository(next: LevelHistoryRepository): void {
  levels = next;
}

export function getProfileBaseRepository(): ProfileBaseRepository {
  return profileBase;
}

export function setProfileBaseRepository(next: ProfileBaseRepository): void {
  profileBase = next;
}

export function getSkillsRepository(): SkillsRepository {
  return skills;
}

export function setSkillsRepository(next: SkillsRepository): void {
  skills = next;
}
