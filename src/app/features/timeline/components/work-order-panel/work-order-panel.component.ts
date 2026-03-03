import {
  Component, ChangeDetectionStrategy, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDatepickerModule, NgbDateStruct, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { trigger, transition, style, animate } from '@angular/animations';
import { CustomDateFormatter } from '../../../../shared/utils/custom-date-formatter';
import { PanelStateService } from '../../../../core/services/panel-state.service';
import { WorkOrderDataService } from '../../../../core/services/work-order-data.service';
import { OverlapDetectionService } from '../../../../core/services/overlap-detection.service';
import { WorkOrderStatus } from '../../../../core/models/work-order.model';

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  providers: [{ provide: NgbDateParserFormatter, useClass: CustomDateFormatter }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
  template: `
    <div class="panel-backdrop" (click)="onClose()"></div>
    <div data-testid="panel" class="panel" @slideIn>
      <div class="panel__header">
        <div class="panel__header-left">
          <h2 class="panel__title">Work Order Details</h2>
          <p class="panel__subtitle">Specify the dates, name and status for this order</p>
        </div>
        <div class="panel__header-right">
          <button data-testid="panel-cancel-btn" type="button" class="panel__cancel-btn" (click)="onClose()">Cancel</button>
          <button
            data-testid="panel-submit-btn"
            type="button"
            class="panel__submit-btn"
            [disabled]="isSubmitDisabled()"
            (click)="onSubmit()"
          >
            {{ panelState.isCreateMode() ? 'Create' : 'Save' }}
          </button>
        </div>
      </div>

      <div class="panel__divider"></div>
      <form class="panel__form" [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Work Order Name -->
        <div class="field">
          <label class="field__label">Work Order Name</label>
          <input
            data-testid="panel-name-input"
            class="field__input"
            formControlName="name"
            placeholder="Acme Inc."
          >
          @if (form.get('name')?.touched && form.get('name')?.hasError('required')) {
            <span class="field__error">Name is required</span>
          }
          @if (form.get('name')?.touched && form.get('name')?.hasError('minlength')) {
            <span class="field__error">Name must be at least 2 characters</span>
          }
        </div>

        <!-- Status -->
        <div class="field">
          <label class="field__label">Status</label>
          <ng-select
            data-testid="panel-status-select"
            class="panel-select"
            formControlName="status"
            [items]="statusOptions"
            bindLabel="label"
            bindValue="value"
            [clearable]="false"
            [searchable]="false"
            placeholder="Select status"
          >
            <ng-template ng-label-tmp let-item="item">
              <span class="status-badge status-badge--{{ item.value }}">{{ item.label }}</span>
            </ng-template>
            <ng-template ng-option-tmp let-item="item">
              {{ item.label }}
            </ng-template>
          </ng-select>
        </div>

        <!-- End Date -->
        <div class="field">
          <label class="field__label">End date</label>
          <div class="field__datepicker-wrap">
            <input
              class="field__input"
              formControlName="endDate"
              ngbDatepicker
              #endDp="ngbDatepicker"
              container="body"
              placeholder="01.01.2026"
              [readonly]="true"
              (click)="endDp.toggle()"
            >
            <button type="button" class="field__calendar-btn" (click)="endDp.toggle()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="rgba(104,113,150,1)" stroke-width="1.2"/>
                <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="rgba(104,113,150,1)" stroke-width="1.2"/>
                <line x1="5" y1="1" x2="5" y2="4" stroke="rgba(104,113,150,1)" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="11" y1="1" x2="11" y2="4" stroke="rgba(104,113,150,1)" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          @if (form.get('endDate')?.touched && form.get('endDate')?.hasError('required')) {
            <span class="field__error">End date is required</span>
          }
        </div>

        <!-- Start Date -->
        <div class="field">
          <label class="field__label">Start date</label>
          <div class="field__datepicker-wrap">
            <input
              class="field__input"
              formControlName="startDate"
              ngbDatepicker
              #startDp="ngbDatepicker"
              container="body"
              placeholder="01.01.2026"
              [readonly]="true"
              (click)="startDp.toggle()"
            >
            <button type="button" class="field__calendar-btn" (click)="startDp.toggle()">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="rgba(104,113,150,1)" stroke-width="1.2"/>
                <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="rgba(104,113,150,1)" stroke-width="1.2"/>
                <line x1="5" y1="1" x2="5" y2="4" stroke="rgba(104,113,150,1)" stroke-width="1.2" stroke-linecap="round"/>
                <line x1="11" y1="1" x2="11" y2="4" stroke="rgba(104,113,150,1)" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          @if (form.get('startDate')?.touched && form.get('startDate')?.hasError('required')) {
            <span class="field__error">Start date is required</span>
          }
        </div>

        <!-- Errors -->
        @if (form.hasError('dateOrder')) {
          <div class="panel__error">End date must be after start date</div>
        }
        @if (overlapError()) {
          <div class="panel__error">This work order overlaps with an existing order on the same work center</div>
        }
      </form>
    </div>
  `,
  styles: [`
    .panel-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(247, 249, 252, 0.5);
      z-index: var(--z-panel-backdrop);
    }
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: var(--work-order-panel-width);
      height: 100vh;
      max-width: 100vw;
      background-color: rgba(255, 255, 255, 1);
      box-shadow:
        0 5px 15px 0 rgba(216, 220, 235, 1),
        0 2.5px 3px -1.5px rgba(200, 207, 233, 1),
        0 4.5px 5px -1px rgba(216, 220, 235, 1);
      border-radius: 12px 0 0 12px;
      z-index: var(--z-panel);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: clamp(12px, 2vh, 16px) clamp(16px, 3vw, 24px);
      flex-shrink: 0;
    }
    .panel__header-left {
      flex: 1;
    }
    .panel__header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .panel__title {
      font-size: clamp(18px, 2.5vw, 20px);
      font-weight: 700;
      color: var(--color-text);
      margin: 0;
      letter-spacing: -0.2px;
    }
    .panel__subtitle {
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: clamp(14px, 2vw, 16px);
      font-weight: 400;
      color: rgba(104, 113, 150, 1);
      margin: 4px 0 0;
    }
    .panel__cancel-btn {
      width: 66px;
      height: 32px;
      border: none;
      background-color: rgba(255, 255, 255, 1);
      box-shadow:
        0 0 0 1px rgba(200, 207, 233, 0.4),
        0 1px 3px 0 rgba(200, 207, 233, 1);
      border-radius: 7px;
      font-family: "CircularStd-Book", "Circular-Std", var(--font-family);
      font-size: 14px;
      font-weight: 400;
      color: rgba(47, 48, 89, 1);
      cursor: pointer;
      transition: background 150ms ease;
    }
    .panel__cancel-btn:hover {
      background-color: rgba(241, 243, 248, 1);
    }
    .panel__submit-btn {
      padding: 7px 20px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      font-family: var(--font-family);
      font-size: 13px;
      font-weight: 600;
      color: white;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .panel__submit-btn:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
    .panel__submit-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .panel__divider {
      width: 100%;
      height: 1px;
      background-color: rgba(230, 235, 240, 1);
      flex-shrink: 0;
    }
    .panel__form {
      padding: clamp(16px, 3vh, 20px) clamp(16px, 3vw, 24px) clamp(20px, 4vh, 28px);
      display: flex;
      flex-direction: column;
      gap: clamp(16px, 3vh, 20px);
      flex: 1;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .field__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .field__input {
      width: 100%;
      max-width: 100%;
      height: 38px;
      padding: 0 14px;
      border: 1px solid rgba(216, 220, 235, 1);
      border-radius: 5px;
      background-color: rgba(255, 255, 255, 1);
      -webkit-appearance: none;
      box-shadow:
        0 1.5px 3px -1.5px rgba(200, 207, 233, 1),
        0 1px 0.5px -1px rgba(216, 220, 235, 1);
      font-family: var(--font-family);
      font-size: 14px;
      color: var(--color-text);
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .field__input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(74, 80, 200, 0.12);
    }
    .field__input::placeholder {
      color: var(--color-text-muted);
    }
    .field__datepicker-wrap {
      position: relative;
      width: 100%;
      max-width: 100%;
    }
    .field__datepicker-wrap .field__input {
      width: 100%;
      cursor: pointer;
    }
    .field__calendar-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      opacity: 0.6;
      transition: opacity 150ms ease;
    }
    .field__calendar-btn:hover {
      opacity: 1;
    }
    .field__error {
      font-size: 12px;
      color: var(--color-danger);
    }
    .panel__error {
      padding: 10px 14px;
      background: var(--color-danger-light);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: var(--radius-md);
      color: var(--color-danger);
      font-size: 13px;
    }
    // Tablet portrait
    @media (max-width: 1023px) {
      .panel {
        border-radius: 0;
      }
    }

    // Mobile
    @media (max-width: 480px) {
      .panel {
        width: 100vw;
      }
      .panel__header {
        flex-direction: column;
        align-items: flex-start;
        padding: 12px 16px;
        gap: 12px;
      }
      .panel__header-left {
        width: 100%;
      }
      .panel__header-right {
        width: 100%;
        justify-content: flex-end;
        margin-top: 0;
      }
      .panel__title {
        font-size: 18px;
      }
      .panel__subtitle {
        font-size: 14px;
      }
      .panel__cancel-btn {
        height: 44px;
        flex: 1;
        font-size: 15px;
      }
      .panel__submit-btn {
        height: 44px;
        flex: 1;
        font-size: 15px;
        padding: 0 24px;
      }
      .panel__form {
        padding: 16px;
        gap: 16px;
      }
      .field__label {
        font-size: 14px;
        font-weight: 600;
      }
      .field__input {
        height: 44px;
        font-size: 16px;
        padding: 0 16px;
      }
      .field__datepicker-wrap .field__input {
        height: 44px;
        font-size: 16px;
      }
      .field__calendar-btn {
        right: 16px;
      }
    }
  `],
})
export class WorkOrderPanelComponent implements OnInit {
  readonly panelState = inject(PanelStateService);
  private readonly dataService = inject(WorkOrderDataService);
  private readonly overlapService = inject(OverlapDetectionService);
  private readonly fb = inject(FormBuilder);

