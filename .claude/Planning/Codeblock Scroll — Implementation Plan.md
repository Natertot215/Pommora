## Codeblock Scroll — Implementation Plan

**DATE:** 10-08-2026
**STATUS:** Draft
**SOURCE:** The 10-08-2026 session's conversation with Nathan, which settled the setting, its reveal triggers, its fades, its memory, its copy, and how much of the label over-scroll it reuses.

**BASELINE**

| Head | Tests | Start | End |
|------|-------|-------|-----|
| `HASH` | {count} | {MM-DD-YYYY h:mm AM/PM} | {MM-DD-YYYY h:mm AM/PM} |

### Context

**How a code block draws.** MarkdownPM draws a fenced code block as a run of separate `.cm-line.codeblock` lines; nothing wraps the block as a whole.
- **Frame and fill:** each line paints its share through `::after` (`markdown-pm.css` ~572–799).
- **Diff highlight:** an absolutely positioned `.md-diff` line widget inset to `--codeblock-edge`. Its left bar hides while the focused caret reveals the raw signs (`.codeblock-diff-raw`, which only a caret inside a focused editor sets).
- **Line numbers:** inline-block widgets pulled into the left padding by the line's negative `text-indent`, or absolute in diff blocks.
- **Language tag:** absolute at the opening line's top-right.
- **Wrapping:** code wraps, because the whole editor runs `EditorView.lineWrapping` (`surface.ts:67`).

**How labels clip elsewhere.** Every label that clips elsewhere in the app wears `overScrollEllipsis` (`UIX/Interactions/OverScroll.tsx`): table cells, sidebar rows, tabs. It's three classes:
- **`scroll-fade-x`:** the edge-fade mask on the `--fade-*` tokens. Its lead and trail amounts are registered numbers, normally driven by a scroll timeline.
- **`over-scroll-ellipsis`:** the resting ellipsis, fading only its lead.
- **`over-scroll-cap`:** makes the label its own scroll container. A hover wheel scrolls it alone, on either axis, and it slides home on leave.

**How state outlives a mount.** Two ways:
- **Warm cache** (`Core/Session/warmCache.ts`): holds a tab's `editorState` JSON for the session, and drops it when the page changed elsewhere (`fenceWarm`).
- **`local_state`:** holds per-page prefs keyed by something stable. A code block has nothing stable to key on across a reload.

### Overview

**The setting.** **Scroll Long Lines In Code Blocks** (`codeblockScroll`, off by default) stops code lines from wrapping.

**The run.** Each content line's code, past any diff sign, sits in a `.codeblock-run` span that wears the label's rendering classes (`scroll-fade-x over-scroll-ellipsis`):
- **Clip and shift:** the run clips its text and shifts by its block's `--code-scroll` through `text-indent`.
- **Fades:** the run feeds the fade mask's lead and trail amounts from the block's offset and overflow.
- **What stays put:** the frame, the gutter (numbers and signs), and the tag. Only the code moves.
- **Why not the cap:** a block's lines must move together, stay where they're left, and follow a typing caret, so the run takes none of `over-scroll-cap`'s scrolling.

An Electron 148 probe confirmed each piece:
- the ellipsis renders under `overflow: clip`, and nested syntax spans survive;
- line height is unchanged;
- `scroll-fade-x` draws its mask on a box that isn't a scroll container once its lead and trail are given;
- `calc` of a length over a length yields the number those amounts take.

**Reveal.** A block reveals when the caret is inside it while the editor is focused, or after a 24px sideways wheel over it. Moving the pointer off a wheel-revealed block un-reveals it. A revealed block:
- drops its ellipsis;
- widens its runs to the border's inner edge;
- takes the wheel's horizontal travel;
- fades both edges across `--fade-light` wherever code continues past them.

**The caret.** While the caret is in the block, each diff highlight (already in its raw state) stretches across the code's full scroll width, still inside the border, and the caret drags the offset to stay in view.

**Memory.** A block keeps its offset after it stops being revealed: the ellipsis returns, with a lead fade while it's scrolled. Offsets are editor state keyed by the block's opening line, so they ride the warm cache. They survive tab switches and reset on reload.

#### Concepts

**ADDED**

| Concept | Description | Location |
| ------- | ----------- | -------- |
| `codeScroll.ts` • File | The setting's runtime: block offsets, the run and reveal decorations, the wheel observer, the line-boundary keys, the caret follow, and the layers' clip. | `Core/MarkdownPM/codeScroll.ts` |
| `codeScrolls` • StateField | Each scrolled block's `{ from, x, overflow }`, keyed by its opening line's start, plus the wheel-revealed block. Mapped through changes, dropped when no fence opens there; its `[from, x]` pairs ride the warm cache. | `codeScroll.ts` |
| `codeScroll` • Extension | The field, the decoration plugin, the boundary keys, and the follow listener, mounted on page bodies beside `codeHighlight`. | `codeScroll.ts` |
| `codeClip` • Function | The span a code line's run shows, in layer coordinates, for a position at or past its code's start; `null` anywhere else. | `codeScroll.ts` |
| `codeSeat` • Function | Where a fence line's code begins: past its quote or indent prefix and past a diff sign. | `Core/MarkdownPM/Engine/detect.ts` |
| `overScrollFace` • Const | The label's rendering classes (`scroll-fade-x over-scroll-ellipsis`) without the cap, for a box whose offset something else drives; `overScrollEllipsis` composes from it. | `UIX/Interactions/OverScroll.tsx` |
| `WARM_FIELDS` • Const | The state fields a warm capture serializes, shared by the restore and the capture. | `Core/MarkdownPM/MarkdownEditor.tsx` |
| `codeblockScroll` • Setting | The flag, its toggle row, and its editor-settings key. | `Core/Settings/*`, `api.ts` |
| `.codeblock-run` / `.codeblock-nowrap` / `.codeblock-revealed` • Classes | The span that clips and shifts one line's code; the line class of every content line while the setting is on; the line class of a revealed block. | `markdown-pm.css` |
| `--code-scroll` / `--code-overflow` / `--code-reach` • Vars | A block's offset; how far its longest drawn line runs past the resting width; how far a revealed run reaches past the content edge (`--codeblock-pad` less the border). | `markdown-pm.css` |
| `--codeblock-border-width` • Var | The frame's border width, factored out of `--codeblock-border`. | `markdown-pm.css` |
| `codeScroll.test.tsx` • File | Run placement, setting gating, reveal class, the field's mapping, and the warm round-trip. | `Core/MarkdownPM/codeScroll.test.tsx` |

