import { useEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import { monogram } from '../catalog/monogram';

interface ItemGlyphProps {
  name: string;
  rarity?: number;
  sources?: string[];
  className?: string;
}

/**
 * Icono de un objeto con respaldo tipografico. Prueba las fuentes en orden
 * (almacen propio y CDN) y, si todas fallan, muestra las iniciales.
 */
export function ItemGlyph({ name, rarity, sources, className }: ItemGlyphProps) {
  const list = useMemo(() => sources?.filter(Boolean) ?? [], [sources]);
  const key = list.join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [key]);

  const current = list[index];
  const showImage = Boolean(current);

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
          src={current}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain p-1"
          onError={() => setIndex((value) => value + 1)}
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
