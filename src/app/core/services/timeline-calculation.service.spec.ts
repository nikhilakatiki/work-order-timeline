import { TestBed } from '@angular/core/testing';
import { TimelineCalculationService } from './timeline-calculation.service';
import { WorkOrderDocument } from '../models/work-order.model';
import { ZoomLevel } from '../models/timeline.model';

describe('TimelineCalculationService', () => {
  let service: TimelineCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimelineCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDateRange', () => {
    it('should return default range when no work orders provided', () => {
      const range = service.getDateRange([], 60);
      const diff = Math.floor((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(diff).toBeGreaterThan(0);
    });

    it('should include padding around work order dates', () => {
      const workOrders: WorkOrderDocument[] = [
        {
          docId: 'wo-1',
          docType: 'workOrder',
          data: {
            name: 'Order 1',
            workCenterId: 'wc-1',
            status: 'open',
            startDate: '2025-01-15',
            endDate: '2025-01-20',
          },
        },
      ];

      const padding = 30;
      const range = service.getDateRange(workOrders, padding);

      const expectedStart = new Date('2025-01-15');
      const expectedEnd = new Date('2025-01-20');
      expectedStart.setDate(expectedStart.getDate() - padding);
      expectedEnd.setDate(expectedEnd.getDate() + padding);

      // Normalize to midnight for comparison
      const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

      expect(normalizeDate(range.start)).toEqual(normalizeDate(expectedStart));
      expect(normalizeDate(range.end)).toEqual(normalizeDate(expectedEnd));
    });

    it('should handle multiple work orders correctly', () => {
      const workOrders: WorkOrderDocument[] = [
        {
          docId: 'wo-1',
          docType: 'workOrder',
          data: {
            name: 'Order 1',
            workCenterId: 'wc-1',
            status: 'open',
            startDate: '2025-01-10',
            endDate: '2025-01-15',
          },
        },
        {
          docId: 'wo-2',
          docType: 'workOrder',
          data: {
            name: 'Order 2',
            workCenterId: 'wc-2',
            status: 'in-progress',
            startDate: '2025-02-01',
            endDate: '2025-02-28',
          },
        },
      ];

      const range = service.getDateRange(workOrders, 0);

      expect(range.start.toISOString().split('T')[0]).toBe('2025-01-10');
      expect(range.end.toISOString().split('T')[0]).toBe('2025-02-28');
    });
  });

  describe('getColumnDates', () => {
    it('should generate day columns correctly', () => {
      const range = {
        start: new Date('2025-01-10'),
        end: new Date('2025-01-12'),
      };

      const columns = service.getColumnDates(range, 'day');

      expect(columns.length).toBe(3); // 10th, 11th, 12th
      expect(columns[0].toISOString().split('T')[0]).toBe('2025-01-10');
      expect(columns[1].toISOString().split('T')[0]).toBe('2025-01-11');
      expect(columns[2].toISOString().split('T')[0]).toBe('2025-01-12');
    });

    it('should generate week columns correctly', () => {
      const range = {
        start: new Date('2025-01-06'), // Monday
        end: new Date('2025-01-20'),   // Monday 2 weeks later
      };

      const columns = service.getColumnDates(range, 'week');

      expect(columns.length).toBeGreaterThan(0);
      // Each column should be a Monday (week start)
      columns.forEach(date => {
        expect(date.getDay()).toBe(1); // Monday = 1
      });
    });

    it('should generate month columns correctly', () => {
      const range = {
        start: new Date('2025-01-01'),
        end: new Date('2025-03-31'),
      };

      const columns = service.getColumnDates(range, 'month');

      expect(columns.length).toBe(3); // Jan, Feb, Mar
      expect(columns[0].getMonth()).toBe(0); // January
      expect(columns[1].getMonth()).toBe(1); // February
      expect(columns[2].getMonth()).toBe(2); // March
    });
  });

  describe('getTotalWidth', () => {
    it('should calculate correct width for day zoom', () => {
      const range = {
        start: new Date('2025-01-10'),
        end: new Date('2025-01-12'),
      };

      const width = service.getTotalWidth(range, 'day');

      // 3 days * day column width
      expect(width).toBeGreaterThan(0);
    });

    it('should calculate different widths for different zoom levels', () => {
      const range = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const dayWidth = service.getTotalWidth(range, 'day');
      const weekWidth = service.getTotalWidth(range, 'week');
      const monthWidth = service.getTotalWidth(range, 'month');

      expect(dayWidth).toBeGreaterThan(weekWidth);
      expect(weekWidth).toBeGreaterThan(monthWidth);
    });
  });

  describe('dateToPixelOffset', () => {
    it('should calculate pixel offset for a date within range', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };
      const targetDate = new Date('2025-01-15');

      const offset = service.dateToPixelOffset(targetDate, dateRange, 'day');

      expect(offset).toBeGreaterThan(0);
      expect(offset).toBeLessThan(service.getTotalWidth(dateRange, 'day'));
    });

    it('should return 0 for date at range start', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };
      const targetDate = new Date('2025-01-01');

      const offset = service.dateToPixelOffset(targetDate, dateRange, 'day');

      expect(offset).toBe(0);
    });

    it('should handle dates across different zoom levels', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      };
      const targetDate = new Date('2025-06-15');

      const dayOffset = service.dateToPixelOffset(targetDate, dateRange, 'day');
      const weekOffset = service.dateToPixelOffset(targetDate, dateRange, 'week');
      const monthOffset = service.dateToPixelOffset(targetDate, dateRange, 'month');

      expect(dayOffset).toBeGreaterThan(0);
      expect(weekOffset).toBeGreaterThan(0);
      expect(monthOffset).toBeGreaterThan(0);
    });
  });

  describe('pixelOffsetToDate', () => {
    it('should convert pixel offset back to date', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };
      const originalDate = new Date('2025-01-15');

      const offset = service.dateToPixelOffset(originalDate, dateRange, 'day');
      const convertedDate = service.pixelOffsetToDate(offset, dateRange, 'day');

      // Should be the same day (ignoring time)
      expect(convertedDate.toISOString().split('T')[0]).toBe(originalDate.toISOString().split('T')[0]);
    });

    it('should handle offset of 0', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const date = service.pixelOffsetToDate(0, dateRange, 'day');

      expect(date.toISOString().split('T')[0]).toBe('2025-01-01');
    });
  });

  describe('getBarPosition', () => {
    it('should calculate bar position and width correctly', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };
      const workOrder: WorkOrderDocument = {
        docId: 'wo-1',
        docType: 'workOrder',
        data: {
          name: 'Test Order',
          workCenterId: 'wc-1',
          status: 'open',
          startDate: '2025-01-10',
          endDate: '2025-01-15',
        },
      };

      const position = service.getBarPosition(workOrder, dateRange, 'day');

      expect(position.left).toBeGreaterThan(0);
      expect(position.width).toBeGreaterThan(0);
      expect(position.left + position.width).toBeLessThanOrEqual(service.getTotalWidth(dateRange, 'day'));
    });

    it('should return different positions for different zoom levels', () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      };
      const workOrder: WorkOrderDocument = {
        docId: 'wo-1',
        docType: 'workOrder',
        data: {
          name: 'Test Order',
          workCenterId: 'wc-1',
          status: 'open',
          startDate: '2025-06-01',
          endDate: '2025-06-15',
        },
      };

      const dayPosition = service.getBarPosition(workOrder, dateRange, 'day');
      const weekPosition = service.getBarPosition(workOrder, dateRange, 'week');
      const monthPosition = service.getBarPosition(workOrder, dateRange, 'month');

      expect(dayPosition.left).toBeGreaterThan(weekPosition.left);
      expect(weekPosition.left).toBeGreaterThan(monthPosition.left);
    });
  });
});
