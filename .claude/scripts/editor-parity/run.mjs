// run.mjs <label> <port> — drives one scratch instance through the fixture pages and writes results/<label>.json plus screenshots.
import fs from 'node:fs'
import { connect, openPage, sleep } from './cdp.mjs'
import { PAGES } from './fixtures.mjs'

const [label, port] = process.argv.slice(2)
const dir = new URL(`./results/${label}/`, import.meta.url)
fs.rmSync(dir, { recursive: true, force: true })
fs.mkdirSync(dir, { recursive: true })
const c = await connect(Number(port))
const out = { label, pages: {}, behaviors: {}, latency: {} }

const VIEW = `document.querySelector('.cm-content').cmTile.root.view`
const frames = (n = 2) =>
  c.evaluate(`new Promise((r) => { let k = ${n}; const f = () => (--k ? requestAnimationFrame(f) : r(true)); requestAnimationFrame(f) })`)
const doc = () => c.evaluate(`${VIEW}.state.doc.toString()`)
const head = () => c.evaluate(`${VIEW}.state.selection.main.head`)
const place = async (pos) => {
  await c.evaluate(`(() => { const v = ${VIEW}; v.focus(); v.dispatch({ selection: { anchor: ${pos} }, scrollIntoView: true }) })()`)
  await frames()
}
const key = async (keyName, code, vk, modifiers = 0) => {
  await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: keyName, code, windowsVirtualKeyCode: vk, modifiers })
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk, modifiers })
  await frames()
}
const type = async (text) => {
  for (const ch of text) {
    await c.send('Input.insertText', { text: ch })
    await frames(1)
  }
  await frames()
}
// A person's press: the pointer arrives, rests, presses, and lets go where it pressed.
const tap = async ({ x, y }) => {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 30, y, button: 'none' })
  await sleep(150)
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
  await sleep(200)
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(60)
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(300)
  await frames()
}
const centre = (expr) =>
  c.evaluate(`(() => { const r = (${expr}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
// The grip answers in the gutter just left of a line box: the nearest point there that still hits the line.
const grip = (expr) =>
  c.evaluate(`(() => { const l = ${expr}; const r = l.getBoundingClientRect(); const y = r.top + r.height / 2; for (let d = 4; d < 24; d++) if (document.elementFromPoint(r.left - d, y) === l) return { x: r.left - d - 2, y }; return null })()`)
const ENTER = () => key('Enter', 'Enter', 13)
const UNDO = () => key('z', 'KeyZ', 90, 4)
const REDO = () => key('z', 'KeyZ', 90, 12)

// The caret and its overlay blink on a timer; a screenshot hides them so two runs of one build match pixel for pixel.
await c.evaluate(`(() => { const s = document.createElement('style'); s.textContent = '.mdpm-caret-layer, .mdpm-caret, .mdpm-caret-overlay, .cm-cursorLayer { visibility: hidden !important }'; document.head.append(s) })()`)

// ── Render snapshot: every line as runs of identically styled text, widgets as boxes ─────────────
const SNAP = `(() => {
  const view = ${VIEW}
  // Decoration and background paint through from ancestors without inheriting, so they are read up to the line: what shows, not which span carries it.
  const style = (el) => {
    const s = getComputedStyle(el)
    const lines = new Set()
    let fill = 'none'
    for (let e = el; e && !e.classList.contains('cm-line'); e = e.parentElement) {
      const es = getComputedStyle(e)
      for (const d of es.textDecorationLine.split(' ')) if (d !== 'none') lines.add(d)
      if (fill === 'none' && es.backgroundColor !== 'rgba(0, 0, 0, 0)') fill = es.backgroundColor
    }
    return [s.color, s.fontWeight, s.fontStyle, s.fontSize, s.fontFamily.split(',')[0], [...lines].sort().join(' ') || 'none', fill, s.verticalAlign].join('|')
  }
  const line = (el) => {
    const runs = []
    const push = (r) => {
      const last = runs[runs.length - 1]
      if (r.t !== undefined && last && last.t !== undefined && last.s === r.s) last.t += r.t
      else runs.push(r)
    }
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) { if (n.data) push({ t: n.data, s: style(n.parentElement) }); continue }
        if (n.nodeType !== 1 || n.classList.contains('cm-widgetBuffer')) continue
        if (n.getAttribute('contenteditable') === 'false') {
          const r = n.getBoundingClientRect()
          push({ w: String(n.className), x: (n.textContent || '').trim().slice(0, 80), box: [Math.round(r.width), Math.round(r.height)], s: style(n) })
        } else walk(n)
      }
    }
    walk(el)
    return { cls: String(el.className), h: Math.round(el.getBoundingClientRect().height), runs }
  }
  const lines = {}
  for (const el of view.contentDOM.children) {
    if (el.classList.contains('cm-gap')) continue
    let at
    try { at = view.posAtDOM(el) } catch { continue }
    lines[at] = line(el)
  }
  return lines
})()`

async function snapshot(title) {
  console.error(`· snapshot ${title}`)
  await openPage(c, title)
  await place(0)
  await c.evaluate(`${VIEW}.scrollDOM.scrollTop = 0`)
  // A resting pointer hovers whatever line it lands on and raises its grip, so it rests in the window's corner instead.
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1, button: 'none' })
  const lines = {}
  const shots = []
  for (let step = 0; step < 40; step++) {
    // Language modes load on demand, so a step waits until two reads agree before it counts.
    let prev = ''
    for (let k = 0; k < 20; k++) {
      await sleep(150)
      const now = JSON.stringify(await c.evaluate(SNAP))
      if (now === prev) break
      prev = now
    }
    Object.assign(lines, JSON.parse(prev))
    // Only the editor's own lines are pictured: the header, banner, and chrome around them belong to other work.
    const rect = await c.evaluate(`(() => {
      const v = ${VIEW}
      const s = v.scrollDOM.getBoundingClientRect()
      const t = v.contentDOM.getBoundingClientRect()
      const top = Math.max(s.top, t.top)
      return { x: t.left, y: top, width: t.width, height: Math.max(1, Math.min(s.bottom, t.bottom) - top), scale: 1 }
    })()`)
    const shot = await c.send('Page.captureScreenshot', { format: 'png', clip: rect })
    const name = `${title.replace(/\W+/g, '-')}-${step}.png`
    fs.writeFileSync(new URL(name, dir), Buffer.from(shot.data, 'base64'))
    shots.push(name)
    const more = await c.evaluate(`(() => { const s = ${VIEW}.scrollDOM; const before = s.scrollTop; s.scrollTop = before + Math.floor(s.clientHeight * 0.8); return s.scrollTop > before })()`)
    if (!more) break
    await frames(3)
  }
  out.pages[title] = { lines, shots }
}

for (const title of ['Page A', 'Page B', 'Page C', 'Alpha 1']) await snapshot(title)

// ── Behaviors: each drives the real input chain and records what the document and the DOM became ───
const behave = async (name, fn) => {
  console.error(`· ${name}`)
  try {
    out.behaviors[name] = await fn()
  } catch (e) {
    out.behaviors[name] = { error: String(e.message ?? e) }
  }
}

const BODY = (title) => PAGES[Object.keys(PAGES).find((k) => k.endsWith(`/${title}.md`))]
// Every behavior starts from its page's fixture, whatever the one before it left there.
const reset = async (title, body = BODY(title)) => {
  await openPage(c, title)
  await c.evaluate(`(() => { const v = ${VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(body)} } }) })()`)
  await frames()
}

await behave('fence: three backticks, Enter, undo', async () => {
  await reset('Beta 1')
  await place(0)
  await type('```')
  const typed = await doc()
  await ENTER()
  const entered = await doc()
  const caret = await head()
  await UNDO()
  return { typed, entered, caret, undone: await doc() }
})

