import { useLayoutEffect, useRef } from 'react';

/**
 * Recuerda el scroll de cada seccion del workspace.
 *
 * El documento es el que scrollea (asi el TopBar sticky y el footer siguen
 * funcionando), y las secciones se ocultan sin desmontarse: sin esto, volver a
 * una seccion apareceria al principio. Todo ocurre en un `useLayoutEffect`
 * porque hay que leer `scrollY` antes de restaurar la seccion nueva.
 */
export function useSectionScrollMemory(activeId: string | undefined): void {
  const positions = useRef(new Map<string, number>());
  const previous = useRef<string | undefined>(activeId);

  useLayoutEffect(() => {
    const from = previous.current;
    if (from && from !== activeId) positions.current.set(from, window.scrollY);
    previous.current = activeId;

    const top = activeId ? positions.current.get(activeId) ?? 0 : 0;
    if (top > 0) window.scrollTo(0, top);
  }, [activeId]);
}
