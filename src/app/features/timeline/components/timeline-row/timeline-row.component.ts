import { Component, ChangeDetectionStrategy, input, inject, signal } from '@angular/core';
import { WorkCenterDocument } from '../../../../core/models/work-center.model';
import { WorkOrderDocument } from '../../../../core/models/work-order.model';
import { ZoomLevel, DateRange } from '../../../../core/models/timeline.model';
import { TimelineCalculationService } from '../../../../core/services/timeline-calculation.service';
import { PanelStateService } from '../../../../core/services/panel-state.service';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar.component';
import { dateToIso, addDays, isoToDate } from '../../../../shared/utils/date-helpers';

@Component({
  selector: 'app-timeline-row',
  standalone: true,
  imports: [WorkOrderBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="row"
      [style.min-width.px]="totalWidth()"
      (click)="onRowClick($event)"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()"
    >
      @for (wo of workOrders(); track wo.docId) {
        <app-work-order-bar
          [workOrder]="wo"
          [dateRange]="dateRange()"
          [zoom]="zoom()"
        />
      }
      @if (showSlot()) {
        <div
          class="slot"
          [style.left.px]="slotLeft()"
          [style.width.px]="slotWidth()"
        ></div>
        <div
          class="slot-tooltip"
          [class.slot-tooltip--below]="isFirstRow()"
          [style.left.px]="tooltipLeft()"
        >
          Click to add dates
        </div>
      }
    </div>
  `,
  styles: [`
    .row {
      position: relative;
      height: var(--row-height);
      border-bottom: none;
      background-color: transparent;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .row:hover {
      background-color: rgba(230, 232, 252, 0.7);
    }
    .slot {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      height: clamp(32px, 5vh, 38px);
      border-radius: 8px;
      background-color: rgba(101, 112, 255, 0.1);
      border: 1px solid rgba(195, 199, 255, 1);
      pointer-events: none;
      z-index: 35;
      transition: background-color 150ms ease, border-color 150ms ease;
    }
    .slot-tooltip {
      position: absolute;
      top: 50%;
      transform: translate(-50%, calc(-50% - 36px));
      width: 130px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background-color: rgba(104, 113, 150, 1);
      box-shadow:
        0 2px 4px -2px rgba(200, 207, 233, 1),
        0 0 16px -8px rgba(230, 235, 240, 1);
      color: rgba(249, 250, 255, 1);
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: clamp(12px, 1.8vw, 14px);
      font-weight: 400;
      line-height: 18px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 36;
    }
    .slot-tooltip--below {
      top: 50%;
      transform: translate(-50%, calc(-50% + 36px));
    }

    // Touch device adjustments
    @media (hover: none) {
      .row:hover {
        background-color: transparent;
      }
      .row:active {
        background-color: rgba(230, 232, 252, 0.7);
      }
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .slot {
        height: 28px;
        border-radius: 6px;
      }
      .slot-tooltip {
        font-size: 11px;
        width: 110px;
        height: 24px;
        top: 50%;
        transform: translate(-50%, calc(-50% - 30px));
      }
      .slot-tooltip--below {
        transform: translate(-50%, calc(-50% + 30px));
      }
    }
  `],
})
export class TimelineRowComponent {
  readonly workCenter = input.required<WorkCenterDocument>();
  readonly workOrders = input.required<WorkOrderDocument[]>();
  readonly dateRange = input.required<DateRange>();
  readonly zoom = input.required<ZoomLevel>();
  readonly totalWidth = input.required<number>();
  readonly isFirstRow = input(false);

  private readonly calcService = inject(TimelineCalculationService);
  private readonly panelState = inject(PanelStateService);

  readonly showSlot = signal(false);
  readonly slotLeft = signal(0);
  readonly slotWidth = signal(0);
  readonly tooltipLeft = signal(0);

  onMouseMove(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('app-work-order-bar')) {
      this.showSlot.set(false);
      return;
    }

    const x = event.offsetX;
    const orders = this.workOrders();
    const freeSegment = this.getFreeSegmentAtCursor(x, orders);
    if (!freeSegment) {
      this.showSlot.set(false);
      return;
    }

    const defaultSlotWidth = this.getSlotWidth();
    const freeWidth = Math.max(0, freeSegment.right - freeSegment.left);
    if (freeWidth < 8) {
      this.showSlot.set(false);
      return;
    }
    const effectiveSlotWidth = Math.min(defaultSlotWidth, freeWidth);

    let slotL: number;
    if (freeWidth <= defaultSlotWidth) {
      // In tight spaces, shrink to exactly fill the available open segment.
      slotL = freeSegment.left;
    } else {
      slotL = Math.max(
        freeSegment.left,
        Math.min(freeSegment.right - effectiveSlotWidth, x - effectiveSlotWidth / 2),
      );
    }

    const tooltipWidth = this.getTooltipWidth();
    const tooltipHalf = tooltipWidth / 2;
    const slotCenter = slotL + effectiveSlotWidth / 2;
    const clampedTooltipCenter = Math.max(
      tooltipHalf,
      Math.min(this.totalWidth() - tooltipHalf, slotCenter),
    );

    this.slotLeft.set(slotL);
    this.slotWidth.set(effectiveSlotWidth);
    this.tooltipLeft.set(clampedTooltipCenter);
    this.showSlot.set(true);
  }

  onMouseLeave(): void {
    this.showSlot.set(false);
  }

  onRowClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('app-work-order-bar')) return;

    this.showSlot.set(false);

    const clickDate = this.calcService.pixelOffsetToDate(
      event.offsetX,
      this.dateRange(),
      this.zoom(),
    );
    clickDate.setHours(0, 0, 0, 0);

    // Find available gap around the click date
    const orders = this.workOrders();
    const sorted = [...orders].sort((a, b) =>
      isoToDate(a.data.startDate).getTime() - isoToDate(b.data.startDate).getTime()
    );

    let gapStart: Date | null = null;
    let gapEnd: Date | null = null;

    for (const o of sorted) {
      const oEnd = isoToDate(o.data.endDate);
      const nextDayAfterEnd = addDays(oEnd, 1);
      if (oEnd.getTime() <= clickDate.getTime()) {
        // New task should start the day after the previous task ends.
        if (!gapStart || nextDayAfterEnd.getTime() > gapStart.getTime()) {
          gapStart = nextDayAfterEnd;
        }
      }
      const oStart = isoToDate(o.data.startDate);
      if (oStart.getTime() > clickDate.getTime()) {
        // This order starts after click — it's a potential right boundary
        if (!gapEnd || oStart.getTime() < gapEnd.getTime()) {
          gapEnd = oStart;
        }
      }
    }

    // Constrain start/end to the available gap
    let start = clickDate;
    let end = addDays(clickDate, 7);

    if (gapStart && start.getTime() < gapStart.getTime()) {
      start = new Date(gapStart);
    }
    if (gapEnd && end.getTime() > gapEnd.getTime()) {
      end = new Date(gapEnd);
    }
    // Ensure end is after start (at least 1 day)
    if (end.getTime() <= start.getTime()) {
      end = addDays(start, 1);
    }

    const startDate = dateToIso(start);
    const endDate = dateToIso(end);

    this.panelState.openCreate(this.workCenter().docId, startDate, endDate);
  }

  private getFreeSegmentAtCursor(
    cursorX: number,
    orders: WorkOrderDocument[],
  ): { left: number; right: number } | null {
    const total = this.totalWidth();
    const bars = orders
      .map(o => this.calcService.getBarPosition(o.data.startDate, o.data.endDate, this.dateRange(), this.zoom()))
      .map(pos => ({ left: pos.left, right: pos.left + pos.width }))
      .sort((a, b) => a.left - b.left);

    let segmentStart = 0;
    let i = 0;
    while (i < bars.length) {
      const bar = bars[i];

      if (bar.right <= segmentStart) {
        i++;
        continue;
      }

      if (cursorX < bar.left) {
        return { left: segmentStart, right: bar.left };
      }

      if (cursorX > bar.left && cursorX < bar.right) {
        return null;
      }

      segmentStart = Math.max(segmentStart, bar.right);
      i++;

      // Merge contiguous/overlapping bars so gap detection is stable.
      while (i < bars.length && bars[i].left <= segmentStart) {
        if (cursorX > bars[i].left && cursorX < bars[i].right) {
          return null;
        }
        segmentStart = Math.max(segmentStart, bars[i].right);
        i++;
      }
    }

    if (cursorX >= segmentStart && cursorX <= total) {
      return { left: segmentStart, right: total };
    }

    return null;
  }

  private getTooltipWidth(): number {
    if (typeof window !== 'undefined' && window.innerWidth <= 480) {
      return 110;
    }
    return 130;
  }

  private getSlotWidth(): number {
    if (typeof window !== 'undefined' && window.innerWidth <= 480) {
      return 60;
    }
    return 113;
  }
}
