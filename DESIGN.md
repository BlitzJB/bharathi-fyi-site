# Design system

## Palette (warm paper and ink)

Defined in app/globals.css as CSS variables:

- `--color-paper`: warm off-white page ground
- `--color-surface`: slightly raised warm neutral
- `--color-ink`: near-black warm ink (never #000)
- `--color-ink-soft`: secondary text
- `--color-ink-faint`: tertiary text, labels
- `--color-line`: hairline borders
- `--color-accent` / `--color-accent-ink`: blueprint ultramarine (#2e3fd3
  family), the single accent; used sparingly (links, live indicators,
  citation chips)

Strategy: Restrained. Tinted neutrals plus one accent under 10% of any
surface. Red family reserved for genuine alerts only.

## Typography

- Display: Bricolage Grotesque (headings, hero)
- Body: Geist Sans
- Data/labels: Geist Mono, 10 to 11px uppercase tracked labels for
  metadata, tabular numerals for figures
- Hierarchy via scale + weight; body max ~70ch

## Structure

- Hairline dividers (`divide-line`, `border-line`) instead of cards
- No shadows beyond a soft sm on floating panels; no glass, no gradients
- Uppercase mono micro-labels above content blocks
- Generous vertical rhythm; sections breathe

## Motion

- `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1)`
- 150 to 350ms; opacity/transform only; `motion-reduce` respected
- `rise-in` staggered entrance used on the lander

## Components of note

- Chat panel: assistant-ui-derived composer, citation chips with hover
  source cards, CACHED badge, mono control buttons (history, + new chat)
- /ops: instrument-panel aesthetic, same paper/ink language as the lander
