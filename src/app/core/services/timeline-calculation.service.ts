import { Injectable } from '@angular/core';
import { ZoomLevel, DateRange, BarPosition, COLUMN_WIDTHS } from '../models/timeline.model';
import { WorkOrderDocument } from '../models/work-order.model';
import { isoToDate } from '../../shared/utils/date-helpers';

const MS_PER_DAY = 86400000;

/**
 * Pure calculation service for timeline positioning and layout.
 * Converts between dates and pixel offsets for each zoom level,
 * generates column headers, and computes bar positions.
 */
@Injectable({ providedIn: 'root' })
export class TimelineCalculationService {
  private getWeekAlignedStart(start: Date): Date {
    const aligned = new Date(start);
    aligned.setHours(0, 0, 0, 0);
    const dayOfWeek = aligned.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday-start week
    aligned.setDate(aligned.getDate() + diff);
    return aligned;
  }

  /** Calculate the date range that covers all work orders with padding, centered around today */
  getDateRange(orders: WorkOrderDocument[], paddingDays = 14): DateRange {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to midnight so range aligns with day columns
    const todayMs = now.getTime();

    if (orders.length === 0) {
      return {
        start: new Date(todayMs - paddingDays * MS_PER_DAY),
        end: new Date(todayMs + paddingDays * MS_PER_DAY),
      };
    }

    let min = todayMs;
    let max = todayMs;

    for (const o of orders) {
      const s = isoToDate(o.data.startDate).getTime();
      const e = isoToDate(o.data.endDate).getTime();
      if (s < min) min = s;
      if (e > max) max = e;
    }

    // Ensure at least ±2 weeks around today are always visible
    const minBuffer = todayMs - 14 * MS_PER_DAY;
    const maxBuffer = todayMs + 14 * MS_PER_DAY;
    if (minBuffer < min) min = minBuffer;
    if (maxBuffer > max) max = maxBuffer;

    return {
      start: new Date(min - paddingDays * MS_PER_DAY),
      end: new Date(max + paddingDays * MS_PER_DAY),
    };
  }

  /** Convert a Date to a pixel offset from the start of the timeline */
  dateToPixelOffset(date: Date, range: DateRange, zoom: ZoomLevel): number {
    const colWidth = COLUMN_WIDTHS[zoom];

    if (zoom === 'month') {
      // Use actual month boundaries for precise alignment
      const rangeStart = new Date(range.start);
      rangeStart.setDate(1);
      rangeStart.setHours(0, 0, 0, 0);

      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const startYear = rangeStart.getFullYear();
      const startMonth = rangeStart.getMonth();

      // Full months difference
      const monthsDiff = (dateYear - startYear) * 12 + (dateMonth - startMonth);
      // Fraction within the current month
      const daysInMonth = new Date(dateYear, dateMonth + 1, 0).getDate();
      const dayFraction = (date.getDate() - 1) / daysInMonth;

      return (monthsDiff + dayFraction) * colWidth;
    }

    if (zoom === 'week') {
      const weekStart = this.getWeekAlignedStart(range.start);
      const diffDays = (date.getTime() - weekStart.getTime()) / MS_PER_DAY;
      return (diffDays / 7) * colWidth;
    }

    const diffDays = (date.getTime() - range.start.getTime()) / MS_PER_DAY;

    switch (zoom) {
      case 'hour':
        return (diffDays * 24) * colWidth;
      case 'day':
        return diffDays * colWidth;
      default:
        return diffDays * colWidth;
    }
  }

  /** Convert a pixel offset to a Date */
  pixelOffsetToDate(px: number, range: DateRange, zoom: ZoomLevel): Date {
    const colWidth = COLUMN_WIDTHS[zoom];
    let diffDays = 0;

    switch (zoom) {
      case 'hour':
        diffDays = (px / colWidth) / 24;
        break;
      case 'day':
        diffDays = px / colWidth;
        break;
      case 'week':
        diffDays = (px / colWidth) * 7;
        break;
      case 'month':
        diffDays = (px / colWidth) * 30.44;
        break;
    }

    if (zoom === 'week') {
      const weekStart = this.getWeekAlignedStart(range.start);
      return new Date(weekStart.getTime() + diffDays * MS_PER_DAY);
    }

    return new Date(range.start.getTime() + diffDays * MS_PER_DAY);
  }

  /** Calculate the left position and width of a work order bar */
  getBarPosition(startDate: string, endDate: string, range: DateRange, zoom: ZoomLevel): BarPosition {
    const start = isoToDate(startDate);
    const end = isoToDate(endDate);
    const left = this.dateToPixelOffset(start, range, zoom);
    const rawWidth = this.dateToPixelOffset(end, range, zoom) - left;
    // Minimum bar width depends on zoom — month view needs smaller min to avoid visual overlap
    const minWidth = zoom === 'month' ? 70 : zoom === 'week' ? 40 : 60;
    const width = Math.max(minWidth, rawWidth);
    return { left, width };
  }

  /** Generate an array of dates for column headers based on zoom level */
  getColumnDates(range: DateRange, zoom: ZoomLevel): Date[] {
    const dates: Date[] = [];
    const current = new Date(range.start);

    switch (zoom) {
      case 'hour':
        current.setMinutes(0, 0, 0);
        while (current <= range.end) {
          dates.push(new Date(current));
          current.setHours(current.getHours() + 1);
        }
        break;
      case 'day':
        current.setHours(0, 0, 0, 0);
        while (current <= range.end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
        break;
      case 'week':
        // Align to Monday
        current.setTime(this.getWeekAlignedStart(current).getTime());
        while (current <= range.end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 7);
        }
        break;
      case 'month':
        current.setDate(1);
        current.setHours(0, 0, 0, 0);
        while (current <= range.end) {
          dates.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
        }
        break;
    }

    return dates;
  }

  /** Calculate total pixel width of the timeline */
  getTotalWidth(range: DateRange, zoom: ZoomLevel): number {
    if (zoom === 'month' || zoom === 'week') {
      // Use column count for precise width
      const columns = this.getColumnDates(range, zoom);
      return columns.length * COLUMN_WIDTHS[zoom];
    }

    const diffDays = (range.end.getTime() - range.start.getTime()) / MS_PER_DAY;
    const colWidth = COLUMN_WIDTHS[zoom];

    switch (zoom) {
      case 'hour':
        return (diffDays * 24) * colWidth;
      case 'day':
        return diffDays * colWidth;
      default:
        return diffDays * colWidth;
    }
  }

  /** Get today's pixel offset from the start of the timeline */
  getTodayOffset(range: DateRange, zoom: ZoomLevel): number {
    return this.dateToPixelOffset(new Date(), range, zoom);
  }

  /**
   * Get the center pixel offset of the current period for the active zoom.
   * Month view uses the center of the month column so "Today" centers the month
   * consistently, rather than the exact day-of-month position.
   */
  getCurrentPeriodCenterOffset(range: DateRange, zoom: ZoomLevel): number {
    const now = new Date();

    if (zoom === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return this.dateToPixelOffset(monthStart, range, zoom) + COLUMN_WIDTHS.month / 2;
    }

    if (zoom === 'week') {
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      return this.dateToPixelOffset(weekStart, range, zoom) + COLUMN_WIDTHS.week / 2;
    }

    return this.dateToPixelOffset(now, range, zoom);
  }
}
