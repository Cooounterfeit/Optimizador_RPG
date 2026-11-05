import type { CatalogOptimizer } from '../types';
import { OptimizerCard } from './OptimizerCard';

interface CatalogGridProps {
  optimizers: CatalogOptimizer[];
  ranks: Map<string, number>;
}

export function CatalogGrid({ optimizers, ranks }: CatalogGridProps) {
  return (
    <div className="catalog-grid">
      {optimizers.map((optimizer, index) => (
        <OptimizerCard
          key={optimizer.id}
          optimizer={optimizer}
          rank={ranks.get(optimizer.id)}
          index={index}
        />
      ))}
    </div>
  );
}