  readonly overlapError = signal(false);
  private initialFormSnapshot = '';

  readonly statusOptions: { label: string; value: WorkOrderStatus }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In progress', value: 'in-progress' },
    { label: 'Complete', value: 'complete' },
    { label: 'Blocked', value: 'blocked' },
  ];

  /** Reactive form with typed controls for work order create/edit. */
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      status: ['open' as WorkOrderStatus, Validators.required],
      workCenterId: ['', Validators.required],
      startDate: [null as NgbDateStruct | null, Validators.required],
      endDate: [null as NgbDateStruct | null, Validators.required],
    }, { validators: [this.dateOrderValidator] });

    // Live overlap detection on every form change
    this.form.valueChanges.subscribe(() => this.checkOverlap());

    if (this.panelState.isEditMode()) {
      const orderId = this.panelState.editingWorkOrderId();
      if (orderId) {
        const order = this.dataService.getWorkOrder(orderId);
        if (order) {
          this.form.patchValue({
            name: order.data.name,
            status: order.data.status,
            workCenterId: order.data.workCenterId,
            startDate: this.isoToNgb(order.data.startDate),
            endDate: this.isoToNgb(order.data.endDate),
          });
          this.initialFormSnapshot = JSON.stringify(this.form.value);
        }
      }
    } else {
      const prefill = this.panelState.prefillData();
      if (prefill) {
        this.form.patchValue({
          workCenterId: prefill.workCenterId,
          startDate: this.isoToNgb(prefill.startDate),
          endDate: this.isoToNgb(prefill.endDate),
        });
      }
    }
  }

  /** Convert YYYY-MM-DD to NgbDateStruct */
  private isoToNgb(iso: string): NgbDateStruct {
    const [year, month, day] = iso.split('-').map(Number);
    return { year, month, day };
  }

  /** Convert NgbDateStruct to YYYY-MM-DD */
  private ngbToIso(d: NgbDateStruct): string {
    return `${d.year}-${d.month.toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
  }

  /** Cross-field validator: end date must be after start date */
  private dateOrderValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value as NgbDateStruct | null;
    const end = group.get('endDate')?.value as NgbDateStruct | null;
    if (!start || !end) return null;

    const startDate = new Date(start.year, start.month - 1, start.day);
    const endDate = new Date(end.year, end.month - 1, end.day);

    if (endDate <= startDate) {
      return { dateOrder: true };
    }
    return null;
  }

  /** Live overlap check against existing work orders */
  private checkOverlap(): void {
    const val = this.form.value;
    if (!val.workCenterId || !val.startDate || !val.endDate) {
      this.overlapError.set(false);
      return;
    }
    try {
      const startIso = this.ngbToIso(val.startDate);
      const endIso = this.ngbToIso(val.endDate);
      const excludeId = this.panelState.isEditMode() ? this.panelState.editingWorkOrderId() ?? undefined : undefined;
      this.overlapError.set(this.overlapService.hasOverlap(val.workCenterId, startIso, endIso, excludeId));
    } catch {
      this.overlapError.set(false);
    }
  }

  isSubmitDisabled(): boolean {
    if (this.form.invalid) return true;
    if (this.overlapError()) return true;
    if (this.panelState.isEditMode()) {
      return JSON.stringify(this.form.value) === this.initialFormSnapshot;
    }
    return false;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const val = this.form.value;

    const startIso = this.ngbToIso(val.startDate);
    const endIso = this.ngbToIso(val.endDate);

    const excludeId = this.panelState.isEditMode() ? this.panelState.editingWorkOrderId() ?? undefined : undefined;
    if (this.overlapService.hasOverlap(val.workCenterId, startIso, endIso, excludeId)) {
      this.overlapError.set(true);
      return;
    }
    this.overlapError.set(false);

    if (this.panelState.isEditMode()) {
      const orderId = this.panelState.editingWorkOrderId();
      if (orderId) {
        this.dataService.updateWorkOrder(orderId, {
          name: val.name, status: val.status, workCenterId: val.workCenterId,
          startDate: startIso, endDate: endIso,
        });
      }
    } else {
      this.dataService.addWorkOrder({
        name: val.name, status: val.status, workCenterId: val.workCenterId,
        startDate: startIso, endDate: endIso,
      });
    }
    this.panelState.close();
  }

  onClose(): void {
    this.panelState.close();
  }
}
