import { useEffect, useRef, useState } from 'react';

import { IconMore } from '../../../components/icons';
import { copy } from '../copy';

/**
 * El menu de los tres puntos de una tarjeta
 * =========================================
 * No hay libreria de componentes en el proyecto y no se agrega una por un
 * desplegable. Lo que si se respeta es lo que un desplegable tiene que hacer
 * para no ser una trampa:
 *
 *  - Se anuncia como menu (`aria-haspopup`) y dice si esta abierto.
 *  - Escape lo cierra y devuelve el foco al boton, que es por donde se llego.
 *  - Un clic fuera lo cierra, porque si no queda abierto para siempre.
 *  - Cada opcion es un `menuitem` de verdad, no un `div` con un `onClick`.
 *
 * El boton lleva el nombre de la tarjeta en su etiqueta accesible: hay uno por
 * fila, y "mas acciones" repetido cinco veces no distingue ninguna. Es el mismo
 * fallo que ya se arreglo en el listado de atributos.
 */

export interface DraftMenuAction {
  id: string;
  label: string;
  onSelect: () => void;
  /** Lo destructivo se pinta distinto y va al final. */
  danger?: boolean;
}

interface DraftMenuProps {
  /** Para distinguir un boton de otro, en el DOM y para quien escucha. */
  forName: string;
  actions: DraftMenuAction[];
}

export function DraftMenu({ forName, actions }: DraftMenuProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onClick = (event: MouseEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={box}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${copy.drafts.menu}: ${forName}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
      >
        <IconMore className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`${copy.drafts.menu}: ${forName}`}
          className="absolute end-0 top-full z-10 mt-1 min-w-[160px] rounded-[2px] border border-line-strong bg-surface py-1 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
              className={`block w-full px-3 py-1.5 text-start text-[13px] transition-colors hover:bg-raised ${
                action.danger ? 'text-[oklch(0.78_0.16_25)]' : 'text-foreground'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
