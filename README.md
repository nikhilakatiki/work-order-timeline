# Work Order Schedule Timeline

An interactive timeline component for a manufacturing ERP system, built with **Angular 18**. Planners can visualize, create, and edit work orders across multiple work centers on a horizontally-scrollable Gantt-style timeline.

## Features

- **Interactive Timeline Grid** — Horizontally scrollable Gantt chart with fixed left panel for work center names
- **Zoom Levels** — Switch between Day, Week, and Month views; click header cells to zoom into that period
- **Create Work Orders** — Click any empty slot on the timeline to open a pre-filled creation form
- **Edit & Delete** — Three-dot action menu on each bar for editing or removing orders
- **Overlap Detection** — Real-time validation prevents scheduling conflicts on the same work center
- **Smart Date Prefill** — Click-to-create automatically constrains dates to available gaps between existing orders
- **Status Management** — Four statuses: Open, In Progress, Complete, Blocked (with color-coded bars and badges)
- **Current Day Indicator** — Vertical line marking today's date; "Today" button to scroll back
- **Slide-in Panel** — Animated side panel for create/edit forms with reactive form validation
- **localStorage Persistence** — All changes survive page refresh
- **Hover Interactions** — Slot preview with "Click to add dates" tooltip; collision detection with "Slot overlap" warning

## Architecture

```
src/app/
├── core/
│   ├── models/            # TypeScript interfaces (WorkOrder, WorkCenter, Timeline)
│   ├── services/          # Signal-based state management & business logic
│   │   ├── work-order-data.service.ts      # CRUD + localStorage persistence
│   │   ├── timeline-calculation.service.ts # Date↔pixel math, column generation
│   │   ├── overlap-detection.service.ts    # Scheduling conflict detection
│   │   └── panel-state.service.ts          # Side panel UI state
│   └── data/
│       └── sample-data.ts                  # 6 work centers, 10 sample orders
├── features/
│   └── timeline/
│       ├── timeline-page.component.ts      # Page orchestrator
│       └── components/
│           ├── timeline-grid/              # Fixed left panel + scrollable area
│           ├── timeline-header/            # Date column headers per zoom level
│           ├── timeline-row/               # Row per work center with hover slot
│           ├── timeline-toolbar/           # Zoom selector + Today button
│           ├── work-order-bar/             # Positioned status-colored bar
│           ├── work-order-actions-menu/    # Edit/Delete dropdown
│           ├── work-order-panel/           # Slide-in create/edit form
│           └── current-day-indicator/      # Vertical today line
└── shared/
    ├── pipes/             # StatusLabelPipe
    ├── styles/            # SCSS partials (_variables, _status-colors, _animations)
    └── utils/             # Date conversion helpers
```

## Component Hierarchy

```
AppComponent
└── TimelinePageComponent
    ├── TimelineToolbarComponent          (zoom selector, Today button)
    ├── TimelineGridComponent             (layout: fixed left + scrollable right)
    │   ├── TimelineHeaderComponent       (date labels, click-to-zoom)
    │   ├── TimelineRowComponent × N      (one per work center)
    │   │   └── WorkOrderBarComponent × N (positioned bar with status color)
    │   │       └── WorkOrderActionsMenuComponent (3-dot → Edit/Delete)
    │   └── CurrentDayIndicatorComponent  (vertical today line)
    └── WorkOrderPanelComponent           (slide-in form)
```

## Tech Stack

- **Angular 18** — Standalone components, signals, OnPush change detection
- **TypeScript** — Strict typing throughout, no `any` usage
- **SCSS** — CSS custom properties, BEM naming convention
- **Reactive Forms** — With custom validators (date format, date order, overlap)
- **Angular Animations** — Panel slide-in/out transitions
- **ng-select** — Styled dropdown for zoom and status selection
- **localStorage** — Client-side data persistence

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Navigate to
http://localhost:4200
```

## Design

- Font: Circular Std (loaded via CDN)
- Design specifications sourced from Sketch mockups
- Pixel-perfect implementation of colors, spacing, shadows, and typography

## Sample Data

The app ships with 6 work centers and 10 work orders spanning all 4 statuses. Dates are relative to the current date so the timeline always appears populated. Data resets on version change; otherwise persists in localStorage.
