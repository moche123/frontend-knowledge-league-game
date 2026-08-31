import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly logoUrl = LOGO_URL;

  protected readonly tabs: TabItem[] = [
    { id: 'open', label: 'Open Registration' },
    { id: 'ongoing', label: 'Ongoing' },
  ];
  protected activeTab = signal('open');

  protected readonly tournaments: Tournament[] = [
    {
      id: 'hist-1',
      category: 'Middle Ages',
      categoryTone: 'primary',
      glowClass: 'bg-primary',
      progressTone: 'primary',
      title: 'World History Olympiad',
      points: 500,
      date: '25 Oct, 2024',
      enrolled: 12,
      capacity: 16,
    },
    {
      id: 'sci-1',
      category: 'Quantum Physics',
      categoryTone: 'secondary',
      glowClass: 'bg-secondary',
      progressTone: 'secondary',
      title: 'Exact Sciences Challenge',
      points: 750,
      date: '28 Oct, 2024',
      enrolled: 8,
      capacity: 20,
    },
    {
      id: 'lit-1',
      category: 'Magical Realism',
      categoryTone: 'neutral',
      glowClass: 'bg-outline',
      progressTone: 'error',
      title: 'Literary Mastery',
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

  protected goToRanking(): void {
    this.router.navigateByUrl('/ranking');
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
