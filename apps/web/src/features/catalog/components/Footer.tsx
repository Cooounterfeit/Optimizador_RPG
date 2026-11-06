import { copy } from '../copy';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-6 pb-6 pt-4 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground max-[860px]:px-4">
        <span>Zenith Optimizer</span>
        <span className="ml-auto">{copy.footer.privacy}</span>
        <span className="basis-full normal-case tracking-normal">
          © {new Date().getFullYear()} · {copy.footer.legal}
        </span>
      </div>
    </footer>
  );
}
