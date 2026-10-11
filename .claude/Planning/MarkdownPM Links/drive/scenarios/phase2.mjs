// Phase 2 — Values, Writers, and the Clipboard Reader: the name rule refuses a title the wikilink grammar
// can't carry, through the real host `mutate`.
export const name = 'Phase 2 — the name rule and the host readers'

export async function run(d) {
  const scratch = await d.page('Scratch')
  const refused = await d.store((s, p, name) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: name }).then((r) => r), scratch, 'Draft]')
  const stillScratch = (await d.pages()).some((p) => p.title === 'Scratch')
  d.check('renaming a page to Draft] is refused (the page keeps its name)', stillScratch, { refused })
  const also = await d.store((s, p, name) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: name }), scratch, 'A]]B')
  d.check('renaming a page to A]]B is refused', (await d.pages()).some((p) => p.title === 'Scratch'), { also })
  await d.store((s, p) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: 'A]B' }), scratch)
  await d.settle(400)
  const renamed = (await d.pages()).some((p) => p.title === 'A]B')
  d.check('renaming a page to A]B is allowed (a lone ] is expressible)', renamed, {})
  if (renamed) {
    const p = await d.page('A]B')
    await d.store((s, p) => s.mutate({ op: 'rename', kind: 'page', path: p.path, newName: 'Scratch' }), p)
    await d.settle(400)
  }
}
