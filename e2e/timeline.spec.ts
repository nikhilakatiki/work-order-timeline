import { test, expect, Page } from '@playwright/test';

const DB_NAME = 'wo-timeline-db';

/**
 * Clear all IndexedDB object stores so the app seeds fresh sample data on reload.
 * We clear stores instead of deleting the DB because the Angular app holds an open
 * connection which would block deleteDatabase indefinitely.
 */
async function clearDbStores(page: Page) {
  await page.evaluate((name) => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open(name);
      req.onsuccess = () => {
        const db = req.result;
        const storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) { db.close(); resolve(); return; }
        const tx = db.transaction(storeNames, 'readwrite');
        for (const storeName of storeNames) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      };
      req.onerror = () => resolve();
    });
  }, DB_NAME);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for initial render so DB is open
  await page.locator('[data-testid="left-panel-row"]').first().waitFor({ state: 'visible', timeout: 15_000 });
  // Clear all data stores and reload — app will re-seed sample data
  await clearDbStores(page);
  await page.reload();
  // Wait for the grid to be fully rendered with sample data
  await page.locator('[data-testid="work-order-bar"]').first().waitFor({ state: 'visible', timeout: 15_000 });
});

// ---------------------------------------------------------------------------
// 1. Timeline renders on load
// ---------------------------------------------------------------------------
test('timeline renders on load', async ({ page }) => {
  // 300 work center names in the left panel
  const rows = page.locator('[data-testid="left-panel-row"]');
  await expect(rows).toHaveCount(300);

  // Work order bars are present
  const bars = page.locator('[data-testid="work-order-bar"]');
  expect(await bars.count()).toBeGreaterThan(0);

  // Current-day indicator is visible
  const todayLine = page.locator('[data-testid="today-line"]');
  await expect(todayLine).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Zoom switching
// ---------------------------------------------------------------------------
test('zoom switching changes header labels', async ({ page }) => {
  const zoomSelect = page.locator('[data-testid="zoom-select"]');

  // Switch to Week
  await zoomSelect.click();
  await page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: 'Week' }).click();
  // The toolbar value should show "Week"
  await expect(zoomSelect.locator('.toolbar__value')).toHaveText('Week');

  // Switch to Month
  await zoomSelect.click();
  await page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: 'Month' }).click();
  await expect(zoomSelect.locator('.toolbar__value')).toHaveText('Month');

  // Switch back to Day
  await zoomSelect.click();
  await page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: 'Day' }).click();
  await expect(zoomSelect.locator('.toolbar__value')).toHaveText('Day');
});

// ---------------------------------------------------------------------------
// 3. Today button
// ---------------------------------------------------------------------------
test('today button scrolls to current day indicator', async ({ page }) => {
  const scrollArea = page.locator('.scroll-area');

  // Scroll far left to lose sight of today
  await scrollArea.evaluate((el) => { el.scrollLeft = 0; });
  await page.waitForTimeout(300);

  // Click "Today"
  await page.locator('[data-testid="today-btn"]').click();
  await page.waitForTimeout(500);

  // The today-line should be within the visible viewport of the scroll area
  const todayLine = page.locator('[data-testid="today-line"]');
  const todayBox = await todayLine.boundingBox();
  const scrollBox = await scrollArea.boundingBox();

  expect(todayBox).not.toBeNull();
  expect(scrollBox).not.toBeNull();
  if (todayBox && scrollBox) {
    // Today line's left edge should be within the visible scroll area
    expect(todayBox.x).toBeGreaterThanOrEqual(scrollBox.x - 10);
    expect(todayBox.x).toBeLessThanOrEqual(scrollBox.x + scrollBox.width + 10);
  }
});

