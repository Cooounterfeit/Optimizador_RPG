import { Link } from 'react-router-dom';

import { gameCopy } from '../../game/copy';
import { inventoryCopy } from '../../inventory/copy';
import { formatCount, formatSeconds } from '../search-summary';
import type { Progress } from '../useOptimizer';

interface RunningPanelProps {
  progress: Progress | null;
  totalCombinations: number | undefined;
  onStop: () => void;
}

/** Busqueda en curso: cuenta lo que va mirando y deja detenerse conservando lo mejor. */
export function RunningPanel({ progress, totalCombinations, onStop }: RunningPanelProps) {
  const evaluated = progress?.evaluated ?? 0;
  const total = totalCombinations ?? 0;
  const share =
    total > 0 ? Math.min(100, Math.max(2, (evaluated / total) * 100)) : undefined;

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
        {gameCopy.cockpit.searchingTitle}
      </h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
        {gameCopy.cockpit.searchingBody}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap justify-between gap-3 font-mono text-[10.5px] text-muted-foreground">
          <span>
            <b className="font-normal text-foreground">{formatCount(evaluated)}</b>{' '}
            {gameCopy.cockpit.evaluatedNow} ·{' '}
            <b className="font-normal text-foreground">{formatCount(progress?.pruned ?? 0)}</b>{' '}
            {gameCopy.cockpit.prunedShare}
          </span>
          <b className="font-normal text-foreground">
            {formatSeconds(progress?.elapsedMs ?? 0)}
          </b>
        </div>

        {share === undefined ? null : (
          <div className="h-[3px] overflow-hidden bg-muted" aria-hidden="true">
            <span
              className="block h-full bg-foreground transition-[width] duration-200"
              style={{ width: `${share}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 font-mono text-[10.5px] text-muted-foreground">
          <span>{gameCopy.cockpit.bestSoFar}</span>
          <b className="font-normal text-foreground">
            {formatCount(progress?.bestScore ?? 0)}
          </b>
        </div>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="mt-4 inline-flex h-8 items-center rounded-[2px] border border-line px-3 text-[12.5px] font-semibold transition-colors hover:border-line-strong hover:bg-raised"
      >
        {gameCopy.cockpit.stopAndKeep}
      </button>
    </section>
  );
}

interface EmptyInventoryPanelProps {
  id: string;
  canLoadSamples: boolean;
  loadingSamples: boolean;
  onLoadSamples: () => void;
}

/** Sin objetos no hay busqueda: se ofrece el inventario y el set de muestra. */
export function EmptyInventoryPanel({
  id,
  canLoadSamples,
  loadingSamples,
  onLoadSamples,
}: EmptyInventoryPanelProps) {
  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
        {gameCopy.cockpit.emptyTitle}
      </h2>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
        {gameCopy.cockpit.emptyBody}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canLoadSamples ? (
          <button
            type="button"
            onClick={onLoadSamples}
            disabled={loadingSamples}
            className="inline-flex h-8 items-center rounded-[2px] bg-primary px-3 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-[oklch(0.99_0_0)] disabled:opacity-60"
          >
            {loadingSamples ? inventoryCopy.loadingSamples : inventoryCopy.loadSamples}
          </button>
        ) : null}
        <Link
          to={`/optimizer/${id}/inventario`}
          className="inline-flex h-8 items-center rounded-[2px] border border-line px-3 text-[12.5px] font-semibold transition-colors hover:border-line-strong"
        >
          {gameCopy.cockpit.openInventory}
        </Link>
      </div>
    </section>
  );
}

interface TemplateGapPanelProps {
  missingProfiles: boolean;
  missingObjectives: boolean;
}

/** La plantilla no declara con que calcular: se dice que falta, no se deshabilita en silencio. */
export function TemplateGapPanel({ missingProfiles, missingObjectives }: TemplateGapPanelProps) {
  return (
    <section className="rounded-[4px] border border-dashed border-line-strong bg-surface p-5">
      {missingProfiles ? (
        <p className="m-0 text-[12.5px] text-muted-foreground">
          {gameCopy.cockpit.missingProfiles}
        </p>
      ) : null}
      {missingObjectives ? (
        <p className="m-0 mt-1 text-[12.5px] text-muted-foreground">
          {gameCopy.cockpit.missingObjectives}
        </p>
      ) : null}
    </section>
  );
}
