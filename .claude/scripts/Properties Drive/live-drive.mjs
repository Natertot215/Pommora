import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  frontmatter, pageIds, pagePath,
  ask, boxOf, click, createPage, escapeAll, labels, launch, mouseClick, must, NEXUS, openCollection, pickNative,
  popNative, portalOpen, read, relaunch, restore, results, row, sel, SETTINGS_BUTTON, settles, shot, sleep, until,
} from '../drive-harness.mjs'

const PORT = 9403
// The drive's groups in order, each landed by the plan phase that adds it.
const LANDED = ['1', '2', '3', '4']
const GROUPS = new Set(process.argv.slice(2))
if (GROUPS.size === 0 || [...GROUPS].some((g) => !LANDED.includes(g))) {
  console.error(`usage: node live-drive.mjs <group…>   (groups ${LANDED.join(', ')})`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

const ledger = []
/** One assertion, owned by the group that lands it and the decision it proves, printed as MATRIX.md lists it. */
function item(group, decision, name, pass, detail) {
  const mark = pass ? 'PASS' : 'FAIL'
  console.log(`${mark.padEnd(5)}  [g${group} ${decision}] ${name}${!pass && detail ? `\n       ${detail}` : ''}`)
  results.push({ name, pass: !!pass })
  ledger.push({ group: String(group), decision, name, mark })
}
const show = (v) => JSON.stringify(v)
const same = (a, b) => show(a) === show(b)

// ── The Nexus and its surfaces ──────────────────────────────────────────────

const COLLECTION = 'Collection A'
const REGISTRY = join(NEXUS, '.nexus/properties.json')
const config = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree.config
const held = async (cdp, id) => (await config(cdp)).registry.some((d) => d.id === id)

/** Each label and glyph a surface draws, read off its rows. */
const rowsOf = (cdp, css) =>
  cdp.evaluate(`[...document.querySelectorAll(${JSON.stringify(css)})].map((e) => ({
    label: e.textContent.trim(),
    glyph: [...(e.querySelector('svg')?.classList ?? [])].find((c) => c.startsWith('lucide-'))?.slice(7) ?? null,
  }))`)
const PORTAL_ROWS = '[data-picker-portal] [role=button]'
/** Opens the view settings at one of its frames. */
async function viewFrame(cdp, frame) {
  await escapeAll(cdp)
  if (await cdp.evaluate(`(${SETTINGS_BUTTON}).getAttribute('aria-pressed') !== 'true'`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(800)
  await click(cdp, `[...document.querySelectorAll('[role=button], button')].find((b) => b.textContent.trim() === ${JSON.stringify(frame)})`)
  await sleep(800)
}
async function pickerRows(cdp, ariaLabel) {
  await click(cdp, sel(`[aria-label="${ariaLabel}"]`))
  await until(`the ${ariaLabel} picker`, () => portalOpen(cdp))
  return rowsOf(cdp, PORTAL_ROWS)
}

// ── Group 1 — What Counts as a Property ─────────────────────────────────────

// Today's Filedata columns, each with the label and glyph it shows.
const FILEDATA = [
  { id: '_title', label: 'Title', glyph: 'text-align-justify' },
  { id: '_created_at', label: 'Creation Time', glyph: 'clock-plus' },
  { id: '_modified_at', label: 'Last Modified', glyph: 'repeat' },
]
const showsFiledata = (rows) => FILEDATA.every((f) => rows.some((r) => r.label === f.label && r.glyph === f.glyph))

async function group1(cdp) {
  const view = { id: 'view_01KZPROPERTIESDRIVE00TBL', name: 'Drive Filedata', type: 'table', property_order: FILEDATA.map((f) => f.id), hidden_properties: [], hide_column_icons: false }
  await must('save the Drive Filedata view', ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  await must('show the Drive Filedata view', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: view.id }))
  await openCollection(cdp)
  await until('the table head', () => cdp.evaluate(`document.querySelectorAll('.table-head > *').length >= ${FILEDATA.length}`))
  const head = await rowsOf(cdp, '.table-head > *')
  item(1, 'F-2 F-3', 'the header shows Title, Creation Time, and Last Modified with their glyphs', showsFiledata(head), show(head))

  await viewFrame(cdp, 'Sort')
  const sortBy = await pickerRows(cdp, 'Sort By')
  item(1, 'F-2 F-3', 'Sort By offers Title, Creation Time, and Last Modified with their glyphs', showsFiledata(sortBy), show(sortBy))

  await viewFrame(cdp, 'Filter')
  const filterBy = await pickerRows(cdp, 'Filter property')
  item(1, 'F-2 F-3', 'the filter offers Title, Creation Time, and Last Modified with their glyphs', showsFiledata(filterBy), show(filterBy))
  await shot(cdp, 'g1-filter-targets')

  const stored = readFileSync(REGISTRY, 'utf8')
  const file = JSON.parse(stored)
  const witness = { id: 'prop_drive_witness', label: 'Drive Witness', key: 'Drive Witness', type: 'text' }
  const context = { id: 'prop_drive_context', label: 'Drive Context', key: 'Drive Context', type: 'context' }
  writeFileSync(REGISTRY, JSON.stringify({
    ...file,
    order: [...file.order, witness.id, context.id],
    defs: { ...file.defs, [witness.id]: witness, [context.id]: context },
  }, null, 2))
  const read = await settles(() => held(cdp, witness.id))
  item(1, 'F-1', 'a Context definition written by hand is set aside when the list is read', read && !(await held(cdp, context.id)), show({ read }))

  await viewFrame(cdp, 'Properties')
  await click(cdp, `[...document.querySelectorAll('[role=button], button')].find((b) => b.textContent.trim().startsWith('All Properties'))`)
  await sleep(800)
  const pane = await cdp.evaluate('document.body.innerText')
  item(1, 'F-1', 'the Properties pane lists the witness and never the Context definition', pane.includes(witness.label) && !pane.includes(context.label), show({ witness: pane.includes(witness.label), context: pane.includes(context.label) }))
  await shot(cdp, 'g1-properties-pane')

  await escapeAll(cdp)
  writeFileSync(REGISTRY, stored)
  await until('the registry as it was', async () => !(await held(cdp, witness.id)))
}

// ── Group 2 · Type Records and Looks ────────────────────────────────────────

const header = (label) => `[...document.querySelectorAll('.table-head .col-header')].find((h) => h.textContent.trim() === ${JSON.stringify(label)})`
/** A header's native menu, read and closed without a choice. */
async function headerMenu(cdp, label) {
  const rows = await popNative(cdp, await boxOf(cdp, header(label)), 'right')
  await pickNative([])
  return labels(rows)
}

async function group2(cdp) {
  const ids = {}
  for (const [label, type] of [['Looks Number', 'number'], ['Looks Link', 'link'], ['Looks Select', 'select']])
    ids[label] = (await must(`add ${label}`, ask(cdp, 'schema:add', 'Collection A', { id: '', label, type }))).id
  await must('Looks Number as a percent', ask(cdp, 'property:setNumberFormat', ids['Looks Number'], { number_family: 'percent' }))
  await must('Looks Select gains Alpha', ask(cdp, 'property:editOption', ids['Looks Select'], { op: 'add', groupId: 'select', label: 'Alpha' }))
  const view = {
    id: 'view_01KZPROPDRIVE00000LOOKSTABL', name: 'Looks Table', type: 'table',
    property_order: ['_title', ids['Looks Number'], ids['Looks Link'], ids['Looks Select']], hidden_properties: [],
    column_styles: { [ids['Looks Select']]: { look: 'compact' } },
  }
  await must('save the Looks Table', ask(cdp, 'views:save', 'Collection A', 'collection', view, {}))
  await must('show the Looks Table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: view.id }))
  await createPage(cdp, 'Looks One', { [ids['Looks Select']]: { kind: 'select', value: 'Alpha' } })
  await openCollection(cdp)
  // An earlier group's view settings panel covers the right-hand headers.
  if (await cdp.evaluate(`(${SETTINGS_BUTTON}).getAttribute('aria-pressed') === 'true'`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await until('the Looks Table headers', () => cdp.evaluate(`!!(${header('Looks Select')})`))

  const number = await headerMenu(cdp, 'Looks Number')
  item(2, 'I-4', "a Number column's right-click names its look Style", number.includes('Style') && !number.includes('Format'), show(number))
  const link = await headerMenu(cdp, 'Looks Link')
  item(2, 'I-4', "a Link column's right-click names its look Format", link.includes('Format') && !link.includes('Style'), show(link))
  const tagged = await settles(() => cdp.evaluate(`!!${row('Looks One')}?.querySelector('.cell-chips svg.lucide-tag')`))
  item(2, 'M-1', 'a compact Select chip keeps its tag glyph', tagged, show({ tagged }))
}

// ── Group 3 · The Value Write's One Home ────────────────────────────────────

async function group3(cdp) {
  const space = '.nexus/contexts/Areas/Area One'
  const files = [REGISTRY, join(NEXUS, 'Collection A/_pagecollection.json'), join(NEXUS, space, '_space.json')]
  const stored = files.map((f) => readFileSync(f, 'utf8'))
  const status = await must('Status', ask(cdp, 'schema:add', 'Collection A', {
    id: '', label: 'Status', type: 'select',
    select_options: [{ key: 'Option 1', label: 'Option 1' }, { key: 'Option 2', label: 'Option 2' }],
  }))
  const notes = await must('Notes', ask(cdp, 'schema:add', 'Collection A', { id: '', label: 'Notes', type: 'text' }))
  const view = { id: 'view_01KZPROPDRIVE000000VALUES', name: 'Drive Values', type: 'table', property_order: ['_title', status.id, notes.id], hidden_properties: [] }
  await must('save Drive Values', ask(cdp, 'views:save', 'Collection A', 'collection', view, {}))
  await must('show Drive Values', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: view.id }))
  await openCollection(cdp)
  for (const title of ['Tidy', 'Spaces', 'Filled']) await createPage(cdp, title)
  // Written by hand, as Obsidian or another app would leave them.
  const byHand = (title, yaml) => writeFileSync(join(NEXUS, pagePath(title)), `---\nID: ${pageIds[title]}\n${yaml}\n---\n`)
  byHand('Tidy', 'Status:\n  - Option 1\n  - Option 2')
  byHand('Spaces', 'Notes: "   "')
  byHand('Filled', 'Notes: x')

  await must('a sibling edit', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Tidy'), propertyId: notes.id, value: { kind: 'text', value: 'edited' } }))
  const tidied = await settles(async () => same(frontmatter('Tidy').Status, ['Option 2']))
  item(3, 'P-1', 'editing another property writes a several-word Select as the option it shows', tidied, show(frontmatter('Tidy')))

  await must('filter Drive Values', ask(cdp, 'views:save', 'Collection A', 'collection', view, {
    filter: { match: 'all', rules: [{ property_id: notes.id, op: 'is_empty' }] },
    filter_enabled: true,
  }))
  const empties = await settles(async () => (await cdp.evaluate(`!!${row('Spaces')} && !${row('Filled')}`)))
  item(3, 'J-1', 'a Text value of only spaces matches "is empty"', empties)

  const sidecar = files[2]
  const pick = () => must('a Space value', ask(cdp, 'mutate', { op: 'setProperty', path: space, propertyId: notes.id, value: { kind: 'text', value: 'held' } }))
  await pick()
  const before = { text: readFileSync(sidecar, 'utf8'), mtime: statSync(sidecar).mtimeMs }
  await sleep(1100)
  await pick()
  const untouched = readFileSync(sidecar, 'utf8') === before.text && statSync(sidecar).mtimeMs === before.mtime
  item(3, 'J-9', 're-picking a value a Space holds leaves its file and modified time alone', untouched)

  await escapeAll(cdp)
  for (const title of ['Tidy', 'Spaces', 'Filled']) {
    rmSync(join(NEXUS, pagePath(title)))
    delete pageIds[title]
  }
  files.forEach((f, i) => writeFileSync(f, stored[i]))
  await until('the definitions leave', async () => !(await config(cdp)).registry.some((d) => d.id === notes.id))
}

// ── Group 4 — One Home per Definition (P5) ──────────────────────────────────

const REGISTRY_REL = '.nexus/properties.json'
const SIDECAR_A = 'Collection A/_pagecollection.json'
const spacesOf = (tree) => tree.contexts.flatMap((g) => g.spaces.map((s) => s.path)).sort()
const stateTree = async () => (await must('nexus:state', ask(cdp, 'nexus:state'))).tree

// Group 4 relaunches, so it drives the run's own `cdp`, and a failure inside it leaves the run holding the live session.
async function group4() {
  // An empty registry may never have been written; the group writes `{}` and leaves no file behind it.
  const absent = !existsSync(join(NEXUS, REGISTRY_REL))
  if (absent) writeFileSync(join(NEXUS, REGISTRY_REL), '{}')
  const kept = { registry: read(REGISTRY_REL), sidecar: read(SIDECAR_A) }
  const def = { id: 'prop_drive_damage', label: 'Drive Damage', key: 'Drive Damage', type: 'checkbox' }
  const held = JSON.parse(kept.registry)
  const sidecar = JSON.parse(kept.sidecar)
  const fixed = JSON.stringify({ ...held, order: [...(held.order ?? []), def.id], defs: { ...held.defs, [def.id]: def } })
  const before = await stateTree()
  cdp = await relaunch(cdp, async () => {
    writeFileSync(join(NEXUS, SIDECAR_A), JSON.stringify({ ...sidecar, properties: [...(sidecar.properties ?? []), def.id] }))
    writeFileSync(join(NEXUS, REGISTRY_REL), '{ not json')
  })

  const opened = await ask(cdp, 'nexus:state')
  const tree = opened.value?.tree
  const entry = tree?.unreadable?.find((u) => u.path === REGISTRY_REL)
  item(4, 'O-6', 'a damaged property list opens the Nexus with no definitions and names the list unreadable',
    opened.ok && tree.config.registry.length === 0 && entry?.kind === 'registry' && entry.registry === 'properties', show({ ok: opened.ok, entry }))
  item(4, 'O-6', 'every Space still reads, so tiles keep their Space boards', same(spacesOf(tree), spacesOf(before)), show(spacesOf(tree)))
  const assigned = tree.collections.find((c) => c.path === 'Collection A')?.propertyIds ?? []
  item(4, 'R4', 'Collection A keeps the ids its sidecar assigns while the list can’t be read', assigned.includes(def.id), show(assigned))

  writeFileSync(join(NEXUS, REGISTRY_REL), fixed)
  const back = await settles(async () => {
    const t = await stateTree()
    return t.config.registry.some((d) => d.id === def.id) && !t.unreadable?.some((u) => u.path === REGISTRY_REL)
  })
  item(4, 'O-6', 'fixing the file brings the definitions back and clears the entry without a reopen', back, show((await stateTree()).unreadable))

  writeFileSync(join(NEXUS, SIDECAR_A), kept.sidecar)
  writeFileSync(join(NEXUS, REGISTRY_REL), kept.registry)
  if (absent) rmSync(join(NEXUS, REGISTRY_REL))
  const ids = (t) => t.config.registry.map((d) => d.id)
  const left = await settles(async () => same(ids(await stateTree()), ids(before)))
  item(4, '—', 'the group leaves the property list and Collection A as it found them', left && read(SIDECAR_A) === kept.sidecar, show(ids(await stateTree())))
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'properties-shots')).cdp
  if (GROUPS.has('1')) await group1(cdp)
  if (GROUPS.has('2')) await group2(cdp)
  if (GROUPS.has('3')) await group3(cdp)
  if (GROUPS.has('4')) await group4()
  cdp.close()
} catch (e) {
  item(0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
const count = (f) => ledger.filter(f).length
console.log('\ngroup  pass  fail')
for (const g of ['0', ...LANDED].filter((g) => g === '0' || GROUPS.has(g))) {
  const of = (m) => count((r) => r.group === g && r.mark === m)
  console.log(`${g.padStart(5)} ${String(of('PASS')).padStart(5)} ${String(of('FAIL')).padStart(5)}`)
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} held`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
