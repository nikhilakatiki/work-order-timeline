import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ZoomLevel, DateRange, COLUMN_WIDTHS } from '../../../../core/models/timeline.model';
import { formatDateLabel } from '../../../../shared/utils/date-helpers';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-timeline-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header" [style.min-width.px]="totalWidth()">
      <div class="header__row">
        @for (date of columnDates(); track $index) {
          <div
            class="header__cell"
            [style.width.px]="colWidth()"
            [class.header__cell--today]="isToday(date)"
            [class.header__cell--weekend]="isWeekend(date)"
            [class.header__cell--no-border]="zoom() === 'month'"
            [class.header__cell--clickable]="zoom() !== 'hour'"
            (click)="onCellClick(date)"
          >
            <span class="header__label">{{ formatLabel(date) }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .header {
      height: var(--header-height);
      background: var(--color-surface);
    }
    .header__row {
      display: flex;
      height: 100%;
    }
    .header__cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 clamp(2px, 0.5vw, 4px);
      font-family: "CircularStd-Regular", "Circular-Std", var(--font-family);
      font-size: clamp(12px, 1.8vw, 14px);
      font-weight: 500;
      color: rgba(104, 113, 150, 1);
      line-height: 17px;
      text-align: center;
      border-right: none;
      flex-shrink: 0;
      position: relative;
      flex-direction: column;
      gap: 2px;
    }
    .header__cell--today {
      color: rgba(104, 113, 150, 1);
      font-weight: 500;
    }
    .header__cell--weekend {
      background: rgba(0, 0, 0, 0.015);
    }
    .header__cell--no-border {
      border-right: none;
    }
    .header__cell--clickable {
      cursor: pointer;
    }
    .header__cell--clickable:hover {
      background: rgba(230, 232, 252, 0.4);
    }
    .header__label {
      font-size: clamp(12px, 1.8vw, 14px);
      line-height: 17px;
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .header__cell {
        font-size: 10px;
        padding: 0 2px;
      }
      .header__label {
        font-size: 10px;
        line-height: 14px;
      }
    }
  `],
})
export class TimelineHeaderComponent {
  readonly columnDates = input.required<Date[]>();
  readonly zoom = input.required<ZoomLevel>();
  readonly totalWidth = input.required<number>();
  readonly dateRange = input.required<DateRange>();
  readonly zoomIn = output<{ zoom: ZoomLevel; targetDate: Date }>();

  colWidth(): number {
    return COLUMN_WIDTHS[this.zoom()];
  }

  formatLabel(date: Date): string {
    if (this.zoom() === 'month') {
      return `${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (this.zoom() === 'hour') {
      const h = date.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}${ampm}`;
    }
    return formatDateLabel(date, this.zoom());
  }

  isToday(date: Date): boolean {
    const today = new Date();
    if (this.zoom() === 'hour') {
      return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate()
        && date.getHours() === today.getHours();
    }
    if (this.zoom() === 'day') {
      return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
    }
    if (this.zoom() === 'month') {
      return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth();
    }
    const weekEnd = new Date(date);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return today >= date && today <= weekEnd;
  }

  isCurrentPeriod(date: Date): boolean {
    return this.isToday(date);
  }

  currentPeriodLabel(): string {
    switch (this.zoom()) {
      case 'day': return 'Current day';
      case 'week': return 'Current week';
      case 'month': return 'Current month';
      case 'hour': return 'Current hour';
    }
  }

  onCellClick(date: Date): void {
    const current = this.zoom();
    if (current === 'month') {
      this.zoomIn.emit({ zoom: 'week', targetDate: date });
    } else if (current === 'week') {
      this.zoomIn.emit({ zoom: 'day', targetDate: date });
    } else if (current === 'day') {
      this.zoomIn.emit({ zoom: 'hour', targetDate: date });
    }
  }

  isWeekend(date: Date): boolean {
    if (this.zoom() !== 'day' && this.zoom() !== 'hour') return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  }
}
