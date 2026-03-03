import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, viewChild, effect, OnInit, OnDestroy } from '@angular/core';
import { WorkOrderDataService } from '../../core/services/work-order-data.service';
import { TimelineCalculationService } from '../../core/services/timeline-calculation.service';
import { PanelStateService } from '../../core/services/panel-state.service';
import { ZoomLevel, DateRange, COLUMN_WIDTHS } from '../../core/models/timeline.model';
import { TimelineToolbarComponent } from './components/timeline-toolbar/timeline-toolbar.component';
import { TimelineGridComponent } from './components/timeline-grid/timeline-grid.component';
import { WorkOrderPanelComponent } from './components/work-order-panel/work-order-panel.component';

@Component({
  selector: 'app-timeline-page',
  standalone: true,
  imports: [TimelineToolbarComponent, TimelineGridComponent, WorkOrderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline-page">
      <header class="page-header">
        <span class="logo"><span class="logo--nao">NAO</span><span class="logo--logic">LOGIC</span></span>
      </header>
      <div class="page-content">
        <h1 class="page-title">Work Orders</h1>
        <app-timeline-toolbar
          [zoom]="zoom()"
          (zoomChange)="onZoomChange($event)"
          (scrollToToday)="onScrollToToday()"
        />
        <app-timeline-grid
          #grid
          [workCenters]="dataService.workCenters()"
          [workOrdersByCenter]="dataService.workOrdersByCenter()"
          [dateRange]="dateRange()"
          [zoom]="zoom()"
          [columnDates]="columnDates()"
          [totalWidth]="totalWidth()"
          [todayOffset]="todayOffset()"
          (zoomIn)="onHeaderZoomIn($event)"
          (extendRange)="onExtendRange($event)"
        />
      </div>
      @if (panelState.isOpen()) {
        <app-work-order-panel />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
    .timeline-page {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: var(--page-max-width);
      margin: 0 auto;
      position: relative;
      background: var(--color-bg);
    }
    .page-header {
      height: 50px;
      min-height: 50px;
      display: flex;
      align-items: center;
      padding: 0 var(--spacing-lg) 0 var(--page-padding-left);
      background-color: rgba(255, 255, 255, 1);
    }
    .logo {
      display: inline-block;
      width: 80px;
      height: 10px;
      line-height: 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
    }
    .logo--nao {
      color: var(--color-primary);
    }
    .logo--logic {
      color: var(--color-text-muted);
    }
    .page-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 0 var(--spacing-lg) 0 var(--page-padding-left);
      overflow: hidden;
    }
    .page-title {
      font-family: "Circular-Std", var(--font-family);
      font-size: clamp(20px, 3vw, 24px);
      font-weight: 500;
      font-style: normal;
      line-height: 34px;
      color: rgba(3, 9, 41, 1);
      margin: clamp(20px, 4vh, 45px) 0 clamp(16px, 3vh, 26px);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    // Tablet adjustments
    @media (max-width: 1023px) {
      .page-header {
        padding: 0 var(--spacing-md) 0 var(--page-padding-left);
      }
      .page-content {
        padding: 0 var(--spacing-md) 0 var(--page-padding-left);
      }
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .page-header {
        height: 44px;
        min-height: 44px;
        padding: 0 var(--spacing-sm) 0 var(--page-padding-left);
      }
      .logo {
        font-size: 8px;
        width: 70px;
      }
      .page-content {
        padding: 0 var(--spacing-sm) 0 var(--page-padding-left);
      }
      .page-title {
        font-size: 18px;
        line-height: 24px;
        margin: 12px 0 12px;
      }
    }
  `],
})
export class TimelinePageComponent implements OnInit, OnDestroy {
  readonly dataService = inject(WorkOrderDataService);
  private readonly calcService = inject(TimelineCalculationService);
  readonly panelState = inject(PanelStateService);

  private readonly gridRef = viewChild<TimelineGridComponent>('grid');
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  readonly zoom = signal<ZoomLevel>('day');
  /** Ticks every 60s so todayOffset recomputes with the real current time */
  readonly now = signal(new Date());

  /** Base date range from work orders — padding varies by zoom so there's always
   *  enough content to scroll-center on today (month columns are wide, so we need
   *  more months visible → more padding days). */
  private readonly baseRange = computed(() => {
    let padding: number;
    switch (this.zoom()) {
      case 'month': padding = 210; break;  // ~7 months each side
      case 'week':  padding = 120; break;  // ~17 weeks each side
      default:      padding = 60;  break;
    }
    return this.calcService.getDateRange(this.dataService.workOrders(), padding);
  });

  /** Extra days added by infinite scroll on each side */
  private readonly extraLeft = signal(0);
  private readonly extraRight = signal(0);

  /** Active date range, extended by infinite scroll */
  readonly dateRange = computed<DateRange>(() => {
    const base = this.baseRange();
    const MS_PER_DAY = 86400000;
    return {
      start: new Date(base.start.getTime() - this.extraLeft() * MS_PER_DAY),
      end: new Date(base.end.getTime() + this.extraRight() * MS_PER_DAY),
    };
  });

  /** Reset extra scroll days when zoom or work orders change */
  private readonly resetEffect = effect(() => {
    // Track dependencies
    this.zoom();
    this.dataService.workOrders();
    // Reset extensions
    this.extraLeft.set(0);
    this.extraRight.set(0);
  }, { allowSignalWrites: true });

  readonly columnDates = computed(() =>
    this.calcService.getColumnDates(this.dateRange(), this.zoom())
  );

  readonly totalWidth = computed(() =>
    this.calcService.getTotalWidth(this.dateRange(), this.zoom())
  );

  readonly todayOffset = computed(() => {
    const currentTime = this.now(); // signal dependency — re-evaluates when now ticks
    return this.calcService.dateToPixelOffset(currentTime, this.dateRange(), this.zoom());
  });

  /** Re-scroll to today once the async IndexedDB load finishes, in case the date range shifted */
  private readonly scrollOnDataReady = effect(() => {
    if (this.dataService.initialized()) {
      // Use untracked to avoid re-triggering on grid changes
      requestAnimationFrame(() => requestAnimationFrame(() => this.gridRef()?.scrollToToday()));
    }
  });

  ngOnInit(): void {
    // Tick the clock every 60 seconds so the today line tracks real time
    this.clockTimer = setInterval(() => this.now.set(new Date()), 60_000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  /** Days to add per extension, based on zoom level */
  private getExtensionDays(): number {
    switch (this.zoom()) {
      case 'hour': return 7;
      case 'day': return 30;
      case 'week': return 60;
      case 'month': return 180;
    }
  }

  onExtendRange(direction: 'left' | 'right'): void {
    const days = this.getExtensionDays();
    if (direction === 'left') {
      this.extraLeft.update(v => v + days);
    } else {
      this.extraRight.update(v => v + days);
    }
  }

  onZoomChange(newZoom: ZoomLevel): void {
    // Reset extras synchronously BEFORE setting zoom — the async resetEffect fires too late
    this.extraLeft.set(0);
    this.extraRight.set(0);
    this.zoom.set(newZoom);
    // Double rAF ensures Angular has re-rendered and the browser has painted the new layout
    requestAnimationFrame(() => requestAnimationFrame(() => this.gridRef()?.scrollToToday()));
  }

  onHeaderZoomIn(event: { zoom: ZoomLevel; targetDate: Date }): void {
    this.zoom.set(event.zoom);
    requestAnimationFrame(() => requestAnimationFrame(() => this.gridRef()?.scrollToDate(event.targetDate)));
  }

  onScrollToToday(): void {
    // Use double rAF so "Today" works reliably even during ongoing layout updates.
    requestAnimationFrame(() => requestAnimationFrame(() => this.gridRef()?.scrollToToday()));
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    if (this.panelState.isOpen()) {
      this.panelState.close();
    }
  }
}
