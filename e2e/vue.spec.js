import { test, expect } from '@playwright/test'

test('carga la app', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Nihongo Study/)
})
