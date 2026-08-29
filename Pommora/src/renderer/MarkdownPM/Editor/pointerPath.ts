import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { closeActiveHoverCard } from '@renderer/Links/PanePresenter'
import { seatAtNearerEdge } from './caretSeat'

/** KNOB — the dwell before a connection's preview blooms. Exported so tests wait on the real value
 *  rather than restating it: a test that hard-codes the number goes red the moment it's tuned. */
export const CONN_HOVER_INTENT_MS = 1000

/** One pending hover intent — re-arming replaces it, cancel is idempotent. Shared by the editor's
 *  own handlers and the table's resting-cell trigger, so the delay stays one fact. */
export function hoverIntent(): { arm: (fire: () => void) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return {
    arm: (fire) => {
      cancel()
      timer = setTimeout(fire, CONN_HOVER_INTENT_MS)
    },
    cancel,
  }
}

/** Whether the caret currently sits inside the token — a link being edited. Read at mousedown for a
 *  click, since CM seats the caret before `click` fires and it would otherwise always read true. */
function caretInside(view: EditorView, range: [number, number]): boolean {
  const head = view.state.selection.main.head
  return view.hasFocus && head >= range[0] && head <= range[1]
}

/** What a pointer gesture found under itself, in the terms every pointer path shares. */
export interface PointerTarget {
  /** The whole token, markers included. */
  range: [number, number]
  /** Whether the gesture landed on the token's own drawn text rather than clamping in from beside it. */
  onText: boolean
  /** Whether the token is drawn with syntax hidden, and so has zero-width space beside it to clamp
   *  from. A token drawn whole is aiming exactly where the pointer landed. */
  hidesSyntax: boolean
  pos: number
}

/** One link-shaped construct's answers. Everything else — the caret record, the acted-on latch, the
 *  claim protocol, the clamp, the intent's cancel/dismiss pairing — is the factory's. */
interface PointerSpec<H extends PointerTarget> {
  /** The cheap class gate a mouseover passes before any layout read or tokenize (the every-mouseover
   *  hard rule). */
  hoverGate: string
  /** Whether a dwell could bloom anything at all on this surface — asked before the class gate, so a
   *  host that offers no preview (a read-only embed, the hover preview's own editor) pays neither the
   *  layout read nor the tokenize. */
  armable: () => boolean
  hitAt: (view: EditorView, event: MouseEvent) => H | null
  /** What a click does, or null when there is nothing to follow. This IS the claim: a press is
   *  claimed exactly when there is something to follow, so a token that leads nowhere seats a caret
   *  the way any other text does and its click can reach no opener. */
  follow: (hit: H, view: EditorView, event: MouseEvent) => (() => void) | null
  /** What a dwell blooms, or null for nothing. */
  dwell: (hit: H, el: Element) => (() => void) | null
  /** What a right press offers, or null for nothing. */
  menu: (hit: H, view: EditorView) => (() => void) | null
}

/** The pointer handlers every link-shaped construct wears. The wikilink and the markdown link differ
 *  only in what they find and where it leads; the gesture grammar over it is one. */
