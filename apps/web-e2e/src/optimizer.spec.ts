import { expect, test, type Page } from '@playwright/test';

import { railLink, section } from './nav';

const runSearch = (page: Page) => page.getByRole('button', { name: 'Run search', exact: true });
const openSetup = (page: Page) =>
  page.getByRole('button', { name: 'Show setup' }).click();
const buildRow = (page: Page, rank: number) =>
  page.getByRole('button', { name: `#${rank}`, exact: true });

const addItem = async (page: Page, name: string, slot: string) => {
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Slot', { exact: true }).selectOption(slot);
  await page.getByRole('button', { name: 'Save item' }).click();
  // La seccion Optimize sigue montada y tambien lista los primeros objetos.
  await expect(section(page, 'inventory').getByText(name)).toBeVisible();
};

const loadSamples = async (page: Page) => {
  await page.getByRole('button', { name: 'Load sample items' }).click();
};

test('calcula la mejor build con el inventario del juego sintético', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open Astral Forge optimizer' }).click();
  await railLink(page, 'Inventory').click();

  await addItem(page, 'Demo Blade', 'weapon');
  await addItem(page, 'Demo Flower', 'flower');
  await addItem(page, 'Demo Plume', 'plume');
  await addItem(page, 'Demo Sands', 'sands');
  await addItem(page, 'Demo Goblet', 'goblet');
  await addItem(page, 'Demo Circlet', 'circlet');
  await addItem(page, 'Demo Blade B', 'weapon');
  await addItem(page, 'Demo Flower B', 'flower');
  await addItem(page, 'Demo Plume B', 'plume');
  await addItem(page, 'Demo Sands B', 'sands');
  await addItem(page, 'Demo Goblet B', 'goblet');
  await addItem(page, 'Demo Circlet B', 'circlet');

  await railLink(page, 'Optimize').click();
  await expect(page.getByRole('heading', { name: 'Astral Forge', level: 1 })).toBeVisible();

  // El boton y las decisiones caben sin scrollear.
  await expect(runSearch(page)).toBeInViewport();

  await openSetup(page);
  await expect(page.getByText('Base stats')).toBeVisible();
  await page.getByLabel('Character level').fill('2');
  await page.getByLabel('Character level').press('Enter');
  await expect(page.getByText('Level 2 saved.')).toBeVisible();

  await runSearch(page).click();

  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Optimal').first()).toBeVisible();

  // La fila se abre en el lugar y muestra las piezas y las condiciones.
  const best = buildRow(page, 1);
  await best.click();
  await expect(best).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Pieces', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Current stats').first()).toBeVisible();

  await expect(page.getByText('Compare builds')).toBeVisible();
  await expect(page.getByLabel('Build A')).toBeVisible();
  await expect(page.getByLabel('Build B')).toBeVisible();

  // La comparacion es una barra plegada: al abrirla suma equipamiento y stats.
  await expect(page.getByText('Equipment', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Compare builds' }).click();
  await expect(page.getByText('Equipment', { exact: true })).toBeVisible();
  await expect(page.getByText(/pieces? differ/).first()).toBeVisible();

  // La barra abre y cierra la hoja tambien desde el espacio no interactivo.
  await expect(page.getByRole('button', { name: 'Show setup' })).toBeVisible();
  await page.getByText('Nova', { exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Hide setup' })).toBeVisible();
  await page.getByText('Nova', { exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Show setup' })).toBeVisible();

  // Correr cierra la hoja: se vuelve a abrir para editar las condiciones.
  await openSetup(page);
  await page.getByRole('button', { name: 'Add constraint' }).click();
  await page.locator('#setup-sheet').getByLabel('Value', { exact: true }).fill('999999');
  await runSearch(page).click();
  await expect(page.getByText('No feasible build')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Run without constraints' })).toBeVisible();
});

test('crea y edita una condicion desde la barra', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);

  const values = page.getByLabel('Value', { exact: true });
  await expect(values).toHaveCount(0);

  const add = page.getByRole('button', { name: 'Add condition' });
  await add.click();
  await add.click();
  await expect(values).toHaveCount(2);

  // La regla ≥/≤ tambien se cambia desde la barra.
  await page.getByTitle('Maximum').first().click();
  await expect(page.getByRole('radio', { name: 'Maximum' }).first()).toBeChecked();

  // El valor se escribe, no se sube de a uno.
  await values.first().fill('1000');
  await expect(values.first()).toHaveValue('1000');

  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
});

test('carga el inventario de muestra y optimiza sin agregar objetos a mano', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');

  await expect(page.getByText('No items yet')).toBeVisible();
  await loadSamples(page);

  await expect(runSearch(page)).toBeEnabled();
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
});

test('equipa una build, la lista la marca y sigue equipada al recargar', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');

  await expect(page.getByText('No items yet')).toBeVisible();

  await loadSamples(page);
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await buildRow(page, 1).click();
  await page.getByRole('button', { name: 'Equip', exact: true }).click();

  // La fila de la build equipada queda marcada en su lugar.
  await expect(page.getByText('Equipped', { exact: true })).toBeVisible();

  // Y la build puesta se puede elegir en la comparacion.
  await page.getByRole('button', { name: 'Compare builds' }).click();
  await expect(
    page.getByLabel('Build A').locator('option', { hasText: 'Equipped' }),
  ).toHaveCount(1);

  await page.reload();

  // Sin corrida, la lista muestra la build puesta y su puntaje.
  await expect(page.getByText('My build')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Equipped', exact: true })).toBeVisible();
});

test('muestra las stats de una pieza al pasar el cursor', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await buildRow(page, 1).click();
  const details = page.getByRole('region', { name: /#1 build details/ });
  await details.getByText(/^Weapon/).first().hover();

  const card = page.getByRole('tooltip');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Weapon');
  await expect(card).toContainText('ATK');

  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
});

test('elige personaje desde la rejilla y lo muestra en la tarjeta', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await openSetup(page);

  await page.getByRole('button', { name: /Change/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Astral Forge' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Nova/ })).toHaveAttribute(
    'aria-current',
    'true',
  );

  await dialog.getByRole('button', { name: /^Orion/ }).click();
  await expect(dialog).toBeHidden();
  // La tarjeta de la hoja muestra el nombre junto al retrato, sin boton propio.
  await expect(page.getByRole('group', { name: 'Orion' })).toBeVisible();
  await expect(page.getByText('Base stats')).toBeVisible();
});

test('hoja de personaje: viste una ranura, avisa el requisito y sigue puesta al recargar', async ({
  page,
}) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);

  // El nivel se fija desde el optimizador; la hoja debe mostrarlo, no el de la plantilla.
  await openSetup(page);
  await page.getByLabel('Character level').fill('2');
  await page.getByLabel('Character level').press('Enter');
  await expect(page.getByText('Level 2 saved.')).toBeVisible();

  await railLink(page, 'Character').click();

  // La seccion Optimize sigue montada (oculta): todo lo de abajo se busca en la hoja.
  const sheet = section(page, 'character');

  await expect(sheet.getByRole('heading', { name: 'Nova', level: 1 })).toBeVisible();
  await expect(sheet.getByText('Astral Forge · Level 2')).toBeVisible();
  await expect(sheet.getByRole('tab', { name: 'Equipment & stats' })).toBeVisible();

  await sheet.getByRole('button', { name: 'Weapon: Empty' }).click();
  await sheet.getByRole('button', { name: /Astral Edge/ }).click();
  await expect(sheet.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  // La copa exige mas daño critico del que tiene el personaje al nivel 1.
  await sheet.getByRole('button', { name: 'Goblet: Empty' }).click();
  await sheet.getByRole('button', { name: /Void Goblet/ }).click();
  await expect(sheet.getByText('Void Goblet requires 60 CRIT DMG')).toBeVisible();

  // El motor evalua el equipo puesto: el objetivo aparece con su puntaje.
  await expect(sheet.getByText('Calculating…')).toBeHidden({ timeout: 20_000 });
  await expect(sheet.getByText('Damage', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(sheet.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  await sheet.getByRole('tab', { name: 'Level & history' }).click();
  await expect(sheet.getByText('Level history')).toBeVisible();

  // El nivel se fija libremente y la base se deriva: sube y baja sin pasar por el historial.
  await sheet.getByLabel('Set level').selectOption('20');
  await expect(sheet.getByText('Level 20 saved.')).toBeVisible();
  await sheet.getByRole('tab', { name: 'Equipment & stats' }).click();
  await expect(sheet.getByText('Astral Forge · Level 20')).toBeVisible();

  await sheet.getByRole('tab', { name: 'Level & history' }).click();
  await sheet.getByLabel('Set level').selectOption('5');
  await expect(sheet.getByText('Level 5 saved.')).toBeVisible();
  await sheet.getByRole('tab', { name: 'Equipment & stats' }).click();
  await expect(sheet.getByText('Astral Forge · Level 5')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  // La misma rejilla cambia de personaje en la hoja y el equipo es por personaje.
  await sheet.getByRole('button', { name: 'Change character' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Orion/ }).click();
  await expect(sheet.getByRole('heading', { name: 'Orion', level: 1 })).toBeVisible();
  await expect(sheet.getByText('Astral Forge · Level 1')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Weapon: Empty' })).toBeVisible();
});

test('con el inventario vacío no deja optimizar', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');

  await expect(page.getByText('No items yet')).toBeVisible();
  await expect(runSearch(page)).toBeDisabled();
});

test('la barra queda visible al scrollear', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await page.mouse.wheel(0, 1600);

  // El rail es sticky y la barra de setup tambien: correr no exige volver arriba.
  await expect(runSearch(page)).toBeInViewport();
});

test('cambiar Results vuelve a correr con esa cantidad', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);

  await page.getByLabel('Results').fill('2');
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await expect(buildRow(page, 2)).toBeVisible();
  await expect(buildRow(page, 3)).toHaveCount(0);
});

test('cambiar de sección no recarga la página ni pierde el resultado', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);
  await runSearch(page).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await railLink(page, 'Inventory').click();
  await expect(page.getByRole('tab', { name: /Items/ })).toBeVisible();

  await railLink(page, 'Optimize').click();

  // Ni spinner de carga ni podio perdido: la sección siguió montada.
  await expect(page.getByText('Loading optimizer…')).toHaveCount(0);
  await expect(page.getByText('Best builds')).toBeVisible();
  await expect(buildRow(page, 1)).toBeVisible();
});

test('ir a otra sección no cancela una optimización en curso', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/optimize');
  await loadSamples(page);
  await runSearch(page).click();

  await railLink(page, 'Inventory').click();
  await expect(page.getByRole('tab', { name: /Items/ })).toBeVisible();

  await railLink(page, 'Optimize').click();

  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Search cancelled before it produced a result/)).toHaveCount(0);
});
