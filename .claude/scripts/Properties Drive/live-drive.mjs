import { chmodSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import {
  mintOptionId, optionId,
  frontmatter, frontRaw, pageFile, pageIds, pagePath,
  ask, boxOf, chooseNative, click, closeSettings, createPage, DIALOG, escapeAll, field, labels, launch, META, mouseAt, mouseClick, must, NEXUS, notice,
  openCollection, openSettings, pickNative, popNative, portalOpen, pressDialog, pressKey, read, relaunch, restore, results, row, sel, selectField, SET,
  holds, SETTINGS_BUTTON, settles, shot, sleep, textEl, trashRowEl, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9403
// The drive's groups in order, each landed by the plan phase that adds it.
const LANDED = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
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
    ids[label] = (await must(`add ${label}`, ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { id: '', label, type } }))).created.propertyId
  await must('Looks Number as a percent', ask(cdp, 'mutate', { op: 'configureProperty', propertyId: ids['Looks Number'], patch: { number_family: 'percent' } }))
  await must('Looks Select gains Alpha', ask(cdp, 'mutate', { op: 'editOption', propertyId: ids['Looks Select'], edit: { op: 'add', groupId: 'select', id: mintOptionId(), label: 'Alpha' } }))
  const view = {
    id: 'view_01KZPROPDRIVE00000LOOKSTABL', name: 'Looks Table', type: 'table',
    property_order: ['_title', ids['Looks Number'], ids['Looks Link'], ids['Looks Select']], hidden_properties: [],
    column_styles: { [ids['Looks Select']]: { look: 'compact' } },
  }
  await must('save the Looks Table', ask(cdp, 'views:save', 'Collection A', 'collection', view, {}))
  await must('show the Looks Table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: view.id }))
  await createPage(cdp, 'Looks One', { [ids['Looks Select']]: { kind: 'select', value: optionId(defNamed('Looks Select'), 'Alpha') } })
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
  const status = await must('Status', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: {
    id: '', label: 'Status', type: 'select',
    select_options: [{ key: 'Option 1', label: 'Option 1' }, { key: 'Option 2', label: 'Option 2' }],
  } }))
  const notes = await must('Notes', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { id: '', label: 'Notes', type: 'text' } }))
  const view = { id: 'view_01KZPROPDRIVE000000VALUES', name: 'Drive Values', type: 'table', property_order: ['_title', status.created.propertyId, notes.created.propertyId], hidden_properties: [] }
  await must('save Drive Values', ask(cdp, 'views:save', 'Collection A', 'collection', view, {}))
  await must('show Drive Values', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: view.id }))
  await openCollection(cdp)
  for (const title of ['Tidy', 'Spaces', 'Filled']) await createPage(cdp, title)
  // Written by hand, as Obsidian or another app would leave them.
  const byHand = (title, yaml) => writeFileSync(join(NEXUS, pagePath(title)), `---\nID: ${pageIds[title]}\n${yaml}\n---\n`)
  byHand('Tidy', 'Status:\n  - Option 1\n  - Option 2')
  byHand('Spaces', 'Notes: "   "')
  byHand('Filled', 'Notes: x')

  await must('a sibling edit', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Tidy'), propertyId: notes.created.propertyId, value: { kind: 'text', value: 'edited' } }))
  const tidied = await settles(async () => same(frontmatter('Tidy').Status, ['Option 2']))
  item(3, 'P-1', 'editing another property writes a several-word Select as the option it shows', tidied, show(frontmatter('Tidy')))

  await must('filter Drive Values', ask(cdp, 'views:save', 'Collection A', 'collection', view, {
    filter: { match: 'all', rules: [{ property_id: notes.created.propertyId, op: 'is_empty' }] },
    filter_enabled: true,
  }))
  const empties = await settles(async () => (await cdp.evaluate(`!!${row('Spaces')} && !${row('Filled')}`)))
  item(3, 'J-1', 'a Text value of only spaces matches "is empty"', empties)

  const sidecar = files[2]
  const pick = () => must('a Space value', ask(cdp, 'mutate', { op: 'setProperty', path: space, propertyId: notes.created.propertyId, value: { kind: 'text', value: 'held' } }))
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
  await until('the definitions leave', async () => !(await config(cdp)).registry.some((d) => d.id === notes.created.propertyId))
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

// ── Group 5 · Undo From the File ────────────────────────────────────────────

const UNDO_VIEW = { id: 'view_01KZPROPDRIVE0000UNDOTABLE', name: 'Drive Undo Table' }
const META_DIR = '.nexus/metadata'
const aliasesOf = (title) =>
  readdirSync(join(NEXUS, META_DIR)).filter((n) => n.endsWith('.json'))
    .map((n) => JSON.parse(read(`${META_DIR}/${n}`)).pages?.[pageIds[title]]).find(Boolean)?.aliases ?? []
const holdsLine = (title, key) => frontRaw(title).split('\n').some((l) => l.startsWith(`${key}:`))

async function group5(cdp) {
  const pick = await must('Drive Undo Pick', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { id: '', label: 'Drive Undo Pick', type: 'select' } }))
  const link = await must('Drive Undo Link', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { id: '', label: 'Drive Undo Link', type: 'link' } }))
  for (const label of ['Doing', 'Done']) await must(`Drive Undo Pick ${label}`, ask(cdp, 'mutate', { op: 'editOption', propertyId: pick.created.propertyId, edit: { op: 'add', groupId: 'select', id: mintOptionId(), label } }))
  await must('the undo table', ask(cdp, 'views:save', 'Collection A', 'collection', { ...UNDO_VIEW, type: 'table', property_order: ['_title', pick.created.propertyId, link.created.propertyId], hidden_properties: [] }, {}))
  for (const title of ['Drive Undo Page', 'Drive Undo Target']) await createPage(cdp, title)
  await must('Drive Undo Target keeps an alias', ask(cdp, 'mutate', { op: 'editAliases', path: pagePath('Drive Undo Target'), edit: { op: 'add', alias: 'kept' } }))
  const text = pageFile('Drive Undo Page')
  writeFileSync(join(NEXUS, pagePath('Drive Undo Page')), text.replace(/^---\n/, '---\nDrive Undo Pick:\n'))
  await sleep(1200)
  await openCollection(cdp)
  await must('show the undo table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: UNDO_VIEW.id }))
  await until('the undo table', () => cdp.evaluate(`!!${row('Drive Undo Page')}`))
  const cell = (n) => `${row('Drive Undo Page')}.querySelectorAll('.data-cell')[${n}]`

  await escapeAll(cdp)
  await mouseClick(cdp, cell(1))
  await until('the value picker', () => portalOpen(cdp))
  await mouseAt(cdp, await boxOf(cdp, `[...document.querySelectorAll('[data-picker-portal] [data-line-row]')].find((e) => e.textContent.trim() === 'Doing')`))
  await escapeAll(cdp)
  const picked = await settles(async () => JSON.stringify(frontmatter('Drive Undo Page')['Drive Undo Pick']) === '["Doing"]')
  await pressKey(cdp, 'z', META)
  const lifted = await settles(async () => !holdsLine('Drive Undo Page', 'Drive Undo Pick'))
  item(5, 'E-2 P-5', 'a pick on a bare key, undone, leaves no line', picked && lifted, `the frontmatter still holds a Drive Undo Pick line: ${show(frontRaw('Drive Undo Page'))}`)

  const box = await boxOf(cdp, cell(2))
  await mouseAt(cdp, { x: box.left + 4, y: box.y })
  await until('the Link field', () => cdp.evaluate(`!!(${field})`))
  await selectField(cdp)
  await typeText(cdp, '[[Drive Undo Target|launch]]')
  await sleep(300)
  await escapeAll(cdp)
  await pressKey(cdp, 'Enter')
  const added = await settles(async () => aliasesOf('Drive Undo Target').includes('launch'))
  await escapeAll(cdp)
  await pressKey(cdp, 'z', META)
  const gone = await settles(async () => JSON.stringify(aliasesOf('Drive Undo Target')) === '["kept"]' && !Object.hasOwn(frontmatter('Drive Undo Page'), 'Drive Undo Link'))
  item(5, 'E-3', 'undoing a Link value takes back the alias it added and keeps the one the page had', added && gone, JSON.stringify(aliasesOf('Drive Undo Target')))
}

