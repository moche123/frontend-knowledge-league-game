import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { PublicUserDto, UserRole } from '../../../shared/dto/auth-response.dto';
import { CreatableRole } from '../../../shared/dto/create-user.dto';
import { Badge, BadgeVariant } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';
import { Tabs, TabItem } from '../../../shared/ui/tabs/tabs';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TopBar } from '../../../shared/ui/top-bar/top-bar';

const TABS: TabItem[] = [
  { id: 'list', label: 'Users' },
  { id: 'create', label: 'Create account' },
];

type TypeFilter = 'all' | UserRole;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'player', label: 'Players' },
  { value: 'referee', label: 'Referees' },
];

const ROLE_OPTIONS: { value: CreatableRole; label: string; icon: string }[] = [
  { value: 'player', label: 'Player', icon: 'person' },
  { value: 'referee', label: 'Referee', icon: 'gavel' },
];

const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  player: 'primary',
  referee: 'accent',
  admin: 'gold',
};

@Component({
  selector: 'app-admin-users-page',
  imports: [
    Badge,
    Button,
    ConfirmDialog,
    Icon,
    NavItem,
    SideNav,
    SideNavCommon,
    SideNavHeader,
    Tabs,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-users-page.html',
})
export class AdminUsersPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly tabs = TABS;
  protected readonly typeFilters = TYPE_FILTERS;
  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly roleBadge = ROLE_BADGE;

  protected activeTab = signal('list');
  protected typeFilter = signal<TypeFilter>('all');

  protected users = signal<PublicUserDto[]>([]);
  protected loadingUsers = signal(false);

  protected readonly filteredUsers = computed(() => {
    const filter = this.typeFilter();
    const list = this.users();
    return filter === 'all' ? list : list.filter((user) => user.role === filter);
  });

  protected userPendingDelete = signal<PublicUserDto | null>(null);
  protected deleting = signal(false);

  protected readonly deleteDialogMessage = computed(() => {
    const user = this.userPendingDelete();
    return user ? `Delete ${user.name} (${user.role})? This cannot be undone.` : '';
  });

  protected name = signal('');
  protected email = signal('');
  protected password = signal('');
  protected role = signal<CreatableRole>('player');
  protected creating = signal(false);

  protected readonly canCreate = computed(
    () =>
      !this.creating() &&
      this.name().trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim()) &&
      this.password().length >= 8,
  );

  constructor() {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loadingUsers.set(true);
    this.authService.listUsers('all').subscribe({
      next: (users) => {
        this.loadingUsers.set(false);
        this.users.set(users);
      },
      error: () => {
        this.loadingUsers.set(false);
        this.toastService.error('Could not load users.');
      },
    });
  }

  protected createUser(): void {
    if (!this.canCreate()) {
      return;
    }
    this.creating.set(true);
    this.authService
      .createUser({
        name: this.name().trim(),
        email: this.email().trim(),
        password: this.password(),
        role: this.role(),
      })
      .subscribe({
        next: (user) => {
          this.creating.set(false);
          this.toastService.success(`${user.name} created as ${user.role}.`);
          this.users.update((list) => [user, ...list]);
          this.name.set('');
          this.email.set('');
          this.password.set('');
          this.role.set('player');
          this.typeFilter.set('all');
          this.activeTab.set('list');
        },
        error: (error: { status?: number }) => {
          this.creating.set(false);
          this.toastService.error(
            error.status === 409
              ? 'That email is already registered.'
              : 'Could not create the account. Check the data and try again.',
          );
        },
      });
  }

  protected confirmDelete(user: PublicUserDto): void {
    this.userPendingDelete.set(user);
  }

  protected cancelDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.userPendingDelete.set(null);
  }

  protected deleteUser(): void {
    const user = this.userPendingDelete();
    if (!user || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.authService.deleteUser(user.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.userPendingDelete.set(null);
        this.users.update((list) => list.filter((u) => u.id !== user.id));
        this.toastService.success(`${user.name} deleted.`);
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        this.deleting.set(false);
        this.toastService.error(error.error?.message ?? 'Could not delete this user. Try again.');
      },
    });
  }

  protected goToEvents(): void {
    this.router.navigateByUrl('/events');
  }
}
