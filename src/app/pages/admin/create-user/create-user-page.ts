import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/toast/toast.service';
import { CreatableRole } from '../../../shared/dto/create-user.dto';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { NavItem } from '../../../shared/ui/nav-item/nav-item';
import { SideNav } from '../../../shared/ui/side-nav/side-nav';
import { SideNavCommon } from '../../../shared/ui/side-nav-common/side-nav-common';
import { SideNavHeader } from '../../../shared/ui/side-nav-header/side-nav-header';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { TopBar } from '../../../shared/ui/top-bar/top-bar';

const ROLE_OPTIONS: { value: CreatableRole; label: string; icon: string }[] = [
  { value: 'player', label: 'Player', icon: 'person' },
  { value: 'referee', label: 'Referee', icon: 'gavel' },
];

@Component({
  selector: 'app-create-user-page',
  imports: [Button, Icon, NavItem, SideNav, SideNavCommon, SideNavHeader, TextField, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-user-page.html',
})
export class CreateUserPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly roleOptions = ROLE_OPTIONS;

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
          this.name.set('');
          this.email.set('');
          this.password.set('');
          this.role.set('player');
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

  protected goToEvents(): void {
    this.router.navigateByUrl('/events');
  }
}
