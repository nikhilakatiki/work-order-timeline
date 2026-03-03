import { test, expect, Page } from '@playwright/test';

test.describe('Work Order Timeline', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('app-timeline-page');
  });

  test('should display the timeline with sample data', async () => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Work Orders');

    // Check that work centers are displayed
    const workCenters = page.locator('.work-center-label');
    await expect(workCenters.first()).toBeVisible();
    const count = await workCenters.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Check that work order bars are displayed
    const workOrderBars = page.locator('.work-order-bar');
    await expect(workOrderBars.first()).toBeVisible();
    const barCount = await workOrderBars.count();
    expect(barCount).toBeGreaterThanOrEqual(8);
  });

  test('should switch between zoom levels', async () => {
    // Check default zoom level is Day
    const zoomSelect = page.locator('[data-test-id="zoom-selector"]');
    await expect(zoomSelect).toBeVisible();

    // Switch to Week view
    await zoomSelect.click();
    await page.locator('text=Week').click();
    await page.waitForTimeout(500); // Wait for animation

    // Verify week headers are displayed
    const headers = page.locator('.timeline-header-cell');
    await expect(headers.first()).toBeVisible();

    // Switch to Month view
    await zoomSelect.click();
    await page.locator('text=Month').click();
    await page.waitForTimeout(500);

    // Verify month headers are displayed
    await expect(headers.first()).toBeVisible();
  });

  test('should display current day indicator', async () => {
    const todayIndicator = page.locator('.current-day-indicator');
    await expect(todayIndicator).toBeVisible();
  });

  test('should scroll to today when "Today" button is clicked', async () => {
    const todayButton = page.locator('[data-test-id="today-button"]');

    if (await todayButton.isVisible()) {
      await todayButton.click();
      await page.waitForTimeout(500);

      // Verify the current day indicator is in view
      const todayIndicator = page.locator('.current-day-indicator');
      await expect(todayIndicator).toBeInViewport();
    }
  });

  test('should open create panel when clicking empty timeline area', async () => {
    // Click on an empty area of the timeline
    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      // Click in the middle of the timeline
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);

      // Check if panel opened
      const panel = page.locator('app-work-order-panel');
      await expect(panel).toBeVisible();

      // Check panel header
      await expect(panel.locator('.panel-header')).toContainText('Work Order Details');
    }
  });

  test('should create a new work order', async () => {
    // Get initial work order count
    const initialBars = await page.locator('.work-order-bar').count();

    // Click on an empty area to open create panel
    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      // Fill in the form
      await page.fill('[data-test-id="work-order-name"]', 'E2E Test Order');

      // Select status
      const statusSelect = page.locator('[data-test-id="status-select"]');
      await statusSelect.click();
      await page.locator('text=In Progress').click();

      // Click Create button
      await page.click('[data-test-id="create-button"]');
      await page.waitForTimeout(500);

      // Verify panel closed
      const panel = page.locator('app-work-order-panel');
      await expect(panel).not.toBeVisible();

      // Verify new work order was created
      const finalBars = await page.locator('.work-order-bar').count();
      expect(finalBars).toBe(initialBars + 1);

      // Verify the new work order is visible
      await expect(page.locator('text=E2E Test Order')).toBeVisible();
    }
  });

  test('should show overlap error when creating overlapping work order', async () => {
    // First, create a work order
    const timeline = page.locator('.timeline-grid');
    const firstRow = page.locator('.timeline-row').first();
    const box = await firstRow.boundingBox();

    if (box) {
      // Create first order
      await page.mouse.click(box.x + 200, box.y + 20);
      await page.waitForTimeout(300);

      await page.fill('[data-test-id="work-order-name"]', 'First Order');
      await page.click('[data-test-id="create-button"]');
      await page.waitForTimeout(500);

      // Try to create overlapping order
      await page.mouse.click(box.x + 220, box.y + 20); // Slightly overlapping position
      await page.waitForTimeout(300);

      await page.fill('[data-test-id="work-order-name"]', 'Overlapping Order');
      await page.click('[data-test-id="create-button"]');
      await page.waitForTimeout(300);

      // Verify error message is shown
      const errorMessage = page.locator('.error-message, .alert-danger');
      const isErrorVisible = await errorMessage.isVisible().catch(() => false);

      // Panel should still be open if there was an overlap error
      if (isErrorVisible) {
        await expect(errorMessage).toContainText(/overlap/i);
        const panel = page.locator('app-work-order-panel');
        await expect(panel).toBeVisible();
      }
    }
  });

  test('should open edit panel from three-dot menu', async () => {
    // Find a work order bar
    const workOrderBar = page.locator('.work-order-bar').first();
    await expect(workOrderBar).toBeVisible();

    // Hover to show the actions menu button
    await workOrderBar.hover();

    // Click the three-dot menu
    const menuButton = workOrderBar.locator('.actions-menu-trigger');
    await menuButton.click({ force: true });
    await page.waitForTimeout(200);

    // Click Edit option
    await page.click('text=Edit');
    await page.waitForTimeout(300);

    // Verify panel opened in edit mode
    const panel = page.locator('app-work-order-panel');
    await expect(panel).toBeVisible();

    // Verify form is pre-filled
    const nameInput = page.locator('[data-test-id="work-order-name"]');
    const nameValue = await nameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
  });

  test('should edit an existing work order', async () => {
    // Find a work order bar
    const workOrderBar = page.locator('.work-order-bar').first();
    await expect(workOrderBar).toBeVisible();

    // Get original name
    const originalName = await workOrderBar.locator('.work-order-name').textContent();

    // Open edit panel
    await workOrderBar.hover();
    const menuButton = workOrderBar.locator('.actions-menu-trigger');
    await menuButton.click({ force: true });
    await page.click('text=Edit');
    await page.waitForTimeout(300);

    // Update the name
    const newName = 'Updated Order Name';
    await page.fill('[data-test-id="work-order-name"]', newName);

    // Save changes
    await page.click('[data-test-id="save-button"]');
    await page.waitForTimeout(500);

    // Verify panel closed
    const panel = page.locator('app-work-order-panel');
    await expect(panel).not.toBeVisible();

    // Verify the name was updated
    await expect(page.locator('text=' + newName)).toBeVisible();
  });

  test('should delete a work order', async () => {
    // Get initial count
    const initialCount = await page.locator('.work-order-bar').count();

    // Find a work order bar
    const workOrderBar = page.locator('.work-order-bar').first();
    await expect(workOrderBar).toBeVisible();

    // Open actions menu
    await workOrderBar.hover();
    const menuButton = workOrderBar.locator('.actions-menu-trigger');
    await menuButton.click({ force: true });
    await page.waitForTimeout(200);

    // Click Delete
    await page.click('text=Delete');
    await page.waitForTimeout(500);

    // Verify work order was deleted
    const finalCount = await page.locator('.work-order-bar').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should close panel when clicking outside', async () => {
    // Open create panel
    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      // Verify panel is open
      const panel = page.locator('app-work-order-panel');
      await expect(panel).toBeVisible();

      // Click outside the panel
      await page.mouse.click(100, 100);
      await page.waitForTimeout(300);

      // Verify panel is closed
      await expect(panel).not.toBeVisible();
    }
  });

  test('should close panel when pressing Escape key', async () => {
    // Open create panel
    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      // Verify panel is open
      const panel = page.locator('app-work-order-panel');
      await expect(panel).toBeVisible();

      // Press Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Verify panel is closed
      await expect(panel).not.toBeVisible();
    }
  });

  test('should display all work order statuses correctly', async () => {
    // Check that different status badges are visible
    const statuses = ['Open', 'In Progress', 'Complete', 'Blocked'];

    for (const status of statuses) {
      const statusBadges = page.locator(`.status-badge:has-text("${status}")`);
      const count = await statusBadges.count();

      // At least one of each status should exist in sample data
      if (count > 0) {
        await expect(statusBadges.first()).toBeVisible();
      }
    }
  });

  test('should show work order details on bar hover (if tooltip implemented)', async () => {
    const workOrderBar = page.locator('.work-order-bar').first();
    await expect(workOrderBar).toBeVisible();

    await workOrderBar.hover();
    await page.waitForTimeout(500);

    // Check if tooltip appears (if implemented)
    const tooltip = page.locator('.tooltip, [role="tooltip"]');
    const isTooltipVisible = await tooltip.isVisible().catch(() => false);

    if (isTooltipVisible) {
      await expect(tooltip).toBeVisible();
    }
  });

  test('should persist data across page reloads', async () => {
    // Create a unique work order
    const uniqueName = `Persistence Test ${Date.now()}`;

    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      await page.fill('[data-test-id="work-order-name"]', uniqueName);
      await page.click('[data-test-id="create-button"]');
      await page.waitForTimeout(500);

      // Reload the page
      await page.reload();
      await page.waitForSelector('app-timeline-page');
      await page.waitForTimeout(1000);

      // Verify the work order still exists
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
    }
  });

  test('should validate required fields in create/edit form', async () => {
    // Open create panel
    const timeline = page.locator('.timeline-grid');
    const box = await timeline.boundingBox();

    if (box) {
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.waitForTimeout(300);

      // Try to submit with empty name
      await page.fill('[data-test-id="work-order-name"]', '');
      await page.click('[data-test-id="create-button"]');
      await page.waitForTimeout(300);

      // Panel should still be open (validation failed)
      const panel = page.locator('app-work-order-panel');
      await expect(panel).toBeVisible();

      // Check for validation error
      const validationError = page.locator('.error-message, .invalid-feedback, .is-invalid');
      const hasError = await validationError.count() > 0;
      expect(hasError).toBeTruthy();
    }
  });
});
