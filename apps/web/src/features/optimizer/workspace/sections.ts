import type { ComponentType } from 'react';

import type { GameTemplate } from '@zenith/shared-types';

import { OptimizerPage } from '../../../app/OptimizerPage';
import {
  IconCharacter,
  IconDamage,
  IconInventory,
  IconOptimize,
  IconOverview,
  IconSkills,
} from '../../../components/icons';
import { DamageCalculatorPage } from '../../damage/DamageCalculatorPage';
import { InventoryPage } from '../../inventory/InventoryPage';
import { OverviewPage } from '../../optimizer/OverviewPage';
import { CharacterSheetPage } from '../../sheet/CharacterSheetPage';
import { SkillTreePage } from '../../skills/SkillTreePage';

export type WorkspaceSectionId =
  | 'overview'
  | 'optimize'
  | 'character'
  | 'inventory'
  | 'skills'
  | 'damage';

export interface WorkspaceSection {
  id: WorkspaceSectionId;
  /** Segmento de URL despues de `/optimizer/:id`; vacio para la seccion base. */
  path: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  Component: ComponentType;
  /** Secciones que dependen de una capacidad declarada en la plantilla. */
  isAvailable?: (template: GameTemplate) => boolean;
}

/**
 * El orden es el de lectura del rail. Las secciones opcionales se esconden si
 * la plantilla no declara la capacidad; las URLs existentes no cambian.
 *
 * La seccion base (`/optimizer/:id`) es Overview: la ficha del juego. Optimize
 * vive en `/optimize`, que es donde se calcula.
 */
export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  {
    id: 'overview',
    path: '',
    label: 'Overview',
    Icon: IconOverview,
    Component: OverviewPage,
  },
  {
    id: 'optimize',
    path: 'optimize',
    label: 'Optimize',
    Icon: IconOptimize,
    Component: OptimizerPage,
  },
  {
    id: 'character',
    path: 'personaje',
    label: 'Character',
    Icon: IconCharacter,
    Component: CharacterSheetPage,
  },
  {
    id: 'inventory',
    path: 'inventario',
    label: 'Inventory',
    Icon: IconInventory,
    Component: InventoryPage,
  },
  {
    id: 'skills',
    path: 'habilidades',
    label: 'Skills',
    Icon: IconSkills,
    Component: SkillTreePage,
    isAvailable: (template) => Boolean(template.skillTrees?.length),
  },
  {
    id: 'damage',
    path: 'dano',
    label: 'Damage',
    Icon: IconDamage,
    Component: DamageCalculatorPage,
    isAvailable: (template) => Boolean(template.damageCalculator),
  },
];

/** Seccion a la que pertenece el splat de la ruta (`''` es Optimize). */
export function sectionFromSplat(splat: string | undefined): WorkspaceSection | undefined {
  const path = (splat ?? '').replace(/^\/+|\/+$/g, '');
  return WORKSPACE_SECTIONS.find((section) => section.path === path);
}

/** URL de una seccion dentro del workspace. */
export function sectionHref(id: string, section: WorkspaceSection): string {
  return `/optimizer/${id}${section.path ? `/${section.path}` : ''}`;
}
