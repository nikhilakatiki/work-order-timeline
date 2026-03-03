import { Pipe, PipeTransform } from '@angular/core';
import { WorkOrderStatus } from '../../core/models/work-order.model';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  'open': 'Open',
  'in-progress': 'In progress',
  'complete': 'Complete',
  'blocked': 'Blocked',
};

@Pipe({
  name: 'statusLabel',
  standalone: true,
})
export class StatusLabelPipe implements PipeTransform {
  transform(value: WorkOrderStatus): string {
    return STATUS_LABELS[value] ?? value;
  }
}
