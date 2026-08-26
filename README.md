# Frontend — Knowledge League

Angular 22, generated with Angular CLI. Styled with Tailwind CSS (`@theme` in `src/styles.css`, tokens defined in `design-system.md` — "Academic Elite" palette, dark-mode-first).

## Current status

Mock screens only, **100% visual, no functional logic yet**: no connection to the backend (`backend/`), no real auth, no state shared between pages — each page carries its own hardcoded data in the component.

- Basic routing in `src/app/app.routes.ts`, all pages lazy-loaded standalone:
  - `/login` — login (mock)
  - `/dashboard` — player dashboard
  - `/answer-question` — a match's questionnaire
  - `/disputes` — dispute chat
  - `/judge-panel` — referee panel
  - `/ranking` — global ranking (podium + table)
  - `/events` — events management (admin)
- Page components in `src/app/pages/*`, shared UI atoms (avatar, badge, chat-panel, side-nav, podium-slot, etc.) in `src/app/shared/ui/*`.
- Responsive shell: `app-side-nav` (`host: { class: 'contents' }`) injects the mobile topbar + fixed sidebar as direct children of each page's wrapper — each page's root wrapper needs `flex flex-col md:flex-row` so the layout stacks correctly on mobile.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
