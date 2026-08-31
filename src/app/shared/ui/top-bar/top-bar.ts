import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { computeRankStats } from '../../../core/ranking/rank-stats';
import { RankingApi } from '../../../core/ranking/ranking-api.service';
import { Avatar } from '../avatar/avatar';

/** Persistent top bar for every side-nav page — page title on the left, (players
 *  only) real rank/points, and the user's avatar on the right, which is the single
 *  entry point into /profile everywhere instead of a sidebar link. */
@Component({
  selector: 'app-top-bar',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="hidden md:flex border-b border-outline-variant bg-surface-container-low h-20 items-center justify-between px-margin-desktop w-full max-w-container-max mx-auto"
    >
      <h2 class="font-headline-md text-headline-md text-primary">{{ title() }}</h2>
      <div class="flex items-center gap-6">
        @if (isPlayer()) {
          <div class="flex flex-col items-end mr-4">
            <span class="font-title-sm text-title-sm text-tertiary-fixed font-bold"
              >{{ totalPoints() }} pts</span
            >
            <span class="font-label-caps text-label-caps text-on-surface-variant">
              {{ rankPosition() ? 'Rank #' + rankPosition() : 'Unranked' }}
            </span>
          </div>
        }
        <button
          type="button"
          class="flex items-center gap-3 border-l border-outline-variant pl-6 hover:opacity-80 transition-opacity"
          (click)="goToProfile()"
        >
          <span class="font-title-sm text-title-sm hidden lg:block">{{ user()?.name }}</span>
          <app-avatar [initials]="initials()" ring="outline" />
        </button>
      </div>
    </header>
  `,
  host: { class: 'contents' },
})
export class TopBar {
  title = input.required<string>();

  private readonly authService = inject(AuthService);
  private readonly rankingApi = inject(RankingApi);
  private readonly router = inject(Router);

  protected readonly user = this.authService.currentUser;
  protected readonly isPlayer = computed(() => this.user()?.role === 'player');
  protected readonly initials = computed(() =>
    (this.user()?.name ?? '?').slice(0, 2).toUpperCase(),
  );

  private readonly rankStats = computeRankStats(this.rankingApi.leaderboard, () => this.user()?.id);
  protected readonly rankPosition = this.rankStats.rankPosition;
  protected readonly totalPoints = this.rankStats.totalPoints;

  protected goToProfile(): void {
    this.router.navigateByUrl('/profile');
  }
}
