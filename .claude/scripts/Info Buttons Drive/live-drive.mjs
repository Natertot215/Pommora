import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ask, boxOf, click, closePanel, closeSettings, createPage, escapeAll, hover, item, launch, META, mouseAt, mouseClick,
  openPanel, openSettings, PORTAL_ROWS, popNative, pressKey, RAIL, read, REPO, restore, ribbon, SHIFT, shot, sleep, sweep, tally,
  textEl, until, viewFrame, writeBody,
} from '../drive-harness.mjs'

const PORT = 9413
const HERE = dirname(fileURLToPath(import.meta.url))
process.env.POMMORA_DRIVE_SHOTS ??= join(HERE, 'info-shots')
const SHOTS = process.env.POMMORA_DRIVE_SHOTS

const COLLECTION = 'Collection A'
const SELECT = 'Info Drive Select'
const PAGE = 'Info Drive Page'
const TAGS_PAGE = 'Info Drive Tags'

// ── Checks ──────────────────────────────────────────────────────────────────

const show = (v) => JSON.stringify(v)
/** One check printed as MATRIX.md lists it, its observation printed whether it holds or not. */
function pin(group, decisions, name, pass, observed) {
  item(group, decisions, name, pass, observed)
  if (pass && observed) console.log(`       ${observed}`)
}

// ── Surfaces ────────────────────────────────────────────────────────────────

const trigger = (label) => `[...document.querySelectorAll('button[aria-label]')].find((b) => b.getAttribute('aria-label') === ${JSON.stringify(label)})`
const glyph = (title) => trigger(`${title} - Info`)
const PANE = `document.querySelector('.info-pane')`
const SCROLLER = `document.querySelector('.info-pane .cm-scroller')`
const CONTENT = `document.querySelector('.info-pane .cm-content')`
const rect = (cdp, expr) => cdp.evaluate(`JSON.parse(JSON.stringify((${expr}).getBoundingClientRect()))`)
// A closing pane stays mounted through its fade with the pointer off it.
const paneUp = (cdp) => cdp.evaluate(`(() => { const p = ${PANE}; return !!p && p.style.pointerEvents !== 'none' })()`)
const paneGone = (cdp) => until('the pane closed', async () => !(await paneUp(cdp)), 3000).then(() => true, () => false)
const paneOpens = (cdp) => until('the pane open', () => paneUp(cdp), 3000).then(() => true, () => false)
const active = (cdp) => cdp.evaluate(`(() => { const a = document.activeElement; return a ? a.tagName + (a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : '') + '.' + a.className : null })()`)
const selection = (cdp) => cdp.evaluate(`getSelection().toString()`)
const NEUTRAL = { x: 700, y: 600 }
const away = (cdp, at = NEUTRAL) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none' })
async function closePane(cdp) {
  for (let i = 0; i < 3 && (await paneUp(cdp)); i++) await pressKey(cdp, 'Escape')
  await paneGone(cdp)
}
/** Rests on a glyph past the dwell and answers whether its pane opened. */
async function rest(cdp, title, ms = 600) {
  await closePane(cdp)
  await hover(cdp, glyph(title), ms)
  const up = await paneUp(cdp)
  await sleep(400)
  return up
}
/** Clicks a glyph so its pane holds open whatever the pointer does next, answering whether it opened. */
async function hold(cdp, title) {
  await closePane(cdp)
  await mouseClick(cdp, glyph(title), { settle: 600 })
  return paneUp(cdp)
}
async function chord(cdp, key, modifiers) {
  for (const type of ['rawKeyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key, code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers })
  await sleep(400)
}
const wheel = (cdp, at, deltaX, deltaY) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: at.x, y: at.y, deltaX, deltaY })
/** A crop of the window's shot to `expr`'s box, padded, at the screen's own pixels, beside the harness's own shots. */
async function zoom(cdp, expr, name, pad = 12) {
  const b = await rect(cdp, expr)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const file = join(SHOTS, `zoom-${name}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  const px = (await cdp.evaluate('devicePixelRatio')) || 1
  const [x, y] = [Math.max(0, b.left - pad), Math.max(0, b.top - pad)].map((v) => Math.round(v * px))
  const [w, h] = [b.width + pad * 2, b.height + pad * 2].map((v) => Math.round(v * px))
  execFileSync('sips', ['-c', String(h), String(w), '--cropOffset', String(y), String(x), file], { stdio: 'ignore' })
}

const sidebarRow = (title) => `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(title)})`
async function sidebarTo(cdp, mode, title) {
  if (!(await cdp.evaluate(`!!(${sidebarRow(title)})`))) await click(cdp, ribbon(mode))
  await until(`${title} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(title)})`))
  await click(cdp, sidebarRow(title))
}
async function openEditor(cdp, label) {
  await closePane(cdp)
  await escapeAll(cdp)
  await closeSettings(cdp)
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(800)
  await viewFrame(cdp, 'Properties')
  await click(cdp, `${textEl('span', label)}.closest('[role=button],button,[data-line-row]')`)
  await until(`${label}'s settings`, () => cdp.evaluate(`!!${trigger('Label Format')}`))
  await sleep(600)
}
async function openPageSettings(cdp, title) {
  await closePane(cdp)
  await escapeAll(cdp)
  await closeSettings(cdp)
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(800)
  await escapeAll(cdp)
  await mouseClick(cdp, textEl('span', title))
  await until(`${title}'s tab`, () => cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('title') === ${JSON.stringify(title)}`))
  await sleep(800)
  await openPanel(cdp)
}
/** A Settings picker row set to `value` through its own dropdown. */
async function pickSetting(cdp, frame, label, value) {
  await openSettings(cdp, frame)
  await mouseClick(cdp, trigger(label))
  await until(`${label}'s options`, () => cdp.evaluate(`!!document.querySelector('${PORTAL_ROWS}')`))
  await click(cdp, `[...document.querySelectorAll('${PORTAL_ROWS}')].find((e) => e.textContent.trim() === ${JSON.stringify(value)})`)
  await sleep(600)
  await escapeAll(cdp)
}
/** A Settings toggle set on or off through its switch, answering what the switch reads after. */
async function setSwitch(cdp, frame, label, on) {
  await openSettings(cdp, frame)
  const sw = `document.querySelector('button[role=switch][aria-label="${label}"]')`
  if ((await cdp.evaluate(`(${sw}).getAttribute('aria-checked')`)) !== String(on)) await click(cdp, sw)
  await sleep(600)
  return cdp.evaluate(`(${sw}).getAttribute('aria-checked') === ${JSON.stringify(String(on))}`)
}
const personalization = () => JSON.parse(read('.nexus/settings.json')).personalization ?? {}

// ── The page's logs and the main process's web opens ───────────────────────

const LOGS = `(() => {
  if (window.__infoLogs) return true
  const L = (window.__infoLogs = [])
  const text = (x) => { try { return x instanceof Error ? x.stack : typeof x === 'string' ? x : JSON.stringify(x) } catch { return String(x) } }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) {
    const f = console[k].bind(console)
    console[k] = (...a) => { L.push(k + ': ' + a.map(text).join(' ')); f(...a) }
  }
  addEventListener('error', (e) => L.push('error event: ' + (e.error?.stack ?? e.message)))
  addEventListener('unhandledrejection', (e) => L.push('unhandledrejection: ' + text(e.reason)))
  return true
})()`
const logs = (cdp) => cdp.evaluate('window.__infoLogs ?? []')

// A second inspector session on main, so a followed web link is recorded rather than opened in the system browser.
async function mainLine() {
  const list = await (await fetch(`http://127.0.0.1:${PORT + 1}/json/list`)).json()
  const ws = new WebSocket(list[0].webSocketDebuggerUrl)
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail })
  let next = 0
  const pending = new Map()
  ws.onmessage = (m) => {
    const { id, result } = JSON.parse(m.data)
    pending.get(id)?.(result?.result?.value)
    pending.delete(id)
  }
  const evaluate = (expression) => new Promise((r) => {
    const id = ++next
    pending.set(id, r)
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, includeCommandLineAPI: true, returnByValue: true } }))
  })
  await evaluate(`(() => { const { shell } = require('electron'); globalThis.__opened = []; shell.openExternal = async (u) => { globalThis.__opened.push(u) }; return true })()`)
  // The window's content cut to `height`, or back to the size it launched at with none, so a glyph can sit near its bottom.
  const height = (h) => evaluate(`(() => { const w = require('electron').BrowserWindow.getAllWindows()[0]; globalThis.__size ??= w.getContentSize(); w.setContentSize(globalThis.__size[0], ${h ?? 'globalThis.__size[1]'}); return true })()`)
  return { opened: () => evaluate('globalThis.__opened'), height, close: () => ws.close() }
}

