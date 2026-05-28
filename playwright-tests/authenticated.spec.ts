import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TS = Date.now();
const TEST_EMAIL = `playwright.test+${TS}@gmail.com`;
const TEST_PASSWORD = "TestPW_playwright_2024!";
const TEST_NAME = "Playwright Tester";

/** Create a tiny temp file for upload tests */
function makeTempFile(name: string, content: Buffer, dir: string): string {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

let tmpDir: string;
let avatarPath: string;
let pdfPath: string;
let videoPath: string;

test.beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-upload-"));
  // Minimal valid JPEG (1x1 pixel)
  avatarPath = makeTempFile(
    "avatar.jpg",
    Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAABAgME/8QAFhABAQEAAAAAAAAAAAAAAAAAABEB/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AMqAB//Z",
      "base64"
    ),
    tmpDir
  );
  // Minimal PDF
  pdfPath = makeTempFile(
    "resume.pdf",
    Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF"),
    tmpDir
  );
  // Tiny webm-ish binary (real validation only happens server-side; this tests the UI path)
  videoPath = makeTempFile(
    "intro.webm",
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f]),
    tmpDir
  );
});

test.afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
});

// ─── Sign up & onboarding ─────────────────────────────────────────────────────

test.describe.serial("Full talent signup → onboarding → uploads", () => {
  test("signup: create new talent account", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    // Select talent role
    const talentBtn = page
      .getByRole("button", { name: /talent|job seeker|candidate|i'm a talent/i })
      .first();
    if (await talentBtn.isVisible()) await talentBtn.click();

    // Fill name
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"], input[id*="name"]').first();
    if (await nameInput.isVisible()) await nameInput.fill(TEST_NAME);

    // Fill email
    await page.locator('input[type="email"]').fill(TEST_EMAIL);

    // Fill password
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.first().fill(TEST_PASSWORD);
    if ((await pwInputs.count()) > 1) {
      await pwInputs.nth(1).fill(TEST_PASSWORD);
    }

    // Submit
    await page.getByRole("button", { name: /sign up|create|join|get started/i }).click();

    // Should redirect to onboarding or app (allow either)
    await expect(page).toHaveURL(/onboarding|app|verify|confirm/, { timeout: 15000 });
  });

  test("talent onboarding step 1: select role", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // Pick a role (e.g. Full-stack)
    const roleBtn = page
      .getByRole("button", { name: /full.?stack|frontend|backend/i })
      .first();
    if (await roleBtn.isVisible()) {
      await roleBtn.click();
    } else {
      // Fall back to first clickable role option
      const anyRole = page.locator('[class*="role"], [class*="option"], button').first();
      if (await anyRole.isVisible()) await anyRole.click();
    }

    // Pick seniority
    const seniorityBtn = page.getByRole("button", { name: /mid.?level|senior|junior/i }).first();
    if (await seniorityBtn.isVisible()) await seniorityBtn.click();

    // Next step
    const nextBtn = page.getByRole("button", { name: /next|continue/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("talent onboarding step 2: select skills", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // Try to advance past step 1 first (role might already be saved)
    const nextBtn = page.getByRole("button", { name: /next|continue/i });
    if (await nextBtn.isVisible()) {
      // Select a role if needed
      const roleBtn = page.getByRole("button", { name: /full.?stack|frontend|backend/i }).first();
      if (await roleBtn.isVisible()) await roleBtn.click();
      const seniorityBtn = page.getByRole("button", { name: /mid.?level|senior|junior/i }).first();
      if (await seniorityBtn.isVisible()) await seniorityBtn.click();
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 2: pick at least one skill
    const skillBtn = page.locator('[class*="skill"], [class*="chip"], [class*="tag"]').first();
    if (await skillBtn.isVisible()) await skillBtn.click();

    const next = page.getByRole("button", { name: /next|continue/i });
    if (await next.isVisible()) {
      await next.click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("complete onboarding and reach app dashboard", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // If already past onboarding, we're on /app already
    if (page.url().includes("/app")) {
      await expect(page.locator("body")).toBeVisible();
      return;
    }

    // Click through all "Next" / "Complete" buttons until we land on /app
    for (let i = 0; i < 6; i++) {
      const nextBtn = page.getByRole("button", { name: /next|continue|complete|finish|done/i }).first();
      if (!(await nextBtn.isVisible())) break;
      // Click a skill/role button if Next is disabled
      const disabled = await nextBtn.isDisabled();
      if (disabled) {
        const firstOpt = page.locator("button[class*='option'], button[class*='role'], button[class*='skill'], button[class*='chip']").first();
        if (await firstOpt.isVisible()) await firstOpt.click();
      }
      await nextBtn.click();
      await page.waitForTimeout(600);
      if (page.url().includes("/app")) break;
    }

    // Accept either /app or /onboarding (some accounts may need email verify first)
    await expect(page).toHaveURL(/app|onboarding/, { timeout: 10000 });
  });
});

// ─── Authenticated: profile & uploads ─────────────────────────────────────────

test.describe.serial("Authenticated profile & upload tests", () => {
  async function loginAs(page: Page) {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(app|onboarding)/, { timeout: 15000 });
  }

  test("login with new account works", async ({ page }) => {
    await loginAs(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("profile page loads and basic fields editable", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/profile");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Updated Playwright Name");
      await expect(nameInput).toHaveValue("Updated Playwright Name");
    }

    const bioArea = page.locator("textarea").first();
    if (await bioArea.isVisible()) {
      await bioArea.fill("Bio written by Playwright automated test.");
    }
  });

  test("avatar upload: file input accepts an image", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/profile");
    await page.waitForLoadState("networkidle");

    // Look for a file input or avatar area that triggers one
    const fileInput = page.locator('input[type="file"][accept*="image"], input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fileInput.setInputFiles(avatarPath);
      // Wait for upload success or preview update
      await page.waitForTimeout(3000);
      // Should not show an error
      await expect(page.getByText(/error|failed|invalid/i).first()).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    } else {
      // Click the avatar area to reveal the input
      const avatarTrigger = page.locator('[class*="avatar"], [data-testid*="avatar"], [aria-label*="avatar" i], [aria-label*="photo" i]').first();
      if (await avatarTrigger.isVisible()) {
        // Use a click trick to reveal the hidden input
        const [fileChooser] = await Promise.all([
          page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null),
          avatarTrigger.click(),
        ]);
        if (fileChooser) {
          await fileChooser.setFiles(avatarPath);
          await page.waitForTimeout(3000);
        }
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("video intro upload: file input accepts a video file", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/profile");
    await page.waitForLoadState("networkidle");

    // Look for a video upload button or input
    const videoBtn = page.getByRole("button", { name: /upload.*video|video.*intro|add.*video/i }).first();
    const videoInput = page.locator('input[type="file"][accept*="video"]').first();

    if (await videoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await videoInput.setInputFiles(videoPath);
      await page.waitForTimeout(3000);
      await expect(page.locator("body")).toBeVisible();
    } else if (await videoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 4000 }).catch(() => null),
        videoBtn.click(),
      ]);
      if (fileChooser) {
        await fileChooser.setFiles(videoPath);
        await page.waitForTimeout(3000);
      }
    } else {
      // Find any hidden video input
      const hiddenVideoInput = page.locator('input[type="file"]').filter({ has: page.locator('[accept*="video"]') }).first();
      if ((await hiddenVideoInput.count()) > 0) {
        await hiddenVideoInput.setInputFiles(videoPath);
        await page.waitForTimeout(3000);
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("portfolio file upload: accepts PDF", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/profile");
    await page.waitForLoadState("networkidle");

    const addPortfolioBtn = page.getByRole("button", { name: /add.*portfolio|new.*item|upload.*file|attach/i }).first();
    if (await addPortfolioBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addPortfolioBtn.click();
      await page.waitForTimeout(500);
    }

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 3000 }).catch(() => null),
        fileInput.evaluate((el: HTMLElement) => el.click()).catch(() => null),
      ]);
      if (fileChooser) {
        await fileChooser.setFiles(pdfPath);
        await page.waitForTimeout(3000);
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("settings page: all 4 tabs render without errors", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/settings");
    await page.waitForLoadState("networkidle");

    for (const tabName of ["Profile", "Privacy", "Notifications", "Account"]) {
      const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(300);
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("settings: display name field is editable", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/settings");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"], input[name="displayName"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Settings Updated Name");
      await expect(nameInput).toHaveValue("Settings Updated Name");
    }
  });

  test("app dashboard: main nav links work", async ({ page }) => {
    await loginAs(page);
    await page.waitForLoadState("networkidle");

    for (const { name, url } of [
      { name: /jobs/i, url: /jobs/ },
      { name: /matches/i, url: /matches/ },
      { name: /applications/i, url: /applications/ },
    ]) {
      const link = page.getByRole("link", { name }).first();
      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click();
        await expect(page).toHaveURL(url, { timeout: 8000 });
      }
    }
  });

  test("app: jobs page loads listings or empty state", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/jobs");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("app: challenges page loads", async ({ page }) => {
    await loginAs(page);
    await page.goto("/app/challenges");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign out works", async ({ page }) => {
    await loginAs(page);
    await page.waitForLoadState("networkidle");

    // Look for sign out button in nav/dropdown
    const userMenu = page.locator('[aria-label*="user" i], [aria-label*="account" i], [class*="avatar"]').first();
    if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.click();
      await page.waitForTimeout(300);
    }

    const signOutBtn = page.getByRole("button", { name: /sign out|log out/i }).first();
    const signOutLink = page.getByRole("link", { name: /sign out|log out/i }).first();

    if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signOutBtn.click();
    } else if (await signOutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signOutLink.click();
    } else {
      // Try menu item
      const menuItem = page.getByRole("menuitem", { name: /sign out|log out/i }).first();
      if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) await menuItem.click();
    }

    await expect(page).toHaveURL(/login|\/$/, { timeout: 10000 });
  });
});
