import { test } from "@playwright/test";

const TS = Date.now();
const EMAIL = `playwright.company+${TS}@gmail.com`;
const PW = "TestPW_company_2024!";

test("diagnose: what is on the jobs page after signup", async ({ page }) => {
  // signup as company
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  const cb = page.getByRole("button", { name: /company|employer/i }).first();
  if (await cb.isVisible()) await cb.click();
  const ni = page.locator('input[placeholder*="name" i]').first();
  if (await ni.isVisible()) await ni.fill("Diag Corp");
  await page.locator('input[type="email"]').fill(EMAIL);
  const pws = page.locator('input[type="password"]');
  await pws.first().fill(PW);
  if ((await pws.count()) > 1) await pws.nth(1).fill(PW);
  await page.getByRole("button", { name: /sign up|create|join/i }).click();
  await page.waitForURL(/onboarding|app|verify/, { timeout: 15000 });
  console.log("After signup URL:", page.url());

  // complete onboarding
  for (let i = 0; i < 8; i++) {
    const url = page.url();
    console.log(`Loop ${i} URL:`, url);
    if (!url.includes("onboarding")) break;
    await page.waitForLoadState("networkidle");

    const nameInp = page.locator('input[placeholder*="company" i], input[placeholder*="name" i]').first();
    if (await nameInp.isVisible({ timeout: 500 }).catch(() => false)) {
      await nameInp.clear();
      await nameInp.fill("Diag Corp");
    }
    const indBtn = page.getByRole("button", { name: /Software \/ SaaS/i }).first();
    if (await indBtn.isVisible({ timeout: 500 }).catch(() => false)) await indBtn.click();

    // Try to find size button (1-10, 1–10, etc.)
    const allBtns = await page.locator("button").allInnerTexts();
    console.log(`Buttons at step ${i}:`, allBtns.slice(0, 20));

    const sizeBtn = page.locator("button").filter({ hasText: /1.{0,3}10/ }).first();
    if (await sizeBtn.isVisible({ timeout: 500 }).catch(() => false)) await sizeBtn.click();

    const optChip = page.locator("button[class*='goal'], button[class*='option'], button[class*='chip']").first();
    if (await optChip.isVisible({ timeout: 500 }).catch(() => false)) await optChip.click();

    const contBtn = page.getByRole("button", { name: /^Continue$|^Start hiring$/i }).first();
    if (!(await contBtn.isVisible({ timeout: 1500 }).catch(() => false))) {
      console.log("No Continue button found at step", i);
      break;
    }
    const isDisabled = await contBtn.isDisabled();
    console.log(`Continue disabled: ${isDisabled}`);
    if (!isDisabled) {
      await contBtn.click();
      await page.waitForTimeout(800);
    } else {
      console.log("Continue is still disabled, breaking");
      break;
    }
  }

  console.log("After onboarding URL:", page.url());

  // navigate to jobs
  await page.goto("/company/jobs");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log("Jobs page URL:", page.url());

  const bodyText = await page.locator("body").innerText();
  console.log("Body text:", bodyText.substring(0, 800));

  const allBtns = await page.locator("button").allInnerTexts();
  console.log("All buttons on jobs page:", allBtns);
});
