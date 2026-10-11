// Phase 10 — The Picker: `[[` and `[label](` open the picker with Pair Brackets on and off, Enter writes the closer,
// Escape leaves the typed text; Insert ▸ Embed ▸ Internal Page writes `![[]]` whose empty `[[` browses and whose pick
// tiles; `##` → `§` and a typed `§` arm the heading list; a dismissed query stays closed until it changes; the picker
// stands down inside a raw-HTML block; the link form commits through retarget (Remove Title On Link Change on/off,
// markdown destinations included); ArrowRight on a page row opens its headings; heading rows come from the index.
export const name = 'Phase 10 — the opener rule, the query as state, commit through retarget, headings from the index'

const PANE = '.mdpm-ac'

export async function run(d) {
  await d.setSetting('inPageHeadingResolution', 'automatic')
  await d.setSetting('removeTitleOnLinkChange', true)
  await d.setSetting('aliasPickerOnCommit', false)
  await d.setSetting('htmlFormatting', false)
  const paneRows = () => d.eval((sel) => { const p = $$(sel)[0]; if (!p) return null; return [...p.querySelectorAll('[class*="menu-row_item"]')].map((e) => e.querySelector('[class*="menu-row_titleText"]')?.textContent?.trim() ?? e.textContent?.trim()).filter(Boolean) }, PANE)
  const paneOpen = () => d.eval((sel) => $$(sel).length > 0, PANE)
  const waitPane = async (open = true, timeout = 2500) => {
    try {
      await d.waitFor((sel, open) => ($$(sel).length > 0) === open, { label: open ? 'the picker opening' : 'the picker closing', timeout }, PANE, open)
      return true
    } catch {
      return false
    }
  }
  const line = async (ed, starts) => (await ed.doc()).split('\n').find((l) => l.startsWith(starts)) ?? null

  // -- 10-1: the opener rule, Pair Brackets off ---------------------------------------------
  await d.setSetting('pairBrackets', false)
  let ed = await d.scratchPage('Scratch', '# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[[Al')
  let opened = await waitPane()
  let rows = await paneRows()
  d.check('Pair Brackets off: typing [[Al opens the picker listing Alpha', opened && (rows ?? []).some((r) => r.includes('Alpha')), { rows })
  await d.press('Enter')
  await d.settle(300)
  let sel = await ed.selection()
  let l = await line(ed, 'word')
  d.check('Pair Brackets off: Enter writes [[Alpha]] with the caret after the closer', l === 'word [[Alpha]]' && sel.from === (await ed.indexOf('[[Alpha]]')) + '[[Alpha]]'.length, { line: l, sel })

  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[x](Al')
  opened = await waitPane()
  rows = await paneRows()
  d.check('Pair Brackets off: typing [x](Al opens the picker listing Alpha', opened && (rows ?? []).some((r) => r.includes('Alpha')), { rows })
  await d.press('Enter')
  await d.settle(300)
  l = await line(ed, 'word')
  d.check('Pair Brackets off: Enter writes [x](Alpha)', l === 'word [x](Alpha)', { line: l })

  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[my label](Al')
  await waitPane()
  await d.press('Enter')
  await d.settle(300)
  l = await line(ed, 'word')
  d.check('Pair Brackets off: a pick in [my label](Al keeps the label just typed', l === 'word [my label](Alpha)', { line: l })

  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[[Pro')
  await waitPane()
  await d.press('Escape')
  const closed = await waitPane(false)
  l = await line(ed, 'word')
  d.check('dismissing the picker leaves the typed text', closed && l === 'word [[Pro', { line: l })
  await d.press('ArrowLeft')
  await d.settle(200)
  d.check('a dismissed query stays closed while the caret moves inside it', !(await paneOpen()), {})
  await d.press('ArrowRight')
  await d.press('Backspace')
  await d.press('Backspace')
  await d.type('Al')
  const reopened = await waitPane()
  d.check('the query changing reopens the picker', reopened, { line: await line(ed, 'word') })
  await d.press('Escape')
  await d.settle(200)

  // Pair Brackets on: `[[` opens on the brackets and browses
  await d.setSetting('pairBrackets', true)
  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[[')
  opened = await waitPane()
  rows = await paneRows()
  l = await line(ed, 'word')
  d.check('Pair Brackets on: typing [[ pairs the brackets and the picker browses', opened && l === 'word [[]]' && (rows ?? []).length > 0, { line: l, rows: (rows ?? []).slice(0, 5) })
  await d.type('Al')
  await d.settle(200)
  await d.press('Enter')
  await d.settle(300)
  l = await line(ed, 'word')
  sel = await ed.selection()
  d.check('Pair Brackets on: a pick writes [[Alpha]] once and leaves the caret after it', l === 'word [[Alpha]]' && sel.from === (await ed.indexOf('[[Alpha]]')) + 9, { line: l, sel })

  // a label typed moments ago survives a pick, Pair Brackets on or off
  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('[my label](Al')
  await waitPane()
  await d.press('Enter')
  await d.settle(300)
  l = await line(ed, 'word')
  d.check('Pair Brackets on: a pick in [my label](Al keeps the label just typed', l === 'word [my label](Alpha)', { line: l })

  // Insert ▸ Embed ▸ Internal Page writes ![[]] whose empty [[ browses; the pick tiles on leaving the line
  await ed.setDoc('# Scratch\n\n## Setup\n\nword\n\n')
  const off = await ed.caretIn('word\n\n', 'word\n\n'.length)
  const pt = await d.pointAt(off)
  await d.armNativeMenu(null)
  await d.rightClickAt(pt.x - 14, pt.y)
  const menu = await d.waitNativeMenu()
  const pathTo = (rows, label, path = []) => {
    for (const r of rows ?? []) {
      if (r.label === label) return [...path, label]
      const deeper = r.submenu && pathTo(r.submenu, label, [...path, r.label])
      if (deeper) return deeper
    }
    return null
  }
  const embedPath = pathTo(menu, 'Internal Page')
  await d.settle(300)
  if (embedPath) {
    await ed.caretIn('word\n\n', 'word\n\n'.length)
    await d.armNativeMenu(embedPath)
    await d.rightClickAt(pt.x - 14, pt.y)
    await d.waitNativeMenu()
    opened = await waitPane()
    rows = await paneRows()
    const doc = await ed.doc()
    d.check('Insert ▸ Embed ▸ Internal Page writes ![[]] and its empty [[ opens the browse', opened && doc.includes('![[]]') && (rows ?? []).length > 0, { opened, hasEmbed: doc.includes('![[]]'), rows: (rows ?? []).slice(0, 4) })
    await d.type('Al')
    await d.settle(200)
    await d.press('Enter')
    await d.settle(300)
    await d.press('ArrowUp')
    await d.settle(600)
    const tiles = await d.count('.tile-base')
    d.check('a pick writes ![[Alpha]] and the tile forms on leaving the line', (await ed.doc()).includes('![[Alpha]]') && tiles >= 1, { tiles, doc: (await ed.doc()).split('\n').filter((x) => x.includes('[[')) })
  } else d.check('Insert ▸ Embed ▸ Internal Page is offered in the editor menu', false, { rows: (menu ?? []).map((r) => r.label) })
  await d.setSetting('pairBrackets', false)

  // -- 10-2: `##` → `§`, a typed `§`, and the raw-HTML stand-down -----------------------------
  await d.setSetting('transformSections', true)
  ed = await d.scratchPage('Scratch', '# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.type('##')
  opened = await waitPane()
  l = await line(ed, 'word')
  rows = await paneRows()
  d.check('## typed in prose converts to § and arms the heading list', opened && l?.startsWith('word §') && (rows ?? []).some((r) => r.includes('Setup')), { line: l, rows })
  await d.press('Escape')
  await d.settle(200)
  await ed.setDoc('# Scratch\n\n## Setup\n\nword \n')
  await ed.caretIn('word ')
  await d.insert('§')
  opened = await waitPane()
  d.check('a typed § alone arms the heading list', opened, { rows: await paneRows() })
  await d.press('Escape')
  await waitPane(false)
  await d.press('ArrowLeft')
  await d.press('ArrowRight')
  await d.settle(200)
  d.check('after Escape the arrow keys leave the heading list closed', !(await paneOpen()), {})

  await d.setSetting('htmlFormatting', true)
  await ed.setDoc('# Scratch\n\n<div>\nword \n</div>\n')
  await ed.caretIn('word ')
  await d.type('[[Al')
  await d.settle(600)
  d.check('inside a raw-HTML block the picker stands down', !(await paneOpen()), { line: await line(ed, 'word') })
  await d.setSetting('htmlFormatting', false)

  // -- 10-3: commit through retarget ----------------------------------------------------------
  const repick = async (body, needle, selectLen, typed) => {
    await ed.setDoc(body)
    const at = await ed.indexOf(needle)
    // as a person does: the caret lands in the link first, then the title is selected and retyped
    await ed.caret(at + 1)
    await d.settle(150)
    await ed.select(at, at + selectLen)
    await d.type(typed)
    await waitPane()
    await d.press('Enter')
    await d.settle(300)
    return line(ed, 'see')
  }
  await d.setSetting('removeTitleOnLinkChange', true)
  l = await repick('# Scratch\n\nsee [[Alpha|Mine]] here\n', 'Alpha|', 5, 'Gam')
  d.check('a pick in [[Old|Mine]] with Remove Title On Link Change on writes [[Gamma]]', l === 'see [[Gamma]] here', { line: l })
  await d.setSetting('removeTitleOnLinkChange', false)
  l = await repick('# Scratch\n\nsee [[Alpha|Mine]] here\n', 'Alpha|', 5, 'Gam')
  d.check('a pick in [[Old|Mine]] with the setting off keeps Mine', l === 'see [[Gamma|Mine]] here', { line: l })
  l = await repick('# Scratch\n\nsee [[Alpha|Mine]] here\n', 'Alpha|', 5, 'Alp')
  d.check('re-picking the same page keeps the alias', l === 'see [[Alpha|Mine]] here', { line: l })
  await d.setSetting('removeTitleOnLinkChange', true)
  l = await repick('# Scratch\n\nsee [Notes](Alpha) here\n', 'Alpha)', 5, 'Gam')
  d.check('a pick in [Notes](Old) with the setting on writes [Gamma](Gamma)', l === 'see [Gamma](Gamma) here', { line: l })
  await d.setSetting('removeTitleOnLinkChange', false)
  l = await repick('# Scratch\n\nsee [Notes](Alpha) here\n', 'Alpha)', 5, 'Gam')
  d.check('a pick in [Notes](Old) with the setting off keeps Notes', l === 'see [Notes](Gamma) here', { line: l })
  await d.setSetting('removeTitleOnLinkChange', true)

  // ArrowRight on a page row with an empty target query opens its headings
  await ed.setDoc('# Scratch\n\nsee \n')
  await ed.caretIn('see ')
  await d.type('[x](')
  opened = await waitPane()
  rows = await paneRows()
  const alphaAt = (rows ?? []).findIndex((r) => r === 'Alpha' || r.startsWith('Alpha'))
  for (let i = 0; i < Math.max(alphaAt, 0); i++) await d.press('ArrowDown')
  await d.press('ArrowRight')
  await d.settle(400)
  const headingRows = await paneRows()
  d.check('ArrowRight on a page row with an empty [x]( query opens its headings', opened && alphaAt >= 0 && (headingRows ?? []).some((r) => r.includes('Setup')) && (headingRows ?? []).some((r) => r.includes('Usage')), { rows: (rows ?? []).slice(0, 6), alphaAt, headingRows })
  await d.press('Escape')
  await d.settle(200)

  // -- 10-4: heading rows from the index -------------------------------------------------------
  await ed.setDoc('# Scratch\n\n## Fresh Heading\n\nsee \n')
  await ed.caretIn('see ')
  await d.type('[[Alpha#')
  opened = await waitPane()
  rows = await paneRows()
  d.check("[[Alpha# lists Alpha's headings from the index (Setup, Notes, Usage)", opened && ['Setup', 'Notes', 'Usage'].every((h) => (rows ?? []).some((r) => r.includes(h))), { rows })
  await d.press('Escape')
  await d.settle(200)
  await ed.setDoc('# Scratch\n\n## Fresh Heading\n\nsee \n')
  await ed.caretIn('see ')
  await d.type('[[#')
  opened = await waitPane()
  rows = await paneRows()
  d.check('[[# on a page lists its own live headings, the one typed moments ago included', opened && (rows ?? []).some((r) => r.includes('Fresh Heading')), { rows })
  await d.press('Escape')
  await d.settle(200)

  await d.openPage('Beta')
  await d.settle(400)
  await d.editor().caretIn('| Col A')
  await d.waitFor(() => $$('.mdpm-tbl-cell-static').some((e) => e.textContent === 'plain text cell'), { label: 'the Beta table', timeout: 8000 })
  await d.settle(400)
  const cell = await d.eval(() => { const el = $$('.mdpm-tbl-cell-static').find((e) => e.textContent === 'plain text cell'); if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
  if (cell) {
    await d.clickAt(cell.x, cell.y)
    try {
      await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the live cell editor', timeout: 2500 })
    } catch {
      await d.clickAt(cell.x, cell.y)
      await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the live cell editor', timeout: 3000 })
    }
    await d.press('End')
    await d.type(' [[#')
    opened = await waitPane()
    rows = await paneRows()
    d.check("[[# in a table cell lists the holding page's headings", opened && (rows ?? []).some((r) => r.includes('Setup')), { rows })
    await d.press('Escape')
    await d.settle(200)
    await d.press('Escape')
    await d.settle(200)
  } else d.check('a Beta table cell to enter', false, {})
  await d.editor().undo()
  await d.settle(200)
}
