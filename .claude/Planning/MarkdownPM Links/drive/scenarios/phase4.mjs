// Phase 4 — Looks and Resolution: the hand-check as a headless pass. Every link look across the body, the
// resting table cell, and the Text value, with Display Unresolved Links As Plain Syntax and Heading Link Style varied.
export const name = 'Phase 4 — link looks across the body, resting cells, and Text values'

const BODY = '.cm-content'
const CELL = '.mdpm-tbl-cell-static'

async function looks(d, scope, label) {
  const spans = await d.spans(`${scope} [class*="md-"]`)
  const by = (cls) => spans.filter((s) => s.classes.includes(cls))
  const texts = (cls) => by(cls).map((s) => s.text)
  d.check(`${label}: resolved connections draw md-connection-resolved`, by('md-connection-resolved').some((s) => s.text.includes('Alpha')), { texts: texts('md-connection-resolved') })
  d.check(`${label}: phantom links draw md-connection-phantom`, texts('md-connection-phantom').some((t) => t.includes('Missing')), { texts: texts('md-connection-phantom') })
  d.check(`${label}: phantom syntax is md-phantom-syntax, never md-link-invalid or md-unresolved-*`, by('md-phantom-syntax').length > 0 && !spans.some((s) => s.classes.some((c) => /md-link-invalid|md-unresolved/.test(c))), {
    phantomSyntax: by('md-phantom-syntax').length,
    stray: spans.flatMap((s) => s.classes).filter((c) => /md-link-invalid|md-unresolved/.test(c)),
  })
  return spans
}

