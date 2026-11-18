import { useEffect, useMemo, useState } from 'react';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { characterIconUrls, characterRarityOf } from '../../lib/images';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { useSetLevel } from './useSetLevel';

interface CharacterPanelProps {
  template: GameTemplate;
  profile: BaseProfile;
  onSaveBase?: (base: Record<string, number>) => Promise<void> | void;
  /** Abre el selector de personaje. Sin esto la tarjeta no muestra el boton. */
  onChangeCharacter?: () => void;
}

type Order = 'value' | 'name';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const unitOf = (unit: string | undefined): string => {
  if (unit === 'percent') return '%';
  if (unit === 'multiply') return '×';
  return '';
};

const formatValue = (value: number, unit: string | undefined): string =>
  unit === 'multiply'
    ? `×${numberFormat.format(value)}`
    : `${numberFormat.format(value)}${unitOf(unit)}`;

/**
 * Tarjeta del personaje: retrato, nivel y base en el mismo sitio. El nivel es un
 * input porque la escala puede ser larga y elegir de una lista es lento; se
 * confirma al salir del campo o con Enter, nunca en cada tecla (guardaria un
 * nivel intermedio por cada digito).
 */
export function CharacterPanel({
  template,
  profile,
  onSaveBase,
  onChangeCharacter,
}: CharacterPanelProps) {
  const [order, setOrder] = useState<Order>('value');
  const {
    current: level,
    levels,
    canSet,
    pointsMode,
    saving,
    error,
    setLevel,
  } = useSetLevel({ template, profile, onSave: onSaveBase ?? (() => undefined) });
  const [saved, setSaved] = useState<number | null>(null);

  const min = levels[0];
  const max = levels[levels.length - 1];
  const levelText = level === null ? '' : String(level);
  const [draft, setDraft] = useState(levelText);

  useEffect(() => {
    setDraft(levelText);
  }, [levelText]);

  const commitLevel = () => {
    if (!canSet || min === undefined || max === undefined) return;
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(levelText);
      return;
    }
    const next = Math.min(Math.max(parsed, min), max);
    setDraft(String(next));
    if (next === level) return;
    void setLevel(next).then((ok) => {
      if (ok) setSaved(next);
      else setDraft(levelText);
    });
  };

  const rows = useMemo(
    () =>
      template.stats
        .filter((stat) => typeof profile.base[stat.id] === 'number')
        .map((stat) => ({ stat, value: profile.base[stat.id] ?? 0 }))
        .sort((a, b) =>
          order === 'name'
            ? a.stat.name.localeCompare(b.stat.name)
            : b.value - a.value || a.stat.name.localeCompare(b.stat.name),
        ),
    [order, profile.base, template.stats],
  );

  const levelMessage = pointsMode
    ? gameCopy.cockpit.levelPointsMode
    : !canSet
      ? gameCopy.cockpit.levelsUnavailable
      : null;

  return (
    <section className="rounded-[4px] border border-line bg-surface p-4">
      <p className="label-caps m-0">01 · {gameCopy.cockpit.character}</p>
      <p className="m-0 mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.characterHint}</p>

      <div
        role="group"
        aria-label={profile.name}
        className="mt-3 flex items-center gap-3 rounded-[2px] border border-line bg-background p-2.5"
      >
        <ItemGlyph
          name={profile.name}
          rarity={template.assets ? characterRarityOf(template.assets, profile) : undefined}
          sources={template.assets ? characterIconUrls(template.assets, profile) : []}
          className="h-20 w-20 text-[15px]"
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold leading-tight">{profile.name}</p>
          {onChangeCharacter ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={onChangeCharacter}
              className="mt-1.5 h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
            >
              {gameCopy.cockpit.changeCharacter}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <label htmlFor="character-level" className="block text-[11px] text-muted-foreground">
          {gameCopy.cockpit.characterLevel}
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="character-level"
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            className="h-9 w-24 rounded-[2px] border border-line bg-background px-2.5 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
            value={draft}
            disabled={!canSet || saving || !onSaveBase}
            onChange={(event) => {
              const next = event.target.value;
              if (/^\d*$/.test(next)) setDraft(next);
            }}
            onBlur={commitLevel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setDraft(levelText);
                event.currentTarget.blur();
              }
            }}
          />
          {canSet && min !== undefined && max !== undefined ? (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {min}–{max}
            </span>
          ) : null}
        </div>

        {levelMessage ? (
          <p role="status" className="mt-2 text-[11px] text-muted-foreground">
            {levelMessage}
          </p>
        ) : null}
        {saved !== null && !levelMessage ? (
          <p role="status" className="mt-2 text-[11px] text-[oklch(0.72_0.14_150)]">
            {gameCopy.cockpit.levelSet(saved)}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-[11px] text-[oklch(0.78_0.16_25)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="label-caps m-0">{gameCopy.cockpit.currentStats}</p>
        <p className="m-0 mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.statsHint}</p>

        {rows.length === 0 ? (
          <p className="mt-3 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted-foreground">
            {gameCopy.cockpit.noStats}
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[2px] border border-line">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line bg-raised text-left font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5">
                    <button
                      type="button"
                      className="cursor-pointer text-left hover:text-foreground"
                      title={order === 'name' ? gameCopy.cockpit.sortByValue : gameCopy.cockpit.sortByName}
                      onClick={() => setOrder(order === 'name' ? 'value' : 'name')}
                    >
                      {gameCopy.cockpit.stat} {order === 'name' ? 'A→Z' : '↓'}
                    </button>
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right">
                    {gameCopy.cockpit.current}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ stat, value }) => (
                  <tr
                    key={stat.id}
                    className="border-b border-line last:border-b-0"
                    title={`${stat.name}${unitOf(stat.unit) ? ` (${unitOf(stat.unit)})` : ''}`}
                  >
                    <th scope="row" aria-label={stat.name} className="px-2 py-1.5 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <ItemGlyph name={stat.name} className="h-6 w-6 text-[8px]" />
                        <span className="truncate">{stat.name}</span>
                      </span>
                    </th>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {formatValue(value, stat.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
