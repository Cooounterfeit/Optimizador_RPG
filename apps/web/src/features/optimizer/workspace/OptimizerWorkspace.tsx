import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { GameTemplate } from '@zenith/shared-types';

import { Button, buttonVariants } from '../../../components/ui/Button';
import { getCatalogRepository } from '../../catalog/catalog-repository';
import { CoverArt } from '../../catalog/components/CoverArt';
import { EmptyState } from '../../catalog/components/EmptyState';
import { Footer } from '../../catalog/components/Footer';
import { copy } from '../../catalog/copy';
import type { CatalogOptimizer } from '../../catalog/types';
import { gameCopy } from '../../game/copy';
import {
  WORKSPACE_SECTIONS,
  sectionFromSplat,
  type WorkspaceSectionId,
} from './sections';
import { OptimizerWorkspaceProvider, useOptimizerWorkspace } from './OptimizerWorkspaceProvider';
import { WorkspaceRail } from './WorkspaceRail';
import { useSectionScrollMemory } from './useSectionScrollMemory';

/**
 * Espacio de trabajo de un optimizador: un rail de secciones a la izquierda y
 * las secciones a la derecha.
 *
 * `router.tsx` monta esta ruta una sola vez (`optimizer/:id/*`), asi que las
 * secciones no se resuelven como rutas hijas: eso las desmontaria en cada
 * cambio. Aqui se montan al primer uso y despues solo se ocultan, que es lo que
 * conserva filtros, pestaña, scroll y una busqueda en curso.
 */
export function OptimizerWorkspace() {
  return (
    <OptimizerWorkspaceProvider>
      <WorkspaceBody />
    </OptimizerWorkspaceProvider>
  );
}

function WorkspaceBody() {
  const { id, state, retry } = useOptimizerWorkspace();
  const { '*': splat = '' } = useParams();
  const [demoCard, setDemoCard] = useState<CatalogOptimizer | null>(null);

  /**
   * El catalogo mock trae tarjetas de diseno que no tienen plantilla. En vez de
   * un error seco, se muestra la ficha de la tarjeta con un aviso.
   */
  useEffect(() => {
    if (state.status !== 'error') {
      setDemoCard(null);
      return;
    }

    let alive = true;
    getCatalogRepository()
      .list()
      .then((list) => {
        if (alive) setDemoCard(list.find((optimizer) => optimizer.id === id) ?? null);
      })
      .catch(() => {
        if (alive) setDemoCard(null);
      });

    return () => {
      alive = false;
    };
  }, [state.status, id]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
        <p className="flex-1 px-6 py-24 text-center text-sm text-muted-foreground">
          {gameCopy.loading}
        </p>
        <Footer />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
        <div className="flex-1">
          {demoCard ? (
            <DemoCard card={demoCard} />
          ) : (
            <div className="mx-auto max-w-[720px] px-6 py-24">
              <EmptyState title={gameCopy.errorTitle} body={state.message}>
                <Button variant="outline" onClick={retry}>
                  {gameCopy.retry}
                </Button>
              </EmptyState>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return <WorkspaceSections id={id} template={state.template} splat={splat} />;
}

function WorkspaceSections({
  id,
  template,
  splat,
}: {
  id: string;
  template: GameTemplate;
  splat: string;
}) {
  const active = sectionFromSplat(splat);
  const [visited, setVisited] = useState<WorkspaceSectionId[]>(() => (active ? [active.id] : []));

  useEffect(() => {
    const section = sectionFromSplat(splat);
    if (!section) return;
    setVisited((current) => (current.includes(section.id) ? current : [...current, section.id]));
  }, [splat]);

  useSectionScrollMemory(active?.id);

  const railSections = WORKSPACE_SECTIONS.filter(
    (section) => !section.isAvailable || section.isAvailable(template),
  );

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] max-[860px]:flex-col">
      <WorkspaceRail id={id} sections={railSections} activeId={active?.id} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">
          {active ? null : <UnknownSection id={id} />}

          {visited.map((sectionId) => {
            const section = WORKSPACE_SECTIONS.find((entry) => entry.id === sectionId);
            if (!section) return null;
            const isActive = section.id === active?.id;

            return (
              <div key={`${id}:${section.id}`} data-section={section.id} hidden={!isActive}>
                <section.Component />
              </div>
            );
          })}
        </div>

        <Footer />
      </div>
    </div>
  );
}

function UnknownSection({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-24">
      <EmptyState title={copy.pages.notFoundTitle} body={copy.pages.notFoundBody}>
        <Link to={`/optimizer/${id}`} className={buttonVariants({ variant: 'outline' })}>
          {gameCopy.backToOptimizer}
        </Link>
      </EmptyState>
    </div>
  );
}

function DemoCard({ card }: { card: CatalogOptimizer }) {
  return (
    <div className="mx-auto max-w-[1280px] px-6 py-10 max-[860px]:px-4">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← {gameCopy.backToAll}
      </Link>

      <header className="mt-4 grid gap-6 border-b border-line pb-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <CoverArt name={card.gameName} className="rounded-[4px] border border-line" />
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <p className="label-caps mb-1">{gameCopy.demoEyebrow}</p>
            <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{card.name}</h1>
            <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
              {card.gameName} · {card.description}
            </p>
          </div>
        </div>
      </header>

      <p className="mt-6 rounded-[4px] border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted-foreground">
        {gameCopy.demoNote}
      </p>
    </div>
  );
}