await behave('math: two dollars, Enter, undo', async () => {
  await reset('Beta 1')
  await place(0)
  await type('$$')
  await ENTER()
  const entered = await doc()
  const caret = await head()
  await UNDO()
  return { entered, caret, undone: await doc() }
})

await behave('undo and redo restore each step', async () => {
  await reset('Beta 1')
  await place(0)
  await type('one two')
  const typed = await doc()
  for (let k = 0; k < 10 && (await doc()) !== ''; k++) await UNDO()
  const undone = await doc()
  for (let k = 0; k < 10 && (await doc()) !== typed; k++) await REDO()
  return { typed, undone, redone: await doc() }
})

await behave('checkboxes toggle above and below an edit, and keep their DOM', async () => {
  await reset('Page C')
  await c.evaluate(`document.querySelectorAll('.md-list-checkbox-seat').forEach((b, i) => { b.__probe = i })`)
  await place((await doc()).indexOf('plain item one'))
  await type('x')
  const kept = await c.evaluate(`[...document.querySelectorAll('.md-list-checkbox-seat')].map((b) => b.__probe ?? null)`)
  await tap(await centre(`document.querySelectorAll('.md-list-checkbox-seat')[0]`))
  await tap(await centre(`document.querySelectorAll('.md-list-checkbox-seat')[1]`))
  const lines = (await doc()).split('\n')
  return { kept, above: lines.find((l) => l.includes('check above')), below: lines.find((l) => l.includes('check below')) }
})

