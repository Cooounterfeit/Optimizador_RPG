import { useEffect, useMemo, useState } from 'react';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { characterIconUrls, characterRarityOf } from '../../lib/images';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { formatStat } from './stat-format';
import { useSetLevel } from './useSetLevel';

interface CharacterPanelProps {
  template: GameTemplate;
  profile: BaseProfile;
  onSaveBase?: (base: Record<string, number>) => Promise<void> | void;
  /** Abre el selector de personaje. Sin esto la tarjeta no muestra el boton. */
  onChangeCharacter?: () => void;
}

/**
 * Bloque de personaje: retrato, nombre, nivel y base en el mismo sitio. El nivel
 * es un input porque la escala puede ser larga y elegir de una lista es lento;
 * se confirma al salir del campo o con Enter, nunca en cada tecla (guardaria un
 * nivel intermedio por cada digito).
 *
 * No dibuja tarjeta propia: vive dentro de la hoja de setup, que pone los
 * titulos (`Character` / `Base stats`) y el marco.
 */
export function CharacterPanel({
  template,
  profile,
  onSaveBase,
  onChangeCharacter,
}: CharacterPanelProps) {
  const { current: level, levels, canSet, pointsMode, saving, error, setLevel } = useSetLevel({
    template,
    profile,
    onSave: onSaveBase ?? (() => undefined),
  });
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
        .map((stat) => ({ stat, value: profile.base[stat.id] ?? 0 })),
    [profile.base, template.stats],
  );

  const levelMessage = pointsMode
    ? gameCopy.cockpit.levelPointsMode
    : !canSet
      ? gameCopy.cockpit.levelsUnavailable
      : null;

  return (
    <div>
      <div
        role="group"
        aria-label={profile.name}
        className="flex items-center gap-3.5 rounded-[2px] border border-line bg-background p-3"
      >
        <ItemGlyph
          name={profile.name}
          rarity={template.assets ? characterRarityOf(template.assets, profile) : undefined}
          sources={template.assets ? characterIconUrls(template.assets, profile) : []}
          className="h-16 w-16 text-[13px]"
        />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[17px] font-semibold leading-tight">{profile.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <label htmlFor="character-level" className="sr-only">
              {gameCopy.cockpit.characterLevel}
            </label>
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              Lv.
              <input
                id="character-level"
                type="text"
                inputMode="numeric"
                className="h-6 w-14 rounded-[2px] border border-line bg-surface px-1.5 text-end font-mono text-[12px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
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
              {canSet && max !== undefined ? <span className="text-[12px]">/ {max}</span> : null}
            </span>

            {onChangeCharacter ? (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={onChangeCharacter}
                className="text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {gameCopy.cockpit.changeCharacter}
              </button>
            ) : null}
          </div>
        </div>
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

      {rows.length === 0 ? (
        <p className="mt-3 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted-foreground">
          {gameCopy.cockpit.noStats}
        </p>
      ) : (
        <dl className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2">
          {rows.map(({ stat, value }) => (
            <div key={stat.id} className="grid grid-cols-[1fr_auto] items-baseline gap-2">
              <dt className="m-0 truncate text-[11.5px] text-muted-foreground">{stat.name}</dt>
              <dd className="m-0 font-mono text-[12px] tabular-nums">
                {formatStat(value, stat)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
