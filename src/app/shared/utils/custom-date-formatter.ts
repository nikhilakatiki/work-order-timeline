import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

/**
 * Custom NgbDateParserFormatter that formats dates as MM.DD.YYYY
 * and parses them back from that format.
 */
@Injectable()
export class CustomDateFormatter extends NgbDateParserFormatter {
  readonly DELIMITER = '.';

  parse(value: string): NgbDateStruct | null {
    if (!value) return null;
    const parts = value.trim().split(this.DELIMITER);
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;

    return { year, month, day };
  }

  format(date: NgbDateStruct | null): string {
    if (!date) return '';
    const m = date.month.toString().padStart(2, '0');
    const d = date.day.toString().padStart(2, '0');
    return `${m}.${d}.${date.year}`;
  }
}