#### Constraints

- **Gates:**
  - `npm run typecheck` · `npm run test` · `npm run lint`, run from the repo root. Each exits 0, and lint runs clean.
  - Biome formats every TS/CSS write, so an Edit that fails on whitespace means the file was reformatted: re-read it and retry.
- **Live drive:**
  - Launch with `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`, after reading `.claude/Guidelines/Development-Environment.md`.
  - Drive `~/NexusOS`, testing on this plan's own code blocks; leave its files byte-identical, and stop every instance started.
- **Parallel session:**
  - Key Adoption (a MarkdownPM cleanup) plans to rewrite `MarkdownEditor.tsx`'s extension list and parts of `Engine/detect.ts` and `docScan.ts`.
  - Whoever ratifies first lands first, and each messages the other before its first commit.
  - Stage only this plan's files; the tree holds other sessions' edits.
- **Reuse before adding:** anything the label over-scroll, the warm cache, the settings tables, or the line helpers already do is taken from them rather than redone.
- **Hot path:**
  - No layout read on a wheel tick, or on any caret move outside a live block.
  - Overflow is measured only when a block reveals, or when the live block's document, geometry, or liveness changes.
  - The follow dispatches only when the offset or overflow changes.
  - A block's width is read from every one of its lines through `drawnLast`'s text-keyed cache, so a keystroke measures only the line it changed.
  - The layers' clip reads the cached scan before touching the DOM.
- **Page bodies only:** the module mounts in `MarkdownEditor.tsx`, never in `inlineSurface`, which table cells and Text values share.
- **Copy:**
  - Label: **Scroll Long Lines In Code Blocks**.
  - Hint: "Codeblocks become scrollable when lines extend beyond their width; they're wrapped when this is turned off."
- **Settled with Nathan:**
  - **Reveal triggers:** the caret, or a 24px sideways wheel over a hovered block.
  - **Shape:** the gutter stays fixed; fully scrolled, a block ends at its normal padding.
  - **Memory:** no snap-back, and session memory through the warm cache.
  - **Fades:** `--fade-light` on both edges while revealed, and on the lead alone at rest.
  - **Caret only:** only the caret extends the diff highlight.
  - **Reuse:** the label's rendering half; its scroll half stays out.
- **Comments:** only where the code can't say it, matching the surrounding doc-comment density.

#### Process Overview

The setting, the shared seat helper, and the label face land first. The module and the CSS build in parallel, since neither touches the other's files. The layer clip consumes the module's `codeClip`. A live review and Nathan's visual pass gate the docs.

#### Implementation Process

- [ ] **Phase 1** — Setting, Seat & Face
  - [ ] Task 1-1
  - [ ] Task 1-2
- [ ] **Phase 2** — The Scroll Module `[Parallel with Phase 3]`
  - [ ] Task 2-1
  - [ ] Task 2-2
- [ ] **Phase 3** — Styles `[Parallel with Phase 2]`
  - [ ] Task 3-1
- [ ] **Phase 4** — Layer Clip
  - [ ] Task 4-1
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan's visual pass on this plan's code blocks in NexusOS — a resting, a scrolled, and a revealed block; diff and line-count cases]`
- [ ] **Phase 5** — Documentation
  - [ ] Task 5-1

---

### Phase 1 — Setting, Seat & Face

**GOAL:** Declare the setting in every table that owns a setting's shape. Hoist the seat arithmetic `signSeatAt` holds inline, so the module reads it from the same helper. Name the label's rendering half where its classes are defined. Nothing renders differently yet.

#### Task 1-1

**TASK:** Add `codeblockScroll` to the settings tables and the editor's settings keys. It takes no root class and no explicit re-measure: every rule it styles keys off a class the plugin emits, so the CSS and the runs change in the same redraw. That redraw comes from the existing `[settings]` → `redrawNudge` effect (`MarkdownEditor.tsx:116–118`), and the decoration change requests its own measure. A root class would flip a frame ahead of the runs and paint long lines past the frame.

**NOW:** `codeblockLineCount` is declared in these places:
- `personalization.ts:148` — the flag
- `frames.ts:768–773` — the toggle row
- `api.ts:78` — the editor-settings key

**CHANGE**

- [ ] Add the three entries.

**AFTER**

```diff ts
--- a/Core/Settings/personalization.ts
+++ b/Core/Settings/personalization.ts
@@ SETTINGS @@
   codeblockLineCount: flag(false),
+  codeblockScroll: flag(false),
--- a/Core/Settings/frames.ts
+++ b/Core/Settings/frames.ts
@@ Code @@
             hint: "Number a codeblock's lines — display chrome, never editable text.",
           },
