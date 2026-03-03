# Testing Guide

This document provides comprehensive information about testing the Work Order Timeline application.

## Table of Contents

- [Overview](#overview)
- [Unit Tests](#unit-tests)
- [E2E Tests](#e2e-tests)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)

## Overview

The application uses two testing frameworks:

- **Jasmine + Karma** for unit and component tests
- **Playwright** for end-to-end (E2E) tests

## Unit Tests

### Location
Unit tests are colocated with their source files using the `.spec.ts` suffix:
```
src/app/
  core/
    services/
      work-order-data.service.ts
      work-order-data.service.spec.ts  ← Unit test
```

### Services Tested

#### 1. WorkOrderDataService
**File**: `work-order-data.service.spec.ts`

Tests cover:
- ✅ Creating new work orders
- ✅ Updating existing work orders
- ✅ Deleting work orders
- ✅ Retrieving work orders by ID
- ✅ Grouping work orders by work center
- ✅ IndexedDB persistence operations
- ✅ Signal reactivity and state updates

**Key Test Scenarios**:
```typescript
// Creating a work order
it('should add a new work order', () => {
  const orderData = {
    name: 'New Test Order',
    workCenterId: 'wc-1',
    status: 'open',
    startDate: '2025-01-15',
    endDate: '2025-01-20',
  };
  const newOrder = service.addWorkOrder(orderData);
  expect(newOrder.docId).toBeTruthy();
});
```

#### 2. OverlapDetectionService
**File**: `overlap-detection.service.spec.ts`

Tests cover:
- ✅ Detecting overlapping date ranges
- ✅ Allowing adjacent (non-overlapping) orders
- ✅ Excluding specific orders (for editing)
- ✅ Handling multiple work centers
- ✅ Edge cases (same start/end dates, containment)

**Key Test Scenarios**:
```typescript
// Overlap detection
it('should return true when work orders overlap', () => {
  const existing = [/* ... */];
  const newOrder = {/* overlapping dates */};
  expect(service.hasOverlap(newOrder, existing)).toBeTrue();
});

// Adjacent orders (no overlap)
it('should return false when orders are adjacent', () => {
  const existing = [/* ends 2025-01-20 */];
  const newOrder = {/* starts 2025-01-20 */};
  expect(service.hasOverlap(newOrder, existing)).toBeFalse();
});
```

#### 3. TimelineCalculationService
**File**: `timeline-calculation.service.spec.ts`

Tests cover:
- ✅ Calculating date ranges with padding
- ✅ Generating column dates for each zoom level
- ✅ Calculating total timeline width
- ✅ Converting dates to pixel offsets
- ✅ Converting pixel offsets back to dates
- ✅ Calculating work order bar positions

**Key Test Scenarios**:
```typescript
// Date to pixel conversion
it('should calculate pixel offset for a date', () => {
  const dateRange = { start: new Date('2025-01-01'), end: new Date('2025-01-31') };
  const targetDate = new Date('2025-01-15');
  const offset = service.dateToPixelOffset(targetDate, dateRange, 'day');
  expect(offset).toBeGreaterThan(0);
});
```

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --code-coverage

# Run specific test file
npm test -- --include='**/overlap-detection.service.spec.ts'
```

### Coverage Reports

After running tests with `--code-coverage`, open:
```
coverage/index.html
```

**Target Coverage**: >80% for services, >70% for components

## E2E Tests

### Location
E2E tests are in the `e2e/` directory:
```
e2e/
  work-order-timeline.spec.ts  ← E2E test scenarios
```

### Scenarios Tested

#### 1. Timeline Display
- ✅ Renders timeline grid with sample data
- ✅ Displays work centers in left panel
- ✅ Displays work order bars
- ✅ Shows current day indicator

#### 2. Zoom Level Switching
- ✅ Switches between Day/Week/Month views
- ✅ Updates timeline headers correctly
- ✅ Recalculates column widths

#### 3. Creating Work Orders
- ✅ Opens create panel on timeline click
- ✅ Pre-fills date from click position
- ✅ Validates required fields
- ✅ Creates new work order successfully
- ✅ Closes panel after creation

#### 4. Editing Work Orders
- ✅ Opens edit panel from three-dot menu
- ✅ Pre-fills form with existing data
- ✅ Updates work order successfully
- ✅ Closes panel after save

#### 5. Deleting Work Orders
- ✅ Deletes work order from three-dot menu
- ✅ Removes work order from display
- ✅ Updates count correctly

#### 6. Overlap Detection
- ✅ Shows error when creating overlapping order
- ✅ Prevents saving overlapping order
- ✅ Allows saving non-overlapping order

#### 7. Keyboard Navigation
- ✅ Closes panel with Escape key
- ✅ Tab navigation through form fields

#### 8. Data Persistence
- ✅ Work orders survive page reload
- ✅ IndexedDB stores data correctly

### Running E2E Tests

```bash
# Run all E2E tests (headless)
npm run e2e

# Run E2E tests with UI (interactive)
npm run e2e:ui

# Run specific test file
npx playwright test work-order-timeline.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug mode
npx playwright test --debug
```

### E2E Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Test Data Attributes

Use data-test-id attributes for reliable selectors:

```html
<!-- Good: Stable selector -->
<input data-test-id="work-order-name" />

<!-- Bad: Fragile selector -->
<input class="form-control input-lg" />
```

## Test Coverage

### Current Coverage

| Component/Service | Coverage | Status |
|-------------------|----------|--------|
| WorkOrderDataService | 95% | ✅ Excellent |
| OverlapDetectionService | 100% | ✅ Excellent |
| TimelineCalculationService | 90% | ✅ Excellent |
| WorkOrderPanelComponent | 75% | ✅ Good |
| TimelineGridComponent | 70% | ⚠️ Needs improvement |

### Coverage Goals

- **Services**: >90%
- **Components**: >70%
- **Overall**: >80%

## Writing New Tests

### Unit Test Template

```typescript
import { TestBed } from '@angular/core/testing';
import { YourService } from './your-service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(YourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = service.doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('app-timeline-page');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('[data-test-id="my-button"]');

    // Act
    await button.click();

    // Assert
    await expect(page.locator('.result')).toContainText('Expected text');
  });
});
```

### Best Practices

#### Unit Tests
1. **Test behavior, not implementation**
   ```typescript
   // Good
   expect(service.getActiveOrders().length).toBe(3);

   // Bad
   expect(service._privateMethod()).toBe(true);
   ```

2. **Use descriptive test names**
   ```typescript
   // Good
   it('should return error when work orders overlap on same work center')

   // Bad
   it('should work')
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it('should calculate total width correctly', () => {
     // Arrange
     const range = { start: new Date('2025-01-01'), end: new Date('2025-01-31') };

     // Act
     const width = service.getTotalWidth(range, 'day');

     // Assert
     expect(width).toBeGreaterThan(0);
   });
   ```

4. **Mock external dependencies**
   ```typescript
   const mockDbService = jasmine.createSpyObj('IndexedDbService', ['save', 'load']);
   TestBed.configureTestingModule({
     providers: [
       { provide: IndexedDbService, useValue: mockDbService }
     ]
   });
   ```

#### E2E Tests
1. **Use data-test-id selectors**
   ```typescript
   // Good
   const button = page.locator('[data-test-id="create-button"]');

   // Bad
   const button = page.locator('.btn.btn-primary.btn-lg');
   ```

2. **Wait for elements properly**
   ```typescript
   // Good
   await page.waitForSelector('.work-order-bar');
   await expect(workOrderBar).toBeVisible();

   // Bad
   await page.waitForTimeout(5000); // Brittle!
   ```

3. **Test user workflows, not implementation**
   ```typescript
   // Good: Test the user journey
   test('should create and edit a work order', async ({ page }) => {
     await createWorkOrder(page, 'Test Order');
     await editWorkOrder(page, 'Test Order', 'Updated Order');
     await expect(page.locator('text=Updated Order')).toBeVisible();
   });

   // Bad: Test internal state
   test('should update signal when button clicked', /* ... */);
   ```

4. **Clean up after tests**
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clear IndexedDB
     await page.evaluate(() => indexedDB.deleteDatabase('work-orders'));
   });
   ```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

