import type { GameTemplate } from '@zenith/shared-types';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/**
 * Resumen corto de un perfil con sus primeros atributos. Se usa donde hay que
 * reconocer al personaje de un vistazo (inventario y selector), sin abrir su
 * ficha ni calcular nada del motor.
 */
export const profileStatsLine = (
  template: GameTemplate,
  profile: GameTemplate['baseProfiles'][number],
  emptyLabel: string,
): string => {
  const entries = template.stats.slice(0, 3);
  if (entries.length === 0) return emptyLabel;
  return entries
    .map((stat) => {
      const unit = stat.unit === 'percent' ? '%' : '';
      return `${stat.name} ${numberFormat.format(profile.base[stat.id] ?? 0)}${unit}`;
    })
    .join(' · ');
};
