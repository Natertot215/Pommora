## PreviewPane — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. This is a **behavior-preserving refactor** — the deliverable is two windows that look and behave identically over a shared component, not new UI.

**Goal:** Extract the floating-window surface shared by the Page Preview and the NavWindow into one reusable `PreviewPane` component — chassis, toolbar, side panes, footer, and glass tint — so any future floating surface (Settings, popups) mounts to it instead of copying it.

**Architecture:** `PreviewPane` absorbs the existing `FloatingPaneShell` and becomes the single floating-window component. It owns the glass + geometry + dismissal contract, a three-slot overlay toolbar, two side-pane slots (left/right, each overlay or in-flow), an optional collapsing footer, and the glass tint as a prop. Hosts supply content and which buttons appear; the component owns every position, transition, and var.

**Tech Stack:** React 19 · TypeScript · plain CSS with stable class names · vanilla-extract only where it already exists · Vitest · Biome (hook-formatted — never hand-run).

### Global Constraints

- **Behavior-preserving.** Both windows must be pixel-and-motion identical after migration. Any visible change is a defect, not an improvement, unless Nathan signs off on it separately.
- **`--io` shielding is load-bearing.** `--io` is a registered *inheriting* property declared app-wide (`styles.css`) and consumed by the main `InspectorPanel` and `ToolbarTrio`. `PreviewPane` must declare its own `--io` on its root or the app inspector's state leaks into every floating window.
- **The root element must be reachable by ref.** The engulf FLIP and the nav morph both resolve the window root by walking `.parentElement` from an inner ref. The component exposes a real root ref; both hosts switch to it. No wrapper div may be added between the glass root and the host's children without this.
- **Never hand-run Biome.** An `Edit` failing on whitespace means the hook reformatted — re-read and retry.
- **Tokens only.** Durations, easings, colors, insets come from `design-system/tokens`. No hand-rolled values.
- **Comments:** why-only, 1–2 lines. No restating what the code shows. No references to this plan.
- **Naming flag (standing, not blocking):** `PreviewPane` is the name Nathan chose. It reads as a misnomer once Settings mounts on it — the component is a floating-window chassis, not a preview. Proceeding as directed; revisit only if Nathan raises it.

### File Structure

**Create**

- `src/renderer/src/design-system/components/PreviewPane/PreviewPane.tsx` — the component.
- `src/renderer/src/design-system/components/PreviewPane/previewPane.css` — its stylesheet, stable `.ppane-*` names.

**Plain CSS, not vanilla-extract.** Hosts must target the pane's parts from their own stylesheets (`.navwindow .ppane-toolbar { … }`), and the whole floating-window ecosystem already speaks in stable class names and CSS-var contracts. Generated class names would force every host rule through a passed-in `className` prop. This matches `SidePane`, the other shared shell.

**Delete**

- `src/renderer/src/design-system/components/FloatingPane/FloatingPane.tsx`
- `src/renderer/src/design-system/components/FloatingPane/floatingPane.css.ts`

**Modify**

- `src/renderer/src/PagePreview/PreviewWindow.tsx` + `previewWindow.css` — migrate, strip duplicated chassis.
- `src/renderer/src/NavWindow/NavWindow.tsx` + `navWindow.css` — migrate, strip duplicated chassis.
- `src/renderer/src/styles.css` — register `--io-l` for a left overlay slot.
- `src/renderer/src/Embeds/embeds.css` — one shared embed-grows-in-scroller rule.

**Relocate**

- The tab-strip CSS (`.pgpreview-tabwrap` / `-tabscroll` / `-tabstrip` / `-crumbs`) out of `previewWindow.css` into a `previewTabStrip.css` beside its component — it's shared by both windows and has nothing to do with either window's shell.

---

### Task 0: Capture the Behavioral Baseline

**Nothing is written until this exists.** This is a refactor of two visually intricate windows; without ground truth there is no way to prove nothing moved. This task produces evidence, not code.

**Files:** none — outputs to the scratchpad.

- [ ] **Step 1: Launch the dev app against the throwaway nexus**

The CDP harness needs dev mode (`window.__pommora` is `import.meta.env.DEV`-gated) and must never point at the real Nexus.