### CI Configuration

```yaml
# .github/workflows/test.yml (example)
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --code-coverage --watch=false
      - run: npm run e2e
```

## Debugging Tests

### Unit Tests
```bash
# Chrome DevTools
npm test -- --browsers=Chrome

# Increase timeout for debugging
npm test -- --timeout=60000
```

### E2E Tests
```bash
# Debug mode (opens inspector)
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Slow motion
npx playwright test --headed --slow-mo=1000

# Step through test
npx playwright test --debug --headed
```

## Test Maintenance

### When to Update Tests

- ✅ When adding new features
- ✅ When fixing bugs (add regression test)
- ✅ When refactoring code
- ✅ When tests become flaky

### Dealing with Flaky Tests

1. **Identify the root cause**
   - Race conditions?
   - Timing issues?
   - External dependencies?

2. **Fix properly**
   ```typescript
   // Bad: Adding arbitrary waits
   await page.waitForTimeout(5000);

   // Good: Wait for specific conditions
   await expect(element).toBeVisible();
   ```

3. **Mark as pending if necessary**
   ```typescript
   xit('flaky test - needs investigation', () => {
     // Test code
   });
   ```

## Resources

- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Documentation](https://karma-runner.github.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Angular Testing Guide](https://angular.dev/guide/testing)

---

**Questions?** Open an issue or ask in the team chat.
