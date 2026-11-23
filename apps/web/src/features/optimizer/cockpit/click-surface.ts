/**
 * Superficie clicable: la barra de setup y la de comparación se abren y cierran
 * desde cualquier punto que no sea un control. Un clic que viene de seleccionar
 * texto tampoco alterna, para no cerrar la hoja mientras se copia un valor.
 */
const CONTROLS =
  'a, button, input, select, textarea, label, [role="radiogroup"], [data-no-toggle]';

const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest(CONTROLS));

export function surfaceToggle(target: EventTarget | null, toggle: () => void): void {
  if (isControl(target)) return;
  if (typeof window !== 'undefined' && window.getSelection()?.toString()) return;
  toggle();
}
