import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NavItem } from '../nav-item/nav-item';

export type SideNavCommonActive = 'ranking' | 'disputes' | null;

/** Bottom block shared by every side-nav across roles — same links, same order,
 *  same behavior everywhere, so it never drifts per page. */
@Component({
  selector: 'app-side-nav-common',
  imports: [NavItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1 pt-4 border-t border-outline-variant/30">
      <app-nav-item
        icon="leaderboard"
        label="Ranking"
        [active]="active() === 'ranking'"
        (clicked)="goToRanking()"
      />
      <app-nav-item
        icon="gavel"
        label="Disputes"
        [active]="active() === 'disputes'"
        (clicked)="goToDisputes()"
      />
      <app-nav-item icon="logout" label="Logout" (clicked)="logout()" />
    </div>
  `,
  host: { class: 'contents' },
})
export class SideNavCommon {
  active = input<SideNavCommonActive>(null);

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected goToRanking(): void {
    this.router.navigateByUrl('/ranking');
  }

  protected goToDisputes(): void {
    this.router.navigateByUrl('/disputes');
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
