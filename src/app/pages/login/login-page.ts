import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginDto } from '../../shared/dto/login.dto';
import { PublicUserDto } from '../../shared/dto/auth-response.dto';
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

interface LoginState {
  loading: boolean;
  error: string;
}

const IDLE_STATE: LoginState = { loading: false, error: '' };

@Component({
  selector: 'app-login-page',
  imports: [AsyncPipe, Button, FormsModule, Icon, RouterLink, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
})
export class LoginPage {
  protected readonly logoUrl = LOGO_URL;

  protected email = signal('');
  protected password = signal('');

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly submit$ = new Subject<void>();

  protected readonly state$ = this.submit$.pipe(
    // - mergeMap — corre todos los HTTP calls en paralelo, sin cancelar nada. Si el usuario clickea submit dos veces rápido, tenés 2 requests en vuelo. Si la primera responde
    //  después que la segunda (orden de red no garantizado), tu state$ termina mostrando el resultado viejo pisando al nuevo — race condition real.
    // - concatMap — encola, espera que termine la primera antes de arrancar la segunda. Evita la race, pero si la primera tarda, la segunda queda esperando en cola en vez de
    // reemplazarla — no tiene sentido reintentar un login viejo con datos que ya cambiaste.
    // - exhaustMap — ignora clicks nuevos mientras hay uno en vuelo (no cancela, no encola, directo lo tira). Es candidato válido acá también, y hasta más "correcto" semánticamente
    //  para un POST que muta estado en el server (login/register): no cancelás una request que el server ya puede estar procesando.
    // - switchMap — cancela la anterior, dispara con los valores más frescos de email()/password(). Si el segundo click trae datos distintos, es lo único que realmente importa; la
    // respuesta del primero, aunque llegue tarde, se descarta.
    switchMap(() => {
      const dto: LoginDto = { email: this.email(), password: this.password() };

      return this.authService.login(dto).pipe(
        tap((user) => this.router.navigateByUrl(HOME_BY_ROLE[user.role])),
        // map(() => IDLE_STATE), — volvía loading:false apenas resolvía, antes de que
        // terminara la navegación: dejaba una rendija para un click2 legítimo que
        // disparaba un segundo login real. En éxito no hace falta "liberar" el botón,
        // nos estamos yendo de la página igual.
        switchMap(() => EMPTY),
        catchError(() => of<LoginState>({ loading: false, error: 'Invalid email or password.' })),
        startWith<LoginState>({ loading: true, error: '' }),
      );
    }),
    startWith(IDLE_STATE),
  );

  protected submit(): void {
    this.submit$.next();
  }
}
