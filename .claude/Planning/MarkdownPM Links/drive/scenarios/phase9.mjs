// Phase 9 — MarkdownPM table cells at rest: every construct answers a right-click without the cell being focused
// (plain text, a selection, a checkbox line, a § run take the editor door; a link keeps the link door; a read-only
// embedded page answers nothing); main's resting menu lists Cut, Copy, Paste, Paste As, Paste Without Formatting,
// Lists, Format and no Undo, Redo, Select All; a writing row commits at rest, a slot row enters the cell; Copy and
// Cut write the source slice; Paste, Paste As, and Paste Without Formatting run through the one pipeline, and a
// table-shaped clipboard fills cells. The editor door needs a real right-click (main's context-menu), so every
// menu here pops from Input.dispatchMouseEvent; a DOM selection is seated by code, which the report names.
export const name = 'Phase 9 — resting cell menus: the editor door, commit at rest, the system rows'

const labels = (rows) => (rows ?? []).filter((r) => r.type !== 'separator').map((r) => r.label)
const has = (rows, ...want) => rows !== null && want.every((w) => labels(rows).includes(w))
const lacks = (rows, ...bad) => rows !== null && bad.every((w) => !labels(rows).includes(w))
const row = (rows, label) => (rows ?? []).find((r) => r.label === label) ?? null
const sub = (rows, label) => row(rows, label)?.submenu ?? null

const BODY = ['# Scratch', '', '## Setup', '', '| A | B |', '|---|---|', '| plain text cell | **bold** word |', '| [[Alpha\\|alias]] | - [ ] todo |', '| see §Setup | https://example.com |', ''].join('\n')

