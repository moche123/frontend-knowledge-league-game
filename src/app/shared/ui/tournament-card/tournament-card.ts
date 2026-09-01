import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Badge, BadgeVariant } from '../badge/badge';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { ProgressBar, ProgressTone } from '../progress-bar/progress-bar';

export type TournamentCardState = 'register' | 'registered' | 'full' | 'ongoing';

/** Tournament enrollment card for the player dashboard's bento grid — glass panel with
 *  category tag, seat progress and a CTA whose label/behavior follows the event's
 *  real state (open to join, already joined, full, or already running). */
@Component({
  selector: 'app-tournament-card',
  imports: [Badge, Button, Icon, ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-xl p-6 flex flex-col relative overflow-hidden group transition-colors border border-outline/20 bg-surface-container-high/40 backdrop-blur-md"
      [class.opacity-75]="dimmed()"
      [class.hover:bg-surface-container]="!dimmed()"
    >
      @if (!dimmed()) {
        <div
          class="absolute -top-10 -right-10 w-32 h-32 opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity"
          [class]="glowClass()"
        ></div>
      }

      <div class="flex justify-between items-start mb-4">
        <app-badge [variant]="dimmed() ? 'neutral' : categoryTone()">{{ category() }}</app-badge>
        <span
          class="font-title-sm text-title-sm font-bold flex items-center gap-1"
          [class]="dimmed() ? 'text-on-surface-variant' : 'text-tertiary-fixed'"
        >
          <app-icon name="stars" size="sm" />
          {{ points() }} pts
        </span>
      </div>

      <h5 class="font-title-sm text-title-sm text-on-surface mb-2">{{ title() }}</h5>

      <div class="flex flex-col gap-2 mt-auto pt-6 border-t border-outline-variant/50">
        <div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
          <app-icon name="calendar_today" size="sm" />
          {{ date() }}
        </div>
        <div
          class="flex items-center gap-2 font-body-sm text-body-sm font-medium"
          [class]="state() === 'full' ? 'text-error' : 'text-on-surface-variant'"
        >
          <app-icon name="group" size="sm" />
          {{ enrolled() }}/{{ capacity() }} inscritos
        </div>

        <div class="mt-2 mb-4">
          <app-progress-bar
            [value]="progress()"
            [tone]="state() === 'full' ? 'error' : progressTone()"
          />
        </div>

        @switch (state()) {
          @case ('full') {
            <app-button variant="outline-neutral" [disabled]="true" [fullWidth]="true">
              Cupo Lleno
              <app-icon name="block" size="sm" />
            </app-button>
          }
          @case ('registered') {
            <app-button variant="outline" [disabled]="true" [fullWidth]="true">
              Inscrito
              <app-icon name="check_circle" size="sm" />
            </app-button>
          }
          @case ('ongoing') {
            <app-button variant="secondary" [disabled]="false" [fullWidth]="true">
              En Curso
              <app-icon name="bolt" size="sm" />
            </app-button>
          }
          @default {
            <app-button
              variant="primary"
              [fullWidth]="true"
              [disabled]="registering()"
              (click)="register.emit()"
            >
              {{ registering() ? 'Inscribiendo…' : 'Inscribirme' }}
              <app-icon name="arrow_forward" size="sm" />
            </app-button>
          }
        }
      </div>
    </div>
  `,
  host: { class: 'contents' },
})
export class TournamentCard {
  category = input.required<string>();
  categoryTone = input<BadgeVariant>('primary');
  progressTone = input<ProgressTone>('primary');
  glowClass = input('bg-primary');
  title = input.required<string>();
  points = input.required<number>();
  date = input.required<string>();
  enrolled = input.required<number>();
  capacity = input.required<number>();
  progress = input.required<number>();
  state = input<TournamentCardState>('register');
  registering = input(false);

  register = output<void>();

  protected readonly dimmed = computed(() => this.state() === 'full');

  ngOnInit(): void {
    console.log('TournamentCard initialized with state:', this.state());
  }
}
