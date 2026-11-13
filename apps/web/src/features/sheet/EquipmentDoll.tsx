import type { BaseProfile, Equipment, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { characterIconUrls, characterRarityOf, itemIconUrls } from '../../lib/images';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { sheetCopy } from './copy';

interface EquipmentDollProps {
  template: GameTemplate;
  profile: BaseProfile;
  level: number | null;
  equipment: Equipment;
  itemsById: Map<string, Item>;
  /** Ranura abierta, si hay alguna. */
  openSlot: string | null;
  onOpenSlot: (slotId: string) => void;
  onOpenPicker: () => void;
  onRemoveAll: () => void;
  disabled?: boolean;
}

/**
 * El personaje y sus ranuras. La cabeza (retrato, nombre, nivel y selector)
 * manda; debajo va la rejilla de ranuras. Se evita el "muneco alrededor del
 * retrato" de la demo porque obliga a desordenar el DOM; el orden de lectura
 * queda personaje -> ranuras -> numeros, que es el mismo recorrido visual.
 */
export function EquipmentDoll({
  template,
  profile,
  level,
  equipment,
  itemsById,
  openSlot,
  onOpenSlot,
  onOpenPicker,
  onRemoveAll,
  disabled = false,
}: EquipmentDollProps) {
  const hasEquipment = Object.values(equipment).some((itemId) => itemId !== '');

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-4 border-b border-line pb-4">
        <ItemGlyph
          name={profile.name}
          rarity={template.assets ? characterRarityOf(template.assets, profile) : undefined}
          sources={template.assets ? characterIconUrls(template.assets, profile) : []}
          className="h-14 w-14 text-[15px]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-[22px] font-extrabold tracking-[-0.03em]">{profile.name}</h1>
          <p className="m-0 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {template.name}
            <span aria-hidden> · </span>
            {level === null ? sheetCopy.noLevel : `${sheetCopy.level} ${level}`}
          </p>
        </div>
        {template.baseProfiles.length > 1 ? (
          <button
            type="button"
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={onOpenPicker}
            className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-foreground transition-colors hover:border-line-strong disabled:opacity-40"
          >
            {sheetCopy.changeCharacter}
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled || !hasEquipment}
          onClick={onRemoveAll}
          className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-foreground transition-colors hover:border-line-strong disabled:opacity-40"
        >
          {sheetCopy.removeAll}
        </button>
      </div>

      <p className="label-caps mt-4 m-0">{sheetCopy.equipment}</p>
      <p className="m-0 mt-1 text-[11.5px] leading-snug text-muted-foreground">{sheetCopy.equipmentHint}</p>

      <ul className="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {template.slots.map((slot) => {
          const item = itemsById.get(equipment[slot.id] ?? '');
          const open = openSlot === slot.id;
          return (
            <li key={slot.id} className="min-w-0">
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${slot.name}: ${item?.name ?? sheetCopy.emptySlot}`}
                onClick={() => onOpenSlot(slot.id)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-2 rounded-[2px] border px-2 py-1.5 text-start transition-colors',
                  open
                    ? 'border-foreground bg-raised'
                    : 'border-line hover:border-line-strong',
                  item ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <ItemGlyph
                  name={item?.name ?? slot.name}
                  rarity={item?.rarity}
                  sources={item ? itemIconUrls(template.assets, item) : []}
                  className="h-8 w-8 text-[9px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    {slot.name}
                  </span>
                  <span className="block truncate text-[12.5px]">
                    {item?.name ?? sheetCopy.emptySlot}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
