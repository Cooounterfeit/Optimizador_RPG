import type { MouseEvent } from 'react';

import type { BaseProfile, Constraint, GameTemplate } from '@zenith/shared-types';
import { Link } from 'react-router-dom';

import { IconSkills } from '../../../components/icons';
import { Button } from '../../../components/ui/Button';
import { gameCopy } from '../../game/copy';
import { characterIconUrls } from '../../../lib/images';
import { ItemGlyph } from '../../inventory/ItemGlyph';
import type { SkillPoints } from '../skill-points';
import { ConstraintEditor } from '../ConstraintEditor';

interface SetupBarProps {
  id: string;
  template: GameTemplate;
  profile: BaseProfile | undefined;
  objectiveId: string;
  onObjective: (id: string) => void;
  constraints: Constraint[];
  onConstraints: (next: Constraint[]) => void;
  skills: SkillPoints | undefined;
  resultsCount: string;
  onResultsCount: (value: string) => void;
  deadlineSeconds: string;
  onDeadlineSeconds: (value: string) => void;
  running: boolean;
  canRun: boolean;
  onRun: () => void;
  onStop: () => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

const numberInput =
  'h-7 rounded-[2px] border border-line bg-background text-end font-mono text-[11.5px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-60';

const select =
  'h-7 max-w-[190px] rounded-[2px] border border-line bg-background px-2 text-[12.5px] font-semibold text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-60';

/**
 * La barra entera abre y cierra la hoja, menos lo que ya es un control: un clic
 * en un `select`, un input o el boton de Run no debe mover la hoja. Los grupos
 * de condiciones se marcan con `data-no-toggle` para que ni su borde ni su
 * espacio muerto cuenten como superficie.
 */
const isControl = (target: EventTarget | null): boolean =>
  Boolean(
    target instanceof Element &&
      target.closest(
        'a, button, input, select, textarea, label, [role="radiogroup"], [data-no-toggle]',
      ),
  );

/**
 * Barra de setup: personaje, objetivo, condiciones, habilidades, cantidad de
 * resultados, limite de tiempo y la accion. Es lo que reemplaza a las cinco
 * tarjetas de decision, y queda pegada arriba para que el boton nunca exija
 * scrollear.
 */
export function SetupBar({
  id,
  template,
  profile,
  objectiveId,
  onObjective,
  constraints,
  onConstraints,
  skills,
  resultsCount,
  onResultsCount,
  deadlineSeconds,
  onDeadlineSeconds,
  running,
  canRun,
  onRun,
  onStop,
  sheetOpen,
  onToggleSheet,
}: SetupBarProps) {
  const objective =
    template.objectives.find((entry) => entry.id === objectiveId) ?? template.objectives[0];
  const levelKey = template.leveling?.levelKey;
  const level = levelKey && profile ? profile.base[levelKey] : undefined;
  const maxLevel = template.leveling?.max;

  const toggleFromSurface = (event: MouseEvent<HTMLDivElement>) => {
    if (isControl(event.target)) return;
    if (window.getSelection()?.toString()) return;
    onToggleSheet();
  };

  return (
    <div className="sticky top-16 z-30 -mx-4 bg-background px-4 pt-1">
      <div
        onClick={toggleFromSurface}
        className={`flex min-h-[60px] cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 border border-line bg-surface px-3.5 py-2 ${
          sheetOpen ? 'rounded-t-[4px] border-b-transparent' : 'rounded-[4px]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="sr-only">{gameCopy.cockpit.character}</span>
          {profile ? (
            <>
              <ItemGlyph
                name={profile.name}
                sources={template.assets ? characterIconUrls(template.assets, profile) : []}
                className="h-8 w-8 text-[10px]"
              />
              <span className="min-w-0">
                <span className="block max-w-[14ch] truncate text-[13px] font-semibold leading-tight">
                  {profile.name}
                </span>
                <span className="block font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
                  {level === undefined
                    ? gameCopy.cockpit.noLevel
                    : `${gameCopy.cockpit.level} ${level}${maxLevel === undefined ? '' : ` / ${maxLevel}`}`}
                </span>
              </span>
            </>
          ) : (
            <span className="text-[12.5px] text-muted-foreground">
              {gameCopy.cockpit.noCharacter}
            </span>
          )}
        </div>

        <span className="hidden w-px self-stretch bg-line min-[861px]:block" aria-hidden="true" />

        <div className="flex flex-col gap-1">
          <span className="label-caps">{gameCopy.cockpit.target}</span>
          {template.objectives.length > 1 ? (
            <select
              aria-label={gameCopy.cockpit.target}
              className={select}
              value={objective?.id ?? ''}
              disabled={running}
              onChange={(event) => onObjective(event.target.value)}
            >
              {template.objectives.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex h-7 items-center text-[12.5px] font-semibold">
              {objective?.name ?? '—'}
            </span>
          )}
        </div>

        <div className="flex min-w-0 grow basis-[240px] flex-col gap-1">
          <span className="label-caps">{gameCopy.cockpit.constraints}</span>
          <ConstraintEditor
            template={template}
            constraints={constraints}
            onChange={onConstraints}
            addLabel={gameCopy.cockpit.addCondition}
          />
        </div>

        {skills ? (
          <div className="flex flex-col gap-1">
            <span className="label-caps">{gameCopy.cockpit.skills}</span>
            <Link
              to={`/optimizer/${id}/habilidades`}
              className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] transition-colors hover:border-line-strong"
              title={gameCopy.cockpit.skillsPoints}
            >
              <IconSkills className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9.5px] uppercase tracking-[0.05em] text-muted-foreground">
                {gameCopy.cockpit.skillsPoints}
              </span>
              <span className="tabular-nums">
                <b className="font-semibold">{skills.spent}</b>
                {skills.budget === undefined ? null : (
                  <span className="text-muted-foreground">/{skills.budget}</span>
                )}
              </span>
            </Link>
          </div>
        ) : null}

        <span className="hidden w-px self-stretch bg-line min-[861px]:block" aria-hidden="true" />

        <div className="flex flex-col gap-1">
          <span className="label-caps">{gameCopy.cockpit.resultsCount}</span>
          <span
              data-no-toggle
              className="flex h-7 items-center gap-1 rounded-[2px] border border-line bg-background px-1.5"
            >
            <input
              type="text"
              inputMode="numeric"
              aria-label={gameCopy.cockpit.resultsCount}
              className={`${numberInput} w-7 border-0 bg-transparent`}
              value={resultsCount}
              disabled={running}
              onChange={(event) => {
                const next = event.target.value;
                if (/^\d*$/.test(next)) onResultsCount(next);
              }}
            />
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {gameCopy.cockpit.resultsUnit}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="label-caps">{gameCopy.cockpit.timeLimit}</span>
          <span className="flex items-center gap-1.5">
            <span
              data-no-toggle
              className="flex h-7 items-center gap-1 rounded-[2px] border border-line bg-background px-1.5"
            >
              <input
                type="text"
                inputMode="numeric"
                aria-label={gameCopy.cockpit.timeLimit}
                className={`${numberInput} w-6 border-0 bg-transparent`}
                value={deadlineSeconds}
                disabled={running}
                onChange={(event) => {
                  const next = event.target.value;
                  if (/^\d*$/.test(next)) onDeadlineSeconds(next);
                }}
              />
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {gameCopy.cockpit.timeUnit === 'seconds' ? 's' : gameCopy.cockpit.timeUnit}
              </span>
            </span>
            <span className="hidden text-[9.5px] text-muted-foreground min-[1301px]:inline">
              {gameCopy.cockpit.noLimit}
            </span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={`/optimizer/${id}`}
            aria-label={gameCopy.cockpit.howItWorks}
            title={gameCopy.cockpit.howItWorks}
            className="grid h-8 w-8 place-items-center rounded-[2px] border border-line font-mono text-[12px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
          >
            ?
          </Link>

          {running ? (
            <Button variant="outline" size="sm" onClick={onStop}>
              {gameCopy.cockpit.stop}
            </Button>
          ) : (
            <Button size="sm" onClick={onRun} disabled={!canRun}>
              {gameCopy.cockpit.run}
            </Button>
          )}

          <button
            type="button"
            onClick={onToggleSheet}
            aria-expanded={sheetOpen}
            aria-controls="setup-sheet"
            aria-label={sheetOpen ? gameCopy.cockpit.hideSetup : gameCopy.cockpit.showSetup}
            className="grid h-8 w-8 place-items-center rounded-[2px] border border-line text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className={`transition-transform duration-200 ${sheetOpen ? 'rotate-180' : ''}`}
            >
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