// ── The pane's contents ─────────────────────────────────────────────────────

const CONSTRUCTS = {
  emphasis: ['md-bold', 'md-italic'], strikethrough: ['md-strike'], highlights: ['md-highlight'],
  lists: ['md-list-bullet', 'md-list-ordered'], checklist: ['md-list-task'], quote: ['md-blockquote'],
  callout: ['md-callout'], tables: ['mdpm-tbl'], code: ['md-code', 'codeblock'], links: ['md-link'], divider: ['md-hr'],
}
const HEADING = /^md-heading$|^md-h[1-6]$/
/** Every class drawn while `scroller` passes from top to bottom, read a frame after each step. */
async function scrollThrough(cdp, scroller) {
  const seen = new Set()
  const { sh } = await cdp.evaluate(`({ sh: (${scroller}).scrollHeight })`)
  for (let y = 0; y <= sh + 100; y += 120) {
    const cls = await cdp.evaluate(`(() => { const s = ${scroller}; s.scrollTop = ${y}; return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => { const c = new Set(); s.querySelectorAll('*').forEach((e) => e.classList.forEach((x) => c.add(x))); r([...c]) }))) })()`)
    for (const c of cls) seen.add(c)
  }
  return seen
}
const missing = (seen) => Object.entries(CONSTRUCTS).filter(([, cls]) => !cls.every((c) => seen.has(c))).map(([k]) => k)
const bodyDims = (cdp) => cdp.evaluate(`(() => { const s = ${SCROLLER}; return { clientHeight: s.clientHeight, scrollHeight: s.scrollHeight } })()`)

/** Opens a pane by resting, shoots its top, scrolls it through, shoots its end, and checks every construct drew. */
async function entryCase(cdp, title, slug) {
  const opened = await rest(cdp, title)
  await cdp.evaluate(`(${SCROLLER}).scrollTop = 0`)
  await sleep(300)
  await shot(cdp, `g1-${slug}-top`)
  const seen = opened ? await scrollThrough(cdp, SCROLLER) : new Set()
  await cdp.evaluate(`(${SCROLLER}).scrollTop = (${SCROLLER}).scrollHeight`)
  await sleep(300)
  await shot(cdp, `g1-${slug}-scrolled`)
  const gaps = missing(seen)
  const headings = [...seen].filter((c) => HEADING.test(c))
  pin(1, 'C-2', `The entries: ${title}'s pane draws every construct and no heading`, opened && gaps.length === 0 && headings.length === 0,
    `opened ${opened}; missing ${show(gaps)}; headings ${show(headings)}`)
  return seen
}

/** Steps the pane's body down from its top until `expr` is drawn, since the editor draws only the lines near its viewport, then centers it. */
async function reach(cdp, expr) {
  await cdp.evaluate(`(${SCROLLER}).scrollTop = 0`)
  await until(`${expr} drawn`, () => cdp.evaluate(`(() => { if (${expr}) return true; const s = ${SCROLLER}; s.scrollTop += 120; return false })()`), 6000)
  await cdp.evaluate(`(() => { const s = ${SCROLLER}; const e = (${expr}).getBoundingClientRect(); const b = s.getBoundingClientRect(); s.scrollTop += e.top - b.top - (s.clientHeight - Math.min(e.height, s.clientHeight)) / 2 })()`)
  await sleep(300)
}
/** Value Format's longest code line, measured at rest and under a sideways and a downward wheel. */
async function longCodeLine(cdp, name) {
  const codeLine = `[...document.querySelectorAll('.info-pane .cm-line.codeblock:not(.codeblock-first):not(.codeblock-last)')].sort((a, b) => b.textContent.length - a.textContent.length)[0]`
  await reach(cdp, codeLine)
  await sleep(300)
  const code = await cdp.evaluate(`(() => { const l = ${codeLine}; const cs = getComputedStyle(l); const run = l.querySelector('.codeblock-run'); const s = ${SCROLLER}; return { text: l.textContent.length, height: l.getBoundingClientRect().height, lineHeight: parseFloat(cs.lineHeight), whiteSpace: cs.whiteSpace, run: !!run, runOverflow: run ? getComputedStyle(run).overflow + ' ' + getComputedStyle(run).textOverflow : null, cut: run ? run.scrollWidth > run.clientWidth : null, ellipsis: !!l.querySelector('.codeblock-ink') || (run ? getComputedStyle(run).textOverflow === 'ellipsis' : false), top: s.scrollTop } })()`)
  const codeBox = await rect(cdp, codeLine)
  const at = { x: codeBox.left + codeBox.width / 2, y: codeBox.top + Math.min(10, codeBox.height / 2) }
  await wheel(cdp, at, 240, 0)
  await sleep(500)
  const sideways = await cdp.evaluate(`(() => { const l = ${codeLine}; const run = l.querySelector('.codeblock-run'); return { scroller: (${SCROLLER}).scrollLeft, line: l.scrollLeft, shift: run ? getComputedStyle(l).getPropertyValue('--code-scroll') || '0' : null } })()`)
  await wheel(cdp, at, 0, 120)
  await sleep(400)
  const wheeled = (await cdp.evaluate(`(${SCROLLER}).scrollTop`)) !== code.top
  await zoom(cdp, PANE, name, 4)
  const oneLine = code.height < code.lineHeight * 1.6
  const still = sideways.scroller === 0 && sideways.line === 0 && (sideways.shift === null || /^0(px)?$/.test(sideways.shift.trim()))
  return {
    pass: oneLine && code.ellipsis && still && wheeled,
    observed: `${code.text} chars; height ${code.height.toFixed(1)}px against a ${code.lineHeight}px line (one line ${oneLine}); white-space ${code.whiteSpace}; clipped run ${code.run} ${code.runOverflow ?? ''}, cut ${code.cut}, ellipsis ${code.ellipsis}; after a sideways wheel ${show(sideways)}; wheeled ${wheeled}`,
  }
}

