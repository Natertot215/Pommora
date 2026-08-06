// CSS can only recolour the browser's native caret, never reshape it, so this paints the SAME
// `.mdpm-caret` visual over whichever field is focused. Attaches globally — one focus listener at
// the document root — without editing components. The native caret is hidden in Carets.css; here
// we only position the drawn bar.

// Computed-style props copied onto the measuring mirror so its text lays out exactly like the field's.
const MIRROR_PROPS = [
  'boxSizing',
  'width',
  'height',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontStretch',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'textAlign',
  'textIndent',
  'textTransform',
  'tabSize',
] as const

type Field = HTMLInputElement | HTMLTextAreaElement

// email/number return null selectionStart, so skip. `password` is out on purpose: it renders
// masked dots, so the mirror's real-character widths would mis-place the caret.
const TEXT_TYPES = new Set(['', 'text', 'search', 'url', 'tel'])

const isField = (el: EventTarget | null): el is Field =>
  (el instanceof HTMLTextAreaElement && !el.readOnly && !el.disabled) ||
  (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled)

// Editable text that ISN'T a CodeMirror surface (those carry customCaret already).
const isEditable = (el: EventTarget | null): el is HTMLElement =>
  el instanceof HTMLElement && el.isContentEditable && !el.closest('.cm-editor')

interface CaretRect {
  x: number
  y: number
  h: number
}

let bar: HTMLDivElement | null = null
let mirror: HTMLDivElement | null = null
let active: HTMLElement | null = null
let raf = 0
let started = false
// A field that resizes AFTER focus (`field-sizing` growth, or a picker pane re-centering as it
// does) strands the bar at its focus-time spot — re-measure on resize.
let fieldRO: ResizeObserver | null = null
// Cached so the per-frame path only updates text + position, not the full mirror style.
let styledEl: Field | null = null
let styledH = 0

function ensureNodes(): void {
  if (!bar) {
    bar = document.createElement('div')
    bar.className = 'mdpm-caret-overlay'
    bar.style.display = 'none'
    document.body.appendChild(bar)
  }
  if (!mirror) {
    mirror = document.createElement('div')
    mirror.setAttribute('aria-hidden', 'true')
    Object.assign(mirror.style, {
      position: 'fixed',
      visibility: 'hidden',
      pointerEvents: 'none',
      overflow: 'hidden',
      zIndex: '-1',
      top: '0',
      left: '0',
    })
    document.body.appendChild(mirror)
  }
}

// Only needed when the active field changes (or layout shifts on resize) — never per keystroke.
function syncMirror(el: Field): void {
  const cs = getComputedStyle(el)
  const m = mirror as HTMLDivElement
  const ms = m.style as unknown as Record<string, string>
  const src = cs as unknown as Record<string, string>
  for (const p of MIRROR_PROPS) ms[p] = src[p]
  m.style.whiteSpace = el instanceof HTMLInputElement ? 'pre' : 'pre-wrap'
  m.style.wordWrap = el instanceof HTMLInputElement ? 'normal' : 'break-word'
  styledH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
  styledEl = el
}

function fieldCaret(el: Field): CaretRect | null {
  const m = mirror as HTMLDivElement
  if (styledEl !== el) syncMirror(el)
  const rect = el.getBoundingClientRect()
  m.style.left = `${rect.left}px`
  m.style.top = `${rect.top}px`
  const pos = el.selectionStart ?? el.value.length
  m.textContent = el.value.slice(0, pos)
  // The trailing span's LEFT edge marks the caret; a lone `.` stands in when the caret's at the
  // end so the span has a box. Assumes left-aligned text (revisit here if a right/centered input
  // ever appears).
  const span = document.createElement('span')
  span.textContent = el.value.slice(pos) || '.'
  m.appendChild(span)
  const sr = span.getBoundingClientRect()
  m.textContent = ''
  const x = sr.left - el.scrollLeft
  const y = sr.top - el.scrollTop
  // No box (detached / display:none).
  if (rect.width === 0 && rect.height === 0) return null
  // Scrolled out of view. Horizontally the caret is a point, so a point test holds. Vertically it's
  // a bar that can overhang the field's border box at rest — a line-height tighter than the font's
  // own content area gives the line box negative half-leading — so the bar need only intersect.
  if (x < rect.left - 1 || x > rect.right + 1) return null
  if (y + styledH <= rect.top || y >= rect.bottom) return null
  return { x, y, h: styledH }
}

