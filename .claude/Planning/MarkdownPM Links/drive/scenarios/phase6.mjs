// Phase 6 — Menus and Actions: one builder's rows on the body, the resting cell, a read-only embed (B-56), and
// the Link value parents; a pick applies through one edit; a resting Format ▸ Page Title waits for the title and
// commits once (F-043); the create-ghost stays held while a value's menu is open (B-68); Panel Remove hides the row.
// Link menus are native (main pops them), so they're read and answered through the drive's main-process hook.
export const name = 'Phase 6 — one link menu, one edit, F-043, B-56, B-68'

const labels = (rows) => (rows ?? []).filter((r) => r.type !== 'separator').map((r) => r.label)
const has = (rows, ...want) => rows !== null && want.every((w) => labels(rows).includes(w))
const lacks = (rows, ...bad) => bad.every((w) => !labels(rows).includes(w))
const sub = (rows, label) => (rows ?? []).find((r) => r.label === label)?.submenu ?? null

export async function run(d) {
  await d.setSetting('inPageHeadingResolution', 'automatic')
  await d.openPage('Beta')
  await d.settle(400)

  // -- the body ---------------------------------------------------------------
  let m = await d.nativeMenuOn('.cm-content .md-connection-resolved', 'x', 'Remove Link')
  d.check('body: [x](Alpha) authors like [[Alpha]] (Preview, New Tab | Rename, Edit Title | Copy Link, Copy Path | Remove Link, Delete)', has(m, 'Preview', 'New Tab', 'Rename', 'Edit Title', 'Copy Link', 'Copy Path', 'Remove Link', 'Delete') && lacks(m, 'Format', 'Add Title', 'Edit Link'), { rows: labels(m) })
  await d.settle(300)
  const doc1 = await d.editor().doc()
  d.check('body: Remove Link on [x](Alpha) writes x', doc1.includes('Resolved: [[Alpha]] and x and [[Alpha#Setup]]'), { line: doc1.split('\n').find((l) => l.startsWith('Resolved:')) })
  await d.editor().undo()
  await d.settle(200)

  m = await d.nativeMenuOn('.cm-content .md-link', 'docs')
  d.check('body: a weblink lists Preview, Open In Browser | Rename, Edit Link | Copy Link, Format | Remove Link, Delete', has(m, 'Preview', 'Open In Browser', 'Rename', 'Edit Link', 'Copy Link', 'Format', 'Remove Link', 'Delete') && lacks(m, 'Edit Title', 'Copy Path', 'New Tab'), { rows: labels(m) })
  d.check('body: Format ▸ offers Full Link, Short Link, Page Title for a web address', has(sub(m, 'Format'), 'Full Link', 'Short Link', 'Page Title'), { sub: labels(sub(m, 'Format')) })

  m = await d.nativeMenuOn('.cm-content .md-link', 'm')
  d.check('body: a mailto: link lists Open In Browser alone among the opens and no Page Title under Format', has(m, 'Open In Browser') && lacks(m, 'Preview') && has(sub(m, 'Format'), 'Full Link', 'Short Link') && lacks(sub(m, 'Format'), 'Page Title'), { rows: labels(m), sub: labels(sub(m, 'Format')) })

  await d.armNativeMenu(null)
  const ph = await d.rect('.cm-content .md-connection-phantom')
  await d.rightClickAt(ph.cx, ph.cy)
  await d.settle(500)
  m = await d.lastNativeMenu()
  d.check('body: a phantom gets no link menu (the right-click falls through to the editor menu)', m !== null && lacks(m, 'Copy Link', 'Remove Link', 'Rename'), { rows: labels(m) })

  m = await d.nativeMenuOn('.cm-content .md-connection-resolved', 'alias', 'Rename')
  d.check('body: Rename on [[Alpha|alias]] is offered without an alias-dependent label', has(m, 'Rename', 'Edit Title') && lacks(m, 'Add Title'), { rows: labels(m) })
  await d.settle(300)
  const sel = await d.editor().selection()
  const doc2 = await d.editor().doc()
  d.check('body: Rename selects the alias', doc2.slice(sel.from, sel.to) === 'alias', { sel, text: doc2.slice(sel.from, sel.to) })

  m = await d.nativeMenuOn('.cm-content .md-connection-resolved', 'Alpha', 'Rename')
  await d.settle(300)
  const doc3 = await d.editor().doc()
  const sel3 = await d.editor().selection()
  d.check('body: Rename on [[Alpha]] writes the pipe and seats after it', doc3.includes('Resolved: [[Alpha|]] and') && doc3.slice(sel3.from - 1, sel3.from) === '|' && sel3.from === sel3.to, { around: doc3.slice(sel3.from - 9, sel3.from + 3) })
  await d.editor().undo()
  await d.settle(200)

  // -- the resting cell: F-043 -----------------------------------------------------
  await d.eval(() => {
    const store = window.__pommora
    const real = store.getState().resolveLinkTitle
    let release
    const held = new Promise((r) => (release = r))
    window.__driveTitle = { release, real }
    const { 'https://example.com': _cached, ...linkTitles } = store.getState().linkTitles
    store.setState({
      linkTitles,
      resolveLinkTitle: (url) =>
        held.then((t) => {
          if (t) store.setState((st) => ({ linkTitles: { ...st.linkTitles, [url]: t } }))
          return t
        }),
    })
  })
  await d.editor().caretIn('| Col A')
  await d.settle(400)
  m = await d.nativeMenuOn('.mdpm-tbl-cell-static .md-link', 'x', ['Format', 'Page Title'])
  d.check('resting cell: a weblink offers Rename, Edit Link, Format, Remove Link, Delete', has(m, 'Rename', 'Edit Link', 'Format', 'Remove Link', 'Delete'), { rows: labels(m) })
  await d.settle(500)
  const cellBefore = await d.eval(() => $$('.mdpm-tbl-cell-static').map((e) => e.textContent).find((t) => t === 'x') ?? null)
  const docBefore = await d.editor().doc()
  d.check('F-043: Format ▸ Page Title at rest leaves the cell as it was until the title arrives', cellBefore === 'x' && docBefore.includes('[x](https://example.com)') && !docBefore.includes('Example Domain'), { cellBefore })
  await d.eval(() => window.__driveTitle.release('Example Domain'))
  let landed = null
  try {
    landed = await d.waitFor(() => $$('.mdpm-tbl-cell-static').map((e) => e.textContent).find((t) => t === 'Example Domain') ?? null, { label: 'the title landing at rest', timeout: 5000 })
  } catch {}
  const tableLine = (doc) => doc.split('\n').find((l) => l.startsWith('| [[Alpha\\|alias]]')) ?? ''
  const docAfter = await d.editor().doc()
  d.check('F-043: the titled form is written in one step when the title lands', landed !== null && tableLine(docAfter).includes('[Example Domain](https://example.com)') && !tableLine(docAfter).includes('[x](https://example.com)'), { landed, line: tableLine(docAfter) })
  await d.shot('cell-title-landed', '.mdpm-tbl')
  await d.editor().focus()
  await d.editor().undo()
  await d.settle(300)
  const docUndone = await d.editor().doc()
  d.check('F-043: one undo removes the titled write', tableLine(docUndone).includes('[x](https://example.com)') && !docUndone.includes('Example Domain'), { line: tableLine(docUndone) })
  await d.eval(() => window.__pommora.setState({ resolveLinkTitle: window.__driveTitle.real }))

  // a resting Rename enters the cell with the caret after the pipe
  await d.editor().caretIn('| Col A')
  await d.settle(300)
  m = await d.nativeMenuOn('.mdpm-tbl-cell-static .md-connection-resolved', 'Alpha', 'Rename')
  d.check('resting cell: [[Alpha]] offers Rename, Edit Title, Remove Link, Delete', has(m, 'Rename', 'Edit Title', 'Remove Link', 'Delete'), { rows: labels(m) })
  let entered = false
  try {
    await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the cell entering', timeout: 3000 })
    entered = true
  } catch {}
  if (entered) {
    const cell = d.editor('.mdpm-tbl-cell-editor .cm-content')
    const cellDoc = await cell.doc()
    const cellSel = await cell.selection()
    d.check('resting cell: Rename on [[Alpha]] writes the pipe and enters with the caret after it', cellDoc.startsWith('[[Alpha|]]') && cellSel.from === '[[Alpha|'.length && cellSel.to === cellSel.from, { cellDoc, cellSel })
    await d.press('Escape')
    await d.settle(300)
  } else d.check('resting cell: Rename on [[Alpha]] enters the cell', false, { doc: (await d.editor().doc()).split('\n').find((l) => l.includes('plain')) })
  await d.editor().undo()
  await d.settle(200)

  // -- B-56: a read-only embedded page's resting cells ------------------------------
  await d.scratchPage('Scratch', '# Scratch\n\n![[Beta]]\n')
  await d.waitFor(() => $$('.tile-base .cm-content').length > 0, { label: 'the embedded page', timeout: 8000 })
  await d.editor('.tile-base .cm-content').caretIn('| Col A')
  await d.waitFor(() => $$('.tile-base .mdpm-tbl-cell-static').length > 0, { label: 'the embedded table', timeout: 8000 })
  m = await d.nativeMenuOn('.tile-base .mdpm-tbl-cell-static .md-connection-resolved', 'Alpha')
  d.check("B-56: a read-only embedded page's resting link offers no authoring rows", has(m, 'Copy Link') && lacks(m, 'Rename', 'Edit Title', 'Remove Link', 'Delete'), { rows: labels(m) })
  await d.scratchPage('Scratch', '# Scratch\n\n')

  // -- the Link value parents: the Table view (B-68) -----------------------------------
  await d.openSet('Collection A', 'Set Alpha')
  await d.settle(500)
  const valueSel = '.data-row .cell-text-host [data-link], .data-row .cell-link'
  m = await d.nativeMenuOn(valueSel, 'Alpha§Setup')
  d.check('Table: a Link value lists Preview, New Tab | Rename, Edit Title | Copy Link, Copy Path | Clear, and no Format or Remove', has(m, 'Rename', 'Edit Title', 'Copy Link', 'Copy Path', 'Clear') && lacks(m, 'Format', 'Remove', 'Remove Link', 'Delete'), { rows: labels(m) })
  const rowCount = await d.count('.data-row:not(.ghost-row)')
  const lastRow = await d.rect('.data-row:not(.ghost-row)', rowCount - 1)
  if (lastRow) {
    // A native menu is modal, so the renderer sees no pointer while it's open; what B-68 guards is the dwell a hover
    // armed before the right-click firing behind the menu. Hover first, open a held menu, then watch the dwell window.
    await d.mouse('mouseMoved', lastRow.cx, lastRow.cy + lastRow.h * 0.3)
    await d.settle(300)
    await d.armNativeMenu({ pick: null, holdMs: 3000 })
    await d.contextMenuOn(valueSel, 'Alpha§Setup')
    await d.settle(1800)
    const ghostWhileOpen = await d.count('.ghost-row')
    await d.settle(1500)
    await d.mouse('mouseMoved', 5, 5)
    await d.settle(400)
    await d.mouse('mouseMoved', lastRow.cx, lastRow.cy + lastRow.h * 0.3)
    await d.settle(1800)
    const ghostAfter = await d.count('.ghost-row')
    d.check("B-68: no create-ghost appears behind a Link value's open menu (and a hover after it closes still raises one)", ghostWhileOpen === 0 && ghostAfter >= 1, { ghostWhileOpen, ghostAfter })
    await d.mouse('mouseMoved', 5, 5)
    await d.settle(300)
  } else d.check('B-68: a data row to hover', false, { rowCount })

  // -- the Panel (the page's side pane): Remove hides the row ----------------------------
  const beta = await d.page('Beta')
  await d.store((s, p) => s.openWindowTab({ kind: 'page', id: p.id, path: p.path }), beta)
  await d.waitFor(() => $$('.window-actions-flow button[title="Side Pane"]').length > 0, { label: 'the Page Window', timeout: 6000 })
  await d.settle(500)
  await d.eval(() => $$('.window-actions-flow button[title="Side Pane"]')[0].click())
  await d.waitFor(() => $$('.window-pane-scroll .value-seat').length > 0, { label: 'the side pane', timeout: 6000 })
  await d.settle(400)
  const panelSel = '.window-pane-scroll .cell-text-host [data-link], .window-pane-scroll .cell-link'
  const seats = await d.count(panelSel)
  if (seats > 0) {
    m = await d.nativeMenuOn(panelSel, 'Alpha§Setup', 'Remove')
    d.check('Panel: a Link value lists Rename, Edit Title, Copy Link, Copy Path, Clear, Remove', has(m, 'Rename', 'Edit Title', 'Copy Link', 'Copy Path', 'Clear', 'Remove'), { rows: labels(m) })
    await d.settle(600)
    const still = await d.eval(() => ({
      seat: $$('.window-pane-scroll .cell-text-host [data-link], .window-pane-scroll .cell-link').some((e) => e.textContent === 'Alpha§Setup'),
      row: $$('.window-pane-scroll *').some((e) => e.childElementCount === 0 && e.textContent?.trim() === 'Fixture Link'),
    }))
    d.check('Panel: Remove clears the value and hides the row', !still.seat && !still.row, still)
    await d.shot('panel-after-remove', '.window-pane-scroll')
  } else d.check('Panel: a Link value seat to right-click', false, { seats })
  await d.store((s) => s.closeWindow())
  await d.settle(300)
}
