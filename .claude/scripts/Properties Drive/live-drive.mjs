import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import {
  mintOptionId, optionId,
  FM, frontmatter, frontRaw, pageFile, pageIds, pagePath,
  activeTab, ask, BACK, boxOf, chooseNative, closePageWindow, closePanel, click, closeSettings, createPage, DIALOG, doubleClick, entry, escapeAll, field, inMain, labels, launch, META, mouseAt, mouseClick, must, NEXUS, notice,
  openCollection, openPage, openPane, openPanel, openSettings, openSidePane, overlaps, pickNative, popNative, portalOpen, pressDialog, pressKey, read, relaunch, restore, ribbon, row, sel, selectField, SET,
  holds, hover, item, LIVE_ROWS, PANE, PANE_LAYER, PORTAL_ROWS, press, SETTINGS_BUTTON, SHIFT, settles, shot, sleep, slideTo, statusDividers, sweep, SWITCH, tally, textEl, trashRowEl, typeText, until, viewFrame, watch, zoom,
} from '../drive-harness.mjs'
import { parse } from 'yaml'

const PORT = 9403
// The drive's groups in order, each landed by the plan phase that adds it.
const LANDED = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '18', '19']
const GROUPS = new Set(process.argv.slice(2))
if (GROUPS.size === 0 || [...GROUPS].some((g) => !LANDED.includes(g))) {
  console.error(`usage: node live-drive.mjs <group…>   (groups ${LANDED.join(', ')})`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

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
  await showView(cdp, view)
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
  if (await cdp.evaluate(`(${SETTINGS_BUTTON}).getAttribute('aria-pressed') === 'true'`)) await mouseClick(cdp, SETTINGS_BUTTON)
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
    ids[label] = (await must(`add ${label}`, ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label, type } }))).created.propertyId
  await must('Looks Number as a percent', ask(cdp, 'mutate', { op: 'configureProperty', propertyId: ids['Looks Number'], patch: { number_family: 'percent' } }))
  await must('Looks Select gains Alpha', ask(cdp, 'mutate', { op: 'editOption', propertyId: ids['Looks Select'], edit: { op: 'add', groupId: 'select', id: mintOptionId(), label: 'Alpha' } }))
  const view = {
    id: 'view_01KZPROPDRIVE00000LOOKSTABL', name: 'Looks Table', type: 'table',
    property_order: ['_title', ids['Looks Number'], ids['Looks Link'], ids['Looks Select']], hidden_properties: [],
    column_styles: { [ids['Looks Select']]: { look: 'compact' } },
  }
  await must('save the Looks Table', ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  await must('show the Looks Table', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: view.id }))
  await createPage(cdp, 'Looks One', { [ids['Looks Select']]: { kind: 'select', value: optionId(defNamed('Looks Select'), 'Alpha') } })
  await openCollection(cdp)
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
  const status = await must('Status', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: {
    label: 'Status', type: 'select',
    select_options: [{ key: 'Option 1', label: 'Option 1' }, { key: 'Option 2', label: 'Option 2' }],
  } }))
  const notes = await must('Notes', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Notes', type: 'text' } }))
  const view = { id: 'view_01KZPROPDRIVE000000VALUES', name: 'Drive Values', type: 'table', property_order: ['_title', status.created.propertyId, notes.created.propertyId], hidden_properties: [] }
  await must('save Drive Values', ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  await showView(cdp, view)
  for (const title of ['Tidy', 'Spaces', 'Filled']) await createPage(cdp, title)
  // Written by hand, as Obsidian or another app would leave them.
  const byHand = (title, yaml) => writeFileSync(join(NEXUS, pagePath(title)), `---\nID: ${pageIds[title]}\n${yaml}\n---\n`)
  byHand('Tidy', 'Status:\n  - Option 1\n  - Option 2')
  byHand('Spaces', 'Notes: "   "')
  byHand('Filled', 'Notes: x')

  await must('a sibling edit', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Tidy'), propertyId: notes.created.propertyId, value: { kind: 'text', value: 'edited' } }))
  const tidied = await settles(async () => same(frontmatter('Tidy').Status, ['Option 2']))
  item(3, 'P-1', 'editing another property writes a several-word Select as the option it shows', tidied, show(frontmatter('Tidy')))

  await must('filter Drive Values', ask(cdp, 'views:save', COLLECTION, 'collection', view, {
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
    opened.ok && tree.config.registry.length === 0 && entry?.kind === 'registry', show({ ok: opened.ok, entry }))
  item(4, 'O-6', 'every Space still reads, so tiles keep their Space boards', same(spacesOf(tree), spacesOf(before)), show(spacesOf(tree)))
  const assigned = tree.collections.find((c) => c.path === COLLECTION)?.propertyIds ?? []
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
  const pick = await must('Drive Undo Pick', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Undo Pick', type: 'select' } }))
  const link = await must('Drive Undo Link', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Undo Link', type: 'link' } }))
  for (const label of ['Doing', 'Done']) await must(`Drive Undo Pick ${label}`, ask(cdp, 'mutate', { op: 'editOption', propertyId: pick.created.propertyId, edit: { op: 'add', groupId: 'select', id: mintOptionId(), label } }))
  await must('the undo table', ask(cdp, 'views:save', COLLECTION, 'collection', { ...UNDO_VIEW, type: 'table', property_order: ['_title', pick.created.propertyId, link.created.propertyId], hidden_properties: [] }, {}))
  for (const title of ['Drive Undo Page', 'Drive Undo Target']) await createPage(cdp, title)
  await must('Drive Undo Target keeps an alias', ask(cdp, 'mutate', { op: 'editAliases', path: pagePath('Drive Undo Target'), edit: { op: 'add', alias: 'kept' } }))
  const text = pageFile('Drive Undo Page')
  writeFileSync(join(NEXUS, pagePath('Drive Undo Page')), text.replace(/^---\n/, '---\nDrive Undo Pick:\n'))
  await sleep(1200)
  await openCollection(cdp)
  await must('show the undo table', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: UNDO_VIEW.id }))
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
  const opened = await cdp.evaluate(`[...document.querySelectorAll('[aria-label="Edit Icon"]')].some((e) => e.parentElement?.textContent === 'New Text (2)')`)
  item(6, 'O-4', "the pane's + says the numbered name it took",
    created === 'Created “New Text (2)”' && !!numbered && opened, show({ created, opened, numbered }))
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
  const added = await must('P8 Stage', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'P8 Stage', type: 'select' } }))
  const propertyId = added.created.propertyId
  const seedId = optionsOf(propertyId)[0]?.id
  const doneId = mintOptionId()
  await must('the Done option', ask(cdp, 'mutate', { op: 'editOption', propertyId, edit: { op: 'add', groupId: 'select', id: doneId, label: 'Done' } }))
  item(G, 'D-1', 'a created Select seeds its option under a minted id, and an added option lands under the id the window sent',
    /^opt_[0-9A-HJKMNP-TV-Z]{26}$/.test(seedId ?? '') && optionsOf(propertyId).some((o) => o.id === doneId && o.label === 'Done'), JSON.stringify(optionsOf(propertyId)))
  for (const [name, value] of [['P8 One', doneId], ['P8 Two', seedId]])
    await createPage(cdp, name, { [propertyId]: { kind: 'select', value } })
  const VIEW = `view_${ulid()}`
  await must('the P8 Stages view', ask(cdp, 'views:save', COLLECTION, 'collection', {
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

  await must('show P8 Stages', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: VIEW }))
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

// ── Group 10 — the stash and the Trash records (P12) ─────────────────────────

const DAY_MS = 86_400_000
const collectionSidecar = (rel) => JSON.parse(read(`${rel}/_pagecollection.json`))
const stashIn = (rel, propertyId) => collectionSidecar(rel).property_stash?.[propertyId]
/** A trashed copy's front matter, by its Nexus path; `frontmatter` reads a live page by title. */
const frontAt = (rel) => parse(FM.exec(read(rel))?.[1] ?? '') ?? {}
const writeRel = (rel, value) => writeFileSync(join(NEXUS, rel), JSON.stringify(value, null, 2))

// Group 10 relaunches, so it drives the run's own `cdp`.
async function group10() {
  const op = (what, req) => must(what, ask(cdp, 'mutate', req))
  const before = {
    a: collectionSidecar(COLLECTION),
    b: collectionSidecar('Collection B'),
    settings: read('.nexus/settings.json'),
    trash: (await trashRows(cdp)).length,
    permanentDelete: (await ask(cdp, 'nexus:state')).value.tree.config.personalization.permanentDelete === true,
  }

  const propertyId = await addProperty(cdp, { label: 'Drive Kept', type: 'text' })
  for (const title of ['Drive Stays', 'Drive Trashed']) {
    await createPage(cdp, title)
    await op(`set ${title}`, { op: 'setProperty', path: pagePath(title), propertyId, value: { kind: 'text', value: `${title} value` } })
  }
  const removedFrom = Date.now()
  await op('remove Drive Kept', { op: 'unassignProperty', containerPath: COLLECTION, propertyId })
  const block = stashIn(COLLECTION, propertyId)
  item(10, 'C-3', 'a Remove stashes the values beside the time it set them aside',
    same(block?.values, { [pageIds['Drive Stays']]: 'Drive Stays value', [pageIds['Drive Trashed']]: 'Drive Trashed value' }) &&
      Date.parse(block?.removed_at) >= removedFrom - 1000 && Date.parse(block?.removed_at) <= Date.now(),
    show(block))

  const trashed = (await op('trash Drive Trashed', { op: 'delete', path: pagePath('Drive Trashed'), kind: 'page' })).undo.bundlePath
  await op('re-add Drive Kept', { op: 'assignProperty', containerPath: COLLECTION, propertyId })
  item(10, 'C-2', 're-adding refills the page still in the Collection and the trashed page’s Trash copy, and spends the stash',
    frontmatter('Drive Stays')['Drive Kept'] === 'Drive Stays value' &&
      frontAt(`${trashed}/Drive Trashed.md`)['Drive Kept'] === 'Drive Trashed value' &&
      stashIn(COLLECTION, propertyId) === undefined,
    show({ stays: frontmatter('Drive Stays'), copy: frontAt(`${trashed}/Drive Trashed.md`), stash: stashIn(COLLECTION, propertyId) }))
  await op('restore Drive Trashed', { op: 'restore', bundlePath: trashed })
  item(10, 'C-2', 'restoring the trashed page brings its value back',
    frontmatter('Drive Trashed')['Drive Kept'] === 'Drive Trashed value', show(frontmatter('Drive Trashed')))

  // The open's trigger: a seven-day History Timeframe, a block removed eight days ago, and one removed today.
  const aged = new Date(Date.now() - 8 * DAY_MS).toISOString()
  const settings = JSON.parse(before.settings)
  cdp = await relaunch(cdp, async () => {
    writeRel('.nexus/settings.json', { ...settings, personalization: { ...settings.personalization, historyDays: 7 } })
    writeRel('Collection B/_pagecollection.json', {
      ...before.b,
      property_stash: {
        prop_drive_aged: { removed_at: aged, values: { x: 'aged' } },
        prop_drive_kept: { removed_at: new Date().toISOString(), values: { y: 'kept' } },
      },
    })
  })
  await settles(async () => stashIn('Collection B', 'prop_drive_aged') === undefined)
  item(10, 'C-3', 'opening drops a block older than the History Timeframe and keeps one inside it',
    stashIn('Collection B', 'prop_drive_aged') === undefined && same(stashIn('Collection B', 'prop_drive_kept')?.values, { y: 'kept' }),
    show(collectionSidecar('Collection B').property_stash))

  // The timeframe's trigger: the kept block backdated by hand, then the timeframe written.
  writeRel('Collection B/_pagecollection.json', {
    ...collectionSidecar('Collection B'),
    property_stash: { prop_drive_kept: { removed_at: aged, values: { y: 'kept' } } },
  })
  await sleep(600)
  await must('historyDays 7', ask(cdp, 'personalization:set', 'historyDays', 7))
  item(10, 'C-3', 'writing the History Timeframe drops a block older than it',
    await settles(async () => collectionSidecar('Collection B').property_stash === undefined), show(collectionSidecar('Collection B')))

  // The partial mark: a property record written partly, by hand.
  const partialBundle = '.trash/2026-10-20T12-00-00-000Z__property-prop_drive_partial.deleted'
  mkdirSync(join(NEXUS, partialBundle), { recursive: true })
  writeRel(`${partialBundle}/_record.json`, {
    entity: 'property', id: 'prop_drive_partial',
    def: { id: 'prop_drive_partial', label: 'Drive Partial', key: 'Drive Partial', type: 'text' },
    values: {}, partial: true,
  })
  await until('the Trash lists it', async () => (await trashRows(cdp)).some((r) => r.title === 'Drive Partial'))
  const listed = (await trashRows(cdp)).find((r) => r.title === 'Drive Partial')
  await openSettings(cdp, 'Trash')
  const marked = await cdp.evaluate(`!!(${trashRowEl('Drive Partial')})?.querySelector('[role="img"][aria-label="Recorded Partly"]')`)
  const plain = await cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row [aria-label="Recorded Partly"]')].length`)
  item(10, 'N-1', 'a partly recorded Trash entry shows its mark, and no other row does', listed?.partial === true && marked && plain === 1, show({ listed, marked, plain }))
  const back = await op('restore Drive Partial', { op: 'restore', bundlePath: partialBundle })
  item(10, 'N-1', 'its restore says it may not hold everything',
    back.cascade?.warning?.includes('“Drive Partial” was recorded partly, so some of what it held may not come back.') === true, show(back))
  await closeSettings(cdp)

  // The group leaves as it found them: both properties deleted and emptied, both pages emptied, the settings as they were.
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const id of [propertyId, 'prop_drive_partial'])
    await op(`empty ${id}`, { op: 'emptyBundle', bundlePath: (await op(`delete ${id}`, { op: 'deleteProperty', propertyId: id })).undo.bundlePath })
  for (const title of ['Drive Stays', 'Drive Trashed'])
    await op(`empty ${title}`, { op: 'emptyBundle', bundlePath: (await op(`delete ${title}`, { op: 'delete', path: pagePath(title), kind: 'page' })).undo.bundlePath })
  writeFileSync(join(NEXUS, '.nexus/settings.json'), before.settings)
  await settles(async () => (await ask(cdp, 'nexus:state')).value.tree.config.personalization.permanentDelete === before.permanentDelete)
  const after = {
    a: collectionSidecar(COLLECTION),
    b: collectionSidecar('Collection B'),
    settings: read('.nexus/settings.json'),
    trash: (await trashRows(cdp)).length,
  }
  item(10, '—', 'the group leaves Collections A and B, the settings, and the Trash as it found them',
    same(after.a.properties, before.a.properties) && after.a.property_stash === before.a.property_stash && same(after.b, before.b) &&
      after.settings === before.settings && after.trash === before.trash,
    show({ before, after }))
}

// ── Group 11 — Columns Carry Their Answer ───────────────────────────────────

const COLUMNS_DEFS = [
  { id: 'prop_drive_text', label: 'Drive Text', key: 'Drive Text', type: 'text' },
  { id: 'prop_drive_link', label: 'Drive Link', key: 'Drive Link', type: 'link' },
  {
    id: 'prop_drive_select',
    label: 'Drive Select',
    key: 'Drive Select',
    type: 'select',
    select_options: [
      { id: 'opt_drive_alpha', key: 'Alpha', label: 'Alpha' },
      { id: 'opt_drive_beta', key: 'Beta', label: 'Beta' },
    ],
  },
]
const views = async (cdp) =>
  (await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION)?.views ?? []
const headTexts = () => `[...document.querySelectorAll('.table-head > *')].map((e) => e.textContent.trim())`
const activate = (cdp, viewId) =>
  must('show the view', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId }))

