import { cn } from '../../../lib/cn';
import { copy } from '../copy';
import type { CatalogFilterState, CategoryFacet, SortKey } from '../filters';
import { SortControl } from './SortControl';

interface FilterRailProps {
  facets: CategoryFacet[];
  total: number;
  state: CatalogFilterState;
  onCategory: (category: string) => void;
  onSort: (sort: SortKey) => void;
  onTopOnly: (value: boolean) => void;
}

export function FilterRail({
  facets,
  total,
  state,
  onCategory,
  onSort,
  onTopOnly,
}: FilterRailProps) {
  const categories = [{ name: 'all', count: total }, ...facets];

  return (
    <aside className="rail rail-left" aria-labelledby="filters-title">
      <div>
        <h2 className="label-caps mb-4 flex items-baseline justify-between gap-2" id="filters-title">
          {copy.filters.title}
          <span className="font-mono text-[10px] font-normal normal-case tracking-normal">
            {facets.length}
          </span>
        </h2>

        <div className="filter-list flex flex-col gap-0.5" role="group" aria-labelledby="filters-title">
          {categories.map(({ name, count }) => {
            const active = state.category === name;
            const label = name === 'all' ? copy.filters.all : name;

            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => onCategory(name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[2px] px-2 py-2 text-left text-[13px] transition-colors',
                  active
                    ? 'bg-raised font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn('filter-mark h-3.5 w-1 shrink-0', active ? 'bg-foreground' : 'bg-transparent')}
                />
                {label}
                <span
                  className={cn(
                    'ml-auto font-mono text-[10px]',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="label-caps mb-4">{copy.filters.sort}</h2>
        <SortControl value={state.sort} onChange={onSort} />
      </div>

      <div>
        <button
          type="button"
          aria-pressed={state.topOnly}
          onClick={() => onTopOnly(!state.topOnly)}
          className={cn(
            'flex w-full items-center gap-2 rounded-[2px] border px-2 py-2 text-left text-[12.5px] transition-colors hover:text-foreground',
            state.topOnly
              ? 'border-foreground bg-raised text-foreground'
              : 'border-line text-muted-foreground hover:border-line-strong',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'h-3 w-3 shrink-0 rounded-[1px] border border-line-strong',
              state.topOnly && 'border-foreground bg-foreground',
            )}
          />
          {copy.filters.topOnly}
        </button>
      </div>
    </aside>
  );
}
