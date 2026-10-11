// Phase 8 — Link Values: a page value draws through the shared resting stack (tones, `Page § Heading`, the glance)
// and follows where connections follow (B-52: Open Connections In Preview, Tab Open Behavior); an address keeps the
// property's look in each Format; clicking the text follows and clicking the padding edits; the commit reads the
// index at the gesture (`[[#Setup]]`, `[[Dup]]` refused, `example.com` normalized) and writes through `retarget`;
// the fallback menu for a value with no target keeps Edit · Rename (· Clear · Remove). The hand-check screenshots
// (a Table, a Card, the Panel) land under shots/phase8/.
export const name = 'Phase 8 — Link values through the shared stack, clicks, the commit, the fallback menu'

const labels = (rows) => (rows ?? []).filter((r) => r.type !== 'separator').map((r) => r.label)
const has = (rows, ...want) => rows !== null && want.every((w) => labels(rows).includes(w))
const lacks = (rows, ...bad) => bad.every((w) => !labels(rows).includes(w))

// A drawn link or address is a seat: a resolved, phantom, or ambiguous span inside TextCell (a phantom carries no
// data-link by design), or the URL half's anchor. The `§` join's spaces are CSS, so a heading link reads `Alpha§Setup`.
const SEAT = '.cell-text-host [class^="md-connection-"], .cell-text-host .md-link, .cell-link'
// The data row whose title reads `title` (tagged so a right-click can be scoped to it), and the seats in each of its cells.
const rowLinks = (d, title) =>
  d.eval((title, SEAT) => {
    const row = $$('.data-row:not(.ghost-row)').find((r) => r.querySelector('.cell-title-text')?.textContent === title)
    if (!row) return null
    row.setAttribute('data-drive-row', title)
    return [...row.querySelectorAll('.data-cell')].flatMap((cell, col) =>
      [...cell.querySelectorAll(SEAT)].map((link) => {
        const r = link.getBoundingClientRect()
        const c = cell.getBoundingClientRect()
        return { col, text: link.textContent, classes: [...link.classList], x: r.x + r.width / 2, y: r.y + r.height / 2, padX: c.right - 6, padY: c.y + c.height / 2, hasHost: !!cell.querySelector('.cell-text-host') }
      }),
    )
  }, title, SEAT)
const seatOf = async (d, title, text) => ((await rowLinks(d, title)) ?? []).find((s) => s.text === text) ?? null

