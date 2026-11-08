import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { downloadJson, exportGame } from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { Button, buttonVariants } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { characterIconUrls, characterRarityOf, itemIconUrls } from '../../lib/images';
import { EmptyState } from '../catalog/components/EmptyState';
import { gameCopy } from '../game/copy';
import {
  getGameRepository,
  getImagesRepository,
  getInventoryRepository,
} from '../game/repositories';
import { useGame } from '../game/useGame';
import { CatalogPanel } from './CatalogPanel';
import { inventoryCopy } from './copy';
import { ImportPanel } from './ImportPanel';
import { ItemForm } from './ItemForm';
import { ItemGlyph } from './ItemGlyph';
import { useInventory } from './useInventory';

type Tab = 'items' | 'catalog' | 'characters' | 'import';

const controlClass =
  'h-9 rounded-[2px] border border-line bg-surface px-3 text-[12.5px] text-foreground outline-none transition-colors focus:border-line-strong';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : inventoryCopy.errors.unknown;

const slotName = (template: GameTemplate, slotId: string): string =>
  template.slots.find((slot) => slot.id === slotId)?.name ?? slotId;

const setName = (template: GameTemplate, setId: string | null): string =>
  setId ? (template.sets.find((set) => set.id === setId)?.name ?? setId) : inventoryCopy.noSet;

const statsLine = (template: GameTemplate, item: Item): string => {
  const entries = Object.entries(item.stats).slice(0, 3);
  if (entries.length === 0) return inventoryCopy.statsSummary(0);

  return entries
    .map(([statId, value]) => {
      const definition = template.stats.find((stat) => stat.id === statId);
      const unit = definition?.unit === 'percent' ? '%' : '';
      return `${definition?.name ?? statId} ${numberFormat.format(value)}${unit}`;
    })
    .join(' · ');
};

