import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PublicUserDto } from '../../shared/dto/auth-response.dto';
import { RegisterDto } from '../../shared/dto/register.dto';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextField } from '../../shared/ui/text-field/text-field';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLNhHpTehXPrCCL1sS-uxUC_Rr3yKIHXvzDByw40wKyTJjJI52hAu3_-qZ3KV6ikUh3g-SK9FMOAIMF4uUB1YHsz-2O8pAz4AKlhpr6qb_dAsD_a7NoyEuvQGjCikBjpMqgrUy7i8pc3bg2HXP2oKrWqgqPNZNcB55sC0thErJ8xQqxTPHe8AF05NQBZj5100vAvFMR7PwY_4Z7mbZt8bu3xbnGBk2T0V420kUMzga5YQ2J1srYT-s';

const HOME_BY_ROLE: Record<PublicUserDto['role'], string> = {
  admin: '/events',
  referee: '/judge-panel',
  player: '/dashboard',
};

interface RegisterState {
  loading: boolean;
  error: string;
}

const IDLE_STATE: RegisterState = { loading: false, error: '' };

@Component({
  selector: 'app-register-page',
  imports: [AsyncPipe, Button, FormsModule, Icon, RouterLink, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register-page.html',
})
export class RegisterPage {
  protected readonly logoUrl = LOGO_URL;

  protected fullName = signal('');
  protected email = signal('');
  protected password = signal('');

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly submit$ = new Subject<void>();

  protected readonly state$ = this.submit$.pipe(
    switchMap(() => {
      const dto: RegisterDto = {
        name: this.fullName(),
        email: this.email(),
        password: this.password(),
      };

      return this.authService.register(dto).pipe(
        tap((user) => this.router.navigateByUrl(HOME_BY_ROLE[user.role])),
        // map(() => IDLE_STATE), — igual que en login-page: en éxito no reabrimos el
        // botón, evita la rendija de doble submit mientras el redirect todavía no terminó.
        switchMap(() => EMPTY),
        catchError((error: { status?: number }) =>
          of<RegisterState>({
            loading: false,
            error:
              error.status === 409
                ? 'That email is already registered.'
                : 'Could not create the account. Check your data and try again.',
          }),
        ),
        startWith<RegisterState>({ loading: true, error: '' }),
      );
    }),
    startWith(IDLE_STATE),
  );

  protected submit(): void {
    this.submit$.next();
  }
}