+          {
+            kind: 'toggle',
+            key: 'codeblockScroll',
+            label: 'Scroll Long Lines In Code Blocks',
+            hint: "Codeblocks become scrollable when lines extend beyond their width; they're wrapped when this is turned off.",
+          },
--- a/Core/MarkdownPM/api.ts
+++ b/Core/MarkdownPM/api.ts
@@ EDITOR_SETTING_KEYS @@
   'codeblockLineCount',
+  'codeblockScroll',
```

**VERIFY**

- [ ] `grep -rn "codeblockScroll" Core --include='*.ts'` lists the three sites above.
- [ ] Run the gates.

#### Task 1-2

**TASK:** Export `codeSeat` beside `fenceBodyStart` and rebuild `signSeatAt` on it. Name the label face in `OverScroll.tsx`.

**NOW:**
- `signSeatAt` (`docScan.ts:329–335`) returns `lineStarts[i] + fenceBodyStart(...) + (signed ? 1 : 0)` inline.
- `intents.ts:274` adds the sign to an `innerStart` it already holds, which stays as it is.
- `overScrollEllipsis` is `${overScrollLabel} over-scroll-ellipsis`.

**CHANGE**

- [ ] Add `codeSeat`, and use it in `signSeatAt`.
- [ ] Add `overScrollFace`, and compose `overScrollEllipsis` from it (same three classes).

**AFTER**

```diff ts
--- a/Core/MarkdownPM/Engine/detect.ts
+++ b/Core/MarkdownPM/Engine/detect.ts
@@ fenceBodyStart @@
 export function fenceBodyStart(line: string, f: FenceInfo): number {
   const quote = quotePrefixWidth(line, f.depth)
   return quote + Math.min(f.indent, indentWidth(line.slice(quote)))
 }
+
+/** Where a fence line's code begins: past its quote or indent prefix, and past a diff sign. */
+export const codeSeat = (line: string, f: FenceInfo): number =>
+  fenceBodyStart(line, f) + (signedLine(f) ? 1 : 0)
--- a/Core/MarkdownPM/Engine/docScan.ts
+++ b/Core/MarkdownPM/Engine/docScan.ts
@@ signSeatAt @@
   const f = scan.fences[i]
-  const signed = signedLine(f)
-  if (!signed && !awaitsSign(f)) return null
-  return scan.lineStarts[i] + fenceBodyStart(scan.lines[i], f!) + (signed ? 1 : 0)
+  if (!signedLine(f) && !awaitsSign(f)) return null
+  return scan.lineStarts[i] + codeSeat(scan.lines[i], f!)
--- a/UIX/Interactions/OverScroll.tsx
+++ b/UIX/Interactions/OverScroll.tsx
@@ exports @@
 export const overScrollLabel = 'scroll-fade-x over-scroll-cap'
 
