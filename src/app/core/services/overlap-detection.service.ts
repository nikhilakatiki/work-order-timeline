import { Injectable, inject } from '@angular/core';
import { WorkOrderDataService } from './work-order-data.service';
import { isoToDate } from '../../shared/utils/date-helpers';

export type OverlapResult = 'start' | 'end' | 'both' | null;

/**
 * Validates that new or updated work orders don't conflict with existing
 * orders on the same work center. Uses the interval overlap formula:
 * existingStart < newEnd && newStart < existingEnd
 */
@Injectable({ providedIn: 'root' })
export class OverlapDetectionService {
  private dataService = inject(WorkOrderDataService);

  /**
   * Checks if the given date range overlaps with any existing order on the same work center.
   * @returns true if an overlap exists
   */
  hasOverlap(centerId: string, startDate: string, endDate: string, excludeDocId?: string): boolean {
    return this.getOverlapType(centerId, startDate, endDate, excludeDocId) !== null;
  }

  /**
   * Determines which date(s) cause the overlap with existing orders.
   * @returns 'start' | 'end' | 'both' | null
   */
  getOverlapType(centerId: string, startDate: string, endDate: string, excludeDocId?: string): OverlapResult {
    const newStart = isoToDate(startDate).getTime();
    const newEnd = isoToDate(endDate).getTime();
    const orders = this.dataService.workOrders();

    let startOverlaps = false;
    let endOverlaps = false;

    for (const wo of orders) {
      if (wo.data.workCenterId !== centerId) continue;
      if (excludeDocId && wo.docId === excludeDocId) continue;

      const existingStart = isoToDate(wo.data.startDate).getTime();
      const existingEnd = isoToDate(wo.data.endDate).getTime();

      if (!(existingStart < newEnd && newStart < existingEnd)) continue;

      // Start date falls inside an existing order's range
      if (newStart >= existingStart && newStart < existingEnd) startOverlaps = true;
      // End date falls inside an existing order's range
      if (newEnd > existingStart && newEnd <= existingEnd) endOverlaps = true;
      // New order wraps around the existing order entirely
      if (newStart <= existingStart && newEnd >= existingEnd) { startOverlaps = true; endOverlaps = true; }

      if (startOverlaps && endOverlaps) break;
    }

    if (startOverlaps && endOverlaps) return 'both';
    if (startOverlaps) return 'start';
    if (endOverlaps) return 'end';
    return null;
  }
}
