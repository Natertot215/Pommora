// Phase 1 — Reading Foundation: the fenced `[[` opens nothing, Enter in a fenced link inserts a newline, the
// lone embed tiles while the mid-line one draws as a connection, and E-11 (no glyph inside a selected tile).
export const name = 'Phase 1 — one reader: fences, embeds, E-11'

export async function run(d) {
  await d.setSetting('pairBrackets', true)
  const ed = await d.scratchPage('Scratch', '# Scratch\n\nprose here\n\n```\ncode here\n```\n\n```\n[[Alpha|b]]\n```\n')
  await ed.caretIn('prose here')
  await d.type(' [[Al')
  d.check('prose: typing [[Al opens the picker', (await d.count('.mdpm-ac')) >= 1, { doc: await ed.doc() })
  await d.press('Escape')
  await d.waitFor(() => $$('.mdpm-ac').length === 0, { label: 'the picker closing' })
  await ed.caretIn('code here')
  await d.type(' [[Al')
  await d.settle(400)
  d.check('fence: typing [[Al inside a fence opens no picker', (await d.count('.mdpm-ac')) === 0, { doc: await ed.doc() })
  const at = await ed.caretIn('[[Alpha|b', '[[Alpha|b'.length)
  await d.press('Enter')
  const doc = await ed.doc()
  d.check('fence: Enter inside a fenced [[Alpha|b]] inserts a newline', doc.slice(at, at + 1) === '\n', { around: doc.slice(at - 9, at + 4) })

  await d.openPage('Beta')
  await d.settle(400)
  const tiles = await d.count('.mdpm-embed, [class*="embed-tile"], [class*="mdpm-tile"]')
  d.check('Beta: the lone ![[Alpha]] line draws one tile', tiles >= 1, { tiles })
  const inline = await d.eval(() => [...document.querySelectorAll('.cm-content .md-connection-resolved')].filter((e) => e.textContent === 'Alpha' && e.closest('.cm-line')?.textContent?.includes('Mid-line')).length)
  d.check('Beta: the mid-line ![[Alpha]] draws as a connection', inline >= 1, { inline })
  await d.editor().focus()
  await d.selectAll()
  await d.settle(300)
  const glyphsInTile = await d.eval(() => [...document.querySelectorAll('.mdpm-embed, [class*="embed-tile"], [class*="mdpm-tile"]')].reduce((n, t) => n + t.querySelectorAll('.md-connection-glyph').length, 0))
  d.check('E-11: a selection over the tile draws no connection glyph inside it', glyphsInTile === 0, { glyphsInTile })
  await d.shot('beta-selected')
}
