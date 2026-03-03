import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

export function isoToNgbDate(iso: string): NgbDateStruct {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function ngbDateToIso(d: NgbDateStruct): string {
  const y = d.year.toString();
  const m = d.month.toString().padStart(2, '0');
  const day = d.day.toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear().toString();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDateLabel(d: Date, zoom: 'hour' | 'day' | 'week' | 'month'): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  switch (zoom) {
    case 'hour': {
      const h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}${ampm}`;
    }
    case 'day':
      return `${d.getDate()}`;
    case 'week':
      return `${months[d.getMonth()]} ${d.getDate()}`;
    case 'month':
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    default:
      return `${d.getDate()}`;
  }
}

export function formatMonthYear(d: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
