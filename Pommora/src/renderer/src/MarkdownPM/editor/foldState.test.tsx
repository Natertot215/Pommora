// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import type { EditorView } from '@codemirror/view'
import { cleanupEditor, mountEditor, stubEditorBridge } from '@renderer/testing/editorHarness'
import {
  applySavedFolds,
  foldedRegions,
  regionsOf,
  toggleFoldAt,
  HEADING_FOLD_LINE,
  type FoldKind,
} from './folding'
import { HOT_MENU_LINES } from './gripMenu'
import { headingSections } from './headingScan'
import { citationScan, splitWithOffsets } from '../detect'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
stubEditorBridge()

afterEach(async () => {
  await cleanupEditor()
})

const DOC = '# One\nbody one\nmore one\n\n# Two\nbody two'

const fold = async (view: EditorView, at: number): Promise<void> => {
  await act(async () => {
    toggleFoldAt(view, at)
  })
}

describe('the fold state machine', () => {
  it('a fold names its region, and reports it back', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['One'])
  })

  it('two sections fold independently, and each keeps its own key', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await fold(view, DOC.indexOf('# Two'))
    expect(
      foldedRegions(view.state)
        .map((r) => r.key)
        .sort(),
    ).toEqual(['One', 'Two'])
  })

  // An edit above a collapsed section moves it. The entry remaps with the document; anything the
  // reveal draws has to move with the entry, or the widget renders an empty box over hidden lines.
  it('an edit above a collapsed section keeps the section, and keeps what it draws', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, DOC.indexOf('# Two'))
    const before = foldedRegions(view.state)[0]
    await act(async () => {
      view.dispatch({ changes: { from: 0, to: 0, insert: 'preamble\n\n' } })
    })
    const after = foldedRegions(view.state)[0]
    expect(after?.key).toBe('Two')
    expect(after?.anchor).toBe(before.anchor + 'preamble\n\n'.length)
    expect(after?.hasBody).toBe(true)
  })

  // Without the prune, the body stays hidden behind a widget with no chevron anywhere to expand it —
  // invisible until the page is reloaded.
  it('deleting a folded heading drops its fold rather than hiding the body forever', async () => {
    const view = await mountEditor({ initialBody: DOC })
    const at = DOC.indexOf('# Two')
    await fold(view, at)
    await act(async () => {
      view.dispatch({ changes: { from: at, to: at + '# Two\n'.length, insert: '' } })
    })
    expect(foldedRegions(view.state)).toEqual([])
  })

  // A fold is identified by where it sits, so a deletion that lands another region of the same kind
  // on the same offset hands the fold over rather than dropping it. Recorded, not endorsed: a
  // stabler identity than an offset is its own decision.
  it('a region arriving at a folded one’s offset inherits the fold', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await act(async () => {
      view.dispatch({ changes: { from: 0, to: DOC.indexOf('# Two'), insert: '' } })
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['Two'])
  })

  it('saved keys re-apply to the sections that carry them, and nothing else', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await act(async () => {
      applySavedFolds(view, ['Two', 'Nonexistent'])
    })
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['Two'])
  })

  it('toggling a folded section opens it', async () => {
    const view = await mountEditor({ initialBody: DOC })
    await fold(view, 0)
    await fold(view, 0)
    // Opening is animated, so the entry survives as 'expanding' until the transition lands — what
    // matters is that it stops counting as folded.
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual([])
  })

  it('a heading with no body under it has nothing to fold', async () => {
    const view = await mountEditor({ initialBody: '# One\n# Two\nbody' })
    await fold(view, 0)
    expect(foldedRegions(view.state)).toEqual([])
  })

  // A body of exactly one empty line has nothing to collapse, and admitting it hands out a chevron
  // over a fold whose widget never renders — so the transition that ends the animation never fires,
  // the entry strands mid-phase, and the chevron stops answering after two clicks.
  it('a heading whose body is one blank line offers no fold at all', async () => {
    const view = await mountEditor({ initialBody: '# One\n\n# Two\nbody two' })
    for (let i = 0; i < 4; i++) await fold(view, 0)
    expect(foldedRegions(view.state)).toEqual([])
    expect(view.dom.querySelectorAll('.mdpm-fold-reveal')).toHaveLength(0)
    // And the heading that does have a body still folds.
    await fold(view, '# One\n\n'.length)
    expect(foldedRegions(view.state).map((r) => r.key)).toEqual(['Two'])
  })
})

