import { useState, type FormEvent } from 'react';

import { inventoryRules } from '@zenith/inventory';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { inventoryCopy } from './copy';

const fieldClass =
  'h-[38px] w-full rounded-[2px] border border-line bg-surface px-3 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-line-strong';

const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground';

const errorClass =
  'mb-4 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12.5px] text-[oklch(0.78_0.16_25)]';

interface StatRow {
  key: number;
  statId: string;
  value: string;
}

interface ItemFormProps {
  template: GameTemplate;
  initial?: Item;
  onSubmit: (item: Item) => Promise<void> | void;
  onCancel: () => void;
}

let nextRowKey = 0;

const rowsFrom = (item: Item | undefined): StatRow[] =>
  item
    ? Object.entries(item.stats).map(([statId, value]) => ({
        key: nextRowKey++,
        statId,
        value: String(value),
      }))
    : [];

const makeId = (): string => `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : inventoryCopy.form.errors.submit;

export function ItemForm({ template, initial, onSubmit, onCancel }: ItemFormProps) {
  const rules = inventoryRules(template);
  const rarities = rules?.rarities ?? [];
  const levelRange = rules?.itemLevelRange;

  const [name, setName] = useState(initial?.name ?? '');
  const [slot, setSlot] = useState(initial?.slot ?? '');
  const [setId, setSetId] = useState(initial?.setId ?? '');
  const [rarity, setRarity] = useState(String(initial?.rarity ?? rarities[0] ?? ''));
  const [level, setLevel] = useState(String(initial?.level ?? levelRange?.min ?? ''));
  const [rows, setRows] = useState<StatRow[]>(() => rowsFrom(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const addRow = () => {
    setRows((current) => [...current, { key: nextRowKey++, statId: '', value: '' }]);
  };

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: number, patch: Partial<StatRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const build = (): { item: Item } | { error: string } => {
    if (!rules || !levelRange) return { error: inventoryCopy.form.errors.rules };
    const trimmedName = name.trim();
    if (!trimmedName) return { error: inventoryCopy.form.errors.name };
    if (trimmedName.length > 80) return { error: inventoryCopy.form.errors.nameLength };
    if (!slot) return { error: inventoryCopy.form.errors.slot };

    const rarityValue = Number(rarity);
    if (!Number.isInteger(rarityValue) || !rarities.includes(rarityValue)) {
      return { error: inventoryCopy.form.errors.rarity };
    }

    const levelValue = Number(level);
    if (
      !Number.isInteger(levelValue) ||
      levelValue < levelRange.min ||
      levelValue > levelRange.max
    ) {
      return { error: inventoryCopy.form.errors.level };
    }

    const stats: Record<string, number> = {};
    for (const row of rows) {
      if (!row.statId && !row.value) continue;
      if (!row.statId) return { error: inventoryCopy.form.errors.statMissing };
      if (!row.value.trim()) return { error: inventoryCopy.form.errors.statValue };

      const value = Number(row.value);
      if (!Number.isFinite(value)) return { error: inventoryCopy.form.errors.statValue };
      if (row.statId in stats) return { error: inventoryCopy.form.errors.statDuplicate };
      stats[row.statId] = value;
    }

    return {
      item: {
        ...initial,
        id: initial?.id ?? makeId(),
        slot,
        setId: setId || null,
        name: trimmedName,
        rarity: rarityValue,
        level: levelValue,
        stats,
      },
    };
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = build();
    if ('error' in result) {
      setError(result.error);
      return;
    }

    setPending(true);
    try {
      await onSubmit(result.item);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mb-6 rounded-[6px] border border-line bg-surface p-5"
      aria-label={initial ? inventoryCopy.form.editTitle : inventoryCopy.form.addTitle}
    >
      <h2 className="mb-4 text-md font-bold">
        {initial ? inventoryCopy.form.editTitle : inventoryCopy.form.addTitle}
      </h2>

      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="item-name">
            {inventoryCopy.form.name}
          </label>
          <input
            id="item-name"
            className={fieldClass}
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="item-slot">
            {inventoryCopy.form.slot}
          </label>
          <select
            id="item-slot"
            className={fieldClass}
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
          >
            <option value="">{inventoryCopy.form.chooseSlot}</option>
            {template.slots.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="item-set">
            {inventoryCopy.form.set}
          </label>
          <select
            id="item-set"
            className={fieldClass}
            value={setId}
            onChange={(event) => setSetId(event.target.value)}
          >
            <option value="">{inventoryCopy.noSet}</option>
            {template.sets.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="item-rarity">
            {inventoryCopy.form.rarity}
          </label>
          <select
            id="item-rarity"
            className={fieldClass}
            value={rarity}
            onChange={(event) => setRarity(event.target.value)}
          >
            {rarities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="item-level">
            {inventoryCopy.form.level}
          </label>
          <input
            id="item-level"
            className={fieldClass}
            type="number"
            min={levelRange?.min}
            max={levelRange?.max}
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="label-caps mb-3">{inventoryCopy.form.stats}</legend>

        {rows.map((row, index) => (
          <div key={row.key} className="mb-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="sr-only" htmlFor={`stat-${row.key}`}>
                {inventoryCopy.form.stat}
              </label>
              <select
                id={`stat-${row.key}`}
                className={fieldClass}
                aria-label={`${inventoryCopy.form.stat} ${index + 1}`}
                value={row.statId}
                onChange={(event) => updateRow(row.key, { statId: event.target.value })}
              >
                <option value="">{inventoryCopy.form.stat}</option>
                {template.stats.map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-32">
              <label className="sr-only" htmlFor={`stat-value-${row.key}`}>
                {inventoryCopy.form.value}
              </label>
              <input
                id={`stat-value-${row.key}`}
                className={fieldClass}
                type="number"
                step="any"
                aria-label={`${inventoryCopy.form.value} ${index + 1}`}
                value={row.value}
                onChange={(event) => updateRow(row.key, { value: event.target.value })}
              />
            </div>

            <button
              type="button"
              className="h-[38px] shrink-0 rounded-[2px] border border-line px-3 text-xs text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
              onClick={() => removeRow(row.key)}
            >
              {inventoryCopy.form.removeStat}
            </button>
          </div>
        ))}

        <button
          type="button"
          className="mt-1 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          onClick={addRow}
        >
          {inventoryCopy.form.addStat}
        </button>
      </fieldset>

      <div className="mt-6 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-[38px] rounded-[2px] bg-primary px-4 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-[oklch(0.99_0_0)] disabled:pointer-events-none"
        >
          {pending ? inventoryCopy.form.saving : inventoryCopy.form.save}
        </button>
        <button
          type="button"
          className="h-[38px] rounded-[2px] border border-line px-4 text-[13.5px] font-semibold transition-colors hover:border-line-strong hover:bg-raised"
          onClick={onCancel}
        >
          {inventoryCopy.cancel}
        </button>
      </div>
    </form>
  );
}
