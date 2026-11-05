import { buttonVariants } from '../../../components/ui/Button';
import { copy } from '../copy';

export function HeroBanner() {
  return (
    <section
      className="relative isolate grid min-h-[232px] content-end overflow-hidden rounded-[6px] border border-line"
      aria-labelledby="banner-title"
    >
      <div className="banner-art" aria-hidden="true" />
      <div className="banner-scrim" aria-hidden="true" />

      <span className="absolute right-6 top-6 z-[1] -rotate-[2.5deg] rounded-[1px] bg-primary px-2.5 py-[5px] font-mono text-[9px] uppercase tracking-[0.14em] text-primary-foreground max-[720px]:hidden">
        {copy.banner.sticker}
      </span>

      <div className="banner-copy max-w-[620px] p-8">
        <h1
          id="banner-title"
          className="mb-2.5 text-balance text-[40px] font-extrabold uppercase leading-[0.96] tracking-[-0.042em] max-[980px]:text-2xl max-[980px]:leading-none max-[720px]:text-xl"
        >
          {copy.banner.title[0]}
          <br />
          {copy.banner.title[1]}
        </h1>
        <p className="mb-4 max-w-[52ch] text-[13px] leading-[1.55] text-[oklch(0.86_0.004_260)]">
          {copy.banner.lede}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a href="#catalog" className={buttonVariants({ variant: 'primary' })}>
            {copy.banner.browse}
          </a>
          <button
            type="button"
            aria-disabled="true"
            title={copy.soon}
            className={buttonVariants({ variant: 'outline' })}
          >
            {copy.banner.proof}
          </button>
        </div>
      </div>
    </section>
  );
}
