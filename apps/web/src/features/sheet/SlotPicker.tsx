import { useId, useState } from 'react';

import type { GameTemplate, Item, SlotDef } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { itemIconUrls } from '../../lib/images';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { sheetCopy } from './copy';

interface SlotPickerProps {
  template: GameTemplate;
  slot: SlotDef;
  /** Solo las piezas que caben en esta ranura. */
  items: Item[];
  /** Ranura -> id, para marcar lo que ya esta puesto en otro sitio. */
  equipment: Record<string, string>;
  onPick: (itemId: string) => void;
  onClose: () => void;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const unitOf = (unit: string | undefined): string => {
  if (unit === 'percent') return '%';
  if (unit === 'multiply') return '×';
  return '';
};

const itemSummary = (template: GameTemplate, item: Item): string =>
  Object.entries(item.stats)
    .map(([statId, value]) => {
      const stat = template.stats.find((entry) => entry.id === statId);
      const unit = unitOf(stat?.unit);
      return `${stat?.name ?? statId} ${unit === '×' ? '×' : ''}${numberFormat.format(value)}${unit === '×' ? '' : unit}`;
    })
    .join(' · ');

/**
 * Selector de una ranura. Es un panel dentro de la hoja, no un dialogo: el
 * proyecto no tiene primitiva de modal con trampa de foco, y un `role="dialog"`
 * sin eso seria peor que un panel honesto. Escape cierra y el buscador recibe
 * el foco al abrir.
 */
export function SlotPicker({
  template,
  slot,
  items,
  equipment,
  onPick,
  onClose,
}: SlotPickerProps) {
  const [query, setQuery] = useState('');
  const headingId = useId();
  const visible = items
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 80);
  const usedElsewhere = (itemId: string) =>
    Object.entries(equipment).some(([slotId, equipped]) => slotId !== slot.id && equipped === itemId);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 rounded-[2px] border border-line-strong bg-background p-3"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        <h3 id={headingId} className="label-caps m-0">
          {sheetCopy.picker.title(slot.name)}
        </h3>
        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-foreground transition-colors hover:border-line-strong"
            onClick={() => onPick('')}
          >
            {sheetCopy.picker.clear}
          </button>
          <button
            type="button"
            className="h-8 rounded-[2px] border border-transparent px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            {sheetCopy.picker.close}
          </button>
        </div>
      </div>

      <label className="mt-2 block">
        <span className="sr-only">{sheetCopy.picker.search}</span>
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus -- el panel se abre por una accion del jugador
          autoFocus
          type="search"
          value={query}
          placeholder={sheetCopy.picker.search}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8 w-full rounded-[2px] border border-line bg-surface px-2 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
        />
      </label>

      {visible.length === 0 ? (
        <p className="mt-3 text-[11.5px] text-muted-foreground">{sheetCopy.picker.empty}</p>
      ) : (
        <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto overscroll-contain">
          {visible.map((item) => {
            const current = equipment[slot.id] === item.id;
            const elsewhere = usedElsewhere(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={current}
                  onClick={() => onPick(item.id)}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2 py-1.5 pe-1 text-start transition-colors',
                    current ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ItemGlyph
                    name={item.name}
                    rarity={item.rarity}
                    sources={itemIconUrls(template.assets, item)}
                    className="h-8 w-8 text-[9px]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px]">
                      {item.name}
                      {elsewhere ? (
                        <span className="ms-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[oklch(0.78_0.16_60)]">
                          {sheetCopy.picker.equippedElsewhere}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate font-mono text-[10px] tabular-nums text-muted-foreground">
                      {itemSummary(template, item)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
