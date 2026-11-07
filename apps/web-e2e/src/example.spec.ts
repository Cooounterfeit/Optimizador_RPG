import { expect, test } from '@playwright/test';

test('la pagina principal muestra el catalogo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Proven builds');
  await expect(page.locator('article')).toHaveCount(13);
  await expect(page.getByText('Work in progress')).toBeVisible();
});

test('los filtros por genero reducen la grilla', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Action RPG/ }).click();

  await expect(page.locator('article')).toHaveCount(4);
  await expect(page.locator('[role="status"]')).toContainText('4 optimizers shown');
});

test('la busqueda encuentra por autor', async ({ page }) => {
  await page.goto('/');

  await page.locator('#catalog-search').fill('brutus');

  await expect(page.locator('article')).toHaveCount(2);
});

test('una busqueda sin resultados muestra el estado vacio', async ({ page }) => {
  await page.goto('/');

  await page.locator('#catalog-search').fill('no-existe');

  await expect(page.getByText('No optimizers match that')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
});

test('la ruta de login existe', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Accounts are not configured');
});
