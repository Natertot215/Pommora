// Phase 3 — Seams: connections ride the host (body, cell, Text pane draw and open Alpha), a rename redraws
// every link, the index reseeded to generation 12, and the open routes follow the settings.
export const name = 'Phase 3 — connections on the host, one open route'

export async function run(d) {
  await d.openPage('Beta')
  await d.settle(400)
  d.check('body draws [[Alpha]] resolved', (await d.spans('.cm-content .md-connection-resolved')).some((s) => s.text === 'Alpha'), {})
  await d.editor().caretIn('| Col A')
  await d.settle(400)
  d.check('resting cell draws [[Alpha]] resolved', (await d.spans('.mdpm-tbl-cell-static .md-connection-resolved')).some((s) => s.text === 'Alpha'), {})

  // a rename made through the host redraws the open page's links
  const gamma = await d.page('Gamma')
  await d.scratchPage('Scratch', '# Scratch\n\nsee [[Gamma]] here\n')
  await d.settle(3000)
  d.check('Scratch draws [[Gamma]] resolved before the rename', (await d.spans('.cm-content .md-connection-resolved')).some((s) => s.text === 'Gamma'), {})
  await d.store((s, p) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: 'Gamma Two' }), gamma)
  await d.waitFor(() => $$('.cm-content')[0]?.textContent?.includes('Gamma Two'), { label: 'the rename reaching the open page', timeout: 8000 })
  d.check('a rename through the host rewrote and redrew the link', (await d.spans('.cm-content .md-connection-resolved')).some((s) => s.text === 'Gamma Two'), { doc: await d.editor().doc() })
  const back = await d.page('Gamma Two')
  await d.store((s, p) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: 'Gamma' }), back)
  await d.settle(500)

  // open routes
  await d.setSetting('connectionsOpenInPreview', false)
  await d.setSetting('tabOpenBehavior', 'overtake')
  await d.openPage('Beta')
  const tabsBefore = await d.store((s) => s.tabs.length)
  await d.click('.cm-content .md-connection-resolved')
  await d.settle(500)
  const active = await d.store((s) => s.tabs.find((t) => t.id === s.activeTabId)?.selection?.path ?? s.tabs.find((t) => t.id === s.activeTabId)?.target?.path ?? null)
  d.check('a plain click opens Alpha in the same tab under Overtake', /Alpha/.test(String(active)) && (await d.store((s) => s.tabs.length)) === tabsBefore, { active, tabsBefore })
  await d.openPage('Beta')
  await d.click('.cm-content .md-connection-resolved', { mods: { meta: true } })
  await d.settle(500)
  d.check('a ⌘-click opens Alpha in a new tab', (await d.store((s) => s.tabs.length)) === tabsBefore + 1, { tabs: await d.store((s) => s.tabs.length) })
  await d.store((s) => s.closeTab?.(s.activeTabId))

  await d.setSetting('connectionsOpenInPreview', true)
  await d.openPage('Beta')
  await d.click('.cm-content .md-connection-resolved')
  await d.settle(900)
  const shownInWindow = await d.store((s) => {
    const win = s.windowSlot
    const active = win?.tabs?.find((t) => t.id === win.activeTabId)
    return JSON.stringify(active?.target ?? null)
  })
  d.check('with Open Connections In Preview on, a click opens Alpha in the Page Window', /Alpha/.test(shownInWindow), { shownInWindow })
  await d.setSetting('connectionsOpenInPreview', false)
}