-export const overScrollEllipsis = `${overScrollLabel} over-scroll-ellipsis`
+/** A label's fades and ellipsis without the cap, for a box whose offset something else drives. */
+export const overScrollFace = 'scroll-fade-x over-scroll-ellipsis'
+
+export const overScrollEllipsis = `${overScrollFace} over-scroll-cap`
```

Drop `fenceBodyStart` from `docScan.ts`'s imports if nothing else there reads it.

**VERIFY**

- [ ] `npx vitest run Core/MarkdownPM/codeDiff.test.tsx Core/MarkdownPM/Engine UIX/Interactions` passes unchanged.
- [ ] Run the gates.

---

### Phase 2 — The Scroll Module

**GOAL:** One module owns the runtime: per-block state, the run and reveal decorations through `EditorView.outerDecorations` (so nothing splits a run), the wheel reveal, logical line boundaries on code lines, the caret follow, and the layers' clip. It's wired into the page editor and its warm capture. It runs apart from the CSS because their files are disjoint.

#### Task 2-1

**TASK:** Write `codeScroll.ts`, test-first for what jsdom can observe.

**NOW:** Nothing tracks a block's scroll. The CM facts the module relies on:
- **Outer decorations:** `outerDecorations` (view `index.d.ts:1336–1340`) wraps every regular source and keeps its marks whole.
- **Layer re-measure:** a changed line decoration redraws its line, which re-measures the caret and selection layers (`docViewUpdate` → `LayerView.docViewUpdate`).
- **Dispatch timing:** dispatch is legal in an update listener, which runs after the view returns to idle, and refused in a measure's write.
- **Line boundaries:** with `lineWrapping` on, `moveToLineBoundary` probes the editor's edge with `posAtCoords` (view `index.js:3640–3652`), and that probe would land on a clipped glyph.
- **Observers:** `eventObservers` are passive and bound to the plugin instance.

**CHANGE**

- [ ] Write `codeScroll.test.tsx` with `mountEditor` and `settings: { codeblockScroll: true }`, and watch it fail. Assert:
  - a ```` ```ts ```` content line `const a = 1` renders one `.codeblock-run.scroll-fade-x.over-scroll-ellipsis` whose `textContent` is `const a = 1`; after the language's `loaded` dispatch, the run contains the syntax spans;
  - fence lines hold no run, and with the setting off no `.codeblock-run` exists;
  - a ```` ```diff ```` line `+x` has a run whose text is `x`;
  - with focus and the caret in a block, its content lines carry `codeblock-revealed` and another block's don't;
  - End on a code content line puts the caret at the line's end;
  - on a bare `EditorState` with `codeScroll`, a JSON blob `[[openOfSecond, 40]]` restores the pair. A line inserted above, and an Enter at the opening line's start, each move the key, and `toJSON` returns the moved pair. Deleting that fence's opening backticks drops it.
- [ ] Write the module.

**AFTER**

```ts
// Core/MarkdownPM/codeScroll.ts
// A code block's lines scroll as one: each content line's code sits in a run its block's offset shifts, so the frame, the gutter, and the tag hold still while the code moves under them.
import { EditorSelection, Prec, type Range, StateEffect, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { overScrollFace } from '@pommora/uix/Interactions/OverScroll'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { editorHost, redrawNudge } from './api'
import { docScan, drawnLast } from './docCache'
import { codeSeat } from './Engine/detect'
import type { DocScan } from './Engine/docScan'
import { lineIndexAt } from './Engine/markdownCode'
import { lineElementAt } from './lineDom'

/** A block by the start of its opening fence line; `overflow` is how far its longest drawn line runs past the width its lines rest at. */
interface BlockScroll {
  from: number
  x: number
  overflow: number
}
interface CodeScrolls {
  blocks: readonly BlockScroll[]
  hovered: number | null
}

const scrollBlock = StateEffect.define<BlockScroll>()
const hoverBlock = StateEffect.define<number | null>()

// KNOB: how far a sideways wheel over a resting block travels before the block reveals.
const REVEAL_TRAVEL = 24

const blockAt = (scan: DocScan, pos: number): number | null =>
  scan.fences[lineIndexAt(scan, pos)]?.from ?? null

const codeScrolls = StateField.define<CodeScrolls>({
  create: () => ({ blocks: [], hovered: null }),
  update(value, tr) {
    let { blocks, hovered } = value
    if (tr.docChanged) {
      const scan = docScan.after(tr)
      // Forward, so a line opened at the fence's own start leaves the key on the fence.
      const kept = (from: number): number | null => {
        const at = tr.changes.mapPos(from, 1)
        return blockAt(scan, at) === at ? at : null
      }
      blocks = blocks.flatMap((b) => {
        const from = kept(b.from)
        return from === null ? [] : [{ ...b, from }]
      })
      hovered = hovered === null ? null : kept(hovered)
    }
    for (const e of tr.effects)
      if (e.is(scrollBlock)) blocks = [...blocks.filter((b) => b.from !== e.value.from), e.value]
      else if (e.is(hoverBlock)) hovered = e.value
    return blocks === value.blocks && hovered === value.hovered ? value : { blocks, hovered }
  },
  toJSON: ({ blocks }) => blocks.filter((b) => b.x > 0).map((b) => [b.from, b.x]),
  // A warm entry restores only onto the text it was captured from, so its keys still open their fences; overflow is measured again on the next reveal.
  fromJSON: (json: [number, number][]) => ({
    blocks: json.map(([from, x]) => ({ from, x, overflow: x })),
    hovered: null,
  }),
})

const on = (view: EditorView): boolean => view.state.facet(editorHost).settings().codeblockScroll

const liveBlock = (view: EditorView): number | null =>
  on(view) && view.hasFocus ? blockAt(docScan(view.state.doc), view.state.selection.main.head) : null

const run = Decoration.mark({ class: `codeblock-run ${overScrollFace}` })
const nowrap = Decoration.line({ class: 'codeblock-nowrap' })

function decorate(view: EditorView, live: number | null): DecorationSet {
  if (!on(view)) return Decoration.none
  const scan = docScan(view.state.doc)
  const { blocks, hovered } = view.state.field(codeScrolls)
  const ranges: Range<Decoration>[] = []
  for (let i = lineIndexAt(scan, view.viewport.from), last = lineIndexAt(scan, view.viewport.to); i <= last; i++) {
    const f = scan.fences[i]
    if (f?.role !== 'content') continue
    const ls = scan.lineStarts[i]
    const le = ls + scan.lines[i].length
    const seat = ls + codeSeat(scan.lines[i], f)
    const b = blocks.find((s) => s.from === f.from)
    const shown = f.from === live || f.from === hovered
    ranges.push(
      b || shown
        ? Decoration.line({
            class: shown ? 'codeblock-nowrap codeblock-revealed' : 'codeblock-nowrap',
            attributes: { style: `--code-scroll:${b?.x ?? 0}px;--code-overflow:${b?.overflow ?? 0}px` },
          }).range(ls)
        : nowrap.range(ls),
    )
    if (seat < le) ranges.push(run.range(seat, le))
  }
  return Decoration.set(ranges)
}

const measure = document.createElement('canvas').getContext('2d')!
const widthsOf = drawnLast((key: string) => {
  const cut = key.indexOf('\n')
  measure.font = key.slice(0, cut)
  return measure.measureText(key.slice(cut + 1)).width
})

/** A run's tab stops count from the run's own start, so a tab widens to the next stop there. */
const expandTabs = (text: string, size: number): string =>
  text.replace(/[^\t]*\t/g, (s) => s.slice(0, -1) + ' '.repeat(size - ((s.length - 1) % size)))

/** How far a block's widest line runs past the width its lines rest at, in layout pixels, read from every line of the block, drawn or not; null while none of its lines is drawn to take the font and width from. */
function overflowOf(view: EditorView, from: number): number | null {
  const scan = docScan(view.state.doc)
  const open = lineIndexAt(scan, from)
  const close = lineIndexAt(scan, scan.fences[open]!.to)
  let sample: HTMLElement | null = null
  for (let i = Math.max(open + 1, lineIndexAt(scan, view.viewport.from)); i < close && !sample; i++)
    if (i <= lineIndexAt(scan, view.viewport.to)) sample = lineElementAt(view, scan.lineStarts[i])
  const runEl = sample?.querySelector<HTMLElement>('.codeblock-run')
  if (!sample || !runEl) return null
  const cs = getComputedStyle(sample)
  const rest = sample.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const font = getComputedStyle(runEl).font
  let widest = 0
  widthsOf(view, (read) => {
    for (let i = open + 1; i < close; i++) {
      const code = scan.lines[i].slice(codeSeat(scan.lines[i], scan.fences[i]!))
      widest = Math.max(widest, read(`${font}\n${expandTabs(code, view.state.tabSize)}`))
    }
  })
  return Math.max(0, Math.ceil(widest - rest))
}

/** The run's on-screen box for a position at or past its line's code, read only once the scan says the position is code. */
function runBox(view: EditorView, pos: number): DOMRect | null {
  if (!on(view) || pos < view.viewport.from || pos > view.viewport.to) return null
  const scan = docScan(view.state.doc)
  const i = lineIndexAt(scan, pos)
  const f = scan.fences[i]
  if (f?.role !== 'content' || pos < scan.lineStarts[i] + codeSeat(scan.lines[i], f)) return null
  return lineElementAt(view, pos)?.querySelector('.codeblock-run')?.getBoundingClientRect() ?? null
}

/** The span a code line's run shows, in the coordinates CM's layers draw in. */
export function codeClip(view: EditorView, pos: number): { left: number; right: number } | null {
  const box = runBox(view, pos)
  if (!box) return null
  const base = view.scrollDOM.getBoundingClientRect().left - view.scrollDOM.scrollLeft * view.scaleX
  return { left: box.left - base, right: box.right - base }
}

/** How far the offset must move to bring the caret clear of the run's fading edges, in layout pixels. */
function caretShift(view: EditorView): number {
  const head = view.state.selection.main.head
  const box = runBox(view, head)
  const caret = box && view.coordsAtPos(head)
  if (!box || !caret) return 0
  const room = parseFloat(getComputedStyle(view.contentDOM).getPropertyValue('--fade-light')) || 0
  if (caret.left > box.right - room) return (caret.left - box.right + room) / view.scaleX
  if (caret.left < box.left + room) return (caret.left - box.left - room) / view.scaleX
  return 0
}

function blockUnder(view: EditorView, target: EventTarget | null): number | null {
  const line = target instanceof Element ? target.closest<HTMLElement>('.cm-line.codeblock') : null
  if (!line || line.closest('.cm-content') !== view.contentDOM) return null
  return blockAt(docScan(view.state.doc), view.posAtDOM(line))
}

class CodeScroll {
  deco: DecorationSet
  live: number | null
  /** Whether the live block's width or code may have moved since its overflow was last measured. */
  stale = true
  /** Sideways travel gathered over a resting block, toward revealing it. */
  gathered = { from: -1, dx: 0 }

  constructor(view: EditorView) {
    this.live = liveBlock(view)
    this.deco = decorate(view, this.live)
  }

  update(u: ViewUpdate): void {
    const live = liveBlock(u.view)
    if (live !== this.live || u.docChanged || u.geometryChanged) this.stale = true
    if (
      live !== this.live ||
      u.docChanged ||
      u.viewportChanged ||
      u.startState.field(codeScrolls) !== u.state.field(codeScrolls) ||
      u.transactions.some((tr) => tr.effects.some((e) => e.is(redrawNudge)))
    ) {
      this.live = live
      this.deco = decorate(u.view, live)
    }
  }
}

const codeScrollPlugin = ViewPlugin.fromClass(CodeScroll, {
  provide: (p) => EditorView.outerDecorations.of((v) => v.plugin(p)?.deco ?? Decoration.none),
  eventObservers: {
    wheel(e, view) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      const from = blockUnder(view, e.target)
      if (from === null || !on(view)) return
      const { blocks, hovered } = view.state.field(codeScrolls)
      const b = blocks.find((s) => s.from === from)
      if (from === this.live || from === hovered) {
        if (!b) return
        const x = clamp(b.x + e.deltaX, 0, b.overflow)
        if (x !== b.x) view.dispatch({ effects: scrollBlock.of({ ...b, x }) })
        return
      }
      const g = this.gathered
      g.dx = g.from === from ? g.dx + e.deltaX : e.deltaX
      g.from = from
      if (Math.abs(g.dx) < REVEAL_TRAVEL) return
      g.from = -1
      const overflow = overflowOf(view, from) ?? b?.overflow ?? 0
      view.dispatch({
        effects: [hoverBlock.of(from), scrollBlock.of({ from, x: Math.min(b?.x ?? 0, overflow), overflow })],
      })
    },
    // `relatedTarget` is where the pointer went; a table, a tile, or anything off the editor resolves to no block.
    pointerout(e, view) {
      const { hovered } = view.state.field(codeScrolls)
      if (hovered !== null && blockUnder(view, e.relatedTarget) !== hovered)
        view.dispatch({ effects: hoverBlock.of(null) })
    },
  },
})