// ── Group 6 — One Door for Property Changes (P7) ────────────────────────────

const registryFile = () => JSON.parse(readFileSync(REGISTRY, 'utf8'))
const defNamed = (label) => Object.values(registryFile().defs).find((d) => d.label === label)
const trashRows = async (cdp) => (await must('bundles:list', ask(cdp, 'bundles:list', { kind: 'trash' }))) ?? []
const dialogText = (cdp) => cdp.evaluate(`${DIALOG}?.innerText ?? ''`)
const addProperty = async (cdp, draft) =>
  (await must(`add ${draft.label}`, ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft }))).created.propertyId
const deleteProperty = (cdp, id) => must(`delete ${id}`, ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: id }))
async function openPropertyEditor(cdp, label) {
  await viewFrame(cdp, 'Properties')
  await click(cdp, `${textEl('span', label)}.closest('[role=button],button,[data-line-row]')`)
  await sleep(1000)
}
const optionRow = (label) => `[...document.querySelectorAll('[data-line-row]')].find((r) => r.textContent.trim() === ${JSON.stringify(label)} && r.querySelector('[aria-label="Edit Option"]'))`

async function group6(cdp) {
  const kept = new Set((await trashRows(cdp)).map((r) => r.bundlePath))
  const start = {
    assigned: JSON.parse(read('Collection A/_pagecollection.json')).properties ?? [],
    order: registryFile().order,
    trash: kept.size,
  }
  const made = []
  await openCollection(cdp)

  const choice = await addProperty(cdp, {
    label: 'Drive Choice',
    type: 'select',
    select_options: [{ key: 'Alpha', label: 'Alpha' }, { key: 'Beta', label: 'Beta' }],
  })
  made.push(choice)
  await openPropertyEditor(cdp, 'Drive Choice')
  const alpha = await chooseNative(cdp, optionRow('Alpha'), 'Delete')
  const asked = await dialogText(cdp)
  const hasDelete = await cdp.evaluate(`[...${DIALOG}?.querySelectorAll('button') ?? []].some((b) => b.textContent.trim() === 'Delete')`)
  await pressDialog(cdp, 'Delete')
  const left = await settles(async () => same(defNamed('Drive Choice')?.select_options?.map((o) => o.label), ['Beta']))
  item(6, 'O-1', "an option's menu reads Delete, and a delete nothing holds asks without a strip clause",
    alpha.rows.includes('Delete') && !alpha.rows.includes('Remove') && asked.includes('Delete “Alpha”?') &&
      asked.includes('The option is deleted from the property.') && !asked.includes('stripped') && hasDelete && left,
    show({ rows: alpha.rows, asked, options: defNamed('Drive Choice')?.select_options }))

  await createPage(cdp, 'Drive Held', { [choice]: { kind: 'select', value: optionId(defNamed('Drive Choice'), 'Beta') } })
  await sleep(1000)
  await chooseNative(cdp, optionRow('Beta'), 'Delete')
  const counted = await dialogText(cdp)
  await pressDialog(cdp, 'Delete')
  const stripped = await settles(async () => !Object.hasOwn(frontmatter('Drive Held'), 'Drive Choice'))
  item(6, 'O-1', 'an option a page holds asks with its count',
    counted.includes('The option is deleted from the property and its value stripped from 1 Item.') && stripped,
    show({ counted, held: frontmatter('Drive Held') }))
  await escapeAll(cdp)

  made.push(await addProperty(cdp, { label: 'Drive Bare', type: 'text' }))
  await openPropertyEditor(cdp, 'Drive Bare')
  await chooseNative(cdp, sel('[aria-label="Property Menu"]'), 'Delete', { button: 'left' })
  const bare = await dialogText(cdp)
  await pressDialog(cdp, 'Delete')
  await sleep(1000)
  const listed = await cdp.evaluate(`!document.querySelector('[aria-label="Property Menu"]')`)
  const said = await notice(cdp)
  const trashed = (await trashRows(cdp)).filter((r) => r.kind === 'property' && r.title === 'Drive Bare')
  item(6, 'O-2', 'deleting a property nothing holds asks without "0 Items"',
    bare.includes('Delete “Drive Bare” everywhere?') &&
      bare.includes('It is removed from every collection; a restorable record lands in the nexus’s .trash folder.') &&
      listed && said.startsWith('Deleted “Drive Bare”') && trashed.length === 1,
    show({ bare, listed, said, trashed }))
  await escapeAll(cdp)

  const taken = await addProperty(cdp, { label: 'New Text', type: 'text' })
  await viewFrame(cdp, 'Properties')
  await click(cdp, sel('[aria-label="New Property"]'))
  await sleep(800)
  await click(cdp, `[...document.querySelectorAll('[role="button"]')].find((el) => el.textContent.trim() === 'Text')`)
  await sleep(1200)
  const created = await notice(cdp)
  const numbered = defNamed('New Text (2)')
  const opened = await cdp.evaluate(`[...document.querySelectorAll('[aria-label="Edit icon"]')].some((e) => e.parentElement?.textContent === 'New Text (2)')`)
  item(6, 'O-4', "the pane's + says the numbered name it took",
    created === 'Created “New Text (2)”.' && !!numbered && opened, show({ created, opened, numbered }))
  await escapeAll(cdp)
  for (const id of [taken, numbered?.id].filter(Boolean)) await deleteProperty(cdp, id)

  made.push(await addProperty(cdp, { label: 'Drive Bare', type: 'text' }))
  await openSettings(cdp, 'Trash')
  await until('the Drive Bare row', () => cdp.evaluate(`!!(${trashRowEl('Drive Bare')})`))
  await chooseNative(cdp, trashRowEl('Drive Bare'), 'Restore')
  await sleep(1200)
  const restored = await notice(cdp)
  const labelsNow = Object.values(registryFile().defs).map((d) => d.label)
  item(6, 'O-4', 'a property restored after its name was taken says the name it took',
    restored.includes('Restored “Drive Bare” as “Drive Bare (2)”') && labelsNow.includes('Drive Bare') && labelsNow.includes('Drive Bare (2)'),
    show({ restored, labelsNow }))
  await closeSettings(cdp)

  for (const id of new Set([...made, defNamed('Drive Bare (2)')?.id])) if (id && registryFile().defs[id]) await deleteProperty(cdp, id)
  await must('delete Drive Held', ask(cdp, 'mutate', { op: 'delete', path: `${SET}/Drive Held.md`, kind: 'page' }))
  const permanent = (await config(cdp)).personalization.permanentDelete === true
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const r of (await trashRows(cdp)).filter((r) => !kept.has(r.bundlePath)))
    await must(`empty ${r.title}`, ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: r.bundlePath }))
  await must('permanentDelete as it was', ask(cdp, 'personalization:set', 'permanentDelete', permanent))
  const end = {
    assigned: JSON.parse(read('Collection A/_pagecollection.json')).properties ?? [],
    order: registryFile().order,
    trash: (await trashRows(cdp)).length,
  }
  item(6, '—', 'the group leaves Collection A, the registry, and the Trash as it found them', same(end, start), show({ start, end }))
}

