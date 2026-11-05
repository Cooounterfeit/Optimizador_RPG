import { copy } from '../copy';

export function UpdatesRail() {
  return (
    <aside className="rail rail-right" aria-labelledby="updates-title">
      <div>
        <h2 className="label-caps mb-4" id="updates-title">
          {copy.updates.title}
        </h2>
        <div className="rounded-[6px] border border-dashed border-line-strong p-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {copy.updates.workInProgress}
          </span>
          <p className="mt-2 text-[12.5px] leading-[1.5] text-muted-foreground">
            {copy.updates.body}
          </p>
        </div>
      </div>
    </aside>
  );
}
