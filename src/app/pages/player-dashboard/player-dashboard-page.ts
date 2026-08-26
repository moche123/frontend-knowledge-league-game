import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../shared/ui/side-nav/side-nav';
import { Tabs, TabItem } from '../../shared/ui/tabs/tabs';
import { TournamentCard } from '../../shared/ui/tournament-card/tournament-card';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1XINWzavwId3se-vwYMWWTdNIGQdnsy4L-3LGMVD39EqMIVWE5xnJz2j0PS4RBibmyc-6FXsDSTzqsqrvHhLWAcbzlEs_ILdKri7jd8bUlC4jWS79mfrq1R3c6hCCVumwb1ijJDhLoqEcOYei1EVY7Mj5fCDkAv70ut7Vs-b9DNb3dxNMJxe0ptzE-uP1LkSZl7cerpV_Pqzp_7r8mlytXE6PS9LSAbOZAMXCmyx_hNkNiktK5HDHlLYtw';

interface Tournament {
  id: string;
  category: string;
  categoryTone: 'primary' | 'secondary' | 'neutral';
  glowClass: string;
  progressTone: 'primary' | 'secondary' | 'error';
  title: string;
  points: number;
  date: string;
  enrolled: number;
  capacity: number;
}

@Component({
  selector: 'app-player-dashboard-page',
  imports: [Avatar, Button, Icon, NavItem, SideNav, Tabs, TournamentCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-dashboard-page.html',
})
export class PlayerDashboardPage {
  protected readonly logoUrl = LOGO_URL;

  protected readonly tabs: TabItem[] = [
    { id: 'open', label: 'Inscripción abierta' },
    { id: 'ongoing', label: 'En curso' },
  ];
  protected activeTab = signal('open');

  protected readonly tournaments: Tournament[] = [
    {
      id: 'hist-1',
      category: 'Edad Media',
      categoryTone: 'primary',
      glowClass: 'bg-primary',
      progressTone: 'primary',
      title: 'Olimpiada de Historia Universal',
      points: 500,
      date: '25 Oct, 2024',
      enrolled: 12,
      capacity: 16,
    },
    {
      id: 'sci-1',
      category: 'Física Cuántica',
      categoryTone: 'secondary',
      glowClass: 'bg-secondary',
      progressTone: 'secondary',
      title: 'Desafío de Ciencias Exactas',
      points: 750,
      date: '28 Oct, 2024',
      enrolled: 8,
      capacity: 20,
    },
    {
      id: 'lit-1',
      category: 'Realismo Mágico',
      categoryTone: 'neutral',
      glowClass: 'bg-outline',
      progressTone: 'error',
      title: 'Maestría Literaria',
      points: 400,
      date: '02 Nov, 2024',
      enrolled: 15,
      capacity: 15,
    },
  ];

  protected progressOf(tournament: Tournament): number {
    return Math.round((tournament.enrolled / tournament.capacity) * 100);
  }

  protected isFull(tournament: Tournament): boolean {
    return tournament.enrolled >= tournament.capacity;
  }
}