// ── Group 7 — Option identity ─────────────────────────────────────────────

const registryOnDisk = () => JSON.parse(read('.nexus/properties.json')).defs
const optionsOf = (id) => registryOnDisk()[id]?.select_options ?? []
const viewOnDisk = (id) => JSON.parse(read('Collection A/_pagecollection.json')).views.find((v) => v.id === id)
/** The roles a saved view names options in, as its sidecar holds them. */
const optionRoles = (v) => ({ sort: v.sort, group: v.group, filter: v.filter, collapsed: v.collapsed_groups })

async function group7(cdp) {
  const G = 7
  const added = await must('P8 Stage', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: { id: '', label: 'P8 Stage', type: 'select' } }))
  const propertyId = added.created.propertyId
  const seedId = optionsOf(propertyId)[0]?.id
  const doneId = mintOptionId()
  await must('the Done option', ask(cdp, 'mutate', { op: 'editOption', propertyId, edit: { op: 'add', groupId: 'select', id: doneId, label: 'Done' } }))
  item(G, 'D-1', 'a created Select seeds its option under a minted id, and an added option lands under the id the window sent',
    /^opt_[0-9A-HJKMNP-TV-Z]{26}$/.test(seedId ?? '') && optionsOf(propertyId).some((o) => o.id === doneId && o.label === 'Done'), JSON.stringify(optionsOf(propertyId)))
  for (const [name, value] of [['P8 One', doneId], ['P8 Two', seedId]])
    await createPage(cdp, name, { [propertyId]: { kind: 'select', value } })
  const VIEW = `view_${ulid()}`
  await must('the P8 Stages view', ask(cdp, 'views:save', 'Collection A', 'collection', {
    id: VIEW, name: 'P8 Stages', type: 'table', property_order: ['_title', propertyId], hidden_properties: [],
    sort: [{ property_id: propertyId, direction: 'ascending', order: [doneId, seedId] }],
    group: { kind: 'property', property_id: propertyId, order_mode: 'manual', order: [doneId, seedId] },
    collapsed_groups: [`${propertyId}/${doneId}`],
    filter: { match: 'all', rules: [{ property_id: propertyId, op: 'is', values: [doneId, seedId] }] },
  }, {}))
  const before = JSON.stringify(optionRoles(viewOnDisk(VIEW)))
  item(G, 'D-1', 'the view sidecar names options by opt_ id, its collapse scoped to the property',
    before.includes(doneId) && !/"(Done|Option 1)"/.test(before) && viewOnDisk(VIEW).collapsed_groups[0] === `${propertyId}/${doneId}`, before)

  await must('rename Done', ask(cdp, 'mutate', { op: 'renameOption', propertyId, optionId: doneId, label: 'Finished' }))
  item(G, 'D-1', 'an option rename rewrites the pages holding its word',
    await settles(async () => [frontmatter('P8 One')['P8 Stage']].flat().includes('Finished')), JSON.stringify(frontmatter('P8 One')))
  item(G, 'D-1', 'the renamed option keeps its id', optionsOf(propertyId).some((o) => o.id === doneId && o.label === 'Finished'), JSON.stringify(optionsOf(propertyId)))
  item(G, 'D-1', "the view's sort order, group order, collapse, and filter are untouched by the rename",
    await holds(async () => JSON.stringify(optionRoles(viewOnDisk(VIEW))) === before, 2000), JSON.stringify(optionRoles(viewOnDisk(VIEW))))

  await must('show P8 Stages', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEW }))
  await openCollection(cdp)
  const bands = await until('the P8 Stages bands', () => cdp.evaluate(`(() => {
    const rows = [...document.querySelectorAll('.group-band-row')]
    return rows.length >= 2 ? rows.map((r) => ({ text: r.textContent.trim(), collapsed: r.hasAttribute('data-collapsed') })) : null
  })()`))
  item(G, 'D-2', 'the table shows the new label in the band the view keeps collapsed, in its saved order',
    bands[0].text.includes('Finished') && bands[0].collapsed && bands[1].text.includes('Option 1') && !bands[1].collapsed, JSON.stringify(bands))
  await escapeAll(cdp)
}