function editableCaret(el: HTMLElement): CaretRect | null {
  const sel = getSelection()
  if (!sel?.rangeCount) return null
  const r = sel.getRangeAt(0).cloneRange()
  r.collapse(true)
  const rect = r.getClientRects()[0] ?? r.getBoundingClientRect()
  if (!rect || (rect.height === 0 && rect.width === 0 && rect.left === 0)) return null // empty line — skip, don't mutate the DOM
  const cs = getComputedStyle(el)
  return {
    x: rect.left,
    y: rect.top,
    h: parseFloat(cs.lineHeight) || rect.height || parseFloat(cs.fontSize) * 1.4,
  }
}

function reposition(): void {
  raf = 0
  const b = bar as HTMLDivElement
  if (!active?.isConnected) {
    b.style.display = 'none'
    return
  }
  const c = isField(active) ? fieldCaret(active) : isEditable(active) ? editableCaret(active) : null
  if (!c) {
    b.style.display = 'none'
    return
  }
  b.style.display = 'block'
  b.style.left = `${c.x}px`
  b.style.top = `${c.y}px`
  b.style.height = `${c.h}px`
  // Restart the fade on every move so the caret reads solid the instant it relocates — same
  // keyframe-swap trick the editor's caret.ts uses; the animation name IS the state, no extra flag.
  b.style.animationName = b.style.animationName === 'mdpm-blink2' ? 'mdpm-blink' : 'mdpm-blink2'
}

function schedule(): void {
  // Nothing focused → nothing to draw; don't burn a frame on every scroll/resize elsewhere in the app.
  if (active && !raf) raf = requestAnimationFrame(reposition)
}

// A pane may still be animating open (the Bloom scale, the center-origin re-place) when its field
// takes focus — moves no listener above can see, since transforms never touch the layout box the
// ResizeObserver watches. A fresh focus re-measures every frame until the bar holds still, then
// stops; the deadline caps a host that never settles.
let settleRaf = 0
const SETTLE_STILL_FRAMES = 2
const SETTLE_DEADLINE_MS = 400
function beginSettle(): void {
  cancelAnimationFrame(settleRaf)
  const startedAt = performance.now()
  let last: string | null = null
  let still = 0
  const tick = (): void => {
    settleRaf = 0
    const b = bar
    if (!active || !b) return
    reposition()
    const key = `${b.style.left}|${b.style.top}|${b.style.display}`
    if (key === last) still++
    else {
      still = 0
      last = key
    }
    if (still >= SETTLE_STILL_FRAMES || performance.now() - startedAt > SETTLE_DEADLINE_MS) return
    settleRaf = requestAnimationFrame(tick)
  }
  settleRaf = requestAnimationFrame(tick)
}

export function initNativeCaret(): void {
  if (started || typeof document === 'undefined') return
  started = true
  ensureNodes()
  document.addEventListener('focusin', (e) => {
    active = isField(e.target) || isEditable(e.target) ? (e.target as HTMLElement) : null
    fieldRO?.disconnect()
    if (active) {
      // Defer a frame before scheduling so the re-measure lands AFTER the pane's resultant
      // re-center render, not on the intermediate geometry (which strands the bar a few px off).
      fieldRO = new ResizeObserver(() => {
        styledEl = null
        requestAnimationFrame(schedule)
      })
      fieldRO.observe(active)
      beginSettle()
    }
    schedule()
  })
  document.addEventListener('focusout', (e) => {
    // Hide directly — schedule() now no-ops once `active` is null, so it can't do the hide for us.
    if (e.target === active) {
      active = null
      styledEl = null
      fieldRO?.disconnect()
      cancelAnimationFrame(settleRaf)
      if (bar) bar.style.display = 'none'
    }
  })
  // Any event that can move the caret. Capture so a field's own scroll (which doesn't bubble) is seen too.
  for (const ev of ['input', 'keyup', 'click', 'pointerup', 'select', 'scroll']) {
    document.addEventListener(ev, schedule, true)
  }
  document.addEventListener('selectionchange', schedule)
  // Layout may shift the field on resize — force a one-time mirror re-sync next frame.
  window.addEventListener('resize', () => {
    styledEl = null
    schedule()
  })
  window.addEventListener('scroll', schedule, true)
}
