import { expect, test } from '@playwright/test';

test('calcula dano promedio desde la plantilla del juego', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/dano');

  await expect(page.getByRole('heading', { name: 'Damage per hit' })).toBeVisible();
  await page.getByLabel('Attack').fill('50');
  await page.getByLabel('Base damage').fill('100');
  await page.getByLabel('Additional crit damage (%)').fill('50');
  await page.getByLabel('Crit chance (%)').fill('50');
  await page.getByLabel('Enemy defense').fill('20');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByText('167.5')).toBeVisible();
  await expect(page.getByText('130')).toBeVisible();
  await expect(page.getByText('205')).toBeVisible();
});

test('valida el campo y ajusta la probabilidad al 100%', async ({ page }) => {
  await page.goto('/optimizer/gacha-demo/dano');

  await page.getByLabel('Attack').fill('abc');
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a valid number');

  await page.getByLabel('Attack').fill('10');
  await page.getByLabel('Crit chance (%)').fill('150');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(page.getByLabel('Crit chance (%)')).toHaveValue('100');
  await expect(page.getByRole('status')).toContainText('adjusted');
});