/** A code line clips rather than wraps, so its boundary is its logical end; CM's wrap probe at the editor's edge would land on a clipped glyph. */
function lineBoundary(forward: boolean, extend: boolean) {
  return (view: EditorView): boolean => {
    if (!on(view)) return false
    const scan = docScan(view.state.doc)
    const code = (pos: number) => scan.fences[lineIndexAt(scan, pos)]?.role === 'content'
    const { selection } = view.state
    if (!selection.ranges.some((r) => code(r.head))) return false
    view.dispatch({
      selection: EditorSelection.create(
        selection.ranges.map((r) => {
          const to = view.moveToLineBoundary(r, forward, !code(r.head))
          return extend ? EditorSelection.range(r.anchor, to.head) : to
        }),
        selection.mainIndex,
      ),
      scrollIntoView: true,
      userEvent: 'select',
    })
    return true
  }
}

const boundaryKeys = Prec.high(
  keymap.of([
    { key: 'Home', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
    { key: 'End', run: lineBoundary(true, false), shift: lineBoundary(true, true) },
    { mac: 'Cmd-ArrowLeft', run: lineBoundary(false, false), shift: lineBoundary(false, true) },
    { mac: 'Cmd-ArrowRight', run: lineBoundary(true, false), shift: lineBoundary(true, true) },
  ]),
)

// A dispatch from a measure's write is refused and one deferred a frame draws the caret stale, so the follow reads layout here, once the update has landed.
const follow = EditorView.updateListener.of((u) => {
  const plugin = u.view.plugin(codeScrollPlugin)
  const from = plugin?.live ?? null
  if (!plugin || from === null || (!plugin.stale && !u.selectionSet)) return
  const b = u.view.state.field(codeScrolls).blocks.find((s) => s.from === from)
  const measured = plugin.stale || !b ? overflowOf(u.view, from) : null
  if (measured !== null) plugin.stale = false
  const overflow = measured ?? b?.overflow
  if (overflow === undefined) return
  const x = clamp((b?.x ?? 0) + caretShift(u.view), 0, overflow)
  if (x !== b?.x || overflow !== b?.overflow) u.view.dispatch({ effects: scrollBlock.of({ from, x, overflow }) })
})

export const codeScroll = [codeScrolls, codeScrollPlugin, boundaryKeys, follow]
export { codeScrolls }
```

**What the module never needs.** Under `overflow: clip` nothing scrolls sideways natively, so the passive wheel observer never needs `preventDefault`. A wheel over a revealed block always finds its entry, since the reveal or the follow wrote it.

**VERIFY**

- [ ] `npx vitest run Core/MarkdownPM/codeScroll.test.tsx` passes, and goes red with `codeScroll` left out of the editor's extensions.
- [ ] `grep -rnE "'(Home|End)'|Cmd-Arrow(Left|Right)" Core/MarkdownPM --include='*.ts' --include='*.tsx'` finds no other binding of these keys in a page editor at `Prec.high` or above. Where one exists, record which wins in the extension order and confirm End still reaches the line's end in the checkpoint.
- [ ] Run the gates.
- [ ] Check the work for unnecessary code or obvious mistakes.

#### Task 2-2

**TASK:** Mount the module on page bodies, and carry its field through the warm capture.

**NOW:**
- `codeHighlight` mounts at `MarkdownEditor.tsx:197`.
- `{ history: historyField }` is written twice: at `:261` (`fromJSON`) and at `:320` (`toJSON`).
- `toJSON` calls each field's `toJSON` unconditionally. `fromJSON` initializes only the keys a blob carries, so older blobs mount the field fresh.

**CHANGE**

- [ ] Hoist `WARM_FIELDS`, use it at both sites, and add `codeScroll` after `codeHighlight`.

**AFTER**

```diff tsx
--- a/Core/MarkdownPM/MarkdownEditor.tsx
+++ b/Core/MarkdownPM/MarkdownEditor.tsx
@@ imports @@
 import { codeHighlight, pageCode } from './codeHighlight'
+import { codeScroll, codeScrolls } from './codeScroll'
@@ module @@
+const WARM_FIELDS = { history: historyField, codeScroll: codeScrolls }
@@ extensions @@
       codeHighlight,
+      codeScroll,
@@ warm restore @@
         warmState = EditorState.fromJSON(
           saved.editorState,
           { extensions },
-          { history: historyField },
+          WARM_FIELDS,
         )
@@ warm capture @@
-          editorState: view.state.toJSON({ history: historyField }),
+          editorState: view.state.toJSON(WARM_FIELDS),
```

**VERIFY**

- [ ] Add a warm round-trip case to `codeScroll.test.tsx`, in the capture pattern of `headingRename.test.tsx:452–461`. Mount with a captured blob carrying `codeScroll: [[from, 30]]`, and read `--code-scroll:30px` on that block's lines.
- [ ] Run the gates.

---

### Phase 3 — Styles

**GOAL:** Draw the run's rest, revealed, and caret states from the classes and variables Phase 2 emits, on top of the label face's own ellipsis and mask. Factor the frame's border width out so the reach and inner edge can be derived. This is a separate phase because it touches only `markdown-pm.css`.

#### Task 3-1

**TASK:** Factor out `--codeblock-border-width`, and add the scroll group after the line-number rules.

**NOW:**
- **Border:** `--codeblock-border` is the shorthand `var(--width-200) solid var(--border-base)` (`:767`).
- **Diff highlight:** `.md-diff` sits at `inset: 0 var(--codeblock-edge)` (`:841–846`).
- **Wrapping:** code lines inherit `pre-wrap`.
- **Group anchor:** the line-number group ends at `:1061`.
- **Label face:**
  - `.over-scroll-ellipsis` gives `text-overflow: ellipsis` and a 0 default fade.
  - `.scroll-fade-x` draws `--scroll-fade-lead`/`--scroll-fade-trail` (registered, non-inheriting numbers) across `--scroll-fade`.

**CHANGE**

- [ ] Factor out the border width.
- [ ] Add the group. Every rule keys off a class the plugin emits only while the setting is on. Only content lines carry `codeblock-nowrap`, so a long info string still wraps inside the frame.
- [ ] Set the fade amounts on the run itself, since they don't inherit.

**AFTER**

```diff css
--- a/Core/MarkdownPM/markdown-pm.css
+++ b/Core/MarkdownPM/markdown-pm.css
@@ .mdpm-editor .cm-line.codeblock @@
-  --codeblock-border: var(--width-200) solid var(--border-base);
+  --codeblock-border-width: var(--width-200);
+  --codeblock-border: var(--codeblock-border-width) solid var(--border-base);
@@ :root.codeblock-line-count .codeblock-line-number @@
   user-select: none;
 }