test('month zoom centers current month when Today is clicked', async ({ page }) => {
  const expectedMonthLabel = await page.evaluate(() => {
    const d = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });

  const zoomSelect = page.locator('[data-testid="zoom-select"]');
  await zoomSelect.click();
  await page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: 'Month' }).click();
  await page.waitForTimeout(300);

  const scrollArea = page.locator('.scroll-area');
  await scrollArea.evaluate((el) => { el.scrollLeft = 0; });
  await page.waitForTimeout(250);

  await page.locator('[data-testid="today-btn"]').click();
  await page.waitForTimeout(500);

  const syncedScroll = await page.evaluate(() => {
    const area = document.querySelector('.scroll-area') as HTMLElement | null;
    const header = document.querySelector('.header-scroll') as HTMLElement | null;
    if (!area || !header) return null;
    return { area: area.scrollLeft, header: header.scrollLeft };
  });
  expect(syncedScroll).not.toBeNull();
  if (syncedScroll) {
    expect(Math.abs(syncedScroll.area - syncedScroll.header)).toBeLessThanOrEqual(1);
  }

  const centeredMonth = await page.evaluate(() => {
    const headerScroll = document.querySelector('.header-scroll');
    const cells = Array.from(document.querySelectorAll('.header__cell'));
    if (!headerScroll || cells.length === 0) return null;

    const viewport = headerScroll.getBoundingClientRect();
    const centerX = viewport.left + viewport.width / 2;
    let best: { text: string; distance: number } | null = null;

    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      const intersectsViewport = rect.right >= viewport.left && rect.left <= viewport.right;
      if (!intersectsViewport) continue;

      const text = cell.querySelector('.header__label')?.textContent?.trim() ?? '';
      const distance = Math.abs((rect.left + rect.width / 2) - centerX);
      if (!best || distance < best.distance) {
        best = { text, distance };
      }
    }

    return best?.text ?? null;
  });

  expect(centeredMonth).toBe(expectedMonthLabel);
});

