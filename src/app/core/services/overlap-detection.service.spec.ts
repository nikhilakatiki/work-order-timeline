import { TestBed } from '@angular/core/testing';
import { OverlapDetectionService } from './overlap-detection.service';
import { WorkOrderDocument } from '../models/work-order.model';

describe('OverlapDetectionService', () => {
  let service: OverlapDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverlapDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('hasOverlap', () => {
    const workCenterId = 'wc-1';

    const createWorkOrder = (id: string, startDate: string, endDate: string): WorkOrderDocument => ({
      docId: id,
      docType: 'workOrder',
      data: {
        name: `Order ${id}`,
        workCenterId,
        status: 'open',
        startDate,
        endDate,
      },
    });

    it('should return false when there are no existing work orders', () => {
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-15',
        endDate: '2025-01-20',
      };

      expect(service.hasOverlap(newOrderData, [])).toBeFalse();
    });

    it('should return false when work orders are on different work centers', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-20'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId: 'wc-2', // Different work center
        status: 'open' as const,
        startDate: '2025-01-15',
        endDate: '2025-01-25',
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should return false when new order is completely before existing order', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-20', '2025-01-30'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-10',
        endDate: '2025-01-15',
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should return false when new order is completely after existing order', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-20'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-25',
        endDate: '2025-01-30',
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should return false when new order ends exactly when existing order starts', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-20', '2025-01-30'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-10',
        endDate: '2025-01-20', // Ends when next one starts
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should return false when new order starts exactly when existing order ends', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-20'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-20', // Starts when previous one ends
        endDate: '2025-01-30',
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should return true when new order partially overlaps at the start', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-15', '2025-01-25'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-10',
        endDate: '2025-01-20', // Overlaps with existing order
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });

    it('should return true when new order partially overlaps at the end', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-20'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-15',
        endDate: '2025-01-25', // Overlaps with existing order
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });

    it('should return true when new order completely contains existing order', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-15', '2025-01-20'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-10',
        endDate: '2025-01-30', // Contains existing order
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });

    it('should return true when new order is completely contained by existing order', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-30'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-15',
        endDate: '2025-01-20', // Contained by existing order
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });

    it('should exclude specific order when checking for overlaps (for editing)', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-20'),
        createWorkOrder('wo-2', '2025-01-25', '2025-01-30'),
      ];
      const newOrderData = {
        name: 'Updated Order',
        workCenterId,
        status: 'in-progress' as const,
        startDate: '2025-01-10',
        endDate: '2025-01-20', // Same as wo-1
      };

      // Should not overlap when excluding wo-1 (editing itself)
      expect(service.hasOverlap(newOrderData, existingOrders, 'wo-1')).toBeFalse();

      // Should overlap when not excluding (would be duplicate)
      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });

    it('should handle multiple existing orders on the same work center', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-15'),
        createWorkOrder('wo-2', '2025-01-20', '2025-01-25'),
        createWorkOrder('wo-3', '2025-01-30', '2025-02-05'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-16',
        endDate: '2025-01-19', // Fits between wo-1 and wo-2
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeFalse();
    });

    it('should detect overlap with any of multiple existing orders', () => {
      const existingOrders = [
        createWorkOrder('wo-1', '2025-01-10', '2025-01-15'),
        createWorkOrder('wo-2', '2025-01-20', '2025-01-25'),
        createWorkOrder('wo-3', '2025-01-30', '2025-02-05'),
      ];
      const newOrderData = {
        name: 'New Order',
        workCenterId,
        status: 'open' as const,
        startDate: '2025-01-22',
        endDate: '2025-01-28', // Overlaps with wo-2
      };

      expect(service.hasOverlap(newOrderData, existingOrders)).toBeTrue();
    });
  });
});
