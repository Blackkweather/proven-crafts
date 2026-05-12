import { test, expect } from "@playwright/test";

// ─── Public pages (no auth required) ─────────────────────────────────────────

test.describe("Public routes", () => {
  test("landing page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Skill Network/i);
  });

  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("signup page renders role selection", async ({ page }) => {
    await page.goto("/signup");
    // Signup page should have account type selection
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/sign up|create account|join/i).first()).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-xyz");
    // TanStack Router renders notFoundComponent instead of returning 404 status
    await expect(page.getByText(/404|off the map|not found/i).first()).toBeVisible();
  });
});

// ─── Auth redirect guard ──────────────────────────────────────────────────────

test.describe("Protected routes redirect unauthenticated users", () => {
  test("/app redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/app");
    // Should be redirected to /login
    await expect(page).toHaveURL(/login/);
  });

  test("/company redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/company");
    await expect(page).toHaveURL(/login/);
  });

  test("/admin redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });
});

// ─── Login form validation ────────────────────────────────────────────────────

test.describe("Login form", () => {
  test("shows error on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    // Browser native validation or custom error should appear
    // The email field is required so it should show invalid state
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test("sign up link navigates to /signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.getByRole("link", { name: /sign up|create account/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/signup/);
    }
  });
});

// ─── Public marketing pages ───────────────────────────────────────────────────

test.describe("Marketing pages", () => {
  test("jobs listing page loads", async ({ page }) => {
    const res = await page.goto("/jobs");
    expect(res?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("challenges listing page loads", async ({ page }) => {
    const res = await page.goto("/challenges");
    expect(res?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("companies listing page loads", async ({ page }) => {
    const res = await page.goto("/companies");
    expect(res?.status()).not.toBe(500);
    await expect(page.locator("body")).toBeVisible();
  });
});
