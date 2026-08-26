import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { ProgressBar } from '../../shared/ui/progress-bar/progress-bar';
import { Select, SelectOption } from '../../shared/ui/select/select';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { TextField } from '../../shared/ui/text-field/text-field';

type EventStatus = 'finished' | 'live' | 'open';

interface EventRow {
  id: string;
  name: string;
  code: string;
  themeIcon: string;
  themeLabel: string;
  date: string;
  time: string;
  status: EventStatus;
  enrolled: number;
  capacity: number;
  refereeInitials: string;
  refereeName: string;
  action: 'report' | 'monitor' | 'edit';
}

const STATUS_BADGE: Record<EventStatus, BadgeVariant> = {
  finished: 'neutral',
  live: 'accent',
  open: 'gold',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  finished: 'Finalizado',
  live: 'En curso',
  open: 'Inscripción abierta',
};

const STATUS_PROGRESS_TONE: Record<EventStatus, 'neutral' | 'accent' | 'gold'> = {
  finished: 'neutral',
  live: 'accent',
  open: 'gold',
};

const ACTION_ICON: Record<EventRow['action'], string> = {
  report: 'analytics',
  monitor: 'desktop_windows',
  edit: 'edit',
};

const PLAYER_COUNTS = [4, 8, 16, 32] as const;

@Component({
  selector: 'app-events-management-page',
  imports: [Badge, Button, Icon, NavItem, ProgressBar, Select, SideNav, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './events-management-page.html',
})
export class EventsManagementPage {
  protected readonly statusBadge = STATUS_BADGE;
  protected readonly statusLabel = STATUS_LABEL;
  protected readonly statusProgressTone = STATUS_PROGRESS_TONE;
  protected readonly actionIcon = ACTION_ICON;
  protected readonly playerCounts = PLAYER_COUNTS;

  protected readonly events: EventRow[] = [
    {
      id: 'e1',
      name: 'Olimpiada de Historia',
      code: 'TRN-2023-089',
      themeIcon: 'history_edu',
      themeLabel: 'Historia',
      date: '15 Oct 2023',
      time: '10:00 - 14:00',
      status: 'finished',
      enrolled: 32,
      capacity: 32,
      refereeInitials: 'ML',
      refereeName: 'Prof. M. López',
      action: 'report',
    },
    {
      id: 'e2',
      name: 'Desafío de Ciencias',
      code: 'TRN-2023-102',
      themeIcon: 'science',
      themeLabel: 'Ciencias',
      date: 'Hoy',
      time: '09:00 - 18:00',
      status: 'live',
      enrolled: 16,
      capacity: 16,
      refereeInitials: 'DR',
      refereeName: 'Dra. D. Reyes',
      action: 'monitor',
    },
    {
      id: 'e3',
      name: 'Maestría Literaria',
      code: 'TRN-2023-115',
      themeIcon: 'menu_book',
      themeLabel: 'Literatura',
      date: '25 Nov 2023',
      time: '15:00 - 19:00',
      status: 'open',
      enrolled: 12,
      capacity: 16,
      refereeInitials: 'AJ',
      refereeName: 'A. Jiménez',
      action: 'edit',
    },
  ];

  protected readonly themeOptions: SelectOption[] = [
    { value: 'historia', label: 'Historia Universal' },
    { value: 'ciencias', label: 'Ciencias Naturales' },
    { value: 'literatura', label: 'Literatura Clásica' },
    { value: 'matematicas', label: 'Matemáticas Avanzadas' },
  ];

  protected panelOpen = signal(false);
  protected eventName = signal('');
  protected theme = signal('');
  protected maxPlayers = signal(8);
  protected questionsPerMatch = signal(10);
  protected maxScore = signal(1000);

  protected togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  protected progressOf(event: EventRow): number {
    return Math.round((event.enrolled / event.capacity) * 100);
  }
}
