import { useMemo, useState } from 'react';

import { listWeapons, weaponItem } from '@zenith/adapters';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { setIconUrl, weaponIconUrl } from '../../lib/images';
import { EmptyState } from '../catalog/components/EmptyState';
import { inventoryCopy } from './copy';
import { ItemGlyph } from './ItemGlyph';

interface CatalogPanelProps {
  template: GameTemplate;
  onAdd: (item: Item) => Promise<void>;
}

const controlClass =
  'h-[32px] rounded-[2px] border border-line-strong bg-transparent px-2 text-[12px] text-foreground';

export function CatalogPanel({ template, onAdd }: CatalogPanelProps) {
  const [view, setView] = useState<'weapons' | 'sets'>('weapons');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [level, setLevel] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const weapons = useMemo(() => listWeapons(), []);
  const types = useMemo(
    () => [...new Set(weapons.map((weapon) => weapon.type).filter(Boolean))].sort() as string[],
    [weapons],
  );
  const weaponSlot = useMemo(
    () => template.slots.find((slot) => /weapon|arma/i.test(`${slot.id} ${slot.name}`))?.id,
    [template],
  );

  const needle = query.trim().toLowerCase();
  const filteredWeapons = weapons.filter((weapon) => {
    if (type && weapon.type !== type) return false;
    if (rarity && weapon.rarity !== Number(rarity)) return false;
    if (!needle) return true;
    return weapon.name.toLowerCase().includes(needle);
  });

  const sets = template.sets.filter((set) => {
    if (!needle) return true;
    return set.name.toLowerCase().includes(needle);
  });

  const statName = (id: string) => template.stats.find((stat) => stat.id === id)?.name ?? id;
  const statUnit = (id: string) => {
    const stat = template.stats.find((entry) => entry.id === id);
    if (stat?.unit !== 'percent' || stat.name.includes('%')) return '';
    return '%';
  };

  const addWeapon = async (key: string) => {
    setError(null);
    setBusy(true);
    try {
      const item = weaponItem(key, level, weaponSlot);
      if (!item) throw new Error(inventoryCopy.catalog.weaponError);
      await onAdd({ ...item, id: `${item.id}-${crypto.randomUUID().slice(0, 8)}` });
      setAdding(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : inventoryCopy.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4" role="tabpanel" aria-label={inventoryCopy.tabs.catalog}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
        {(['weapons', 'sets'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={cn(
              'rounded-[2px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] transition-colors',
              view === id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {id === 'weapons'
              ? `${inventoryCopy.catalog.weapons} (${weapons.length})`
              : `${inventoryCopy.catalog.sets} (${template.sets.length})`}
          </button>
        ))}

        <label className="sr-only" htmlFor="catalog-search">
          {inventoryCopy.catalog.search}
        </label>
        <input
          id="catalog-search"
          type="search"
          className={cn(controlClass, 'ml-auto min-w-[180px] flex-1 sm:max-w-[280px]')}
          placeholder={inventoryCopy.catalog.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {view === 'weapons' ? (
          <>
            <select
              aria-label={inventoryCopy.catalog.type}
              className={controlClass}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">{inventoryCopy.catalog.allTypes}</option>
              {types.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <select
              aria-label={inventoryCopy.catalog.rarity}
              className={controlClass}
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
            >
              <option value="">{inventoryCopy.catalog.allRarities}</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}★
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[12.5px] text-[oklch(0.78_0.16_25)]">
          {error}
        </p>
      ) : null}

      {view === 'weapons' ? (
        filteredWeapons.length === 0 ? (
          <EmptyState title={inventoryCopy.emptyFiltered} body={inventoryCopy.catalog.empty} />
        ) : (
          <ul aria-label={inventoryCopy.catalog.weapons} className="mt-2 divide-y divide-line">
            {filteredWeapons.map((weapon) => (
              <li
                key={weapon.key}
                className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-2 py-2 last:border-b-0"
              >
                <ItemGlyph
                  name={weapon.name}
                  rarity={weapon.rarity}
                  src={weaponIconUrl(weapon.key)}
                  className="h-9 w-9 text-[10px]"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{weapon.name}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                    {weapon.type ?? inventoryCopy.catalog.unknownType} · {weapon.rarity}★ ·{' '}
                    {inventoryCopy.catalog.maxLevel(weapon.maxLevel)}
                  </p>
                </div>

                {adding === weapon.key ? (
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`level-${weapon.key}`}>
                      {inventoryCopy.catalog.level}
                    </label>
                    <input
                      id={`level-${weapon.key}`}
                      type="number"
                      min={1}
                      max={weapon.maxLevel}
                      value={level}
                      onChange={(event) => setLevel(Number(event.target.value))}
                      className={cn(controlClass, 'w-[72px] font-mono tabular-nums')}
                    />
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void addWeapon(weapon.key)}
                    >
                      {inventoryCopy.catalog.add}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
                      {inventoryCopy.cancel}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLevel(Math.min(90, weapon.maxLevel));
                      setAdding(weapon.key);
                    }}
                  >
                    {inventoryCopy.catalog.add}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : sets.length === 0 ? (
        <EmptyState title={inventoryCopy.emptyFiltered} body={inventoryCopy.catalog.emptySet} />
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((set) => (
            <article
              key={set.id}
              className="flex gap-3 rounded-[4px] border border-line bg-surface px-3 py-3"
            >
              <ItemGlyph
                name={set.name}
                src={setIconUrl(set.id, 'flower')}
                className="h-10 w-10 text-[10px]"
              />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold">{set.name}</p>
                <ul className="mt-1 grid gap-0.5">
                  {set.tiers.map((tier) => (
                    <li
                      key={`${set.id}-${tier.pieces}`}
                      className="font-mono text-[9.5px] leading-snug text-muted-foreground"
                    >
                      {tier.pieces}pc ·{' '}
                      {Object.entries(tier.effects)
                        .map(([id, value]) => `${statName(id)} +${value}${statUnit(id)}`)
                        .join(' · ')}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