```bash
env -u ELECTRON_RUN_AS_NODE npx electron-vite dev -- --remote-debugging-port=9223
```

- [ ] **Step 2: Capture every state that the refactor could break**

Per window, screenshot to `$SCRATCH/baseline/`:

| State | Page Preview | NavWindow |
|---|---|---|
| Open, single tab | ✓ | ✓ (map flavor) |
| Open, multiple tabs | ✓ | ✓ (page tab active) |
| Inspector open | ✓ | ✓ |
| Inspector mid-resize | ✓ | ✓ |
| Trailing actions after the `--io` swallow | ✓ | ✓ |
| Footer open / collapsed | ✓ | n/a |
| Left rail collapsed | n/a | ✓ (page tab) |
| Corner resize at min bounds | ✓ | ✓ |

- [ ] **Step 3: Record the two FLIP animations**

The engulf (preview → detail pane) and the morph (preview → NavWindow) are the highest-risk items, because a broken `.parentElement` walk produces a *plausible-looking wrong animation*, not an error. Capture a frame mid-animation for each.

- [ ] **Step 4: Commit the baseline note**

```bash
git add -A && git commit -m "chore(preview-pane): record pre-refactor baseline states"
```

---

### Task 1: PreviewPane — Chassis, Toolbar, Tint

Absorbs `FloatingPaneShell` and adds the toolbar + tint. No side panes, no footer yet. Compiles and typechecks unconsumed.

**Files:**
- Create: `src/renderer/src/design-system/components/PreviewPane/PreviewPane.tsx`
- Create: `src/renderer/src/design-system/components/PreviewPane/previewPane.css`

**Interfaces:**
- Consumes: `useFloatingWindow`, `FloatingResizeCorners`, `FloatingBounds` from `design-system/interactions/FloatingWindow`; `GlassPane` from `design-system/materials`; `Icon`, `cx`.
- Produces: `PreviewPane`, `PREVIEW_PANE_BOUNDS`, and the `.ppane-action` class for host-supplied toolbar buttons.

- [ ] **Step 1: Write the component's public surface**

```tsx
export interface PreviewPaneTint {
  /** The window background beneath the frost. Defaults to the window-bg token. */
  color?: string
  /** 0–100. 0 = pure frost, 100 = opaque fill. */
  opacity?: number
}

export interface PreviewPaneProps {
  /** Stable geometry id — windows sharing an id share one stashed size slot. */
  id: string
  closing: boolean
  onClose: () => void
  /** Escape override — defaults to onClose (e.g. close an inner pane first). */
  onEscape?: () => void
  bounds?: FloatingBounds
  /** Extra bare-background selectors a window-move may start from, appended to the pane's own. */
  dragSurfaces?: string
  ariaLabel: string
  className?: string
  style?: CSSProperties
  /** The root glass element — hosts running FLIP animations read their rect from here. */
  rootRef?: React.Ref<HTMLDivElement>
  tint?: PreviewPaneTint
  /** The left toolbar glyph. Omitted = no scan button. */
  onScan?: () => void
  scanLabel?: string
  /** Toolbar centre — a title, a breadcrumb, a tab strip, or nothing. */
  title?: React.ReactNode
  /** Trailing toolbar buttons, left of the ×. Ride the --io swallow when a right overlay pane opens. */
  actions?: React.ReactNode
  children: React.ReactNode
}
```

- [ ] **Step 2: Implement the chassis**

Lift `FloatingPaneShell`'s body verbatim — `useFloatingWindow`, the Escape effect (keep its `closing` guard *and* add PreviewWindow's `defaultPrevented` check, which the shell lacks), `GlassPane`, `FloatingResizeCorners`. Two changes:

- Merge `rootRef` onto the `GlassPane` div so hosts can measure the real root.
- Compose the tint into the inline style — this is the whole reason opacity couldn't be a prop before, since `GlassPane`'s `frostStyle` hard-sets `background: transparent`:

```tsx
const tintStyle = {
  '--ppane-bg': tint?.color ?? 'var(--bg-window)',
  '--ppane-bg-a': `${tint?.opacity ?? 85}%`,
  background: 'color-mix(in srgb, var(--ppane-bg) var(--ppane-bg-a), transparent)',
} as CSSProperties
```

