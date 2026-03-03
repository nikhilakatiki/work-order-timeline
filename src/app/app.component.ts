import { Component } from '@angular/core';
import { TimelinePageComponent } from './features/timeline/timeline-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TimelinePageComponent],
  template: `<app-timeline-page />`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `],
})
export class AppComponent {}
