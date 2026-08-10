## Design System

The Pommora design system — the code mirror of the Figma "Pommora - React" library. Tokens come in two tiers: raw **primitives**, and the meaningful **semantic** aliases built on them. Typography has its own spec: `TypographyPM.md`.

### Design Philosophy

Apple's design language, and **macOS Tahoe** in particular, is the north star — **near-identical by intent**: restraint, depth through material over ornament, quiet precision. We mirror that feel rather than reinvent it.

Where the web platform opens doors — richer motion, interaction, and layout — we treat them as **additive prospects**, adopted only when they deepen the Apple-grade minimalism, never when they clutter it. Simplicity is the constraint, not the compromise.

### Source of Truth

The Figma library is canonical for design *values*; this repo mirrors them as tokens, and a value changes in Figma first. Figma is also the visual reference for components.

### Tooling

- **vanilla-extract** — token files are `*.css.ts`; the theme primitives emit real CSS variables **and** a typed `vars` object, so a mistyped token is a compile error. The plugin is wired into the renderer Vite config.
- **Inter** (variable font) covers the four weights the type ramp uses and is set as the app font.

The design system lives in `src/renderer/src/design-system/`. Stacking is named rather than numbered: separate ladders for the shell frame's in-flow chrome, a component's lift over its own siblings, and the fixed or portalled top layer — so a new surface picks a rung instead of inventing a z-index, and a step only ranks against others in its own ladder.

### Color

Three primitives carry the dark system: a neutral grey, a near-white, and a black. Fills, separators, and the hover / selected states are that one grey at fixed opacities; the label tones are the near-white at descending opacities; the de-emphasis veil is the black. Surfaces and the spectrum solids are their own opaque values, not derivations.

Within the grey, **strokes sit above fills** — a separator reads harder than the surface it divides, so an edge stays legible against the fill it borders rather than dissolving into it. Text doesn't compete on that scale at all: labels ride the near-white, which is why the lightest label still reads over the heaviest fill.

#### Semantic Surface Roles

Surfaces are addressed by **role**, not by literal shade. The window is the app substrate that everything sits on; **primary / secondary / tertiary** surfaces are progressively-lifted content layers above it. Components reference the role; the shade behind each role lives in the token files.

#### Fills, States, Separators

- **Fills** — overlay fills over a surface, in a ramp from most to least present.
- **States** — `hover` and `selected` are the grey at low opacities, selection sitting just above hover; `muted` is the black veil that dims a surface a step darker.
- **Separators** — lines, borders, and segment dividers, the same grey at their own fixed opacities.

#### Solid Spectrum

A fixed palette of named solids — the source colors for accents and chips. The names and their values live in the token files / Figma.

#### Accent

The accent is a **single user value**. Components reference one accent token plus two derivations: a **fixed-opacity tint** for accented fills, and the accent itself for accented text — so changing the accent recolors every accented surface at once. The per-Nexus choice is any spectrum solid or **`system`**, stored in `.nexus/settings.json` and validated on read. `system` resolves to the OS accent color; macOS has no live accent-change event, so it's read at load.

#### Chips

A chip's color is the picked base solid at fixed opacities — a heavier fill, a lighter stroke, and a near-white text wash with a faint tint of the base. No custom colors and no lightening; one tint recipe drives every chip color, and it composes with any shape. The shapes are a small fixed set: a pill, a squared-off label for select values, a Context reference chip wearing its color on border and text over a neutral fill, an icon-only capsule, and a rounded square holding one glyph (the checkbox look). The opacities and dimensions live in the token files / Figma.

#### Labels

Text color is separate from surface color: three label tones — primary, secondary, tertiary — are one near-white base at descending opacities. A fourth, **control**, is the chrome-glyph tint, published once as a global `--label-control`.

### Glass

Two recipes in `materials/`. **Frost** is a blur plus a slight dimming of what's behind, carrying its drop shadow from the shadow tokens — the standard resting shadow, or the lift shadow on dragged chrome; it dresses the window tier, the panel and popover surfaces, the dropdown pane, and the drag ghost (a filled, edge-free parameterization), each kept as its own component so a tier can diverge later. The **liquid** recipe is Apple **"Liquid Glass"** — a real edge-refraction over the live app — worn by the in-use button controls and by the small on-control segments, whose optics are spread from the controls' so the two stay one source. Layout is always the consumer's.

**Voiding Liquid Glass can't be done in place** — its `backdrop-filter` displacement is a dynamically-generated SVG filter id CSS can neither reconstruct nor interpolate. So the inspector "swallow" renders the pill as a **two-layer** control, a fading glass layer behind a solid bare-button layer, rather than fading one fused control.

**Scrollbars are hidden app-wide** — Electron's default Chromium bar reads heavy and the native auto-hiding overlay isn't reliably available, so scrolling is trackpad and wheel only.

### Icons

Icons are **Lucide**, resolved through one `Icon` component against the curated `design-system/symbols` registry. Full spec → `SymbolsPM.md`.

### Showcase

A data-driven design-system site (`npm run showcase`): each leaf iterates its own registry, so a new token group appears by adding one line. It includes a live accent picker and builds to a static site deployed at https://pommora-design-system.vercel.app.

### Components

The reusable pieces mirror the Figma library. The shape they're built toward is one folder per component consuming **semantic tokens only** — the intent the set converges on rather than a rule the folder already holds throughout. Shared helpers sit loose beside them by necessity: a vanilla-extract stylesheet may export only plain values, so a helper that *builds* a declaration lives next to the stylesheet rather than inside it. This doc governs the tokens and materials components consume, not the roster; a component's own behaviour lives in its spec (motion → `InteractionPM.md`; the editor → `MarkdownPM.md`; the table → `TableViewPM.md`).

**The ActionBand** (`Detail/ActionBand.css`) is the shared home for toolbar-row affordances any surface mounts — **ViewSegments** first (the view-switcher segment chassis: hairline border whose stroke is the one place a view's chip color lands, active lift on the selected fill, create/delete slide) plus the hover-revealed settings button, whose reveal *scope* each host binds itself while the chrome stays shared. A segment's collapsible title rides Segmented-Controls' `labelSlot` — the 1fr→0fr grid morph on the `titleReveal` timing is written exactly once, and the toolbar view button, the embed segments, and the embed's dropdown-mode button all mount that same slot.

**The dropdown shell** splits in two. `MenuSurface` is the pane itself — the notched glass, its open and retract beats — and stays free of state, because the toolbar trio shares a single dismiss region across two panes and owns that state itself. `MenuDropdown` is the shell around a trigger: it holds the open state, the outside-dismiss, the retract beat, and the anchored surface, and optionally bounds the pane's growth so its right edge keeps a stated gap from the window. It carries no styling of its own, so surface-specific geometry stays with the surface that means it.

**The disclosure step** is one literal: `DISCLOSURE_INDENT` in the size tokens, bridged to `--disclosure-indent`. Every hierarchy — the sidebar tree, table group nesting, pane disclosure runs and their rail — derives its per-level inset from it, so a new disclosing surface reads the token rather than minting its own step.

### Pending

- **Spacing and radius** — no formalized scale; corners and spacing stay ad-hoc literals until they're lifted from Figma.
- **Light/dark theming** — a future seam; the system is dark-only.
- **Accent editing UI** — deferred; the control surface is the config file.