- [ ] **Step 3: Implement the toolbar**

A transparent overlay strip across the top with three slots — lead (scan), centre (title), trail (actions + ×). It must be an *overlay*, not a layout row: the NavWindow has no toolbar band and puts its tab strip in the content column, and that layout has to survive untouched. The strip is `pointer-events: none`; its children re-enable.

- [ ] **Step 4: Write `previewPane.css`**

Port, renaming `--pgpreview-*` → `--ppane-*`:

| From | Rule |
|---|---|
| `floatingPane.css.ts:13-27` | `.ppane` shell + `.ppane.closing` + the scale in/out keyframes |
| `previewWindow.css:68-82` | `.ppane-toolbar` |
| `previewWindow.css:161-179` | `.ppane-actions` / `.ppane-action` |
| `previewWindow.css:83-110` | `.ppane-title` (centred, pointer-inert, the collapse-left morph) |
| `previewWindow.css:59-67` | the `--io` local declaration + transition — **the shield** |

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```
Expected: 0 errors. The component is unconsumed; nothing else should move.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/design-system/components/PreviewPane
git commit -m "feat(preview-pane): floating chassis, toolbar, and glass tint prop"
```

---

### Task 2: PreviewPane — Side-Pane Slots

Two slots, each independently overlay or in-flow.

**Files:** Modify both files from Task 1.

**Interfaces:**
- Consumes: `SidePane`, `sidePaneWidth`, `SidePaneBounds` from `design-system/components/SidePane/SidePane`.
- Produces: `PreviewPaneSide`, `PREVIEW_PANE_SIDE_BOUNDS`.

- [ ] **Step 1: Define the slot**

```tsx
export interface PreviewPaneSide {
  /** Keys the persisted width — panes sharing an id share one remembered width. */
  windowId: string
  bounds: SidePaneBounds
  /**
   * overlay — slides over the body on the --io driver; the body pads aside.
   * inflow  — occupies a column in the body's flex row; closing collapses its width.
   */
  mode: 'overlay' | 'inflow'
  /** Overlay slots toggle. In-flow slots collapse to zero width when false. */
  open?: boolean
  className?: string
  resizeLabel?: string
  onResizingChange?: (resizing: boolean) => void
  children: React.ReactNode
}
```

Add `left?: PreviewPaneSide` and `right?: PreviewPaneSide` to `PreviewPaneProps`.

- [ ] **Step 2: Drive the panes off two vars**

The right slot keeps `--io` — the existing contract, the existing shield, and the swallow math the toolbar already reads. A left overlay slot gets `--io-l`. In-flow slots need no driver; they animate width directly.

Register the new property beside the existing one in `styles.css`:

```css
@property --io-l {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}
```

- [ ] **Step 3: Port the overlay geometry**

From `previewWindow.css:184-202` + `:355-363`, renamed to `.ppane-side-right` / `.ppane-side-right-resize`, mirrored for left. Width mirrors into `--ppane-side-r-w` / `--ppane-side-l-w` via `SidePane`'s `onWidthChange`, seeded from `sidePaneWidth()` so the first painted frame carries the restored width.

- [ ] **Step 4: Port the in-flow geometry**

From `navWindow.css:208-224`. The collapse must keep the opacity fade — the glass material's 1px borders survive a zero-width collapse as a doubled hairline without it. The resize strip hides when closed.

- [ ] **Step 5: Port the swallow**

`previewWindow.css:379-401` → `.ppane-actions-flow`, reading `--ppane-side-r-w`. `.ppane.is-resizing` kills transitions on the body, footer, and flow so an edge-drag tracks the cursor 1:1.

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add -A && git commit -m "feat(preview-pane): left/right side slots in overlay and in-flow modes"
```

---

### Task 3: PreviewPane — Footer Slot

**Files:** Modify both files from Task 1.

- [ ] **Step 1: Add the props**

```tsx
  /** Optional footer, pinned at the window bottom behind a collapse chevron. */
  footer?: React.ReactNode
  /** Footer bar height. Defaults to the subline token. */
  footerHeight?: string
