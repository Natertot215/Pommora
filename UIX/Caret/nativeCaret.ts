// CSS can only recolor the native caret and selection, never reshape either, so this paints the
// same `.mdpm-caret` bar and `.mdpm-sel` pills the editor draws over whichever field is focused.

// Copied onto the measuring mirror so its text lays out exactly like the field's.
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

// email/number return null selectionStart; `password`'s masked dots the mirror would mis-measure.
const TEXT_TYPES = new Set(['', 'text', 'search', 'url', 'tel'])

const isField = (el: EventTarget | null): el is Field =>
  (el instanceof HTMLTextAreaElement && !el.readOnly && !el.disabled) ||
  (el instanceof HTMLInputElement && TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled)

// A CodeMirror surface carries customCaret already.
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
// A field that resizes AFTER focus strands the bar at its focus-time spot.
let fieldRO: ResizeObserver | null = null
let styledEl: Field | null = null
let styledH = 0
let host: HTMLDivElement | null = null
let hostParent: HTMLElement | null = null
let hostIsolation = ''

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

function seatMirror(el: Field): { m: HTMLDivElement; box: DOMRect } {
  const m = mirror as HTMLDivElement
  if (styledEl !== el) syncMirror(el)
  const box = el.getBoundingClientRect()
  m.style.left = `${box.left}px`
  m.style.top = `${box.top}px`
  return { m, box }
}

function fieldCaret(el: Field): CaretRect | null {
  const { m, box } = seatMirror(el)
  const pos = el.selectionStart ?? el.value.length
  m.textContent = el.value.slice(0, pos)
  // The trailing span's LEFT edge marks the caret; a lone `.` gives it a box at the end of the
  // value. Assumes left-aligned text.
  const span = document.createElement('span')
  span.textContent = el.value.slice(pos) || '.'
  m.appendChild(span)
  const sr = span.getBoundingClientRect()
  m.textContent = ''
  const x = sr.left - el.scrollLeft
  const y = sr.top - el.scrollTop
  if (box.width === 0 && box.height === 0) return null
  // Vertically the bar can overhang the border box at rest (negative half-leading), so it need
  // only intersect; horizontally the caret is a point.
  if (x < box.left - 1 || x > box.right + 1) return null
  if (y + styledH <= box.top || y >= box.bottom) return null
  return { x, y, h: styledH }
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
  return mergeRows(rects, styledH).flatMap((p) => {
    const left = p.x - el.scrollLeft
    const y = p.y - el.scrollTop
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
  return mergeRows([...r.getClientRects()], lineHeight(getComputedStyle(el)))
}

function editableCaret(el: HTMLElement): CaretRect | null {
  const sel = getSelection()
  if (!sel?.rangeCount) return null
  const r = sel.getRangeAt(0).cloneRange()
  r.collapse(true)
  const rect = r.getClientRects()[0] ?? r.getBoundingClientRect()
  if (!rect || (rect.height === 0 && rect.width === 0 && rect.left === 0)) return null // empty line — skip, don't mutate the DOM
  return { x: rect.left, y: rect.top, h: lineHeight(getComputedStyle(el), rect.height) }
}

// A field row is no stacking context, so a negative z-index sinks past its background; isolating
// the parent gives that layer a floor.
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
    el.style.left = `${r.x - base.left}px`
    el.style.top = `${r.y - base.top}px`
    el.style.width = `${r.w}px`
    el.style.height = `${r.h}px`
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
  // Restarting the fade on every move — the editor's keyframe swap; the name IS the state.
  b.style.animationName = b.style.animationName === 'mdpm-blink2' ? 'mdpm-blink' : 'mdpm-blink2'
}

function schedule(): void {
  // Nothing focused → don't burn a frame on every scroll/resize elsewhere in the app.
  if (active && !raf) raf = requestAnimationFrame(reposition)
}

// A pane still animating open when its field takes focus moves in ways no listener above can see —
// transforms never touch the layout box the ResizeObserver watches — so a fresh focus re-measures
// every frame until the bar holds still, the deadline capping a host that never settles.
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
      // Deferred a frame, so the re-measure lands after the pane's re-center render.
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
    // Hidden directly: schedule() no-ops once `active` is null, so it can't do it for us.
    if (e.target === active) {
      active = null
      styledEl = null
      fieldRO?.disconnect()
      cancelAnimationFrame(settleRaf)
      releaseHost()
      if (bar) bar.style.display = 'none'
    }
  })
  // Capture, so a field's own scroll (which doesn't bubble) is seen too.
  for (const ev of ['input', 'keyup', 'click', 'pointerup', 'select', 'scroll']) {
    document.addEventListener(ev, schedule, true)
  }
  document.addEventListener('selectionchange', schedule)
  window.addEventListener('resize', () => {
    styledEl = null
    schedule()
  })
  window.addEventListener('scroll', schedule, true)
}
