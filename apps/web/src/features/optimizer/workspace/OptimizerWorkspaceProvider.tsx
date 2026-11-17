import { createContext, useContext, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import type { GameTemplate, Item, SkillSelection } from '@zenith/shared-types';

import { useGame, type GameState } from '../../game/useGame';
import { useInventory, type UseInventoryResult } from '../../inventory/useInventory';
import { useSkillSelection, type SkillSelectionStatus } from '../../skills/useSkillSelection';

export interface WorkspaceSkills {
  selection: SkillSelection;
  save: (next: SkillSelection) => Promise<void>;
  status: SkillSelectionStatus;
  error: string | null;
}

export interface OptimizerWorkspaceValue {
  /** Id del optimizador en la URL. */
  id: string;
  state: GameState;
  retry: () => void;
  template: GameTemplate | undefined;
  sampleItems: Item[];
  gameId: string;
  inventory: UseInventoryResult;
  skills: WorkspaceSkills;
}

const WorkspaceContext = createContext<OptimizerWorkspaceValue | null>(null);

/**
 * Datos que todas las secciones del workspace comparten.
 *
 * Vive aqui y no en cada pagina para que cambiar de seccion no vuelva a pedir
 * la plantilla ni a leer el inventario: es lo que hace que la navegacion no se
 * sienta como cargar una pagina. Solo cubre datos de lectura compartida; el
 * personaje elegido, el equipo puesto y el worker siguen viviendo en su
 * seccion.
 */
export function OptimizerWorkspaceProvider({ children }: { children: ReactNode }) {
  const { id = '' } = useParams();
  const { state, retry } = useGame(id);
  const template = state.status === 'ready' ? state.template : undefined;
  const sampleItems = state.status === 'ready' ? state.sampleItems : [];
  const inventory = useInventory(template?.gameId);
  const { selection, save, status, error } = useSkillSelection(template);

  const value: OptimizerWorkspaceValue = {
    id,
    state,
    retry,
    template,
    sampleItems,
    gameId: template?.gameId ?? '',
    inventory,
    skills: { selection, save, status, error },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useOptimizerWorkspace(): OptimizerWorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useOptimizerWorkspace must be used inside OptimizerWorkspaceProvider.');
  }
  return value;
}
