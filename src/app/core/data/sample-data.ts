import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument, WorkOrderStatus } from '../models/work-order.model';
import { dateToIso, addDays } from '../../shared/utils/date-helpers';

/** Bump this version whenever sample data changes to force a refresh. */
export const SAMPLE_DATA_VERSION = 22;

const CENTER_DEPARTMENTS = [
  'Extrusion', 'CNC', 'Assembly', 'Quality Control', 'Packaging',
  'Laser Cutting', 'Welding', 'Painting', 'Injection Molding', 'Heat Treatment',
  'Surface Finishing', 'Testing', 'Tool & Die', 'Sheet Metal', 'Stamping',
  'Casting', 'Forging', 'Grinding', 'Plating', 'Polishing',
  'Drilling', 'Milling', 'Turning', 'Bending', 'Forming',
  'Riveting', 'Soldering', 'Brazing', 'Deburring', 'Anodizing',
];

const CENTER_SUFFIXES = [
  'Line A', 'Line B', 'Line C', 'Station 1', 'Station 2',
  'Station 3', 'Bay 1', 'Bay 2', 'Cell 1', 'Cell 2',
];

function generateWorkCenters(): WorkCenterDocument[] {
  const centers: WorkCenterDocument[] = [];
  let id = 1;
  for (const dept of CENTER_DEPARTMENTS) {
    for (const suffix of CENTER_SUFFIXES) {
      centers.push({
        docId: `wc-${id}`,
        docType: 'workCenter',
        data: { name: `${dept} ${suffix}` },
      });
      id++;
      if (centers.length >= 300) return centers;
    }
  }
  return centers;
}

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = generateWorkCenters();

const ORDER_PREFIXES = [
  'EXT', 'CNC', 'ASM', 'QC', 'PKG', 'LSR', 'WLD', 'PNT',
  'INJ', 'HT', 'SRF', 'TST', 'TDL', 'SHT', 'MNT', 'RPR',
  'CAL', 'PRD', 'BTH', 'EDM', 'GRD', 'DBR', 'PLT', 'FIN',
];

const STATUSES: WorkOrderStatus[] = ['open', 'in-progress', 'complete', 'blocked'];

/** Seeded pseudo-random number generator for reproducible data */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateSampleOrders(): WorkOrderDocument[] {
  const rand = seededRandom(42);
  const orders: WorkOrderDocument[] = [];
  const MS_PER_DAY = 86400000;
  const rangeStart = new Date(2025, 2, 1);   // Mar 1, 2025
  const rangeEnd = new Date(2026, 9, 31);    // Oct 31, 2026
  const totalDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY);
  const MIN_DURATION = 90;  // ~3 months
  const MAX_DURATION = 120; // up to ~4 months
  const MIN_GAP_DAYS = 12;
  const MAX_GAP_DAYS = 35;

  // 300 centers x (2 or 3 orders) = ~750 work orders
  let orderIndex = 0;
  for (const wc of SAMPLE_WORK_CENTERS) {
    const orderCount = rand() < 0.5 ? 2 : 3;
    const durations: number[] = [];
    const gaps: number[] = [];
    for (let i = 0; i < orderCount; i++) {
      durations.push(Math.floor(rand() * (MAX_DURATION - MIN_DURATION + 1)) + MIN_DURATION);
      if (i < orderCount - 1) {
        gaps.push(Math.floor(rand() * (MAX_GAP_DAYS - MIN_GAP_DAYS + 1)) + MIN_GAP_DAYS);
      }
    }

    const totalSpan = durations.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    const maxBaseStart = Math.max(0, totalDays - totalSpan);
    const baseStart = Math.floor(rand() * (maxBaseStart + 1));
    let cursor = baseStart;

    for (let j = 0; j < orderCount; j++) {
      const prefix = ORDER_PREFIXES[Math.floor(rand() * ORDER_PREFIXES.length)];
      const status = STATUSES[Math.floor(rand() * STATUSES.length)];
      const orderNum = String(1000 + orderIndex);

      const startOffset = Math.max(0, Math.min(totalDays, cursor));
      let endOffset = Math.min(totalDays, startOffset + durations[j]);
      if (endOffset <= startOffset) {
        endOffset = Math.min(totalDays, startOffset + 1);
      }

      orders.push({
        docId: `wo-${orderIndex + 1}`,
        docType: 'workOrder',
        data: {
          name: `${prefix}-${orderNum}`,
          status,
          workCenterId: wc.docId,
          startDate: dateToIso(addDays(rangeStart, startOffset)),
          endDate: dateToIso(addDays(rangeStart, endOffset)),
        },
      });
      orderIndex++;

      if (j < gaps.length) {
        cursor = endOffset + gaps[j];
      }
    }
  }

  return orders;
}

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = generateSampleOrders();
