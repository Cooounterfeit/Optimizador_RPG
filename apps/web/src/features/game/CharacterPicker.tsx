import { useEffect, useRef, useState } from 'react';

import { currentLevel } from '@zenith/core-engine';
import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { characterIconUrls } from '../../lib/images';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { gameCopy } from './copy';
import { profileStatsLine } from './profileSummary';
import { getProfileBaseRepository } from './repositories';

interface CharacterPickerDialogProps {
  template: GameTemplate;
  currentId: string;
  open: boolean;
  onSelect: (profileId: string) => void;
  onClose: () => void;
}

interface Card {
  profile: BaseProfile;
  level: number | null;
  stats: string;
}

/**
 * Selector de personaje como dialog nativo: la rejilla entra completa en
 * pantalla y cada tarjeta muestra el retrato, el nivel guardado y sus primeros
 * atributos, para reconocer al personaje sin abrir su ficha. El nivel de cada
 * uno se lee de la base guardada del jugador, no de la plantilla publicada.
 *
 * Se apoya en `<dialog>`: trae foco atrapado, Escape y backdrop sin dependencias.
 * `showModal` no existe en jsdom (y puede no existir en navegadores viejos), asi
 * que se cae a `open` a mano; el comportamiento util se mantiene.
 */
export function CharacterPickerDialog({
  template,
  currentId,
  open,
  onSelect,
  onClose,
}: CharacterPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [savedBases, setSavedBases] = useState<Record<string, Record<string, number>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }
    if (!open && dialog.open) {
      try {
        dialog.close();
      } catch {
        dialog.removeAttribute('open');
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    setError(null);
    void Promise.all(
      template.baseProfiles.map(async (profile) => {
        const base = await getProfileBaseRepository().get(template.gameId, profile.id);
        return [profile.id, base] as const;
      }),
    )
      .then((entries) => {
        if (!alive) return;
        const next: Record<string, Record<string, number>> = {};
        for (const [id, base] of entries) if (base) next[id] = base;
        setSavedBases(next);
      })
      .catch(() => {
        if (alive) setError(gameCopy.cockpit.characterLevelsError);
      });

    return () => {
      alive = false;
    };
  }, [open, template.gameId, template.baseProfiles]);

  useEffect(() => {
    if (open) selectedRef.current?.focus();
  }, [open]);

  const cards: Card[] = template.baseProfiles.map((profile) => {
    const merged = { ...profile, base: { ...profile.base, ...savedBases[profile.id] } };
    return {
      profile: merged,
      level: currentLevel(template, merged),
      stats: profileStatsLine(template, merged, gameCopy.cockpit.noStats),
    };
  });

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="character-picker-title"
      className="m-auto w-[min(1080px,94vw)] rounded-[6px] border border-line-strong bg-surface p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="label-caps m-0">{gameCopy.cockpit.chooseCharacter}</p>
          <h2
            id="character-picker-title"
            className="m-0 mt-1 text-[18px] font-extrabold tracking-[-0.02em]"
          >
            {template.name}
          </h2>
          <p className="m-0 mt-1 text-[11.5px] leading-snug text-muted-foreground">
            {gameCopy.cockpit.chooseCharacterHint}
          </p>
        </div>
        <button
          type="button"
          aria-label={gameCopy.cockpit.close}
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] border border-line text-[15px] leading-none text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
        >
          ×
        </button>
      </div>

      {error ? (
        <p role="alert" className="m-0 border-b border-line px-5 py-2 text-[11px] text-[oklch(0.78_0.16_25)]">
          {error}
        </p>
      ) : null}

      <div className="max-h-[70dvh] overflow-y-auto overscroll-contain p-5">
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {cards.map(({ profile, level, stats }) => {
            const selected = profile.id === currentId;
            return (
              <li key={profile.id} className="min-w-0">
                <button
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(profile.id)}
                  className={cn(
                    'flex h-full w-full flex-col gap-2 rounded-[4px] border p-2 text-start transition-colors',
                    selected
                      ? 'border-foreground bg-raised'
                      : 'border-line bg-background hover:border-line-strong',
                  )}
                >
                  <span className="relative block">
                    <ItemGlyph
                      name={profile.name}
                      sources={template.assets ? characterIconUrls(template.assets, profile) : []}
                      className="aspect-square h-auto w-full text-[26px]"
                    />
                    {selected ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-[1px] bg-foreground font-mono text-[9px] leading-none text-primary-foreground"
                      >
                        ✓
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col px-0.5">
                    <span className="truncate text-[12.5px] font-semibold leading-tight">
                      {profile.name}
                    </span>
                    {level !== null ? (
                      <span className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {gameCopy.cockpit.level} {level}
                      </span>
                    ) : null}
                    <span
                      className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground"
                      title={stats}
                    >
                      {stats}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
