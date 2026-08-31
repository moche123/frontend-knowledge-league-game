import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { computeRankStats } from '../../../core/ranking/rank-stats';
import { RankingApi } from '../../../core/ranking/ranking-api.service';
import { Avatar } from '../avatar/avatar';

/** Top block shared by every side-nav across roles — same identity layout everywhere:
 *  avatar, name, role, and (players only) real rank/points from the ranking ledger. */
@Component({
  selector: 'app-side-nav-header',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-stack-lg flex flex-col items-center gap-stack-sm px-2 text-center">
      <app-avatar [initials]="initials()" size="lg" ring="primary" />
      <h2 class="font-title-sm text-title-sm text-primary">{{ user()?.name }}</h2>
      <p class="font-label-caps text-label-caps text-tertiary uppercase">{{ roleLabel() }}</p>
      @if (isPlayer()) {
        <p class="font-body-sm text-body-sm text-on-surface-variant">
          {{ rankPosition() ? 'Rank #' + rankPosition() : 'Unranked' }} · {{ totalPoints() }} pts
        </p>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class SideNavHeader {
  private readonly authService = inject(AuthService);
  private readonly rankingApi = inject(RankingApi);

  protected readonly user = this.authService.currentUser;

  protected readonly initials = computed(() =>
    (this.user()?.name ?? '?').slice(0, 2).toUpperCase(),
  );

  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role ?? '';
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  protected readonly isPlayer = computed(() => this.user()?.role === 'player');

  private readonly rankStats = computeRankStats(this.rankingApi.leaderboard, () => this.user()?.id);
  protected readonly rankPosition = this.rankStats.rankPosition;
  protected readonly totalPoints = this.rankStats.totalPoints;
}
