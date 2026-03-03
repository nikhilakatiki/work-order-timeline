import { Component, ChangeDetectionStrategy, input, inject, signal, output } from '@angular/core';
import { WorkOrderDataService } from '../../../../core/services/work-order-data.service';
import { PanelStateService } from '../../../../core/services/panel-state.service';

@Component({
  selector: 'app-work-order-actions-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actions" (click)="$event.stopPropagation()">
      <button data-testid="actions-menu-btn" class="actions__trigger" (click)="toggleMenu()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="8" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="13" cy="8" r="1.5"/>
        </svg>
      </button>
      @if (isMenuOpen()) {
        <div class="actions__menu" (click)="$event.stopPropagation()">
          <button data-testid="edit-action" class="actions__item" (click)="onEdit()">Edit</button>
          <button data-testid="delete-action" class="actions__item actions__item--delete" (click)="onDelete()">Delete</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .actions {
      position: relative;
    }
    .actions__trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      color: var(--color-text-secondary);
      opacity: 0.7;
      transition: all 120ms ease;
    }
    .actions__trigger:hover {
      background: rgba(0, 0, 0, 0.08);
      opacity: 1;
    }
    .actions__menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      width: 200px;
      height: 80px;
      background-color: rgba(255, 255, 255, 1);
      border: none;
      border-radius: 5px;
      box-shadow:
        0 0 0 1px rgba(104, 113, 150, 0.1),
        0 2.5px 3px -1.5px rgba(200, 207, 233, 1),
        0 4.5px 5px -1px rgba(216, 220, 235, 1);
      z-index: var(--z-actions-menu);
      padding: 12px 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .actions__item {
      display: flex;
      align-items: center;
      width: 200px;
      height: 28px;
      padding: 0 16px;
      border: none;
      background: transparent;
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: 14px;
      font-weight: 400;
      color: rgba(47, 48, 89, 1);
      cursor: pointer;
      text-align: left;
      line-height: 18px;
      transition: background 100ms ease;
    }
    .actions__item:hover {
      background-color: rgba(241, 243, 248, 1);
    }
    .actions__item--delete {
      width: 150px;
      height: 18px;
      color: rgba(62, 64, 219, 1);
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: 14px;
      font-weight: 400;
      font-style: normal;
    }
  `],
  host: {
    '(document:click)': 'closeMenu()',
  },
})
export class WorkOrderActionsMenuComponent {
  /** Singleton pattern: tracks the currently open menu so only one is visible at a time. */
  private static openInstance: WorkOrderActionsMenuComponent | null = null;

  readonly workOrderId = input.required<string>();

  private readonly dataService = inject(WorkOrderDataService);
  private readonly panelState = inject(PanelStateService);

  readonly isMenuOpen = signal(false);
  readonly menuOpenChange = output<boolean>();

  toggleMenu(): void {
    if (this.isMenuOpen()) {
      this.close();
    } else {
      // Close any other open menu first
      if (WorkOrderActionsMenuComponent.openInstance && WorkOrderActionsMenuComponent.openInstance !== this) {
        WorkOrderActionsMenuComponent.openInstance.close();
      }
      this.isMenuOpen.set(true);
      this.menuOpenChange.emit(true);
      WorkOrderActionsMenuComponent.openInstance = this;
    }
  }

  private close(): void {
    this.isMenuOpen.set(false);
    this.menuOpenChange.emit(false);
    if (WorkOrderActionsMenuComponent.openInstance === this) {
      WorkOrderActionsMenuComponent.openInstance = null;
    }
  }

  closeMenu(): void {
    if (this.isMenuOpen()) {
      this.close();
    }
  }

  onEdit(): void {
    this.close();
    this.panelState.openEdit(this.workOrderId());
  }

  onDelete(): void {
    this.close();
    this.dataService.deleteWorkOrder(this.workOrderId());
  }
}