// ── Group 2 — The Disabled Row and the Variants ────────────────────────────

const ITERATION = `document.querySelector('[aria-label="Iteration"]')`
const VARIANT_LOOKS = `[...document.querySelectorAll('[aria-label="Iteration"] button[aria-label$=" - Info"]')].filter((b) => b.getAttribute('aria-label').startsWith('{'))`
async function toggleIteration(cdp, open) {
  if ((await cdp.evaluate(`!!${ITERATION}`)) === open) return
  await cdp.evaluate(`document.activeElement?.blur()`)
  await chord(cdp, 't', META | SHIFT)
  await until(`the Iteration window ${open ? 'open' : 'closed'}`, async () => (await cdp.evaluate(`!!${ITERATION}`)) === open, 4000)
  await sleep(600)
}

async function group2(cdp, line) {
  const G = 2
  await toggleIteration(cdp, true)
  const looks = await cdp.evaluate(`${VARIANT_LOOKS}.map((b) => { const cs = getComputedStyle(b); const svg = b.querySelector('svg'); return { look: b.getAttribute('aria-label').replace(' - Info', ''), cls: b.className, svg: svg?.innerHTML ?? '', drawn: !!svg && svg.getBoundingClientRect().width > 0 && svg.querySelectorAll('path, circle, line').length > 0, ink: getComputedStyle(svg).color, bg: cs.backgroundColor, border: cs.borderColor + ' ' + cs.borderWidth + ' ' + cs.boxShadow } })`)
  await shot(cdp, 'g2-variants')
  await zoom(cdp, `document.querySelector('[aria-label="Iteration"] [data-reveal-host]').parentElement`, 'g2-variants', 16)
  const byLook = Object.fromEntries(looks.map((l) => [l.look, l]))
  const distinct = (keys, f) => new Set(keys.map((k) => f(byLook[k]))).size === keys.length
  const glyphs = ['{"icon":"info"}', '{"icon":"circle-question-mark"}', '{"icon":"circle-alert"}']
  const types = ['base', 'filled', 'tinted', 'solid', 'destructive'].map((t) => `{"type":"${t}"}`)
  const outlines = ['base', 'filled', 'tinted', 'solid', 'destructive'].map((t) => [`{"type":"${t}"}`, `{"type":"${t}","outline":true}`])
  const allDrawn = looks.length === 13 && looks.every((l) => l.drawn)
  const glyphsOwn = distinct(glyphs, (l) => l.svg)
  const typesOwn = distinct(types, (l) => `${l.bg}|${l.ink}`)
  const bordersOwn = outlines.every(([a, b]) => byLook[a].border !== byLook[b].border)
  pin(G, 'A-2', 'The variants: all thirteen draw at once, every glyph, type, and border in its own ink', allDrawn && glyphsOwn && typesOwn && bordersOwn,
    `${looks.length} drawn ${allDrawn}; glyphs distinct ${glyphsOwn}; types distinct ${typesOwn} ${show(types.map((t) => byLook[t]?.bg))}; borders distinct ${bordersOwn}`)

  // The disabled row: the glyph dims with the row, opens on a rest and a click, and the row draws no wash under the pointer.
  const row = `(${glyph('Disabled Row')}).closest('[data-reveal-host], div')`
  const enabledRow = `(${glyph('{"icon":"info"}')}).closest('div')`
  const restBg = await cdp.evaluate(`getComputedStyle(${row}).backgroundColor`)
  const dim = await cdp.evaluate(`({ row: getComputedStyle(${row}).opacity, glyph: getComputedStyle(${glyph('Disabled Row')}).opacity })`)
  const rested = await rest(cdp, 'Disabled Row', 700)
  const hoverBg = await cdp.evaluate(`getComputedStyle(${row}).backgroundColor`)
  const rowBox = await rect(cdp, row)
  await away(cdp, { x: rowBox.left + 10, y: rowBox.top + rowBox.height / 2 })
  await sleep(400)
  const overRowBg = await cdp.evaluate(`getComputedStyle(${row}).backgroundColor`)
  await shot(cdp, 'g2-disabled-row-rest')
  await closePane(cdp)
  await mouseClick(cdp, glyph('Disabled Row'))
  const clicked = await paneUp(cdp)
  await shot(cdp, 'g2-disabled-row-click')
  await mouseClick(cdp, glyph('Disabled Row'))
  const secondClosed = await paneGone(cdp)
  const enabledBox = await rect(cdp, enabledRow)
  await away(cdp, { x: enabledBox.left + 10, y: enabledBox.top + enabledBox.height / 2 })
  await sleep(400)
  const enabledHoverBg = await cdp.evaluate(`getComputedStyle(${enabledRow}).backgroundColor`)
  await away(cdp)
  pin(G, 'A-4', 'A disabled row: the glyph dims with the row and opens its pane on a rest and a click; the row draws no hover wash',
    Number(dim.row) < 1 && rested && clicked && secondClosed && hoverBg === restBg && overRowBg === restBg,
    `row opacity ${dim.row}, glyph's own ${dim.glyph}; rest opened ${rested}; click held ${clicked}; second click closed ${secondClosed}; row bg at rest ${restBg}, over glyph ${hoverBg}, over row ${overRowBg}; an enabled row under the pointer ${enabledHoverBg}`)

  // Extra: a pane whose glyph sits low in the window, with the viewport cut short beneath it.
  const last = `${VARIANT_LOOKS}.at(-1)`
  const lowAt = (await rect(cdp, last)).bottom
  await line.height(Math.round(lowAt + 140))
  await sleep(800)
  const lowTitle = await cdp.evaluate(`(${last}).getAttribute('aria-label').replace(' - Info', '')`)
  const g = await rect(cdp, last)
  const vh = await cdp.evaluate('innerHeight')
  // The first height PickerMenu reads off the pane, and whether the editor had built by then.
  await cdp.evaluate(`(() => { const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'); window.__offsetHeight = d; window.__firstPane = null; Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { const h = d.get.call(this); if (window.__firstPane === null && this.classList.contains('info-pane')) window.__firstPane = { firstRead: h, editor: !!this.querySelector('.cm-editor') }; return h } }) })()`)
  const opened = await rest(cdp, lowTitle, 700)
  const first = await cdp.evaluate(`(() => { Object.defineProperty(HTMLElement.prototype, 'offsetHeight', window.__offsetHeight); return window.__firstPane })()`)
  const p = opened ? await rect(cdp, PANE) : null
  const dims = opened ? await bodyDims(cdp) : null
  await shot(cdp, 'g2-pane-near-bottom')
  const roomBelow = vh - g.bottom
  const roomAbove = g.top
  const wentUp = !!p && p.bottom <= g.top + 1
  const expectUp = !!p && p.height > roomBelow - 8 && roomAbove > roomBelow
  const inView = !!p && p.top >= 0 && p.bottom <= vh
  pin(G, 'extra', 'The pane near the window\'s bottom places and sizes as every PickerMenu does: it flips up when below lacks room, stays in view, and caps its body at 320px',
    opened && wentUp === expectUp && inView && dims.clientHeight <= 320 && Math.abs(p.width - 285) < 1,
    `viewport ${vh}px; glyph ${Math.round(g.top)}–${Math.round(g.bottom)}; room below ${Math.round(roomBelow)}, above ${Math.round(roomAbove)}; pane ${p ? `${Math.round(p.top)}–${Math.round(p.bottom)} × ${p.width}` : 'none'}; went up ${wentUp}, expected up ${expectUp}; body ${show(dims)}; the pane's height at PickerMenu's first read ${show(first)}`)
  await closePane(cdp)
  await line.height()
  await sleep(600)
  await toggleIteration(cdp, false)
  return byLook
}

