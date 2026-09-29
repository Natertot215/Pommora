import { useRef, useState } from 'react'
import {
  useResizable,
  type RememberedSize,
  type ResizeEdge,
  type Size,
} from '../Interactions/useResizable'
import { clamp } from '../Utilities/clamp'
import { VIEWPORT_MARGIN, type PickerDirection } from './PickerMenu'

/** An axis resizes when it has a floor; one without a default fits its content until it's first resized. */
export interface PaneBounds {
  min: Partial<Size>
  /** Capped further by the viewport and the room the pane opened into. */
  max?: Partial<Size>
  default: Partial<Size>
}

export interface PaneResize {
  /** The resizable axes, for the host to apply to its content — a held box or a list's ceiling. */
  size: Partial<Size>
  resizing: boolean
  /** PickerMenu's: the direction it decided on this open and the room that leaves. */
  place: (placed: { dir: PickerDirection; room: number }) => void
  edges: React.JSX.Element[]
}

type Axis = keyof Size

const UNPLACED = { dir: 'down' as PickerDirection, room: Number.POSITIVE_INFINITY }

const PULLS: Record<Axis, RegExp> = { w: /[ew]/, h: /[ns]/ }

// The free edges face away from the anchor.
const FREE_EDGES: Record<PickerDirection, readonly ResizeEdge[]> = {
  down: ['e', 'w', 's', 'se', 'sw'],
  up: ['e', 'w', 'n', 'ne', 'nw'],
}

// The layout box inside the padding: what the host sized, and where a drag starts from even when a list sits under its ceiling.
function contentBox(box: HTMLElement): Size {
  const cs = getComputedStyle(box)
  const px = (v: string): number => Number.parseFloat(v)
  return {
    w: box.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight),
    h: box.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom),
  }
}

/** A PickerMenu pane the user sizes from its free edges: reset to the remembered size on each open, clamped to the viewport and the room it opened into. */
export function usePaneResize(
  open: boolean,
  bounds: PaneBounds,
  /** Absent, a resized pane forgets its size on close. */
  geometry?: RememberedSize,
): PaneResize {
  const [placed, setPlaced] = useState(UNPLACED)
  const [resized, setResized] = useState<Partial<Size> | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setResized(null)
      setPlaced(UNPLACED)
    }
  }

  const { min } = bounds
  const max: Size = {
    w: Math.min(bounds.max?.w ?? Number.POSITIVE_INFINITY, window.innerWidth - 2 * VIEWPORT_MARGIN),
    h: Math.min(bounds.max?.h ?? Number.POSITIVE_INFINITY, placed.room),
  }
  const stored = geometry?.initialSize
  const held = resized ?? { ...bounds.default, ...stored }
  const fit = (axis: Axis): number | undefined => {
    const floor = min[axis]
    const v = held[axis]
    return floor === undefined || v === undefined
      ? undefined
      : clamp(Math.round(v), floor, max[axis])
  }

  const pressed = useRef<Size>({ w: 0, h: 0 })
  const resize = useResizable<Size>({
    rect: (box) => (pressed.current = contentBox(box)),
    min,
    max,
    equilateral: true,
    outlined: true,
    onChange: (next, phase, grip) => {
      if (phase === 'abort') {
        setResized(resized)
        return
      }
      // The box measured at press seeds only the axes the grip pulls, and only a pull inward lowers what an axis held, so a short list's ceiling outlives the drag and an unpulled width keeps fitting its content.
      const pulled = (axis: Axis): number | undefined => {
        const was = held[axis]
        if (!PULLS[axis].test(grip)) return was
        return Math.round(
          next[axis] < pressed.current[axis] ? next[axis] : Math.max(next[axis], was ?? 0),
        )
      }
      const box = { w: pulled('w'), h: pulled('h') }
      setResized(box)
      if (phase !== 'drop') return
      // A drop held at a ceiling only this open's room imposed keeps the larger size it opened from.
      const keep = (axis: Axis): number | undefined => {
        const v = box[axis]
        const was = stored?.[axis]
        return v !== undefined && was !== undefined && v >= max[axis] && was > max[axis] ? was : v
      }
      const w = keep('w')
      const h = keep('h')
      geometry?.onSizeChange({ ...(w !== undefined && { w }), ...(h !== undefined && { h }) })
    },
  })

  return {
    size: { w: fit('w'), h: fit('h') },
    resizing: resize.active !== null,
    place: setPlaced,
    edges: resize.edges(
      FREE_EDGES[placed.dir].filter((e) =>
        (['w', 'h'] as const).every((axis) => min[axis] !== undefined || !PULLS[axis].test(e)),
      ),
    ),
  }
}
