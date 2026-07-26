## Components

The reusable pieces — the code mirror of the Figma components. Each consumes **semantic tokens only** (never raw values), so the whole set re-skins from `tokens/`.

### One folder per component

```
Button/
  Button.tsx        the component — variants + states
  Button.css.ts     its styles, referencing vars.* only
```

Variants and states (hover / selected / pressed / disabled / focus) live inside the component's own folder — everything that changes together stays together. `index.ts` barrel-exports the set: `import { Button, Menu } from '@/design'`.

### Boundary

This folder holds **reusable** primitives. App-specific composite views (Sidebar, DetailPane, the page editor) live under `renderer/src` and *consume* these. Folders are created when a component is built — not before.

### PreviewPane

The floating-window surface every in-app window mounts: the glass shell and per-window geometry, the dismissal contract, a toolbar in a full-width **band** or corner-pinned **floating** form, left/right side slots each **overlay** or **in-flow**, an optional collapsing footer, and the glass tint as a property. A window supplies its interior and its own padding; the surface owns every position, transition, and driver var. Side-pane widths persist per slot id, so two windows naming the same id share one remembered width.
