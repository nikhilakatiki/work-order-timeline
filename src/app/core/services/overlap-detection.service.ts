import { Injectable, inject } from '@angular/core';
import { WorkOrderDataService } from './work-order-data.service';
import { isoToDate } from '../../shared/utils/date-helpers';

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
   * @param centerId   - The work center to check against
   * @param startDate  - ISO start date (YYYY-MM-DD)
   * @param endDate    - ISO end date (YYYY-MM-DD)
   * @param excludeDocId - Optional order ID to exclude (for edit mode)
   * @returns true if an overlap exists
   */
  hasOverlap(centerId: string, startDate: string, endDate: string, excludeDocId?: string): boolean {
    const newStart = isoToDate(startDate).getTime();
    const newEnd = isoToDate(endDate).getTime();
    const orders = this.dataService.workOrders();

    return orders.some(wo => {
      if (wo.data.workCenterId !== centerId) return false;
      if (excludeDocId && wo.docId === excludeDocId) return false;

      const existingStart = isoToDate(wo.data.startDate).getTime();
      const existingEnd = isoToDate(wo.data.endDate).getTime();

      return existingStart < newEnd && newStart < existingEnd;
    });
  }
}
