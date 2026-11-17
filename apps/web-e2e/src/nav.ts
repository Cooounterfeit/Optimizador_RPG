import type { Page } from '@playwright/test';

/** Navegacion del workspace: todas las secciones se alcanzan por el rail. */
export const rail = (page: Page) => page.getByRole('navigation', { name: 'Optimizer' });

export const railLink = (page: Page, name: string) =>
  rail(page).getByRole('link', { name, exact: true });

export type SectionId = 'optimize' | 'character' | 'inventory' | 'skills' | 'damage';

/**
 * Las secciones visitadas siguen montadas (ocultas) para no perder su estado.
 * Cuando un texto existe en dos secciones hay que acotar la busqueda a una.
 */
export const section = (page: Page, id: SectionId) => page.locator(`[data-section="${id}"]`);
