import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { HOME_BY_ROLE } from '../../core/auth/home-by-role';
import { Icon } from '../../shared/ui/icon/icon';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VfZn7tvKkgvHuuQKtXqRnKjpRmLo00dkkNAZLdxIJ-naFSvbZ4p2JyfNRhUOTGIt9uFYSPm07Q5xce-u0Ro3sgN9VLENlr_WcJjR29iEK3thb0vbHDYFt74NersnqNtgX_u6xIypDFG2TTyzmw0rNUflaqfozvHpzmUsPKBGqPQNz3XKUyn3r4zbFPs5aTUlrboAjHMiD0Qc6emJ-tIz6basID2np-D8SFhpnzj0YtDoSZ52k3mYATMDY';

@Component({
  selector: 'app-not-found-page',
  imports: [Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found-page.html',
})
export class NotFoundPage {
  private readonly authService = inject(AuthService);

  protected readonly logoUrl = LOGO_URL;

  protected readonly homeUrl = computed(() => {
    const user = this.authService.currentUser();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  });
}