const HOME = { kind: 'homepage' }
const HOMEPAGE_DIR = '.nexus/interface/homepage'
const HOMEPAGE = `${HOMEPAGE_DIR}/homepage.json`
/** Writes `defs` into the registry and assigns them to Collection A, saves `seededViews`, and answers what puts the registry, the sidecar, and the homepage back. */
async function seedCollection(cdp, defs, seededViews) {
  const kept = [REGISTRY_REL, SIDECAR_A, HOMEPAGE].map((rel) => [rel, read(rel)])
  const tiles = new Set(readdirSync(join(NEXUS, HOMEPAGE_DIR)))
  const file = JSON.parse(kept[0][1])
  writeFileSync(REGISTRY, JSON.stringify({
    ...file,
    order: [...(file.order ?? []), ...defs.map((d) => d.id)],
    defs: { ...file.defs, ...Object.fromEntries(defs.map((d) => [d.id, d])) },
  }, null, 2))
  await until('the definitions', async () => {
    const held = (await config(cdp)).registry
    return defs.every((d) => held.some((h) => h.id === d.id))
  })
  for (const d of defs)
    await must(`assign ${d.label}`, ask(cdp, 'mutate', { op: 'assignProperty', containerPath: COLLECTION, propertyId: d.id }))
  for (const view of seededViews) await must(`save ${view.name}`, ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  return async (pages) => {
    await escapeAll(cdp)
    for (const title of pages) {
      rmSync(join(NEXUS, pagePath(title)))
      delete pageIds[title]
    }
    for (const [rel, text] of kept) writeFileSync(join(NEXUS, rel), text)
    for (const name of readdirSync(join(NEXUS, HOMEPAGE_DIR))) if (!tiles.has(name)) rmSync(join(NEXUS, HOMEPAGE_DIR, name))
    await until('the definitions leave', async () => !(await config(cdp)).registry.some((h) => h.id === defs[0].id))
  }
}

async function group11(cdp) {
  const storedRegistry = readFileSync(REGISTRY, 'utf8')
  const storedSidecar = read(SIDECAR_A)
  await openCollection(cdp)

  const file = JSON.parse(storedRegistry)
  writeFileSync(REGISTRY, JSON.stringify({
    ...file,
    order: [...file.order, ...COLUMNS_DEFS.map((d) => d.id)],
    defs: { ...file.defs, ...Object.fromEntries(COLUMNS_DEFS.map((d) => [d.id, d])) },
  }, null, 2))
  await until('the definitions', async () => (await config(cdp)).registry.some((d) => d.id === 'prop_drive_select'))
  const assign = (d) => must(`assign ${d.label}`, ask(cdp, 'mutate', { op: 'assignProperty', containerPath: COLLECTION, propertyId: d.id }))
  const [text, link, select] = COLUMNS_DEFS
  await assign(text)
  await assign(link)

  const before = new Set((await views(cdp)).map((v) => v.id))
  await mouseClick(cdp, sel('button[title="Views"]'))
  await sleep(600)
  await click(cdp, sel('[aria-label="New View"]'))
  await until('the new view', async () => (await views(cdp)).some((v) => !before.has(v.id)))
  const minted = (await views(cdp)).find((v) => !before.has(v.id))
  await escapeAll(cdp)
  await activate(cdp, minted.id)
  await until('the new view’s head', async () => (await cdp.evaluate(headTexts())).length > 0)
  const fresh = await cdp.evaluate(headTexts())
  item(11, '—', 'a new view stores no hidden list and shows Title alone',
    show(minted.hidden_properties) === '[]' && show(minted.property_order) === '["_title"]' && show(fresh) === '["Title"]',
    show({ hidden: minted.hidden_properties, order: minted.property_order, fresh }))

  await assign(select)
  await sleep(800)
  const later = await cdp.evaluate(headTexts())
  item(11, '—', 'Drive Select, assigned after the view, stays hidden in it', show(later) === '["Title"]', show(later))

  await viewFrame(cdp, 'Visibility')
  await click(cdp, sel('[aria-label="Show Drive Text"]'))
  await escapeAll(cdp)
  const revealed = await settles(async () => show(await cdp.evaluate(headTexts())) === '["Title","Drive Text"]')
  item(11, '07-08', 'revealing a property shows its column', revealed, show(await cdp.evaluate(headTexts())))
  await shot(cdp, 'g11-revealed')

  const table = {
    id: 'view_01KZPROPERTIESDRIVE11COL', name: 'Drive Columns', type: 'table',
    property_order: ['_title', ...COLUMNS_DEFS.map((d) => d.id)], hidden_properties: [],
  }
  await must('save the Drive Columns view', ask(cdp, 'views:save', COLLECTION, 'collection', table, {}))
  await activate(cdp, table.id)
  await createPage(cdp, 'Drive Columns')
  const path = `${SET}/Drive Columns.md`
  const values = [
    ['prop_drive_text', { kind: 'text', value: 'Drive words' }],
    ['prop_drive_link', { kind: 'link', value: 'https://example.com' }],
    ['prop_drive_select', { kind: 'select', value: 'opt_drive_alpha' }],
  ]
  for (const [propertyId, value] of values)
    await must(`set ${propertyId}`, ask(cdp, 'mutate', { op: 'setProperty', path, propertyId, value }))
  await until('the Drive Columns row', () => cdp.evaluate(`!!${row('Drive Columns')}`))
  // A removable chip draws its label in more than one layer, so a cell reads its distinct leaf texts.
  const cells = await cdp.evaluate(`[...(${row('Drive Columns')}).querySelectorAll('.data-cell')].slice(1).map((c) => [...new Set([...c.querySelectorAll('*')].filter((e) => !e.children.length).map((e) => e.textContent.trim()).filter(Boolean))].join(' '))`)
  item(11, '07-01 06-08', 'Text, Link, and Select columns render their values',
    cells[0] === 'Drive words' && cells[1]?.includes('example.com') && cells[2] === 'Alpha', show(cells))

  await mouseClick(cdp, `(${row('Drive Columns')}).querySelectorAll('.data-cell')[3]`)
  await until('the Select picker', () => portalOpen(cdp))
  await click(cdp, `[...document.querySelectorAll('[data-picker-portal] [role=button]')].find((b) => b.textContent.trim() === 'Beta')`)
  const edited = await settles(async () => show(frontmatter('Drive Columns')['Drive Select']) === '["Beta"]')
  item(11, '07-01', 'a Select cell edits through its picker', edited, show(frontmatter('Drive Columns')['Drive Select']))
  await shot(cdp, 'g11-columns')

  await escapeAll(cdp)
  writeFileSync(join(NEXUS, SIDECAR_A), storedSidecar)
  writeFileSync(REGISTRY, storedRegistry)
  await until('the registry as it was', async () => !(await config(cdp)).registry.some((d) => d.id === 'prop_drive_select'))
  delete pageIds['Drive Columns']
}

// ── Group 12 · The Per-Kind View Record ─────────────────────────────────────

const KINDS = {
  score: { id: 'prop_drive_kinds_score', label: 'Kinds Score', key: 'Kinds Score', type: 'number' },
  done: { id: 'prop_drive_kinds_done', label: 'Kinds Done', key: 'Kinds Done', type: 'checkbox' },
  stage: {
    id: 'prop_drive_kinds_stage', label: 'Kinds Stage', key: 'Kinds Stage', type: 'select',
    select_options: [{ id: 'opt_drive_alpha', key: 'Alpha', label: 'Alpha' }, { id: 'opt_drive_beta', key: 'Beta', label: 'Beta' }],
  },
}
const KINDS_PAGES = ['Kinds A', 'Kinds B', 'Kinds C']
/** The group's pages in the order the table draws them. */
const drawn = async (cdp) => {
  const rids = await cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((e) => e.dataset.rid)`)
  return rids.flatMap((rid) => KINDS_PAGES.filter((t) => pageIds[t] === rid))
}
const drawsAs = (cdp, titles) => settles(async () => JSON.stringify(await drawn(cdp)) === JSON.stringify(titles))

async function group12(cdp) {
  const defs = Object.values(KINDS)
  const base = {
    id: 'view_01KZPROPDRIVE00000KINDSTBL', name: 'Drive Kinds', type: 'table',
    property_order: ['_title', ...defs.map((d) => d.id)], hidden_properties: [], filter_enabled: true,
  }
  const putBack = await seedCollection(cdp, defs, [base])
  await createPage(cdp, 'Kinds A', {
    [KINDS.score.id]: { kind: 'number', value: 5 },
    [KINDS.done.id]: { kind: 'checkbox', value: true },
    [KINDS.stage.id]: { kind: 'select', value: 'opt_drive_alpha' },
  })
  await createPage(cdp, 'Kinds B', {
    [KINDS.score.id]: { kind: 'number', value: 9 },
    [KINDS.stage.id]: { kind: 'select', value: 'opt_drive_beta' },
  })
  await createPage(cdp, 'Kinds C')

  const save = (patch) => must('save Drive Kinds', ask(cdp, 'views:save', COLLECTION, 'collection', base, patch))
  await showView(cdp, base)
  const onlyKinds = { property_id: '_title', op: 'starts_with', value: 'Kinds ' }

  await save({ filter: { match: 'any', rules: [{ property_id: KINDS.score.id, op: 'is', value: 'abc' }, { property_id: '_title', op: 'is', value: 'Kinds A' }] } })
  item(12, 'K-1', 'a Number filter holding "abc" inside an Any group leaves the other rule deciding', await drawsAs(cdp, ['Kinds A']), show(await drawn(cdp)))

  await save({ filter: { match: 'all', rules: [onlyKinds, { property_id: KINDS.done.id, op: 'is_not_empty' }] } })
  item(12, 'K-1', 'a Checkbox "is not empty" filter shows only checked pages', await drawsAs(cdp, ['Kinds A']), show(await drawn(cdp)))

  const byStage = (direction) => save({ filter: { match: 'all', rules: [onlyKinds] }, sort: [{ property_id: KINDS.stage.id, direction }] })
  await byStage('ascending')
  const up = await drawsAs(cdp, ['Kinds A', 'Kinds B', 'Kinds C'])
  const ascending = await drawn(cdp)
  await byStage('descending')
  const down = await drawsAs(cdp, ['Kinds B', 'Kinds A', 'Kinds C'])
  item(12, 'K-2', 'a Select sort puts the empty row last in both directions', up && down, show({ ascending, descending: await drawn(cdp) }))
  await shot(cdp, 'g12-select-sort')

  await putBack(KINDS_PAGES)
}

// ── Group 13 — The Filter's Clock ───────────────────────────────────────────

async function group13(cdp) {
  const added = await must('add Drive Due', ask(cdp, 'mutate', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Due', type: 'dateTime' } }))
  const due = added.created.propertyId
  const view = {
    id: 'view_01KZPROPERTIESDRIVE13CLK', name: 'Drive Clock', type: 'table', property_order: ['_title', due], hidden_properties: [],
    column_styles: { [due]: { time_format: 'twentyFourHour' } },
    filter: { match: 'all', rules: [{ property_id: due, op: 'is', value: '2026-10-22T15:30' }] },
  }
  await must('save the Drive Clock view', ask(cdp, 'views:save', COLLECTION, 'collection', view, {}))
  await showView(cdp, view)
  await viewFrame(cdp, 'Filter')
  await click(cdp, sel('[aria-label="Filter date"]'))
  await until('the filter date picker', () => portalOpen(cdp))
  const pane = await cdp.evaluate(`${sel(PANE_LAYER)}?.textContent ?? ''`)
  item(13, 'J-1', "a filter's date picker opens on its column's 24-hour clock under a 12-hour Nexus, with no End Date", pane.includes('15:30') && !/\b(AM|PM)\b/.test(pane) && !pane.includes('End Date'), JSON.stringify(pane.slice(0, 160)))
  await shot(cdp, 'g13-filter-clock')
  await escapeAll(cdp)
}

// ── Group 14 — One Value Seat ───────────────────────────────────────────────

const SEAT = {
  stage: {
    id: 'prop_drive_seat_stage', label: 'Seat Stage', key: 'Seat Stage', type: 'select',
    select_options: [{ id: 'opt_drive_seat', key: 'Seat Open', label: 'Seat Open' }],
  },
  notes: { id: 'prop_drive_seat_notes', label: 'Seat Notes', key: 'Seat Notes', type: 'text' },
  due: { id: 'prop_drive_seat_due', label: 'Seat Due', key: 'Seat Due', type: 'dateTime' },
  site: { id: 'prop_drive_seat_site', label: 'Seat Site', key: 'Seat Site', type: 'link' },
  doc: { id: 'prop_drive_seat_doc', label: 'Seat Doc', key: 'Seat Doc', type: 'file' },
}
const SEAT_PAGES = ['Seat One', 'Seat Two']
const SEAT_TABLE = {
  id: 'view_01KZPROPERTIESDRIVE14TBL', name: 'Seat Table', type: 'table', hidden_properties: [],
  property_order: ['_title', ...Object.values(SEAT).map((d) => d.id)],
}
// The Link and the File stay off the cards, so every card's Add list offers them.
const SEAT_CARDS = {
  id: 'view_01KZPROPERTIESDRIVE14CRD', name: 'Seat Cards', type: 'cards',
  property_order: ['_title', SEAT.stage.id, SEAT.notes.id, SEAT.due.id], hidden_properties: [SEAT.site.id, SEAT.doc.id],
}
const sidebarRow = (title) => `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(title)})`
/** A folded sidebar row's chevron pressed as a pointer presses it, as the Archive Drive's `unfold` does. */
async function unfold(cdp, title, child) {
  if (await cdp.evaluate(`!!(${sidebarRow(child)})`)) return
  await mouseClick(cdp, `${sidebarRow(title)}.closest('.row').querySelector('[data-drop-outline]')`)
  await until(`${child} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(child)})`))
}
/** A panel row's label: the leaf naming it in the row its value seat sits in. */
const rowLabel = (id, name) =>
  `(() => { let el = document.querySelector('[data-property-row="${id}"]'); while (el && !el.textContent.includes(${JSON.stringify(name)})) el = el.parentElement; return el && [...el.querySelectorAll('span')].find((s) => s.children.length === 0 && s.textContent.trim() === ${JSON.stringify(name)}) })()`
/** The first element of `scope`, or inside it, showing exactly `text`: a chip draws its label more than once, so a cell's own text repeats it. */
const valueIn = (scope, text) => `[...document.querySelectorAll(${JSON.stringify(scope)})].flatMap((e) => [e, ...e.querySelectorAll('*')]).find((e) => e.getClientRects().length > 0 && e.textContent.trim() === ${JSON.stringify(text)})`
const paneOpen = (cdp) => cdp.evaluate(`!!${sel(PANE_LAYER)}`)
const paneRows = (cdp) => cdp.evaluate(`[...document.querySelectorAll('${PANE_LAYER} [role="button"]')].map((b) => b.textContent.trim())`)
// Seat One holds every seat property, so the panel draws no Add Property for the harness's `openPanel` to wait on; its rows say it's open.
const PANEL_ROWS = `!!document.querySelector('[data-property-row]')`
async function seatPanel(cdp, open) {
  if ((await cdp.evaluate(PANEL_ROWS)) !== open) await mouseClick(cdp, SETTINGS_BUTTON)
  await until(`the panel ${open ? 'open' : 'closed'}`, async () => (await cdp.evaluate(PANEL_ROWS)) === open)
}
async function showView(cdp, view) {
  await must(`show ${view.name}`, ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: view.id }))
  await openCollection(cdp)
}

async function group14(cdp) {
  const putBack = await seedCollection(cdp, Object.values(SEAT), [SEAT_TABLE, SEAT_CARDS])
  await createPage(cdp, 'Seat One', {
    [SEAT.stage.id]: { kind: 'select', value: 'opt_drive_seat' },
    [SEAT.notes.id]: { kind: 'text', value: 'words' },
    [SEAT.due.id]: { kind: 'dateTime', value: '2026-10-22' },
    [SEAT.site.id]: { kind: 'link', value: 'https://example.com' },
    [SEAT.doc.id]: { kind: 'file', value: ['[[Drive.pdf]]'] },
  })
  await createPage(cdp, 'Seat Two', { [SEAT.stage.id]: { kind: 'select', value: 'opt_drive_seat' } })

  const one = () => pageIds['Seat One']
  const surfaces = [
    ['the Table', () => showView(cdp, SEAT_TABLE), () => `.data-row[data-rid="${one()}"] .data-cell`],
    ['a Card', () => showView(cdp, SEAT_CARDS), () => `[data-rid="${one()}"] .card-value`],
    ['the panel', async () => { await showView(cdp, SEAT_TABLE); await openPage(cdp, 'Seat One'); await seatPanel(cdp, true) }, () => '[data-property-row]'],
  ]
  const seen = {}
  for (const [name, open, scope] of surfaces) {
    await open()
    await until(`${name}'s value`, () => cdp.evaluate(`!!${valueIn(scope(), 'Seat Open')}`))
    await mouseClick(cdp, valueIn(scope(), 'Seat Open'))
    await until(`${name}'s option picker`, () => paneOpen(cdp))
    const options = await paneRows(cdp)
    await escapeAll(cdp)
    const { rows } = await chooseNative(cdp, valueIn(scope(), 'Seat Open'), [])
    await mouseClick(cdp, valueIn(scope(), 'words'))
    const editing = await settles(() => cdp.evaluate(`!!document.querySelector('.value-field .cm-editor, .text-pane')`), 3000)
    await escapeAll(cdp)
    seen[name] = { options, rows, editing }
    await shot(cdp, `g14-${name.replace(/\W+/g, '-')}`)
  }
  const all = Object.values(seen)
  item(14, 'X6', 'an option click opens the same option list on every surface',
    all.every((s) => show(s.options) === show(seen['the Table'].options)) && seen['the Table'].options.includes('Seat Open'), show(seen))
  item(14, 'X6', 'an option right-click offers Clear on every surface, and Remove on a Card and the panel',
    all.every((s) => s.rows.includes('Clear')) && !seen['the Table'].rows.includes('Remove') &&
      seen['a Card'].rows.includes('Remove') && seen['the panel'].rows.includes('Remove'), show(seen))
  item(14, 'X6', 'an option right-click offers Style in a view and never in the panel',
    seen['the Table'].rows.includes('Style') && seen['a Card'].rows.includes('Style') && !seen['the panel'].rows.includes('Style'), show(seen))
  item(14, 'X6', 'a Text click edits the value on every surface', all.every((s) => s.editing), show(seen))

  await seatPanel(cdp, false)
  await showView(cdp, SEAT_CARDS)
  const card = (title) => `[data-rid="${pageIds[title]}"]`
  await mouseClick(cdp, valueIn(`${card('Seat One')} .card-value`, 'Seat Open'))
  await until('the first card picker', () => paneOpen(cdp))
  await cdp.evaluate(`void (window.__seatPane = ${sel(PANE_LAYER)})`)
  // The first picker's dismissal shield takes the first press, so the second card's value is pressed again while that picker is still leaving.
  await mouseClick(cdp, valueIn(`${card('Seat Two')} .card-value`, 'Seat Open'), { settle: 50 })
  await mouseClick(cdp, valueIn(`${card('Seat Two')} .card-value`, 'Seat Open'))
  const fresh = await settles(() => cdp.evaluate(`!!${sel(PANE_LAYER)} && ${sel(PANE_LAYER)} !== window.__seatPane`))
  item(14, 'LC-54', "moving from one card's picker to another's mounts a fresh picker", fresh, show({ fresh }))
  await escapeAll(cdp)

  await click(cdp, `document.querySelector('${card('Seat Two')} .card-props')`)
  await until("the card's Add list", () => paneOpen(cdp))
  // The Add list blooms in, so its rows are pressed once they've landed.
  await sleep(500)
  await mouseClick(cdp, valueIn('[data-picker-portal] [role="button"]', SEAT.site.label))
  const empty = await settles(() => cdp.evaluate(`document.querySelector('[data-picker-portal] .cm-content')?.textContent === ''`))
  item(14, '—', "a Link added from a card's Add list opens an empty field", empty, show({ empty }))
  await escapeAll(cdp)

  await showView(cdp, SEAT_TABLE)
  await openPage(cdp, 'Seat One')
  await seatPanel(cdp, true)
  const label = await chooseNative(cdp, rowLabel(SEAT.site.id, SEAT.site.label), [])
  item(14, 'J-3', "a Link row's label offers Edit Title and Edit Link before Clear and Remove",
    show(label.rows) === show(['Edit Title', 'Edit Link', 'Clear', 'Remove']), show(label.rows))
  const chip = await chooseNative(cdp, `document.querySelector('[data-property-row="${SEAT.doc.id}"] [data-file-chip-index="0"]')`, 'Remove')
  item(14, 'J-10 LC-15', "a File chip's menu offers Remove and never Clear",
    show(chip.rows) === show(['Add File', 'Replace File', 'Remove File', 'Remove']), show(chip.rows))
  const cleared = await settles(async () => !(SEAT.doc.key in frontmatter('Seat One')) && !(await cdp.evaluate(`!!document.querySelector('[data-property-row="${SEAT.doc.id}"]')`)))
  item(14, 'J-10 LC-15', "the File's Remove clears the value and takes its row away", chip.chosen && cleared, show({ chosen: chip.chosen, cleared }))

  await mouseClick(cdp, `document.querySelector('[data-property-row="${SEAT.stage.id}"]')`)
  await until('the panel picker', () => paneOpen(cdp))
  await must('clear Seat Stage from outside', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath('Seat One'), propertyId: SEAT.stage.id, value: null }))
  const closed = await settles(async () => !(await paneOpen(cdp)))
  item(14, '—', "the panel's picker closes when its row's value is cleared from outside", closed, show({ closed }))
  await escapeAll(cdp)
  await seatPanel(cdp, false)

  if (!(await cdp.evaluate(`!!(${sidebarRow(COLLECTION)})`))) await click(cdp, `document.querySelector('.sidebar-ribbon [aria-label="Collections"]')`)
  await unfold(cdp, COLLECTION, 'Set Alpha')
  await unfold(cdp, 'Set Alpha', 'Seat One')
  const { chosen } = await chooseNative(cdp, sidebarRow('Seat One'), ['Properties', SEAT.due.label])
  const calendar = await settles(() => cdp.evaluate(`!!document.querySelector('[data-picker-portal] [aria-label="Next month"]')`))
  item(14, 'X6', "a Date picked from the sidebar's Properties menu opens the calendar", chosen && calendar, show({ chosen, calendar }))

  await putBack(SEAT_PAGES)
}

