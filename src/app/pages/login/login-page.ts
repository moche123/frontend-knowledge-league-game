import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { Tabs, TabItem } from '../../shared/ui/tabs/tabs';
import { TextField } from '../../shared/ui/text-field/text-field';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLNhHpTehXPrCCL1sS-uxUC_Rr3yKIHXvzDByw40wKyTJjJI52hAu3_-qZ3KV6ikUh3g-SK9FMOAIMF4uUB1YHsz-2O8pAz4AKlhpr6qb_dAsD_a7NoyEuvQGjCikBjpMqgrUy7i8pc3bg2HXP2oKrWqgqPNZNcB55sC0thErJ8xQqxTPHe8AF05NQBZj5100vAvFMR7PwY_4Z7mbZt8bu3xbnGBk2T0V420kUMzga5YQ2J1srYT-s';

@Component({
  selector: 'app-login-page',
  imports: [Button, Icon, Tabs, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
})
export class LoginPage {
  protected readonly logoUrl = LOGO_URL;
  protected readonly tabs: TabItem[] = [
    { id: 'login', label: 'SIGN IN' },
    { id: 'register', label: 'SIGN UP' },
  ];

  protected activeTab = signal('login');

  protected email = signal('');
  protected password = signal('');
  protected fullName = signal('');
  protected registerEmail = signal('');
  protected registerPassword = signal('');
}
