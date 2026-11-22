import { createElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type { GameTemplate, Item, StatDef } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { itemIconUrls } from '../../lib/images';
import { inventoryCopy } from './copy';
import { ItemGlyph } from './ItemGlyph';

interface ItemHoverCardProps {
  template: GameTemplate;
  /** Sin pieza no hay tarjeta: el envoltorio se pinta igual. */
  item: Item | undefined;
  as?: 'div' | 'span' | 'li';
  className?: string;
  children: ReactNode;
  /** 0 abre en el acto, sin temporizador (util para las pruebas). */
  openDelayMs?: number;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 80;
const GAP = 6;
const MARGIN = 8;
const CARD_WIDTH = 260;

const formatValue = (value: number, stat: StatDef | undefined): string => {
  const formatted = numberFormat.format(value);
  if (stat?.aggregate === 'multiply') return `×${formatted}`;
  return `${formatted}${stat?.unit === 'percent' ? '%' : ''}`;
};

/**
 * Tarjeta con el detalle de una pieza al pasar el cursor o al recibir foco.
 * No suma dependencias: el proyecto no tiene primitiva de tooltip y no se
 * agrega una libreria por esto.
 *
 * La tarjeta va a un portal con `position: fixed` porque el selector de ranura
 * y la tabla del inventario viven dentro de contenedores que recortan
 * (`overflow`); un elemento absoluto quedaria cortado.
 */
export function ItemHoverCard({
  template,
  item,
  as = 'div',
  className,
  children,
  openDelayMs = OPEN_DELAY_MS,
}: ItemHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();

  const schedule = (next: boolean) => {
    clearTimeout(timer.current);
    if (next && openDelayMs === 0) {
      setOpen(true);
      return;
    }
    timer.current = setTimeout(() => setOpen(next), next ? openDelayMs : CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const box = anchor.current?.getBoundingClientRect();
    const size = card.current?.getBoundingClientRect();
    if (!box) return;
    const width = size?.width || CARD_WIDTH;
    const height = size?.height ?? 0;
    let top = box.bottom + GAP;
    if (height > 0 && top + height > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, box.top - height - GAP);
    }
    const left = Math.min(Math.max(MARGIN, box.left), Math.max(MARGIN, window.innerWidth - width - MARGIN));
    setPosition({ top, left });
  }, [open]);

  const slotNames = item
    ? [item.slot, ...(item.slots ?? [])]
        .filter((slotId, index, list) => list.indexOf(slotId) === index)
        .map((slotId) => template.slots.find((slot) => slot.id === slotId)?.name ?? slotId)
    : [];
  const set = item?.setId ? template.sets.find((entry) => entry.id === item.setId) : undefined;
  const statEntries = item ? Object.entries(item.stats) : [];
  const requires = item ? Object.entries(item.requires ?? {}) : [];
  const statName = (statId: string) =>
    template.stats.find((stat) => stat.id === statId)?.name ?? statId;

  const portal =
    open && item
      ? createPortal(
          <div
            ref={card}
            role="tooltip"
            id={id}
            style={{
              position: 'fixed',
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="pointer-events-none z-[60] w-[260px] max-w-[calc(100vw-16px)] rounded-[4px] border border-line-strong bg-surface p-3 text-foreground shadow-[0_16px_40px_-20px_oklch(0_0_0/0.85)]"
          >
            <div className="flex items-start gap-2.5">
              <ItemGlyph
                name={item.name}
                rarity={item.rarity}
                sources={itemIconUrls(template.assets, item)}
                className="h-11 w-11 text-[11px]"
              />
              <div className="min-w-0 flex-1">
                <p className="label-caps m-0">
                  {slotNames.join(' · ') || inventoryCopy.card.slot}
                </p>
                <p className="m-0 mt-0.5 text-[13px] font-semibold leading-snug">
                  {item.name}
                </p>
                <p className="m-0 mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  {[
                    set?.name ?? inventoryCopy.noSet,
                    item.level === undefined ? null : inventoryCopy.level(item.level),
                    item.rarity === undefined
                      ? null
                      : `${inventoryCopy.card.rarity} ${item.rarity}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            {statEntries.length === 0 ? (
              <p className="m-0 mt-2 border-t border-line pt-2 text-[11.5px] text-muted-foreground">
                {inventoryCopy.card.noStats}
              </p>
            ) : (
              <ul className="m-0 mt-2 list-none divide-y divide-line border-t border-line p-0">
                {statEntries.map(([statId, value]) => (
                  <li
                    key={statId}
                    className="flex items-baseline justify-between gap-3 py-1"
                  >
                    <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                      {statName(statId)}
                    </span>
                    <span className="shrink-0 font-mono text-[11.5px] tabular-nums">
                      {formatValue(
                        value,
                        template.stats.find((stat) => stat.id === statId),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {requires.length > 0 ? (
              <>
                <p className="label-caps m-0 mt-2 border-t border-line pt-2">
                  {inventoryCopy.card.requires}
                </p>
                <ul className="m-0 mt-1 list-none p-0">
                  {requires.map(([statId, value]) => (
                    <li
                      key={statId}
                      className="flex items-baseline justify-between gap-3 py-0.5"
                    >
                      <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                        {statName(statId)}
                      </span>
                      <span className="shrink-0 font-mono text-[11.5px] tabular-nums">
                        {formatValue(
                          value,
                          template.stats.find((stat) => stat.id === statId),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return createElement(
    as,
    {
      ref: anchor,
      className: cn('min-w-0', className),
      onMouseEnter: () => schedule(true),
      onMouseLeave: () => schedule(false),
      onFocus: () => schedule(true),
      onBlur: () => schedule(false),
      'aria-describedby': open ? id : undefined,
    },
    children,
    portal,
  );
}
