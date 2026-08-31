import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** Sidebar navigation row — icon + label, with an active/rest visual state. */
@Component({
  selector: 'app-nav-item',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#"
      (click)="$event.preventDefault(); clicked.emit()"
      class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95 duration-150"
      [class]="
        active()
          ? 'bg-secondary-container text-on-secondary-container font-bold'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      "
    >
      <app-icon [name]="icon()" [fill]="active()" />
      <span class="font-title-sm text-title-sm">{{ label() }}</span>
    </a>
  `,
  host: { class: 'contents' },
})
export class NavItem {
  icon = input.required<string>();
  label = input.required<string>();
  active = input(false);
  clicked = output<void>();
}
