import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../../lib/cn';
import { accentHue } from '../accent';
import { monogram } from '../monogram';

interface CoverArtProps {
  name: string;
  cover?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Portada por defecto: degradado determinístico + iniciales. Si el creador subió
 * una imagen, se dibuja encima y el degradé queda de respaldo.
 */
export function CoverArt({ name, cover, className, children }: CoverArtProps) {
  const hue = accentHue(name);
  const hue2 = (hue + 28) % 360;

  const art = [
    `radial-gradient(95% 120% at 18% 4%, oklch(0.76 0.15 ${hue} / 0.95) 0%, transparent 58%)`,
    `radial-gradient(70% 100% at 96% 100%, oklch(0.52 0.17 ${hue2} / 0.75) 0%, transparent 64%)`,
    `linear-gradient(152deg, oklch(0.43 0.105 ${hue}) 0%, oklch(0.19 0.02 ${hue}) 84%)`,
  ].join(', ');

  return (
    <div
      className={cn('relative aspect-video overflow-hidden border-b border-line', className)}
      style={{ '--h': hue, '--h2': hue2 } as CSSProperties}
    >
      {cover ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: art }} aria-hidden="true" />
          <div
            className="absolute inset-0 opacity-45 mix-blend-overlay"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, oklch(1 0 0 / 0.26) 1px, transparent 1.6px)',
              backgroundSize: '5px 5px',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'var(--grain)', backgroundSize: '180px 180px' }}
            aria-hidden="true"
          />
          <span className="absolute -bottom-3 left-3.5 select-none font-display text-[72px] leading-none tracking-[-0.02em] text-white/20">
            {monogram(name)}
          </span>
        </>
      )}
      {children}
    </div>
  );
}
