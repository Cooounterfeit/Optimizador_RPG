import { expect, test } from '@playwright/test';

/**
 * Recorrido completo del juego integrado: hub → detalle → inventario. El e2e
 * corre en modo mock, asi que el Genshin de la tarjeta es la semilla local.
 */
test('agrega, recarga, edita y borra un objeto del inventario', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Open Genshin Impact optimizer' }).click();
  await expect(page.getByRole('heading', { name: 'Genshin Impact', level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Open inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Genshin Impact', level: 1 })).toBeVisible();
  await expect(page.getByText('Your inventory is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Test sword');
  await page.getByLabel('Slot', { exact: true }).selectOption('weapon');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByText('Test sword')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Test sword')).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Edited sword');
  await page.getByRole('button', { name: 'Save item' }).click();
  await expect(page.getByText('Edited sword')).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('Your inventory is empty')).toBeVisible();
});
