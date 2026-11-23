import { Link } from 'react-router-dom';

import { IconGrid } from '../../../components/icons';
import { sectionHref, type WorkspaceSection } from './sections';

interface WorkspaceRailProps {
  id: string;
  sections: WorkspaceSection[];
  activeId: string | undefined;
}

/**
 * Navegacion del workspace: rail de iconos de 56 px que se expande a 208 px al
 * pasar el mouse o al tabular, por encima del contenido (no lo empuja).
 *
 * La expansion por teclado usa `:focus-visible`, no `:focus-within`: con
 * `:focus-within` el link clickeado se quedaba con el foco y el rail no volvia a
 * cerrarse al sacar el mouse.
 *
 * En pantallas angostas se vuelve una franja horizontal con nombres, porque el
 * hover no existe en tactil.
 */
const EXPANDED = 'has-[a:focus-visible]:';

/**
 * El item ocupa siempre el ancho disponible y el icono se queda a la izquierda:
 * el centrado del rail cerrado sale del padding, que se anima junto con el
 * ancho del panel. Antes el item pasaba de `w-10 mx-auto` a `w-full` al instante
 * y, al cerrar, el icono saltaba al centro del panel ancho mientras este se
 * encogia (el "rebote").
 */
const itemBase =
  'flex h-10 w-full items-center justify-start gap-3 rounded-[2px] pl-3 pr-2 text-[13px] transition-[padding,color,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:pl-2.5 group-hover:pr-2.5 motion-reduce:transition-none max-[860px]:w-auto max-[860px]:gap-2 max-[860px]:pl-2.5 max-[860px]:pr-2.5';

const labelBase =
  'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-150 group-hover:max-w-[140px] group-hover:opacity-100 motion-reduce:transition-none max-[860px]:max-w-[140px] max-[860px]:opacity-100';

const itemExpanded = `${EXPANDED}pl-2.5 ${EXPANDED}pr-2.5`;

const labelExpanded = `${EXPANDED}max-w-[140px] ${EXPANDED}opacity-100`;

/** `cn` fusionaria `pl-3` con `pl-2.5`; aqui los dos estados deben convivir. */
const itemClass = (active: boolean): string =>
  `${itemBase} ${itemExpanded} ${
    active
      ? 'bg-raised font-semibold text-foreground'
      : 'text-muted-foreground hover:bg-raised hover:text-foreground'
  }`;

export function WorkspaceRail({ id, sections, activeId }: WorkspaceRailProps) {
  return (
    <nav
      aria-label="Optimizer"
      className="sticky top-16 z-[90] w-14 shrink-0 self-start max-[860px]:top-16 max-[860px]:w-full"
    >
      <div className="group h-[calc(100dvh-4rem)] w-14 overflow-hidden border-r border-line bg-surface transition-[width] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:w-52 has-[a:focus-visible]:w-52 motion-reduce:transition-none max-[860px]:h-auto max-[860px]:w-full max-[860px]:border-b max-[860px]:border-r-0 max-[860px]:hover:w-full max-[860px]:has-[a:focus-visible]:w-full">
        <ul className="flex h-full flex-col gap-0.5 p-1.5 max-[860px]:h-auto max-[860px]:flex-row max-[860px]:overflow-x-auto">
          {sections.map((section) => {
            const active = section.id === activeId;

            return (
              <li key={section.id}>
                <Link
                  to={sectionHref(id, section)}
                  aria-current={active ? 'page' : undefined}
                  className={itemClass(active)}
                >
                  <section.Icon className="h-5 w-5 shrink-0" />
                  <span className={`${labelBase} ${labelExpanded}`}>
                    {section.label}
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="mt-auto border-t border-line pt-1.5 max-[860px]:mt-0 max-[860px]:border-t-0 max-[860px]:pt-0">
            <Link to="/" className={itemClass(false)}>
              <IconGrid className="h-5 w-5 shrink-0" />
              <span className={`${labelBase} ${labelExpanded}`}>
                All optimizers
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
