import { test, expect } from "@playwright/test";

async function navigateTo(page, name, isMobile) {
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name, exact: true }).click();
}

test("dashboard navigation, employee filtering, shift details and CSV export work", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Good morning, Brian" })).toBeVisible();
  await navigateTo(page, "Team", isMobile);
  await expect(page.getByRole("heading", { name: "Meet your team" })).toBeVisible();
  await page.getByLabel("Search employees").fill("Maya");
  await expect(page.getByText("Maya Chen")).toBeVisible();
  await expect(page.getByText("Eli Brooks")).toHaveCount(0);
  await navigateTo(page, "Schedule", isMobile);
  await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
  const shift = page.locator(".shift-card").first();
  await expect(shift).toBeVisible();
  await shift.click();
  await expect(page.getByRole("dialog", { name: "Shift details" })).toBeVisible();
  await page.getByRole("button", { name: "Close shift details" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/schedule-.*\.csv/);
});

test("mobile navigation opens and dashboard content fits the viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile viewport coverage runs in the mobile project.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Promotions" }).click();
  await expect(page.getByRole("heading", { name: "Current promotions" })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
});

test("scheduling rules dialog can be opened and dismissed with Escape", async ({ page, isMobile }) => {
  await page.goto("/");
  await navigateTo(page, "Scheduling rules", isMobile);
  const dialog = page.getByRole("dialog", { name: "Scheduling rules" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