+
+/* A content line holds its code in one run that its block's offset shifts, so the frame, the gutter, and the tag hold still. The run wears a label's face but clips rather than scrolls: no line is ever a scroll container a caret could drag sideways alone. */
+.mdpm-editor .cm-line.codeblock-nowrap {
+  white-space: pre;
+}
+.mdpm-editor .codeblock-run {
+  --scroll-fade: var(--fade-light);
+  --scroll-fade-lead: clamp(0, var(--code-scroll, 0px) / var(--fade-light), 1);
+  display: inline-block;
+  width: 100%;
+  vertical-align: top;
+  overflow: clip;
+  text-indent: calc(-1 * var(--code-scroll, 0px));
+}
+/* Revealed, the run reaches the border's inner edge, and its tail fades for as long as code runs past it. */
+.mdpm-editor .cm-line.codeblock-revealed {
+  --code-reach: calc(var(--codeblock-pad) - var(--codeblock-border-width));
+}
+.mdpm-editor .codeblock-revealed .codeblock-run {
+  --scroll-fade-trail: clamp(
+    0,
+    (var(--code-overflow, 0px) - var(--code-scroll, 0px) - var(--code-reach)) / var(--fade-light),
+    1
+  );
+  width: calc(100% + var(--code-reach));
+  text-overflow: clip;
+}
+/* With the caret in the block, a highlight spans the code's whole scroll width, held inside the border. */
+.mdpm-editor .codeblock-revealed.codeblock-diff-raw .md-diff {
+  left: calc(var(--codeblock-edge) - min(var(--code-reach), var(--code-scroll, 0px)));
+  right: calc(
+    var(--codeblock-edge) - min(var(--code-reach), var(--code-overflow, 0px) - var(--code-scroll, 0px))
+  );
+}
```

**VERIFY**

- [ ] `grep -c "codeblock-border-width" Core/MarkdownPM/markdown-pm.css` → 3.
- [ ] Run the gates.

---

### Phase 4 — Layer Clip

**GOAL:** The caret and selection layers draw from `coordsAtPos`, which knows nothing of a run's clip. A caret scrolled out of view, or a selection end inside clipped code, would otherwise paint outside the frame. Both layers clip through `codeClip`. This waits on Phase 2, which defines it.

#### Task 4-1

**TASK:** Hide a caret that's past its run's visible span, unless it stands in a diff margin. Clamp a selection's end pieces to their runs.

**NOW:**
- `caretMarkers` (`caret.ts:46–58`) pushes every cursor marker.
- A caret in a diff margin sits at the code seat with `assoc < 0` (`caretInMargin`, `docScan.ts:337–341`), drawn against the sign to the run's left.
- `rangeMarkers` (`selection.ts:16–33`) maps `RectangleMarker.forRange` pieces. The first piece sits on `range.from`'s line, the last on `range.to`'s.
- Markers are in screen pixels from the layer base, which `codeClip` matches.

**CHANGE**

- [ ] Clip both layers.
- [ ] Drive a selection from the middle of a clipped code line into the next line, live. If CM's wrap probe yields an extra zero-height middle piece (a 1px bar, given the `Math.max(…, 1)` floor), drop pieces whose `m.height` is 0 before the map. Otherwise leave that line out.

**AFTER**

```diff ts
--- a/Core/MarkdownPM/caret.ts
+++ b/Core/MarkdownPM/caret.ts
@@ imports @@
+import { codeClip } from './codeScroll'
+import { docScan } from './docCache'
+import { caretInMargin } from './Engine/docScan'
@@ caretMarkers @@
-    for (const m of cursorMarkers(view, 'caret-bar', r.head, r.assoc))
-      out.push(clampToLine(view, 'caret-bar', m))
+    // A caret scrolled out of its code block's run draws nowhere; one in a diff margin stands beside the run, not in it.
+    const clip = caretInMargin(docScan(view.state.doc), r) ? null : codeClip(view, r.head)
+    for (const m of cursorMarkers(view, 'caret-bar', r.head, r.assoc))
+      if (!clip || (m.left >= clip.left && m.left <= clip.right))
+        out.push(clampToLine(view, 'caret-bar', m))
--- a/Core/MarkdownPM/selection.ts
+++ b/Core/MarkdownPM/selection.ts
@@ imports @@
+import { codeClip } from './codeScroll'
@@ rangeMarkers @@
   const foot = range.to <= view.viewport.to ? caretEdge(view, range.to, -1) : undefined