// ── Group 15 — The Properties Pane (P17) ────────────────────────────────────

const G15_FILES = ['.nexus/properties.json', 'Collection A/_pagecollection.json']
const RHYTHM = 8
const liveEl = (label) => `[...document.querySelectorAll('[aria-label="${label}"]')].find((e) => !e.closest('[inert]'))`
const liveRow = (text) => `[...document.querySelectorAll('[role=button]')].find((e) => !e.closest('[inert]') && e.textContent.trim() === ${JSON.stringify(text)})`
const listLive = (cdp) => cdp.evaluate(`!!${liveEl('New Property')}`)
const editorLive = (cdp) => cdp.evaluate(`!!${liveEl('Property Menu')}`)

/** The gaps between an editor's shown rows, top to bottom. The container is the element holding two controls on rows that never collapse; a revealed row is read inside its Reveal, and a collapsed one has none. */
const rowGaps = (cdp, first, last) => cdp.evaluate(`(() => {
  const a = ${liveEl(first)}, b = ${liveEl(last)}
  let box = a.parentElement
  while (!box.contains(b)) box = box.parentElement
  const rows = [...box.children]
    .map((c) => (c.hasAttribute('data-reveal') ? c.firstElementChild?.firstElementChild : c))
    .filter((r) => r && r.getBoundingClientRect().height > 0)
    .map((r) => r.getBoundingClientRect())
  return rows.slice(1).map((r, i) => Math.round(r.top - rows[i].bottom))
})()`)
const even = (gaps, count) => gaps.length === count && gaps.every((g) => g === RHYTHM)

/** Creates a property of `type` through the pane, sampling each frame from the pick on whether the list shows. */
async function createThroughPane(cdp, type) {
  await click(cdp, liveEl('New Property'))
  await sleep(600)
  await cdp.evaluate(`(() => {
    window.__listFrames = 0
    const end = performance.now() + 1500
    const tick = () => {
      if (${liveEl('New Property')}) window.__listFrames += 1
      if (performance.now() < end) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })()`)
  await click(cdp, liveRow(type))
  await sleep(1700)
  return { listFrames: await cdp.evaluate('window.__listFrames'), editor: await editorLive(cdp) }
}
const backToList = async (cdp) => {
  await click(cdp, liveRow('Properties'))
  await sleep(700)
}
async function pickIn(cdp, ariaLabel, option) {
  await click(cdp, liveEl(ariaLabel))
  await until(`the ${ariaLabel} picker`, () => portalOpen(cdp))
  await click(cdp, `[...document.querySelectorAll('${PANE_LAYER} [role=button]')].find((e) => e.textContent.trim() === ${JSON.stringify(option)})`)
  await sleep(600)
}
async function typeInto(cdp, ariaLabel, text) {
  await click(cdp, liveEl(ariaLabel))
  await sleep(300)
  await typeText(cdp, text)
  await pressKey(cdp, 'Enter')
  await sleep(600)
}

async function group15(cdp) {
  const kept = G15_FILES.map((rel) => readFileSync(join(NEXUS, rel), 'utf8'))
  await openCollection(cdp)
  await viewFrame(cdp, 'Properties')

  const created = {}
  for (const type of ['Number', 'Date & Time', 'Link', 'Checkbox', 'File']) {
    created[type] = await createThroughPane(cdp, type)
    if (type === 'Number') {
      const gaps = await rowGaps(cdp, 'Number format', 'Decimal places')
      item(15, 'L-1', 'a new Number editor keeps 8px between every shown row, its revealed Separators and Fraction among them', even(gaps, 3), show(gaps))
      await shot(cdp, 'g15-number-collapsed')
      await click(cdp, liveEl('Fraction'))
      await sleep(600)
      const value = await rowGaps(cdp, 'Number format', 'Decimal places')
      item(15, 'L-1', 'turning Fraction on reveals Value at the same 8px', even(value, 4), show(value))
      await shot(cdp, 'g15-number-revealed')
      await typeInto(cdp, 'Fraction value', '4')
      const four = defNamed('New Number')?.number_denominator
      await typeInto(cdp, 'Fraction value', '0')
      const after = defNamed('New Number')?.number_denominator
      item(15, 'L-3', 'a denominator of 4 lands, and a 0 typed over it reverts to 4', four === 4 && after === 4, show({ four, after }))
      const style = await rowGaps(cdp, 'Number format', 'Decimal places')
      item(15, 'L-1', 'a denominator gives the bar its ceiling, and Style reveals at the same 8px', even(style, 5), show(style))
      await shot(cdp, 'g15-number-style')
    }
    if (type === 'Date & Time') {
      await pickIn(cdp, 'Date Format', 'Full Date')
      const shown = await rowGaps(cdp, 'Date Format', 'Time Format')
      item(15, 'L-1', 'a Date editor with its Day row shown keeps 8px between every row', even(shown, 2), show(shown))
      await shot(cdp, 'g15-date-revealed')
      await pickIn(cdp, 'Date Format', 'MM/DD/YYYY')
      const hidden = await rowGaps(cdp, 'Date Format', 'Time Format')
      item(15, 'L-1', 'a collapsed Day row leaves no gap: Date to Time is 8px', even(hidden, 1), show(hidden))
      await shot(cdp, 'g15-date-collapsed')
    }
    if (type === 'Link') {
      const gaps = await rowGaps(cdp, 'Underline links', 'Link format')
      item(15, 'L-1', 'a Link editor keeps 8px between its rows', even(gaps, 2), show(gaps))
      await shot(cdp, 'g15-link')
    }
    if (type === 'Checkbox') {
      const gaps = await rowGaps(cdp, 'Color', 'Checkbox style')
      item(15, 'L-1', 'a Checkbox editor keeps 8px between its rows', even(gaps, 1), show(gaps))
      await shot(cdp, 'g15-checkbox')
    }
    if (type === 'File') await shot(cdp, 'g15-file')
    if (type !== 'File') await backToList(cdp)
  }
  item(15, 'O-5', 'creating each type opens its editor with no frame of the list between', Object.values(created).every((c) => c.editor && c.listFrames === 0), show(created))

  const { chosen } = await chooseNative(cdp, liveEl('Property Menu'), 'Delete', { button: 'left' })
  if (await settles(() => cdp.evaluate(`!!document.querySelector('[role="alertdialog"]')`), 2500))
    await click(cdp, `[...document.querySelector('[role="alertdialog"]').querySelectorAll('button')].find((b) => b.textContent.trim() !== 'Cancel')`)
  const gone = await settles(async () => !defNamed('New File'))
  item(15, 'O-5', 'deleting a property from its ⋮ menu leaves the list showing', chosen === true && gone && (await listLive(cdp)), show({ chosen, gone }))

  await click(cdp, `[...document.querySelectorAll('[role=button]')].find((e) => !e.closest('[inert]') && e.textContent.trim().startsWith('New Number'))`)
  await sleep(700)
  const number = defNamed('New Number')
  await must('remove New Number from outside', ask(cdp, 'mutate', { op: 'unassignProperty', containerPath: COLLECTION, propertyId: number.id }))
  const shown = await settles(() => listLive(cdp))
  const caption = await cdp.evaluate(`document.body.innerText.includes('Property not found.')`)
  item(15, 'O-5', 'a property removed from outside under its open editor gives way to the list', shown && !caption, show({ shown, caption }))
  await shot(cdp, 'g15-list-after-removal')

  await escapeAll(cdp)
  G15_FILES.forEach((rel, i) => writeFileSync(join(NEXUS, rel), kept[i]))
  await until('the registry as it was', async () => (await config(cdp)).registry.length === JSON.parse(kept[0]).order.length)
}

