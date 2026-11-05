import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body: string;
  children?: ReactNode;
}

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <div className="rounded-[6px] border border-dashed border-line-strong px-6 py-[72px] text-center">
      <h3 className="mb-2 text-md font-bold">{title}</h3>
      <p className="mb-6 text-[13.5px] text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
