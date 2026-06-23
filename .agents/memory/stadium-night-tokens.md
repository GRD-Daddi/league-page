---
name: Stadium Night design tokens
description: Color palette, typography, and component conventions for the Stadium Night visual theme applied to the main app.
---

# Stadium Night Design Tokens

The app uses a dark, electric sports-broadcast aesthetic ("Stadium Night"). All future UI work should stay consistent with these tokens.

## Colors
- `#0a0a0c` — page background (deepest black)
- `#0f1115` — surface / card background
- `#1a1d24` — elevated surface (table headers, hover states)
- `#1f2937` — border color
- `#374151` — border hover / muted divider
- `#00f0ff` — cyan accent (primary interactive, links, active states)
- `#ccff00` — lime accent (primary CTA buttons, win streak, highlights)
- `#7000ff` — purple accent (secondary stat, badge backgrounds)
- `#ef4444` — red (drop transactions, losing streaks)
- `#6b7280` — muted text / labels
- `#9ca3af` — secondary text
- `#e5e7eb` — primary body text
- `#fff` — high-contrast text

## Typography
- Headings: `font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.03em; line-height: 0.88`
- Section titles: same pattern, smaller sizes
- Nav links: `font-weight: 700; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase`
- Labels/badges: `font-weight: 900; letter-spacing: 0.15–0.2em; text-transform: uppercase; font-size: 11px`
- Monospace numbers: `font-family: monospace; font-weight: 700`

## Key Components
- **CTA buttons**: `background: #ccff00; color: #000; transform: skewX(-10deg)` with inner `<span>` counter-skewed `skewX(10deg)`
- **Outline buttons**: `border: 1px solid #1f2937; color: #fff;` hover `#1f2937` bg, `#00f0ff` text
- **Cards/panels**: `background: #0f1115; border: 1px solid #1f2937; border-radius: 12px`
- **Table rows**: hover `background: #1a1d24`; active text turns `#00f0ff`
- **Live badge**: purple bg + lime text + pulsing dot

## Nav
- Nav background: `#0a0a0c` sticky, `border-bottom: 1px solid #1f2937`
- Brand mark: gradient `#00f0ff → #7000ff`, skewed `-10deg`, cyan glow shadow
- SMUI tab overrides: active label `#fff`, hover `#00f0ff`, indicator `#00f0ff`

**Why:** User selected this design from exploration mockups and it was graduated to the main app. All pages should feel consistent with this aesthetic.

**How to apply:** When building new pages or components, reference these tokens instead of introducing new colors. Use `#ccff00` for primary actions, `#00f0ff` for interactive links/active states.