```

- [ ] **Step 2: Port the reveal behavior**

Move PreviewWindow's `subfieldOpen` / `subfieldNear` state and its `onMouseMove` / `onMouseLeave` handlers into the component. **The cached-rect pattern comes along intact** — a `getBoundingClientRect()` per mousemove forces a layout on every pointer travel across the pane. The cache invalidates on anything that can move or resize the pane (geometry style, either pane's open state, either width).

- [ ] **Step 3: Port the footer CSS**

`previewWindow.css:235-297` → `.ppane-footer` + `.ppane-footer-toggle`. The right-overlay squeeze becomes a `--ppane-side-r-w` read. The chevron holds its inset past the corner resize handle.

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add -A && git commit -m "feat(preview-pane): collapsing footer slot with hover reveal"
```

---

### Task 4: Migrate the Page Preview

First real consumer. The window must be indistinguishable from its baseline.

**Files:**
- Modify: `src/renderer/src/PagePreview/PreviewWindow.tsx`, `previewWindow.css`
- Create: `src/renderer/src/PagePreview/previewTabStrip.css`

- [ ] **Step 1: Relocate the tab-strip CSS**

Move `.pgpreview-tabwrap` / `-tabscroll` / `-tabstrip` / `-crumbs` (`previewWindow.css:112-160`) into `previewTabStrip.css`, imported by `PreviewTabStrip.tsx`. Both windows use the strip; it has no business living in one window's shell file. Class names stay — `PreviewTabStrip.tsx` and both `DRAG_SURFACES` lists reference them.

- [ ] **Step 2: Swap the shell**

