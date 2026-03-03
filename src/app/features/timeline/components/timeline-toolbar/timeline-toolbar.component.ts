import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { ZoomLevel } from '../../../../core/models/timeline.model';

@Component({
  selector: 'app-timeline-toolbar',
  standalone: true,
  imports: [NgSelectModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <div class="toolbar__pill">
        <div class="toolbar__label-part">Timescale</div>
        <ng-select
          data-testid="zoom-select"
          class="toolbar-zoom-select"
          [items]="zoomOptions"
          bindLabel="label"
          bindValue="value"
          [ngModel]="zoom()"
          (ngModelChange)="onZoomSelect($event)"
          [clearable]="false"
          [searchable]="false"
        >
          <ng-template ng-label-tmp let-item="item">
            <span class="toolbar__value">{{ item.label }}</span>
          </ng-template>
          <ng-template ng-option-tmp let-item="item">
            {{ item.label }}
          </ng-template>
        </ng-select>
      </div>
      <div class="toolbar__right">
        <button type="button" data-testid="today-btn" class="toolbar__today-btn" (click)="scrollToToday.emit()">
          Today
        </button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: clamp(16px, 3vh, 25px);
      gap: var(--spacing-md);
      flex-shrink: 0;
    }

    .toolbar__pill {
      display: inline-flex;
      align-items: stretch;
      height: 25px;
      border-radius: 5px;
      box-shadow:
        0 1px 3px rgba(104, 113, 150, 0.08),
        0 2px 6px rgba(104, 113, 150, 0.06);
    }

    .toolbar__label-part {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 75px;
      height: 25px;
      border-radius: 5px 0 0 5px;
      background-color: rgba(241, 243, 248, 0.75);
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: 13px;
      font-weight: 400;
      color: rgba(104, 113, 150, 1);
      white-space: nowrap;
    }

    .toolbar__value {
      font-family: "CircularStd-Medium", "Circular-Std", var(--font-family);
      font-size: 13px;
      font-weight: 500;
      color: rgba(62, 64, 219, 1);
    }

    .toolbar__right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar__today-btn {
      padding: 7px clamp(12px, 2vw, 16px);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-family: var(--font-family);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
    }
    .toolbar__today-btn:hover {
      background: #f9fafb;
      border-color: var(--color-text-muted);
    }

    // Tablet adjustments
    @media (max-width: 768px) {
      .toolbar {
        flex-wrap: wrap;
      }
      .toolbar__pill,
      .toolbar__today-btn {
        min-height: 32px;
      }
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 12px;
      }
      .toolbar__pill {
        width: 100%;
        height: 44px;
        justify-content: space-between;
      }
      .toolbar__label-part {
        width: auto;
        height: 44px;
        padding: 0 16px;
        font-size: 14px;
      }
      .toolbar__right {
        width: 100%;
      }
      .toolbar__today-btn {
        width: 100%;
        height: 44px;
        font-size: 14px;
        justify-content: center;
        display: flex;
        align-items: center;
      }
    }
  `],
})
export class TimelineToolbarComponent {
  readonly zoom = input.required<ZoomLevel>();
  readonly zoomChange = output<ZoomLevel>();
  readonly scrollToToday = output<void>();

  readonly zoomOptions = [
    { label: 'Hour', value: 'hour' as ZoomLevel },
    { label: 'Day', value: 'day' as ZoomLevel },
    { label: 'Week', value: 'week' as ZoomLevel },
    { label: 'Month', value: 'month' as ZoomLevel },
  ];

  onZoomSelect(value: ZoomLevel): void {
    this.zoomChange.emit(value);
  }
}