// ── Group 1 — The Glyph and the Pane ───────────────────────────────────────

async function group1(cdp, byLook, line) {
  const G = 1
  await openEditor(cdp, SELECT)
  const place = await cdp.evaluate(`(() => {
    const b = ${glyph('Label Format')}; const host = b.closest('.info-button'); const titleLine = host.parentElement
    const title = titleLine.firstElementChild; const row = titleLine.closest('[data-reveal-host]') ?? titleLine.parentElement.parentElement
    const with_ = row.getBoundingClientRect().height
    host.style.display = 'none'; const without = row.getBoundingClientRect().height; host.style.display = ''
    const tb = title.getBoundingClientRect(); const gb = b.getBoundingClientRect()
    return { inLine: titleLine.children.length === 2 && titleLine.lastElementChild === host, titleText: title.textContent, gap: gb.left - tb.right, with: with_, without, glyphTop: gb.top, glyphBottom: gb.bottom, rowTop: row.getBoundingClientRect().top, rowBottom: row.getBoundingClientRect().bottom }
  })()`)
  await shot(cdp, 'g1-placement')
  await zoom(cdp, `(${glyph('Label Format')}).closest('[data-reveal-host]') ?? (${glyph('Label Format')}).parentElement.parentElement`, 'g1-placement', 20)
  pin(G, 'A-1 F-1', 'Placement: the glyph sits right after the title text, inside the title line, and the row stands as tall as it does without it',
    place.inLine && place.titleText === 'Label Format' && place.gap >= 0 && place.gap <= 8 && Math.abs(place.with - place.without) < 0.5,
    `title line holds [title, glyph] ${place.inLine}; gap ${place.gap.toFixed(1)}px; row ${place.with.toFixed(2)}px with the glyph, ${place.without.toFixed(2)}px without`)

  const look = await cdp.evaluate(`(() => { const b = ${glyph('Label Format')}; return { cls: b.className.replace(/\\s*gh66hq\\w+/g, ''), svg: b.querySelector('svg')?.innerHTML ?? '' } })()`)
  const base = (l) => l.cls.replace(/\s*gh66hq\w+/g, '')
  const filled = byLook?.['{"type":"filled"}']
  const info = byLook?.['{"icon":"info"}']
  pin(G, 'A-2', 'The look: the glyph wears filled, no outline, the info icon',
    !!filled && look.cls === base(filled) && look.svg === info.svg,
    `class ${look.cls} vs filled ${filled && base(filled)}; icon matches the info variant ${look.svg === info?.svg}`)

  // Extra: the gray band, the same view with Label Format's pane closed and then open.
  const topmost = (at) => cdp.evaluate(`(() => { const out = []; for (let e = document.elementFromPoint(${at.x}, ${at.y}); e && out.length < 6; e = e.parentElement) { const cs = getComputedStyle(e); out.push(e.tagName + '.' + String(e.className).slice(0, 40) + (cs.backdropFilter !== 'none' ? ' [backdrop ' + cs.backdropFilter + ']' : '') + (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? ' [bg ' + cs.backgroundColor + ']' : '')) } return out })()`)
  const bandAt = { x: 700, y: 100 }
  await away(cdp)
  await sleep(400)
  const closedChain = await topmost(bandAt)
  await shot(cdp, 'g1-gray-band-closed')
  await rest(cdp, 'Label Format')
  const openChain = await topmost(bandAt)
  await shot(cdp, 'g1-gray-band-open')
  pin(G, 'extra', 'The gray band: what sits over the window\'s top is the same with the pane closed and open', show(closedChain) === show(openChain),
    `at ${show(bandAt)} closed ${show(closedChain)}; open ${show(openChain)}`)
  await closePane(cdp)

  // The pane, with Hover Previews off.
  await pickSetting(cdp, 'Navigation', 'Hover Previews', 'Off')
  const off = personalization().previewPersistence === 'off'
  await openEditor(cdp, SELECT)
  const gb = await rect(cdp, glyph('Label Format'))
  const opened = await rest(cdp, 'Label Format')
  const p = opened ? await rect(cdp, PANE) : null
  const edges = await cdp.evaluate(`document.querySelectorAll('.info-pane .resize-edge').length`)
  await shot(cdp, 'g1-pane-dark')
  await zoom(cdp, PANE, 'g1-pane-dark')
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await sleep(500)
  const lightBg = await cdp.evaluate(`getComputedStyle(${PANE}).backgroundColor + ' ' + getComputedStyle(${CONTENT}).color`)
  await shot(cdp, 'g1-pane-light')
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await sleep(500)
  const darkBg = await cdp.evaluate(`getComputedStyle(${PANE}).backgroundColor + ' ' + getComputedStyle(${CONTENT}).color`)
  pin(G, 'B-1 B-2 C-4', 'The pane: with Hover Previews Off, a 600 ms rest opens it below the glyph, 285px wide, with no resize edges',
    off && opened && p.top >= gb.bottom && Math.abs(p.width - 285) < 1 && edges === 0,
    `Hover Previews off ${off}; opened ${opened}; glyph bottom ${gb.bottom.toFixed(1)}, pane top ${p?.top.toFixed(1)}; width ${p?.width}; resize edges ${edges}; light vs dark ink ${lightBg === darkBg ? 'identical' : 'differs'} (${lightBg} / ${darkBg})`)

  // Extra: beside a dropdown, with the window cut short under Label Format's row, its format picker and its InfoPane open from neighboring triggers.
  await closePane(cdp)
  const rowBottom = (await rect(cdp, trigger('Label Format'))).bottom
  await line.height(Math.round(rowBottom + 110))
  await sleep(800)
  const placed = async (pane, anchor) => {
    const a = await rect(cdp, anchor)
    const b = await rect(cdp, pane)
    return { anchor: `${Math.round(a.top)}–${Math.round(a.bottom)}`, pane: `${Math.round(b.top)}–${Math.round(b.bottom)}`, up: b.bottom <= a.top + 1, inView: b.top >= 0 && b.bottom <= (await cdp.evaluate('innerHeight')) + 0.5 }
  }
  const FORMAT_PANE = `[...document.querySelectorAll('[data-picker-portal]')].find((p) => !p.querySelector('.info-pane') && p.querySelector('[role=button]'))?.firstElementChild`
  await mouseClick(cdp, trigger('Label Format'), { settle: 900 })
  const picker = (await cdp.evaluate(`!!(${FORMAT_PANE})`)) ? await placed(FORMAT_PANE, trigger('Label Format')) : null
  await shot(cdp, 'g1-near-bottom-format-picker')
  await pressKey(cdp, 'Escape')
  await sleep(500)
  const infoUp = await rest(cdp, 'Label Format', 700)
  const infoPlaced = infoUp ? await placed(PANE, glyph('Label Format')) : null
  const vhShort = await cdp.evaluate('innerHeight')
  await shot(cdp, 'g1-near-bottom-info-pane')
  await closePane(cdp)
  await line.height()
  await sleep(800)
  pin(G, 'extra', "Beside a dropdown near the window's bottom: Label Format's InfoPane places as its own format picker does",
    !!picker && !!infoPlaced && picker.up === infoPlaced.up && infoPlaced.inView,
    `viewport ${vhShort}px; format picker ${show(picker)}; InfoPane ${show(infoPlaced)}`)
  await openEditor(cdp, SELECT)
  await rest(cdp, 'Label Format')

  // Extra: the pane's edges, its text inset 12px top and bottom and 14px on each side.
  const inset = await cdp.evaluate(`(() => { const p = ${PANE}.getBoundingClientRect(); const c = ${CONTENT}; const cs = getComputedStyle(c); const lines = [...c.querySelectorAll(':scope > .cm-line')]; const first = lines[0].getBoundingClientRect(); const s = ${SCROLLER}; const cr = c.getBoundingClientRect(); return { padding: cs.padding, left: first.left - p.left, right: p.right - first.right, top: first.top - p.top, contentRight: p.right - cr.right, scrollbar: s.offsetWidth - s.clientWidth, border: getComputedStyle(${PANE}).borderWidth } })()`)
  await zoom(cdp, PANE, 'g1-pane-edges', 4)
  pin(G, 'extra', "The pane's edges: the text's left and right insets match (12px top and bottom, 14px sides)",
    inset.padding === '12px 14px' && Math.abs(inset.left - inset.right) <= 1.5,
    `content padding ${inset.padding}; first line ${inset.left.toFixed(1)}px from the left, ${inset.right.toFixed(1)}px from the right, ${inset.top.toFixed(1)}px from the top; content box ends ${inset.contentRight.toFixed(1)}px from the right; scrollbar gutter ${inset.scrollbar}px; border ${inset.border}`)
  await closePane(cdp)

  // The entries, each pane top and scrolled.
  await entryCase(cdp, 'Label Format', 'label-format')
  const valueSeen = await entryCase(cdp, 'Value Format', 'value-format')
  const valueDims = await bodyDims(cdp)

  // The long code line, in Value Format's pane: as the Nexus's settings stand, then with Scroll Long Lines In Code Blocks on.
  const wrapped = await longCodeLine(cdp, 'g1-long-code-line')
  pin(G, 'C-2', "The long code line: it rests clipped at its ellipsis on one line and can't scroll sideways; the body still wheels", wrapped.pass, wrapped.observed)
  const scrollOn = await setSwitch(cdp, 'Pages & Writing', 'Scroll Long Lines In Code Blocks', true)
  await openEditor(cdp, SELECT)
  await rest(cdp, 'Value Format')
  const clipped = await longCodeLine(cdp, 'g1-long-code-line-scroll-on')
  pin(G, 'C-2', 'The long code line, with Scroll Long Lines In Code Blocks on: as above', scrollOn && clipped.pass, clipped.observed)
  await setSwitch(cdp, 'Pages & Writing', 'Scroll Long Lines In Code Blocks', false)
  await openEditor(cdp, SELECT)
  await rest(cdp, 'Value Format')

  // Extra: a code block's tag near a link, the prose link under the pointer.
  const proseLink = `[...document.querySelectorAll('.info-pane .cm-line:not(.codeblock) .md-link')].find((l) => !l.closest('.mdpm-tbl'))`
  await reach(cdp, proseLink)
  // The block's tag at the body's top, so the shot holds the tag and the link together.
  await cdp.evaluate(`(() => { const s = ${SCROLLER}; const f = document.querySelector('.info-pane .codeblock-first'); if (f) s.scrollTop += f.getBoundingClientRect().top - s.getBoundingClientRect().top - 8 })()`)
  await sleep(300)
  const tag = () => cdp.evaluate(`(() => { const t = document.querySelector('.info-pane .codeblock-language'); if (!t) return null; const v = (sel) => { const e = t.querySelector(sel); return e ? getComputedStyle(e).opacity : null }; return { reveal: getComputedStyle(t).getPropertyValue('--reveal') || getComputedStyle(t.closest('.cm-line')).getPropertyValue('--reveal'), mark: v('.codeblock-mark'), copy: v('.codeblock-copy'), slotWash: getComputedStyle(t.querySelector('.codeblock-mark-slot'), '::before').opacity } })()`)
  const hosts = `(() => { const out = []; for (let e = document.querySelector('.info-pane .codeblock-language'); e; e = e.parentElement) if (e.hasAttribute('data-reveal-host')) out.push(e.tagName + '.' + String(e.className).slice(0, 30) + '[data-reveal-host="' + e.getAttribute('data-reveal-host') + '"]' + (e.matches(':hover') ? ' :hover' : '')); return out })()`
  const tagRest = await tag()
  await zoom(cdp, PANE, 'g1-code-tag-at-rest', 4)
  await hover(cdp, proseLink, 700)
  const tagHover = await tag()
  const hostsHover = await cdp.evaluate(hosts)
  await zoom(cdp, PANE, 'g1-code-tag-near-link', 4)
  pin(G, 'extra', "A code block's tag near a link: resting on Value Format's prose link reveals nothing in the code block's language or copy mark",
    show(tagRest) === show(tagHover),
    `at rest ${show(tagRest)}; on the link ${show(tagHover)}; reveal hosts above the tag ${show(hostsHover)}`)
  await closePane(cdp)

  // The other rows: Settings' Date Format and a page's Aliases.
  await openSettings(cdp, 'General')
  const datePlace = await cdp.evaluate(`(() => { const b = ${glyph('Date Format')}; const t = b.closest('.info-button').previousElementSibling; return { title: t?.textContent, gap: b.getBoundingClientRect().left - t.getBoundingClientRect().right } })()`)
  const dateOpened = await rest(cdp, 'Date Format')
  await shot(cdp, 'g1-date-format-row')
  await closePane(cdp)
  await openPageSettings(cdp, PAGE)
  const aliasPlace = await cdp.evaluate(`(() => { const b = ${glyph('Aliases')}; const t = b.closest('.info-button').previousElementSibling; return { title: t?.textContent, gap: b.getBoundingClientRect().left - t.getBoundingClientRect().right } })()`)
  const aliasOpened = await rest(cdp, 'Aliases')
  await shot(cdp, 'g1-aliases-row')
  await closePane(cdp)
  pin(G, 'A-1 F-1', 'The other rows: Date Format and Aliases each carry their glyph right after the title, and each opens its pane',
    datePlace.title === 'Date Format' && aliasPlace.title === 'Aliases' && datePlace.gap >= 0 && datePlace.gap <= 8 && aliasPlace.gap >= 0 && aliasPlace.gap <= 8 && dateOpened && aliasOpened,
    `Date Format ${show(datePlace)} opened ${dateOpened}; Aliases ${show(aliasPlace)} opened ${aliasOpened}`)
  await entryCase(cdp, 'Aliases', 'aliases')
  await closePane(cdp)
  await closePanel(cdp)

  // A frame switch with Date Format's pane held open.
  await openSettings(cdp, 'General')
  const dateSeen = await entryCase(cdp, 'Date Format', 'date-format')
  await closePane(cdp)
  await mouseClick(cdp, glyph('Date Format'))
  const held = await paneUp(cdp)
  const mark = (await logs(cdp)).length
  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === 'Interface')`)
  await sleep(1200)
  const afterSwitch = { pane: await cdp.evaluate(`!!${PANE}`), logs: (await logs(cdp)).slice(mark) }
  await shot(cdp, 'g1-frame-switch')
  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === 'General')`)
  await sleep(800)
  const reopened = await rest(cdp, 'Date Format')
  await closePane(cdp)
  pin(G, '—', 'A frame switch: holding Date Format\'s pane open and switching frames is recorded with what the console logs',
    held && !afterSwitch.pane && reopened,
    `held ${held}; pane left with its frame ${!afterSwitch.pane}; console ${afterSwitch.logs.length ? show(afterSwitch.logs) : 'logged nothing'}; Date Format's pane opens again after ${reopened}`)

  // The entry: Date Format's opening lines, and Value Format's blocks and scroll.
  await rest(cdp, 'Date Format')
  const top = await cdp.evaluate(`(() => { const c = ${CONTENT}; const lines = [...c.children].slice(0, 6); const cls = new Set(lines.flatMap((l) => [l, ...l.querySelectorAll('*')].flatMap((e) => [...e.classList]))); return { cls: [...cls], firstText: lines[0]?.textContent.slice(0, 40) } })()`)
  await closePane(cdp)
  const topHas = (c) => top.cls.includes(c)
  const valueBlocks = ['mdpm-tbl', 'md-blockquote', 'codeblock', 'md-link'].filter((c) => !valueSeen.has(c))
  pin(G, 'C-2', "The entry: bold, the list, and inline code draw with no heading above them; Value Format's table, quote, code block, and link draw, and its body scrolls past 320px",
    topHas('md-bold') && topHas('md-list-bullet') && topHas('md-code') && !top.cls.some((c) => HEADING.test(c)) && ![...dateSeen].some((c) => HEADING.test(c)) &&
      valueBlocks.length === 0 && valueDims.clientHeight <= 320 && valueDims.scrollHeight > valueDims.clientHeight,
    `Date Format opens on "${top.firstText}…" with bold ${topHas('md-bold')}, list ${topHas('md-list-bullet')}, inline code ${topHas('md-code')}; Value Format missing ${show(valueBlocks)}; body ${show(valueDims)}`)
  await closeSettings(cdp)
}

