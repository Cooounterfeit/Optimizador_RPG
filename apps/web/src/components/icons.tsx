import type { SVGProps } from 'react';

/**
 * Set de iconos del proyecto: SVG inline, 20x20, trazo 1,5 y color heredado.
 *
 * No hay libreria de iconos y no se agrega una: estos siete trazos cubren la
 * navegacion del workspace. Nada aqui nombra un juego, un elemento ni una
 * ranura; la guardia `check-genres` recorre este archivo.
 */

type IconProps = SVGProps<SVGSVGElement>;

const shape = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  focusable: 'false',
  'aria-hidden': true,
} as const;

/** Overview: ficha del juego, portada y renglones. */
export function IconOverview({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <rect x="3" y="2.5" width="14" height="15" />
      <rect x="5.5" y="5" width="4" height="4" fill="currentColor" stroke="none" />
      <path d="M11.5 5.5h3M11.5 8h3M5.5 12h9M5.5 14.5h6" />
    </svg>
  );
}

/** Ajustes: tres controles deslizantes. Configurar la corrida. */
export function IconOptimize({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <path d="M3 5h14M3 10h14M3 15h14" />
      <rect x="6" y="3.5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="11.5" y="8.5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="8.5" y="13.5" width="3" height="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Personaje: cabeza y hombros. */
export function IconCharacter({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <circle cx="10" cy="6.5" r="2.75" />
      <path d="M4.5 16.5c0-2.9 2.6-4.5 5.5-4.5s5.5 1.6 5.5 4.5" />
    </svg>
  );
}

/** Inventario: dos cajas apiladas. */
export function IconInventory({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <rect x="3.5" y="8" width="13" height="8.5" />
      <rect x="6" y="4" width="8" height="4" />
      <path d="M10 4v4" />
    </svg>
  );
}

/** Habilidades: tronco con una rama y tres nodos. */
export function IconSkills({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <path d="M6 3.5v13" />
      <path d="M6 8h6V3.5" />
      <rect x="4.75" y="2.25" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="10.75" y="2.25" width="2.5" height="2.5" fill="currentColor" stroke="none" />
      <rect x="4.75" y="15" width="2.5" height="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Daño: calculadora, no una espada (evita leer un genero de juego). */
export function IconDamage({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <rect x="4.5" y="2.5" width="11" height="15" />
      <path d="M7 6h6" />
      <rect x="6.5" y="9" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="11.5" y="9" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="6.5" y="13" width="2" height="2" fill="currentColor" stroke="none" />
      <rect x="11.5" y="13" width="2" height="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Catalogo: rejilla de cuatro celdas. */
export function IconGrid({ className }: IconProps) {
  return (
    <svg {...shape} className={className}>
      <rect x="2.25" y="2.25" width="6.5" height="6.5" />
      <rect x="11.25" y="2.25" width="6.5" height="6.5" />
      <rect x="2.25" y="11.25" width="6.5" height="6.5" />
      <rect x="11.25" y="11.25" width="6.5" height="6.5" />
    </svg>
  );
}