// ── Groups 16, 18, and 19 — the Metadata Picker ─────────────────────────────

/** The first element `css` matches that the window shows: a tab kept alive behind the shown one draws its copies off to the left. */
const shownEl = (css) => `[...document.querySelectorAll(${JSON.stringify(css)})].find((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().left >= 0)`
const VIEW_SETTINGS = shownEl('.tile button[aria-label="View settings"]')
/** A View Tile showing `viewId` between two filler tiles, so it sits in the window's lower half and the board scrolls. A board already drawn doesn't redraw from a tile written over the channel, so the window reloads before the homepage shows. */
async function homeTile(cdp, viewId) {
  const source = (await ask(cdp, 'nexus:state')).value.tree.collections.find((c) => c.path === COLLECTION).id
  await must('a filler tile', ask(cdp, 'tiles:create', HOME, { kind: 'append', h: 300 }))
  await must('the View Tile', ask(cdp, 'tiles:create', HOME, { kind: 'append' }, { kind: 'view', value: { source_id: source, view_id: viewId } }))
  await must('a filler tile', ask(cdp, 'tiles:create', HOME, { kind: 'append', h: 600 }))
  await cdp.evaluate('window.__beforeReload = true')
  await cdp.send('Page.reload')
  await until('the reloaded ribbon', () => cdp.evaluate(`!window.__beforeReload && !!${ribbon('Homepage')}`), 30000)
  await sleep(1500)
  await mouseClick(cdp, ribbon('Homepage'))
  await until('the View Tile', () => cdp.evaluate(`!!${VIEW_SETTINGS}`))
  await sleep(800)
}
async function tileFrame(cdp, frame) {
  await mouseClick(cdp, VIEW_SETTINGS)
  await until('the settings pane', () => portalOpen(cdp))
  await sleep(600)
  await mouseClick(cdp, liveRow(frame))
  await sleep(900)
}

/** `n` Text properties named for their group, which lengthen every list of a Collection's properties. */
const fillers = (group, n) =>
  Array.from({ length: n }, (_, i) => ({ id: `prop_drive_${group.toLowerCase()}_filler_${i + 1}`, label: `${group} Filler ${i + 1}`, key: `${group} Filler ${i + 1}`, type: 'text' }))
/** A toolbar settings pane's back bar: the toolbar draws its panes in place, outside any [data-picker-portal]. */
const SETTINGS_BAR = `[...document.querySelectorAll('[role=button]')].find((e) => !e.closest('[inert]') && e.querySelector('.lucide-chevron-left'))`
async function closeToolbarSettings(cdp) {
  if (await cdp.evaluate(`(${SETTINGS_BUTTON}).getAttribute('aria-pressed') === 'true'`)) await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(400)
}

const LAYERS = `[...document.querySelectorAll('${PANE_LAYER}')]`
const TOP_LAYER = `${LAYERS}.at(-1)`
const layerCount = (cdp) => cdp.evaluate(`${LAYERS}.length`)
/** A pane's box and its side: a pane above its trigger is placed by its bottom edge, one below by its top. */
const layerBox = (cdp, expr = TOP_LAYER) => cdp.evaluate(`(() => {
  const e = ${expr}
  if (!e) return null
  const b = e.getBoundingClientRect()
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height, side: e.style.bottom ? 'up' : 'down', view: innerHeight }
})()`)
/** Runs `act` while an in-page sampler records the box of `of`, the top pane unless named, for `ms`: on every frame, or with `resizes` on each of its resizes, as the frame about to paint it holds it. */
async function framesOf(cdp, act, { of = TOP_LAYER, resizes = false, ms = 900 } = {}) {
  await cdp.evaluate(`(() => {
    window.__frames = []
    const sample = () => {
      const e = ${of}
      if (!e) return
      const b = e.getBoundingClientRect()
      window.__frames.push({ top: b.top, bottom: b.bottom, side: e.style.bottom ? 'up' : 'down', view: innerHeight })
    }
    if (${resizes}) {
      const ro = new ResizeObserver(sample)
      ro.observe(${of})
      setTimeout(() => ro.disconnect(), ${ms})
      return
    }
    const end = performance.now() + ${ms}
    const tick = () => {
      sample()
      if (performance.now() < end) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })()`)
  await act()
  await sleep(ms + 100)
  return cdp.evaluate('window.__frames')
}
const largestStep = (frames) =>
  Math.round(Math.max(0, ...frames.slice(1).map((f, i) => Math.max(Math.abs(f.top - frames[i].top), Math.abs(f.bottom - frames[i].bottom)))))
const insideWindow = (frames) => frames.length > 0 && frames.every((f) => f.top >= 0 && f.bottom <= f.view)

/** Shows the window `height` CSS pixels tall, answering the height it reads back. */
async function windowHeight(cdp, height) {
  const width = await cdp.evaluate('innerWidth')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: Math.round(width * zoom), height: Math.round(height * zoom), deviceScaleFactor: 0, mobile: false })
  await sleep(600)
  return cdp.evaluate('innerHeight')
}
async function naturalWindow(cdp) {
  await cdp.send('Emulation.clearDeviceMetricsOverride')
  await sleep(600)
}
// A pane's room on a side is measured past the menu gap and the window margin.
const CLEARANCE = 14
/** Scrolls the surface holding `expr` until its top sits at `top`. */
async function scrollTo(cdp, expr, top) {
  await cdp.evaluate(`(() => {
    const el = ${expr}
    let s = el.parentElement
    while (s && !(s.scrollHeight > s.clientHeight && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement
    s.scrollTop += el.getBoundingClientRect().top - ${top}
  })()`)
  await sleep(400)
}
/** Sizes the window so `expr` has `room` below it as a pane counts room. */
const roomBelow = async (cdp, expr, room) => windowHeight(cdp, Math.round((await boxOf(cdp, expr)).bottom + CLEARANCE + room))

const CAL = `${LAYERS}.find((e) => e.querySelector('[aria-label="Next month"]'))`
const MONTH = `${CAL}.querySelectorAll('button')[0]`
const YEAR = `${CAL}.querySelectorAll('button')[1]`
/** The calendar's first clock: its hour, its minute, and on a 12-hour clock its AM or PM. */
const clockParts = `(() => { let f = ${CAL}.querySelector('.lucide-clock'); while (f && f.querySelectorAll('button').length < 2) f = f.parentElement; return [...f.querySelectorAll('button')] })()`
const HOUR = `${clockParts}[0]`
const MINUTE = `${clockParts}[1]`
const END_DATE = `${CAL}.querySelector('[aria-label="End Date"]')`
const rowIn = (scope, text) => `[...(${scope}).querySelectorAll('[role=button]')].find((e) => e.textContent.trim() === ${JSON.stringify(text)})`

// ── Group 16 — The Add List ─────────────────────────────────────────────────

const ADD = {
  select: { id: 'prop_drive_add_select', label: 'Add Select', key: 'Add Select', type: 'select', select_options: [{ id: 'opt_drive_add_red', key: 'Red', label: 'Red' }, { id: 'opt_drive_add_green', key: 'Green', label: 'Green' }] },
  multi: { id: 'prop_drive_add_multi', label: 'Add Multi', key: 'Add Multi', type: 'multiSelect', select_options: [{ id: 'opt_drive_add_one', key: 'One', label: 'One' }, { id: 'opt_drive_add_two', key: 'Two', label: 'Two' }] },
  status: {
    id: 'prop_drive_add_status', label: 'Add Status', key: 'Add Status', type: 'status',
    status_groups: [
      { id: 'todo', label: 'To Do', color: 'grey', options: [{ id: 'opt_drive_add_open', key: 'Open', label: 'Open' }] },
      { id: 'done', label: 'Done', color: 'green', options: [{ id: 'opt_drive_add_closed', key: 'Closed', label: 'Closed' }] },
    ],
  },
  due: { id: 'prop_drive_add_due', label: 'Add Due', key: 'Add Due', type: 'dateTime' },
  start: { id: 'prop_drive_add_start', label: 'Add Start', key: 'Add Start', type: 'dateTime' },
  check: { id: 'prop_drive_add_check', label: 'Add Check', key: 'Add Check', type: 'checkbox' },
  file: { id: 'prop_drive_add_file', label: 'Add File', key: 'Add File', type: 'file' },
  number: { id: 'prop_drive_add_number', label: 'Add Number', key: 'Add Number', type: 'number' },
  text: { id: 'prop_drive_add_text', label: 'Add Text', key: 'Add Text', type: 'text' },
  link: { id: 'prop_drive_add_link', label: 'Add Link', key: 'Add Link', type: 'link' },
  bare: { id: 'prop_drive_add_bare', label: 'Add Bare', key: 'Add Bare', type: 'select' },
}
const ADD_IDS = Object.values(ADD).map((d) => d.id)
const layoutOf = ({ property_order, hidden_properties }) => ({ property_order, hidden_properties })
const ADD_STANDARD = { id: 'view_01KZPROPERTIESDRIVE16STD', name: 'Add Standard', type: 'cards', format: 'standard', property_order: ['_title'], hidden_properties: ADD_IDS }
const ADD_COMPACT = { id: 'view_01KZPROPERTIESDRIVE16CMP', name: 'Add Compact', type: 'cards', format: 'compact', property_order: ['_title', ...ADD_IDS], hidden_properties: [] }
const ADD_TABLE = { id: 'view_01KZPROPERTIESDRIVE16TBL', name: 'Add Table', type: 'table', property_order: ['_title', ...ADD_IDS], hidden_properties: [] }
const CONTEXTS_REL = '.nexus/contexts/contexts.json'
const EMPTY_CONTEXT = 'Add Empty'
const SPACE_FILE = '.nexus/contexts/Areas/Area One/_space.json'
const CONTEXT_TITLES = ['Areas', 'Topics', 'Projects', EMPTY_CONTEXT]
const SLIDING = [...CONTEXT_TITLES, ...['select', 'multi', 'status', 'due', 'start', 'bare'].map((k) => ADD[k].label)]
const ENTRIES = [...CONTEXT_TITLES, ...Object.values(ADD).map((d) => d.label)]
const STAMPS = ['Creation Time', 'Last Modified']
const liveRows = (cdp) => cdp.evaluate(`${LIVE_ROWS}.map((e) => ({ label: e.textContent.trim(), slides: !!e.querySelector('.lucide-chevron-right') }))`)
const listUp = (cdp) => cdp.evaluate(`!!${BACK} || ${LIVE_ROWS}.some((e) => ${JSON.stringify(ENTRIES)}.includes(e.textContent.trim()))`)
async function leaveList(cdp) {
  for (let i = 0; i < 3 && (await listUp(cdp)); i++) await pressKey(cdp, 'Escape')
}
const optionRows = (cdp) => cdp.evaluate(`${LIVE_ROWS}.filter((e) => !e.querySelector('.lucide-chevron-left')).map((e) => ({ label: e.textContent.trim(), lineRow: !!e.closest('[data-line-row]') }))`)
const newOptionShown = (cdp) => cdp.evaluate(`[...document.querySelectorAll('${PANE_LAYER} [aria-label="New Option"]')].some((e) => !e.closest('[inert]'))`)
const scrolling = (scope) => `[...(${scope}).querySelectorAll('*')].filter((e) => !e.closest('[inert]') && e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map((e) => ({ height: e.clientHeight, content: e.scrollHeight }))`
const selectedDays = (cdp) => cdp.evaluate(`[...${CAL}.querySelectorAll('[data-k]')].filter((b) => Number(getComputedStyle(b).fontWeight) >= 600).map((b) => b.dataset.k)`)
const dayOf = (n) => `[...${CAL}.querySelectorAll('[data-k]')].find((b) => b.dataset.k.endsWith('-${n}'))`
const barOf = (cdp, bar = BACK) => cdp.evaluate(`(() => {
  const bar = ${bar}
  if (!bar) return null
  const pane = (bar.closest('[data-picker-portal]') ?? bar.parentElement).getBoundingClientRect()
  const glyph = bar.querySelector('.lucide-chevron-left')
  const g = glyph.getBoundingClientRect()
  const label = [...bar.querySelectorAll('span')].filter((s) => s.children.length === 0).at(-1)
  const l = label.getBoundingClientRect()
  return {
    text: bar.textContent.trim(), height: Math.round(bar.getBoundingClientRect().height), padding: getComputedStyle(bar).padding, glyph: Math.round(g.width),
    inset: Math.round((pane.right - l.right) * 10) / 10, chevron: Math.round((g.left - pane.left + glyph.querySelector('path').getBBox().x * (g.width / 24)) * 10) / 10,
    labelRight: l.right, barRight: bar.getBoundingClientRect().right, labelMargin: getComputedStyle(label).marginRight,
  }
})()`)

