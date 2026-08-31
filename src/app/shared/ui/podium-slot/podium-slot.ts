import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type PodiumRank = 1 | 2 | 3;

interface RankTheme {
  ring: string;
  avatarSize: string;
  slabHeight: string;
  slabFrom: string;
  border: string;
  nameColor: string;
  pointsColor: string;
  icon: string;
  numberColor: string;
  wrapperWidth: string;
  lift: string;
}

const THEME: Record<PodiumRank, RankTheme> = {
  1: {
    ring: 'border-4 border-gold shadow-[0_0_25px_rgba(231,191,153,0.5)]',
    avatarSize: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
    slabHeight: 'h-32 sm:h-40 md:h-48',
    slabFrom: 'from-tertiary-container/80',
    border: 'border-tertiary/50',
    nameColor: 'text-tertiary-fixed font-bold',
    pointsColor: 'text-on-surface',
    icon: 'trophy',
    numberColor: 'text-tertiary/40',
    wrapperWidth: 'w-28 sm:w-36 md:w-48',
    lift: 'z-20 md:-translate-y-4',
  },
  2: {
    ring: 'border-2 border-secondary shadow-[0_0_15px_rgba(181,199,234,0.3)]',
    avatarSize: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20',
    slabHeight: 'h-24 sm:h-32 md:h-40',
    slabFrom: 'from-surface-container-highest',
    border: 'border-secondary/30',
    nameColor: 'text-primary',
    pointsColor: 'text-secondary',
    icon: 'social_leaderboard',
    numberColor: 'text-secondary/40',
    wrapperWidth: 'w-20 sm:w-28 md:w-40',
    lift: '',
  },
  3: {
    ring: 'border-2 border-on-tertiary-container shadow-[0_0_15px_rgba(157,123,90,0.3)]',
    avatarSize: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20',
    slabHeight: 'h-20 sm:h-24 md:h-32',
    slabFrom: 'from-surface-container-highest',
    border: 'border-on-tertiary-container/30',
    nameColor: 'text-primary',
    pointsColor: 'text-on-tertiary-container',
    icon: 'workspace_premium',
    numberColor: 'text-on-tertiary-container/40',
    wrapperWidth: 'w-20 sm:w-28 md:w-40',
    lift: '',
  },
};

/** One podium pedestal in the ranking hall of fame — sizing/color scale to rank. */
@Component({
  selector: 'app-podium-slot',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center relative group"
      [class]="theme().wrapperWidth + ' ' + theme().lift"
    >
      @if (rank() === 1) {
        <div class="absolute -top-12 w-full flex justify-center">
          <app-icon
            name="military_tech"
            size="xl"
            [fill]="true"
            class="text-gold animate-bounce drop-shadow-[0_0_10px_rgba(231,191,153,0.8)]"
          />
        </div>
      } @else {
        <div
          class="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container border border-outline-variant px-3 py-1 rounded text-center text-xs whitespace-nowrap z-20"
        >
          Win Rate: {{ winRate() }}%<br />Matches: {{ matches() }}
        </div>
      }

      <div class="relative">
        @if (rank() === 1) {
          <div class="absolute inset-0 rounded-full bg-gold blur-md opacity-40 animate-pulse"></div>
        }
        <img
          [src]="avatarUrl()"
          [alt]="name()"
          class="rounded-full relative z-10 bg-surface-container object-cover"
          [class]="theme().avatarSize + ' ' + theme().ring"
        />
      </div>

      <div class="mt-3 mb-2 flex flex-col items-center">
        <span
          class="font-title-sm text-xs sm:text-title-sm text-center truncate w-full"
          [class]="theme().nameColor"
        >
          {{ name() }}
          @if (isSelf()) {
            <span class="text-[10px] sm:text-xs font-normal text-on-surface-variant">(You)</span>
          }
        </span>
        <span class="font-label-caps text-[10px] sm:text-label-caps" [class]="theme().pointsColor"
          >{{ points() }} pts</span
        >
      </div>

      <div
        class="w-full bg-gradient-to-t to-surface-container border rounded-t-lg relative flex flex-col items-center justify-start pt-4 overflow-hidden"
        [class]="theme().slabHeight + ' ' + theme().slabFrom + ' ' + theme().border"
      >
        <app-icon [name]="theme().icon" size="xl" [fill]="true" [class]="theme().pointsColor" />
        <span
          class="font-display-lg text-2xl sm:text-display-lg mt-auto mb-2"
          [class]="theme().numberColor"
          >{{ rank() }}</span
        >
      </div>
    </div>
  `,
  host: { class: 'contents' },
})
export class PodiumSlot {
  rank = input.required<PodiumRank>();
  name = input.required<string>();
  points = input.required<string>();
  avatarUrl = input.required<string>();
  winRate = input(0);
  matches = input(0);
  isSelf = input(false);

  protected theme = computed(() => THEME[this.rank()]);
}