Replace the hand-rolled `GlassPane` + `useFloatingWindow` + `FloatingResizeCorners` + the local Escape effect with `PreviewPane`. Delete the now-dead `WIN` const and the `INSPECTOR` export (it moves to the component; NavWindow's import updates in Task 5). Pass `tint={{ opacity: 85 }}`.

- [ ] **Step 3: Re-point the engulf FLIP**

The critical step. `bodyRef.current?.parentElement` (`:207`) no longer resolves to the window root. Take a real root ref:

```tsx
const rootRef = useRef<HTMLDivElement>(null)
```

Pass it as `rootRef`, and read `rootRef.current` in both the engulf effect (`:207`) and the tab-slide's inspector query (`:187`). **Verify against the baseline mid-animation frame** — a wrong element animates plausibly rather than erroring.

- [ ] **Step 4: Strip the duplicated CSS**

Delete from `previewWindow.css`: the shell block (`:4-40`), toolbar/actions (`:68-110`, `:161-179`), the `--io` block (`:59-67`), inspector geometry (`:184-202`, `:355-363`), the swallow (`:379-401`), and the footer (`:235-297`). What remains is genuinely preview-specific: the inspector *body* rows (`.pgpreview-insp-*`), the embed-grows overrides, and the body scroller.

- [ ] **Step 5: Verify against the baseline**

Relaunch the harness, re-capture every Task 0 preview state, and diff. Any difference is a defect to fix here, not to note.

- [ ] **Step 6: Gate + commit**

```bash
set -o pipefail
npm run typecheck && npx vitest run && npm run build
git add -A && git commit -m "refactor(page-preview): mount the floating window on PreviewPane"
```

---

### Task 5: Migrate the NavWindow, Delete FloatingPane

**Files:**
- Modify: `src/renderer/src/NavWindow/NavWindow.tsx`, `navWindow.css`
- Delete: `design-system/components/FloatingPane/` (both files)
- Modify: `src/renderer/src/Embeds/embeds.css`

- [ ] **Step 1: Swap the shell**

`FloatingPaneShell` → `PreviewPane`. The favorites rail becomes `left={{ mode: 'inflow', open: !pageTarget, … }}`; the inspector becomes `right={{ mode: 'overlay', open: inspectorOpen && pageTarget !== null, … }}`. The lead/trail action clusters become `onScan` + `actions`. `INSPECTOR` now imports from `PreviewPane`, killing the backwards dependency on `PreviewWindow`.

- [ ] **Step 2: Preserve the page-tab reveal**

NavWindow's action buttons fade in only on a page tab (`.navwindow.is-page-tab .navwindow-actions`). That's host state, not chassis behavior — keep it as a host rule scoped to the component's classes.

- [ ] **Step 3: Re-point the morph FLIP**

Same hazard as Task 3. `winRef.current?.parentElement` (`:81`) becomes the `rootRef`. Verify against the baseline morph frame.

- [ ] **Step 4: Dedup the embed-grows block**

The identical 4-rule "editor chain grows instead of scrolling internally" override exists in both windows (`previewWindow.css:407-423`, `navWindow.css:239-252`). Collapse to one rule in `embeds.css` keyed on a marker class both hosts apply to their scroller.

- [ ] **Step 5: Delete FloatingPane**

```bash
git rm -r src/renderer/src/design-system/components/FloatingPane
grep -rn "FloatingPane" src   # expect: no hits
```

- [ ] **Step 6: Strip the duplicated CSS**

Delete from `navWindow.css`: the shell block (`:1-47`), `.navwindow-close` (`:49-64`), the actions clusters and swallow (`:68-122`), and the inspector geometry (`:126-158`). Critically, the cross-namespace `--pgpreview-*` declarations (`:19-22`) die here — those existed only because there was nowhere shared to put them.

- [ ] **Step 7: Verify against the baseline**

Re-capture every Task 0 NavWindow state plus both FLIPs, and diff.

- [ ] **Step 8: Gate + commit**

```bash
set -o pipefail
npm run typecheck && npx vitest run && npm run build
git add -A && git commit -m "refactor(navwindow): mount on PreviewPane; retire FloatingPane"
```

---

### Task 6: Simplify, Review, Document

- [ ] **Step 1: Simplification pass**

Dispatch `code-simplifier` then `comment-killer-agent` on the working-tree diff. Verify their output personally — an agent's claim of completion is not evidence.

- [ ] **Step 2: Adversarial review**

Dispatch `build-breaking-agent` scoped to the diff's blast radius. A refactor's failure mode is a *sibling that consumed the old behavior* — the highest-value targets are the two FLIPs, the `--io` shield against the main app inspector, `SidePane`'s per-window width slots, and the `DRAG_SURFACES` allow-lists.

- [ ] **Step 3: Post-functional UIX review**

Mandatory regardless of how clean the build is. Review the *actual working UI* against the baseline, not the code.

- [ ] **Step 4: Update the docs**

- `Features/PagePreview.md` — the "Chrome rides the shared floating-window engine" and "The Inspector" paragraphs now describe `PreviewPane` as the surface both windows mount.
- `Features/Interaction.md` — the floating-windows motion entry names one source instead of `previewWindow.css` / `navWindow.css`.
- `Features/Navigation.md` — wherever it describes the NavWindow's own chassis.
- `design-system/components/README.md` — add `PreviewPane`.

- [ ] **Step 5: Final gate + commit**

```bash
set -o pipefail
npm run typecheck && npx vitest run && npm run build
git add -A && git commit -m "docs(preview-pane): describe the shared floating-window surface"
```

---

### Risks

- **The two FLIP animations are the sharpest edge.** Both walk `.parentElement` from an inner ref. A wrong element animates *plausibly* — it will not throw, it will just move the wrong box. Tasks 4 and 5 each verify against a captured mid-animation baseline frame for exactly this reason.
- **`--io` leakage.** Lose the local declaration and the main app inspector's open state drives every floating window's side pane. Invisible until the app inspector is opened with a floating window up — a state neither window's own tests cover.
- **The in-flow collapse fade.** NavWindow's rail fades as it collapses specifically so the glass material's 1px borders don't survive as a doubled hairline at zero width. A generic width-only collapse reintroduces that artifact.
- **`SidePane` width slots are global by id.** The preview's inspector and the NavWindow's inspector deliberately *share* the `preview-inspector` slot — one pane, one remembered width. Genericizing must not accidentally split them.

### Out of Scope

- The Settings window. `PreviewPane` becomes ready for it; standing it up needs its own design pass, and it drags in the 11 wired-but-unreachable personalization keys.
- The dead Settings buttons in both toolbars. They stay exactly as dead as they are today — this refactor changes no behavior.
