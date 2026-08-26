import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

export type SideNavTone = 'surface' | 'brand';

/** Responsive app-shell sidebar: owns the mobile hamburger/backdrop/slide-in mechanics
 *  and background tone; header/nav-items/footer are supplied via content projection so
 *  each role (player, arbiter, admin) can compose its own sidebar from the shared atoms. */
@Component({
  selector: 'app-side-nav',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-nav.html',
  host: { class: 'contents' },
})
export class SideNav {
  brand = input('Knowledge League');
  tone = input<SideNavTone>('surface');

  protected mobileOpen = signal(false);

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