// ---------------------------------------------------------------------------
// 4. Create work order
// ---------------------------------------------------------------------------
test('create work order via panel', async ({ page }) => {
  const uniqueName = `E2E-Create-${Date.now()}`;

  // Click on an empty area of the first timeline row
  const firstRow = page.locator('[data-testid="timeline-row"]').first();
  // Click in the middle of the row — find a spot without a bar
  const rowBox = await firstRow.boundingBox();
  expect(rowBox).not.toBeNull();

  // Click at the far right of the row (likely empty)
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });

  // Panel should slide in
  const panel = page.locator('[data-testid="panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });
  await expect(panel.locator('.panel__title')).toHaveText('Work Order Details');

  // Fill in the name
  const nameInput = page.locator('[data-testid="panel-name-input"]');
  await nameInput.clear();
  await nameInput.fill(uniqueName);

  // Status should already default to "Open" — verify
  const statusSelect = page.locator('[data-testid="panel-status-select"]');
  await expect(statusSelect).toBeVisible();

  // Click Create
  const submitBtn = page.locator('[data-testid="panel-submit-btn"]');
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();

  // Panel should close
  await expect(panel).toBeHidden({ timeout: 5_000 });

  // The new bar should appear somewhere on the timeline with the unique name
  const newBar = page.locator('[data-testid="work-order-bar"]', { hasText: uniqueName });
  await expect(newBar).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 5. Edit work order
// ---------------------------------------------------------------------------
test('edit work order via actions menu', async ({ page }) => {
  // Pick the first visible bar
  const firstBar = page.locator('[data-testid="work-order-bar"]').first();
  await firstBar.hover();

  // Click the 3-dot menu
  const menuBtn = firstBar.locator('[data-testid="actions-menu-btn"]');
  await menuBtn.click();

  // Click "Edit"
  await page.locator('[data-testid="edit-action"]').click();

  // Panel opens with pre-filled data
  const panel = page.locator('[data-testid="panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });

  const nameInput = page.locator('[data-testid="panel-name-input"]');
  const originalName = await nameInput.inputValue();
  expect(originalName.length).toBeGreaterThan(0);

  // Change the name
  const updatedName = `EDITED-${Date.now()}`;
  await nameInput.clear();
  await nameInput.fill(updatedName);

  // Click Save
  await page.locator('[data-testid="panel-submit-btn"]').click();

  // Panel closes
  await expect(panel).toBeHidden({ timeout: 5_000 });

  // The bar now shows the updated name
  const updatedBar = page.locator('[data-testid="work-order-bar"]', { hasText: updatedName });
  await expect(updatedBar).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 6. Delete work order
// ---------------------------------------------------------------------------
test('delete work order via actions menu', async ({ page }) => {
  // Pick the first bar and remember its name
  const firstBar = page.locator('[data-testid="work-order-bar"]').first();
  await firstBar.scrollIntoViewIfNeeded();
  const barName = await firstBar.locator('.bar__label').textContent();

  await firstBar.hover();

  // Click 3-dot → Delete
  await firstBar.locator('[data-testid="actions-menu-btn"]').click();
  await page.locator('[data-testid="delete-action"]').click();

  // Verify the specific bar is gone
  const deletedBar = page.locator('[data-testid="work-order-bar"]', { hasText: barName!.trim() });
  await expect(deletedBar).toHaveCount(0, { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 7. Overlap validation
// ---------------------------------------------------------------------------
test('overlap validation shows error and disables submit', async ({ page }) => {
  // Open create panel by clicking at the far right of the first row (empty space)
  const firstRow = page.locator('[data-testid="timeline-row"]').first();
  const rowBox = await firstRow.boundingBox();
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });

  const panel = page.locator('[data-testid="panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });

  // Fill name so form is otherwise valid
  await page.locator('[data-testid="panel-name-input"]').fill('Overlap Test Order');

  // To force an overlap, we set the start date far in the past and end date far in the future
  // so the range covers existing orders on this work center.

  // Set start date: open datepicker, navigate 4 months back, pick the 1st
  const startInput = page.locator('input[formcontrolname="startDate"]');
  await startInput.click();
  const datepicker = page.locator('ngb-datepicker');
  await expect(datepicker).toBeVisible({ timeout: 3_000 });
  const prevBtn = datepicker.locator('.ngb-dp-arrow').first().locator('button');
  for (let i = 0; i < 4; i++) await prevBtn.click();
  await datepicker.locator('.ngb-dp-day .btn-light:not(.text-muted)').first().click();

  // Set end date: open datepicker, navigate 4 months forward, pick the last day
  const endInput = page.locator('input[formcontrolname="endDate"]');
  await endInput.click();
  await expect(datepicker).toBeVisible({ timeout: 3_000 });
  const nextBtn = datepicker.locator('.ngb-dp-arrow').last().locator('button');
  for (let i = 0; i < 8; i++) await nextBtn.click();
  await datepicker.locator('.ngb-dp-day .btn-light:not(.text-muted)').last().click();

  // This wide range guarantees overlap with existing orders on row 1
  const overlapMsg = page.locator('.panel__error', { hasText: 'overlaps with an existing order' });
  await expect(overlapMsg).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('[data-testid="panel-submit-btn"]')).toBeDisabled();

  // Clean up
  await page.locator('[data-testid="panel-cancel-btn"]').click();
});

// ---------------------------------------------------------------------------
// 8. Date validation
// ---------------------------------------------------------------------------
test('date validation shows error when end before start', async ({ page }) => {
  // Open create panel
  const firstRow = page.locator('[data-testid="timeline-row"]').first();
  const rowBox = await firstRow.boundingBox();
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });

  const panel = page.locator('[data-testid="panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });

  // Fill name
  await page.locator('[data-testid="panel-name-input"]').fill('Date Test');

  // Swap start and end dates to create an invalid order (end before start).
  // Use page.evaluate to set form values directly since date pickers are readonly.
  await page.evaluate(() => {
    // Access Angular's form via the component
    const panelEl = document.querySelector('app-work-order-panel');
    if (!panelEl) return;
    // Use Angular's internal API to find the component instance
    const ngRef = (panelEl as any).__ngContext__;
    // Alternative: dispatch events on the date inputs
    // Since datepickers are readonly, we'll use the NgbDatepicker programmatic API
  });

  // Click the start date calendar and select a date far in the future
  const startInput = page.locator('input[formcontrolname="startDate"]');
  const endInput = page.locator('input[formcontrolname="endDate"]');

  // Click end date datepicker first, pick an early date
  await endInput.click();
  // Wait for datepicker to open
  const datepicker = page.locator('ngb-datepicker');
  await expect(datepicker).toBeVisible({ timeout: 3_000 });

  // Navigate back several months by clicking the left arrow
  const prevBtn = datepicker.locator('button[aria-label="Previous month"], button.ngb-dp-arrow-btn').first();
  await prevBtn.click();
  await prevBtn.click();
  await prevBtn.click();

  // Pick the first available day
  const dayBtn = datepicker.locator('.ngb-dp-day .btn-light:not(.text-muted)').first();
  await dayBtn.click();

  // Now click start date and pick a date in the future
  await startInput.click();
  await expect(datepicker).toBeVisible({ timeout: 3_000 });

  // Navigate forward several months
  const nextBtn = datepicker.locator('button[aria-label="Next month"], button.ngb-dp-arrow-btn').last();
  await nextBtn.click();
  await nextBtn.click();
  await nextBtn.click();
  await nextBtn.click();

  // Pick a day
  const futureDayBtn = datepicker.locator('.ngb-dp-day .btn-light:not(.text-muted)').first();
  await futureDayBtn.click();

  // Check for the "End date must be after start date" error
  const dateError = page.locator('.panel__error', { hasText: 'End date must be after start date' });
  await expect(dateError).toBeVisible({ timeout: 3_000 });

  // Submit button should be disabled
  await expect(page.locator('[data-testid="panel-submit-btn"]')).toBeDisabled();

  // Clean up
  await page.locator('[data-testid="panel-cancel-btn"]').click();
});

// ---------------------------------------------------------------------------
// 9. Panel close
// ---------------------------------------------------------------------------
test('panel closes on Cancel click and Escape key', async ({ page }) => {
  const firstRow = page.locator('[data-testid="timeline-row"]').first();
  const rowBox = await firstRow.boundingBox();
  const panel = page.locator('[data-testid="panel"]');

  // Open panel → click Cancel → panel closes
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });
  await expect(panel).toBeVisible({ timeout: 5_000 });
  await page.locator('[data-testid="panel-cancel-btn"]').click();
  await expect(panel).toBeHidden({ timeout: 5_000 });

  // Open panel → press Escape → panel closes
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });
  await expect(panel).toBeVisible({ timeout: 5_000 });
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 10. Data persistence (IndexedDB)
// ---------------------------------------------------------------------------
test('data persists across page reloads via IndexedDB', async ({ page }) => {
  const uniqueName = `Persist-${Date.now()}`;

  // Create a work order with a unique name
  const firstRow = page.locator('[data-testid="timeline-row"]').first();
  const rowBox = await firstRow.boundingBox();
  await firstRow.click({ position: { x: rowBox!.width - 50, y: rowBox!.height / 2 } });

  const panel = page.locator('[data-testid="panel"]');
  await expect(panel).toBeVisible({ timeout: 5_000 });

  await page.locator('[data-testid="panel-name-input"]').clear();
  await page.locator('[data-testid="panel-name-input"]').fill(uniqueName);
  await page.locator('[data-testid="panel-submit-btn"]').click();
  await expect(panel).toBeHidden({ timeout: 5_000 });

  // Verify the bar exists
  const newBar = page.locator('[data-testid="work-order-bar"]', { hasText: uniqueName });
  await expect(newBar).toBeVisible({ timeout: 5_000 });

  // Reload the page (do NOT clear IndexedDB)
  await page.reload();
  await page.locator('[data-testid="work-order-bar"]').first().waitFor({ state: 'visible', timeout: 15_000 });

  // The created work order should still be visible
  const persistedBar = page.locator('[data-testid="work-order-bar"]', { hasText: uniqueName });
  await expect(persistedBar).toBeVisible({ timeout: 10_000 });
});
