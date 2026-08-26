name: Academic Elite
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#1f1f21'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#343536'
  on-surface: '#e4e2e4'
  on-surface-variant: '#c5c6cd'
  inverse-surface: '#e4e2e4'
  inverse-on-surface: '#303032'
  outline: '#8f9097'
  outline-variant: '#44474d'
  surface-tint: '#b9c7e4'
  primary: '#b9c7e4'
  on-primary: '#233148'
  primary-container: '#0a192f'
  on-primary-container: '#74829d'
  inverse-primary: '#515f78'
  secondary: '#b5c7ea'
  on-secondary: '#1e314c'
  secondary-container: '#354764'
  on-secondary-container: '#a3b6d8'
  tertiary: '#e7bf99'
  on-tertiary: '#432b10'
  tertiary-container: '#281400'
  on-tertiary-container: '#9d7b5a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#b5c7ea'
  on-secondary-fixed: '#071c36'
  on-secondary-fixed-variant: '#354764'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#e7bf99'
  on-tertiary-fixed: '#2b1701'
  on-tertiary-fixed-variant: '#5d4124'
  background: '#131315'
  on-background: '#e4e2e4'
  surface-variant: '#343536'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px

---

## Brand & Style
The design system is built for a high-stakes competitive environment where knowledge is the ultimate currency. The visual narrative combines the prestige of traditional academia with the precision of a high-tech AI platform. 

The style is **Modern Corporate with high-tech accents**, utilizing a "Dark Mode First" aesthetic for the global interface while employing crisp, high-contrast light surfaces for focus-heavy content like exams and evaluation reports. The goal is to evoke a sense of "The Digital Coliseum"—a place that feels exclusive, elite, and intellectually rigorous. We utilize sharp geometry, subtle glowing accents to signify AI presence, and a clear hierarchy that prioritizes data density without sacrificing readability.

## Colors
The palette is rooted in a "Deep Sea" navy logic to provide a stable, trustworthy foundation. 

- **Primary & Secondary**: These form the core of the "Dark Mode" environment, used for backgrounds, sidebars, and deep interface layers.
- **Accent (Electric Blue)**: Reserved for interactive elements, AI-driven insights, and active progress states. It should "pop" against the dark background.
- **Honor (Gold)**: Used exclusively for rewards, high-rank badges, and winning states to signify achievement and prestige.
- **Surface**: Pure white is used for the "Test Paper" metaphor. When a user is in a deep focus state (taking a tournament or reading an evaluation), the UI transitions to high-contrast white cards to mimic the clarity of a physical document.

## Typography
The typography strategy balances authority and utility. **Montserrat** is utilized for headlines to provide a bold, geometric, and "institutional" feel that commands attention. **Inter** is used for all functional text and body copy to ensure maximum legibility during intense reading sessions.

For tournament headers, use `label-caps` to create a sense of categorization and rigor. Maintain high contrast between headings and body text to guide the eye through complex AI evaluations.

## Layout & Spacing
This design system utilizes a **12-column fixed grid** for desktop, centering the content to maintain a focused, scholarly feel. 

- **Tournament Focus**: When a user is in "Knowledge Mode" (taking a test), the layout should narrow to a single column (max-width 800px) to minimize peripheral distractions.
- **Dashboard View**: Uses a standard modular grid.
- **Rhythm**: All spacing follows an 8px baseline. Use `stack-lg` for separating major content sections and `stack-sm` for related metadata (e.g., a question and its category label).

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **High-Contrast Overlays**:

1.  **Environment**: The lowest layer is the Navy Blue gradient background.
2.  **Containers**: Secondary Blue surfaces sit slightly above the background with a 1px border of the same color (slightly lightened) to define edges.
3.  **Active Focus (The "Paper")**: White cards sit at the highest elevation. They do not use shadows; instead, they use a stark contrast against the dark background to "pop" forward, focusing the user's brain on the task.
4.  **Interactive Elements**: Buttons and active inputs use a subtle outer glow of the Accent color (`#64FFDA`) rather than a traditional drop shadow, signifying the "AI-powered" nature of the platform.

## Shapes
The shape language is **Technical and Precise**. 

We use "Soft" (0.25rem) corner radiuses to maintain a professional, serious tone. Avoid fully rounded pill shapes except for status indicators (chips). The slight roundness prevents the UI from feeling "hostile" or "brutalist," but keeps it grounded in an institutional aesthetic. Large containers (like the main test card) should use `rounded-lg` (0.5rem) to feel like a sturdy, physical object.

## Components
- **Buttons**: Primary buttons are solid Accent Blue with dark text. Secondary buttons are outlined in the Accent color. For "Honor" actions (Claim Trophy), use the Gold palette.
- **Cards**: Use white backgrounds for content that requires intense reading (Questions, Reports) and Secondary Blue for navigational cards (Tournament selection, Profile).
- **AI Evaluator Chips**: Small, pill-shaped indicators with a subtle pulse animation or gradient background of the Accent color to show where AI is currently processing or providing feedback.
- **Input Fields**: Must feel "technical." Use dark backgrounds with the Accent color for the bottom border or focus ring.
- **Progress Bars**: Multi-segment bars. Completed segments should use the Accent color, while the "Current" segment has a slight glow.
- **Leaderboards**: Use high-density lists. The top 3 performers should be highlighted with Gold (#F1C40F) accents and slightly increased vertical padding to denote status.