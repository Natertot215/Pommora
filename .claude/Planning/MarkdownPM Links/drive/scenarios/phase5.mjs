// Phase 5 — Opening and Titles: with Open Links In Pommora on, a schemeless web address opens in-app on its
// https form (P1; the mailto: half is unit-tested, see below); a Page Title pasted into a table cell that closes
// before the title lands still swaps the title in at rest (B-158).
export const name = 'Phase 5 — open routes and pending titles'

// The mailto: half of P1 isn't driven: `window.nexus` is frozen by the contextBridge, so `link:open` can't be
// intercepted in the renderer, and a real click would open Mail. `openWebLink.test.ts` pins that branch.
export async function run(d) {
  // -- P1: the open routes ----------------------------------------------------
  await d.setSetting('openLinksInApp', true)
  await d.openPage('Beta')
  await d.settle(400)
  const linkRect = (label) =>
    d.eval((label) => {
      const el = $$('.cm-content .md-link').find((e) => e.textContent === label && e.closest('.cm-line')?.textContent?.includes('Web:'))
      if (!el) return null
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
    }, label)
  const x = await linkRect('x')
  if (x) {
    await d.clickAt(x.cx, x.cy)
    await d.settle(600)
    const summon = await d.store((s) => s.browserSummon?.url ?? null)
    d.check('P1: [x](example.com) opens in-app on https://example.com', summon === 'https://example.com', { summon })
    await d.shot('in-app-browser')
    await d.store((s) => s.closeBrowser())
    await d.settle(300)
  } else d.check('P1: the [x](example.com) link is drawn to click', false, {})
  console.log('note  P1: the mailto: branch is pinned by openWebLink.test.ts, not driven (a driven click would open Mail)')
  await d.setSetting('openLinksInApp', false)

  // -- B-158: a cell that closes with a title pending ----------------------------
  // The title fetch is held in the scenario's hand, so the cell is sure to close before it answers.
  await d.eval(() => {
    const store = window.__pommora
    const real = store.getState().resolveLinkTitle
    let release
    const held = new Promise((r) => (release = r))
    window.__driveTitle = { release, real }
    store.setState({
      resolveLinkTitle: (url) =>
        held.then((t) => {
          if (t) store.setState((st) => ({ linkTitles: { ...st.linkTitles, [url]: t } }))
          return t
        }),
    })
  })
  await d.setSetting('defaultLinkFormat', 'link-title')
  await d.scratchPage('Scratch', '# Scratch\n\n| A | B |\n|---|---|\n| one | two |\n')
  await d.editor().caretIn('| one')
  await d.settle(400)
  const cell = await d.eval(() => {
    const el = $$('.mdpm-tbl-cell-static').find((e) => e.textContent === 'two')
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const r = el.getBoundingClientRect()
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
  })
  if (!cell) return d.check('B-158: the table cell "two" is drawn to activate', false, {})
  await d.clickAt(cell.cx, cell.cy)
  await d.waitFor(() => $$('.mdpm-tbl-cell-editor .cm-content').length > 0, { label: 'the live cell editor' })
  await d.selectAll()
  await d.press('Backspace')
  d.clipboard('https://example.com')
  await d.paste()
  const liveText = await d.editor('.mdpm-tbl-cell-editor .cm-content').doc()
  await d.press('Escape')
  await d.settle(300)
  const atRest = await d.eval(() => $$('.mdpm-tbl-cell-static').map((e) => e.textContent))
  d.check('B-158: the paste wrote the short form and Escape committed it at rest, title still pending', liveText === '[example.com](https://example.com)' && atRest.some((t) => t === 'example.com'), { liveText, atRest })
  await d.eval(() => window.__driveTitle.release('Example Domain'))
  let swapped = null
  try {
    swapped = await d.waitFor(() => $$('.mdpm-tbl-cell-static').map((e) => e.textContent).find((t) => t.includes('Example Domain')) ?? null, { label: 'the title landing at rest', timeout: 5000 })
  } catch {}
  const doc = await d.editor().doc()
  d.check('B-158: the resting cell shows the page title once it lands', swapped !== null && doc.includes('[Example Domain](https://example.com)'), { swapped, doc })
  await d.shot('cell-title-landed', '.mdpm-tbl')
  await d.eval(() => window.__pommora.setState({ resolveLinkTitle: window.__driveTitle.real }))
  await d.setSetting('defaultLinkFormat', 'link-full')
}