// ── Group 8 · One Finder ─────────────────────────────────────────────────────

/** A Context rename finds the Spaces inside the Context it moves from the tree, at the folder they went to. */
async function group8(cdp) {
  const [title, renamed] = ['Drive Finder', 'Drive Found']
  const sidecar = (context, space) => `.nexus/contexts/${context}/${space}/_space.json`
  const read = (rel) => JSON.parse(readFileSync(join(NEXUS, rel), 'utf8'))
  const contextId = ulid()
  const [alpha, beta] = [ulid(), ulid()]
  await must('create the Context', ask(cdp, 'mutate', { op: 'createContextGroup', id: contextId, name: title }))
  for (const [id, name] of [[alpha, 'Alpha'], [beta, 'Beta']])
    await must(`create ${name}`, ask(cdp, 'mutate', { op: 'createSpace', id, contextId, name }))
  await until('both sidecars', async () => existsSync(join(NEXUS, sidecar(title, 'Beta'))))
  await must(
    'link Alpha to Beta',
    ask(cdp, 'mutate', { op: 'setContext', path: `.nexus/contexts/${title}/Alpha`, contextId, spaceIds: [beta] }),
  )
  await must('rename the Context', ask(cdp, 'mutate', { op: 'renameContext', contextId, newName: renamed }))
  const [key, old] = [`<${renamed}>`, `<${title}>`]
  const rekeyed = await settles(async () => {
    const [a, b] = [read(sidecar(renamed, 'Alpha')), read(sidecar(renamed, 'Beta'))]
    return same(a[key], ['Beta']) && same(b[key], ['Alpha']) && !(old in a) && !(old in b)
  })
  item(8, 'G-1', 'both sidecars inside the renamed Context carry its new key', rekeyed,
    show([read(sidecar(renamed, 'Alpha')), read(sidecar(renamed, 'Beta'))]))
  const linked = await settles(async () => {
    const { tree } = (await ask(cdp, 'nexus:state')).value
    const space = tree.contexts.find((g) => g.def.id === contextId)?.spaces.find((s) => s.id === alpha)
    return same(space?.contextValues?.[contextId], [beta])
  })
  item(8, 'G-1', 'the Matrix keeps Alpha linked to Beta', linked)
  await must('trash the Context', ask(cdp, 'mutate', { op: 'delete', path: `.nexus/contexts/${renamed}`, kind: 'context' }))
}