// ── The citations section as a fold region ─────────────────────────────────────
// Its disclosure is the editor's fold motion, but its state is a per-page override rather than a
// row in the shared fold store — so it takes the registry and skips persistence entirely.

const CITED = '# Notes\nbody[^a] here\n\n[^a]: the citation\n[^b]: another'
const NESTED = '# Title\nintro\n\n## Sources\nmid\n\n[^a]: one'

const startOf = (doc: string, line: number): number => splitWithOffsets(doc).lineStarts[line]
const kinds = (view: EditorView): FoldKind[] => foldedRegions(view.state).map((r) => r.kind)
const citeRegion = (view: EditorView): ReturnType<typeof regionsOf>[number] | undefined =>
  regionsOf(view.state.doc).find((r) => r.kind === 'citations')

describe('the citations section folds', () => {
  it('a page opens with its section already hidden, which is the factory default', async () => {
    const view = await mountEditor({ initialBody: CITED })
    expect(kinds(view)).toEqual(['citations'])
  })

  it('and shown where the page says so', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    expect(kinds(view)).toEqual([])
  })

  it('the divider folds the section, and folds it back open', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    await fold(view, startOf(CITED, 2))
    expect(kinds(view)).toEqual(['citations'])
    await fold(view, startOf(CITED, 2))
    expect(kinds(view)).toEqual([])
  })

  it('a section of exactly one citation still folds, because its anchor sits above it', async () => {
    const one = 'body\n\n[^a]: one'
    const view = await mountEditor({ initialBody: one, citationsShown: true })
    await fold(view, startOf(one, 1))
    expect(kinds(view)).toEqual(['citations'])
  })

  it('a document that begins with a citation has no region, so it can never hide itself', async () => {
    const view = await mountEditor({ initialBody: '[^a]: one\n[^b]: two' })
    expect(citeRegion(view)).toBeUndefined()
  })

  // Fold entries are identified by anchor alone. Anchoring the section on the line it renders
  // against — prose the user owns — would let one Enter there move the live anchor, orphan the
  // entry, and pop a hidden section open with the override still reading hidden.
  it('an edit on the rendered anchor line leaves the fold intact', async () => {
    for (const edit of ['enter', 'backspace'] as const) {
      const view = await mountEditor({ initialBody: CITED, citationsShown: true })
      await fold(view, startOf(CITED, 2))
      const at = startOf(CITED, 2)
      await act(async () => {
        view.dispatch(
          edit === 'enter'
            ? { changes: { from: at, to: at, insert: '\n' } }
            : { changes: { from: at - 1, to: at, insert: '' } },
        )
      })
      expect(kinds(view), edit).toEqual(['citations'])
      await cleanupEditor()
    }
  })
})

describe('the section never joins the fold store', () => {
  it('a folded section leaves the saved key set to the headings alone', async () => {
    const saved: string[][] = []
    const view = await mountEditor({
      initialBody: CITED,
      citationsShown: true,
      folds: { load: async () => [], save: (keys) => saved.push(keys) },
    })
    await fold(view, 0)
    await fold(view, startOf(CITED, 2))
    expect(kinds(view).sort()).toEqual(['citations', 'heading'])
    expect(saved[saved.length - 1]).toEqual(['Notes'])
  })

  // The seed runs before applySavedFolds has restored the heading folds. Un-annotated, it would
  // write the surviving key set — an empty one — and erase them on every open of a footnoted page.
  it('seeding the section at mount writes nothing at all', async () => {
    const saved: string[][] = []
    await mountEditor({
      initialBody: CITED,
      citationsShown: false,
      folds: { load: async () => ['Notes'], save: (keys) => saved.push(keys) },
    })
    expect(saved).toEqual([])
  })

  it('its key is a sentinel no heading scan can spell', async () => {
    const view = await mountEditor({ initialBody: CITED })
    expect(citeRegion(view)?.key.charCodeAt(0)).toBe(0)
    expect(headingSections(CITED).map((h) => h.key)).toEqual(['Notes'])
  })
})

