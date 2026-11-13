import { useMemo, useRef, useState } from 'react';

import {
  addItems,
  importInventory,
  parsePackage,
  type GamePackage,
} from '@zenith/data-access';
import { importGood, inventoryRules, type ImportResult } from '@zenith/inventory';
import type { GameTemplate } from '@zenith/shared-types';

import { Button } from '../../components/ui/Button';
import {
  getGameRepository,
  getImagesRepository,
  getInventoryRepository,
} from '../game/repositories';
import { inventoryCopy } from './copy';
import { useInventoryCatalog } from './useInventoryCatalog';

type Kind = 'good' | 'package' | 'unknown';

interface ImportPanelProps {
  template: GameTemplate;
  onImported: () => void;
}

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : inventoryCopy.errors.unknown;

function detect(raw: unknown): Kind {
  if (typeof raw !== 'object' || raw === null) return 'unknown';
  const record = raw as Record<string, unknown>;
  if (record.zenith === '0.1') return 'package';
  if (record.format === 'GOOD' || Array.isArray(record.artifacts)) return 'good';
  return 'unknown';
}

export function ImportPanel({ template, onImported }: ImportPanelProps) {
  const inventory = useInventoryCatalog(template);
  const rules = useMemo(() => inventoryRules(template), [template]);
  const input = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [minLevel, setMinLevel] = useState(0);
  const [minRarity, setMinRarity] = useState(0);
  const [includeEntries, setIncludeEntries] = useState(true);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const kind = useMemo(() => detect(raw), [raw]);
  const entrySlot = rules?.weaponSlot;
  const artifactLevelMax = rules?.artifactLevelRange.max;
  const rarityMax = rules ? Math.max(...rules.rarities) : undefined;
  const entriesLabel = rules?.labels.entries ?? inventoryCopy.import.entries;
  const includeEntriesLabel =
    rules?.labels.includeEntries ?? inventoryCopy.import.includeEntries;

  const goodResult = useMemo<ImportResult | null>(() => {
    if (kind !== 'good' || inventory.status !== 'ready') return null;
    try {
      return importGood(raw, template, inventory.catalog, {
        minLevel,
        minRarity,
        includeEntries: includeEntries && Boolean(entrySlot),
        entrySlot,
      });
    } catch {
      return null;
    }
  }, [
    kind,
    inventory.status,
    inventory.catalog,
    raw,
    template,
    minLevel,
    minRarity,
    includeEntries,
    entrySlot,
  ]);

  const packagePreview = useMemo<{ pkg: GamePackage | null; error: string | null }>(() => {
    if (kind !== 'package') return { pkg: null, error: null };
    try {
      return { pkg: parsePackage(raw), error: null };
    } catch (cause) {
      return { pkg: null, error: messageOf(cause) };
    }
  }, [kind, raw]);

  const previewItems = goodResult?.items ?? packagePreview.pkg?.items ?? [];
  const statIds = useMemo(() => new Set(template.stats.map((stat) => stat.id)), [template]);
  const slotIds = useMemo(() => new Set(template.slots.map((slot) => slot.id)), [template]);
  const knownStats = useMemo(
    () =>
      new Set(
        previewItems.flatMap((item) => Object.keys(item.stats)).filter((id) => statIds.has(id)),
      ).size,
    [previewItems, statIds],
  );
  const badSlots = useMemo(
    () => previewItems.filter((item) => !slotIds.has(item.slot)).length,
    [previewItems, slotIds],
  );
  const canImport =
    previewItems.length > 0 && badSlots < previewItems.length && !packagePreview.error && !busy;

  const reset = () => {
    setRaw(null);
    setFileName('');
    setError(null);
    setDone(null);
  };

  const load = async (file: File) => {
    setError(null);
    setDone(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setRaw(parsed);
      setFileName(file.name);
      if (detect(parsed) === 'unknown') setError(inventoryCopy.import.errors.unknown);
    } catch {
      setRaw(null);
      setFileName('');
      setError(inventoryCopy.import.errors.json);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'good' && goodResult && inventory.status === 'ready') {
        await addItems(
          goodResult.items,
          template.gameId,
          { inventory: getInventoryRepository() },
          mode,
        );
        setDone(inventoryCopy.import.doneGood(goodResult.items.length));
      } else if (kind === 'package' && packagePreview.pkg) {
        const result = await importInventory(
          raw,
          template.gameId,
          {
            games: getGameRepository(),
            inventory: getInventoryRepository(),
            images: getImagesRepository(),
          },
          { mode },
        );
        setDone(inventoryCopy.import.donePackage(result.items));
      }
      onImported();
      setRaw(null);
      setFileName('');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[6px] border border-line-strong">
        <div
          className="px-6 py-10 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void load(file);
          }}
        >
          <p className="label-caps">{inventoryCopy.import.eyebrow}</p>
          <h2 className="mt-2 text-md font-bold">{inventoryCopy.import.title}</h2>
          <p className="mx-auto mt-2 max-w-[54ch] text-[13px] leading-relaxed text-muted-foreground">
            {inventoryCopy.import.body}
          </p>

          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            aria-label={inventoryCopy.import.fileLabel}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void load(file);
              event.target.value = '';
            }}
          />

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => input.current?.click()}>
              {inventoryCopy.import.action}
            </Button>
            {raw !== null ? (
              <Button type="button" variant="outline" onClick={reset}>
                {inventoryCopy.import.reset}
              </Button>
            ) : null}
          </div>
          <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted-foreground">
            {inventoryCopy.import.formats}
          </p>
          {fileName ? (
            <p className="mt-2 truncate text-[12px] text-muted-foreground">{fileName}</p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="border-t border-line px-6 py-3 text-[12.5px] text-[oklch(0.78_0.16_25)]">
            {error}
          </p>
        ) : null}
        {done ? (
          <p className="border-t border-line px-6 py-3 text-[12.5px] font-semibold text-[oklch(0.78_0.13_150)]">
            {done}
          </p>
        ) : null}
        {kind === 'good' && inventory.status === 'loading' ? (
          <p className="border-t border-line px-6 py-3 text-[12.5px] text-muted-foreground">
            {inventoryCopy.catalog.loading}
          </p>
        ) : null}
        {kind === 'good' && inventory.status === 'error' ? (
          <p role="alert" className="border-t border-line px-6 py-3 text-[12.5px] text-[oklch(0.78_0.16_25)]">
            {inventory.error}{' '}
            <button type="button" className="underline" onClick={inventory.retry}>
              {inventoryCopy.retry}
            </button>
          </p>
        ) : null}
        {kind === 'good' && inventory.status === 'idle' ? (
          <p role="alert" className="border-t border-line px-6 py-3 text-[12.5px] text-[oklch(0.78_0.16_25)]">
            {inventoryCopy.catalog.noCatalog}
          </p>
        ) : null}
        {packagePreview.error ? (
          <p role="alert" className="border-t border-line px-6 py-3 text-[12.5px] text-[oklch(0.78_0.16_25)]">
            {packagePreview.error}
          </p>
        ) : null}
      </section>

      {previewItems.length > 0 ? (
        <aside className="rounded-[6px] border border-line px-4 py-4">
          <p className="label-caps">{inventoryCopy.import.preview}</p>
          <dl className="mt-3 grid gap-2 text-[12.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{inventoryCopy.import.objects}</dt>
              <dd className="font-mono tabular-nums">{previewItems.length}</dd>
            </div>
            {goodResult ? (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{inventoryCopy.import.artifacts}</dt>
                  <dd className="font-mono tabular-nums">{goodResult.artifacts}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{entriesLabel}</dt>
                  <dd className="font-mono tabular-nums">{goodResult.entries}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{inventoryCopy.import.skipped}</dt>
                  <dd className="font-mono tabular-nums">{goodResult.skipped}</dd>
                </div>
              </>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{inventoryCopy.import.recognized}</dt>
              <dd className="font-mono tabular-nums">{knownStats}</dd>
            </div>
            {badSlots > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{inventoryCopy.import.missingSlots}</dt>
                <dd className="font-mono tabular-nums text-[oklch(0.78_0.16_25)]">{badSlots}</dd>
              </div>
            ) : null}
          </dl>

          {kind === 'good' ? (
            <div className="mt-4 grid gap-3 border-t border-line pt-4">
              <label className="grid gap-1 text-[12px]">
                <span className="text-muted-foreground">{inventoryCopy.import.minLevel}</span>
                <input
                  type="number"
                  min={0}
                  max={artifactLevelMax}
                  value={minLevel}
                  onChange={(event) => setMinLevel(Number(event.target.value))}
                  className="h-[32px] rounded-[2px] border border-line-strong bg-transparent px-2 font-mono text-[12px]"
                />
              </label>
              <label className="grid gap-1 text-[12px]">
                <span className="text-muted-foreground">{inventoryCopy.import.minRarity}</span>
                <input
                  type="number"
                  min={1}
                  max={rarityMax}
                  value={minRarity}
                  onChange={(event) => setMinRarity(Number(event.target.value))}
                  className="h-[32px] rounded-[2px] border border-line-strong bg-transparent px-2 font-mono text-[12px]"
                />
              </label>
              {entrySlot ? (
                <label className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={includeEntries}
                    onChange={(event) => setIncludeEntries(event.target.checked)}
                  />
                  {includeEntriesLabel}
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="mt-4 grid gap-1 border-t border-line pt-4 text-[12px]">
            <span className="text-muted-foreground">{inventoryCopy.import.mode}</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as 'merge' | 'replace')}
              className="h-[32px] rounded-[2px] border border-line-strong bg-transparent px-2 text-[12px]"
            >
              <option value="merge">{inventoryCopy.import.merge}</option>
              <option value="replace">{inventoryCopy.import.replace}</option>
            </select>
          </label>

          {badSlots > 0 && badSlots === previewItems.length ? (
            <p role="alert" className="mt-3 text-[11.5px] text-[oklch(0.78_0.16_25)]">
              {inventoryCopy.import.errors.slots}
            </p>
          ) : null}

          <Button
            type="button"
            className="mt-4 w-full justify-center"
            disabled={!canImport}
            onClick={() => void confirm()}
          >
            {busy ? inventoryCopy.import.importing : inventoryCopy.import.confirm}
          </Button>
        </aside>
      ) : null}
    </div>
  );
}
