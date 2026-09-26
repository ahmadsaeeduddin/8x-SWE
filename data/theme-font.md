# UI Theme & Typography Guide

This file defines the visual language to follow across the product.

## Fonts

Use the same font setup throughout the app:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Font roles

| Role | Font | Weights | Usage |
|---|---|---:|---|
| Display / titles | Space Grotesk | 500, 600, 700 | `h1`, `h2`, page titles, meeting names, card labels. Use tight tracking around `-0.025em` to `-0.035em`. |
| Body / UI | Inter | 300–700 | Default body text, buttons, descriptions, navigation, form content. Subtitles can use weight `300`. |
| Labels / HUD | JetBrains Mono | 400, 500 | Eyebrows, tags, chips, timestamps, keyboard hints. Prefer uppercase with wide letter spacing around `0.2em` to `0.42em`. |

```css
font-family: 'Inter', system-ui, sans-serif;            /* body */
font-family: 'Space Grotesk', sans-serif;               /* headings */
font-family: 'JetBrains Mono', ui-monospace, monospace; /* labels */
```

## Color Tokens

```css
:root {
  /* Surfaces */
  --bg: #05050a;
  --bg-2: #0a0a12;
  --bg-page-top: #05050c;
  --surface: #0d0d13;
  --surface-2: #14141c;
  --surface-glass: rgba(20, 20, 28, 0.65);
  --ink-on-accent: #0a0a0f;

  /* Text */
  --fg: #eef1f6;
  --muted: #7a808c;
  --fg-65: rgba(255, 255, 255, 0.65);
  --fg-55: rgba(255, 255, 255, 0.55);
  --fg-50: rgba(255, 255, 255, 0.50);
  --fg-35: rgba(255, 255, 255, 0.35);
  --fg-28: rgba(255, 255, 255, 0.28);

  /* Brand */
  --accent: #ff7a1a;
  --accent-2: #64d3ff;
  --danger: #ff3b3b;

  /* Lines */
  --line: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(255, 255, 255, 0.15);
  --line-dashed: rgba(255, 255, 255, 0.22);

  /* Accent washes */
  --accent-06: rgba(255, 122, 26, 0.06);
  --accent-10: rgba(255, 122, 26, 0.10);
  --accent-12: rgba(255, 122, 26, 0.12);
  --accent-35: rgba(255, 122, 26, 0.35);
  --accent-glow: rgba(255, 122, 26, 0.50);
  --cyan-glow: rgba(100, 211, 255, 0.60);
}
```

## Buttons and Pills

Primary buttons and pills should use:

- Background: `#ff7a1a`
- Text: `#0a0a0f`
- Hover glow:

```css
box-shadow: 0 8px 30px rgba(255, 122, 26, 0.45);
```

Use orange for primary actions only. Avoid using it everywhere.

## Page Background

The main page background should feel dark, premium, and slightly atmospheric.

Use:

- Base background: `#05050a`
- Orange wash in the top-right: `rgba(255,122,26,0.09)`
- Cyan wash in the bottom-left: `rgba(100,211,255,0.05)`
- Very faint 56px grid: `rgba(255,255,255,0.028)`

Keep the effects subtle so the content remains the focus.

## Tailwind-style Theme Map

```ts
colors: {
  background: '#05050a',
  surface: {
    DEFAULT: '#0d0d13',
    raised: '#14141c',
  },
  foreground: '#eef1f6',
  muted: '#7a808c',
  accent: {
    DEFAULT: '#ff7a1a',
    foreground: '#0a0a0f',
  },
  cyan: '#64d3ff',
  danger: '#ff3b3b',
  line: 'rgba(255,255,255,0.08)',
}

fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['"Space Grotesk"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
}
```

## Visual Direction

The product should consistently use this core palette:

`#05050a / #eef1f6 / #7a808c / #ff7a1a / #64d3ff`

And these fonts:

`Inter + Space Grotesk + JetBrains Mono`

The visual direction should be:

- dark and premium
- clean SaaS layout
- restrained use of orange
- subtle cyan accents
- strong hierarchy through typography
- soft glass / raised card surfaces
- low-contrast borders
- minimal decorative effects
- responsive and readable before visually flashy

Any flame, smoke, or rocket-style visual effects are decorative only and are not part of the core UI theme.