export async function run(d) {
  await d.setSetting('inPageHeadingResolution', 'automatic')
  await d.setSetting('plainUnresolvedLinks', false)
  await d.setSetting('headingLinkStyle', 'page-heading')
  await d.openPage('Beta')
  await d.settle(400)

  // -- the body -------------------------------------------------------------
  const body = await looks(d, BODY, 'body')
  const cls = (c) => body.filter((s) => s.classes.includes(c))
  d.check('body: an ambiguous title draws md-connection-ambiguous in both syntaxes', cls('md-connection-ambiguous').filter((s) => s.text.includes('Dup')).length >= 2, { texts: cls('md-connection-ambiguous').map((s) => s.text) })
  d.check('body: a weblink draws md-link', cls('md-link').length >= 1, { texts: cls('md-link').map((s) => s.text) })
  d.check('body: a resolved heading link joins with §', cls('md-heading-symbol').length >= 1, { count: cls('md-heading-symbol').length })
  d.check('body: a missing heading on a resolved page carries md-connection-heading-missing', cls('md-connection-heading-missing').length >= 1, { count: cls('md-connection-heading-missing').length })
  d.check('body: a § run draws md-section-run under Automatic', cls('md-section-run').some((s) => s.text.includes('Setup')), { texts: cls('md-section-run').map((s) => s.text) })
  d.check('body: a link nested in bold draws', await d.eval(() => [...document.querySelectorAll('.cm-content .md-bold')].some((b) => b.closest('.cm-line')?.querySelector('.md-connection-resolved'))), {})
  d.check('body: the lone ![[Alpha]] line tiles and the mid-line one draws as a connection', (await d.count('.mdpm-embed, [class*="embed-tile"], [class*="mdpm-tile"]')) >= 1 && cls('md-connection-resolved').filter((s) => s.text === 'Alpha').length >= 2, {
    tiles: await d.count('.mdpm-embed, [class*="embed-tile"], [class*="mdpm-tile"]'),
  })
  await d.shot('body-page-heading-plain-off', BODY)

  // -- heading style: heading only -----------------------------------------
  await d.setSetting('headingLinkStyle', 'heading-only')
  await d.settle(300)
  const spaced = await d.count(`${BODY} .md-heading-symbol-spaced`)
  d.check('body: Heading Only hides the page half (no spaced § symbol)', spaced === 0, { spaced })
  await d.shot('body-heading-only', BODY)
  await d.setSetting('headingLinkStyle', 'page-heading')

  // -- plain syntax on ------------------------------------------------------
  await d.setSetting('plainUnresolvedLinks', true)
  await d.settle(300)
  d.check('root carries plain-unresolved when the setting is on', await d.eval(() => document.documentElement.classList.contains('plain-unresolved')), {})
  const phantomOpacity = await d.eval(() => {
    const el = document.querySelector('.cm-content .md-connection-phantom')
    return el ? Number(getComputedStyle(el).opacity) : null
  })
  d.check('body: plain syntax restyles a phantom to full opacity', phantomOpacity === 1, { phantomOpacity })
  await d.shot('body-plain-on', BODY)

  // -- the resting table cells ---------------------------------------------
  await d.editor().caretIn('| Col A')
  await d.settle(400)
  const cells = await looks(d, CELL, 'resting cell')
  const cellCls = (c) => cells.filter((s) => s.classes.includes(c))
  d.check('resting cell: every token span names its source (data-src)', cells.filter((s) => s.classes.some((c) => c.startsWith('md-'))).every((s) => s.src !== null || s.classes.includes('md-phantom-syntax') || s.classes.includes('md-connection-phantom') || s.classes.includes('md-heading-symbol') || s.classes.includes('md-connection-heading') || s.classes.includes('md-bracket') || s.classes.includes('md-html-tag')), {
    unsourced: cells.filter((s) => s.src === null).map((s) => s.classes.join(' ')).slice(0, 6),
  })
  d.check('resting cell: a link span carries data-link', cellCls('md-connection-resolved').some((s) => s.link), {})
  d.check('resting cell: a link nested in bold draws as a link', await d.eval(() => !!document.querySelector('.mdpm-tbl-cell-static .md-bold .md-connection-resolved')), {})
  d.check('resting cell: a § run draws md-section-run with data-link', cellCls('md-section-run').some((s) => s.link), { texts: cellCls('md-section-run').map((s) => s.text) })
  d.check('resting cell: an ambiguous title draws md-connection-ambiguous', cellCls('md-connection-ambiguous').length >= 1, {})
  d.check('resting cell: a held heading link joins with §', await d.eval(() => !!document.querySelector('.mdpm-tbl-cell-static .md-heading-symbol')), {})
  d.check('resting cell: a plain-text cell renders as bare text', await d.eval(() => [...document.querySelectorAll('.mdpm-tbl-cell-static')].some((c) => c.textContent?.includes('plain text cell') && !c.querySelector('[class*="md-"]'))), {})
  const cellPhantomOpacity = await d.eval(() => {
    const el = document.querySelector('.mdpm-tbl-cell-static .md-connection-phantom')
    return el ? Number(getComputedStyle(el).opacity) : null
  })
  d.check('resting cell: plain syntax reaches the resting cell (no md-unresolved-fixed)', cellPhantomOpacity === 1 && (await d.count('.md-unresolved-fixed')) === 0, { cellPhantomOpacity })
  await d.shot('table-plain-on', '.mdpm-tbl')
  await d.setSetting('plainUnresolvedLinks', false)
  await d.settle(300)
  await d.shot('table-plain-off', '.mdpm-tbl')

  // -- the Text value in the Table view ------------------------------------
  await d.openSet('Collection A', 'Set Alpha')
  await d.settle(500)
  const value = await d.spans('.cell-text-host [class*="md-"], .cell-text-line [class*="md-"]')
  const vcls = (c) => value.filter((s) => s.classes.includes(c))
  d.check('Text value: resolved connection draws', vcls('md-connection-resolved').some((s) => s.text === 'Alpha'), { texts: vcls('md-connection-resolved').map((s) => s.text) })
  d.check('Text value: phantom draws md-connection-phantom', vcls('md-connection-phantom').some((s) => s.text === 'Missing'), {})
  d.check('Text value: a § run draws against the holder page (Automatic)', vcls('md-section-run').some((s) => s.text.includes('Setup')), { texts: vcls('md-section-run').map((s) => s.text) })
  await d.shot('table-view-text-value')
  await d.setSetting('plainUnresolvedLinks', true)
  await d.settle(300)
  const valuePhantomOpacity = await d.eval(() => {
    const el = document.querySelector('.cell-text-host .md-connection-phantom, .cell-text-line .md-connection-phantom')
    return el ? Number(getComputedStyle(el).opacity) : null
  })
  d.check('Text value: plain syntax reaches the resting value', valuePhantomOpacity === 1, { valuePhantomOpacity })
  await d.shot('table-view-text-value-plain-on')
  await d.setSetting('plainUnresolvedLinks', false)

  // -- a § run at rest follows ---------------------------------------------
  await d.openPage('Beta')
  await d.editor().caretIn('| Col A')
  await d.settle(400)
  const runRect = await d.rect(`${CELL} .md-section-run`)
  if (runRect) {
    await d.clickAt(runRect.cx, runRect.cy)
    await d.settle(400)
    const where = await d.store((s) => {
      const tab = s.tabs?.find((t) => t.id === s.activeTabId)
      return JSON.stringify(tab?.selection ?? tab?.target ?? tab ?? null).slice(0, 200)
    })
    d.check('resting cell: clicking a § run follows to the heading', /Setup|Beta/.test(where), { where })
  } else d.check('resting cell: a § run is present to click', false, {})
}
