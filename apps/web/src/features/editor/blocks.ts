import { statReferences } from '@zenith/core-engine';
import type { GameTemplate } from '@zenith/shared-types';

/**
 * Las partes de una plantilla
 * ===========================
 * Un registro, no un componente con ocho secciones escritas a mano. Cada parte
 * declara como se llama, como contar lo que tiene, si el juego puede funcionar
 * sin ella, y como listar sus elementos para mostrarlos.
 *
 * La razon es lo que viene despues: CFG-01 a CFG-11 convierten estas partes en
 * editables, una por una. Con el registro, cada historia toca su propia entrada
 * y nada mas. Sin el, las once historias pelean por el mismo archivo.
 *
 * `required` no es decoracion: marca lo que el motor necesita para poder
 * buscar. Un juego sin conjuntos es perfectamente valido; uno sin objetivos no
 * sabe que maximizar.
 */

export interface BlockEntry {
  /** Lo que se ve en la primera columna. */
  name: string;
  /** El identificador tecnico, util para el autor que escribe formulas. */
  id: string;
  /** Una linea con lo que distingue a este elemento de sus hermanos. */
  detail: string;
  /**
   * Si algo mas de la plantilla depende de este elemento. Solo lo calculan los
   * bloques que pueden borrarse, porque es la pregunta que hay que responder
   * antes de ofrecer un boton de eliminar.
   *
   * `undefined` significa que este bloque no lo calcula, no que no se use.
   */
  usedIn?: number;
}

export interface ConfigBlock {
  id: string;
  /** Titulo de la seccion. */
  label: string;
  /** Una linea explicando para que sirve esta parte. */
  hint: string;
  /** Sin esto el optimizador no puede buscar. */
  required: boolean;
  /**
   * Si la lista se puede buscar y ordenar. Se declara aqui, como dato, para
   * que la pagina no tenga que saber de que bloque se trata: cuando otro
   * bloque crezca lo suficiente, es cambiar un booleano.
   */
  searchable?: boolean;
  /** Que decir cuando no hay nada. Sin esto se usa el texto generico. */
  empty?: string;
  entries: (template: GameTemplate) => BlockEntry[];
}

/** Para que una lista vacia no se vea igual que un dato ausente. */
const noName = (value: string | undefined, fallback: string): string =>
  value && value.trim() ? value : fallback;

export const CONFIG_BLOCKS: ConfigBlock[] = [
  {
    id: 'stats',
    label: 'Stats',
    hint: 'The numbers a piece of gear can carry.',
    required: true,
    searchable: true,
    empty: 'You have not created any attributes yet. Create the first one.',
    entries: (t) =>
      t.stats.map((stat) => ({
        name: stat.name,
        id: stat.id,
        // Sin inventario a proposito: la pregunta del criterio es si la usan
        // las formulas y las restricciones de la PLANTILLA. Contar las piezas
        // diria "en uso" de casi todo y no ayudaria a decidir nada.
        usedIn: statReferences(t, stat.id).refs.length,
        detail: [
          stat.unit === 'percent' ? 'percent' : 'flat',
          stat.aggregate === 'multiply' ? 'multiplies' : 'adds up',
          stat.group ? `in ${stat.group}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      })),
  },
  {
    id: 'slots',
    label: 'Slots',
    hint: 'Where gear goes. One piece per slot.',
    required: true,
    entries: (t) =>
      t.slots.map((slot) => ({
        name: slot.name,
        id: slot.id,
        detail: slot.optional ? 'can be left empty' : 'always filled',
      })),
  },
  {
    id: 'objectives',
    label: 'Objectives',
    hint: 'What the solver maximizes. Without one it has nothing to aim at.',
    required: true,
    entries: (t) =>
      t.objectives.map((objective) => ({
        name: objective.name,
        id: objective.id,
        detail: objective.formula,
      })),
  },
  {
    id: 'profiles',
    label: 'Characters',
    hint: 'The base a build is calculated from.',
    required: true,
    entries: (t) =>
      t.baseProfiles.map((profile) => ({
        name: profile.name,
        id: profile.id,
        detail: `${Object.keys(profile.base).length} base values`,
      })),
  },
  {
    id: 'derived',
    label: 'Derived values',
    hint: 'Numbers computed from other numbers.',
    required: false,
    entries: (t) =>
      t.derived.map((derived) => ({
        name: derived.name,
        id: derived.id,
        detail: derived.formula,
      })),
  },
  {
    id: 'sets',
    label: 'Set bonuses',
    hint: 'Extra stats for wearing several pieces of the same set.',
    required: false,
    entries: (t) =>
      t.sets.map((set) => ({
        name: set.name,
        id: set.id,
        detail:
          set.tiers.map((tier) => `${tier.pieces}pc`).join(' · ') || 'no tiers',
      })),
  },
  {
    id: 'constrainable',
    label: 'Constrainable stats',
    hint: 'Stats the user can put a minimum or maximum on.',
    required: false,
    entries: (t) =>
      t.constrainableStats.map((id) => ({
        name: noName(t.stats.find((stat) => stat.id === id)?.name, id),
        id,
        detail: t.stats.some((stat) => stat.id === id)
          ? ''
          : 'no stat with this id',
      })),
  },
];

/** Las partes que faltan y sin las cuales el optimizador no puede trabajar. */
export const missingRequired = (template: GameTemplate): ConfigBlock[] =>
  CONFIG_BLOCKS.filter(
    (block) => block.required && block.entries(template).length === 0,
  );