// ── Group 9 · One Note per Item ──────────────────────────────────────────────

const NOTICE = `document.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')`
/** The notice on screen: its line and its action's label. */
const noticeOf = (cdp) =>
  cdp.evaluate(`(() => {
    const n = ${NOTICE}
    if (!n) return null
    const actions = [...n.querySelectorAll('button')].map((b) => b.textContent.trim())
    return { message: actions.reduce((t, a) => t.replace(a, ''), n.textContent).trim(), action: actions[0] ?? null }
  })()`)
/** Renames a property from its editor's title field, as a person does, so the slice's own reply handling runs; a rewrite it asks about is confirmed. */
async function renameInPane(cdp, id, label) {
  await openPropertyEditor(cdp, registryFile().defs[id].label)
  await click(cdp, `[...document.querySelectorAll('[role=button][aria-label="Title"]')].find((e) => !e.closest('[inert]'))`)
  await until('the title field', () => cdp.evaluate(`document.activeElement?.tagName === 'INPUT'`))
  await selectField(cdp)
  await typeText(cdp, label)
  await pressKey(cdp, 'Enter')
  if (await settles(() => cdp.evaluate(`!!${DIALOG}`), 2000)) await pressDialog(cdp, 'Rewrite')
  await sleep(1500)
  await escapeAll(cdp)
}

