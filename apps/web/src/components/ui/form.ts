/**
 * Clases compartidas de formulario
 * ================================
 * Vivian en `features/auth/AuthShell`, que era donde aparecio el primer
 * formulario. Cuando el editor empezo a tener los suyos, importarlas desde
 * `auth` era lo unico que ataba una cosa con la otra, y habia un comentario
 * pidiendo perdon por ello en cada sitio.
 *
 * No es un componente: son tres cadenas. Se quedan como cadenas y no como un
 * `<Input>` a proposito, porque cada formulario coloca su etiqueta, su pista y
 * su mensaje de error de forma distinta, y envolverlo todo obligaria a pasar
 * seis props para decir menos.
 */

export const fieldClass =
  'h-[38px] w-full rounded-[2px] border border-line bg-surface px-3 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-line-strong';

export const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground';

export const errorClass =
  'mb-4 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12.5px] text-[oklch(0.78_0.16_25)]';
