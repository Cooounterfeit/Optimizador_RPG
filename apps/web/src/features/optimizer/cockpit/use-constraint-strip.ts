import { useEffect, useRef } from 'react';

import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { defaultConstraint } from '../conditions';

/**
 * Agregar una condicion desde una tira horizontal: crea la fila, lleva el scroll
 * al final y enfoca el valor para escribir sin tocar el mouse. La barra y la
 * hoja comparten el comportamiento para que se sientan iguales.
 */
export function useConstraintStrip(
  template: GameTemplate,
  constraints: Constraint[],
  onChange: (next: Constraint[]) => void,
) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const wantsFocus = useRef(false);

  useEffect(() => {
    if (!wantsFocus.current) return;
    wantsFocus.current = false;

    const strip = stripRef.current;
    if (!strip) return;

    // Solo mueve el scroller si la fila nueva no entra entera: si entra, mover
    // el scroll recortaria la primera condicion a la mitad.
    const rows = strip.querySelectorAll<HTMLElement>('[data-constraint-row]');
    rows[rows.length - 1]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });

    const inputs = strip.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]');
    inputs[inputs.length - 1]?.focus();
  }, [constraints.length]);

  const add = () => {
    wantsFocus.current = true;
    onChange([...constraints, defaultConstraint(template)]);
  };

  return { stripRef, add };
}