export function InventoryPage() {
  const { id = '' } = useParams();
  const game = useGame(id);
  const template = game.state.status === 'ready' ? game.state.template : undefined;

  const inventory = useInventory(template?.gameId);

  const [searchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    requested === 'catalog' || requested === 'characters' || requested === 'import'
      ? requested
      : 'items',
  );
  const [query, setQuery] = useState('');
  const [slotFilter, setSlotFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [charQuery, setCharQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = inventory.items ?? [];

  const filtered = useMemo(() => {
    if (!template) return [];
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      if (slotFilter && item.slot !== slotFilter) return false;
      if (setFilter && item.setId !== setFilter) return false;
      if (!needle) return true;

      return `${item.name} ${setName(template, item.setId)}`.toLowerCase().includes(needle);
    });
  }, [items, query, slotFilter, setFilter, template]);

  const characters = useMemo(() => {
    if (!template) return [];
    const needle = charQuery.trim().toLowerCase();
    if (!needle) return template.baseProfiles;
    return template.baseProfiles.filter((profile) => profile.name.toLowerCase().includes(needle));
  }, [template, charQuery]);

  if (game.state.status === 'loading') {
    return <p className="px-6 py-24 text-center text-sm text-muted-foreground">{gameCopy.loading}</p>;
  }

  if (game.state.status === 'error') {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={gameCopy.errorTitle} body={game.state.message}>
          <Button variant="outline" onClick={game.retry}>
            {gameCopy.retry}
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!template) return null;

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
  };

  const openAdd = () => {
    setTab('items');
    setEditing(null);
    setAdding(true);
  };

  const openEdit = (item: Item) => {
    setTab('items');
    setAdding(false);
    setEditing(item);
  };

  const save = async (item: Item) => {
    if (editing) await inventory.update(item);
    else await inventory.add(item);
    closeForm();
  };

  const remove = async (itemId: string) => {
    setActionError(null);
    try {
      await inventory.remove(itemId);
      setConfirming(null);
    } catch (cause) {
      setActionError(messageOf(cause));
    }
  };

  const clearFilters = () => {
    setQuery('');
    setSlotFilter('');
    setSetFilter('');
  };

  const exportInventory = async () => {
    setActionError(null);
    try {
      const pkg = await exportGame(template.gameId, {
        games: getGameRepository(),
        inventory: getInventoryRepository(),
        images: getImagesRepository(),
      });
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`${template.gameId}-inventory-${date}.json`, pkg);
    } catch (cause) {
      setActionError(messageOf(cause));
    }
  };

  const tabCount = inventory.items === null ? '' : ` (${items.length})`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'items', label: `${inventoryCopy.tabs.items}${tabCount}` },
    { id: 'catalog', label: inventoryCopy.tabs.catalog },
    { id: 'characters', label: `${inventoryCopy.tabs.characters} (${template.baseProfiles.length})` },
    { id: 'import', label: inventoryCopy.tabs.import },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-6 max-[860px]:px-4">
      <Link to={`/optimizer/${id}`} className="text-xs text-muted-foreground hover:text-foreground">
        ← {gameCopy.backToOptimizer}
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="label-caps mb-1">{inventoryCopy.eyebrow}</p>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{template.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {inventoryCopy.itemCount(items.length)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openAdd} disabled={adding || Boolean(editing)}>
            {inventoryCopy.addItem}
          </Button>
          <Button variant="outline" onClick={() => setTab('import')}>
            {inventoryCopy.importInventory}
          </Button>
          <Button variant="outline" onClick={() => void exportInventory()}>
            {inventoryCopy.exportInventory}
          </Button>
        </div>
      </header>

      <div
        className="mt-4 flex flex-wrap gap-1 border-b border-line"
        role="tablist"
        aria-label={inventoryCopy.tabs.label}
      >
        {tabs.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(entry.id)}
              className={cn(
                'relative -mb-px border-b-2 px-3 py-2.5 text-[12.5px] transition-colors',
                active
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {adding || editing ? (
        <div className="mt-4">
          <ItemForm
            key={editing?.id ?? 'new'}
            template={template}
            initial={editing ?? undefined}
            onSubmit={save}
            onCancel={closeForm}
          />
        </div>
      ) : null}

      {actionError ? (
        <p
          className="mt-4 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12.5px] text-[oklch(0.78_0.16_25)]"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      {tab === 'items' ? (
        <section className="mt-4" role="tabpanel" aria-label={inventoryCopy.tabs.items}>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="inventory-slot-filter">
              {inventoryCopy.filters.slot}
            </label>
            <select
              id="inventory-slot-filter"
              className={controlClass}
              value={slotFilter}
              onChange={(event) => setSlotFilter(event.target.value)}
            >
              <option value="">{inventoryCopy.filters.allSlots}</option>
              {template.slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="inventory-set-filter">
              {inventoryCopy.filters.set}
            </label>
            <select
              id="inventory-set-filter"
              className={controlClass}
              value={setFilter}
              onChange={(event) => setSetFilter(event.target.value)}
            >
              <option value="">{inventoryCopy.filters.allSets}</option>
              {[...template.sets]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
            </select>

            <label className="sr-only" htmlFor="inventory-search">
              {inventoryCopy.filters.search}
            </label>
            <input
              id="inventory-search"
              type="search"
              className={cn(controlClass, 'min-w-[180px] flex-1 sm:max-w-[280px]')}
              placeholder={inventoryCopy.filters.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
              {inventoryCopy.filters.shown(filtered.length, items.length)}
            </span>
          </div>

          <div className="mt-3">
            {inventory.error ? (
              <EmptyState title={inventoryCopy.errorTitle} body={inventory.error}>
                <Button variant="outline" onClick={() => void inventory.reload()}>
                  {inventoryCopy.retry}
                </Button>
              </EmptyState>
            ) : inventory.items === null ? (
              <p className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {inventoryCopy.loading}
              </p>
            ) : items.length === 0 ? (
              <EmptyState title={inventoryCopy.emptyTitle} body={inventoryCopy.emptyBody}>
                <button type="button" className={buttonVariants()} onClick={openAdd}>
                  {inventoryCopy.addFirst}
                </button>
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={inventoryCopy.emptyFiltered}
                body={inventoryCopy.emptyFilteredBody}
              >
                <Button variant="outline" onClick={clearFilters}>
                  {inventoryCopy.clearFilters}
                </Button>
              </EmptyState>
            ) : (
              <div className="overflow-hidden rounded-[4px] border border-line">
                <div className="hidden grid-cols-[44px_minmax(0,1.3fr)_100px_minmax(0,150px)_70px_minmax(0,1fr)_auto] gap-3 border-b border-line bg-raised px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground md:grid">
                  <span aria-hidden="true" />
                  <span>{inventoryCopy.table.item}</span>
                  <span>{inventoryCopy.table.slot}</span>
                  <span>{inventoryCopy.table.set}</span>
                  <span>{inventoryCopy.table.level}</span>
                  <span>{inventoryCopy.table.stats}</span>
                  <span className="text-right">{inventoryCopy.table.actions}</span>
                </div>

                <ul aria-label={inventoryCopy.tabs.items}>
                  {filtered.map((item) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 md:grid-cols-[44px_minmax(0,1.3fr)_100px_minmax(0,150px)_70px_minmax(0,1fr)_auto]"
                    >
                      <ItemGlyph
                        name={item.name}
                        rarity={item.rarity}
                        sources={itemIconUrls(template.assets, item)}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{item.name}</p>
                        <p className="truncate font-mono text-[9.5px] text-muted-foreground md:hidden">
                          {slotName(template, item.slot)} · {setName(template, item.setId)} ·{' '}
                          {inventoryCopy.level(item.level ?? 0)}
                        </p>
                      </div>

                      <span className="hidden truncate text-[12px] text-muted-foreground md:block">
                        {slotName(template, item.slot)}
                      </span>
                      <span className="hidden truncate text-[12px] text-muted-foreground md:block">
                        {setName(template, item.setId)}
                      </span>
                      <span className="hidden font-mono text-[11px] text-muted-foreground tabular-nums md:block">
                        {inventoryCopy.level(item.level ?? 0)}
                      </span>
                      <span className="hidden truncate font-mono text-[10px] text-muted-foreground md:block">
                        {statsLine(template, item)}
                      </span>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="h-8 rounded-[2px] border border-line px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                          onClick={() => openEdit(item)}
                        >
                          {inventoryCopy.edit}
                        </button>

                        {confirming === item.id ? (
                          <>
                            <button
                              type="button"
                              className="h-8 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-2.5 text-[11px] text-[oklch(0.78_0.16_25)] transition-colors hover:bg-[oklch(0.3_0.08_25)]"
                              onClick={() => void remove(item.id)}
                            >
                              {inventoryCopy.confirmDelete}
                            </button>
                            <button
                              type="button"
                              className="h-8 rounded-[2px] border border-line px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                              onClick={() => setConfirming(null)}
                            >
                              {inventoryCopy.cancel}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="h-8 rounded-[2px] border border-line px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
                            onClick={() => setConfirming(item.id)}
                          >
                            {inventoryCopy.delete}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === 'characters' ? (
        <section className="mt-4" role="tabpanel" aria-label={inventoryCopy.tabs.characters}>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="character-search">
              {inventoryCopy.characters.search}
            </label>
            <input
              id="character-search"
              type="search"
              className={cn(controlClass, 'min-w-[200px] flex-1 sm:max-w-[320px]')}
              placeholder={inventoryCopy.characters.search}
              value={charQuery}
              onChange={(event) => setCharQuery(event.target.value)}
            />
            <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
              {inventoryCopy.filters.shown(characters.length, template.baseProfiles.length)}
            </span>
          </div>

          <p className="mt-3 max-w-[80ch] text-[12px] text-muted-foreground">
            {inventoryCopy.characters.note(template.baseProfiles.length)}
          </p>

          {characters.length === 0 ? (
            <EmptyState
              title={inventoryCopy.emptyFiltered}
              body={inventoryCopy.characters.empty}
            />
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {characters.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 rounded-[4px] border border-line bg-surface px-3 py-2.5"
                >
                  <ItemGlyph
                    name={profile.name}
                    rarity={characterRarityOf(template.assets, profile)}
                    sources={characterIconUrls(template.assets, profile)}
                    className="h-9 w-9 rounded-full text-[10px]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold">{profile.name}</p>
                    <p className="truncate font-mono text-[9.5px] text-muted-foreground tabular-nums">
                      {inventoryCopy.characters.hp} {numberFormat.format(profile.base.hp ?? 0)} ·{' '}
                      {inventoryCopy.characters.atk} {numberFormat.format(profile.base.atk ?? 0)} ·{' '}
                      {inventoryCopy.characters.def} {numberFormat.format(profile.base.def ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === 'catalog' ? (
        <CatalogPanel
          template={template}
          onAdd={async (item) => {
            await inventory.add(item);
          }}
        />
      ) : null}

      {tab === 'import' ? (
        <section className="mt-6" role="tabpanel" aria-label={inventoryCopy.tabs.import}>
          <ImportPanel template={template} onImported={() => void inventory.reload()} />
        </section>
      ) : null}
    </div>
  );
}
