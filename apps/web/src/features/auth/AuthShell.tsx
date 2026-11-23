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
      <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">
        {title}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{lede}</p>
      {children}
      {footer ? (
        <div className="mt-6 text-[13px] text-muted-foreground">{footer}</div>
      ) : null}
    </div>
  );
}