export function pointerHandlers<H extends PointerTarget>(spec: PointerSpec<H>): Extension {
  // The pending hover intent — armed on mouseover of a drawn link, canceled the moment the pointer
  // leaves it (mouseout fires per CM6 text span; re-entry re-arms fresh).
  const intent = hoverIntent()
  // Was the caret in this link BEFORE the press moved it? CM seats the caret on mousedown, so the
  // click handler can no longer tell "I was editing this" from "I just clicked it" on its own.
  let editingOnPress = false
  // A link that has just been acted on stops arming until the pointer leaves it. Cancelling once
  // isn't enough: a native menu takes the pointer away and hands it back over the same link, and
  // that re-entry is a fresh mouseover that would bloom a preview behind the menu you just used.
  let actedOnLink = false
  /** The pair every gesture that replaces the pointer's meaning owes it: cancel what is armed, and
   *  dismiss what is already open. */
  const consume = (): void => {
    intent.cancel()
    actedOnLink = true
  }
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const hit = spec.hitAt(view, event)
      editingOnPress = hit ? caretInside(view, hit.range) : false
      if (!hit) return false
      const go = spec.follow(hit, view, event)
      // A right press hands the caret to whichever menu action is chosen, and Rename and Edit Link
      // exist to place it themselves — seating one here would land it somewhere first and make both
      // of them meaningless. Claiming the press does preventDefault it, which Chromium generates
      // `contextmenu` independently of, so the menu still opens.
      //
      // LOAD-BEARING for the menu itself: `contextmenu` reads the live caret to decide it's inside
      // the syntax and should stand down. Let this fall through and CM seats a caret in the link on
      // every right-press, so that read is always true and the menu never appears anywhere. No test
      // covers the coupling — jsdom seats no caret from synthetic coordinates, so one would pass
      // either way.
      if (event.button === 2) return go != null
      // Everything below is the plain single left press. Extending a selection, double- and
      // triple-click, and the other buttons keep CM's own semantics over a link like anywhere else.
      if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
      // A press that missed the link's drawn text but clamped INSIDE it belongs outside — the same
      // zero-width marker that made the coordinate land here would otherwise drop the caret in the
      // middle of a label the pointer never touched. Only where something is actually hidden: a
      // token drawn whole is aiming at exactly where it landed, and once a link is open for editing
      // its syntax is real text, which is the same thing.
      if (!hit.onText && hit.hidesSyntax && !editingOnPress)
        return seatAtNearerEdge(view, hit.pos, hit.range)
      // A press about to follow the link would flash its syntax on the way out. Pressing a link
      // you're already editing, or one that leads nowhere, still seats normally.
      if (!go || editingOnPress) return false
      event.preventDefault()
      return true
    },
    mouseover(event, view) {
      intent.cancel()
      if (!spec.armable()) return false
      // Cheap class gate next: only a drawn link warrants the layout read + tokenize below.
      const el = (event.target as HTMLElement).closest?.(spec.hoverGate)
      if (!el || actedOnLink) return false
      const hit = spec.hitAt(view, event)
      // A dwell reads the live caret safely — unlike a click, hovering never moves it. A link the
      // caret is already inside is open for editing, and no dwell should carry you away from what
      // you're typing.
      if (!hit || caretInside(view, hit.range)) return false
      const bloom = spec.dwell(hit, el)
      if (bloom) intent.arm(bloom)
      return false
    },
    mouseout() {
      intent.cancel()
      actedOnLink = false
      return false
    },
    // Navigate on a plain single-click. Handled on `click`, not `mousedown`, and skipped when the
    // selection is non-empty — so dragging across a link highlights it instead of navigating away.
    click(event, view) {
      // A click consumes the link — an intent armed during the dwell must not bloom over
      // whatever the click opened.
      consume()
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      if (editingOnPress) return false // already inside it when you pressed — editing, not following
      const hit = spec.hitAt(view, event)
      const go = hit && spec.follow(hit, view, event)
      if (!go) return false
      event.preventDefault()
      go()
      return true
    },
    contextmenu(event, view) {
      consume()
      const hit = spec.hitAt(view, event)
      if (!hit) return false
      // Inside its syntax you're editing prose, and prose has its own menu — spelling, autocorrect,
      // substitutions. Claiming the event there would replace all of it with two link actions.
      if (caretInside(view, hit.range)) return false
      const pop = spec.menu(hit, view)
      if (!pop) return false
      event.preventDefault()
      // Only a press that actually pops a menu dismisses the pane — a hover preview mounts a real
      // editor carrying this same path, and its links arm no menu, so an unconditional close there
      // would shut the preview the gesture was aimed inside.
      closeActiveHoverCard()
      pop()
      return true
    },
  })
}
