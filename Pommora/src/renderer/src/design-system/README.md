## Design System

The Pommora design system — the **code mirror of the Figma Component Library**. One place that owns every design value and reusable piece, so the app stays DRY: edit a value here and it propagates everywhere that references it.

### The model

Two tiers, one direction of reference:

- **Primitives** — raw values (a gray step, a type size). The bottom layer; never referenced directly by components.
- **Semantic tokens** — meaningful aliases that point at primitives (a surface background, a headline style). This is the vocabulary the rest of the app speaks.

Components reference **only** semantic tokens — never a raw hex or px. Re-skinning the app is then a matter of repointing a few semantic tokens.

### Layout

- `tokens/` — the variables (colors, typography, spacing, radius, shadow, motion, z). See `tokens/README.md`.
- `components/` — the reusable pieces. A component that carries several files gets its own folder; a single-file one sits flat beside its stylesheet.
- `symbols/` — the curated icon registry. Full spec → `.claude//Features//SymbolsPM.md`.

### The rule

**Components reference semantic tokens only** — the token, never the literal it resolves to. This is the one rule that keeps a re-skin from becoming a search-and-replace.

### Tooling

Tokens are authored with **vanilla-extract** (`@vanilla-extract/css`): each token file is a readable `name: value` list that compiles to real CSS variables *and* exposes a typed `vars` object, so a mistyped token name is a compile error. Consumers import from `@renderer/design-system/tokens`.

A live showcase renders the token set and the component gallery — `npm run showcase`.
