import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';

import {
  GameTemplateSchema,
  type GameTemplate,
  type Item,
  type SkillSelection,
} from '@zenith/shared-types';

import { gameCopy } from '../../game/copy';
import { getGameRepository } from '../../game/repositories';
import { isUuid } from '../../game/sources';
import { useGame, type GameState } from '../../game/useGame';
import {
  useInventory,
  type UseInventoryResult,
} from '../../inventory/useInventory';
import {
  useSkillSelection,
  type SkillSelectionStatus,
} from '../../skills/useSkillSelection';

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
  /** Si el optimizador esta visible en el catalogo. */
  published: boolean;
  /**
   * Si un cambio guardado aqui se va a poder volver a leer. Vale false para un
   * optimizador abierto desde el catalogo: ver `saveTemplate`.
   */
  editable: boolean;
  /**
   * Guarda la plantilla y la deja aplicada en el acto, sin volver a cargar.
   *
   * Es el UNICO camino de escritura de la plantilla, y existe antes que
   * cualquier editor a proposito: los seis bloques que CFG-01 a CFG-11 van a
   * volver editables comparten este, en vez de que cada uno guarde a su manera.
   *
   * No pasa por `loading`: llamar a `retry` tras cada cambio vaciaria el
   * workspace entero y lo volveria a montar, un parpadeo por edicion.
   *
   * Lanza si la plantilla resultante no cumple el esquema. Quien edita decide
   * que hacer con el error; lo que no puede pasar es guardar algo que luego no
   * se pueda abrir.
   */
  saveTemplate: (next: GameTemplate) => Promise<void>;
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
export function OptimizerWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { id = '' } = useParams();
  const { state, retry } = useGame(id);
  const loaded = state.status === 'ready' ? state.template : undefined;

  /**
   * Lo editado en esta sesion, que manda sobre lo cargado hasta que llegue una
   * carga nueva. Una carga nueva siempre gana: viene del repositorio, donde ya
   * esta lo que se guardo.
   */
  const [edited, setEdited] = useState<GameTemplate | undefined>(undefined);
  useEffect(() => {
    setEdited(undefined);
  }, [loaded]);

  const template = edited ?? loaded;
  const sampleItems = state.status === 'ready' ? state.sampleItems : [];
  const published = state.status === 'ready' ? state.published : false;

  /**
   * Se puede escribir cuando lo guardado se va a poder volver a leer por este
   * mismo id. `saveTemplate` guarda bajo `template.gameId` y `localSource` lee
   * por el id de la URL, asi que tienen que coincidir. Y el id no puede ser un
   * uuid, porque entonces `remoteSource` lo resuelve primero y taparia la copia
   * local con la version del servidor.
   *
   * Lo de arriba es otra forma de decir: un optimizador del catalogo todavia no
   * se edita aqui. Escribir en Supabase exige sesion, porque la politica RLS
   * cuelga de `auth.uid()`, y eso vive en la epica del hub.
   */
  const editable =
    template !== undefined && id === template.gameId && !isUuid(id);

  const saveTemplate = useCallback(async (next: GameTemplate) => {
    const parsed = GameTemplateSchema.safeParse(next);
    if (!parsed.success) throw new Error(gameCopy.errors.invalid);
    await getGameRepository().save({
      id: parsed.data.gameId,
      template: parsed.data,
    });
    setEdited(parsed.data);
  }, []);
  const inventory = useInventory(template?.gameId);
  const { selection, save, status, error } = useSkillSelection(template);

  const value: OptimizerWorkspaceValue = {
    id,
    state,
    retry,
    template,
    sampleItems,
    published,
    editable,
    saveTemplate,
    gameId: template?.gameId ?? '',
    inventory,
    skills: { selection, save, status, error },
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useOptimizerWorkspace(): OptimizerWorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error(
      'useOptimizerWorkspace must be used inside OptimizerWorkspaceProvider.',
    );
  }
  return value;
}