async function addEntries(cdp, s) {
  const text = () => read(s.file)
  const start = text()
  const seen = { bars: {} }
  const shows = (id) => cdp.evaluate(`!!document.querySelector('${s.scope ?? ''}[data-property-row="${id}"]')`)
  const reset = async () => {
    writeFileSync(join(NEXUS, s.file), start)
    if (s.view) await must(`${s.name}'s view as it was`, ask(cdp, 'views:save', COLLECTION, 'collection', s.view, layoutOf(s.view)))
    await sleep(900)
  }
  const open = async (group) => {
    if (s.card) await escapeAll(cdp)
    else await leaveList(cdp)
    await s.open(group)
    await until(`${s.name}'s Add list`, () => listUp(cdp))
    await sleep(500)
  }
  const slide = async (group, label) => {
    await open(group)
    await slideTo(cdp, label)
  }
  const outside = async () => {
    const pane = await layerBox(cdp)
    await mouseAt(cdp, { x: Math.max(4, pane.left - 40), y: pane.top + 10 })
  }
  const pickOption = async (label) => {
    await mouseClick(cdp, entry(label))
    await sleep(700)
  }

  const contexts = s.card ? [] : (await open('contexts'), await liveRows(cdp))
  await open('properties')
  seen.listed = [...contexts, ...(await liveRows(cdp))]
  if (s.shoot) await shot(cdp, 'g16-add-list', TOP_LAYER)
  if (s.ceiling) seen.ceiling = await cdp.evaluate(scrolling(TOP_LAYER))
  if (s.plus) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 4, y: 4, button: 'none' })
    await sleep(600)
    seen.plus = await cdp.evaluate(`getComputedStyle(${s.plus('properties')}).opacity`)
  }

  await slide('properties', ADD.select.label)
  seen.bars.Select = await barOf(cdp)
  seen.newOption = await newOptionShown(cdp)
  if (s.shoot) await shot(cdp, 'g16-slid-select', TOP_LAYER)
  await mouseClick(cdp, BACK)
  await sleep(600)
  const back = { list: !!(await cdp.evaluate(`!!${entry(ADD.select.label)} && !${BACK}`)), kept: text() === start }
  await slide('properties', ADD.select.label)
  await pressKey(cdp, 'Escape')
  const escaped = { closed: !(await listUp(cdp)), kept: text() === start }
  await slide('properties', ADD.select.label)
  await outside()
  const pressed = { closed: await settles(async () => !(await listUp(cdp)), 2000), kept: text() === start }
  seen.leaving = { back, escaped, pressed }
  await slide('properties', ADD.select.label)
  await pickOption('Red')
  seen.select = { closed: !(await listUp(cdp)), wrote: await settles(async () => text().includes('Red')), row: s.card || (await shows(ADD.select.id)) }

  await slide('properties', ADD.multi.label)
  seen.bars.Multi = await barOf(cdp)
  await pickOption('One')
  const first = { open: await cdp.evaluate(`!!${BACK}`), left: await cdp.evaluate(`![...document.querySelectorAll('${PANE_LAYER} [role=button]')].some((e) => e.textContent.trim() === ${JSON.stringify(ADD.multi.label)})`) }
  await pickOption('Two')
  seen.multi = { first, open: await cdp.evaluate(`!!${BACK}`), wrote: await settles(async () => text().includes('One') && text().includes('Two')), row: s.card || (await shows(ADD.multi.id)) }

  await slide('properties', ADD.status.label)
  seen.bars.Status = await barOf(cdp)
  seen.status = { options: (await optionRows(cdp)).map((o) => o.label), groups: await statusDividers(cdp), newOption: await newOptionShown(cdp) }
  await pickOption('Open')
  Object.assign(seen.status, { closed: !(await listUp(cdp)), wrote: await settles(async () => text().includes('Open')) })

  await slide('contexts', 'Areas')
  seen.bars.Context = await barOf(cdp)
  if (s.spacesShot) await shot(cdp, 'g16-panel-spaces-bar', TOP_LAYER)
  const spaces = await optionRows(cdp)
  const before = text()
  await mouseClick(cdp, entry(spaces[0]?.label))
  await sleep(700)
  seen.context = { spaces, open: await cdp.evaluate(`!!${BACK}`), newOption: await newOptionShown(cdp), wrote: await settles(async () => text() !== before && text().includes(spaces[0]?.label)) }

  await slide('contexts', EMPTY_CONTEXT)
  seen.emptyContext = { options: await optionRows(cdp), back: await cdp.evaluate(`!!${BACK}`) }
  await slide('properties', ADD.bare.label)
  seen.emptySelect = { options: await optionRows(cdp), newOption: await newOptionShown(cdp) }

  const days = {}
  for (const [leaveBy, n] of [['Back', 10], ['Escape', 11], ['an outside press', 12]]) {
    await reset()
    await slide('properties', ADD.due.label)
    if (leaveBy === 'Back') {
      seen.bars.Date = await barOf(cdp)
      seen.calendarScrolls = await cdp.evaluate(scrolling(CAL))
      if (s.shoot) await shot(cdp, 'g16-slid-calendar', TOP_LAYER)
    }
    const watcher = await watch([s.file])
    await mouseClick(cdp, dayOf(n))
    const stays = await cdp.evaluate(`!!${CAL}`)
    if (leaveBy === 'Back') await mouseClick(cdp, BACK)
    else if (leaveBy === 'Escape') await pressKey(cdp, 'Escape')
    else await outside()
    await sleep(900)
    const { writes } = await watcher.stop()
    days[leaveBy] = { stays, writes: writes[s.file], held: text().includes(`-${n}`) }
  }
  await reset()
  await slide('properties', ADD.due.label)
  await mouseClick(cdp, dayOf(13))
  await mouseClick(cdp, dayOf(14))
  await mouseClick(cdp, BACK, { settle: 0 })
  await slideTo(cdp, ADD.start.label)
  days.startSelected = await selectedDays(cdp)
  await pressKey(cdp, 'Escape')
  days.twoDays = await settles(async () => text().includes('-14') && !text().includes('-13'))
  seen.date = days

  if (s.listsCheck) {
    await open('properties')
    await click(cdp, entry(ADD.check.label))
    const checked = { closed: await settles(async () => !(await listUp(cdp)), 2000), wrote: await settles(async () => /Add Check"?:\s*true/.test(text())) }
    const box = `document.querySelector('${s.checkbox}.cell-checkbox')`
    await until('the drawn checkbox', () => cdp.evaluate(`!!${box}`))
    await sleep(500)
    await mouseClick(cdp, box)
    seen.check = { ...checked, unchecked: await settles(async () => !/Add Check"?:\s*true/.test(text())), drawn: await cdp.evaluate(`!!${box}`) }
  }

  const dialogs = await inMain('__drive.dialogs')
  const unfiled = text()
  await open('properties')
  await click(cdp, entry(ADD.file.label))
  await sleep(1000)
  seen.file = { dialog: (await inMain('__drive.dialogs')) === dialogs + 1, closed: !(await listUp(cdp)), kept: text() === unfiled, noRow: s.card || !(await shows(ADD.file.id)) }
  if (s.picks) {
    await inMain(`__drive.picks.push(${JSON.stringify(s.picks)})`)
    await open('properties')
    await click(cdp, entry(ADD.file.label))
    seen.file.chip = await settles(() => cdp.evaluate(`!!document.querySelector('${s.checkbox}[data-file-chip-index]')`))
  }

  const typed = {}
  for (const [k, word] of [['number', '7'], ['text', 'typed words'], ['link', 'https://example.org']]) {
    await open('properties')
    await click(cdp, entry(ADD[k].label))
    await sleep(900)
    const pane = await cdp.evaluate(`({
      layer: !!${TOP_LAYER} && !${TOP_LAYER}.querySelector('[role=button]'),
      textPane: !!document.querySelector('${PANE}'),
      inRow: !!document.activeElement?.closest('[data-property-row="${ADD[k].id}"]'),
      empty: (document.activeElement?.tagName === 'INPUT' ? document.activeElement.value : document.activeElement?.cmTile?.root.view.state.doc.toString()) === '',
    })`)
    if (s.typedShot && k === 'number') await shot(cdp, 'g16-panel-typed-row', `document.querySelector('${s.scope}[data-property-row="${ADD.number.id}"]')`)
    await typeText(cdp, word)
    await pressKey(cdp, k === 'text' && s.card ? 'Escape' : 'Enter')
    await leaveList(cdp)
    typed[k] = { ...pane, landed: await settles(async () => text().includes(word)) }
  }
  seen.typed = typed
  await leaveList(cdp)
  return seen
}

async function group16(cdp) {
  const keptContexts = read(CONTEXTS_REL)
  const keptSpace = read(SPACE_FILE)
  const putBack = await seedCollection(cdp, Object.values(ADD), [ADD_STANDARD, ADD_COMPACT, ADD_TABLE])
  await must('the empty Context', ask(cdp, 'mutate', { op: 'createContextGroup', id: ulid(), name: EMPTY_CONTEXT }))
  await createPage(cdp, 'Add Blank')
  await createPage(cdp, 'Add Held', {
    [ADD.select.id]: { kind: 'select', value: 'opt_drive_add_red' },
    [ADD.text.id]: { kind: 'text', value: 'held words' },
  })
  const blank = pageFile('Add Blank')
  const picked = join(tmpdir(), 'Add Drive.pdf')
  writeFileSync(picked, '%PDF-1.4\n')

  await showView(cdp, ADD_TABLE)
  await mouseClick(cdp, `${row('Add Blank')}.querySelectorAll('.data-cell')[1]`)
  await until('the Select cell’s picker', () => paneOpen(cdp))
  const cellRows = await liveRows(cdp)
  item(16, 'MP-B-1', "a Table's empty cell opens its own value's list, no Add list and no back bar",
    cellRows.length > 0 && cellRows.every((r) => !r.slides) && !(await cdp.evaluate(`!!${BACK}`)), show(cellRows))
  await escapeAll(cdp)

  await viewFrame(cdp, 'Visibility')
  const settingsBar = await barOf(cdp, SETTINGS_BAR)
  const controlRight = await cdp.evaluate(`(() => {
    let pane = (${SETTINGS_BAR}).parentElement
    while (!pane.querySelector('[aria-label^="Show "], [aria-label^="Hide "]')) pane = pane.parentElement
    return [...pane.querySelectorAll('[aria-label^="Show "], [aria-label^="Hide "]')].find((e) => !e.closest('[inert]')).getBoundingClientRect().right
  })()`)
  const visibility = await cdp.evaluate('document.body.innerText')
  item(16, 'MP-C-6', 'Visibility lists Creation Time and Last Modified', STAMPS.every((t) => visibility.includes(t)))
  item(16, 'MP-C-3', "a settings pane's back bar keeps its label flush with the bar and the controls beneath it",
    settingsBar?.labelMargin === '0px' && Math.abs(settingsBar.labelRight - settingsBar.barRight) < 0.5 && Math.abs(settingsBar.labelRight - controlRight) < 0.5, show({ settingsBar, controlRight }))
  await escapeAll(cdp)
  await closeToolbarSettings(cdp)

  await openPage(cdp, 'Add Held')
  await openPanel(cdp)
  await mouseClick(cdp, sel('[aria-label="Add Property"]'))
  await until('the Add list', () => listUp(cdp))
  const heldPanel = (await liveRows(cdp)).map((r) => r.label)
  await escapeAll(cdp)
  await closePanel(cdp)
  item(16, 'MP-C-5', "the panel's Add list leaves out what the item holds", !heldPanel.includes(ADD.select.label) && !heldPanel.includes(ADD.text.label), show(heldPanel))

  const zone = (title) => `(() => { const c = ${shownEl(`[data-rid="${pageIds[title]}"]`)}; return c.querySelector('.card-props') ?? c.querySelector('.card-text') })()`
  const cardSurface = (name, view, extra) => ({
    name, view, card: true, file: pagePath('Add Blank'), checkbox: `[data-rid="${pageIds['Add Blank']}"] `,
    open: () => click(cdp, zone('Add Blank')),
    ...extra,
  })
  const plusOf = (scope) => (group) => `document.querySelector('${scope}[aria-label="${group === 'contexts' ? 'Add Context' : 'Add Property'}"]')`
  const panelSurface = (name, file, scope, ready, extra) => ({
    name, file, scope, checkbox: `${scope}[data-property-row="${ADD.check.id}"] `, listsCheck: true, plus: plusOf(scope),
    open: async (group) => {
      await ready()
      await mouseClick(cdp, plusOf(scope)(group))
    },
    ...extra,
  })
  const pagePanel = async () => {
    if ((await activeTab(cdp)) !== 'Add Blank') {
      await showView(cdp, ADD_TABLE)
      await openPage(cdp, 'Add Blank')
    }
    await openPanel(cdp)
  }
  const sidePane = async () => {
    if (await cdp.evaluate(`!!document.querySelector('.window-side-pane [aria-label="Add Property"]')`)) return
    await closePanel(cdp)
    await showView(cdp, ADD_TABLE)
    await openPage(cdp, 'Add Blank')
    await openSidePane(cdp, 'Add Blank')
    await until("the side pane's Add", () => cdp.evaluate(`!!document.querySelector('.window-side-pane [aria-label="Add Property"]')`))
  }
  const spacePanel = async () => {
    if ((await activeTab(cdp)) !== 'Area One') {
      await closePanel(cdp)
      if (!(await cdp.evaluate(`!!(${sidebarRow('Area One')})`))) await click(cdp, ribbon('Contexts'))
      await until('Area One in the sidebar', () => cdp.evaluate(`!!(${sidebarRow('Area One')})`))
      await click(cdp, sidebarRow('Area One'))
      await until("Area One's tab", async () => (await activeTab(cdp)) === 'Area One')
      await sleep(800)
    }
    await openPanel(cdp)
  }

  const surfaces = [
    cardSurface('Standard card', ADD_STANDARD, { listsCheck: true, shoot: true, ceiling: true, picks: picked }),
    cardSurface('Compact card', ADD_COMPACT),
    panelSurface('page dropdown', pagePath('Add Blank'), '', pagePanel, { spacesShot: true, typedShot: true }),
    panelSurface('SidePane', pagePath('Add Blank'), '.window-side-pane ', sidePane),
    panelSurface('Space dropdown', SPACE_FILE, '', spacePanel),
  ]
  const ran = {}
  for (const s of surfaces) {
    if (s.name === 'Space dropdown') {
      await spacePanel()
      await mouseClick(cdp, liveRow('Add Property'))
      await until('the Add list', () => listUp(cdp))
      await sleep(500)
      const pane = await layerBox(cdp)
      const standing = await boxOf(cdp, liveRow('Add Property'))
      ran.hop = { pane, standing }
      await shot(cdp, 'g16-panel-row-anchored')
      await leaveList(cdp)
    }
    if (s.view) await showView(cdp, s.view)
    ran[s.name] = await addEntries(cdp, s)
    if (s.name === 'SidePane') await closePageWindow(cdp)
    if (s.view) await must(`${s.name}'s view as it was`, ask(cdp, 'views:save', COLLECTION, 'collection', s.view, layoutOf(s.view)))
    writeFileSync(join(NEXUS, s.file), s.file === SPACE_FILE ? keptSpace : blank)
    await sleep(800)
  }
  await closePanel(cdp)
  await click(cdp, ribbon('Collections'))
  await until('Collection A in the sidebar', () => cdp.evaluate(`!!(${sidebarRow(COLLECTION)})`))
  const all = Object.entries(ran).filter(([k]) => k !== 'hop')
  const every = (f) => all.every(([, r]) => f(r))
  const of = (f) => show(Object.fromEntries(all.map(([k, r]) => [k, f(r)])))

  const slideRight = (r, name) => {
    const expected = name === 'Compact card' ? ENTRIES.filter((l) => l !== ADD.check.label) : ENTRIES
    const labels = r.listed.map((x) => x.label)
    return expected.every((l) => labels.includes(l)) && r.listed.every((x) => x.slides === SLIDING.includes(x.label))
  }
  const standard = ran['Standard card']
  item(16, 'MP-C-1 MP-B-5', `"›" draws on exactly the ${SLIDING.length} rows that slide, on every surface (at HEAD every fillable row wore one, Checkbox, Number, Text, Link, and File included)`,
    all.every(([k, r]) => slideRight(r, k)), of((r) => r.listed.map((x) => `${x.label}${x.slides ? ' ›' : ''}`)))
  item(16, 'MP-C-5', 'a Compact card lists its blanks and leaves out the Checkbox it draws',
    !ran['Compact card'].listed.some((x) => x.label === ADD.check.label) && ran['Compact card'].listed.length === ENTRIES.length - 1, of((r) => r.listed.length))
  item(16, 'MP-C-6', 'Creation Time and Last Modified are absent from every Add list (at HEAD both were listed)',
    every((r) => !r.listed.some((x) => STAMPS.includes(x.label))), of((r) => r.listed.map((x) => x.label)))
  const ceiling = standard.ceiling?.[0]
  item(16, 'MP-C-4', `a ${standard.listed.length}-row list caps at ${ceiling?.height}px and scrolls its ${ceiling?.content}px (at HEAD a 15-row list stood 365px)`,
    ceiling?.height === 240 && ceiling.content > 240, show(standard.ceiling))
  item(16, 'MP-C-4', 'the calendar slid in from the Add list never scrolls', every((r) => r.calendarScrolls.length === 0), of((r) => r.calendarScrolls))

  const bars = all.flatMap(([k, r]) => Object.entries(r.bars).map(([type, b]) => ({ at: `${k} ${type}`, ...b })))
  const ref = bars[0]
  const shape = (b) => `${b.height}px tall, ${b.padding} padding, a ${b.glyph}px glyph`
  item(16, 'MP-C-3 MP-C-4', `the back bar stands ${shape(ref)} across Select, Multi, Status, Context, and Date on every surface, matching a settings pane's bar (at HEAD 14px tall, no padding, a 12px glyph)`,
    bars.length === all.length * 5 && bars.every((b) => b.height === ref.height && b.padding === ref.padding && b.glyph === ref.glyph) &&
      ref.height === settingsBar.height && ref.padding === settingsBar.padding && ref.glyph === settingsBar.glyph, show({ bars, settingsBar }))
  item(16, 'MP-C-3', `on a picker's surface the bar's label sits ${ref.inset}px in from the pane's right edge on every type and surface, as far in as the chevron draws from its left (${ref.chevron}px)`,
    bars.every((b) => Math.abs(b.inset - 8) <= 0.75 && Math.abs(b.inset - b.chevron) <= 1.5), show(bars.map((b) => ({ at: b.at, inset: b.inset, chevron: b.chevron }))))
  item(16, 'MP-B-4', 'a slid Context\'s bar reads "Spaces" on cards and panels alike', every((r) => r.bars.Context.text.startsWith('Spaces')), of((r) => r.bars.Context.text))

  item(16, 'MP-C-1', 'a Select slides in with New Option', every((r) => r.newOption), of((r) => r.newOption))
  item(16, 'MP-C-2', "Back, Escape, and an outside press from a slid Select each write nothing, Back returning to the list and the other two closing everything",
    every((r) => r.leaving.back.list && r.leaving.back.kept && r.leaving.escaped.closed && r.leaving.escaped.kept && r.leaving.pressed.closed && r.leaving.pressed.kept), of((r) => r.leaving))
  item(16, 'MP-C-1 MP-C-2', "a Select's pick writes and closes everything, and the panel shows its row", every((r) => r.select.closed && r.select.wrote && r.select.row), of((r) => r.select))
  item(16, 'MP-C-1', 'a Multi-Select stays open across picks, outliving its entry leaving the list, and writes both',
    every((r) => r.multi.first.open && r.multi.first.left && r.multi.open && r.multi.wrote && r.multi.row), of((r) => r.multi))
  item(16, 'MP-C-1', 'a Status slides in with its groups behind a divider and no New Option, and its pick closes everything',
    every((r) => same(r.status.options, ['Open', 'Closed']) && r.status.groups === 1 && !r.status.newOption && r.status.closed && r.status.wrote), of((r) => r.status))
  item(16, 'MP-C-1', 'a Context slides into pick-only Space rows, no New Option, and stays open across a pick that writes',
    every((r) => r.context.spaces.length > 0 && r.context.spaces.every((o) => !o.lineRow) && !r.context.newOption && r.context.open && r.context.wrote), of((r) => r.context))
  item(16, 'MP-C-1', 'an empty Select slides to New Option alone, and an empty Context to an empty pane under its back bar',
    every((r) => r.emptySelect.options.length === 0 && r.emptySelect.newOption && r.emptyContext.options.length === 0 && r.emptyContext.back), of((r) => ({ select: r.emptySelect, context: r.emptyContext })))
  item(16, 'MP-C-1 MP-C-2', 'a day picked in a slid calendar keeps the pane and writes once, left by Back, Escape, or an outside press',
    every((r) => ['Back', 'Escape', 'an outside press'].every((k) => r.date[k].stays && r.date[k].writes === 1 && r.date[k].held)), of((r) => r.date))
  item(16, 'MP-C-1', 'two days picked keep only the last, and a second date slides in blank', every((r) => r.date.twoDays && r.date.startSelected.length === 0), of((r) => ({ twoDays: r.date.twoDays, start: r.date.startSelected })))
  const checks = all.filter(([, r]) => r.check)
  item(16, 'MP-C-1', 'a Checkbox acts from the list, checked with nothing left open, and unchecking keeps it drawn',
    checks.length === all.length - 1 && checks.every(([, r]) => r.check.closed && r.check.wrote && r.check.unchecked && r.check.drawn), show(Object.fromEntries(checks.map(([k, r]) => [k, r.check]))))
  item(16, 'MP-C-2', 'a File opens the dialog and closes the list, and a cancel writes nothing and leaves no row in a panel',
    every((r) => r.file.dialog && r.file.closed && r.file.kept && r.file.noRow), of((r) => r.file))
  item(16, 'MP-C-1', "a File's picked path adopts a chip on the card", standard.file.chip, show(standard.file))
  const typed = (k, onCard) => all.every(([name, r]) => r.typed[k].landed && r.typed[k].empty !== false && (name.endsWith('card') ? onCard(r.typed[k]) : r.typed[k].inRow))
  item(16, 'MP-C-2', 'a Number pops a small empty window on a card and its row field in a panel, and typing lands', typed('number', (t) => t.layer), of((r) => r.typed.number))
  item(16, 'MP-C-2', 'a Text pops TextPane on a card and its row field in a panel, and typing lands', typed('text', (t) => t.textPane), of((r) => r.typed.text))
  item(16, 'MP-C-2', 'a Link pops an empty field on a card and its row field in a panel, and typing lands', typed('link', (t) => t.layer), of((r) => r.typed.link))
  const panels = all.filter(([k]) => !k.endsWith('card'))
  item(16, 'MP-B-1', "a panel's + stays shown while its list is open", panels.every(([, r]) => r.plus === '1'), show(Object.fromEntries(panels.map(([k, r]) => [k, r.plus]))))
  const { pane, standing } = ran.hop
  item(16, 'MP-B-1', "a Space's standing Add row opens the list hanging from the row itself",
    Math.abs(pane.top - standing.bottom) <= 12 || Math.abs(standing.top - pane.bottom) <= 12, show(ran.hop))

  await showView(cdp, ADD_STANDARD)
  await click(cdp, zone('Add Held'))
  await until("Add Held's list", () => cdp.evaluate(`!!${entry(ADD.text.label)}`))
  await sleep(500)
  const held = await liveRows(cdp)
  const tail = held.slice(-2).map((r) => r.label)
  await click(cdp, entry(ADD.text.label))
  const shown = await settles(async () => !(await listUp(cdp)) && !viewOnDisk(ADD_STANDARD.id).hidden_properties.includes(ADD.text.id))
  const drawnHeld = await cdp.evaluate(`${shownEl(`[data-rid="${pageIds['Add Held']}"]`)}.textContent.includes('held words')`)
  item(16, 'MP-C-5 MP-C-7', "a held hidden value lists after every fillable row with no \"›\", and its press shows the property in the saved view and closes the list",
    same([...tail].sort(), [ADD.select.label, ADD.text.label]) && held.slice(-2).every((r) => !r.slides) && shown && drawnHeld, show({ held, shown, drawnHeld }))

  rmSync(picked)
  await putBack(['Add Blank', 'Add Held'])
  writeFileSync(join(NEXUS, CONTEXTS_REL), keptContexts)
  rmSync(join(NEXUS, '.nexus/contexts', EMPTY_CONTEXT), { recursive: true, force: true })
  await until('the empty Context leaves', async () => !(await ask(cdp, 'nexus:state')).value.tree.contexts.some((g) => g.def.title === EMPTY_CONTEXT))
}

// ── Group 18 — Placement ────────────────────────────────────────────────────

const PLACE = {
  due: { id: 'prop_drive_place_due', label: 'Place Due', key: 'Place Due', type: 'dateTime' },
  tall: {
    id: 'prop_drive_place_tall', label: 'Place Tall', key: 'Place Tall', type: 'select',
    select_options: Array.from({ length: 40 }, (_, i) => ({ id: `opt_drive_tall_${i + 1}`, key: `Tall ${i + 1}`, label: `Tall Option Number ${i + 1}, Labelled Long` })),
  },
  notes: { id: 'prop_drive_place_notes', label: 'Place Notes', key: 'Place Notes', type: 'text' },
}
// Visibility lists every property, so these make it taller than the settings' root.
const PLACE_FILLERS = fillers('Place', 10)
const onlyPlaces = { match: 'all', rules: [{ property_id: '_title', op: 'starts_with', value: 'Place ' }] }
const PLACE_TABLE = {
  id: 'view_01KZPROPERTIESDRIVE18TBL', name: 'Place Table', type: 'table', hidden_properties: [],
  property_order: ['_title', PLACE.due.id, PLACE.tall.id], filter: onlyPlaces, filter_enabled: true,
}
const PLACE_CARDS = {
  id: 'view_01KZPROPERTIESDRIVE18CRD', name: 'Place Cards', type: 'cards', hidden_properties: [],
  property_order: ['_title', PLACE.notes.id], filter: onlyPlaces, filter_enabled: true,
}

async function group18(cdp) {
  const putBack = await seedCollection(cdp, [...Object.values(PLACE), ...PLACE_FILLERS], [PLACE_TABLE, PLACE_CARDS])
  await createPage(cdp, 'Place One', {
    [PLACE.due.id]: { kind: 'dateTime', value: '2026-10-22T09:30' },
    [PLACE.notes.id]: { kind: 'text', value: 'words' },
  })
  await homeTile(cdp, PLACE_TABLE.id)
  const cell = (n) => `${shownEl(`.tile .data-row[data-rid="${pageIds['Place One']}"]`)}.querySelectorAll('.data-cell')[${n}]`
  await until('the tile’s row', () => cdp.evaluate(`!!${shownEl(`.tile .data-row[data-rid="${pageIds['Place One']}"]`)}`))

  const natural = await cdp.evaluate('innerHeight')
  const low = await windowHeight(cdp, 600)
  item(18, 'MP-E-1', 'a low window reads back the height it was given', Math.abs(low - 600) <= 1 && low < natural, show({ natural, low }))

  // The root's and Visibility's heights, read anywhere, then the window sized so the root fits below and Visibility doesn't.
  await mouseClick(cdp, VIEW_SETTINGS)
  await until('the settings pane', () => portalOpen(cdp))
  await sleep(600)
  const rootBox = await layerBox(cdp)
  await mouseClick(cdp, liveRow('Visibility'))
  await sleep(900)
  const shownBox = await layerBox(cdp)
  await escapeAll(cdp)
  await roomBelow(cdp, VIEW_SETTINGS, Math.round((rootBox.height + shownBox.height) / 2))
  await mouseClick(cdp, VIEW_SETTINGS)
  await until('the settings pane', () => portalOpen(cdp))
  await sleep(600)
  const opened = await layerBox(cdp)
  const flip = await framesOf(cdp, () => mouseClick(cdp, liveRow('Visibility'), { settle: 0 }))
  const flipped = await layerBox(cdp)
  const trigger = await boxOf(cdp, VIEW_SETTINGS)
  item(18, 'MP-E-1', "a View Tile's Visibility, outgrowing the room below its trigger, flips above it",
    opened.side === 'down' && flipped.side === 'up' && flipped.bottom <= trigger.top, show({ rootBox, shownBox, opened, flipped, trigger }))
  const step = largestStep(flip)
  item(18, 'MP-E-1', `the flip keeps every frame inside the window, its largest per-frame step ${step}px under 60px`,
    insideWindow(flip) && step < 60, show({ step, frames: flip }))
  await shot(cdp, 'g18-visibility-flipped', TOP_LAYER)

  const back = await framesOf(cdp, () => mouseClick(cdp, BACK, { settle: 0 }))
  const returned = await layerBox(cdp)
  item(18, 'MP-E-1', 'Back from the flip stays above its trigger, the edge it hangs from never moving',
    returned.side === 'up' && returned.bottom <= trigger.top && insideWindow(back) && back.every((f) => f.side === 'up' && Math.abs(f.bottom - back[0].bottom) < 1),
    show({ returned, back }))
  await shot(cdp, 'g18-visibility-back', TOP_LAYER)
  await escapeAll(cdp)

  // A short window with the cell high in it, so the list has more room above than below and neither side holds it.
  const resting = (await boxOf(cdp, cell(2))).top
  await windowHeight(cdp, 400)
  await scrollTo(cdp, cell(2), 200)
  const tall = await framesOf(cdp, () => mouseClick(cdp, cell(2), { settle: 0 }))
  const list = await layerBox(cdp)
  const tallCell = await boxOf(cdp, cell(2))
  item(18, 'MP-E-1', 'a 40-option list near the foot of a short window opens above its cell from the start and never moves again',
    tall.length > 0 && tall.every((f) => f.side === 'up' && f.top === tall[0].top && f.bottom === tall[0].bottom), show({ list, tall }))
  item(18, 'MP-E-1', 'a list neither side holds is fenced at the top margin, inside the window, over its cell',
    list.top >= 0 && list.top < 10 && list.bottom <= list.view && list.bottom > tallCell.top, show({ list, tallCell }))
  await shot(cdp, 'g18-fence-top')
  await escapeAll(cdp)
  await naturalWindow(cdp)
  await scrollTo(cdp, cell(2), resting)

  // The calendar's height closed and with End Date on, then the window sized so the closed one fits below and the grown one doesn't.
  await mouseClick(cdp, cell(1))
  await until('the calendar', () => cdp.evaluate(`!!${CAL}`))
  await sleep(600)
  const single = await layerBox(cdp, CAL)
  await mouseClick(cdp, END_DATE)
  await sleep(700)
  const spanned = await layerBox(cdp, CAL)
  await mouseClick(cdp, END_DATE)
  await sleep(700)
  await escapeAll(cdp)
  await roomBelow(cdp, cell(1), Math.round((single.height + spanned.height) / 2))
  await mouseClick(cdp, cell(1))
  await until('the calendar', () => cdp.evaluate(`!!${CAL}`))
  await sleep(600)
  const before = await layerBox(cdp, CAL)
  await mouseClick(cdp, END_DATE)
  await sleep(700)
  const risen = await layerBox(cdp, CAL)
  item(18, 'MP-E-1', "a popped calendar's End Date at the window's edge rises inside the window rather than flipping",
    before.side === 'down' && risen.side === 'down' && risen.top < before.top && risen.bottom <= risen.view, show({ single, spanned, before, risen }))
  await shot(cdp, 'g18-end-date-risen', CAL)
  await mouseClick(cdp, END_DATE)
  await escapeAll(cdp)
  await naturalWindow(cdp)

  const clockFormat = (await config(cdp)).personalization.timeFormat
  await must('the 24-hour clock', ask(cdp, 'personalization:set', 'timeFormat', 'twentyFourHour'))
  await mouseClick(cdp, cell(1))
  await until('the calendar', () => cdp.evaluate(`!!${CAL}`))
  await sleep(600)
  const parts = await cdp.evaluate(`${clockParts}.map((b) => b.textContent.trim())`)
  item(18, 'MP-E-5', 'the 24-hour clock draws its hour padded and no AM or PM', same(parts, ['09', '30']), show(parts))

  const nested = {}
  for (const [name, part, pick] of [['Month', MONTH, 'November'], ['Year', YEAR, '2027'], ['Hour', HOUR, '10'], ['Minute', MINUTE, '45']]) {
    await mouseClick(cdp, part)
    await until(`the ${name} list`, async () => (await layerCount(cdp)) === 2)
    await sleep(400)
    const [pane, over] = [await layerBox(cdp, CAL), await layerBox(cdp)]
    if (name === 'Month') await shot(cdp, 'g18-month-nested', CAL)
    await click(cdp, rowIn(TOP_LAYER, pick))
    const landed = await settles(async () => (await layerCount(cdp)) === 1 && (await cdp.evaluate(`${part}.textContent.trim()`)) === pick, 3000)
    nested[name] = { over: overlaps(pane, over), landed }
  }
  item(18, 'MP-E-5', 'Month, Year, Hour, and Minute each open nested over the calendar, and a pick lands',
    Object.values(nested).every((n) => n.over && n.landed), show(nested))
  await escapeAll(cdp)
  await must('the clock as it was', ask(cdp, 'personalization:set', 'timeFormat', clockFormat))

  // TextPane's height on the card, then the window sized so it opens below with less than a line to spare.
  await showView(cdp, PLACE_CARDS)
  const value = shownEl(`[data-rid="${pageIds['Place One']}"] .card-value`)
  await until('the card’s value', () => cdp.evaluate(`!!${value}`))
  await openPane(cdp, value)
  const pane = await layerBox(cdp)
  await escapeAll(cdp)
  await roomBelow(cdp, value, Math.round(pane.height) + 6)
  await openPane(cdp, value)
  const lines = [await layerBox(cdp)]
  const grew = []
  for (const word of ['two', 'three', 'four', 'five']) {
    grew.push(...(await framesOf(cdp, () => pressKey(cdp, 'Enter', SHIFT), { resizes: true })))
    await typeText(cdp, word)
    lines.push(await layerBox(cdp))
  }
  const rises = lines.slice(1).filter((l, i) => l.top < lines[i].top).length
  item(18, 'MP-E-1', 'TextPane on a low card rises line by line, keeping its side and the window',
    lines.every((l) => l.side === 'down' && l.bottom <= l.view) && lines.slice(1).every((l, i) => l.top <= lines[i].top) && rises >= 2, show({ rises, lines }))
  const overflow = Math.round(Math.max(0, ...grew.map((f) => Math.max(-f.top, f.bottom - f.view))))
  item(18, 'MP-E-1', 'each Shift-Enter keeps TextPane inside the window on every frame', insideWindow(grew), show({ overflow, frames: grew }))
  await shot(cdp, 'g18-textpane-risen', TOP_LAYER)

  await naturalWindow(cdp)
  await createPage(cdp, 'Place Two')
  const placeCard = (title) => shownEl(`[data-rid="${pageIds[title]}"]`)
  const cardText = `${placeCard('Place Two')}.querySelector('.card-text')`
  const openAddOn = async (title) => {
    await escapeAll(cdp)
    await until(`${title}'s card`, () => cdp.evaluate(`!!${placeCard(title)}`))
    await click(cdp, `${placeCard(title)}.querySelector('.card-props')`)
    await until('the Add list', () => cdp.evaluate(`!!${entry(PLACE.due.label)}`))
    await sleep(500)
  }
  await openAddOn('Place Two')
  const addList = await layerBox(cdp)
  await slideTo(cdp, PLACE.due.label)
  const slidCalendar = await layerBox(cdp)
  await roomBelow(cdp, cardText, Math.round((addList.height + slidCalendar.height) / 2))
  await openAddOn('Place Two')
  const listed = await layerBox(cdp)
  const slid = await framesOf(cdp, () => click(cdp, entry(PLACE.due.label)))
  const flippedCalendar = await layerBox(cdp)
  const text = await boxOf(cdp, cardText)
  item(18, 'MP-E-1', "a low card's calendar, slid in from an Add list that fits below, ends above the card inside the window on every frame",
    listed.side === 'down' && flippedCalendar.side === 'up' && flippedCalendar.bottom <= text.top && insideWindow(slid), show({ addList, slidCalendar, listed, flippedCalendar, text }))
  await shot(cdp, 'g18-card-calendar-flipped', TOP_LAYER)
  await mouseClick(cdp, END_DATE)
  await sleep(700)
  const spannedUp = await layerBox(cdp)
  item(18, 'MP-E-1', 'End Date on the flipped calendar rises from the edge it hangs from, inside the window',
    spannedUp.side === 'up' && Math.abs(spannedUp.bottom - flippedCalendar.bottom) < 1 && spannedUp.top < flippedCalendar.top && spannedUp.top >= 0, show({ flippedCalendar, spannedUp }))
  await mouseClick(cdp, END_DATE)
  await sleep(700)
  const backFrames = await framesOf(cdp, () => mouseClick(cdp, BACK, { settle: 0 }))
  const relisted = await layerBox(cdp)
  item(18, 'MP-E-1', 'Back from the flipped calendar returns to the list above the card, the edge it hangs from never moving',
    relisted.side === 'up' && insideWindow(backFrames) && backFrames.every((f) => f.side === 'up' && Math.abs(f.bottom - backFrames[0].bottom) < 1), show({ relisted, backFrames }))
  const long = await framesOf(cdp, () => click(cdp, entry(PLACE.tall.label)))
  const capped = await layerBox(cdp)
  item(18, 'MP-E-1', 'a 40-option list slid in on a low card stays inside the window on every frame, capped',
    insideWindow(long) && capped.top >= 0 && capped.bottom <= capped.view, show({ capped, long }))
  await escapeAll(cdp)
  await naturalWindow(cdp)

  await openAddOn('Place Two')
  await slideTo(cdp, PLACE.due.label)
  const edge = await cdp.evaluate(`(() => {
    const pane = ${TOP_LAYER}.getBoundingClientRect(), card = ${placeCard('Place Two')}.getBoundingClientRect()
    const row = [...document.querySelectorAll('[data-rid]')].filter((e) => e.getClientRects().length > 0 && Math.abs(e.getBoundingClientRect().top - card.top) < 2)
    return { left: pane.left, right: pane.right, view: innerWidth, last: row.every((e) => e.getBoundingClientRect().right <= card.right + 1) }
  })()`)
  item(18, 'MP-E-1', 'the last card in a row keeps its slid calendar inside the window', edge.last && edge.left >= 0 && edge.right <= edge.view, show(edge))
  await escapeAll(cdp)

  await showView(cdp, PLACE_TABLE)
  const placeRow = (title) => shownEl(`.data-row[data-rid="${pageIds[title]}"]`)
  await mouseClick(cdp, `${placeRow('Place One')}.querySelector('.cell-title-text')`)
  await until("Place One's tab", async () => (await activeTab(cdp)) === 'Place One')
  await sleep(800)
  const panelEnd = {}
  for (const [name, scope] of [['the dropdown', ''], ['the SidePane', '.window-side-pane ']]) {
    if (scope) {
      await closePanel(cdp)
      await openSidePane(cdp, 'Place One')
    } else await openPanel(cdp)
    const plus = `document.querySelector('${scope}[aria-label="Add Property"]')`
    await until(`${name}'s Add`, () => cdp.evaluate(`!!${plus}`))
    await mouseClick(cdp, plus)
    await until('the Add list', () => cdp.evaluate(`!!${entry(PLACE.tall.label)}`))
    await sleep(500)
    const frames = await framesOf(cdp, () => click(cdp, entry(PLACE.tall.label)))
    panelEnd[name] = { frames: frames.length, inside: insideWindow(frames), pane: await layerBox(cdp) }
    await leaveList(cdp)
  }
  await closePageWindow(cdp)
  item(18, 'MP-E-1', "Add at a panel's end, in the dropdown and the SidePane, keeps a slid 40-option list inside the window on every frame",
    Object.values(panelEnd).every((p) => p.inside), show(panelEnd))

  await showView(cdp, PLACE_TABLE)
  const optionCell = (title) => `${placeRow(title)}.querySelectorAll('.data-cell')[2]`
  await until('both rows', () => cdp.evaluate(`!!${placeRow('Place Two')}`))
  await mouseClick(cdp, optionCell('Place Two'))
  await until('the single pane', () => paneOpen(cdp))
  await sleep(500)
  const singlePane = await layerBox(cdp)
  await escapeAll(cdp)
  await sweep(cdp, await boxOf(cdp, optionCell('Place One')), await boxOf(cdp, optionCell('Place Two')), { steps: 6 })
  await until('the sweep pane', () => paneOpen(cdp))
  await sleep(500)
  const swept = await layerBox(cdp)
  await shot(cdp, 'g18-sweep-pane', TOP_LAYER)
  item(18, 'MP-B-8', `a sweep's pane opens on its last cell exactly where a single click there opens one, ${Math.round(swept.width)}px wide (at HEAD the mass pane sat 29px right of the single one)`,
    ['top', 'left', 'width', 'height'].every((k) => Math.abs(swept[k] - singlePane[k]) < 1), show({ singlePane, swept }))
  await escapeAll(cdp)
  await putBack(['Place One', 'Place Two'])
}

// ── Group 19 — Settings Panes ───────────────────────────────────────────────

/** Opens `open`'s list, then presses `press` beside it as a pointer does, reading what the press hit and left behind, and unless `again` is false presses it once more. A click listener on the pressed control counts what reached it. */
async function pressBeside(cdp, open, press, { again = true } = {}) {
  const base = await layerCount(cdp)
  await mouseClick(cdp, open)
  await until('the list', async () => (await layerCount(cdp)) > base)
  await sleep(400)
  const list = await layerBox(cdp)
  await cdp.evaluate(`(() => {
    const el = ${press}
    window.__pressed = el
    window.__presses = 0
    el.addEventListener('click', () => { window.__presses += 1 })
  })()`)
  const at = await boxOf(cdp, 'window.__pressed')
  const beside = !overlaps(list, { left: at.x, right: at.x, top: at.y, bottom: at.y })
  const hit = await cdp.evaluate(`(() => {
    const e = document.elementFromPoint(${at.x}, ${at.y})
    return e?.hasAttribute('data-dismissal-shield') ? 'shield' : window.__pressed.contains(e) ? 'control' : (e?.tagName ?? null)
  })()`)
  await mouseAt(cdp, at)
  const closed = await settles(async () => (await layerCount(cdp)) === base, 3000)
  const first = await cdp.evaluate('window.__presses')
  if (!again) return { beside, hit, closed, first }
  await mouseAt(cdp, at)
  const second = await cdp.evaluate('window.__presses')
  const reopened = (await layerCount(cdp)) > base
  if (reopened) await pressKey(cdp, 'Escape')
  return { beside, hit, closed, first, second, reopened }
}
const onlyClosed = (r, hit) => r.beside && r.hit === hit && r.closed && r.first === 0
const thenOpens = (r) => r.second === 1 && r.reopened

const PANES = { due: { id: 'prop_drive_panes_due', label: 'Panes Due', key: 'Panes Due', type: 'dateTime' } }
const PANES_TABLE = {
  id: 'view_01KZPROPERTIESDRIVE19TBL', name: 'Panes Table', type: 'table', hidden_properties: [],
  property_order: ['_title', PANES.due.id], filter: { match: 'all', rules: [{ property_id: '_title', op: 'is', value: 'Panes One' }] }, filter_enabled: true,
}
const TWO_RULES = { filter: { match: 'all', rules: [PANES_TABLE.filter.rules[0], { property_id: '_location', op: 'is', values: [] }] } }
const fieldTrigger = (n) => `[...document.querySelectorAll('[aria-label="Filter property"]')].filter((e) => !e.closest('[inert]'))[${n}]`
// Visibility and the Properties list list every property, so these carry both past the 440px ceiling.
const PANES_FILLERS = fillers('Panes', 16)
const PREVIEW_RULES = { rules: { match: 'all', rules: Array.from({ length: 12 }, (_, i) => ({ property_id: '_title', op: 'starts_with', value: `Rule ${i + 1}` })) }, enabled: true }
/** The settings pane holding `expr`: its frame's height and ceiling, whether its body scrolls, and how many slides it sits in. */
const paneFrame = (cdp, expr) => cdp.evaluate(`(() => {
  const f = (${expr}).closest('[style*="max-height"]')
  const body = f.querySelector(':scope > .scroll-fade')
  let slides = 0
  for (let e = f; e; e = e.parentElement) if (e.style?.transform.startsWith('translateX') && [...e.children].filter((c) => c.hasAttribute('inert')).length === 1) slides++
  return { height: Math.round(f.getBoundingClientRect().height), ceiling: f.style.maxHeight, scrolls: body.scrollHeight > body.clientHeight + 1, slides }
})()`)
const atCeiling = (f) => f.height === 440 && f.ceiling === '440px' && f.scrolls
const VIEWS_BUTTON = sel('button[title="Views"]')
const NEW_VIEW = shownEl('[aria-label="New View"]')
/** The view list's slide: the box around its track. */
const VIEW_SLIDE = `(() => { let e = ${NEW_VIEW}; while (e && !e.style.transform.startsWith('translateX')) e = e.parentElement; return e?.parentElement })()`
const VIEW_MENU = shownEl('[aria-label="View menu"]')
/** Open In Preview's Manage: the first one up from its label. */
const MANAGE_PREVIEW = `(() => {
  const manage = (r) => [...r.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Manage')
  let r = ${textEl('*', 'Open In Preview')}
  while (r && !manage(r)) r = r.parentElement
  return manage(r)
})()`

async function group19(cdp) {
  const putBack = await seedCollection(cdp, Object.values(PANES), [PANES_TABLE])
  await createPage(cdp, 'Panes One', { [PANES.due.id]: { kind: 'dateTime', value: '2026-10-22T09:30' } })
  const cards = (await views(cdp)).find((v) => v.type === 'cards')

  await showView(cdp, cards)
  await viewFrame(cdp, 'Layout')
  const toolbar = await pressBeside(cdp, liveEl('Card Scale'), liveEl('Card Image'))
  item(19, 'MP-E-3', "control: in the toolbar's Layout, which draws no shield of its own, a press on Card Image with Card Scale's list open lands on the list's shield and only closes it",
    onlyClosed(toolbar, 'shield'), show(toolbar))
  item(19, 'MP-E-3', "control: in the toolbar's Layout, a second press on Card Image opens its list", thenOpens(toolbar), show(toolbar))
  await escapeAll(cdp)

  await must('the two filter rules', ask(cdp, 'views:save', COLLECTION, 'collection', cards, TWO_RULES))
  // The tile high in the window, so its Layout opens below with room for Card Scale's list beneath it, as the toolbar's does.
  await homeTile(cdp, cards.id)
  await scrollTo(cdp, VIEW_SETTINGS, 100)
  await tileFrame(cdp, 'Layout')
  const tile = await pressBeside(cdp, liveEl('Card Scale'), liveEl('Card Image'))
  item(19, 'MP-E-3', "in a View Tile's Layout, a press on Card Image with Card Scale's list open lands on the list's shield and only closes it",
    onlyClosed(tile, 'shield'), show(tile))
  item(19, 'MP-E-3', "in a View Tile's Layout, a second press on Card Image opens its list", thenOpens(tile), show(tile))
  await shot(cdp, 'g19-tile-list-only-closes', TOP_LAYER)
  await escapeAll(cdp)

  await tileFrame(cdp, 'Filter')
  const tileFields = await pressBeside(cdp, fieldTrigger(1), fieldTrigger(0))
  item(19, 'MP-E-3', "in a View Tile's Filter, a press on the first rule's field with the second's list open lands on the list's own shield and only closes it",
    onlyClosed(tileFields, 'shield'), show(tileFields))
  item(19, 'MP-E-3', "in a View Tile's Filter, a second press on the first rule's field opens its list", thenOpens(tileFields), show(tileFields))
  await escapeAll(cdp)

  const popups = await inMain('__drive.seq')
  const handle = `${VIEW_SETTINGS}.closest('.tile').querySelector('.tile-handle')`
  // The handle comes forward of the tile's resize edge once the pointer rests on it.
  await hover(cdp, handle)
  await mouseClick(cdp, handle)
  const inApp = await settles(async () => (await cdp.evaluate(`${LAYERS}.some((e) => e.querySelector('[role=button]'))`)), 3000)
  const native = (await inMain('__drive.seq')) !== popups
  item(19, 'MP-D-6', "a tile's handle menu draws in-app in [data-picker-portal] and pops no native menu", inApp && !native, show({ inApp, native }))
  await shot(cdp, 'g19-tile-handle-menu', TOP_LAYER)
  await escapeAll(cdp)

  await showView(cdp, PANES_TABLE)
  const due = `${shownEl(`.data-row[data-rid="${pageIds['Panes One']}"]`)}.querySelectorAll('.data-cell')[1]`
  const openCalendar = async () => {
    await escapeAll(cdp)
    await mouseClick(cdp, due)
    await until('the calendar', () => cdp.evaluate(`!!${CAL}`))
    await sleep(600)
  }
  await openCalendar()
  const month = await pressBeside(cdp, MONTH, YEAR)
  item(19, 'MP-E-3', "a press on Year with Month's list open lands on the list's shield and only closes it", onlyClosed(month, 'shield'), show(month))
  item(19, 'MP-E-3', 'a second press on Year opens its list', thenOpens(month), show(month))
  await openCalendar()
  const hour = await pressBeside(cdp, HOUR, MINUTE)
  item(19, 'MP-E-3', "a press on Minute with Hour's list open reaches no shield, closes the list, and drops its click",
    onlyClosed(hour, 'control'), show(hour))
  item(19, 'MP-E-3', 'a second press on Minute opens its list', thenOpens(hour), show(hour))
  await openCalendar()
  await doubleClick(cdp, HOUR)
  const typing = await cdp.evaluate(`document.activeElement?.tagName === 'INPUT' && ${CAL}.contains(document.activeElement)`)
  const lists = await layerCount(cdp)
  item(19, 'MP-E-3', 'a double-click on Hour lands in its field with no list left open', typing && lists === 1, show({ typing, lists }))
  await escapeAll(cdp)

  await must('the two filter rules', ask(cdp, 'views:save', COLLECTION, 'collection', PANES_TABLE, TWO_RULES))
  await viewFrame(cdp, 'Filter')
  const fields = await pressBeside(cdp, fieldTrigger(1), fieldTrigger(0))
  item(19, 'MP-E-3', "control: in the toolbar's Filter, which draws no shield of its own, a press on the first rule's field with the second's list open only closes the list",
    onlyClosed(fields, 'shield'), show(fields))
  item(19, 'MP-E-3', "control: in the toolbar's Filter, a second press on the first rule's field opens its list", thenOpens(fields), show(fields))
  const filterPanes = await layerCount(cdp)
  await mouseClick(cdp, `[...document.querySelectorAll('[aria-label="Filter values"]')].find((e) => !e.closest('[inert]'))`)
  await until('the location pane', async () => (await layerCount(cdp)) > filterPanes)
  await sleep(400)
  const operator = `[...document.querySelectorAll('[aria-label="Filter operator"]')].find((e) => !e.closest('[inert]'))`
  await cdp.evaluate(`(() => { window.__presses = 0; (${operator}).addEventListener('click', () => { window.__presses += 1 }) })()`)
  await mouseClick(cdp, operator)
  const landed = await cdp.evaluate('window.__presses')
  const panes = await layerCount(cdp)
  item(19, 'MP-E-3', "a press beneath LocationField's focus-keep pane lands on the operator beneath, closing that pane and opening the operator's list",
    landed === 1 && panes === filterPanes + 1, show({ filterPanes, landed, panes }))
  await escapeAll(cdp)

  await openSettings(cdp, 'Pages & Writing')
  const slider = `[...document.querySelectorAll('[role=slider][aria-label^="Heading"]')].find((s) => {
    const b = s.getBoundingClientRect(), l = ${TOP_LAYER}.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2
    return (x < l.left || x > l.right || y < l.top || y > l.bottom) && y > 0 && y < innerHeight
  })`
  const was = await cdp.evaluate(`[...document.querySelectorAll('[role=slider][aria-label^="Heading"]')].map((s) => s.getAttribute('aria-valuenow'))`)
  const scale = await pressBeside(cdp, liveEl('Editor Scale'), slider, { again: false })
  const now = await cdp.evaluate(`[...document.querySelectorAll('[role=slider][aria-label^="Heading"]')].map((s) => s.getAttribute('aria-valuenow'))`)
  item(19, 'MP-E-3', "a press on a slider row with Editor Scale's list open only closes the list and leaves every slider as it was",
    scale.beside && scale.hit === 'shield' && scale.closed && same(was, now), show({ scale, was, now }))
  await closeSettings(cdp)

  // Seeded only now, so the lists the presses above open stay short.
  const unfill = await seedCollection(cdp, PANES_FILLERS, [])
  await showView(cdp, PANES_TABLE)
  const SETTINGS_PANE = `(${SETTINGS_BAR}).closest('[style*="max-height"]')`

  const titles = {}
  for (const frame of ['Group', 'Sort', 'Filter']) {
    await viewFrame(cdp, frame)
    titles[frame] = await cdp.evaluate(`${SETTINGS_BAR}?.textContent.trim()`)
    await closeToolbarSettings(cdp)
  }
  item(19, 'MP-F-4', 'Group opens "Grouping", Sort "Sorting", and Filter "Filtering"',
    titles.Group?.endsWith('Grouping') && titles.Sort?.endsWith('Sorting') && titles.Filter?.endsWith('Filtering'), show(titles))

  await viewFrame(cdp, 'Layout')
  const flat = await paneFrame(cdp, SETTINGS_BAR)
  const flatMenu = await cdp.evaluate(`!!${VIEW_MENU}`)
  item(19, 'MP-F-3', "Layout's flat form sits in the settings' one slide, opening none of its own, with no ⋮", flat.slides === 1 && !flatMenu, show({ flat, flatMenu }))
  await shot(cdp, 'g19-layout-flat', SETTINGS_PANE)
  await closeToolbarSettings(cdp)

  await viewFrame(cdp, 'Visibility')
  const bySettings = await paneFrame(cdp, SETTINGS_BAR)
  await shot(cdp, 'g19-visibility-settings', SETTINGS_PANE)
  await closeToolbarSettings(cdp)
  await viewFrame(cdp, 'Properties')
  const properties = await paneFrame(cdp, SETTINGS_BAR)
  await shot(cdp, 'g19-properties-440', SETTINGS_PANE)
  await closeToolbarSettings(cdp)

  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the view list', () => cdp.evaluate(`!!${NEW_VIEW}`))
  await sleep(600)
  const listed = await layerBox(cdp, VIEW_SLIDE)
  await shot(cdp, 'g19-view-list-floor', VIEW_SLIDE)
  const into = await framesOf(cdp, () => mouseClick(cdp, shownEl(`[aria-label="Edit ${PANES_TABLE.name}"]`), { settle: 0 }), { of: VIEW_SLIDE })
  const editor = await layerBox(cdp, VIEW_SLIDE)
  await click(cdp, liveRow('Layout'))
  await until("the editor's Visibility", () => cdp.evaluate(`!!${SETTINGS_BAR}?.textContent.trim().endsWith('Layout')`))
  await sleep(600)
  const byEditor = await paneFrame(cdp, SETTINGS_BAR)
  await shot(cdp, 'g19-visibility-editor', SETTINGS_PANE)
  await mouseClick(cdp, SETTINGS_BAR)
  await sleep(700)
  const out = await framesOf(cdp, () => mouseClick(cdp, SETTINGS_BAR, { settle: 0 }), { of: VIEW_SLIDE })
  const relisted = await layerBox(cdp, VIEW_SLIDE)
  await mouseClick(cdp, VIEWS_BUTTON)
  await until('the view list closed', async () => !(await cdp.evaluate(`!!${NEW_VIEW}`)))

  item(19, 'MP-F-1 MP-F-7', `Visibility stands ${bySettings.height}px by Settings and ${byEditor.height}px by the view editor's Layout, each scrolling at the 440px ceiling (at HEAD 320 by Settings)`,
    atCeiling(bySettings) && atCeiling(byEditor), show({ bySettings, byEditor }))
  item(19, 'MP-F-7', `the Properties list stands ${properties.height}px, scrolling at the 440px ceiling (at HEAD 320)`, atCeiling(properties), show(properties))
  const heights = (frames) => frames.map((f) => Math.round(f.bottom - f.top))
  const slide = [...heights(into), ...heights(out)]
  item(19, 'MP-F-7', `a two-view list stands ${Math.round(listed.height)}px and holds the 245px floor across the slide to its editor and back, never under ${Math.min(...slide)}px (at HEAD 225)`,
    Math.round(listed.height) === 245 && Math.round(relisted.height) === 245 && into.length > 0 && out.length > 0 && slide.every((h) => h >= 245),
    show({ listed: listed.height, editor: editor.height, relisted: relisted.height, into: heights(into), out: heights(out) }))

  const keptRules = (await config(cdp)).personalization.openInPreview ?? { rules: null, enabled: true }
  await must('the preview rules', ask(cdp, 'personalization:set', 'openInPreview', PREVIEW_RULES))
  await openSettings(cdp, 'Navigation')
  await press(cdp, MANAGE_PREVIEW)
  await until('the Preview Rules pane', () => cdp.evaluate(`!!${TOP_LAYER}?.querySelector('[aria-label="Filter property"]')`))
  await sleep(600)
  const rules = await paneFrame(cdp, `${TOP_LAYER}.querySelector('.scroll-fade')`)
  await shot(cdp, 'g19-preview-rules-440', TOP_LAYER)
  await escapeAll(cdp)
  await closeSettings(cdp)
  await must('the preview rules as they were', ask(cdp, 'personalization:set', 'openInPreview', keptRules))
  item(19, 'MP-F-7', `Preview Rules stands ${rules.height}px, scrolling at the 440px ceiling (at HEAD 320)`, atCeiling(rules), show(rules))

  const nativeMenus = async (on) => {
    const checked = () => cdp.evaluate(`(${SWITCH('Use Native Menus')}).getAttribute('aria-checked') === 'true'`)
    await openSettings(cdp, 'Interface')
    if ((await checked()) !== on) await press(cdp, SWITCH('Use Native Menus'))
    const held = await settles(async () => (await checked()) === on)
    await closeSettings(cdp)
    return held
  }
  const openEditor = async (name) => {
    await mouseClick(cdp, shownEl(`[aria-label="Edit ${name}"]`))
    await until(`${name}'s editor`, () => cdp.evaluate(`!!${VIEW_MENU} && !${VIEW_MENU}.closest('[inert]')`))
    await sleep(600)
  }
  /** Duplicates Panes Table from its editor's ⋮ and deletes the copy from the copy's own, answering what the menu drew and what each choice did. */
  const viewMenu = async (native) => {
    const before = (await views(cdp)).map((v) => v.id)
    await mouseClick(cdp, VIEWS_BUTTON)
    await until('the view list', () => cdp.evaluate(`!!${NEW_VIEW}`))
    await sleep(500)
    await openEditor(PANES_TABLE.name)
    const seq = await inMain('__drive.seq')
    let rows
    if (native) {
      rows = await popNative(cdp, await boxOf(cdp, VIEW_MENU), 'left')
      await sleep(400)
    } else {
      await mouseClick(cdp, VIEW_MENU)
      await until('the in-app menu', () => cdp.evaluate(`!!${entry('Duplicate')}`))
      await sleep(400)
      rows = await cdp.evaluate(`${LIVE_ROWS}.map((e) => ({ label: e.textContent.trim() }))`)
      await shot(cdp, 'g19-view-menu-in-app', TOP_LAYER)
    }
    const popped = (await inMain('__drive.seq')) !== seq
    const drawn = await cdp.evaluate(`!!${entry('Duplicate')}`)
    if (native) await pickNative(['Duplicate'])
    else await click(cdp, entry('Duplicate'))
    const copy = await until('the copy', async () => (await views(cdp)).find((v) => !before.includes(v.id)))
    await mouseClick(cdp, SETTINGS_BAR)
    await sleep(700)
    await openEditor(copy.name)
    if (native) await chooseNative(cdp, VIEW_MENU, 'Delete', { button: 'left' })
    else {
      await mouseClick(cdp, VIEW_MENU)
      await until('the in-app menu', () => cdp.evaluate(`!!${entry('Delete')}`))
      await click(cdp, entry('Delete'))
    }
    await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
    await pressDialog(cdp, 'Delete')
    const deleted = await settles(async () => !(await views(cdp)).some((v) => v.id === copy.id))
    const closed = await settles(async () => !(await cdp.evaluate(`!!${NEW_VIEW}`)))
    return { rows, popped, drawn, copy: copy.name, deleted, closed }
  }
  const inAppMenu = await viewMenu(false)
  const switchedOn = await nativeMenus(true)
  const systemMenu = await viewMenu(true)
  const switchedOff = await nativeMenus(false)
  item(19, 'MP-F-6', "with Use Native Menus off, the view editor's ⋮ draws Duplicate and Delete in-app in [data-picker-portal] and pops no native menu",
    same(labels(inAppMenu.rows), ['Duplicate', 'Delete']) && inAppMenu.drawn && !inAppMenu.popped, show(inAppMenu))
  item(19, 'MP-F-6', 'with Use Native Menus on, the ⋮ pops Duplicate and Delete as a system menu, a separator between them, and draws nothing in-app',
    switchedOn && systemMenu.popped && !systemMenu.drawn && same(labels(systemMenu.rows), ['Duplicate', 'Delete']) && systemMenu.rows?.[1]?.separator === true, show(systemMenu))
  item(19, 'MP-F-6', "the ⋮'s Duplicate adds a view, and its Delete removes the copy and closes the dropdown, with Use Native Menus off and on",
    [inAppMenu, systemMenu].every((r) => r.copy && r.deleted && r.closed) && switchedOff, show({ inAppMenu, systemMenu, switchedOn, switchedOff }))

  await unfill([])
  await putBack(['Panes One'])
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
  if (GROUPS.has('10')) await group10()
  if (GROUPS.has('11')) await group11(cdp)
  if (GROUPS.has('12')) await group12(cdp)
  if (GROUPS.has('13')) await group13(cdp)
  if (GROUPS.has('14')) await group14(cdp)
  if (GROUPS.has('15')) await group15(cdp)
  if (GROUPS.has('16')) await group16(cdp)
  if (GROUPS.has('18')) await group18(cdp)
  if (GROUPS.has('19')) await group19(cdp)
  cdp.close()
} catch (e) {
  item(0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
tally(['0', ...LANDED].filter((g) => g === '0' || GROUPS.has(g)))
