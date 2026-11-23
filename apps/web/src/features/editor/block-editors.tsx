import type { ComponentType } from 'react';

import { StatDeleteRow } from './StatDeleteRow';
import { StatEditRow } from './StatEditRow';
import { StatsEditor } from './StatsEditor';

/**
 * Que bloque de la plantilla sabe editarse
 * ========================================
 * `blocks.ts` dice que partes hay y como listarlas, y es dato puro: no sabe de
 * React y asi se prueba sin montar nada. Este registro es la otra mitad, la que
 * dice cual de esas partes ya tiene editor, y de que tipo.
 *
 * `Create` se pinta debajo de la lista. `Edit` se pinta EN EL SITIO de la fila
 * que se esta editando, porque con cuarenta entradas un formulario que aparece
 * al final obliga a recordar cual se estaba tocando.
 *
 * Es un registro y no una cadena de `if` en la pagina por lo de siempre: las
 * historias que quedan anaden una entrada aqui cada una. Un bloque sin entrada
 * se muestra y no se edita, que es el estado de seis de los siete.
 */
/** `onDone` puede traer el mensaje de exito que la seccion muestra despues. */
export type RowDone = (message?: string) => void;

export interface BlockEditor {
  Create?: ComponentType;
  Edit?: ComponentType<{ id: string; onDone: RowDone }>;
  Delete?: ComponentType<{ id: string; onDone: RowDone }>;
}

export const BLOCK_EDITORS: Record<string, BlockEditor> = {
  stats: { Create: StatsEditor, Edit: StatEditRow, Delete: StatDeleteRow },
};
