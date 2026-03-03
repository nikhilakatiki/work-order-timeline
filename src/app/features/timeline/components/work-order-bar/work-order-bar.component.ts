import { Component, ChangeDetectionStrategy, input, inject, computed, signal } from '@angular/core';
import { WorkOrderDocument } from '../../../../core/models/work-order.model';
import { ZoomLevel, DateRange } from '../../../../core/models/timeline.model';
import { TimelineCalculationService } from '../../../../core/services/timeline-calculation.service';
import { StatusLabelPipe } from '../../../../shared/pipes/status-label.pipe';
import { WorkOrderActionsMenuComponent } from '../work-order-actions-menu/work-order-actions-menu.component';

type BarContentMode = 'full' | 'name-only' | 'short-id' | 'tiny';

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [StatusLabelPipe, WorkOrderActionsMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-testid="work-order-bar"
      class="bar bar--{{ workOrder().data.status }}"
      [class.bar--menu-open]="menuOpen()"
      [class.bar--name-only]="contentMode() === 'name-only'"
      [class.bar--short-id]="contentMode() === 'short-id'"
      [class.bar--tiny]="contentMode() === 'tiny'"
      [style.left.px]="position().left"
      [style.width.px]="position().width"
      [attr.title]="tooltipText()"
      (click)="$event.stopPropagation()"
    >
      <span class="bar__label">{{ labelText() }}</span>
      @if (showStatus()) {
        <span class="bar__status status-badge status-badge--{{ workOrder().data.status }}">
          {{ workOrder().data.status | statusLabel }}
        </span>
      }
      <app-work-order-actions-menu
        class="bar__actions"
        [class.bar__actions--floating]="contentMode() === 'short-id' || contentMode() === 'tiny'"
        [workOrderId]="workOrder().docId"
        (menuOpenChange)="menuOpen.set($event)"
      />
    </div>
  `,
  styles: [`
    .bar {
      position: absolute;
      top: 5px;
      height: clamp(32px, 5vh, 38px);
      border-radius: clamp(6px, 1vw, 8px);
      display: flex;
      align-items: center;
      padding: 0 clamp(8px, 1.5vw, 12px);
      gap: clamp(4px, 1vw, 8px);
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease;
      overflow: visible;
      white-space: nowrap;
      color: var(--color-text);
      z-index: var(--z-bar);
      /* Default style */
      background-color: #edeef2;
      box-shadow: 0 0 0 1px #dddfe5;
    }
    .bar--menu-open {
      z-index: var(--z-actions-menu) !important;
    }
    .bar:hover {
      transform: translateY(-1px);
    }
    .bar:hover .bar__actions,
    .bar--menu-open .bar__actions {
      opacity: 1;
    }
    /* Complete */
    .bar--complete {
      background-color: rgba(248, 255, 243, 1);
      box-shadow: 0 0 0 1px rgba(209, 250, 179, 1);
    }
    /* Open */
    .bar--open {
      background-color: #eff6ff;
      box-shadow: 0 0 0 1px #bfdbfe;
    }
    /* In Progress */
    .bar--in-progress {
      background-color: rgba(237, 238, 255, 1);
      box-shadow: 0 0 0 1px rgba(222, 224, 255, 1);
    }
    /* Blocked */
    .bar--blocked {
      background-color: rgba(255, 252, 241, 1);
      box-shadow: 0 0 0 1px rgba(255, 245, 207, 1);
    }
    .bar__label {
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: clamp(12px, 1.8vw, 14px);
      font-weight: 400;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
      color: var(--color-text);
    }
    .bar--name-only .bar__label,
    .bar--short-id .bar__label {
      max-width: 100%;
    }
    .bar--short-id .bar__label {
      font-size: 13px;
      max-width: calc(100% - 30px);
    }
    .bar--tiny .bar__label {
      font-size: 12px;
      font-weight: 500;
      max-width: 100%;
    }
    .bar--short-id {
      padding-right: 34px;
    }
    .bar--tiny {
      padding: 0 8px;
      gap: 4px;
    }
    .bar__status {
      flex-shrink: 0;
    }
    .bar--name-only .bar__status,
    .bar--short-id .bar__status {
      display: none;
    }
    .bar__actions {
      opacity: 0;
      transition: opacity 150ms ease;
      flex-shrink: 0;
    }
    .bar__actions--floating {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
    }
    .bar:hover .bar__actions--floating,
    .bar--menu-open .bar__actions--floating {
      opacity: 1;
    }

    // Touch device adjustments
    @media (hover: none) {
      .bar__actions {
        opacity: 1;
      }
      .bar:hover {
        transform: none;
      }
      .bar:active {
        transform: translateY(-1px);
      }
    }

    // Mobile adjustments
    @media (max-width: 480px) {
      .bar {
        height: 32px;
        border-radius: 6px;
        padding: 0 8px;
        gap: 4px;
        top: 4px;
      }
      .bar__label {
        font-size: 11px;
      }
      .bar--short-id .bar__label {
        font-size: 10px;
      }
      .bar--tiny .bar__label {
        font-size: 10px;
      }
      .bar--tiny {
        padding: 0 6px;
        gap: 2px;
      }
      .bar__status {
        font-size: 11px;
        height: 18px;
        padding: 0 6px;
      }
      .bar__actions--floating {
        right: 4px;
      }
    }
  `],
})
export class WorkOrderBarComponent {
  readonly menuOpen = signal(false);
  readonly workOrder = input.required<WorkOrderDocument>();
  readonly dateRange = input.required<DateRange>();
  readonly zoom = input.required<ZoomLevel>();

  private readonly calcService = inject(TimelineCalculationService);

  readonly position = computed(() =>
    this.calcService.getBarPosition(
      this.workOrder().data.startDate,
      this.workOrder().data.endDate,
      this.dateRange(),
      this.zoom(),
    )
  );

  readonly contentMode = computed<BarContentMode>(() => {
    const width = this.position().width;
    if (width >= 170) return 'full';
    if (width >= 110) return 'name-only';
    if (width >= 72) return 'short-id';
    return 'tiny';
  });

  readonly showStatus = computed(() => this.contentMode() === 'full');

  readonly labelText = computed(() => {
    const mode = this.contentMode();
    const name = this.workOrder().data.name;
    if (mode === 'full' || mode === 'name-only') return name;
    if (mode === 'tiny') return this.tinyLabel(name);
    return this.shortId(name);
  });

  readonly tooltipText = computed(() => {
    const name = this.workOrder().data.name;
    const status = this.workOrder().data.status.replace('-', ' ');
    return `${name} · ${status}`;
  });

  private shortId(name: string): string {
    const token = name.match(/[A-Za-z]{2,5}-\d{2,}/);
    if (token) return token[0];
    if (name.length <= 10) return name;
    return `${name.slice(0, 9)}...`;
  }

  private tinyLabel(name: string): string {
    const words = name
      .trim()
      .split(/[\s\-_]+/)
      .filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
    }
    const compact = name.replace(/[\s\-_]+/g, '');
    return compact.slice(0, 2).toUpperCase();
  }
}
