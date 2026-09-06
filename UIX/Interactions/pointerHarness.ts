// jsdom has no PointerEvent constructor, measures every rect as zero, and lacks pointer capture —
// these stubs cover exactly those three gaps. Geometry truth stays with the CDP passes, never jsdom.

type PointerOpts = { x?: number; y?: number; button?: number; buttons?: number; pointerId?: number }

export function firePointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  opts: PointerOpts = {},
): void {
  // A real press holds a button through its moves — a zero-buttons move means the release was
  // missed, which the gesture skeleton treats as an abort.
  const held = type === 'pointerdown' || type === 'pointermove'
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: opts.x ?? 0,
    clientY: opts.y ?? 0,
    button: opts.button ?? 0,
    buttons: opts.buttons ?? (held ? 1 : 0),
  })
  Object.defineProperty(e, 'pointerId', { value: opts.pointerId ?? 1 })
  Object.defineProperty(e, 'isPrimary', { value: true })
  target.dispatchEvent(e)
}

export function stubRect(
  el: Element,
  r: { top: number; bottom: number; left?: number; right?: number },
): void {
  const left = r.left ?? 0
  const right = r.right ?? 200
  const rect = {
    top: r.top,
    bottom: r.bottom,
    left,
    right,
    width: right - left,
    height: r.bottom - r.top,
    x: left,
    y: r.top,
    toJSON: () => ({}),
  } as DOMRect
  el.getBoundingClientRect = () => rect
}

export function stubPointerCapture(): void {
  Object.assign(HTMLElement.prototype, {
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
  })
}

export function pressEscape(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}