export async function run(d) {
  await d.setSetting('defaultLinkFormat', 'link-short')
  await d.setSetting('inPageHeadingResolution', 'automatic')
  const ed = await d.scratchPage('Scratch', BODY)
  const reset = async () => {
    for (let i = 0; i < 3 && (await d.count('.mdpm-tbl-cell-editor .cm-content')) > 0; i++) {
      await d.press('Escape')
      await d.settle(250)
    }
    await ed.setDoc(BODY)
    await ed.caretIn('| A')
    await d.settle(400)
    await d.waitFor(() => $$('.mdpm-tbl-cell-static').some((e) => e.textContent === 'plain text cell') && $$('.mdpm-tbl-cell-editor .cm-content').length === 0, { label: 'the resting table', timeout: 5000 })
    await d.eval(() => window.getSelection()?.removeAllRanges())
  }
  const tableLine = async (starts) => (await ed.doc()).split('\n').find((l) => l.startsWith(starts)) ?? null
  const editors = () => d.count('.mdpm-tbl-cell-editor .cm-content')
  // A point inside a resting cell's drawn text, and a DOM selection over `word` inside it, seated by code.
  const pointIn = (cellText, word, within = '') =>
    d.eval((cellText, word, within) => {
      const cell = $$(`${within} .mdpm-tbl-cell-static`.trim()).find((e) => e.textContent === cellText)
      if (!cell) return null
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node && !node.data.includes(word)) node = walker.nextNode()
      if (!node) return null
      const at = node.data.indexOf(word)
      const range = document.createRange()
      range.setStart(node, at)
      range.setEnd(node, at + word.length)
      const b = range.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, cell: (() => { const c = cell.getBoundingClientRect(); return { x: c.x + c.width - 6, y: c.y + c.height / 2 } })() }
    }, cellText, word, within)
  const selectIn = (cellText, word) =>
    d.eval((cellText, word) => {
      const cell = $$('.mdpm-tbl-cell-static').find((e) => e.textContent === cellText)
      if (!cell) return null
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node && !node.data.includes(word)) node = walker.nextNode()
      if (!node) return false
      const at = node.data.indexOf(word)
      // the page editor, when focused, re-seats the DOM selection to its own; the cell's selection is seated unfocused
      document.activeElement?.blur?.()
      window.getSelection().setBaseAndExtent(node, at, node, at + word.length)
      return window.getSelection().toString()
    }, cellText, word)
  const menuAt = async (pt, pick = null) => {
    if (!pt) return null
    await d.armNativeMenu(pick)
    await d.rightClickAt(pt.x, pt.y)
    const rows = await d.waitNativeMenu()
    await d.settle(300)
    return rows
  }

  // -- 9-1: the editor door at rest (R-16, R-19, R-20) --------------------------------------
  await reset()
  d.clipboard('')
  let pt = await pointIn('plain text cell', 'plain')
  let m = await menuAt(pt)
  d.check('resting plain text: the editor menu pops with Cut, Copy, Paste, Paste Without Formatting, Lists, Format', has(m, 'Cut', 'Copy', 'Paste', 'Paste Without Formatting', 'Lists', 'Format'), { rows: labels(m) })
  d.check('resting plain text: no Undo, Redo, or Select All', lacks(m, 'Undo', 'Redo', 'Select All') && !(m ?? []).some((r) => ['undo', 'redo', 'selectAll'].includes(r.role)), { roles: (m ?? []).map((r) => r.role).filter(Boolean) })
  d.check('resting plain text: Cut and Copy are disabled with nothing selected, Paste Without Formatting with an empty clipboard', row(m, 'Cut')?.enabled === false && row(m, 'Copy')?.enabled === false && row(m, 'Paste Without Formatting')?.enabled === false, { cut: row(m, 'Cut'), pwf: row(m, 'Paste Without Formatting') })
  d.check('resting plain text: the right-click mounts no editor', (await editors()) === 0, {})
  d.check('resting plain text: Cut, Copy, Paste keep their chord hints', row(m, 'Cut')?.accelerator === 'CmdOrCtrl+X' && row(m, 'Paste')?.accelerator === 'CmdOrCtrl+V', { cut: row(m, 'Cut'), paste: row(m, 'Paste') })

  d.clipboard('https://example.com')
  m = await menuAt(await pointIn('plain text cell', 'plain'))
  d.check('resting plain text: Paste and Paste Without Formatting enable with clipboard text, and Paste As appears for an address', row(m, 'Paste')?.enabled === true && row(m, 'Paste Without Formatting')?.enabled === true && has(m, 'Paste As'), { paste: row(m, 'Paste'), pwf: row(m, 'Paste Without Formatting'), rows: labels(m) })

  pt = await pointIn('alias', 'alias')
  m = await menuAt(pt)
  d.check('resting link: the link door still answers (Preview, Rename, Edit Title, Remove Link, Delete) and nothing else', has(m, 'Preview', 'Rename', 'Edit Title', 'Remove Link', 'Delete') && lacks(m, 'Cut', 'Paste As', 'Lists'), { rows: labels(m) })

  m = await menuAt(await pointIn('todo', 'todo'))
  d.check('resting checkbox line: the editor door answers over the item text', has(m, 'Cut', 'Paste', 'Lists', 'Format'), { rows: labels(m) })
  m = await menuAt(await pointIn('see §Setup', 'Setup'))
  d.check('resting § run: no menu of its own; the editor door answers', has(m, 'Cut', 'Paste', 'Format') && lacks(m, 'Preview', 'Rename'), { rows: labels(m) })

  // read-only: an embedded page's resting cell answers nothing on plain text, the link door still answers (B-56)
  await ed.setDoc('# Scratch\n\n![[Beta]]\n')
  await d.waitFor(() => $$('.tile-base .cm-content').length > 0, { label: 'the embedded page', timeout: 8000 })
  await d.editor('.tile-base .cm-content').caretIn('| Col A')
  await d.waitFor(() => $$('.tile-base .mdpm-tbl-cell-static').length > 0, { label: 'the embedded table', timeout: 8000 })
  await d.settle(300)
  pt = await pointIn('plain text cell', 'plain', '.tile-base')
  await d.armNativeMenu(null)
  await d.rightClickAt(pt.x, pt.y)
  const ro = await d.waitNativeMenu(1500)
  d.check("B-56: a read-only embedded page's resting plain text pops no menu and mounts no editor", ro === null && (await d.count('.tile-base .mdpm-tbl-cell-editor')) === 0, { rows: labels(ro) })
  await d.press('Escape')
  m = await menuAt(await pointIn('alias', 'alias', '.tile-base'))
  d.check("B-56: the embedded page's resting link still offers its read-only link menu", has(m, 'Copy Link') && lacks(m, 'Rename', 'Remove Link', 'Cut'), { rows: labels(m) })

  // -- 9-2: commit at rest, slots enter --------------------------------------------------------
  await reset()
  await selectIn('plain text cell', 'text')
  pt = await pointIn('plain text cell', 'text')
  m = await menuAt(pt, ['Format', 'Bold'])
  await d.settle(400)
  d.check('Format ▸ Bold over a selection commits **text** and stays at rest', (await tableLine('| plain')) === '| plain **text** cell | **bold** word |' && (await editors()) === 0, { line: await tableLine('| plain'), editors: await editors(), rows: labels(sub(m, 'Format')) })

  await reset()
  m = await menuAt(await pointIn('plain text cell', 'cell'), ['Format', 'Bold'])
  let entered = null
  try {
    await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the cell entering', timeout: 3000 })
    const cell = d.editor('.mdpm-tbl-cell-editor .cm-content')
    entered = { doc: await cell.doc(), sel: await cell.selection() }
  } catch {}
  d.check('Format ▸ Bold at a point writes **** and enters with the caret between', entered !== null && entered.doc.includes('****') && entered.sel.from === entered.sel.to && entered.doc.slice(entered.sel.from - 2, entered.sel.from + 2) === '****', { entered })

  await reset()
  m = await menuAt(await pointIn('plain text cell', 'plain'), ['Lists', 'Bullet List'])
  await d.settle(400)
  d.check('Lists ▸ Bulleted at a point writes the list line and stays at rest', (await tableLine('| - plain')) === '| - plain text cell | **bold** word |' && (await editors()) === 0, { line: await tableLine('| - plain') ?? await tableLine('| plain'), lists: labels(sub(m, 'Lists')) })

  await reset()
  await selectIn('plain text cell', 'text')
  m = await menuAt(await pointIn('plain text cell', 'text'), ['Format', 'Connection'])
  await d.settle(400)
  d.check('Format ▸ Connection over a selection writes [[text]] at rest', (await tableLine('| plain')) === '| plain [[text]] cell | **bold** word |' && (await editors()) === 0, { line: await tableLine('| plain') })

  await reset()
  await selectIn('plain text cell', 'text')
  m = await menuAt(await pointIn('plain text cell', 'text'), ['Format', 'External Link'])
  entered = null
  try {
    await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the cell entering', timeout: 3000 })
    const cell = d.editor('.mdpm-tbl-cell-editor .cm-content')
    entered = { doc: await cell.doc(), sel: await cell.selection() }
  } catch {}
  d.check('Format ▸ External Link over a selection writes [text]() and enters with the caret inside ()', entered !== null && entered.doc.includes('[text]()') && entered.doc.slice(entered.sel.from - 1, entered.sel.from + 1) === '()', { entered })

  await reset()
  await selectIn('https://example.com', 'https://example.com')
  m = await menuAt(await pointIn('https://example.com', 'example'), 'Insert Link')
  await d.settle(400)
  d.check('Insert Link over an address at rest writes the label-kept link', (await tableLine('| see')) === '| see §Setup | [https://example.com](https://example.com) |' && (await editors()) === 0, { line: await tableLine('| see'), editors: await editors(), rows: labels(m) })

  // -- 9-3: the system rows ----------------------------------------------------------------
  await reset()
  d.clipboard('')
  await selectIn('plain text cell', 'text cell')
  m = await menuAt(await pointIn('plain text cell', 'text'), 'Copy')
  await d.settle(300)
  d.check('Copy at rest writes the source slice', d.readClipboard() === 'text cell' && (await tableLine('| plain')) === '| plain text cell | **bold** word |', { clip: d.readClipboard() })

  await reset()
  await selectIn('bold word', 'bold')
  m = await menuAt(await pointIn('bold word', 'bold'), 'Copy')
  await d.settle(300)
  d.check('Copy over a mark’s drawn text takes its hidden markers', d.readClipboard() === '**bold**', { clip: d.readClipboard() })

  await reset()
  await selectIn('plain text cell', 'text')
  m = await menuAt(await pointIn('plain text cell', 'text'), 'Cut')
  await d.settle(400)
  d.check('Cut at rest copies then commits the deletion', d.readClipboard() === 'text' && (await tableLine('| plain')) === '| plain  cell | **bold** word |', { clip: d.readClipboard(), line: await tableLine('| plain') })

  await reset()
  d.clipboard('https://example.com')
  m = await menuAt(await pointIn('plain text cell', 'cell'), 'Paste')
  await d.settle(600)
  d.check('Paste of an address at a point commits the Default Link Format at rest', ((await tableLine('| plain')) ?? '').includes('[example.com](https://example.com)') && (await editors()) === 0, { line: await tableLine('| plain'), editors: await editors() })

  await reset()
  await selectIn('plain text cell', 'text')
  m = await menuAt(await pointIn('plain text cell', 'text'), 'Paste')
  await d.settle(600)
  d.check('Paste of an address over a selection wraps it', (await tableLine('| plain')) === '| plain [text](https://example.com) cell | **bold** word |', { line: await tableLine('| plain') })

  await reset()
  d.clipboard('[[Gamma]]')
  m = await menuAt(await pointIn('plain text cell', 'cell'), ['Paste As', 'Connection'])
  await d.settle(600)
  d.check('Paste As ▸ Connection at rest commits [[Gamma]]', ((await tableLine('| plain')) ?? '').includes('[[Gamma]]'), { line: await tableLine('| plain'), pasteAs: labels(sub(m, 'Paste As')) })

  await reset()
  d.clipboard('[[Gamma]]')
  m = await menuAt(await pointIn('plain text cell', 'cell'), 'Paste Without Formatting')
  await d.settle(600)
  d.check('Paste Without Formatting at rest commits the clipboard as is', ((await tableLine('| plain')) ?? '').includes('[[Gamma]]'), { line: await tableLine('| plain') })

  // a two-cell rectangle copied, then pasted at rest into another cell
  await reset()
  const cellRect = (text) =>
    d.eval((text) => {
      const el = $$('.mdpm-tbl-cell-static').find((e) => e.textContent === text)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }, text)
  await d.drag(await cellRect('plain text cell'), await cellRect('bold word'))
  await d.settle(300)
  await d.copy()
  await d.settle(300)
  await d.press('Escape')
  await d.settle(200)
  const payload = d.readClipboard()
  m = await menuAt(await pointIn('see §Setup', 'see'), 'Paste')
  await d.settle(800)
  const rows = (await ed.doc()).split('\n').filter((l) => l.startsWith('|'))
  d.check('Paste of a copied rectangle at rest fills the cells from the clicked one', rows[4] === '| plain text cell | **bold** word |', { rows, payload: payload.slice(0, 80) })

  // -- the checkpoint's folds: the renumber at rest, a point on a glyph, a paste into an ambiguous link -----
  const LISTS = ['# Scratch', '', '| A | B |', '|---|---|', '| a<br>b<br>c | - item |', '| [[Dup]] here | x |', ''].join('\n')
  const resetLists = async () => {
    for (let i = 0; i < 3 && (await d.count('.mdpm-tbl-cell-editor .cm-content')) > 0; i++) {
      await d.press('Escape')
      await d.settle(250)
    }
    await ed.setDoc(LISTS)
    await ed.caretIn('| A')
    await d.settle(400)
    await d.waitFor(() => $$('.mdpm-tbl-cell-static').some((e) => e.textContent?.endsWith('item')), { label: 'the lists table', timeout: 5000 })
    await d.eval(() => window.getSelection()?.removeAllRanges())
  }
  await d.setSetting('plainUnresolvedLinks', false)
  await resetLists()
  const abc = await d.eval(() => { const c = $$('.mdpm-tbl-cell-static').find((e) => e.textContent?.startsWith('a')); return c ? { text: c.textContent } : null })
  await selectIn(abc?.text ?? 'abc', 'a')
  await d.eval(() => { const c = $$('.mdpm-tbl-cell-static').find((e) => e.textContent?.startsWith('a')); const t = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); const first = t.nextNode(); let last = first; let n; while ((n = t.nextNode())) last = n; document.activeElement?.blur?.(); window.getSelection().setBaseAndExtent(first, 0, last, last.data.length) })
  m = await menuAt(await pointIn(abc?.text ?? 'abc', 'b'), ['Lists', 'Numbered List'])
  await d.settle(500)
  d.check('Lists ▸ Numbered over a multi-line cell at rest renumbers as a live cell does', ((await tableLine('| 1. a')) ?? '').startsWith('| 1. a<br>2. b<br>3. c |') && (await editors()) === 0, { line: (await ed.doc()).split('\n').find((l) => l.includes('1. a')) ?? null, cell: abc })

  await resetLists()
  const glyph = await d.eval(() => { const g = $$('.mdpm-tbl-cell-static .md-list-bullet')[0]; if (!g) return null; const b = g.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
  m = await menuAt(glyph, ['Format', 'Bold'])
  entered = null
  try {
    await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the cell entering', timeout: 3000 })
    entered = { doc: await d.editor('.mdpm-tbl-cell-editor .cm-content').doc() }
  } catch {}
  d.check('Format ▸ Bold at a point on a list glyph writes the slot after the marker, not before it', entered !== null && entered.doc.startsWith('- ****item'), { entered, glyph })

  await resetLists()
  d.clipboard('https://example.com')
  m = await menuAt(await pointIn('Dup here', 'Dup'), 'Paste')
  await d.settle(600)
  d.check('Paste of an address at a point inside a resting ambiguous link retargets it (§5.8)', (await tableLine('| [example.com]')) === '| [example.com](https://example.com) here | x |', { line: (await ed.doc()).split('\n').find((l) => l.includes('here')) ?? null })

  await d.setSetting('defaultLinkFormat', 'link-full')
}
