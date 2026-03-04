/**
 * Browser tests for PR #11 — feat(embed): add embed code copy button [BF-67]
 *
 * Pages affected:
 *   - / (homepage) — default layout, no embedSlug => NO embed button
 *   - /infographics/renewables — embedSlug set => embed button present
 *   - /infographics/straits — embedSlug set => embed button present
 *   - /embed/renewables — embed layout, no footer => NO embed button
 *   - /embed/straits — embed layout, no footer => NO embed button
 *
 * Tests verify:
 *   1. Pages load without errors (no console errors, HTTP 200)
 *   2. EmbedCodeButton renders on infographic pages with correct text
 *   3. EmbedCodeButton does NOT render on homepage or embed pages
 *   4. Button has correct accessibility attributes
 *   5. Button click triggers clipboard copy and shows "Copied!" feedback
 *   6. Footer layout: button appears between source link and BFNA logo
 *   7. Screenshots captured for visual verification
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:4173';
const SCREENSHOT_DIR = path.resolve(__dirname, 'test-screenshots');

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

// Configure viewport to 1280x800 to match infographic design
test.use({ viewport: { width: 1280, height: 800 } });

// Helper to collect console errors
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ─── HOMEPAGE ────────────────────────────────────────────────────────────────

test.describe('Homepage (/)', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    // Filter out non-critical errors (e.g., favicon, analytics)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('gtag') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('does NOT show embed code button (no embedSlug)', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toHaveCount(0);
  });

  test('footer renders without embed button', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-homepage.png'),
      fullPage: false,
    });
    // Source link should still be present
    const sourceLink = page.locator('footer .source-link');
    await expect(sourceLink).toBeVisible();
    // BFNA logo should still be present
    const logo = page.locator('footer img.bfna-logo-footer');
    await expect(logo).toBeVisible();
  });
});

// ─── INFOGRAPHICS/RENEWABLES ─────────────────────────────────────────────────

test.describe('Infographics: Renewables (/infographics/renewables)', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`${BASE_URL}/infographics/renewables`, {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(200);
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('gtag') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('shows embed code button with correct text', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toBeVisible();
    await expect(embedButton).toContainText('Copy Embed Code');
  });

  test('embed button is not disabled (clipboard available)', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toBeEnabled();
  });

  test('embed button has aria-live region for screen readers', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });
    const ariaLive = page.locator('button.embed-code-button .visually-hidden[aria-live="polite"]');
    await expect(ariaLive).toHaveCount(1);
  });

  test('footer layout: source link, embed button, and logo all present', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const sourceLink = footer.locator('.source-link');
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toContainText('Source: Our World in Data');

    const embedButton = footer.locator('button.embed-code-button');
    await expect(embedButton).toBeVisible();

    const logo = footer.locator('img.bfna-logo-footer');
    await expect(logo).toBeVisible();
  });

  test('clicking embed button copies code and shows "Copied!" feedback', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });

    const embedButton = page.locator('button.embed-code-button');
    await embedButton.click();

    // Should show "Copied!" text
    await expect(embedButton).toContainText('Copied!');
    // Should have is-copied class
    await expect(embedButton).toHaveClass(/is-copied/);

    // Read clipboard and verify embed code format
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain('<iframe');
    expect(clipboardContent).toContain('/embed/renewables');
    expect(clipboardContent).toContain('title="Renewables on the Rise"');
    expect(clipboardContent).toContain('width="1280"');
    expect(clipboardContent).toContain('height="800"');
    expect(clipboardContent).toContain('style="border:0');
    expect(clipboardContent).toContain('loading="lazy"');
    expect(clipboardContent).toContain('allowfullscreen');
  });

  test('copied feedback resets after ~2 seconds', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });

    const embedButton = page.locator('button.embed-code-button');
    await embedButton.click();
    await expect(embedButton).toContainText('Copied!');

    // Wait for the 2-second reset timer
    await page.waitForTimeout(2500);
    await expect(embedButton).toContainText('Copy Embed Code');
    await expect(embedButton).not.toHaveClass(/is-copied/);
  });

  test('screenshot: renewables page with embed button', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/renewables`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-renewables.png'),
      fullPage: false,
    });
    // Also capture just the footer area
    const footer = page.locator('footer');
    await footer.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-renewables-footer.png'),
    });
  });
});

// ─── INFOGRAPHICS/STRAITS ────────────────────────────────────────────────────

test.describe('Infographics: Straits (/infographics/straits)', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`${BASE_URL}/infographics/straits`, {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(200);
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('gtag') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('shows embed code button with correct text', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/straits`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toBeVisible();
    await expect(embedButton).toContainText('Copy Embed Code');
  });

  test('embed button has correct accessibility attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/straits`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toHaveAttribute('type', 'button');
    // Should not be disabled
    await expect(embedButton).toBeEnabled();
  });

  test('clicking embed button copies straits embed code', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${BASE_URL}/infographics/straits`, { waitUntil: 'networkidle' });

    const embedButton = page.locator('button.embed-code-button');
    await embedButton.click();

    await expect(embedButton).toContainText('Copied!');

    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain('<iframe');
    expect(clipboardContent).toContain('/embed/straits');
    expect(clipboardContent).toContain('title="Indo-Pacific Straits"');
  });

  test('footer layout: source link, embed button, and logo', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/straits`, { waitUntil: 'networkidle' });
    const footer = page.locator('footer');

    const sourceLink = footer.locator('.source-link');
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toContainText('Source: IMF PortWatch');

    const embedButton = footer.locator('button.embed-code-button');
    await expect(embedButton).toBeVisible();

    const logo = footer.locator('img.bfna-logo-footer');
    await expect(logo).toBeVisible();
  });

  test('screenshot: straits page with embed button', async ({ page }) => {
    await page.goto(`${BASE_URL}/infographics/straits`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-straits.png'),
      fullPage: false,
    });
    await page.locator('footer').screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-straits-footer.png'),
    });
  });
});

// ─── EMBED/RENEWABLES ────────────────────────────────────────────────────────

test.describe('Embed: Renewables (/embed/renewables)', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`${BASE_URL}/embed/renewables`, {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(200);
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('gtag') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('does NOT show embed code button (embed layout has no footer)', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/renewables`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toHaveCount(0);
  });

  test('does NOT show footer (embed layout is minimal)', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/renewables`, { waitUntil: 'networkidle' });
    const footer = page.locator('footer');
    await expect(footer).toHaveCount(0);
  });

  test('screenshot: embed renewables page', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/renewables`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-embed-renewables.png'),
      fullPage: false,
    });
  });
});

// ─── EMBED/STRAITS ───────────────────────────────────────────────────────────

test.describe('Embed: Straits (/embed/straits)', () => {
  test('loads without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`${BASE_URL}/embed/straits`, {
      waitUntil: 'networkidle',
    });
    expect(response?.status()).toBe(200);
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('gtag') && !e.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('does NOT show embed code button (embed layout has no footer)', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/straits`, { waitUntil: 'networkidle' });
    const embedButton = page.locator('button.embed-code-button');
    await expect(embedButton).toHaveCount(0);
  });

  test('does NOT show footer (embed layout is minimal)', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/straits`, { waitUntil: 'networkidle' });
    const footer = page.locator('footer');
    await expect(footer).toHaveCount(0);
  });

  test('screenshot: embed straits page', async ({ page }) => {
    await page.goto(`${BASE_URL}/embed/straits`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'bf67-embed-straits.png'),
      fullPage: false,
    });
  });
});
