import path from 'node:path';

import { expect, test } from '@playwright/test';

const goodFile = path.join(__dirname, '..', 'fixtures', 'good.json');
const astralGood = path.join(
  __dirname,
  '..',
  '..',
  'web',
  'public',
  'seeds',
  'astral-forge.good.json',
);

/** Abre el inventario del juego sintetico integrado desde el hub. */
async function openInventory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open Astral Forge optimizer' }).click();
  await expect(page.getByRole('heading', { name: 'Astral Forge', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Open inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Astral Forge', level: 1 })).toBeVisible();
}

test('importa el GOOD de Astral Forge y deja el optimizador listo', async ({ page }) => {
  await openInventory(page);
  await expect(page.getByText('Your inventory is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByLabel('Inventory file').setInputFiles(astralGood);

  const preview = page.locator('aside');
  await expect(preview.getByText('Preview')).toBeVisible();
  await preview.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Imported 12 items.')).toBeVisible();

  await page.getByRole('link', { name: 'Back to optimizer' }).click();
  await expect(page.getByRole('button', { name: 'Optimize build' })).toBeEnabled();
  await page.getByRole('button', { name: 'Optimize build' }).click();
  await expect(page.getByText('Best builds')).toBeVisible({ timeout: 20_000 });
});

test('importa un GOOD, exporta el inventario y lo restaura', async ({ page }) => {
  await openInventory(page);
  await expect(page.getByText('Your inventory is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByLabel('Inventory file').setInputFiles(goodFile);

  const preview = page.locator('aside');
  await expect(preview.getByText('Preview')).toBeVisible();
  await preview.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Imported 2 items.')).toBeVisible();

  await page.getByRole('tab', { name: /Items/ }).click();
  await expect(page.getByText('Starlight Blade · Lv. 90')).toBeVisible();
  await expect(page.getByText('Flower +20 · HP')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Starlight Blade · Lv. 90')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  const packageFile = test.info().outputPath('inventory.json');
  await download.saveAs(packageFile);
  expect(download.suggestedFilename()).toMatch(/^gacha-demo-inventory-\d{4}-\d{2}-\d{2}\.json$/);

  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
  }
  await expect(page.getByText('Your inventory is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.getByLabel('Inventory file').setInputFiles(packageFile);
  await expect(page.locator('aside').getByText('Preview')).toBeVisible();
  await page
    .locator('aside')
    .getByRole('button', { name: 'Import', exact: true })
    .click();

  await expect(page.getByText('Restored 2 items.')).toBeVisible();
  await page.getByRole('tab', { name: /Items/ }).click();
  await expect(page.getByText('Starlight Blade · Lv. 90')).toBeVisible();
  await expect(page.getByText('Flower +20 · HP')).toBeVisible();
});
