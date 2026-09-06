import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { cancelGlance, closeGlance } from '../../Interface/Glance/glanceAction'
import { seatAtNearerEdge } from './caretPlacement'

/** Read at mousedown for a click, since CM seats the caret before `click` fires and it would always read true. */
function caretInside(view: EditorView, range: [number, number]): boolean {
  const head = view.state.selection.main.head
  return view.hasFocus && head >= range[0] && head <= range[1]
}

export interface PointerTarget {
  range: [number, number]
  onText: boolean
  hidesSyntax: boolean
  pos: number
}

interface PointerSpec<H extends PointerTarget> {
  hoverGate: string
  /** Asked before the class gate, so a host that offers no glance pays neither the layout read nor the tokenize. */
  armable: () => boolean
  hitAt: (view: EditorView, event: MouseEvent) => H | null
  follow: (hit: H, view: EditorView, event: MouseEvent) => (() => void) | null
  dwell: (hit: H, el: Element) => (() => void) | null
  menu: (hit: H, view: EditorView) => (() => void) | null
}

/** The wikilink and the markdown link differ only in what they find and where it leads; the gesture grammar over it is one. */
export function pointerHandlers<H extends PointerTarget>(spec: PointerSpec<H>): Extension {
  // Never cancel before the gate: four handlers share one editor, and a pre-gate cancel from the ones
  // that arm nothing would kill the dwell the one that does just started.
  let editingOnPress = false
  // A native menu takes the pointer away and hands it back over the same link, and that re-entry would bloom a glance behind the menu.
  let actedOnLink = false
  const consume = (): void => {
    cancelGlance()
    actedOnLink = true
  }
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      const hit = spec.hitAt(view, event)
      editingOnPress = hit ? caretInside(view, hit.range) : false
      if (!hit) return false
      const go = spec.follow(hit, view, event)
      // A right press hands the caret to whichever menu action is chosen, and Rename and Edit Link place
      // it themselves. LOAD-BEARING for the menu itself: `contextmenu` reads the live caret to decide it is
      // inside the syntax and should stand down, so a fallthrough seats one on every right-press and the
      // menu never appears. No test covers it — jsdom seats no caret from synthetic coordinates.
      if (event.button === 2) return go != null
      // Everything below is the plain single left press; the other buttons keep CM's own semantics.
      if (event.button !== 0 || event.shiftKey || event.detail > 1) return false
      // A press that missed the drawn text but clamped inside belongs outside — the zero-width marker that
      // made the coordinate land here would drop the caret inside a label the pointer never touched.
      if (!hit.onText && hit.hidesSyntax && !editingOnPress)
        return seatAtNearerEdge(view, hit.pos, hit.range)
      if (!go || editingOnPress) return false
      event.preventDefault()
      return true
    },
    mouseover(event, view) {
      if (!spec.armable()) return false
      const el = (event.target as HTMLElement).closest?.(spec.hoverGate)
      if (!el || actedOnLink) return false
      const hit = spec.hitAt(view, event)
      // A link the caret is already inside is open for editing, and no dwell should carry you away from it.
      if (!hit || caretInside(view, hit.range)) return false
      spec.dwell(hit, el)?.()
      return false
    },
    mouseout() {
      cancelGlance()
      actedOnLink = false
      return false
    },
    // On `click`, not `mousedown`, and skipped on a non-empty selection, so dragging across a link highlights it.
    click(event, view) {
      // A click consumes the link — an intent armed during the dwell must not bloom over what the click opened.
      consume()
      if (event.button !== 0 || event.detail !== 1 || !view.state.selection.main.empty) return false
      if (editingOnPress) return false
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
      // Inside its syntax you're editing prose, which has its own menu — claiming the event would replace it with two link actions.
      if (caretInside(view, hit.range)) return false
      const pop = spec.menu(hit, view)
      if (!pop) return false
      event.preventDefault()
      closeGlance()
      pop()
      return true
    },
  })
}
