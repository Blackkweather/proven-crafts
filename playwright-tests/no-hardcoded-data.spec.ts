import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

test("landing page — no hardcoded fake data", async ({ page }) => {
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  // Must NOT contain fake hardcoded values
  expect(body).not.toContain("Alex Johnson");
  expect(body).not.toContain("9.1d");
  expect(body).not.toContain("12.4k");

  // Stats row should contain live numbers (not "…" — give DB time)
  const stats = page.locator(".font-display").first();
  await expect(stats).toBeVisible();

  // Candidate card should render (either live profile or skeleton)
  const hero = page.locator("section").first();
  await expect(hero).toBeVisible();

  console.log("Landing page body excerpt (stats area):", body?.slice(0, 500));
});

test("challenges page — no hardcoded fake stats", async ({ page }) => {
  await page.goto(BASE + "/challenges");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  expect(body).not.toContain("42%");
  // "73" is ambiguous but check "73" as "Closed in 2026" text doesn't appear
  expect(body).not.toContain("Lead to interview");
  expect(body).not.toContain("Closed in 2026");

  console.log("Challenges page stats:", body?.match(/\d[\d,]*\+?/g)?.slice(0, 10));
});

test("companies page — no hardcoded fake control panel", async ({ page }) => {
  await page.goto(BASE + "/companies");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  expect(body).not.toContain("Candidates in pipeline");
  expect(body).not.toContain("3.1 days");
  expect(body).not.toContain("Avg. time-to-shortlist");
  expect(body).toContain("Platform at a glance");

  console.log("Companies page card:", body?.includes("Verified talent") ? "✓ shows live stats" : "✗ missing stats");
});

test("manifesto page — no hardcoded fake stats", async ({ page }) => {
  await page.goto(BASE + "/manifesto");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  // These were the fake stats that were removed from the stats grid
  expect(body).not.toContain("of companies report better fit");
  expect(body).not.toContain("more recruiter views on verified skill profiles");
  expect(body).not.toContain("average time from challenge submission to offer");

  console.log("Manifesto ✓ no fake stats");
});

test("press page — no fake coverage or founder names", async ({ page }) => {
  await page.goto(BASE + "/press");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  expect(body).not.toContain("Naomi Adler");
  expect(body).not.toContain("Ivo Mendes");
  expect(body).not.toContain("Sifted");
  expect(body).not.toContain("TechCrunch EU");
  expect(body).not.toContain("Lenny's Newsletter");

  console.log("Press page ✓ no fake coverage");
});

test("careers page — no fake job openings", async ({ page }) => {
  await page.goto(BASE + "/careers");
  await page.waitForLoadState("networkidle");

  const body = await page.textContent("body");

  expect(body).not.toContain("Staff Product Engineer");
  expect(body).not.toContain("Design Lead, Talent Experience");
  expect(body).not.toContain("Editorial Producer");
  expect(body).toContain("No open roles");

  console.log("Careers page ✓ no fake openings");
});
