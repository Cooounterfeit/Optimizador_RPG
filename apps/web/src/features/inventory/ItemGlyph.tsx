import { cn } from '../../lib/cn';
import { monogram } from '../catalog/monogram';

interface ItemGlyphProps {
  name: string;
  rarity?: number;
  className?: string;
}

/**
 * Marcador de objeto mientras no hay iconos (F6.2). Usa las iniciales del
 * nombre y una barra de rareza de cinco segmentos.
 */
export function ItemGlyph({ name, rarity, className }: ItemGlyphProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-line-strong bg-raised font-mono text-[11px] font-semibold uppercase text-muted-foreground',
        className,
      )}
    >
      {monogram(name)}
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
