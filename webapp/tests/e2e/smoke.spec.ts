import { test, expect } from '@playwright/test';

test('redirects to /jobs', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/login**');
  // Without auth, middleware should redirect to login
  await expect(page).toHaveURL(/login/);
});