await behave('a list item drags by its glyph and settles', async () => {
  await reset('Page C')
  const item = (t) => `[...document.querySelectorAll('.cm-line.md-list-item')].find((e) => e.textContent.includes('${t}'))`
  const from = await centre(`${item('plain item one')}.querySelector('.md-list-glyph')`)
  const to = await centre(item('plain item three'))
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, button: 'none' })
  await sleep(200)
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 })
  for (let k = 1; k <= 12; k++) {
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y + ((to.y + 8 - from.y) * k) / 12, button: 'left', buttons: 1 })
    await sleep(30)
  }
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: from.x, y: to.y + 8, button: 'left', buttons: 0, clickCount: 1 })
  await sleep(800)
  return { order: (await doc()).split('\n').filter((l) => l.startsWith('- plain')) }
})

await behave('heading folds and unfolds with its animation', async () => {
  await reset('Page C')
  const LINE = `[...document.querySelectorAll('.cm-line.md-heading-fold')].find((e) => e.textContent.includes('Fold Me'))`
  // The reveal's height sampled every frame for 600 ms: an animation shows values strictly between where it started and where it settled.
  const sample = async () => {
    const hs = []
    const t0 = Date.now()
    while (Date.now() - t0 < 600) {
      hs.push(await c.evaluate(`(() => { const r = document.querySelector('.mdpm-fold-reveal'); return r ? Math.round(r.getBoundingClientRect().height) : -1 })()`))
      await sleep(8)
    }
    return hs
  }
  const between = (hs) => {
    const seen = hs.filter((h) => h >= 0)
    const lo = Math.min(...seen)
    const hi = Math.max(...seen)
    return seen.filter((h) => h > lo && h < hi).length
  }
  const docBefore = await doc()
  const toggle = async () => {
    const at = await grip(LINE)
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x + 40, y: at.y, button: 'none' })
    await sleep(200)
    await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none' })
    await sleep(300)
    await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 })
    await sleep(60)
    await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', buttons: 0, clickCount: 1 })
    return sample()
  }
  const folding = await toggle()
  const closed = await c.evaluate(`${LINE}.className`)
  const opening = await toggle()
  const opened = await c.evaluate(`${LINE}.className`)
  return {
    docUnchanged: docBefore === (await doc()),
    closed: closed.includes('md-fold-closed'),
    opened: opened.includes('md-fold-open'),
    foldAnimates: between(folding) > 2,
    unfoldAnimates: between(opening) > 2,
    heights: [folding[0], folding[folding.length - 1], opening[opening.length - 1]],
  }
})

await behave('table cell takes typing', async () => {
  await reset('Page C')
  await tap(await centre(`[...document.querySelectorAll('.mdpm-tbl-cell')].find((e) => e.textContent.trim() === 'a1')`))
  await type('Z')
  await key('Escape', 'Escape', 27)
  return { row: (await doc()).split('\n').find((l) => l.includes('a1') || l.includes('Z')) }
})

await behave('citation renumbers and the caret steps over a marker', async () => {
  await reset('Page C')
  const text = await doc()
  await place(text.length)
  await type('\n[^9]: Nine.')
  await place((await doc()).indexOf('Cite here'))
  await type('First[^9] ')
  await frames(4)
  const numbers = await c.evaluate(`[...document.querySelectorAll('.md-citation-reference')].map((e) => e.textContent)`)
  const t2 = await doc()
  const marker = t2.indexOf('[^1]')
  await place(marker)
  await key('ArrowRight', 'ArrowRight', 39)
  return { numbers, stepFrom: marker, stepTo: await head(), markerEnd: marker + 4 }
})

await behave('embed tile stays mounted while typing elsewhere', async () => {
  await reset('Page A')
  const text = await doc()
  await place(text.indexOf('Closing paragraph'))
  const found = await c.evaluate(`(() => { const t = document.querySelector('.mdpm-embed-tile'); if (!t) return false; t.__probe = 1; return true })()`)
  await type('ab')
  const kept = await c.evaluate(`(() => { const t = document.querySelector('.mdpm-embed-tile'); return !!t && t.__probe === 1 && t.isConnected })()`)
  return { found, kept }
})

// ── Latency: the editor's own update per keystroke, typed mid-page ───────────────────────────────
for (const title of ['Alpha 2', 'Alpha 3']) {
  await openPage(c, title)
  const text = await doc()
  await place(Math.floor(text.length / 2))
  out.latency[title] = await c.evaluate(`(() => {
    const v = ${VIEW}
    const times = []
    for (let k = 0; k < 120; k++) {
      const at = v.state.selection.main.head
      const t = performance.now()
      v.dispatch({ changes: { from: at, insert: 'x' }, selection: { anchor: at + 1 }, userEvent: 'input.type' })
      times.push(performance.now() - t)
    }
    times.sort((a, b) => a - b)
    return { median: +times[60].toFixed(3), p90: +times[108].toFixed(3) }
  })()`)
}

fs.writeFileSync(new URL(`../${label}.json`, dir), JSON.stringify(out, null, 1))
console.log(`${label}: ${Object.keys(out.pages).length} pages, ${Object.keys(out.behaviors).length} behaviors`)
c.close()
