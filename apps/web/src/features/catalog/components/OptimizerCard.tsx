import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { relativeTime } from '../../../lib/relative-time';
import { copy } from '../copy';
import { monogram } from '../monogram';
import type { CatalogOptimizer } from '../types';
import { CoverArt } from './CoverArt';

interface OptimizerCardProps {
  optimizer: CatalogOptimizer;
  rank?: number;
  index?: number;
}

export function OptimizerCard({ optimizer, rank, index = 0 }: OptimizerCardProps) {
  return (
    <article
      className="card-enter group relative flex flex-col overflow-hidden rounded-[6px] border border-line bg-surface transition-colors duration-150 hover:border-line-strong"
      style={{ '--i': index } as CSSProperties}
    >
      <Link
        to={`/optimizer/${optimizer.id}`}
        aria-label={`${copy.card.open} ${optimizer.name}`}
        className="absolute inset-0 z-10 rounded-[inherit]"
      />

      <CoverArt name={optimizer.gameName} cover={optimizer.cover} className="group-hover:[&>div]:scale-[1.035]">
        {rank ? (
          <span className="absolute left-2.5 top-2.5 z-[1] inline-flex items-center gap-[5px] rounded-[1px] border border-transparent bg-foreground px-[7px] py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.13em] text-primary-foreground shadow-[0_1px_0_oklch(0_0_0/0.45)]">
            <span className="h-1 w-1 bg-current" aria-hidden="true" />
            {copy.card.top} {rank}
          </span>
        ) : null}

        {optimizer.category ? (
          <span className="absolute right-2.5 top-2.5 z-[1] font-mono text-[9px] tracking-[0.08em] text-white/60">
            {optimizer.category}
          </span>
        ) : null}
      </CoverArt>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {optimizer.gameName}
        </span>
        <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.015em] text-balance">
          {optimizer.name}
        </h3>

        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span
            className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-line-strong bg-muted font-mono text-[9px] font-semibold uppercase text-foreground"
            aria-hidden="true"
          >
            {monogram(optimizer.author.displayName)}
          </span>
          <span className="text-[oklch(0.88_0.003_260)]">@{optimizer.author.displayName}</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[9.5px]">
            <span title={copy.card.score}>
              <span aria-hidden="true">★</span> {optimizer.score}
            </span>
            <span aria-hidden="true">·</span>
            <span>{relativeTime(optimizer.createdAt)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
