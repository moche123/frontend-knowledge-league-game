import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage) },
  {
    path: 'answer-question',
    loadComponent: () => import('./pages/answer-question/answer-question-page').then((m) => m.AnswerQuestionPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/player-dashboard/player-dashboard-page').then((m) => m.PlayerDashboardPage),
  },
  {
    path: 'disputes',
    loadComponent: () => import('./pages/dispute-chat/dispute-chat-page').then((m) => m.DisputeChatPage),
  },
  {
    path: 'judge-panel',
    loadComponent: () => import('./pages/judge-panel/judge-panel-page').then((m) => m.JudgePanelPage),
  },
  {
    path: 'ranking',
    loadComponent: () => import('./pages/global-ranking/global-ranking-page').then((m) => m.GlobalRankingPage),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./pages/events-management/events-management-page').then((m) => m.EventsManagementPage),
  },
];