async function group9(cdp) {
  const owedFile = () => {
    const file = join(NEXUS, '.nexus/.owed.json')
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  }
  await openCollection(cdp)
  const first = await addProperty(cdp, { label: 'Drive Priority', type: 'text' })
  const second = await addProperty(cdp, { label: 'Drive Stage', type: 'text' })
  const third = await addProperty(cdp, { label: 'Drive Spare', type: 'text' })
  const text = (value) => ({ kind: 'text', value })
  await createPage(cdp, 'Drive Held', { [first]: text('kept'), [second]: text('kept'), [third]: text('spare') })
  await createPage(cdp, 'Drive Locked', { [first]: text('locked'), [second]: text('locked') })
  const locked = join(NEXUS, pagePath('Drive Locked'))
  chmodSync(locked, 0o000)
  try {
    await renameInPane(cdp, first, 'Drive Urgency')
    const owedNotice = await until('the owed notice', () => noticeOf(cdp))
    item(9, 'B-4', 'a rename that missed a page offers Try Again', owedNotice.message === 'Couldn’t update 1 Item.' && owedNotice.action === 'Try Again', show(owedNotice))
    item(9, 'B-1', 'its entry keeps the old key', same(owedFile()[first]?.rename, ['Drive Priority']), show(owedFile()))
    await renameInPane(cdp, second, 'Drive Phase')
    item(9, 'B-1', 'a second property renames past the first’s owed work', frontmatter('Drive Held')['Drive Phase'] === 'kept', show(frontmatter('Drive Held')))
    await renameInPane(cdp, third, 'Drive Priority')
    const refused = await until('the owed refusal', async () => {
      const n = await noticeOf(cdp)
      return n?.message === 'An earlier change hasn’t reached every file yet.' && n
    }).catch(async () => noticeOf(cdp))
    item(9, 'B-4', 'a rename onto a name still owed after the finish is refused with Try Again', refused?.action === 'Try Again' && frontmatter('Drive Held')['Drive Spare'] === 'spare', show(refused))
  } finally {
    chmodSync(locked, 0o644)
  }
  await renameInPane(cdp, third, 'Drive Priority')
  const finished = await settles(async () => frontmatter('Drive Locked')['Drive Urgency'] === 'locked' && frontmatter('Drive Locked')['Drive Phase'] === 'locked')
  item(9, 'H-17', 'the rename’s one finish finished both renames', finished && !('Drive Priority' in frontmatter('Drive Locked')) && !('Drive Stage' in frontmatter('Drive Locked')), show(frontmatter('Drive Locked')))
  item(9, 'H-17', 'the notes file owes nothing', same(owedFile(), {}), show(owedFile()))
  item(9, 'B-4', 'the rename onto the owed name landed once the work was done', frontmatter('Drive Held')['Drive Priority'] === 'spare', show(frontmatter('Drive Held')))
  const kept = new Set((await trashRows(cdp)).map((r) => r.bundlePath))
  for (const id of [first, second, third]) await deleteProperty(cdp, id)
  for (const title of ['Drive Held', 'Drive Locked'])
    await must(`delete ${title}`, ask(cdp, 'mutate', { op: 'delete', path: pagePath(title), kind: 'page' }))
  for (const { bundlePath } of await trashRows(cdp))
    if (!kept.has(bundlePath)) await must('empty a bundle', ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath }))
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'properties-shots')).cdp
  if (GROUPS.has('1')) await group1(cdp)
  if (GROUPS.has('2')) await group2(cdp)
  if (GROUPS.has('3')) await group3(cdp)
  if (GROUPS.has('4')) await group4()
  if (GROUPS.has('5')) await group5(cdp)
  if (GROUPS.has('6')) await group6(cdp)
  if (GROUPS.has('7')) await group7(cdp)
  if (GROUPS.has('8')) await group8(cdp)
  if (GROUPS.has('9')) await group9(cdp)
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
