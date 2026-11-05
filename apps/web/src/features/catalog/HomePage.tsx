import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button, buttonVariants } from '../../components/ui/Button';

import { getCatalogRepository } from './catalog-repository';
import { CatalogGrid } from './components/CatalogGrid';
import { EmptyState } from './components/EmptyState';
import { FilterRail } from './components/FilterRail';
import { HeroBanner } from './components/HeroBanner';
import { UpdatesRail } from './components/UpdatesRail';
import { copy } from './copy';
import {
  categoryFacets,
  filterOptimizers,
  initialFilterState,
  topRanks,
  type CatalogFilterState,
} from './filters';
import type { CatalogOptimizer } from './types';

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';

  const [optimizers, setOptimizers] = useState<CatalogOptimizer[] | null>(null);
  const [state, setState] = useState<CatalogFilterState>(initialFilterState);

  useEffect(() => {
    let alive = true;

    getCatalogRepository()
      .list()
      .then((list) => {
        if (alive) setOptimizers(list);
      })
      .catch(() => {
        if (alive) setOptimizers([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(() => optimizers ?? [], [optimizers]);
  const facets = useMemo(() => categoryFacets(all), [all]);
  const ranks = useMemo(() => topRanks(all), [all]);
  const visible = useMemo(
    () => filterOptimizers(all, { ...state, query }),
    [all, state, query],
  );

  const clear = () => {
    setState(initialFilterState);
    const next = new URLSearchParams(params);
    next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-[72px] pt-6 max-[860px]:px-4">
      <HeroBanner />

      <div className="workspace">
        <FilterRail
          facets={facets}
          total={all.length}
          state={state}
          onCategory={(category) => setState((current) => ({ ...current, category }))}
          onSort={(sort) => setState((current) => ({ ...current, sort }))}
          onTopOnly={(topOnly) => setState((current) => ({ ...current, topOnly }))}
        />

        <section id="catalog" className="catalog" aria-labelledby="catalog-title">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 className="m-0 text-lg font-bold tracking-[-0.025em]" id="catalog-title">
              {copy.catalog.title}
            </h2>
            <p className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span>
                <b className="font-semibold text-foreground">{visible.length}</b> {copy.catalog.of}{' '}
                <b className="font-semibold text-foreground">{all.length}</b> {copy.catalog.shown}
              </span>
            </p>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {visible.length === 0
              ? 'No optimizers match the current filters'
              : `${visible.length} optimizers shown`}
          </p>

          {optimizers === null ? (
            <p className="py-16 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {copy.catalog.loading}
            </p>
          ) : all.length === 0 ? (
            <EmptyState
              title={copy.catalog.emptyCatalogTitle}
              body={copy.catalog.emptyCatalogBody}
            >
              <Link to="/login" className={buttonVariants()}>
                {copy.catalog.createFirst}
              </Link>
            </EmptyState>
          ) : visible.length > 0 ? (
            <CatalogGrid optimizers={visible} ranks={ranks} />
          ) : (
            <EmptyState title={copy.catalog.emptyTitle} body={copy.catalog.emptyBody}>
              <Button variant="outline" onClick={clear}>
                {copy.catalog.clear}
              </Button>
            </EmptyState>
          )}
        </section>

        <UpdatesRail />
      </div>
    </div>
  );
}
