import { cn } from '../../../lib/cn';
import { copy } from '../copy';
import type { SortKey } from '../filters';

const options: { key: SortKey; label: string }[] = [
  { key: 'top', label: copy.filters.sortTop },
  { key: 'new', label: copy.filters.sortNew },
  { key: 'az', label: copy.filters.sortAz },
];

interface SortControlProps {
  value: SortKey;
  onChange: (sort: SortKey) => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div
      className="grid grid-flow-col grid-cols-3 gap-px rounded-[2px] border border-line bg-muted p-0.5"
      role="group"
      aria-label={copy.filters.sort}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'rounded-[1px] px-3 py-1.5 text-[11.5px] font-medium transition-colors hover:text-foreground',
            value === option.key
              ? 'bg-raised font-bold text-foreground shadow-[0_0_0_1px_var(--color-line-strong)]'
              : 'text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
