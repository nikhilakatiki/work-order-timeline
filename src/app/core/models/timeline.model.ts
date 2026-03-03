/** Supported zoom levels for the timeline view. */
export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

/** The visible date range of the timeline, with padding around work orders. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Computed pixel position and width of a work order bar on the timeline. */
export interface BarPosition {
  left: number;
  width: number;
}

/** Column width in pixels for each zoom level. Determines grid density. */
export const COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  hour: 60,
  day: 40,
  week: 140,
  month: 114,
};
