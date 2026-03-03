import { TestBed } from '@angular/core/testing';
import { WorkOrderDataService } from './work-order-data.service';
import { IndexedDbService } from './indexed-db.service';
import { WorkOrderDocument } from '../models/work-order.model';

describe('WorkOrderDataService', () => {
  let service: WorkOrderDataService;
  let mockDbService: jasmine.SpyObj<IndexedDbService>;

  beforeEach(() => {
    // Create mock IndexedDB service
    mockDbService = jasmine.createSpyObj('IndexedDbService', [
      'init',
      'loadAll',
      'saveWorkOrder',
      'deleteWorkOrder',
    ]);

    // Setup default mock responses
    mockDbService.init.and.returnValue(Promise.resolve());
    mockDbService.loadAll.and.returnValue(Promise.resolve({
      workCenters: [],
      workOrders: [],
    }));
    mockDbService.saveWorkOrder.and.returnValue(Promise.resolve());
    mockDbService.deleteWorkOrder.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        WorkOrderDataService,
        { provide: IndexedDbService, useValue: mockDbService },
      ],
    });

    service = TestBed.inject(WorkOrderDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load sample data on initialization', () => {
    expect(service.workCenters().length).toBeGreaterThan(0);
    expect(service.workOrders().length).toBeGreaterThan(0);
  });

  describe('addWorkOrder', () => {
    it('should add a new work order', () => {
      const initialCount = service.workOrders().length;
      const orderData: WorkOrderDocument['data'] = {
        name: 'New Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);

      expect(newOrder.docId).toBeTruthy();
      expect(newOrder.docType).toBe('workOrder');
      expect(newOrder.data).toEqual(orderData);
      expect(service.workOrders().length).toBe(initialCount + 1);
    });

    it('should generate unique IDs for work orders', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const order1 = service.addWorkOrder(orderData);
      const order2 = service.addWorkOrder(orderData);

      expect(order1.docId).not.toBe(order2.docId);
    });

    it('should persist new work order to IndexedDB', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);

      // Give async operation time to complete
      setTimeout(() => {
        expect(mockDbService.saveWorkOrder).toHaveBeenCalledWith(jasmine.objectContaining({
          docId: newOrder.docId,
          data: orderData,
        }));
      }, 100);
    });
  });

  describe('updateWorkOrder', () => {
    it('should update an existing work order', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Original Name',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);
      const changes: Partial<WorkOrderDocument['data']> = {
        name: 'Updated Name',
        status: 'in-progress',
      };

      service.updateWorkOrder(newOrder.docId, changes);

      const updatedOrder = service.getWorkOrder(newOrder.docId);
      expect(updatedOrder?.data.name).toBe('Updated Name');
      expect(updatedOrder?.data.status).toBe('in-progress');
      expect(updatedOrder?.data.startDate).toBe('2025-01-15'); // Unchanged
    });

    it('should persist updates to IndexedDB', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);
      const changes: Partial<WorkOrderDocument['data']> = {
        status: 'complete',
      };

      service.updateWorkOrder(newOrder.docId, changes);

      setTimeout(() => {
        expect(mockDbService.saveWorkOrder).toHaveBeenCalled();
      }, 100);
    });

    it('should not affect other work orders when updating one', () => {
      const order1 = service.addWorkOrder({
        name: 'Order 1',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
      });

      const order2 = service.addWorkOrder({
        name: 'Order 2',
        workCenterId: 'wc-2',
        status: 'open',
        startDate: '2025-01-20',
        endDate: '2025-01-25',
      });

      service.updateWorkOrder(order1.docId, { status: 'complete' });

      const updated1 = service.getWorkOrder(order1.docId);
      const updated2 = service.getWorkOrder(order2.docId);

      expect(updated1?.data.status).toBe('complete');
      expect(updated2?.data.status).toBe('open'); // Unchanged
    });
  });

  describe('deleteWorkOrder', () => {
    it('should remove a work order', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'To Delete',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);
      const initialCount = service.workOrders().length;

      service.deleteWorkOrder(newOrder.docId);

      expect(service.workOrders().length).toBe(initialCount - 1);
      expect(service.getWorkOrder(newOrder.docId)).toBeUndefined();
    });

    it('should persist deletion to IndexedDB', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);
      service.deleteWorkOrder(newOrder.docId);

      setTimeout(() => {
        expect(mockDbService.deleteWorkOrder).toHaveBeenCalledWith(newOrder.docId);
      }, 100);
    });

    it('should handle deleting non-existent work order gracefully', () => {
      const initialCount = service.workOrders().length;

      service.deleteWorkOrder('non-existent-id');

      expect(service.workOrders().length).toBe(initialCount);
    });
  });

  describe('getWorkOrder', () => {
    it('should return a work order by ID', () => {
      const orderData: WorkOrderDocument['data'] = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      const newOrder = service.addWorkOrder(orderData);
      const found = service.getWorkOrder(newOrder.docId);

      expect(found).toBeDefined();
      expect(found?.docId).toBe(newOrder.docId);
      expect(found?.data.name).toBe('Test Order');
    });

    it('should return undefined for non-existent ID', () => {
      const found = service.getWorkOrder('non-existent-id');

      expect(found).toBeUndefined();
    });
  });

  describe('workOrdersByCenter', () => {
    it('should group work orders by work center', () => {
      const center1 = service.workCenters()[0];
      const center2 = service.workCenters()[1];

      service.addWorkOrder({
        name: 'Order 1',
        workCenterId: center1.docId,
        status: 'open',
        startDate: '2025-01-10',
        endDate: '2025-01-15',
      });

      service.addWorkOrder({
        name: 'Order 2',
        workCenterId: center1.docId,
        status: 'open',
        startDate: '2025-01-20',
        endDate: '2025-01-25',
      });

      service.addWorkOrder({
        name: 'Order 3',
        workCenterId: center2.docId,
        status: 'open',
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      });

      const grouped = service.workOrdersByCenter();

      const center1Orders = grouped.get(center1.docId);
      const center2Orders = grouped.get(center2.docId);

      expect(center1Orders).toBeDefined();
      expect(center2Orders).toBeDefined();
      expect(center1Orders!.filter(wo => wo.data.workCenterId === center1.docId).length).toBeGreaterThanOrEqual(2);
      expect(center2Orders!.filter(wo => wo.data.workCenterId === center2.docId).length).toBeGreaterThanOrEqual(1);
    });
  });
});
