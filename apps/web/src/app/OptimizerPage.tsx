import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button, buttonVariants } from '../components/ui/Button';
import { cn } from '../lib/cn';
import { EmptyState } from '../features/catalog/components/EmptyState';
import { CoverArt } from '../features/catalog/components/CoverArt';
import { getCatalogRepository } from '../features/catalog/catalog-repository';
import type { CatalogOptimizer } from '../features/catalog/types';
import { gameCopy } from '../features/game/copy';
import { useGame } from '../features/game/useGame';
import { useInventory } from '../features/inventory/useInventory';
import { ItemGlyph } from '../features/inventory/ItemGlyph';
import { itemIconUrl } from '../lib/images';

export function OptimizerPage() {
  const { id = '' } = useParams();
  const { state, retry } = useGame(id);
  const template = state.status === 'ready' ? state.template : undefined;

  const inventory = useInventory(template?.gameId);
  const [profileId, setProfileId] = useState('');
  const [objectiveId, setObjectiveId] = useState('');
  const [demoCard, setDemoCard] = useState<CatalogOptimizer | null>(null);

  /**
   * El catalogo mock trae tarjetas de diseno que no tienen plantilla. En vez de
   * un error seco, se muestra la ficha de la tarjeta con un aviso.
   */
  useEffect(() => {
    if (state.status !== 'error') {
      setDemoCard(null);
      return;
    }

    let alive = true;
    getCatalogRepository()
      .list()
      .then((list) => {
        if (alive) setDemoCard(list.find((optimizer) => optimizer.id === id) ?? null);
      })
      .catch(() => {
        if (alive) setDemoCard(null);
      });

    return () => {
      alive = false;
    };
  }, [state.status, id]);

  if (state.status === 'loading') {
    return <p className="px-6 py-24 text-center text-sm text-muted-foreground">{gameCopy.loading}</p>;
  }

  if (state.status === 'error') {
    if (demoCard) {
      return (
        <div className="mx-auto max-w-[1280px] px-6 py-10 max-[860px]:px-4">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← {gameCopy.backToAll}
          </Link>

          <header className="mt-4 grid gap-6 border-b border-line pb-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <CoverArt name={demoCard.gameName} className="rounded-[4px] border border-line" />
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <p className="label-caps mb-1">{gameCopy.demoEyebrow}</p>
                <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{demoCard.name}</h1>
                <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
                  {demoCard.gameName} · {demoCard.description}
                </p>
              </div>
            </div>
          </header>

          <p className="mt-6 rounded-[4px] border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted-foreground">
            {gameCopy.demoNote}
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={gameCopy.errorTitle} body={state.message}>
          <Button variant="outline" onClick={retry}>
            {gameCopy.retry}
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!template) return null;

  const profile =
    template.baseProfiles.find((entry) => entry.id === profileId) ?? template.baseProfiles[0];
  const objective =
    template.objectives.find((entry) => entry.id === objectiveId) ?? template.objectives[0];

  const counts = [
    { label: gameCopy.counts.stats, value: template.stats.length },
    { label: gameCopy.counts.slots, value: template.slots.length },
    { label: gameCopy.counts.sets, value: template.sets.length },
    { label: gameCopy.counts.objectives, value: template.objectives.length },
    { label: gameCopy.counts.characters, value: template.baseProfiles.length },
  ];

  const items = inventory.items ?? [];
  const constrainable = template.constrainableStats
    .map((statId) => template.stats.find((stat) => stat.id === statId)?.name ?? statId)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-6 max-[860px]:px-4">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← {gameCopy.backToAll}
      </Link>

      <header className="mt-4 grid gap-6 border-b border-line pb-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <CoverArt name={template.name} cover={template.cover} className="rounded-[4px] border border-line">
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-[1px] bg-foreground px-2 py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.13em] text-primary-foreground">
            <span className="h-1 w-1 bg-current" aria-hidden="true" />
            {gameCopy.cockpit.published}
          </span>
        </CoverArt>

        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <p className="label-caps mb-1">{gameCopy.eyebrow}</p>
            <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{template.name}</h1>
            <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
              {template.description}
            </p>
            {template.category ? (
              <span className="mt-3 inline-block rounded-[2px] border border-line px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {template.category}
              </span>
            ) : null}
          </div>

          <dl className="flex flex-wrap border-y border-line py-2.5">
            {counts.map((count) => (
              <div key={count.label} className="min-w-[92px] border-r border-line px-4 first:pl-0 last:border-r-0">
                <dt className="label-caps mb-0.5">{count.label}</dt>
                <dd className="m-0 font-mono text-lg leading-none tabular-nums">{count.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">01 · {gameCopy.cockpit.character}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.characterHint}</p>
            <label className="sr-only" htmlFor="optimizer-profile">
              {gameCopy.cockpit.character}
            </label>
            <select
              id="optimizer-profile"
              className="mt-3 h-10 w-full rounded-[2px] border border-line bg-background px-3 text-[13px] text-foreground outline-none transition-colors focus:border-line-strong"
              value={profile?.id ?? ''}
              onChange={(event) => setProfileId(event.target.value)}
            >
              {template.baseProfiles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">02 · {gameCopy.cockpit.objective}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.objectiveHint}</p>
            <div className="mt-3 flex flex-col gap-1" role="radiogroup" aria-label={gameCopy.cockpit.objective}>
              {template.objectives.map((entry) => {
                const active = entry.id === objective?.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setObjectiveId(entry.id)}
                    className={cn(
                      'rounded-[3px] border px-3 py-2 text-left transition-colors duration-150',
                      active
                        ? 'border-foreground bg-raised'
                        : 'border-transparent hover:border-line hover:bg-raised',
                    )}
                  >
                    <span className="block text-[13px] font-semibold leading-snug">{entry.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground line-clamp-2">
                      {entry.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[4px] border border-line bg-surface p-4">
            <p className="label-caps">03 · {gameCopy.cockpit.constraints}</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.constraintsHint}</p>
            {constrainable.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {constrainable.map((name) => (
                  <span
                    key={name}
                    className="rounded-[2px] border border-line px-2 py-1 font-mono text-[10px] text-muted-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[4px] border border-line bg-surface p-5">
            <p className="label-caps">{gameCopy.cockpit.ready}</p>
            <p className="mt-1 max-w-[60ch] text-[13px] text-muted-foreground">
              {gameCopy.cockpit.readyBody}
            </p>

            <ol className="mt-5 flex flex-col gap-3">
              {gameCopy.cockpit.steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="w-6 shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold leading-snug">{step.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Link to={`/optimizer/${id}/inventario`} className={buttonVariants()}>
                {gameCopy.openInventory}
              </Link>
              <Button variant="outline" disabled title={gameCopy.cockpit.optimizeNote}>
                {gameCopy.cockpit.optimize}
              </Button>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {gameCopy.cockpit.optimizeNote}
              </span>
            </div>
          </section>

          <section className="rounded-[4px] border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label-caps">{gameCopy.cockpit.inventory}</p>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {inventory.items === null ? '…' : gameCopy.cockpit.items(items.length)}
              </span>
            </div>

            {inventory.items === null ? (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {gameCopy.loading}
              </p>
            ) : items.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                {gameCopy.cockpit.inventoryEmpty}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0">
                    <ItemGlyph
                      name={item.name}
                      rarity={item.rarity}
                      src={itemIconUrl(item)}
                      className="h-9 w-9 text-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{item.name}</p>
                      <p className="truncate font-mono text-[9.5px] text-muted-foreground">
                        {template.slots.find((slot) => slot.id === item.slot)?.name ?? item.slot}
                        {item.level !== undefined ? ` · Lv. ${item.level}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Link
                to={`/optimizer/${id}/inventario`}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {gameCopy.viewAllItems} →
              </Link>
              <Link
                to={`/optimizer/${id}/inventario?tab=catalog`}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {gameCopy.browseCatalog} →
              </Link>
            </div>
          </section>

          {template.notes ? (
            <details className="rounded-[4px] border border-line bg-surface px-5 py-4">
              <summary className="label-caps cursor-pointer list-none">
                {gameCopy.cockpit.templateNotes}
              </summary>
              <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
                {template.notes}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
