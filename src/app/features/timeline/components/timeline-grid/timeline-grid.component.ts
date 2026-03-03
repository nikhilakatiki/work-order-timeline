import {
  Component, ChangeDetectionStrategy, input, inject, computed,
  ElementRef, viewChild, AfterViewInit, signal, output,
} from '@angular/core';
import { WorkCenterDocument } from '../../../../core/models/work-center.model';
import { WorkOrderDocument } from '../../../../core/models/work-order.model';
import { ZoomLevel, DateRange, COLUMN_WIDTHS } from '../../../../core/models/timeline.model';
import { TimelineCalculationService } from '../../../../core/services/timeline-calculation.service';
import { TimelineHeaderComponent } from '../timeline-header/timeline-header.component';
import { TimelineRowComponent } from '../timeline-row/timeline-row.component';
import { CurrentDayIndicatorComponent } from '../current-day-indicator/current-day-indicator.component';

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [TimelineHeaderComponent, TimelineRowComponent, CurrentDayIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid-container">
      <!-- Fixed header row spanning both panels -->
      <div class="grid-header">
        <div class="left-panel__header">
          <span class="left-panel__header-label">Work Center</span>
        </div>
        <div class="header-scroll" #headerScroll>
          <app-timeline-header
            [columnDates]="columnDates()"
            [zoom]="zoom()"
            [totalWidth]="totalWidth()"
            [dateRange]="dateRange()"
            (zoomIn)="zoomIn.emit($event)"
          />
        </div>
      </div>

      <!-- Scrollable body (left panel + right area scroll together vertically) -->
      <div class="grid-body">
        <!-- Fixed left panel -->
        <div class="left-panel" #leftPanel (wheel)="onLeftPanelWheel($event)">
          @for (wc of workCenters(); track wc.docId; let i = $index) {
            <div
              data-testid="left-panel-row"
              class="left-panel__row"
              [class.left-panel__row--hover]="hoveredRow() === i"
            >
              <span class="left-panel__name">{{ wc.data.name }}</span>
            </div>
          }
        </div>

        <!-- Scrollable right area -->
        <div class="scroll-area" #scrollArea (scroll)="onScroll()">
          <div class="scroll-content" [style.width.px]="totalWidth()">
            <div
              class="rows-container"
              [style.background-size]="colWidth() + 'px 100%'"
              [style.background-repeat]="'repeat-x'"
              [style.background-image]="'linear-gradient(to right, rgba(230,235,240,1) 1px, transparent 1px)'"
            >
              @for (wc of workCenters(); track wc.docId; let i = $index) {
                <div
                  data-testid="timeline-row"
                  (mouseenter)="hoveredRow.set(i)"
                  (mouseleave)="hoveredRow.set(-1)"
                >
                  <app-timeline-row
                    [workCenter]="wc"
                    [workOrders]="getOrdersForCenter(wc.docId)"
                    [dateRange]="dateRange()"
                    [zoom]="zoom()"
                    [totalWidth]="totalWidth()"
                  />
                </div>
              }
              <app-current-day-indicator
                [offset]="todayOffset()"
              />
              @if (currentPeriodBadge(); as badge) {
                <div
                  class="current-period-badge"
                  [style.left.px]="badge.left"
                >
                  <span class="current-period-badge__label">{{ badge.label }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .grid-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      border: 1px solid rgba(230, 235, 240, 1);
      border-radius: 0;
      background: var(--color-surface);
    }

    /* Fixed header row — does not scroll vertically */
    .grid-header {
      position: relative;
      display: flex;
      flex-shrink: 0;
      height: var(--header-height);
      border-bottom: none;
      z-index: var(--z-header);
      background: var(--color-surface);
    }
    .left-panel__header {
      width: var(--left-panel-width);
      min-width: var(--left-panel-width);
      height: var(--header-height);
      display: flex;
      align-items: center;
      padding: 0 clamp(12px, 3vw, 24px) 0 clamp(16px, 4vw, 32px);
      background: var(--color-surface);
      border-right: 1px solid rgba(230, 235, 240, 1);
      border-bottom: 1px solid rgba(230, 235, 240, 1);
      flex-shrink: 0;
    }
    .left-panel__header-label {
      width: 138px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      color: rgba(104, 113, 150, 1);
      font-family: "CircularStd-Regular", "Circular-Std", var(--font-family);
      font-size: clamp(12px, 2vw, 14px);
      font-weight: 500;
      line-height: 16px;
    }
    .header-scroll {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      border-bottom: 1px solid rgba(230, 235, 240, 1);
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .header-scroll::-webkit-scrollbar {
      display: none;
    }

    /* Body — left panel + scrollable area */
    .grid-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .left-panel {
      width: var(--left-panel-width);
      min-width: var(--left-panel-width);
      background: rgba(250, 251, 253, 1);
      border-right: 1px solid rgba(230, 235, 240, 1);
      z-index: var(--z-left-panel);
      flex-shrink: 0;
      overflow: hidden;
    }
    .left-panel__row {
      height: var(--row-height);
      display: flex;
      align-items: center;
      padding: 0 clamp(12px, 3vw, 24px);
      border-bottom: 1px solid var(--color-border-light);
      background-color: rgba(255, 255, 255, 1);
      transition: background-color 150ms ease;
    }
    .left-panel__row--hover {
      background-color: rgba(250, 251, 253, 1);
    }
    .left-panel__name {
      font-size: clamp(12px, 2vw, 14px);
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scroll-area {
      flex: 1;
      overflow-x: auto;
      overflow-y: auto;
    }
    .scroll-content {
      min-width: 100%;
    }
    .rows-container {
      position: relative;
      background-color: rgba(247, 249, 252, 1);
    }
    .current-period-badge {
      position: absolute;
      top: 0;
      transform: none;
      z-index: var(--z-header);
      width: 109px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 5px;
      background-color: rgba(212, 215, 255, 1);
      white-space: nowrap;
      border: none;
      pointer-events: none;
    }
    .current-period-badge__label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 93px;
      height: 18px;
      color: rgba(62, 64, 219, 1);
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: 14px;
      font-weight: 400;
      font-style: normal;
      line-height: 18px;
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .left-panel__header {
        padding: 0 8px;
      }
      .left-panel__header-label {
        font-size: 11px;
        width: auto;
      }
      .left-panel__row {
        padding: 0 8px;
      }
      .left-panel__name {
        font-size: 11px;
        font-weight: 500;
      }
      .current-period-badge {
        width: 80px;
        height: 20px;
      }
      .current-period-badge__label {
        font-size: 11px;
        width: auto;
      }
    }
  `],
})
export class TimelineGridComponent implements AfterViewInit {
  readonly workCenters = input.required<WorkCenterDocument[]>();
  readonly workOrdersByCenter = input.required<Map<string, WorkOrderDocument[]>>();
  readonly dateRange = input.required<DateRange>();
  readonly zoom = input.required<ZoomLevel>();
  readonly columnDates = input.required<Date[]>();
  readonly totalWidth = input.required<number>();
  readonly todayOffset = input.required<number>();
  readonly zoomIn = output<{ zoom: ZoomLevel; targetDate: Date }>();
  readonly extendRange = output<'left' | 'right'>();

  private readonly calcService = inject(TimelineCalculationService);
  private readonly scrollAreaRef = viewChild<ElementRef<HTMLElement>>('scrollArea');
  private readonly leftPanelRef = viewChild<ElementRef<HTMLElement>>('leftPanel');
  private readonly headerScrollRef = viewChild<ElementRef<HTMLElement>>('headerScroll');

  readonly hoveredRow = signal(-1);
  private extending = false;
  /** Pixel threshold from edge to trigger infinite scroll extension */
  private readonly EDGE_THRESHOLD = 200;

  /** Badge showing "Current day/week/month/hour" at the correct column position */
  readonly currentPeriodBadge = computed(() => {
    const zoom = this.zoom();
    const lineX = this.todayOffset();
    const totalWidth = this.totalWidth();
    const badgeWidth = 109;
    const left = Math.max(0, Math.min(totalWidth - badgeWidth, lineX - 1));
    const labels: Record<ZoomLevel, string> = {
      hour: 'Current hour', day: 'Current day',
      week: 'Current week', month: 'Current month',
    };
    return { label: labels[zoom], left };
  });

  colWidth(): number {
    return COLUMN_WIDTHS[this.zoom()];
  }

  getOrdersForCenter(centerId: string): WorkOrderDocument[] {
    return this.workOrdersByCenter().get(centerId) ?? [];
  }

  /** Forward wheel events from the left panel to the main scroll area so users can scroll while hovering over work center names. */
  onLeftPanelWheel(event: WheelEvent): void {
    const scrollEl = this.scrollAreaRef()?.nativeElement;
    if (!scrollEl) return;
    event.preventDefault();
    scrollEl.scrollTop += event.deltaY;
    scrollEl.scrollLeft += event.deltaX;
  }

  onScroll(): void {
    const scrollEl = this.scrollAreaRef()?.nativeElement;
    const leftEl = this.leftPanelRef()?.nativeElement;
    if (!scrollEl) return;

    // Sync left panel vertical scroll
    if (leftEl) {
      leftEl.scrollTop = scrollEl.scrollTop;
    }
    // Sync header horizontal scroll
    const headerEl = this.headerScrollRef()?.nativeElement;
    if (headerEl) {
      headerEl.scrollLeft = scrollEl.scrollLeft;
    }

    // Infinite scroll: detect proximity to edges
    if (this.extending) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
    const distFromRight = scrollWidth - scrollLeft - clientWidth;

    if (scrollLeft < this.EDGE_THRESHOLD) {
      this.extending = true;
      this.extendRange.emit('left');
      // After extending left, adjust scroll to maintain view position
      requestAnimationFrame(() => {
        const newScrollWidth = scrollEl.scrollWidth;
        const added = newScrollWidth - scrollWidth;
        scrollEl.scrollLeft = scrollLeft + added;
        this.extending = false;
      });
    } else if (distFromRight < this.EDGE_THRESHOLD) {
      this.extending = true;
      this.extendRange.emit('right');
      requestAnimationFrame(() => {
        this.extending = false;
      });
    }
  }

  ngAfterViewInit(): void {
    // Double rAF ensures Angular change detection and browser paint are complete
    requestAnimationFrame(() => requestAnimationFrame(() => this.scrollToToday()));
  }

  scrollToToday(): void {
    const el = this.scrollAreaRef()?.nativeElement;
    if (!el) return;
    const todayPx = this.calcService.getCurrentPeriodCenterOffset(this.dateRange(), this.zoom());
    const viewWidth = el.clientWidth;
    const scrollLeft = Math.max(0, todayPx - viewWidth / 2);
    el.scrollLeft = scrollLeft;
    // Sync header
    const headerEl = this.headerScrollRef()?.nativeElement;
    if (headerEl) headerEl.scrollLeft = scrollLeft;
  }

  scrollToDate(date: Date): void {
    const el = this.scrollAreaRef()?.nativeElement;
    if (!el) return;
    const datePx = this.calcService.dateToPixelOffset(date, this.dateRange(), this.zoom());
    const viewWidth = el.clientWidth;
    const scrollLeft = Math.max(0, datePx - viewWidth / 4);
    el.scrollLeft = scrollLeft;
    // Sync header
    const headerEl = this.headerScrollRef()?.nativeElement;
    if (headerEl) headerEl.scrollLeft = scrollLeft;
  }
}
