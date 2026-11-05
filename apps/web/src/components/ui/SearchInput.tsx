import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

/** Buscador del topbar. El atajo "/" enfoca el campo. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, label, ...props },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = inputRef.current;

      if (!element) return;

      if (event.key === '/' && document.activeElement !== element) {
        event.preventDefault();
        element.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={cn('relative w-full max-w-[520px] mx-auto', className)}>
      <label className="sr-only" htmlFor="catalog-search">
        {label}
      </label>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="square"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5 21 21" />
      </svg>
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        id="catalog-search"
        type="search"
        spellCheck={false}
        autoComplete="off"
        className="h-[38px] w-full rounded-[2px] border border-line bg-surface pl-9 pr-[52px] text-base text-foreground transition-colors duration-150 placeholder:text-muted-foreground hover:border-line-strong focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_var(--color-foreground)] focus-visible:outline-none"
        {...props}
      />
      <kbd className="pointer-events-none absolute right-[9px] top-1/2 -translate-y-1/2 rounded-[2px] border border-line bg-background px-[5px] py-px font-mono text-[10px] text-muted-foreground">
        /
      </kbd>
    </div>
  );
});
