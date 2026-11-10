import { expect, test } from '@playwright/test';

test('explora el arbol, selecciona rangos y guarda la seleccion', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo');
  await page.getByRole('link', { name: 'Open skill tree' }).click();

  await expect(page.getByRole('heading', { name: 'Skill tree' })).toBeVisible();
  await page.getByRole('button', { name: 'Add rank to Astral Might' }).click();

  await expect(page.getByText('1 / 3')).toBeVisible();
  await expect(page.getByText('1 / 12 points')).toBeVisible();

  await page.reload();

  await expect(page.getByText('1 / 3')).toBeVisible();
  await expect(page.getByText('1 / 12 points')).toBeVisible();
});

test('el catalogo busca y filtra habilidades', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/habilidades');
  await page.getByRole('tab', { name: 'Catalog' }).click();

  await page.getByLabel('Search skills').fill('Starfall');
  await expect(page.getByText('Starfall')).toBeVisible();
  await expect(page.getByText('Meteor Strike')).toHaveCount(0);
});