describe('a heading stops where the citations section starts', () => {
  // A single-heading document has exactly one section reaching the end, so it greenlights the bug
  // the clamp is for. Both of the nested document's sections run to the end unclamped.
  it('every section reaching the boundary clamps, not just the last', async () => {
    const view = await mountEditor({ initialBody: NESTED })
    const cut = startOf(NESTED, 5)
    const heads = regionsOf(view.state.doc).filter((r) => r.kind === 'heading')
    expect(heads.map((h) => h.key)).toEqual(['Title', 'Sources'])
    for (const h of heads) expect(h.to, h.key).toBe(cut)
  })

  it('and without the clamp both of them swallow it', () => {
    const end = NESTED.length
    expect(headingSections(NESTED).map((h) => h.to)).toEqual([end, end])
  })

  // Three answers to one question, asserted against one document: where the section starts, where
  // the fold's body starts, and where the heading above it stops.
  it('the region, the scan and the clamped heading agree on the boundary', async () => {
    const view = await mountEditor({ initialBody: NESTED })
    const scan = citationScan(splitWithOffsets(NESTED), [])
    const r = citeRegion(view)
    expect(scan.firstLine).toBe(6)
    expect(r?.anchor).toBe(startOf(NESTED, scan.firstLine))
    expect(r?.lineEnd).toBe(r!.anchor - 1)
    const heads = regionsOf(view.state.doc).filter((h) => h.kind === 'heading')
    for (const h of heads) expect(h.to, h.key).toBe(startOf(NESTED, scan.anchorLine))
  })

  // When a run starts immediately under a heading, that heading's clamped span is its own line —
  // and a body of one line or less is dropped, so there is no heading region to collide with.
  it('a heading immediately above a run yields one region, anchored on the heading', async () => {
    const tight = '## Refs\n[^a]: one'
    const view = await mountEditor({ initialBody: tight })
    const all = regionsOf(view.state.doc)
    expect(all.map((r) => r.kind)).toEqual(['citations'])
    expect(all[0].anchorLine).toBe(0)
  })
})

// ── The chevron class and the heading gesture separate ─────────────────────────
// `md-foldable` meant four things at once: draw a chevron, gate the heading drag, answer the grip
// menu's hit-test, and be the hover card's click-to-fold target. A non-heading anchor wearing it
// inherits all four, and the third fails silently — the press is defaulted away and main stands its
// own menu down, then the heading menu bails on a line holding no heading, opening nothing at all.

const lineEls = (view: EditorView): HTMLElement[] => [
  ...view.dom.querySelectorAll<HTMLElement>('.cm-line'),
]

const rightPress = (el: HTMLElement): boolean => {
  const e = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: -1,
    button: 2,
  })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('a fold chevron and a heading gesture stop sharing one class', () => {
  it('a heading anchor keeps every one of them', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    const head = lineEls(view)[0]
    expect(head.classList.contains('md-foldable')).toBe(true)
    expect(head.classList.contains('md-fold-open')).toBe(true)
    expect(head.classList.contains(HEADING_FOLD_LINE)).toBe(true)
    expect(HOT_MENU_LINES).toContain(HEADING_FOLD_LINE)
  })

  it('the section anchor draws no chevron and answers no heading gesture', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    const divider = lineEls(view)[2]
    for (const c of ['md-foldable', 'md-fold-open', 'md-fold-closed', HEADING_FOLD_LINE])
      expect(divider.classList.contains(c), c).toBe(false)
    expect(HOT_MENU_LINES.some((c) => divider.classList.contains(c))).toBe(false)
  })

  it('a heading right-press still reaches the heading menu', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    expect(rightPress(lineEls(view)[0])).toBe(true)
  })

  it('the section right-press falls through to the ordinary editor menu', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    expect(rightPress(lineEls(view)[2])).toBe(false)
  })

  // The disabled half: before the split these were one string, so the section's anchor wore the
  // chevron class and was swallowed by the hit-test. The chevron class alone no longer does that,
  // and the gesture class alone still does — which is the whole of what the split moved.
  it('the chevron class alone no longer confers the gesture, and the gesture class alone still does', async () => {
    const view = await mountEditor({ initialBody: CITED, citationsShown: true })
    const divider = lineEls(view)[2]
    divider.classList.add('md-foldable')
    expect(rightPress(divider)).toBe(false)
    divider.classList.add(HEADING_FOLD_LINE)
    expect(rightPress(divider)).toBe(true)
  })
})
