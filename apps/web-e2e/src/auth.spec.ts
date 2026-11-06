import { expect, test } from '@playwright/test';

/**
 * El e2e corre sin variables de Supabase (ver playwright.config.mts), asi que
 * las pantallas de cuenta muestran el aviso de configuracion en vez del
 * formulario. La validacion real del login queda en las pruebas unitarias y en
 * la lista manual contra el proyecto.
 */

test('el login sin configurar explica como activar las cuentas', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Accounts are not configured' })).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveCount(0);
});

test('el perfil sin configurar no rompe la app', async ({ page }) => {
  await page.goto('/perfil');

  await expect(page.getByRole('heading', { name: 'Accounts are not configured' })).toBeVisible();
});

test('el hub sigue mostrando las tarjetas', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('article')).toHaveCount(12);
  await expect(page.getByText('Sign in')).toBeVisible();
});