-  return pieces.map((m, i) => {
+  // An end inside a code block's run clips to what the run shows: the head on both sides, the foot on its right.
+  const headClip = codeClip(view, range.from)
+  const footClip = codeClip(view, range.to)
+  return pieces.flatMap((m, i) => {
     const top = i === 0 && head ? head.top : m.top
     const bottom = i === last && foot ? foot.top + foot.height : m.top + m.height
-    return new RectangleMarker(
-      cx(CLS, selCorner(i, pieces.length)),
-      m.left,
-      top,
-      m.width,
-      Math.max(bottom - top, 1),
-    )
+    let left = m.left
+    let right = m.left + m.width
+    if (i === 0 && headClip) {
+      left = Math.max(left, headClip.left)
+      right = Math.min(right, headClip.right)
+    }
+    if (i === last && footClip) right = Math.min(right, footClip.right)
+    return right > left
+      ? [new RectangleMarker(cx(CLS, selCorner(i, pieces.length)), left, top, right - left, Math.max(bottom - top, 1))]
+      : []
   })
```

**VERIFY**

- [ ] Run the gates. jsdom measures every rect at zero, so the checkpoint exercises the clip live.

#### Review Checkpoint

- [ ] **Live drive** (CDP with `~/NexusOS` as the Nexus, setting on), on this plan's own code blocks at `Studio/Pommora/II. Planning/Codeblock Scroll — Implementation Plan.md`. Each check is read from screenshots and DOM probes. Typing checks undo themselves, and the file's hash is compared before and after.
  - **Rest:** a long line ends in an ellipsis at the content edge.
  - **Caret reveal:** the caret entering reveals the block: no ellipsis, and code clipped at the border's inner edge.
  - **Typing:** typing past the edge scrolls with the caret visible in the same frame.
  - **Line boundaries:** End and Cmd-→ land at the line's end in one press, and Home and Cmd-← at the code's start.
  - **Wheel reveal:**
    - a 23px sideways wheel over a resting block doesn't reveal it; 24px does, and later ticks scroll it;
    - a vertical wheel scrolls the page;
    - pointing out to a table or off the editor un-reveals it.
  - **Leaving:** the offset stays, the ellipsis returns, and the lead fade shows.
  - **Clip:**
    - a caret scrolled out draws nothing, while a diff-margin caret still draws;
    - a selection from clipped code to below the block clips to the frame;
    - the selection probe in Task 4-1 is resolved.
  - **Diff highlight:** with the caret in, the bar hides; the highlight runs flush to the border at x 0, and ends at the padded edge at full scroll.
  - **Holds still:** numbers, signs, and the tag; a callout-nested block clips at its own frame.
  - **Whole block bounds the scroll:** with the caret on a short line of a block whose widest line sits off-screen, scrolling to the end reaches that line's end once it's scrolled into view.
  - **Off-screen keeps its offset:** with the caret in a scrolled block, scrolling the page until the block leaves the screen and coming back leaves its offset intact.
  - **Warm cache:** a tab switch and return restores an offset.
  - **Page embed:** a code block inside a page embed, under `--embed-zoom`, reveals, wheel-scrolls, and stops at its padded end when fully scrolled. If it overshoots or stops short, `rest` in `overflowOf` comes from `line.getBoundingClientRect().width / view.scaleX` minus the paddings instead of `clientWidth`.
  - **Setting off:** lines wrap exactly as at baseline.
- [ ] Phase review (opus-high) over Phases 1–4: correctness along every path the diff touches, and anything that duplicates an existing mechanism.

---

### Phase 5 — Documentation

**GOAL:** The feature, the settings reference, and the editor's internal rules describe what ships.

#### Task 5-1

**TASK:** Rewrite the claims this plan makes false, and add the rule it establishes.

**CHANGE**

- [ ] Leave `.claude/Features/MarkdownPM.md` to Nathan, who writes its line himself.
- [ ] **`.claude/Features/ConfigurationPM.md`:** below the `codeblockLineCount` row, add:

  `| Scroll Long Lines In Code Blocks | \`codeblockScroll\` | A code block's long lines stay on one row and scroll sideways instead of wrapping. | On · **Off** |`
- [ ] **`.claude/Guidelines/Editor-Internals.md`:**
  - **`:20`:** correct it so `::after` carries "the fill (and a code block's border)".
  - **Below `:22`:** add:

    > **A code line scrolls inside its run, never as a scroll container.** Each content line's code is one `.codeblock-run` mark given through `EditorView.outerDecorations`, so no other decoration splits it. It wears the label's face (`overScrollFace`) without the label's cap, clips, and shifts by its block's `--code-scroll` text-indent. The frame, gutter, highlight, and tag stay in place. An offset is state keyed by the block's opening line: changing it changes the line decorations, which re-measures the caret and selection layers. Anything those layers draw on a code line clips to `codeClip`. CM's line-boundary probe assumes wrapping, so code lines take their own Home and End.

**VERIFY**

- [ ] Each edited paragraph reads true against what ships, without contradicting the text around it.

---

### Completion Criteria

- **Conformance:**
  - The feature lives in `codeScroll.ts`, the CSS group, the setting's three declarations, `overScrollFace`, and `codeSeat`.
  - `signSeatAt` and the module share one seat computation.
  - Nothing reaches cells or Text values.
- **Correctness:**
  - Every case in the Phase 4 checkpoint holds live.
  - With the setting off, a wrapped block matches baseline pixel for pixel.
- **Completeness:** every task is ticked, with no debug probes, scaffolding, or TODOs.
- **Confirmation:** `codeScroll.test.tsx` goes red without the module, and Nathan's visual pass carries his word.
- **Continuity:** *§Reconciliation* has been walked.
- **Confidence:** gates are green from clean across `{baseline}..HEAD`. The diff lands near the plan's size: about 240 production lines, mostly `codeScroll.ts` and the CSS group.

#### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.

- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5
- [ ] Simplification lens → adversarial lens (opus-high) over `{baseline}..HEAD`
- [ ] Neutral verification (opus-high) over `{baseline}..HEAD`
- [ ] Own pass: gates · diff · criteria
- [ ] Reconciliation walked
- [ ] Report delivered

#### Reconciliation

- `.claude/Features/MarkdownPM.md` — the Code-blocks entry and its knob row — Nathan
- `.claude/Features/ConfigurationPM.md` — the settings table has no `codeblockScroll` row — Task 5-1
- `.claude/Guidelines/Editor-Internals.md:20` — "`::before` carries the border… `::after` carries the fill", which is false for code blocks — Task 5-1
- `Core/MarkdownPM/Engine/docScan.ts:334` — `signSeatAt`'s inline seat arithmetic — Task 1-2

#### Open Items

- **Wide line numbers (approved for now, a fix wanted later):** line numbers of four digits or more outgrow the `3ch` line-number zone, which already shifts their code 1ch in wrap mode. Under this setting that also pushes a revealed run about 6px past the border's inner edge. Widening the zone for such blocks is Nathan's call.

#### Deviations