export async function run(d) {
  await d.setSetting('headingLinkStyle', 'page-heading')
  await d.setSetting('plainUnresolvedLinks', false)
  await d.setSetting('connectionsOpenInPreview', false)
  await d.setSetting('tabOpenBehavior', 'overtake')
  await d.setSetting('removeTitleOnLinkChange', true)
  // Page Title fetches are held so the title column is deterministic (as Phase 5's F-043 check does).
  await d.eval(() => {
    const store = window.__pommora
    const real = store.getState().resolveLinkTitle
    const held = {}
    window.__driveTitle = {
      real,
      // The real action writes the cache itself once the fetch answers; the held one does the same on release.
      release: (title) => {
        for (const [url, resolve] of Object.entries(held)) {
          store.setState((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
          resolve(title)
        }
      },
      hold: (url) => new Promise((resolve) => { held[url] = resolve }),
    }
    store.setState({ resolveLinkTitle: (url) => window.__driveTitle.hold(url), linkTitles: {} })
  })

  // -- 8-1: the Table ---------------------------------------------------------------------
  await d.openSet('Collection A', 'Set Alpha')
  await d.waitFor(() => $$('.data-row:not(.ghost-row)').length > 5, { label: 'the Table rows', timeout: 8000 })
  await d.settle(500)
  d.check('no value renders through the old ConnectionCell', (await d.count('.cell-connection')) === 0, {})

  const betaLink = await seatOf(d, 'Beta', 'Alpha§Setup')
  d.check('Table: [[Alpha#Setup]] draws through the resting stack as Alpha § Setup in the resolved tone', betaLink?.classes.includes('md-connection-resolved') && betaLink.hasHost, { beta: await rowLinks(d, 'Beta') })

  const phantom = ((await rowLinks(d, 'Phantom')) ?? [])[0]
  d.check('Table: [[Missing]] wears the phantom tone', phantom?.classes.includes('md-connection-phantom') && phantom.text === 'Missing', { phantom })
  const ambiguous = ((await rowLinks(d, 'Ambiguous')) ?? [])[0]
  d.check('Table: [[Dup]] wears the ambiguous tone', ambiguous?.classes.includes('md-connection-ambiguous') && ambiguous.text === 'Dup', { ambiguous })
  const written = ((await rowLinks(d, 'Written')) ?? [])[0]
  d.check('Table: a hand-written [x](Alpha) resolves and shows its label', written?.classes.includes('md-connection-resolved') && written.text === 'x', { written })

  const links = (await rowLinks(d, 'Links')) ?? []
  const alias = links.find((s) => s.classes.includes('md-connection-resolved'))
  const addresses = links.filter((s) => s.classes.includes('cell-link')).map((s) => s.text)
  d.check('Table: [[Alpha|Mine]] shows its alias', alias?.text === 'Mine', { alias })
  d.check('Table: an address keeps the property look in each Format (Full Link, Short Link, Page Title pending shows the short form)', addresses.join('|') === 'https://example.com|example.com|example.com', { addresses })
  await d.eval(() => window.__driveTitle.release('Example Domain'))
  let titled = null
  try {
    titled = await d.waitFor(() => $$('.data-row .cell-link').map((e) => e.textContent).find((t) => t === 'Example Domain') ?? null, { label: 'the Page Title landing in the value', timeout: 4000 })
  } catch {}
  d.check('Table: the Page Title Format shows the title once it lands', titled === 'Example Domain', { titled })

  const invalid = ((await rowLinks(d, 'Invalid')) ?? [])[0]
  d.check('Table: an invalid value (TBD) keeps the URL half', invalid?.classes.includes('cell-link') && invalid.text === 'TBD', { invalid })

  // truncation: the alias overflows the column and the host marks it on hover
  const long = ((await rowLinks(d, 'Long')) ?? [])[0]
  if (long) {
    await d.mouse('mouseMoved', long.x, long.y)
    await d.settle(200)
    const overflow = await d.eval(() => {
      const host = $$('.data-row .cell-text-host').find((h) => h.textContent?.includes('An alias long enough'))
      const line = host?.querySelector('.cell-text')
      return host && line ? { marked: host.hasAttribute('data-overflowing'), overflows: line.scrollWidth > line.clientWidth, ellipsis: getComputedStyle(line).textOverflow } : null
    })
    d.check('Table: a long value through TextCell overflows its cell and clips with an ellipsis (P8 truncation)', overflow?.overflows === true && overflow.ellipsis === 'ellipsis', { overflow })
    await d.mouse('mouseMoved', 5, 5)
    await d.settle(200)
  } else d.check('Table: the Long row', false, {})
  await d.shot('table-link-values', '.table-view')

  // the glance arms on a page value's text
  if (betaLink) {
    await d.mouse('mouseMoved', betaLink.x, betaLink.y)
    let glanced = false
    try {
      glanced = !!(await d.waitFor(() => $$('[data-glance], .glance-body').length > 0, { label: 'the glance', timeout: 3500 }))
    } catch {}
    d.check("Table: hovering a page value's text arms the glance", glanced, {})
    await d.mouse('mouseMoved', 5, 5)
    await d.press('Escape')
    await d.settle(400)
  }

  // B-52: the follow honors Open Connections In Preview and Tab Open Behavior
  await d.setSetting('connectionsOpenInPreview', true)
  await d.settle(300)
  const previewSeat = await seatOf(d, 'Beta', 'Alpha§Setup')
  await d.clickAt(previewSeat.x, previewSeat.y)
  let preview = false
  try {
    preview = !!(await d.waitFor(() => $$('.window-actions-flow').length > 0, { label: 'the Page Window', timeout: 4000 }))
  } catch {}
  d.check('B-52: with Open Connections In Preview on, clicking a page value opens the Page Window', preview, {})
  await d.store((s) => s.closeWindow())
  await d.settle(300)
  await d.setSetting('connectionsOpenInPreview', false)
  await d.setSetting('tabOpenBehavior', 'newtab')
  const tabsBefore = await d.store((s) => s.tabs.length)
  const beta2 = await seatOf(d, 'Beta', 'Alpha§Setup')
  await d.clickAt(beta2.x, beta2.y)
  await d.settle(600)
  const after = await d.store((s) => ({ tabs: s.tabs.length, active: s.tabs.find((t) => t.id === s.activeTabId)?.target?.path ?? null }))
  d.check('B-52: with Tab Open Behavior = new tab, a plain click opens Alpha in a new tab', after.tabs === tabsBefore + 1 && /Alpha\.md$/.test(after.active ?? ''), { tabsBefore, after })
  await d.setSetting('tabOpenBehavior', 'overtake')

  // -- 8-2: clicks ---------------------------------------------------------------------------
  await d.openSet('Collection A', 'Set Alpha')
  await d.waitFor(() => $$('.data-row:not(.ghost-row)').length > 5, { label: 'the Table rows', timeout: 8000 })
  await d.settle(400)
  const pad = await seatOf(d, 'Beta', 'Alpha§Setup')
  await d.clickAt(pad.padX, pad.padY)
  let editing = false
  try {
    editing = !!(await d.waitFor(() => $$('.data-cell input').length > 0, { label: 'the inline editor', timeout: 2000 }))
  } catch {}
  d.check("8-2: clicking a page value's padding opens the editor", editing, {})
  await d.press('Escape')
  await d.settle(300)

  const tbd = ((await rowLinks(d, 'Invalid')) ?? [])[0]
  await d.clickAt(tbd.x, tbd.y)
  editing = false
  try {
    editing = !!(await d.waitFor(() => $$('.data-cell input').length > 0, { label: 'the inline editor', timeout: 2000 }))
  } catch {}
  d.check("8-2: clicking an invalid value's text edits it", editing, {})
  await d.press('Escape')
  await d.settle(300)

  await d.settle(300)
  const follow = await seatOf(d, 'Beta', 'Alpha§Setup')
  await d.clickAt(follow.x, follow.y)
  let went = null
  try {
    went = await d.waitFor(() => { const s = window.__pommora.getState(); const p = s.tabs.find((t) => t.id === s.activeTabId)?.target?.path ?? ''; return /Alpha\.md$/.test(p) ? p : null }, { label: 'the follow', timeout: 3000 })
  } catch {}
  d.check("8-2: clicking a page value's text follows (overtaking the tab)", went !== null, { went, follow })

  // -- 8-3: the commit -----------------------------------------------------------------------
  await d.openSet('Collection A', 'Set Alpha')
  await d.waitFor(() => $$('.data-row:not(.ghost-row)').length > 5, { label: 'the Table rows', timeout: 8000 })
  await d.settle(400)
  const edit = async (title, text) => {
    const seat = ((await rowLinks(d, title)) ?? [])[0]
    if (!seat) throw new Error(`no value seat on ${title}`)
    await d.clickAt(seat.padX, seat.padY)
    await d.waitFor(() => $$('.data-cell input').length > 0, { label: 'the inline editor', timeout: 2000 })
    await d.selectAll()
    // `#` and `.` need a shifted or unmapped key; the field is a plain input, so one insert stands for the typing.
    await d.insert(text)
    await d.settle(150)
    return d.eval(() => ({ typed: $$('.data-cell input')[0]?.value, invalid: $$('.data-cell input')[0]?.getAttribute('aria-invalid') }))
  }
  const rowSeat = (title, sel) => d.eval((title, sel) => { const r = $$('.data-row:not(.ghost-row)').find((r) => r.querySelector('.cell-title-text')?.textContent === title); const l = r?.querySelector(sel); return l ? { text: l.textContent, classes: [...l.classList] } : null }, title, sel)
  const typedHeld = await edit('Commit', '[[#Setup]]')
  await d.press('Enter')
  let held = null
  try {
    held = await d.waitFor(() => { const r = $$('.data-row:not(.ghost-row)').find((r) => r.querySelector('.cell-title-text')?.textContent === 'Commit'); const l = r?.querySelector('.cell-text-host [class^="md-connection-"]'); return l && l.textContent !== 'Alpha' ? { text: l.textContent, classes: [...l.classList] } : null }, { label: 'the held value', timeout: 3000 })
  } catch {}
  d.check('8-3: typing [[#Setup]] on a page with a Setup heading commits and draws it resolved against the holder', held?.classes.includes('md-connection-resolved') && /Setup$/.test(held.text ?? ''), { held, typedHeld })

  const typedDup = await edit('Commit', '[[Dup]]')
  d.check('8-3: typing [[Dup]] with two Dup pages marks the field invalid', typedDup.typed === '[[Dup]]' && typedDup.invalid === 'true', { typedDup })
  await d.press('Escape')
  await d.settle(300)

  const typedAddr = await edit('Commit', 'example.com')
  await d.press('Enter')
  let address = null
  try {
    address = await d.waitFor(() => { const r = $$('.data-row:not(.ghost-row)').find((r) => r.querySelector('.cell-title-text')?.textContent === 'Commit'); return r?.querySelector('.cell-link')?.textContent ?? null }, { label: 'the address value', timeout: 3000 })
  } catch {}
  d.check('8-3: typing example.com commits the normalized https://example.com', address === 'https://example.com', { address, typedAddr })

  await d.setSetting('removeTitleOnLinkChange', false)
  await edit('Links', '[[Gamma]]')
  await d.press('Enter')
  await d.settle(600)
  const kept = await rowSeat('Links', '.cell-text-host [class^="md-connection-"]')
  const glanceGamma = await seatOf(d, 'Links', 'Mine')
  let gammaArmed = null
  if (glanceGamma) {
    await d.mouse('mouseMoved', glanceGamma.x, glanceGamma.y)
    try { gammaArmed = await d.waitFor(() => $$('[data-glance] , .glance-body').length > 0 ? document.title : null, { label: 'the glance on the retargeted value', timeout: 3000 }) } catch {}
    await d.mouse('mouseMoved', 5, 5)
    await d.press('Escape')
    await d.settle(300)
  }
  d.check('8-3: Edit Title to [[Gamma]] over [[Alpha|Mine]] with Remove Title On Link Change off keeps the alias (retarget)', kept?.text === 'Mine' && kept.classes.includes('md-connection-resolved'), { kept, gammaArmed })
  await d.setSetting('removeTitleOnLinkChange', true)

  // -- 8-4: the fallback menu --------------------------------------------------------------
  const ph = ((await rowLinks(d, 'Phantom')) ?? [])[0]
  let m = await d.nativeMenuOn('.md-connection-phantom', 'Missing', null, '[data-drive-row="Phantom"]')
  d.check('8-4 Table: a value naming a missing page offers Edit · Rename · Clear and no Remove', has(m, 'Edit', 'Rename', 'Clear') && lacks(m, 'Remove', 'Edit Title', 'Edit Link'), { rows: labels(m), ph })

  // -- the Card parent (Set Beta opens as a Cards view) --------------------------------------
  await d.openSet('Collection A', 'Set Beta')
  await d.waitFor(() => $$('.card-value').length > 0, { label: 'the Cards view', timeout: 8000 })
  await d.settle(500)
  const card = await d.eval(() => {
    const seats = $$('.card-value .cell-text-host [class^="md-connection-"], .card-value .cell-link')
    return seats.map((e) => ({ text: e.textContent, classes: [...e.classList], host: !!e.closest('.cell-text-host') }))
  })
  d.check('Card: a page value draws through the resting stack (Alpha § Setup resolved) beside an address in Short Link', card.some((s) => s.text === 'Alpha§Setup' && s.classes.includes('md-connection-resolved') && s.host) && card.some((s) => s.text === 'example.com' && s.classes.includes('cell-link')), { card })
  await d.shot('cards-link-values')
  m = await d.nativeMenuOn('.card-value .md-connection-phantom', 'Missing', null)
  d.check('8-4 Card: a value naming a missing page offers Edit · Rename · Clear · Remove', has(m, 'Edit', 'Rename', 'Clear', 'Remove'), { rows: labels(m) })

  // -- the Panel (the page's side pane) ------------------------------------------------------
  const page = await d.page('Links')
  await d.store((s, p) => s.openWindowTab({ kind: 'page', id: p.id, path: p.path }), page)
  await d.waitFor(() => $$('.window-actions-flow button[title="Side Pane"]').length > 0, { label: 'the Page Window', timeout: 6000 })
  await d.settle(500)
  await d.eval(() => $$('.window-actions-flow button[title="Side Pane"]')[0].click())
  await d.waitFor(() => $$('.window-pane-scroll .value-seat').length > 0, { label: 'the side pane', timeout: 6000 })
  await d.settle(400)
  const panel = await d.eval(() => $$('.window-pane-scroll .cell-text-host [class^="md-connection-"], .window-pane-scroll .cell-link').map((e) => ({ text: e.textContent, classes: [...e.classList] })))
  d.check('Panel: the page value draws through the resting stack and the addresses keep their Formats', panel.some((s) => s.text === 'Mine' && s.classes.includes('md-connection-resolved')) && panel.filter((s) => s.classes.includes('cell-link')).length === 3, { panel })
  await d.shot('panel-link-values', '.window-pane-scroll')
  await d.store((s) => s.closeWindow())
  await d.waitFor(() => $$('.window-actions-flow').length === 0, { label: 'the Page Window closing', timeout: 4000 })
  await d.settle(400)

  const ph2 = await d.page('Phantom')
  await d.store((s, p) => s.openWindowTab({ kind: 'page', id: p.id, path: p.path }), ph2)
  await d.waitFor(() => $$('.window-actions-flow button[title="Side Pane"]').length > 0, { label: 'the Page Window', timeout: 6000 })
  await d.settle(500)
  await d.eval(() => $$('.window-actions-flow button[title="Side Pane"]')[0].click())
  await d.waitFor(() => $$('.window-pane-scroll .md-connection-phantom').length > 0, { label: 'the phantom value in the pane', timeout: 6000 })
  await d.settle(300)
  m = await d.nativeMenuOn('.window-pane-scroll .md-connection-phantom', 'Missing', null)
  d.check('8-4 Panel: a value naming a missing page offers Edit · Rename · Clear · Remove', has(m, 'Edit', 'Rename', 'Clear', 'Remove'), { rows: labels(m) })
  await d.store((s) => s.closeWindow())
  await d.settle(300)

  await d.eval(() => window.__pommora.setState({ resolveLinkTitle: window.__driveTitle.real }))
}
