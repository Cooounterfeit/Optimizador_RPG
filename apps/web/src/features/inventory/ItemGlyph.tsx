import { useState } from 'react';

import { cn } from '../../lib/cn';
import { monogram } from '../catalog/monogram';

interface ItemGlyphProps {
  name: string;
  rarity?: number;
  src?: string | null;
  className?: string;
}

/**
 * Icono de un objeto con respaldo tipografico. Si no hay URL o la imagen falla,
 * muestra las iniciales y una barra de rareza de cinco segmentos.
 */
export function ItemGlyph({ name, rarity, src, className }: ItemGlyphProps) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-line-strong bg-raised font-mono text-[11px] font-semibold uppercase text-muted-foreground',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={() => setBroken(true)}
        />
      ) : (
        monogram(name)
      )}
      {rarity ? (
        <span className="absolute inset-x-1 bottom-1 flex gap-px">
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={cn('h-[2px] flex-1', step <= rarity ? 'bg-foreground/70' : 'bg-line')}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}
