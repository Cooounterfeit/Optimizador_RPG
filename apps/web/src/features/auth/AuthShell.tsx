import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, lede, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto max-w-[420px] px-6 py-20">
      <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{lede}</p>
      {children}
      {footer ? <div className="mt-6 text-[13px] text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

export const fieldClass =
  'h-[38px] w-full rounded-[2px] border border-line bg-surface px-3 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-line-strong';

export const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground';

export const errorClass = 'mb-4 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12.5px] text-[oklch(0.78_0.16_25)]';
