import { Link } from 'react-router-dom';

import { copy } from '../copy';
import type { Draft } from '../useDrafts';

/**
 * Tus borradores, arriba del catalogo. Solo aparece si tienes alguno: a quien
 * nunca creo uno no le dice nada y no deberia ocupar sitio.
 */
export function DraftsRail({ drafts }: { drafts: Draft[] }) {
  if (drafts.length === 0) return null;

  return (
    <section className="mb-8 border-b border-line pb-6" aria-labelledby="drafts-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-lg font-bold tracking-[-0.025em]" id="drafts-title">
          {copy.drafts.title}
        </h2>
        <p className="m-0 font-mono text-[10px] text-muted-foreground">{copy.drafts.note}</p>
      </div>

      <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link
              to={`/optimizer/${draft.id}/configuracion`}
              className="flex min-w-0 items-baseline gap-3 rounded-[2px] border border-line px-3 py-2.5 transition-colors hover:border-line-strong"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                {draft.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                {draft.id}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
