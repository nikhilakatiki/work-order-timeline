import { Injectable, signal, computed, inject } from '@angular/core';
import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { SAMPLE_WORK_CENTERS, SAMPLE_WORK_ORDERS } from '../data/sample-data';
import { IndexedDbService } from './indexed-db.service';

/**
 * Central data store for work centers and work orders.
 * Uses Angular signals for reactive state and persists to IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class WorkOrderDataService {
  private readonly dbService = inject(IndexedDbService);

  private _workCenters = signal<WorkCenterDocument[]>([]);
  private _workOrders = signal<WorkOrderDocument[]>([]);
  /** Becomes true once the initial IndexedDB load completes */
  private _initialized = signal(false);

  readonly workCenters = this._workCenters.asReadonly();
  readonly workOrders = this._workOrders.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  /** Groups work orders by their workCenterId */
  readonly workOrdersByCenter = computed(() => {
    const map = new Map<string, WorkOrderDocument[]>();
    for (const wc of this._workCenters()) {
      map.set(wc.docId, []);
    }
    for (const wo of this._workOrders()) {
      const list = map.get(wo.data.workCenterId);
      if (list) {
        list.push(wo);
      }
    }
    return map;
  });

  constructor() {
    // Set sample data synchronously so UI renders immediately
    this._workCenters.set(SAMPLE_WORK_CENTERS);
    this._workOrders.set(SAMPLE_WORK_ORDERS);

    // Then load persisted data from IndexedDB (async, replaces sample data when ready)
    this.loadFromDb();
  }

  private async loadFromDb(): Promise<void> {
    try {
      await this.dbService.init();
      const { workCenters, workOrders } = await this.dbService.loadAll();
      this._workCenters.set(workCenters);
      this._workOrders.set(workOrders);
    } catch {
      // IndexedDB unavailable — keep sample data in signals (memory-only)
    } finally {
      this._initialized.set(true);
    }
  }

  private generateId(): string {
    return 'wo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /** Creates a new work order and persists to storage. Returns the created document. */
  addWorkOrder(orderData: WorkOrderDocument['data']): WorkOrderDocument {
    const newOrder: WorkOrderDocument = {
      docId: this.generateId(),
      docType: 'workOrder',
      data: { ...orderData },
    };
    this._workOrders.update(list => [...list, newOrder]);
    // Async persist — fire and forget
    this.dbService.saveWorkOrder(newOrder).catch(() => {});
    return newOrder;
  }

  /** Updates an existing work order by docId with partial data changes. */
  updateWorkOrder(docId: string, changes: Partial<WorkOrderDocument['data']>): void {
    let updatedOrder: WorkOrderDocument | undefined;
    this._workOrders.update(list =>
      list.map(wo => {
        if (wo.docId === docId) {
          updatedOrder = { ...wo, data: { ...wo.data, ...changes } };
          return updatedOrder;
        }
        return wo;
      })
    );
    if (updatedOrder) {
      this.dbService.saveWorkOrder(updatedOrder).catch(() => {});
    }
  }

  /** Removes a work order by docId and persists the change. */
  deleteWorkOrder(docId: string): void {
    this._workOrders.update(list => list.filter(wo => wo.docId !== docId));
    this.dbService.deleteWorkOrder(docId).catch(() => {});
  }

  /** Finds a work order by its docId. Returns undefined if not found. */
  getWorkOrder(docId: string): WorkOrderDocument | undefined {
    return this._workOrders().find(wo => wo.docId === docId);
  }
}