// ── Group 3 — The Pane's Text ──────────────────────────────────────────────

async function group3(cdp, line) {
  const G = 3
  await openEditor(cdp, SELECT)

  // The crossing: rest until open, into the body past the grace, then out.
  await rest(cdp, 'Label Format')
  const body = await rect(cdp, SCROLLER)
  const inBody = { x: body.left + body.width / 2, y: body.top + body.height / 2 }
  await away(cdp, inBody)
  await sleep(800)
  const stayed = await paneUp(cdp)
  await away(cdp)
  await sleep(600)
  const left = !(await paneUp(cdp))
  pin(G, 'B-1', 'The crossing: the pane stays open with the pointer resting in its body past the grace, and leaving it closes it', stayed && left,
    `stayed open in the body ${stayed}; closed after leaving ${left}`)

  // No hover: across the body, its lists, its table, and its code block.
  await hold(cdp, 'Label Format')
  const reveals = () => cdp.evaluate(`[...document.querySelectorAll('.info-pane .codeblock-copy, .info-pane .codeblock-mark, .info-pane .mdpm-tbl-grip, .info-pane .md-blockquote-grip, .info-pane .md-block-handle')].map((e) => getComputedStyle(e).opacity + '/' + getComputedStyle(e).visibility).join(',') + '|' + document.querySelectorAll('.info-pane [data-reveal-shown], .info-pane .is-revealed, .info-pane :hover.md-link').length`)
  const targets = ['.md-list-bullet', '.md-list-ordered', '.md-list-task', '.mdpm-tbl-cell', '.cm-line.codeblock:not(.codeblock-first)', '.md-callout']
  const probes = []
  for (const t of targets) {
    await reach(cdp, `document.querySelector('.info-pane ${t}')`)
    await sleep(200)
    const before = await reveals()
    const b = await rect(cdp, `document.querySelector('.info-pane ${t}')`)
    for (const fx of [0.25, 0.5, 0.75]) {
      const at = { x: b.left + b.width * fx, y: b.top + Math.min(b.height / 2, 10) }
      await away(cdp, at)
      await sleep(250)
      const hit = await cdp.evaluate(`(() => { const e = document.elementFromPoint(${at.x}, ${at.y}); return { inText: !!e?.closest('.info-pane .cm-content'), link: !!e?.closest('.md-link'), cursor: getComputedStyle(e).cursor, el: e?.className } })()`)
      probes.push({ t, ...hit, changed: (await reveals()) !== before })
    }
  }
  await shot(cdp, 'g3-no-hover')
  const offending = probes.filter((p) => (p.inText && !p.link) || p.changed || !['default', 'auto'].includes(p.cursor))
  pin(G, 'C-3', 'No hover: nothing reveals or highlights across the body, its lists, table, and code block, and the pointer stays the arrow', offending.length === 0,
    `${probes.length} points; offending ${show(offending)}; cursors ${show([...new Set(probes.map((p) => p.cursor))])}`)
  await closePane(cdp)

  // No selection: drags across the body and the table, then a double-click and a shift-click on Value Format's prose link.
  await hold(cdp, 'Label Format')
  const focusWas = await active(cdp)
  const sb = await rect(cdp, SCROLLER)
  await sweep(cdp, { x: sb.left + 30, y: sb.top + 20 }, { x: sb.left + 30, y: sb.bottom - 20 }, { steps: 10 })
  const afterBody = await selection(cdp)
  const stillOpen = await paneUp(cdp)
  if (!stillOpen) await hold(cdp, 'Label Format')
  await reach(cdp, `document.querySelector('.info-pane .mdpm-tbl')`)
  await sleep(200)
  const tb = await rect(cdp, `document.querySelector('.info-pane .mdpm-tbl')`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tb.left + 10, y: tb.top + 8, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tb.left + 10 + ((tb.width - 20) * i) / 8, y: tb.top + 8 + ((tb.height - 16) * i) / 8, button: 'left', buttons: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tb.right - 10, y: tb.bottom - 8, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(500)
  const afterTable = await selection(cdp)
  const tableFocus = await active(cdp)
  await shot(cdp, 'g3-no-selection')
  await closePane(cdp)
  await hold(cdp, 'Value Format')
  const proseLink = `[...document.querySelectorAll('.info-pane .cm-line:not(.codeblock) .md-link')].find((l) => !l.closest('.mdpm-tbl'))`
  await reach(cdp, proseLink)
  await sleep(300)
  const linkFocusWas = await active(cdp)
  const opensBefore = (await line.opened()).length
  const lb = await boxOf(cdp, proseLink)
  for (const clickCount of [1, 2])
    for (const type of ['mousePressed', 'mouseReleased'])
      await cdp.send('Input.dispatchMouseEvent', { type, x: lb.x, y: lb.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount })
  await sleep(500)
  const afterDouble = { sel: await selection(cdp), focus: await active(cdp) }
  if (!(await paneUp(cdp))) {
    await hold(cdp, 'Value Format')
    await reach(cdp, proseLink)
    await sleep(300)
  }
  await mouseAt(cdp, await boxOf(cdp, proseLink), { modifiers: SHIFT })
  const afterShift = { sel: await selection(cdp), focus: await active(cdp) }
  const opensDuring = (await line.opened()).slice(opensBefore)
  pin(G, 'C-3', 'No selection: drags across the body and the table, and a double-click and shift-click on the prose link, select nothing and leave focus where it was',
    afterBody === '' && afterTable === '' && afterDouble.sel === '' && afterShift.sel === '' && tableFocus === focusWas && afterDouble.focus === linkFocusWas && afterShift.focus === linkFocusWas,
    `selections ${show([afterBody, afterTable, afterDouble.sel, afterShift.sel])}; focus was ${focusWas} → after the table drag ${tableFocus}; before the link ${linkFocusWas} → double ${afterDouble.focus}, shift ${afterShift.focus}; the link's clicks followed ${show(opensDuring)}`)
  await closePane(cdp)

  // No copy: a press in the body, ⌘A, ⌘C, and a click on the code block's language tag.
  const clipWas = (await ask(cdp, 'clipboard:read')).value
  await hold(cdp, 'Label Format')
  const cb = await rect(cdp, SCROLLER)
  await mouseAt(cdp, { x: cb.left + 40, y: cb.top + 30 })
  await chord(cdp, 'a', META)
  const selAll = await selection(cdp)
  await chord(cdp, 'c', META)
  await reach(cdp, `document.querySelector('.info-pane .codeblock-language')`)
  await sleep(300)
  if (await paneUp(cdp)) await mouseAt(cdp, await boxOf(cdp, `document.querySelector('.info-pane .codeblock-language .codeblock-mark-slot') ?? document.querySelector('.info-pane .codeblock-language')`))
  const copiedMark = await cdp.evaluate(`!!document.querySelector('.info-pane .codeblock-language.is-copied')`)
  const clipNow = (await ask(cdp, 'clipboard:read')).value
  pin(G, 'C-3', 'No copy: a press in the body, ⌘A, ⌘C, and a click on the code block\'s language tag leave the clipboard holding what it held',
    clipNow === clipWas && !copiedMark && selAll === '',
    `clipboard unchanged ${clipNow === clipWas}; ⌘A selected ${show(selAll.slice(0, 40))}; the tag drew Copied ${copiedMark}`)
  await closePane(cdp)

  // No focus: the body, a bullet, a checkbox, and the left inset beside a line.
  await hold(cdp, 'Label Format')
  const pressWas = await active(cdp)
  const doc = () => cdp.evaluate(`(${CONTENT}).textContent + '|' + document.querySelectorAll('.info-pane .checkbox-checked').length`)
  const docWas = await doc()
  const presses = []
  for (const [name, expr, edge] of [
    ['body', SCROLLER, false], ['bullet', `document.querySelector('.info-pane .md-list-bullet')`, false],
    ['checkbox', `document.querySelector('.info-pane .md-list-task:not(.md-list-done) .checkbox')`, false], ['left inset', `document.querySelector('.info-pane .cm-content > .cm-line')`, true],
  ]) {
    if (!(await paneUp(cdp))) await hold(cdp, 'Label Format')
    await reach(cdp, expr)
    await sleep(200)
    const b = await boxOf(cdp, expr)
    const p = await rect(cdp, PANE)
    await mouseAt(cdp, edge ? { x: p.left + 5, y: b.y } : b)
    presses.push({ name, focus: await active(cdp), open: await paneUp(cdp) })
  }
  const docNow = await paneUp(cdp) ? await doc() : null
  pin(G, 'C-3', 'No focus: presses on the body, a bullet, a checkbox, and the left inset move and toggle nothing, and focus stays where it was',
    presses.every((p) => p.focus === pressWas) && (docNow === null || docNow === docWas),
    `focus was ${pressWas}; ${show(presses)}; text and checks unchanged ${docNow === null ? 'unread (pane closed)' : docNow === docWas}`)
  await shot(cdp, 'g3-no-focus')
  await closePane(cdp)

  // No menu: a right-click on the body and on a table cell.
  await hold(cdp, 'Label Format')
  const menuBody = await popNative(cdp, await boxOf(cdp, SCROLLER))
  if (!(await paneUp(cdp))) await hold(cdp, 'Label Format')
  await reach(cdp, `document.querySelector('.info-pane .mdpm-tbl-cell')`)
  await sleep(200)
  const menuCell = await popNative(cdp, await boxOf(cdp, `document.querySelector('.info-pane .mdpm-tbl-cell')`))
  const domMenu = await cdp.evaluate(`[...document.querySelectorAll('[data-picker-portal]')].filter((p) => !p.querySelector('.info-pane') && !p.hasAttribute('data-picker-shield')).length`)
  pin(G, 'C-3', 'No menu: a right-click on the body and on a table cell opens nothing', menuBody === null && menuCell === null && domMenu === 0,
    `native menu on the body ${show(menuBody)}, on a cell ${show(menuCell)}; other portals ${domMenu}`)
  await escapeAll(cdp)
  await closePane(cdp)

  // The web link: Value Format's prose link follows as a web link does.
  await hold(cdp, 'Value Format')
  await reach(cdp, proseLink)
  await sleep(300)
  const webFocus = await active(cdp)
  const n0 = (await line.opened()).length
  await mouseClick(cdp, proseLink)
  await sleep(600)
  const followed = (await line.opened()).slice(n0)
  const webFocusAfter = await active(cdp)
  pin(G, 'C-2', 'The web link: a click on Value Format\'s prose link opens it as a web link does, and focus stays where it was',
    followed.length === 1 && /^https:\/\/commonmark\.org/.test(followed[0]) && webFocusAfter === webFocus,
    `followed ${show(followed)}; focus ${webFocus} → ${webFocusAfter}`)
  await closePane(cdp)

  // The cell's link: the link in Value Format's table opens nothing.
  await hold(cdp, 'Value Format')
  const cellLink = `document.querySelector('.info-pane .mdpm-tbl .md-link') ?? [...document.querySelectorAll('.info-pane .mdpm-tbl-cell')].find((c) => c.textContent.trim() === 'CommonMark')`
  await reach(cdp, cellLink)
  await sleep(300)
  const n1 = (await line.opened()).length
  await mouseClick(cdp, cellLink)
  await sleep(600)
  const cellFollowed = (await line.opened()).slice(n1)
  pin(G, 'C-2', "The cell's link: a click on the link in Value Format's table opens nothing", cellFollowed.length === 0, `followed ${show(cellFollowed)}`)
  await closePane(cdp)

  // The scroll: the wheel scrolls the body, and the settings behind stay put.
  await hold(cdp, 'Label Format')
  const behind = `[...document.querySelectorAll('*')].filter((e) => !e.closest('.info-pane') && e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollTop).join(',')`
  const behindWas = await cdp.evaluate(behind)
  const topWas = await cdp.evaluate(`(${SCROLLER}).scrollTop`)
  const wb = await rect(cdp, SCROLLER)
  await wheel(cdp, { x: wb.left + wb.width / 2, y: wb.top + wb.height / 2 }, 0, 200)
  await sleep(500)
  const topNow = await cdp.evaluate(`(${SCROLLER}).scrollTop`)
  const behindNow = await cdp.evaluate(behind)
  pin(G, 'C-2', 'The scroll: the wheel scrolls the body, and the settings behind it stay put', topNow > topWas && behindNow === behindWas,
    `body ${topWas} → ${topNow}; scrollers behind ${behindWas || 'none'} → ${behindNow || 'none'}`)
  await closePane(cdp)
}

// ── Group 4 — The Tags in Pommora ──────────────────────────────────────────

const PAGE_SCROLLER = `[...document.querySelectorAll('.cm-scroller')].find((s) => !s.closest('.info-pane') && !s.closest('[inert]'))`
async function tagsCase(cdp, on) {
  const G = 4
  const set = await setSwitch(cdp, 'Pages & Writing', 'HTML Formatting', on)
  await closeSettings(cdp)
  await openPageSettings(cdp, TAGS_PAGE)
  await closePanel(cdp)
  await sleep(600)
  const seen = await scrollThrough(cdp, PAGE_SCROLLER)
  const tagLines = await cdp.evaluate(`(() => { const s = ${PAGE_SCROLLER}; s.scrollTop = 0; return new Promise((r) => requestAnimationFrame(() => r([...s.querySelectorAll('.cm-line')].filter((l) => /^<\\/?[a-z-]+>$/.test(l.textContent.trim())).slice(0, 2).map((l) => l.textContent.trim() + ' ' + [...new Set([...l.querySelectorAll('*')].flatMap((e) => [...e.classList]))].join(' '))))) })()`)
  await sleep(300)
  await shot(cdp, `g4-html-formatting-${on ? 'on' : 'off'}`)
  const gaps = missing(seen)
  pin(G, '§Planning Rulings', `HTML Formatting ${on ? 'on' : 'off'}: the Markdown between the tags renders`, set && gaps.length === 0,
    `switch set ${set}; missing ${show(gaps)}; first tag lines ${show(tagLines)}`)
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
let line
try {
  cdp = (await launch(PORT, 'info-shots')).cdp
  line = await mainLine()
  await cdp.evaluate(LOGS)
  const added = await ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: SELECT, type: 'select', select_options: [{ key: 'One', label: 'One' }] } })
  if (!added.ok) throw new Error(`The seed stops: addProperty refused ${SELECT}: ${show(added)}`)
  await createPage(cdp, PAGE)
  await createPage(cdp, TAGS_PAGE)
  writeBody(TAGS_PAGE, readFileSync(join(REPO, 'Core/Info/InfoIndex.md'), 'utf8'))
  await sleep(1500)

  // On a fresh launch, before any Icon Picker opens.
  const byLook = await group2(cdp, line)
  await group1(cdp, byLook, line)
  await group3(cdp, line)
  await tagsCase(cdp, true)
  await tagsCase(cdp, false)

  const all = await logs(cdp)
  console.log(`\nconsole during the run (${all.length}):${all.length ? `\n  ${all.join('\n  ')}` : ' nothing'}`)
  line.close()
  cdp.close()
} catch (e) {
  item('run', '—', 'the drive ran to its end', false, String(e?.stack ?? e))
  if (cdp) {
    await shot(cdp, 'failure').catch(() => {})
    console.log(`console: ${show(await logs(cdp).catch(() => []))}`)
  }
} finally {
  await restore()
  tally(['1', '2', '3', '4', 'run'])
}
