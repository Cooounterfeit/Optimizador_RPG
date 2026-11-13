import { expect, test, type Page } from '@playwright/test';

const addItem = async (page: Page, name: string, slot: string) => {
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Slot', { exact: true }).selectOption(slot);
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByText(name)).toBeVisible();
};

test('calcula la mejor build con el inventario del juego sintético', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open Astral Forge optimizer' }).click();
  await page.getByRole('link', { name: 'Open inventory' }).click();

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

  await page.getByRole('link', { name: 'Back to optimizer' }).click();
  await expect(page.getByRole('heading', { name: 'Astral Forge', level: 1 })).toBeVisible();

  await expect(page.getByText('Current stats')).toBeVisible();
  await page.getByLabel('Character level').selectOption('2');
  await expect(page.getByText('Level 2 saved.')).toBeVisible();

  await expect(page.getByText('Level history')).toBeVisible();
  await page.getByRole('button', { name: 'Record current level' }).click();
  await expect(page.getByText('Current level recorded.')).toBeVisible();
  await page.getByLabel('Future level to compare').selectOption('3');
  await page.getByRole('button', { name: 'Level up to 3' }).click();
  await expect(page.getByText('Level 3 saved.')).toBeVisible();
  await expect(page.getByLabel('Past level')).toBeEnabled();
  await page.getByLabel('Past level').selectOption('2');
  await expect(page.getByText(/Past · Level 2/)).toBeVisible();

  await page.getByRole('button', { name: 'Optimize build' }).click();

  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
  const bestBuild = page.getByRole('article').first();
  await expect(bestBuild.getByText('Best', { exact: true })).toBeVisible();
  await expect(page.getByText('Compare builds')).toBeVisible();
  await expect(page.getByLabel('Build A')).toBeVisible();
  await expect(page.getByLabel('Build B')).toBeVisible();

  await page.getByRole('button', { name: 'Add constraint' }).click();
  await page.getByLabel('Value').fill('999999');
  await page.getByRole('button', { name: 'Optimize build' }).click();
  await expect(page.getByText(/No combination meets the constraints/)).toBeVisible({
    timeout: 20_000,
  });
});

test('carga el inventario de muestra y optimiza sin agregar objetos a mano', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo');

  await expect(page.getByText(/Your inventory is empty/)).toBeVisible();
  await page.getByRole('button', { name: 'Load sample items' }).click();

  await expect(page.getByRole('button', { name: 'Optimize build' })).toBeEnabled();
  await page.getByRole('button', { name: 'Optimize build' }).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
});

test('equipa una build, el panel la compara y sigue equipada al recargar', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo');

  const panel = () =>
    page.locator('section').filter({ has: page.getByText('My build', { exact: true }) });

  await expect(panel().getByText(/Nothing equipped yet/)).toBeVisible();

  await page.getByRole('button', { name: 'Load sample items' }).click();
  await page.getByRole('button', { name: 'Optimize build' }).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Equip', exact: true }).first().click();

  // La tarjeta queda marcada como puesta y el panel la compara con la optima.
  await expect(page.getByText('Equipped')).toBeVisible();
  await expect(panel().getByText('Ties the best')).toBeVisible();

  await page.reload();

  await expect(panel().getByText(/Run an optimization to compare it with the best one/)).toBeVisible();
  await expect(panel().getByText('Score', { exact: true })).toBeVisible();
});

test('elige personaje desde la rejilla y lo muestra en la tarjeta', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo');

  await page.getByRole('button', { name: /Change/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Astral Forge' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Nova/ })).toHaveAttribute(
    'aria-current',
    'true',
  );

  await dialog.getByRole('button', { name: /^Orion/ }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Orion/ })).toBeVisible();
  await expect(page.getByText('Current stats')).toBeVisible();
});

test('hoja de personaje: viste una ranura, avisa el requisito y sigue puesta al recargar', async ({
  page,
}) => {
  await page.goto('/optimizer/gacha-demo');
  await page.getByRole('button', { name: 'Load sample items' }).click();

  // El nivel se fija desde el optimizador; la hoja debe mostrarlo, no el de la plantilla.
  await page.getByLabel('Character level').selectOption('2');
  await expect(page.getByText('Level 2 saved.')).toBeVisible();

  await page.getByRole('link', { name: 'Open character sheet' }).click();

  await expect(page.getByRole('heading', { name: 'Nova', level: 1 })).toBeVisible();
  await expect(page.getByText('Astral Forge · Level 2')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Equipment & stats' })).toBeVisible();

  await page.getByRole('button', { name: 'Weapon: Empty' }).click();
  await page.getByRole('button', { name: /Astral Edge/ }).click();
  await expect(page.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  // La copa exige mas daño critico del que tiene el personaje al nivel 1.
  await page.getByRole('button', { name: 'Goblet: Empty' }).click();
  await page.getByRole('button', { name: /Void Goblet/ }).click();
  await expect(page.getByText('Void Goblet requires 60 CRIT DMG')).toBeVisible();

  // El motor evalua el equipo puesto: el objetivo aparece con su puntaje.
  await expect(page.getByText('Calculating…')).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText('Damage', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  await page.getByRole('tab', { name: 'Level & history' }).click();
  await expect(page.getByText('Level history')).toBeVisible();

  // El nivel se fija libremente y la base se deriva: sube y baja sin pasar por el historial.
  await page.getByLabel('Set level').selectOption('20');
  await expect(page.getByText('Level 20 saved.')).toBeVisible();
  await page.getByRole('tab', { name: 'Equipment & stats' }).click();
  await expect(page.getByText('Astral Forge · Level 20')).toBeVisible();

  await page.getByRole('tab', { name: 'Level & history' }).click();
  await page.getByLabel('Set level').selectOption('5');
  await expect(page.getByText('Level 5 saved.')).toBeVisible();
  await page.getByRole('tab', { name: 'Equipment & stats' }).click();
  await expect(page.getByText('Astral Forge · Level 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Weapon: Astral Edge' })).toBeVisible();

  // La misma rejilla cambia de personaje en la hoja y el equipo es por personaje.
  await page.getByRole('button', { name: 'Change character' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Orion/ }).click();
  await expect(page.getByRole('heading', { name: 'Orion', level: 1 })).toBeVisible();
  await expect(page.getByText('Astral Forge · Level 1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Weapon: Empty' })).toBeVisible();
});

test('con el inventario vacío no deja optimizar', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo');

  await expect(page.getByText(/Your inventory is empty/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Optimize build' })).toBeDisabled();
});
