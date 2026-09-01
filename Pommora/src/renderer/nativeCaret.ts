// CSS can only recolor the browser's native caret and selection, never reshape either, so this paints the
// same `.mdpm-caret` bar and `.mdpm-sel` pills the editor draws over whichever field is focused. One
// document-root focus listener, so no component has to opt in.

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

const lineHeight = (cs: CSSStyleDeclaration, fallback = 0): number =>
  parseFloat(cs.lineHeight) || fallback || parseFloat(cs.fontSize) * 1.4

interface CaretRect {
  x: number
  y: number
  h: number
}

interface PillRect extends CaretRect {
  w: number
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
let host: HTMLDivElement | null = null
let hostParent: HTMLElement | null = null
let hostIsolation = ''
// The active field's cumulative CSS zoom (a view tile scales its table with `zoom`). Client rects
// read in screen px; the mirror's text and the host's children lay out in local px — the two
// spaces differ by exactly this factor.
let zoom = 1

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
  styledH = lineHeight(cs)
  styledEl = el
}

// The mirror lays out over the field's own box, so a rect measured inside it reads in the field's space.
function seatMirror(el: Field): { m: HTMLDivElement; box: DOMRect } {
  const m = mirror as HTMLDivElement
  if (styledEl !== el) syncMirror(el)
  const box = el.getBoundingClientRect()
  // Zoomed to the field's scale so its glyphs measure in screen px; its own offsets scale with it.
  m.style.zoom = String(zoom)
  m.style.left = `${box.left / zoom}px`
  m.style.top = `${box.top / zoom}px`
  return { m, box }
}

function fieldCaret(el: Field): CaretRect | null {
  const { m, box } = seatMirror(el)
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
  const x = sr.left - el.scrollLeft * zoom
  const y = sr.top - el.scrollTop * zoom
  const h = styledH * zoom
  // No box (detached / display:none).
  if (box.width === 0 && box.height === 0) return null
  // Scrolled out of view. Horizontally the caret is a point, so a point test holds. Vertically it's
  // a bar that can overhang the field's border box at rest — a line-height tighter than the font's
  // own content area gives the line box negative half-leading — so the bar need only intersect.
  if (x < box.left - 1 || x > box.right + 1) return null
  if (y + h <= box.top || y >= box.bottom) return null
  return { x, y, h }
}

function mergeRows(rects: DOMRect[], h: number): PillRect[] {
  const rows: PillRect[] = []
  for (const r of rects) {
    if (r.width <= 0) continue
    const row = rows.find((p) => Math.abs(p.y - r.top) < 1)
    if (row) {
      const right = Math.max(row.x + row.w, r.right)
      row.x = Math.min(row.x, r.left)
      row.w = right - row.x
    } else rows.push({ x: r.left, y: r.top, w: r.width, h })
  }
  return rows
}

function fieldSelection(el: Field): PillRect[] {
  const { selectionStart: from, selectionEnd: to } = el
  if (from == null || to == null || from === to) return []
  const { m, box } = seatMirror(el)
  m.textContent = el.value.slice(0, from)
  const span = document.createElement('span')
  span.textContent = el.value.slice(from, to)
  m.append(span, el.value.slice(to))
  const rects = [...span.getClientRects()]
  m.textContent = ''
  return mergeRows(rects, styledH * zoom).flatMap((p) => {
    const left = p.x - el.scrollLeft * zoom
    const y = p.y - el.scrollTop * zoom
    const x = Math.max(left, box.left)
    const w = Math.min(left + p.w, box.right) - x
    const clipped = w <= 0 || y + p.h <= box.top || y >= box.bottom
    return clipped ? [] : [{ x, y, w, h: p.h }]
  })
}

function editableSelection(el: HTMLElement): PillRect[] {
  const sel = getSelection()
  if (!sel?.rangeCount || sel.isCollapsed) return []
  const r = sel.getRangeAt(0)
  if (!el.contains(r.commonAncestorContainer)) return []
  return mergeRows([...r.getClientRects()], lineHeight(getComputedStyle(el)) * zoom)
}

function editableCaret(el: HTMLElement): CaretRect | null {
  const sel = getSelection()
  if (!sel?.rangeCount) return null
  const r = sel.getRangeAt(0).cloneRange()
  r.collapse(true)
  const rect = r.getClientRects()[0] ?? r.getBoundingClientRect()
  if (!rect || (rect.height === 0 && rect.width === 0 && rect.left === 0)) return null // empty line — skip, don't mutate the DOM
  return { x: rect.left, y: rect.top, h: lineHeight(getComputedStyle(el)) * zoom || rect.height }
}

// A field row is no stacking context of its own, so a negative z-index would sink past its background too.
// Isolating the parent while a selection is drawn gives that negative layer a floor to sit on.
function ensureHost(): HTMLDivElement | null {
  const parent = active?.parentElement
  if (!parent) return null
  if (hostParent !== parent) {
    releaseHost()
    host = document.createElement('div')
    host.className = 'mdpm-sel-host'
    hostIsolation = parent.style.isolation
    parent.style.isolation = 'isolate'
    parent.prepend(host)
    hostParent = parent
  }
  return host
}

function releaseHost(): void {
  host?.remove()
  if (hostParent) hostParent.style.isolation = hostIsolation
  host = null
  hostParent = null
}

const corner = (i: number, n: number): string =>
  n === 1 ? 'mdpm-sel-solo' : i === 0 ? 'mdpm-sel-head' : i === n - 1 ? 'mdpm-sel-foot' : ''

function drawPills(rects: PillRect[]): void {
  if (rects.length === 0) {
    releaseHost()
    return
  }
  const h = ensureHost()
  if (!h) return
  while (h.childElementCount > rects.length) h.lastElementChild?.remove()
  while (h.childElementCount < rects.length) h.append(document.createElement('div'))
  const base = h.getBoundingClientRect()
  rects.forEach((r, i) => {
    const el = h.children[i] as HTMLDivElement
    el.className = `mdpm-sel ${corner(i, rects.length)}`.trim()
    el.style.left = `${(r.x - base.left) / zoom}px`
    el.style.top = `${(r.y - base.top) / zoom}px`
    el.style.width = `${r.w / zoom}px`
    el.style.height = `${r.h / zoom}px`
  })
}

function selectionPills(el: HTMLElement): PillRect[] {
  if (document.documentElement.classList.contains('native-highlight')) return []
  if (isField(el)) return fieldSelection(el)
  if (isEditable(el)) return editableSelection(el)
  return []
}

function caretRect(el: HTMLElement): CaretRect | null {
  if (isField(el)) return fieldCaret(el)
  if (isEditable(el)) return editableCaret(el)
  return null
}

function reposition(): void {
  raf = 0
  const b = bar as HTMLDivElement
  if (!active?.isConnected) {
    b.style.display = 'none'
    releaseHost()
    return
  }
  zoom = active.currentCSSZoom
  drawPills(selectionPills(active))
  const c = caretRect(active)
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
      releaseHost()
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
