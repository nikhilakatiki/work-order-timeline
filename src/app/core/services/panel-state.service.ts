import { Injectable, signal, computed } from '@angular/core';

export interface PanelPrefillData {
  workCenterId: string;
  startDate: string;
  endDate: string;
}

/**
 * Manages the slide-in panel UI state for creating and editing work orders.
 * Tracks open/close state, mode (create/edit), and pre-fill data.
 */
@Injectable({ providedIn: 'root' })
export class PanelStateService {
  private _isOpen = signal(false);
  private _mode = signal<'create' | 'edit'>('create');
  private _editingWorkOrderId = signal<string | null>(null);
  private _prefillData = signal<PanelPrefillData | null>(null);

  readonly isOpen = this._isOpen.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly editingWorkOrderId = this._editingWorkOrderId.asReadonly();
  readonly prefillData = this._prefillData.asReadonly();

  readonly isCreateMode = computed(() => this._mode() === 'create');
  readonly isEditMode = computed(() => this._mode() === 'edit');

  /** Opens the panel in create mode with pre-filled work center and date range. */
  openCreate(centerId: string, startDate: string, endDate: string): void {
    this._mode.set('create');
    this._editingWorkOrderId.set(null);
    this._prefillData.set({ workCenterId: centerId, startDate, endDate });
    this._isOpen.set(true);
  }

  /** Opens the panel in edit mode, loading the specified work order's data. */
  openEdit(workOrderId: string): void {
    this._mode.set('edit');
    this._editingWorkOrderId.set(workOrderId);
    this._prefillData.set(null);
    this._isOpen.set(true);
  }

  /** Closes the panel and resets all state. */
  close(): void {
    this._isOpen.set(false);
    this._editingWorkOrderId.set(null);
    this._prefillData.set(null);
  }
}
