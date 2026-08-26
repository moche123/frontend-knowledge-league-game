import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { CountdownTimer } from '../../shared/ui/countdown-timer/countdown-timer';
import { Icon } from '../../shared/ui/icon/icon';
import { Textarea } from '../../shared/ui/textarea/textarea';

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1XINWzavwId3se-vwYMWWTdNIGQdnsy4L-3LGMVD39EqMIVWE5xnJz2j0PS4RBibmyc-6FXsDSTzqsqrvHhLWAcbzlEs_ILdKri7jd8bUlC4jWS79mfrq1R3c6hCCVumwb1ijJDhLoqEcOYei1EVY7Mj5fCDkAv70ut7Vs-b9DNb3dxNMJxe0ptzE-uP1LkSZl7cerpV_Pqzp_7r8mlytXE6PS9LSAbOZAMXCmyx_hNkNiktK5HDHlLYtw';

@Component({
  selector: 'app-answer-question-page',
  imports: [Avatar, Badge, Button, CountdownTimer, Icon, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './answer-question-page.html',
})
export class AnswerQuestionPage {
  protected readonly logoUrl = LOGO_URL;
  protected readonly questionNumber = 3;
  protected readonly questionCount = 5;
  protected readonly question =
    '¿Cuál es el principio fundamental que establece que es imposible conocer simultáneamente con precisión arbitraria la posición y el momento de una partícula?';

  protected answer = signal('');
  protected canSubmit = computed(() => this.answer().trim().length > 0);
}
