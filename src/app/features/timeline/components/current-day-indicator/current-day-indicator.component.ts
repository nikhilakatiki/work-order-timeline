import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-current-day-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-testid="today-line"
      class="today-line"
      [style.left.px]="offset()"
    >
      <div class="today-line__dot"></div>
    </div>
  `,
  styles: [`
    .today-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 3px;
      background-color: rgba(212, 215, 255, 1);
      transform: translateX(-1px);
      z-index: var(--z-today-line);
      pointer-events: none;
    }
    .today-line__dot {
      display: none;
    }
  `],
})
export class CurrentDayIndicatorComponent {
  readonly offset = input.required<number>();
}
