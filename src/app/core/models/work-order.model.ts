/** The four possible lifecycle states of a work order. */
export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

/** Document structure for a work order, following the docId/docType/data pattern. */
export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: {
    name: string;
    workCenterId: string;   // References WorkCenterDocument.docId
    status: WorkOrderStatus;
    startDate: string;      // ISO format YYYY-MM-DD
    endDate: string;        // ISO format YYYY-MM-DD
  };
}
