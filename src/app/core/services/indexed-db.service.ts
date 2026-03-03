import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { SAMPLE_WORK_CENTERS, SAMPLE_WORK_ORDERS, SAMPLE_DATA_VERSION } from '../data/sample-data';

const DB_NAME = 'wo-timeline-db';
const LS_VERSION_KEY = 'wo-sample-data-version';
const LS_SEED_DATE_KEY = 'wo-sample-seed-date';

interface WoTimelineDB extends DBSchema {
  workCenters: {
    key: string;
    value: WorkCenterDocument;
  };
  workOrders: {
    key: string;
    value: WorkOrderDocument;
    indexes: { 'by-center': string };
  };
}

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private db!: IDBPDatabase<WoTimelineDB>;
  private needsReseed = false;

  async init(): Promise<void> {
    // Check if we need to reseed before opening the DB
    // Reseed if version changed OR if the seed date isn't today
    // (sample data uses new Date() so dates must be regenerated daily)
    const storedVersion = localStorage.getItem(LS_VERSION_KEY);
    const seedDate = localStorage.getItem(LS_SEED_DATE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    this.needsReseed = storedVersion !== String(SAMPLE_DATA_VERSION) || seedDate !== today;

    // If version changed, delete the entire DB first to avoid blocked upgrades
    if (this.needsReseed) {
      await this.deleteDatabase();
    }

    this.db = await openDB<WoTimelineDB>(DB_NAME, SAMPLE_DATA_VERSION, {
      upgrade(db) {
        // Clear old stores on version bump
        if (db.objectStoreNames.contains('workCenters')) {
          db.deleteObjectStore('workCenters');
        }
        if (db.objectStoreNames.contains('workOrders')) {
          db.deleteObjectStore('workOrders');
        }

        db.createObjectStore('workCenters', { keyPath: 'docId' });
        const orderStore = db.createObjectStore('workOrders', { keyPath: 'docId' });
        orderStore.createIndex('by-center', 'data.workCenterId');
      },
      blocked() {
        // Old connection is blocking — we already deleted the DB above,
        // so this should rarely happen. Just let it proceed.
      },
    });
  }

  async loadAll(): Promise<{
    workCenters: WorkCenterDocument[];
    workOrders: WorkOrderDocument[];
  }> {
    const today = new Date().toISOString().slice(0, 10);

    // If version changed or seed date isn't today, reseed with fresh sample data
    if (this.needsReseed) {
      await this.resetToSample();
      localStorage.setItem(LS_VERSION_KEY, String(SAMPLE_DATA_VERSION));
      localStorage.setItem(LS_SEED_DATE_KEY, today);
      return { workCenters: SAMPLE_WORK_CENTERS, workOrders: SAMPLE_WORK_ORDERS };
    }

    const workCenters = await this.db.getAll('workCenters');
    const workOrders = await this.db.getAll('workOrders');

    if (workCenters.length === 0 && workOrders.length === 0) {
      // No data — seed with sample data
      await this.resetToSample();
      localStorage.setItem(LS_VERSION_KEY, String(SAMPLE_DATA_VERSION));
      localStorage.setItem(LS_SEED_DATE_KEY, today);
      return { workCenters: SAMPLE_WORK_CENTERS, workOrders: SAMPLE_WORK_ORDERS };
    }

    return { workCenters, workOrders };
  }

  async saveWorkOrder(order: WorkOrderDocument): Promise<void> {
    await this.db.put('workOrders', order);
  }

  async deleteWorkOrder(docId: string): Promise<void> {
    await this.db.delete('workOrders', docId);
  }

  async resetToSample(): Promise<void> {
    const tx = this.db.transaction(['workCenters', 'workOrders'], 'readwrite');
    const centerStore = tx.objectStore('workCenters');
    const orderStore = tx.objectStore('workOrders');

    await centerStore.clear();
    await orderStore.clear();

    for (const wc of SAMPLE_WORK_CENTERS) {
      await centerStore.put(wc);
    }
    for (const wo of SAMPLE_WORK_ORDERS) {
      await orderStore.put(wo);
    }

    await tx.done;
  }

  /** Delete the entire database. Handles the blocked case with a timeout. */
  private deleteDatabase(): Promise<void> {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      const timeout = setTimeout(() => resolve(), 3000); // Don't hang longer than 3s
      req.onsuccess = () => { clearTimeout(timeout); resolve(); };
      req.onerror = () => { clearTimeout(timeout); resolve(); };
      req.onblocked = () => { clearTimeout(timeout); resolve(); }; // Proceed even if blocked
    });
  }
}
