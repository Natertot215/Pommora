// Phase 7 — Paste: one pipeline for ⌘V, ⌘⇧V, Paste As, and Paste Without Formatting; a paste inside a link
// retargets it (⌘V keeps the container's syntax, Edit Link then ⌘V follows Remove Title On Link Change);
// a rectangle paste over table cells formats the top-left cell; a dropped address lands formatted.
export const name = 'Phase 7 — one paste pipeline, paste inside a link, the rectangle and the drop'

const URL = 'https://example.com'
const SHORT = `[example.com](${URL})`

export async function run(d) {
  await d.setSetting('defaultLinkFormat', 'link-short')
  await d.setSetting('removeTitleOnLinkChange', true)
  await d.setSetting('pairBrackets', true)
  const ed = await d.scratchPage('Scratch', '# Scratch\n\nword here\n')
  const line = async (starts) => (await ed.doc()).split('\n').find((l) => l.startsWith(starts)) ?? null

  // -- 7-1: ⌘V, ⌘⇧V, Paste As ▸ Plain Text, Paste Without Formatting ---------------------
  await ed.caretIn('word here')
  d.clipboard(URL)
  await d.paste()
  d.check('⌘V of an address at a caret writes the Default Link Format (Short Link)', (await line('word here')) === `word here${SHORT}`, { line: await line('word here') })

  await ed.setDoc('# Scratch\n\nword here\n')
  let at = await ed.indexOf('word')
  await ed.select(at, at + 4)
  await d.paste()
  d.check('⌘V over a selected word wraps it as the label', (await line('[word]')) === `[word](${URL}) here`, { doc: await ed.doc() })

  await ed.setDoc('# Scratch\n\nword here\n')
  await ed.caretIn('word here')
  await d.press('v', { meta: true, shift: true })
  await d.settle(500)
  d.check('⌘⇧V at a caret flips to the address as text', (await line('word here')) === `word here${URL}`, { line: await line('word here') })

  await ed.setDoc('# Scratch\n\nword here\n')
  at = await ed.indexOf('word')
  await ed.select(at, at + 4)
  await d.press('v', { meta: true, shift: true })
  await d.settle(500)
  d.check('⌘⇧V over a selected word flips to the Default Link Format in its place', (await line('[example.com]')) === `${SHORT} here`, { doc: await ed.doc() })

  await ed.setDoc('# Scratch\n\nword here\n')
  const off = await ed.caretIn('word here')
  const pt = await d.pointAt(off)
  // a right-click exactly on the caret lands on the caret bar, which isn't editable, so main pops nothing there
  await d.armNativeMenu(['Paste As', 'Plain Text'])
  await d.rightClickAt(pt.x - 14, pt.y)
  const pasteAsRows = (await d.waitNativeMenu())?.find((r) => r.label === 'Paste As')?.submenu?.map((r) => r.label)
  try { await d.waitFor(() => $$('.cm-content')[0]?.textContent?.includes('word herehttps'), { label: 'the Paste As write', timeout: 3000 }) } catch {}
  d.check('Paste As ▸ Plain Text writes the address as text', (await line('word here')) === `word here${URL}`, { line: await line('word here'), pasteAsRows })

  await ed.setDoc('# Scratch\n\nword here\n')
  const off2 = await ed.caretIn('word here')
  const pt2 = await d.pointAt(off2)
  await d.armNativeMenu('Paste Without Formatting')
  await d.rightClickAt(pt2.x - 14, pt2.y)
  await d.waitNativeMenu()
  try { await d.waitFor(() => $$('.cm-content')[0]?.textContent?.includes('word herehttps'), { label: 'the literal write', timeout: 3000 }) } catch {}
  d.check('Paste Without Formatting writes the clipboard as is', (await line('word here')) === `word here${URL}`, { line: await line('word here') })

  // -- 7-2: a paste inside a link retargets it ---------------------------------------------
  await ed.setDoc('# Scratch\n\nsee [[Alpha]] here\n')
  await ed.caretIn('[[Al')
  d.clipboard('[[Beta]]')
  await d.paste()
  d.check('⌘V of [[Beta]] inside [[Alpha]] retargets the connection', (await line('see')) === 'see [[Beta]] here', { line: await line('see') })

  await ed.setDoc('# Scratch\n\nsee [[Alpha|mine]] here\n')
  await ed.caretIn('[[Al')
  d.clipboard('[x](Beta)')
  await d.paste()
  d.check('⌘V of [x](Beta) inside [[Alpha|mine]] keeps the container syntax and takes the pasted alias', (await line('see')) === 'see [[Beta|x]] here', { line: await line('see') })

  await ed.setDoc('# Scratch\n\nsee [[Alpha]] here\n')
  await ed.caretIn('[[Al')
  d.clipboard('3.14')
  await d.paste()
  d.check('a schemeless 3.14 inside a link pastes as text', (await line('see')) === 'see [[Al3.14pha]] here', { line: await line('see') })

  await ed.setDoc('# Scratch\n\nsee [Docs](https://old.example) here\n')
  await d.nativeMenuOn('.cm-content .md-link', 'Docs', 'Edit Link')
  await d.settle(300)
  d.clipboard('https://new.example')
  await d.paste()
  d.check('Edit Link then ⌘V with Remove Title On Link Change on writes the Default Link Format', (await line('see')) === 'see [new.example](https://new.example) here', { line: await line('see') })

  await d.setSetting('removeTitleOnLinkChange', false)
  await ed.setDoc('# Scratch\n\nsee [Docs](https://old.example) here\n')
  await d.nativeMenuOn('.cm-content .md-link', 'Docs', 'Edit Link')
  await d.settle(300)
  await d.paste()
  d.check('Edit Link then ⌘V with the setting off keeps the label', (await line('see')) === 'see [Docs](https://new.example) here', { line: await line('see') })
  await d.setSetting('removeTitleOnLinkChange', true)

  // -- 7-3: the rectangle paste and the drop ---------------------------------------------
  await ed.setDoc('# Scratch\n\n| A | B |\n|---|---|\n| one | two |\n| three | four |\n')
  await ed.caretIn('| A')
  await d.settle(500)
  const cellRect = (text) =>
    d.eval((text) => {
      const el = $$('.mdpm-tbl-cell-static').find((e) => e.textContent === text)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }, text)
  const one = await cellRect('one')
  const four = await cellRect('four')
  await d.drag(one, four)
  await d.settle(400)
  const selected = await d.count('.mdpm-tbl-selected')
  d.clipboard(URL)
  await d.paste()
  await d.settle(800)
  const tableLine = await line('| [example.com]')
  d.check('a rectangle ⌘V over two cells formats the top-left cell', selected >= 2 && tableLine === `| ${SHORT} | two |`, { selected, rows: (await ed.doc()).split('\n').filter((l) => l.startsWith('|')) })
  await d.press('Escape')

  await ed.setDoc('# Scratch\n\ndrop here\n')
  const dropOff = await ed.indexOf('here')
  const dropPt = await d.pointAt(dropOff)
  await d.eval((x, y, url) => {
    const dt = new DataTransfer()
    dt.setData('text/uri-list', url)
    dt.setData('text/plain', url)
    const target = document.elementFromPoint(x, y)
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt }))
  }, dropPt.x, dropPt.y, URL)
  await d.settle(500)
  d.check('a dropped address (text/uri-list) lands as the Default Link Format at the drop point', (await line('drop')) === `drop ${SHORT}here`, { line: await line('drop') })

  await d.setSetting('defaultLinkFormat', 'link-full')
}
