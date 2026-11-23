import type { ComponentType } from 'react';

import { StatsEditor } from './StatsEditor';

/**
 * Que bloque de la plantilla sabe editarse
 * ========================================
 * `blocks.ts` dice que partes hay y como listarlas, y es dato puro: no sabe de
 * React y asi se prueba sin montar nada. Este registro es la otra mitad, la que
 * dice cual de esas partes ya tiene editor.
 *
 * Estan separados a proposito. Si el editor viviera dentro de `blocks.ts`, ese
 * archivo tendria que volverse `.tsx` y arrastrar React a un sitio que hoy es
 * una lista de funciones puras.
 *
 * Y es un registro y no una cadena de `if` en la pagina por lo de siempre: las
 * historias que quedan de la epica anaden una entrada aqui cada una, en vez de
 * pelearse todas por el mismo bloque de condiciones. Un bloque sin entrada
 * simplemente se muestra y no se edita, que es el estado de seis de los siete.
 */
export const BLOCK_EDITORS: Record<string, ComponentType> = {
  stats: StatsEditor,
};
