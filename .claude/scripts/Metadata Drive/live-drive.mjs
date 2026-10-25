import { chmodSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ulid } from 'ulidx'
import { parse } from 'yaml'
import {
  mintOptionId, optionId,
  ask, check, chooseNative, click, COPY, drag, FM, holds, itemCount, launch, META, mintPageId, mouseAt, boxOf, mouseClick,
  closePanel, must, NEXUS, openField, openPanel, portalOpen, pressKey, read, restore, results, selectField, SETTINGS_BUTTON,
  settles, shot, sleep, textEl, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9363
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GROUPS = new Set(process.argv.slice(2).map(Number))
if (GROUPS.size === 0 || [...GROUPS].some((g) => !ALL.includes(g))) {
  console.error('usage: node live-drive.mjs <group…>   (groups 1–8 are the plan phases of their number, 9 the gesture pass)')
  process.exit(2)
}

const COLLECTION = 'Collection A'
const SET = 'Collection A/Set Alpha'
const STASH_COLLECTION = 'Collection B'
const STASH_SET = 'Collection B/Set Alpha'
const CONTEXTS = '.nexus/contexts'
const REGISTRY = '.nexus/properties.json'
const NOTES = '.nexus/.owed.json'
const MATRIX = '.nexus/interface/matrix.json'
const FORMATS = ['Match Title', 'lowercase', 'UPPERCASE', 'kebab-case', 'PascalCase', 'camelCase', 'snake_case', 'Train-Case', 'UPPER_SNAKE_CASE', 'UPPER-KEBAB-CASE']

// ── Checks ──────────────────────────────────────────────────────────────────

const show = (v) => JSON.stringify(v)
/** One check, named for its group and the decision it pins, as MATRIX.md lists them. */
const pin = (group, decision, name, pass, detail) => check(`[g${group} ${decision}] ${name}`, pass, detail)
const canon = (v) =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v
const same = (a, b) => show(canon(a)) === show(canon(b))
const refusedAs = (r, copy, ...words) => r?.ok === false && r.error?.message === copy(...words)
const fileOf = (rel) => {
  try {
    return read(rel)
  } catch {
    return null
  }
}
/** The files' bytes now, to hold them against later: `holds` over a window, `changed` once. */
function snapshot(paths) {
  const rels = [...new Set(paths)]
  const was = rels.map(fileOf)
  return {
    holds: (ms = 2000) => holds(async () => rels.every((r, i) => fileOf(r) === was[i]), ms),
    changed: () => rels.filter((r, i) => fileOf(r) !== was[i]),
  }
}

// ── Pages ───────────────────────────────────────────────────────────────────

const pageIds = {}
const relById = {}
const pageAt = (title, parent = SET) => `${parent}/${title}.md`
function seedPage(rel, fm, id = mintPageId()) {
  pageIds[rel] = id
  relById[id] = rel
  writeFileSync(join(NEXUS, rel), `---\nID: ${id}\n${fm}${fm ? '\n' : ''}---\nBody\n`)
  return rel
}
const seedAll = (seeds) => seeds.forEach(([rel, fm]) => seedPage(rel, fm))
const frontOf = (rel) => FM.exec(fileOf(rel) ?? '')?.[1] ?? ''
const blockOf = (rel) => frontOf(rel).split('\n').filter((l) => !l.startsWith('ID: ')).join('\n')
function fmOf(rel) {
  const { ID, ...rest } = parse(frontOf(rel)) ?? {}
  return rest
}
const listOf = (v) => (v === undefined || v === null ? [] : [v].flat())
async function indexed(cdp, container, rels) {
  const want = rels.map((r) => pageIds[r])
  let missing = rels
  await until(`${rels.length} seeded pages indexed`, async () => {
    const r = await ask(cdp, 'view:loadValues', container, want)
    missing = r.ok ? rels.filter((rel) => !r.value[pageIds[rel]]) : rels
    return missing.length === 0
  }, 30000).catch((e) => {
    throw new Error(`${e.message}; not indexed: ${show(missing)}`)
  })
}
function seededAsWritten(group, seeds) {
  const moved = seeds.filter(([rel, fm]) => blockOf(rel) !== fm)
  pin(group, 'A-3', `registering leaves all ${seeds.length} seeded pages byte-identical`, moved.length === 0,
    moved.map(([rel]) => `${rel}: ${show(blockOf(rel))}`).join('\n      '))
}
const wrote = (rel, want, ms = 6000) => settles(async () => blockOf(rel) === want, ms)
async function unreadable(rel, run) {
  const abs = join(NEXUS, rel)
  chmodSync(abs, 0o000)
  try {
    return await run()
  } finally {
    chmodSync(abs, 0o644)
  }
}
const FINISH = { op: 'finishOwed' }
/** The entry `id` owes in the notes file, or null once it owes nothing. */
const owedOf = (id) => {
  const text = fileOf(NOTES)
  return (text === null ? null : JSON.parse(text)[id]) ?? null
}
/** A rename of `id` over two pages, the first unreadable: the reply, the entry it owes, and the Try Again that finishes it, with `after` run between. */
async function tryAgain(cdp, [[first], [second]], id, rename, after) {
  const r = await unreadable(first, rename)
  const owed = r.ok && r.value?.cascade?.owed ? owedOf(id) : undefined
  await after?.()
  const replayed = owed ? await ask(cdp, 'mutate', FINISH) : null
  return { r, owed, replayed, first, second }
}

// ── Contexts and Spaces ─────────────────────────────────────────────────────

const spacePath = (context, title) => `${CONTEXTS}/${context}/${title}`
const sidecarAt = (context, title) => `${spacePath(context, title)}/_space.json`
const tilesAt = (context, title) => `${spacePath(context, title)}/_tiles.json`
const sidecar = (context, title) => JSON.parse(read(sidecarAt(context, title)))
const spaceIdOf = (context, title) => sidecar(context, title).id
const contextIdOf = (title) => JSON.parse(read(`${CONTEXTS}/contexts.json`)).contexts.find((c) => c.title === title)?.id
/** An outside edit of a Space's sidecar, as another editor would leave it. */
function editSidecar(context, title, patch) {
  writeFileSync(join(NEXUS, sidecarAt(context, title)), `${JSON.stringify({ ...sidecar(context, title), ...patch }, null, 2)}\n`)
}
async function makeSpace(cdp, context, title) {
  await must(`create the Space ${title}`, ask(cdp, 'mutate', { op: 'createSpace', id: ulid(), contextId: contextIdOf(context), name: title }))
  await until(`${title}'s sidecar`, async () => fileOf(sidecarAt(context, title)) !== null)
}
async function makeContext(cdp, title, spaces) {
  const id = ulid()
  await must(`create the Context ${title}`, ask(cdp, 'mutate', { op: 'createContextGroup', id, name: title }))
  await until(`${title} registered`, async () => contextIdOf(title) === id)
  for (const s of spaces) await makeSpace(cdp, title, s)
  return id
}
const spaceValue = (cdp, context, title, propertyId, value) =>
  must(`${title}'s value`, ask(cdp, 'mutate', { op: 'setProperty', paths: [spacePath(context, title)], propertyId, value: byId(propertyId, value) }))

// ── The registry, as Phase 5 leaves it ──────────────────────────────────────

const registry = () => JSON.parse(read(REGISTRY))
const defOf = (id) => registry().defs[id]
const optionsOf = (def) => (def.status_groups ? def.status_groups.flatMap((g) => g.options) : (def.select_options ?? []))
const wordsOf = (id) => optionsOf(defOf(id)).map((o) => [o.key, o.label])
const keysOf = (id) => optionsOf(defOf(id)).map((o) => o.key)
/** An outside edit of the registry adding `def`, as a hand or an agent would. */
function writeDef(def) {
  const r = registry()
  writeFileSync(join(NEXUS, REGISTRY), `${JSON.stringify({ ...r, defs: { ...r.defs, [def.id]: def }, order: [...r.order, def.id] }, null, 2)}\n`)
}
async function handWritten(cdp, def) {
  writeDef(def)
  await until(`${def.label ?? def.key} admitted`, async () => (await ask(cdp, 'property:holders', def.id, { of: 'property' })).ok)
  await must(`assign ${def.label ?? def.key}`, ask(cdp, 'mutate', { op: 'assignProperty', containerPath: COLLECTION, propertyId: def.id }))
  return def.id
}
const mintPropertyId = () => `prop_${ulid()}`

const ids = {}
const word = (w) => ({ key: w, label: w })
const add = (cdp, def, container = COLLECTION) => ask(cdp, 'mutate', { op: 'addProperty', containerPath: container, draft: def })
async function define(cdp, def, container = COLLECTION) {
  const r = await add(cdp, def, container)
  if (!r.ok) throw new Error(`The seed stops: schema:add refused ${def.label}: ${show(r)}`)
  ids[def.label] = r.value.created.propertyId
  return r.value.created.propertyId
}
const defineAll = async (cdp, defs) => {
  for (const def of defs) await define(cdp, def)
}
const set = (kind, value) => ({ set: value === null ? null : { kind, value } })
const spaces = (context, titles) => ({ context, spaces: titles })
/** A value naming its options by the ids the property's current definition reads them under. */
function byId(propertyId, value) {
  const id = (label) => optionId(defOf(propertyId), label)
  if (value?.kind === 'select') return { ...value, value: id(value.value) }
  if (value?.kind === 'multiSelect') return { ...value, value: value.value.map(id) }
  return value
}
const setValue = (cdp, rel, propertyId, value) =>
  must(`${rel}'s value`, ask(cdp, 'mutate', { op: 'setProperty', paths: [rel], propertyId, value: byId(propertyId, value) }))
const statusGroups = (todo, complete) => [
  { id: 'todo', label: 'To-do', color: 'grey', options: todo.map(word) },
  { id: 'complete', label: 'Complete', color: 'green', options: complete.map(word) },
]

// ── Views, tiles, and the Matrix filter ─────────────────────────────────────

const mintViewId = () => `view_${ulid()}`
const collectionIdOf = (path) => JSON.parse(read(`${path}/_pagecollection.json`)).id
const viewOf = (id) => JSON.parse(read(`${COLLECTION}/_pagecollection.json`)).views.find((v) => v.id === id)
const stashOf = (propertyId) => JSON.parse(read(`${STASH_COLLECTION}/_pagecollection.json`)).property_stash?.[propertyId]?.values ?? {}
const rule = (property_id, op, operand) => ({ property_id, op, ...(Array.isArray(operand) ? { values: operand } : { value: operand }) })
const filterOf = (...rules) => ({ match: 'all', rules })
async function saveView(cdp, id, name, columns, extra = {}) {
  await must(`the ${name} view`, ask(cdp, 'views:save', COLLECTION, 'collection', { id, name, type: 'table', hidden_properties: [], property_order: ['_title', ...columns], ...extra }, {}))
}
/** Every operand a filter names for `propertyId`, wherever `doc` nests its rules. */
function operandsFor(doc, propertyId) {
  const out = []
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') {
      if (v.property_id === propertyId) out.push(...(v.values ?? (v.value != null ? [v.value] : [])))
      Object.values(v).forEach(walk)
    }
  }
  walk(doc)
  return out
}
async function viewTile(cdp, context, title, viewId) {
  await must(`a View Tile on ${title}`, ask(cdp, 'tiles:create', { kind: 'space', id: spaceIdOf(context, title) }, { kind: 'append' },
    { kind: 'view', value: { source_id: collectionIdOf(COLLECTION), view_id: viewId } }))
  return tilesAt(context, title)
}
const matrixFilter = (cdp, ...rules) => must('the Matrix filter', ask(cdp, 'matrix:write', { filter: { rules: filterOf(...rules), enabled: true } }))
/** The Collection B stash of `propertyId`, filled the way the app fills it: assigned over a page holding values, then unassigned. */
async function stashed(cdp, propertyId, rel) {
  await indexed(cdp, STASH_COLLECTION, [rel])
  await must('assign to Collection B', ask(cdp, 'mutate', { op: 'assignProperty', containerPath: STASH_COLLECTION, propertyId: propertyId }))
  await must('unassign from Collection B', ask(cdp, 'mutate', { op: 'unassignProperty', containerPath: STASH_COLLECTION, propertyId: propertyId }))
  await until('the Collection B stash', async () => Object.keys(stashOf(propertyId)).length > 0)
}

// ── Reading through the table ───────────────────────────────────────────────

// Every rendered row's cells, read as the table draws them: a checkbox by its mark, chips by their labels joined
// with `|`, a text value by its lines, and any other cell by its text.
const ROWS_ON_SCREEN = `(() => {
  const chips = (c) => [...c.querySelectorAll('.cell-chips .over-scroll-host')].map((h) => h.querySelector('.over-scroll-ellipsis > span')?.textContent ?? h.textContent.trim())
  const read = (c) => c.querySelector('.cell-checkbox')
    ? c.querySelector('.cell-checkbox').classList.contains('checkbox-checked')
    : c.querySelector('.cell-chips') ? chips(c).join('|')
    : c.querySelector('.cell-text') ? [...c.querySelectorAll('.cell-text-line')].map((l) => l.textContent).join('\\n') : c.textContent.trim()
  return Object.fromEntries([...document.querySelectorAll('.data-row[data-rid]')].map((r) => [r.dataset.rid, [...r.querySelectorAll('.data-cell')].slice(1).map(read)]))
})()`
const SCROLLER = `(() => { let e = document.querySelector('.data-row'); while (e && !(e.scrollHeight > e.clientHeight && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; return e })()`
const sidebarRow = (title) => `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(title)})`
const ribbon = (label) => `document.querySelector('.sidebar-ribbon [aria-label="${label}"]')`

async function sidebarTo(cdp, mode, title) {
  if (!(await cdp.evaluate(`!!(${sidebarRow(title)})`))) await click(cdp, ribbon(mode))
  await until(`${title} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(title)})`))
  await click(cdp, sidebarRow(title))
}
/** The view's rows by page id, each its cells in column order; a view filtering everything out reads as no rows. */
async function readTable(cdp, viewId) {
  await must('show the view', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId }))
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await settles(() => cdp.evaluate(`!!document.querySelector('.data-row[data-rid]')`), 4000)
  await sleep(1200)
  const rows = {}
  if (!(await cdp.evaluate(`!!(${SCROLLER})`))) return Object.assign(rows, await cdp.evaluate(ROWS_ON_SCREEN))
  await cdp.evaluate(`(${SCROLLER}).scrollTop = 0`)
  for (let pass = 0; pass < 200; pass++) {
    Object.assign(rows, await cdp.evaluate(ROWS_ON_SCREEN))
    const done = await cdp.evaluate(`(() => { const s = ${SCROLLER}; const end = s.scrollTop + s.clientHeight >= s.scrollHeight - 2; s.scrollTop += s.clientHeight * 0.7; return end })()`)
    await sleep(250)
    if (done) break
  }
  return rows
}
const shownRels = (rows) => Object.keys(rows).map((id) => relById[id]).filter(Boolean).sort()
const cellOf = (rel, at) => `document.querySelector('.data-row[data-rid="${pageIds[rel]}"]').querySelectorAll('.data-cell')[${at + 1}]`
const PICKER_ROWS = '[data-picker-portal] [data-line-row]'
const pickerRowOf = (label) => `[...document.querySelectorAll(${JSON.stringify(PICKER_ROWS)})].find((e) => e.textContent.trim() === ${JSON.stringify(label)})`
async function escapeAll(cdp) {
  for (let i = 0; i < 4 && (await portalOpen(cdp)); i++) await pressKey(cdp, 'Escape')
  await pressKey(cdp, 'Escape')
}

// ── The case table ──────────────────────────────────────────────────────────
// One page per case: `held` is the block the file holds, `read` what the table draws for it (left out for a case that
// only writes), and each step an act and the block it leaves, every other byte unchanged.

function caseTable(prefix) {
  const cases = []
  const add = (family, decision, column, held, read, ...steps) => {
    const n = cases.filter((c) => c.family === family).length + 1
    cases.push({ family, decision, column, held, read, steps, rel: pageAt(`${prefix} ${family} ${String(n).padStart(2, '0')}`) })
  }
  return { cases, add }
}
const familiesOf = (cases) => [...new Set(cases.map((c) => c.family))]
const decisionsOf = (cases) => [...new Set(cases.map((c) => c.decision))].join(' ')
const flat = (s) => s.replace(/\n/g, '⏎')

/** `columns` names each column a label or a `<Context>` key, `kinds` how a column's cell compares. */
function checkReads(group, cases, rows, columns, kinds = {}) {
  for (const family of familiesOf(cases)) {
    const read = cases.filter((c) => c.family === family && c.read !== undefined)
    if (!read.length) continue
    const wrong = []
    for (const c of read) {
      const cell = rows[pageIds[c.rel]]?.[columns.indexOf(c.column)]
      const kind = kinds[c.column]
      const shown = kind === 'number' && typeof cell === 'string' ? (cell === '' ? null : Number(cell.replace(/[^0-9.-]/g, ''))) : cell
      const ok = kind === 'contains' ? String(shown).includes(c.read) : shown === c.read
      if (!ok) wrong.push(`${c.rel} ${flat(c.held)} shows ${show(shown)}, expected ${show(c.read)}`)
    }
    pin(group, decisionsOf(read), `${family}: every value reads as the decisions read it (${read.length} cases)`, wrong.length === 0, wrong.join('\n      '))
  }
}

async function act(cdp, c, a) {
  if (a.spaces) {
    const spaceIds = a.spaces.map((t) => spaceIdOf(a.context, t))
    return must(`${c.rel} Spaces`, ask(cdp, 'mutate', { op: 'setContext', paths: [c.rel], contextId: contextIdOf(a.context), spaceIds }))
  }
  return setValue(cdp, c.rel, ids[c.column], a.set)
}

async function checkWrites(group, cdp, cases) {
  for (const family of familiesOf(cases)) {
    const acted = cases.filter((c) => c.family === family && c.steps.length)
    const depth = Math.max(0, ...acted.map((c) => c.steps.length))
    for (let s = 0; s < depth; s++) {
      const wrong = []
      const step = acted.filter((c) => c.steps[s])
      for (const c of step) {
        const [a, want] = c.steps[s]
        await act(cdp, c, a)
        if (!(await wrote(c.rel, want, 3000))) wrong.push(`${c.rel} ${flat(c.held)} → ${show(blockOf(c.rel))}, expected ${show(want)}`)
      }
      pin(group, decisionsOf(step), `${family}: write ${s + 1} leaves the bytes the decisions name (${step.length} cases)`, wrong.length === 0, wrong.join('\n      '))
    }
  }
}

/** Each cascade a step that renames something the pages hold, then every page's block it leaves. */
async function checkCascades(group, cdp, cascades, steps) {
  for (const [by, { label, decision, run }] of Object.entries(steps)) {
    await must(label, run())
    const mine = cascades.filter((c) => c.by === by)
    const wrong = []
    for (const c of mine) if (!(await wrote(c.rel, c.want))) wrong.push(`${c.rel} ${flat(c.held)} → ${show(blockOf(c.rel))}, expected ${show(c.want)}`)
    pin(group, decision, `${label} rewrites every quote style and leaves another casing as written (${mine.length} cases)`, wrong.length === 0, wrong.join('\n      '))
  }
}

// ── Group 1 — Space order by id (Phase 1) ───────────────────────────────────

async function group1(cdp) {
  const G = 1
  const note = await define(cdp, { label: 'M1 Note', type: 'text' })
  const stage = await define(cdp, { label: 'M1 Stage', type: 'select', select_options: ['Draft', 'Final'].map(word) })
  const group = await makeContext(cdp, 'M1 Group', ['M1 Space'])
  const projects = contextIdOf('Projects')
  const AREA = ['Areas', 'Area One']
  const orderOf = (where) => sidecar(...where).$order
  const write = (where, list) => must(`${where[1]}'s order`, ask(cdp, 'mutate', { op: 'setSpaceRowOrder', path: spacePath(...where), ids: list }))

  await write(AREA, [group, projects, note, stage])
  pin(G, 'F-5', "a Space's row order is written as one list of Context and property ids",
    same(orderOf(AREA), [group, projects, note, stage]), show(orderOf(AREA)))
  await write(['M1 Group', 'M1 Space'], [stage])
  const area = snapshot([sidecarAt(...AREA)])
  await must('rename M1 Note', ask(cdp, 'mutate', { op: 'renameProperty', propertyId: note, label: 'M1 Notes' }))
  pin(G, 'F-5', "a property rename leaves a Space's $order as written", await area.holds(), show(orderOf(AREA)))
  await must('rename M1 Group', ask(cdp, 'mutate', { op: 'renameContext', contextId: group, newName: 'M1 Groups' }))
  pin(G, 'F-5', "a Context rename leaves a Space's $order as written", await area.holds(), show(orderOf(AREA)))
  await must('retitle M1 Space', ask(cdp, 'mutate', { op: 'renameSpace', spaceId: spaceIdOf('M1 Groups', 'M1 Space'), newName: 'M1 Spaced' }))
  pin(G, 'F-5', 'a Space retitle carries its $order unchanged',
    await settles(async () => same(orderOf(['M1 Groups', 'M1 Spaced']), [stage])), show(fileOf(sidecarAt('M1 Groups', 'M1 Spaced'))))
  await must('delete M1 Stage', ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: stage }))
  pin(G, 'F-5', "a property delete drops its id from every Space's $order",
    await settles(async () => same(orderOf(AREA), [group, projects, note])), show(orderOf(AREA)))
  pin(G, 'F-5', 'an order the delete empties leaves the Space',
    await settles(async () => !('$order' in sidecar('M1 Groups', 'M1 Spaced'))), show(sidecar('M1 Groups', 'M1 Spaced')))
  await must('delete M1 Groups', ask(cdp, 'mutate', { op: 'delete', path: `${CONTEXTS}/M1 Groups`, kind: 'context' }))
  pin(G, 'F-5', "a Context delete drops its id from every Space's $order",
    await settles(async () => same(orderOf(AREA), [projects, note])), show(orderOf(AREA)))
  await write(AREA, [])
  pin(G, 'F-5', 'an empty order removes the key', await settles(async () => !('$order' in sidecar(...AREA))), show(sidecar(...AREA)))
}

// ── Group 2 — Exact keys: reads, writes, and renames (Phases 2A and 2B) ────

const PAIRS = [['true', 'false'], ['yes', 'no'], ['on', 'off'], ['y', 'n']]
const CASINGS = [(w) => w, (w) => w[0].toUpperCase() + w.slice(1), (w) => w.toUpperCase()]
const YAML_BOOLEAN = /^(true|false)$/i

async function group2(cdp) {
  const G = 2
  const { cases, add: row } = caseTable('M2')
  const C = { check: 'M2 Check', amount: 'M2 Amount', choice: 'M2 Choice', labels: 'M2 Labels', note: 'M2 Note', ref: 'M2 Ref', files: 'M2 Files', areas: '<Areas>' }

  // Checkbox: every word pair, in three casings and three quote styles, checked and unchecked. A tick over a checked
  // word changes nothing; over an unchecked one it writes the partner in the same casing and quotes, except where yaml
  // read a bare `false` as a boolean before any spelling was seen. An untick removes the key.
  for (const [on, off] of PAIRS)
    for (const cased of CASINGS)
      for (const q of ['', "'", '"'])
        for (const w of [on, off]) {
          const spelled = `${q}${cased(w)}${q}`
          const ticked = w === on ? spelled : q === '' && YAML_BOOLEAN.test(w) ? 'true' : `${q}${cased(on)}${q}`
          row('Check', 'A-3', C.check, `M2 Check: ${spelled}`, w === on, [set('checkbox', true), `M2 Check: ${ticked}`], [set('checkbox', null), ''])
        }

  // Number: every grammar shape under each quote style. A changed value keeps the symbol, sign, grouping, and decimal
  // places with the typed digits; an unchanged one keeps its bytes; a shape the grammar refuses reads as nothing.
  for (const [held, shown, next, want] of [
    ['1200', 1200, 1300, '1300'], ['"1200"', 1200, 1300, '"1300"'], ["'1200'", 1200, 1300, "'1300'"],
    ['1,200', 1200, 1300, '1,300'], ['"1,200"', 1200, 1300, '"1,300"'], ["'1,200'", 1200, 1300, "'1,300'"],
    ['$1,200.00', 1200, 1300, '$1,300.00'], ['"$1,200.00"', 1200, 1300, '"$1,300.00"'], ["'$1,200.00'", 1200, 1300, "'$1,300.00'"],
    ['$1,200', 1200, 1300.5, '$1,300.5'], ['30 €', 30, 31, '31 €'], ['€30', 30, 31, '€31'], ['"£30"', 30, 31, '"£31"'],
    ['¥500', 500, 600, '¥600'], ['A$30', 30, 31, 'A$31'], ["'CA$30'", 30, 31, "'CA$31'"], ['45%', 45, 50, '50%'],
    ["'45%'", 45, 50, "'50%'"], ['"45%"', 45, 50, '"50%"'], ['30.50%', 30.5, 45, '45.00%'], ['-5', -5, -6, '-6'],
    ['"-5"', -5, -6, '"-6"'], ["'+$5'", 5, 6, "'$6'"], ['1,234,567.5', 1234567.5, 1234567.25, '1,234,567.25'], ['3.5', 3.5, 4, '4'],
    ['1,5', null, 2, '2'], ['30 USD', null, 31, '31'],
  ]) {
    row('Amount', 'A-3', C.amount, `M2 Amount: ${held}`, shown, [set('number', next), `M2 Amount: ${want}`])
    if (shown !== null) row('Amount', 'A-3', C.amount, `M2 Amount: ${held}`, shown, [set('number', shown), `M2 Amount: ${held}`])
  }

  // Text: a string keeps its quotes, a value yaml must quote takes the file's style or yaml's own, and quote marks typed
  // into the value are its content.
  for (const [held, shown, next, want] of [
    ['foo', 'foo', 'bar', 'bar'], ["'foo'", 'foo', 'bar', "'bar'"], ['"foo"', 'foo', 'bar', '"bar"'], ['foo', 'foo', 'foo', 'foo'],
    ["'foo'", 'foo', 'foo', "'foo'"], ['"foo"', 'foo', 'foo', '"foo"'], ['42', '42', '43', '"43"'], ['"42"', '42', '43', '"43"'],
    ["'it''s'", "it's", "don't", "'don''t'"], ["'x'", 'x', 'y: z', "'y: z'"], ['foo', 'foo', "'foo'", `"'foo'"`],
    [`"'foo'"`, "'foo'", "'foo'", `"'foo'"`], ['[a, b]', '[a, b]', '[a, b]', '[a, b]'],
  ])
    row('Note', 'A-3', C.note, `M2 Note: ${held}`, shown, [set('text', next), `M2 Note: ${want}`])

  // Link: a connection reads quoted or bare, a title yaml reads as a number included as it was written; a changed
  // connection is written quoted, single quotes carried, and an address keeps its quotes.
  for (const [held, shown, next, want] of [
    ['"[[M2 Target]]"', 'M2 Target', '[[M2 Other]]', '"[[M2 Other]]"'], ["'[[M2 Target]]'", 'M2 Target', '[[M2 Other]]', "'[[M2 Other]]'"],
    ['[[M2 Target]]', 'M2 Target', '[[M2 Other]]', '"[[M2 Other]]"'], ['https://a.com', 'a.com', 'https://b.com', 'https://b.com'],
    ["'https://a.com'", 'a.com', 'https://b.com', "'https://b.com'"], ['"https://a.com"', 'a.com', 'https://b.com', '"https://b.com"'],
    ['[[2024]]', '2024', '[[2024]]', '[[2024]]'], ['"[[2024]]"', '2024', '[[2024]]', '"[[2024]]"'], ['[[1.10]]', '1.10', '[[1.10]]', '[[1.10]]'],
    ['[[007]]', '007', '[[007]]', '[[007]]'],
  ])
    row('Ref', 'A-3', C.ref, `M2 Ref: ${held}`, shown, [set('link', next), `M2 Ref: ${want}`])

  // File: each attachment keeps its own spelling and a new one takes the quotes the file chose; a single wikilink that
  // grows becomes a block list.
  for (const [held, want] of [
    ['\n  - "[[a.png]]"', '\n  - "[[a.png]]"\n  - "[[b.png]]"'], ["\n  - '[[a.png]]'", "\n  - '[[a.png]]'\n  - '[[b.png]]'"],
    ['\n  - [[a.png]]', '\n  - [[a.png]]\n  - "[[b.png]]"'], [' ["[[a.png]]"]', ' ["[[a.png]]", "[[b.png]]"]'],
    [' [[a.png]]', '\n  - "[[a.png]]"\n  - "[[b.png]]"'], [" '[[a.png]]'", "\n  - '[[a.png]]'\n  - '[[b.png]]'"],
  ])
    row('Files', 'A-3', C.files, `M2 Files:${held}`, 'a.png', [set('file', ['[[a.png]]', '[[b.png]]']), `M2 Files:${want}`])

  // Keys: a key in another casing is a different key, foreign to the property; a read takes the exact key alone, a
  // write lands beside the variant, and a clear removes the exact key and leaves the variant.
  row('Keys', 'A-1', C.amount, 'm2 amount: 1200', null, [set('number', 1300), 'm2 amount: 1200\nM2 Amount: 1300'])
  row('Keys', 'A-1', C.amount, 'M2 Amount: 5\nm2 amount: 7', 5, [set('number', null), 'm2 amount: 7'])
  row('Keys', 'A-1', C.choice, 'm2 choice: Done', '', [set('select', 'Doing'), 'm2 choice: Done\nM2 Choice:\n  - Doing'])
  row('Keys', 'A-1', C.labels, 'm2 labels: [Work]', '', [set('multiSelect', ['Life']), 'm2 labels: [Work]\nM2 Labels:\n  - Life'])

  // Context keys: a `<Title>:` key matches exactly as titled; another casing is foreign and a Context write lands beside it.
  row('Context Keys', 'A-2', C.areas, '<areas>: [Area One]', '', [spaces('Areas', ['Area One']), '<areas>: [Area One]\n<Areas>:\n  - Area One'])
  row('Context Keys', 'A-2', C.areas, '<Areas>: [Area One]\n<areas>: [Area Two]', 'Area One', [spaces('Areas', ['Area Two']), '<Areas>: [Area Two]\n<areas>: [Area Two]'])

  // The cascades: every holder of the exact key follows a rename, in its own quotes, and a variant stays as written.
  const back = await makeContext(cdp, 'M2 Back', ['M2 Spot'])
  const team = await makeContext(cdp, 'M2 Group', ['M2 Space'])
  const cascades = [
    { rel: pageAt('M2 Rename 1'), held: "M2 Pick: 'Done'", want: "M2 Picked: 'Done'", by: 'key' },
    { rel: pageAt('M2 Rename 2'), held: 'm2 pick:\n  - "Done"', want: 'm2 pick:\n  - "Done"', by: 'key' },
    { rel: pageAt('M2 Rename 3'), held: 'M2 Pick: "x"\nm2 pick: y', want: 'M2 Picked: "x"\nm2 pick: y', by: 'key' },
    { rel: pageAt('M2 Recase 1'), held: 'M2 Memo: kept', want: 'm2 memo: kept', by: 'recase' },
    { rel: pageAt('M2 Recase 2'), held: 'm2 memo: other', want: 'm2 memo: other', by: 'recase' },
    { rel: pageAt('M2 Context 1'), held: '<M2 Group>: [M2 Space]', want: '<M2 Team>: [M2 Space]', by: 'context' },
    { rel: pageAt('M2 Context 2'), held: '<m2 group>: [M2 Space]', want: '<m2 group>: [M2 Space]', by: 'context' },
    { rel: pageAt('M2 Context 1'), held: '<M2 Team>: [M2 Space]', want: '<m2 team>: [M2 Space]', by: 'contextRecase' },
    { rel: pageAt('M2 Context 1'), held: '<m2 team>: [M2 Space]', want: '<m2 team>: [m2 space]', by: 'spaceRecase' },
    { rel: pageAt('M2 Context 2'), held: '<m2 group>: [M2 Space]', want: '<m2 group>: [M2 Space]', by: 'spaceRecase' },
  ]
  const twoStep = (prefix, prop) => [[pageAt(`${prefix} 1`), `${prop}: a`], [pageAt(`${prefix} 2`), `${prop}: b`]]
  const pairs = {
    held: [[pageAt('M2 Held 1'), 'M2 Held: a\nm2 held: b']],
    gone: [[pageAt('M2 Gone 1'), 'M2 Gone: x\nm2 gone: y']],
    skip: twoStep('M2 Skip', 'M2 Skip'),
    chain: twoStep('M2 Chain', 'M2 Chain'),
    back: [[pageAt('M2 Back 1'), '<M2 Back>: [M2 Spot]'], [pageAt('M2 Back 2'), '<M2 Back>: [M2 Spot]']],
  }
  const seeds = [
    ...['M2 Target', 'M2 Other', '2024', '1.10', '007'].map((t) => [pageAt(t), '']),
    ...cases.map((c) => [c.rel, c.held]),
    ...cascades.filter((c, i) => cascades.findIndex((d) => d.rel === c.rel) === i).map((c) => [c.rel, c.held]),
    ...Object.values(pairs).flat(),
  ]
  seedAll(seeds)
  editSidecar('Areas', 'Area Two', { 'M2 Pick': 'kept', 'm2 pick': 'kept', 'M2 Memo': 'kept', 'm2 choice': 'Done', 'M2 Gone': 'x' })
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  await defineAll(cdp, [
    { label: C.check, type: 'checkbox' },
    { label: C.amount, type: 'number' },
    { label: C.choice, type: 'select', select_options: ['Done', 'Doing'].map(word) },
    { label: C.labels, type: 'multiSelect', select_options: ['Work', 'Life'].map(word) },
    { label: C.note, type: 'text' },
    { label: C.ref, type: 'link' },
    { label: C.files, type: 'file' },
    ...['M2 Pick', 'M2 Memo', 'M2 Held', 'M2 Gone', 'M2 Skip', 'M2 Chain'].map((label) => ({ label, type: 'text' })),
  ])
  ids[C.areas] = contextIdOf('Areas')
  const columns = Object.values(C)
  const view = mintViewId()
  await saveView(cdp, view, 'Metadata Drive Keys', columns.map((c) => ids[c]))
  await sleep(2500)
  seededAsWritten(G, seeds)

  checkReads(G, cases, await readTable(cdp, view), columns, { [C.amount]: 'number', [C.ref]: 'contains', [C.files]: 'contains' })
  await checkWrites(G, cdp, cases)

  await spaceValue(cdp, 'Areas', 'Area Two', ids[C.choice], { kind: 'select', value: 'Doing' })
  pin(G, 'A-1', 'a Space write lands on the exact key beside a variant',
    await settles(async () => sidecar('Areas', 'Area Two')['m2 choice'] === 'Done' && same(sidecar('Areas', 'Area Two')['M2 Choice'], ['Doing'])),
    show(sidecar('Areas', 'Area Two')))

  await checkCascades(G, cdp, cascades, {
    key: { label: 'a property rename', decision: 'A-1', run: () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M2 Pick'], label: 'M2 Picked' }) },
    recase: { label: 'a case-only property rename', decision: 'A-1', run: () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M2 Memo'], label: 'm2 memo' }) },
    context: { label: 'a Context rename', decision: 'A-2', run: () => ask(cdp, 'mutate', { op: 'renameContext', contextId: team, newName: 'M2 Team' }) },
    contextRecase: { label: 'a case-only Context rename', decision: 'A-2', run: () => ask(cdp, 'mutate', { op: 'renameContext', contextId: team, newName: 'm2 team' }) },
    spaceRecase: { label: 'a case-only Space retitle', decision: 'A-2', run: () => ask(cdp, 'mutate', { op: 'renameSpace', spaceId: spaceIdOf('m2 team', 'M2 Space'), newName: 'm2 space' }) },
  })
  const two = sidecar('Areas', 'Area Two')
  pin(G, 'A-1', 'a property rename moves the exact key on a Space and leaves the variant',
    two['M2 Picked'] === 'kept' && two['m2 pick'] === 'kept' && !('M2 Pick' in two), show(two))
  pin(G, 'A-1', 'a case-only property rename moves the key on a Space', two['m2 memo'] === 'kept' && !('M2 Memo' in two), show(two))

  const [[held]] = pairs.held
  const heldPage = snapshot([held])
  const refused = await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M2 Held'], label: 'm2 held' })
  pin(G, 'A-1', 'a rename onto a key a page already holds beside it is refused, and nothing moves',
    refusedAs(refused, COPY.itemsHoldingBothKeys, 1, 'M2 Held', 'm2 held') && (await heldPage.holds()) && owedOf(ids['M2 Held']) === null, show(refused))

  const [[gone]] = pairs.gone
  const deleted = await must('delete M2 Gone', ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: ids['M2 Gone'] }))
  pin(G, 'A-1', 'a property delete strips the exact key and leaves the variant',
    (await wrote(gone, 'm2 gone: y')) && !('M2 Gone' in sidecar('Areas', 'Area Two')), show([blockOf(gone), sidecar('Areas', 'Area Two')]))
  await must('restore M2 Gone', ask(cdp, 'mutate', { op: 'restore', bundlePath: deleted.bundled.bundlePath }))
  pin(G, 'A-1', 'a property restore refills the exact key on the page and the Space',
    await settles(async () => fmOf(gone)['M2 Gone'] === 'x' && fmOf(gone)['m2 gone'] === 'y' && sidecar('Areas', 'Area Two')['M2 Gone'] === 'x'),
    show([fmOf(gone), sidecar('Areas', 'Area Two')]))

  const skip = await tryAgain(cdp, pairs.skip, ids['M2 Skip'], () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M2 Skip'], label: 'M2 Skipped' }), async () => {
    pin(G, 'F-1', 'a rename that skips an unreadable file owes its old key in its own entry and sweeps the rest',
      same(owedOf(ids['M2 Skip']), { kind: 'property', rename: ['M2 Skip'] }) && (await wrote(pairs.skip[1][0], 'M2 Skipped: b')), show(owedOf(ids['M2 Skip'])))
  })
  pin(G, 'F-1', 'Try Again brings the skipped file current and clears the entry',
    !!skip.owed && skip.replayed?.ok && (await wrote(skip.first, 'M2 Skipped: a')) && owedOf(ids['M2 Skip']) === null, show([skip.r, skip.replayed, blockOf(skip.first)]))

  const chainId = ids['M2 Chain']
  let relinked
  const chain = await tryAgain(cdp, pairs.chain, chainId, () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: chainId, label: 'M2 Chained' }), async () => {
    relinked = (await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: chainId, label: 'M2 Linked' })).ok
      && (await wrote(pairs.chain[1][0], 'M2 Linked: b')) && same(owedOf(chainId), { kind: 'property', rename: ['M2 Chain'] })
  })
  pin(G, 'F-1', "a second rename lands while the first is owed, and Try Again brings the first's skipped file to the second name",
    !!chain.owed && relinked && chain.replayed?.ok && (await wrote(chain.first, 'M2 Linked: a')) && owedOf(chainId) === null,
    show([chain.r, chain.replayed, blockOf(chain.first), blockOf(chain.second)]))

  const [[back1], [back2]] = pairs.back
  const moved = await unreadable(back1, () => ask(cdp, 'mutate', { op: 'renameContext', contextId: back, newName: 'M2 Front' }))
  const owedBack = moved.ok && !!moved.value?.cascade?.owed && same(owedOf(back), { kind: 'context', rename: ['M2 Back'] })
  await wrote(back2, '<M2 Front>: [M2 Spot]')
  await must('rename M2 Front back', ask(cdp, 'mutate', { op: 'renameContext', contextId: back, newName: 'M2 Back' }))
  await wrote(back2, '<M2 Back>: [M2 Spot]')
  const backKept = snapshot([back1, back2])
  const retried = owedBack ? await ask(cdp, 'mutate', FINISH) : null
  pin(G, 'F-1', "a Context renamed back owes nothing, its Try Again writes nothing, and no holder loses the key",
    owedBack && retried?.ok && (await backKept.holds()) && owedOf(back) === null && blockOf(back1) === '<M2 Back>: [M2 Spot]',
    show([moved, retried, owedOf(back), blockOf(back1), blockOf(back2)]))
}

// ── Group 3 — Exact words, foreign words, Is and Is Not (Phase 3) ──────────

async function group3(cdp) {
  const G = 3
  const { cases, add: row } = caseTable('M3')
  const C = { choice: 'M3 Choice', stage: 'M3 Stage', labels: 'M3 Labels', colors: 'M3 Colors', areas: '<Areas>' }

  // Select and Status: a scalar of any quote style names its option, and one in another casing names none; a word with
  // stray spaces, a bare numeral, and another Unicode composition still name it; a write lands as a one-item list in
  // the file's quotes, a quote yaml needed spreading to no value it can leave bare.
  for (const [held, shown, want, decision = 'A-3'] of [
    ['Done', 'Done', '\n  - Doing'], ["'Done'", 'Done', "\n  - 'Doing'"], ['"Done"', 'Done', '\n  - "Doing"'],
    ['done', '', '\n  - Doing', 'A-1 E-2'], ['[Done]', 'Done', ' [Doing]'], ["['Done']", 'Done', " ['Doing']"],
    ['\n  - "Done"', 'Done', '\n  - "Doing"'], ['2024', '2024', '\n  - Doing'], ["'2024'", '2024', '\n  - Doing'],
    ['" Done "', 'Done', '\n  - Doing'], ['Café', 'Café', '\n  - Doing'],
  ])
    row('Choice', decision, C.choice, `M3 Choice:${held.startsWith('\n') ? '' : ' '}${held}`, shown, [set('select', 'Doing'), `M3 Choice:${want}`])
  for (const [held, shown, want, decision = 'A-3'] of [
    [' Todo', 'Todo', '\n  - Done'], [" 'Todo'", 'Todo', "\n  - 'Done'"], [' ["todo"]', '', ' ["Done"]', 'A-1 E-2'],
    ['\n  - "Todo"', 'Todo', '\n  - "Done"'],
  ])
    row('Stage', decision, C.stage, `M3 Stage:${held}`, shown, [set('select', 'Done'), `M3 Stage:${want}`])

  // Multi-Select: each member keeps its own quotes, a new member takes the quotes the file chose, a list keeps its flow
  // or block style, and a word no option claims stays after the picked ones until the property empties.
  for (const [held, shown, next, want, decision = 'A-3'] of [
    [' [Work]', 'Work', ['Work', 'Life'], ' [Work, Life]'], [" ['Work']", 'Work', ['Work', 'Life'], " ['Work', 'Life']"],
    [' ["Work"]', 'Work', ['Work', 'Life'], ' ["Work", "Life"]'], ['\n  - Work', 'Work', ['Work', 'Life'], '\n  - Work\n  - Life'],
    ["\n  - 'Work'", 'Work', ['Work', 'Life'], "\n  - 'Work'\n  - 'Life'"], ['\n  - "Work"', 'Work', ['Work', 'Life'], '\n  - "Work"\n  - "Life"'],
    [' ["Work", Life]', 'Work|Life', ['Work', 'Life', 'Home'], ' ["Work", Life, "Home"]'], ['\n  - 2024', '2024', ['2024', 'Work'], '\n  - 2024\n  - Work'],
    [" ['2024']", '2024', ['2024', 'Work', '2025'], " ['2024', Work, '2025']"], [' Work', 'Work', ['Work', 'Life'], '\n  - Work\n  - Life'],
    [' [work, "Life"]', 'Life', ['Work'], ' ["Work", work]', 'E-1 E-3'], [' ["Work", "Life"]', 'Work|Life', ['Life'], ' ["Life"]'],
    [' [Work, work]', 'Work', null, '', 'E-3'], [' [Work, LIFE]', 'Work', ['Work', 'Home'], ' [Work, Home, LIFE]', 'E-3'],
    [' [life, Work]', 'Work', ['Home'], ' [Home, life]', 'E-3'],
  ])
    row('Labels', decision, C.labels, `M3 Labels:${held}`, shown, [set('multiSelect', next), want === '' ? '' : `M3 Labels:${want}`])

  // Adoption under Match Title: a foreign word of any casing becomes an option unless it duplicates one without regard to case.
  row('Colors', 'E-1 E-3', C.colors, 'M3 Colors: [red, green, PURPLE, Red]', 'red|green|PURPLE', [set('multiSelect', ['red']), 'M3 Colors: [red, Red]'])

  // Spaces: a Space title matches exactly, quoted or bare, a title in another casing is foreign data, and a Space write
  // keeps the file's quotes and list style.
  for (const [held, shown, titles, want, decision = 'A-3'] of [
    [' [Area One]', 'Area One', ['Area One', 'Area Two'], ' [Area One, Area Two]'],
    [" ['Area One']", 'Area One', ['Area One', 'Area Two'], " ['Area One', 'Area Two']"],
    [' ["Area One"]', 'Area One', ['Area One', 'Area Two'], ' ["Area One", "Area Two"]'],
    ['\n  - Area One', 'Area One', ['Area One', 'Area Two'], '\n  - Area One\n  - Area Two'],
    ['\n  - "Area One"', 'Area One', ['Area One', 'Area Two'], '\n  - "Area One"\n  - "Area Two"'],
    [' area one', '', ['Area One', 'Area Two'], '\n  - Area One\n  - Area Two', 'A-2'],
    [" ['Area One', 'Area Two']", 'Area One|Area Two', ['Area Two'], " ['Area Two']"],
  ])
    row('Areas', decision, C.areas, `<Areas>:${held}`, shown, [spaces('Areas', titles), `<Areas>:${want}`])
  row('Areas', 'A-3', C.areas, '<Areas>: [" Area One "]', 'Area One')

  // The cascades: every quote style follows a rename, while a word or a title in another casing stays as written.
  await makeSpace(cdp, 'Areas', 'M3 Place')
  const cascades = [
    { rel: pageAt('M3 Cascade Option 1'), held: "M3 Labels: ['Work', Life]", want: "M3 Labels: ['Job', Life]", by: 'option' },
    { rel: pageAt('M3 Cascade Option 2'), held: 'M3 Labels:\n  - "Work"', want: 'M3 Labels:\n  - "Job"', by: 'option' },
    { rel: pageAt('M3 Cascade Option 3'), held: 'M3 Labels: [work]', want: 'M3 Labels: [work]', by: 'option' },
    { rel: pageAt('M3 Cascade Space 1'), held: "<Areas>: ['M3 Place']", want: "<Areas>: ['M3 Plaza']", by: 'space' },
    { rel: pageAt('M3 Cascade Space 2'), held: '<Areas>:\n  - "M3 Place"', want: '<Areas>:\n  - "M3 Plaza"', by: 'space' },
    { rel: pageAt('M3 Cascade Space 3'), held: '<Areas>: [m3 place]', want: '<Areas>: [m3 place]', by: 'space' },
  ]
  const recasePages = [[pageAt('M3 Case 1'), 'M3 Case: a'], [pageAt('M3 Case 2'), 'M3 Case: b']]
  // Undo lives only in the interface: each gesture's revert puts back what the file held, byte for byte.
  const U = { tags: 'M3 Tags', pick: 'M3 Pick', count: 'M3 Count' }
  const undos = [
    { name: 'a Multi-Select pick over a word no option names', decision: 'A-1 E-3 Undo', column: U.tags, held: 'M3 Tags: [work]', pick: 'Work', want: 'M3 Tags: [Work, work]' },
    { name: 'unpicking beside an adopted word', decision: 'E-1 Undo', column: U.tags, held: 'M3 Tags: [Work, ideas]', pick: 'Work', want: 'M3 Tags: [ideas]' },
    { name: 'a Select pick over another casing', decision: 'A-1 E-2 Undo', column: U.pick, held: 'M3 Pick: done', pick: 'Doing', want: 'M3 Pick:\n  - Doing' },
    { name: "a Number typed over a value it can't read", decision: 'Undo', column: U.count, held: 'M3 Count: abc', typed: '5', want: 'M3 Count: 5' },
    { name: 'a Multi-Select pick adding an option', decision: 'Undo', column: U.tags, held: 'M3 Tags: [Work]', pick: 'Play', want: 'M3 Tags: [Work, Play]' },
  ].map((u, i) => ({ ...u, rel: pageAt(`M3 Undo ${i + 1}`) }))
  const FILTER_A = pageAt('M3 Filter A')
  const FILTER_B = pageAt('M3 Filter B')
  const UNADOPTED = pageAt('M3 Unadopted')
  const seeds = [
    ...cases.map((c) => [c.rel, c.held]),
    ...cascades.map((c) => [c.rel, c.held]),
    [FILTER_A, 'M3 Choice: Done\nM3 Stage: Todo\nM3 Labels: [Work]'],
    [FILTER_B, 'M3 Choice: Doing\nM3 Stage: Done'],
    [UNADOPTED, 'M3 Stage: Blocked'],
    ...recasePages,
    ...undos.map((u) => [u.rel, u.held]),
  ]
  seedAll(seeds)
  editSidecar('Areas', 'Area One', { 'M3 Labels': ['work', 'Work'] })
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  await defineAll(cdp, [
    { label: C.choice, type: 'select', select_options: ['Done', 'Doing', '2024', 'Café'].map(word) },
    { label: C.stage, type: 'status', status_groups: statusGroups(['Todo'], ['Done']) },
    { label: C.labels, type: 'multiSelect', select_options: ['Work', 'Life', 'Home', '2024', '2025'].map(word) },
    { label: C.colors, type: 'multiSelect', select_options: ['red', 'blue'].map(word) },
    { label: 'M3 Case', type: 'text' },
    { label: U.tags, type: 'multiSelect', select_options: ['Work', 'Play'].map(word) },
    { label: U.pick, type: 'select', select_options: ['Done', 'Doing'].map(word) },
    { label: U.count, type: 'number' },
  ])
  ids[C.areas] = contextIdOf('Areas')
  const columns = Object.values(C)
  const view = mintViewId()
  const exact = mintViewId()
  await saveView(cdp, view, 'Metadata Drive Words', columns.map((c) => ids[c]))
  const work = optionId(defOf(ids[C.labels]), 'Work')
  await saveView(cdp, exact, 'Metadata Drive Work', [], { filter: filterOf(rule(ids[C.labels], 'contains_any', [work])) })
  const undoColumns = Object.values(U)
  const undoView = mintViewId()
  await saveView(cdp, undoView, 'Metadata Drive Undo', undoColumns.map((c) => ids[c]), { filter: filterOf(rule('_title', 'starts_with', 'M3 Undo')) })
  await until('green adopted', async () => (await ask(cdp, 'property:holders', ids[C.colors], { of: 'option', optionId: optionId(defOf(ids[C.colors]), 'green') })).ok, 10000)
  await until('ideas adopted', async () => (await ask(cdp, 'property:holders', ids[U.tags], { of: 'option', optionId: optionId(defOf(ids[U.tags]), 'ideas') })).ok, 10000)
  await sleep(1500)
  seededAsWritten(G, seeds)
  pin(G, 'E-2', 'a Status adopts no word its options lack', await holds(async () => same(keysOf(ids[C.stage]), ['Todo', 'Done']), 3000), show(wordsOf(ids[C.stage])))

  checkReads(G, cases, await readTable(cdp, view), columns)
  await checkWrites(G, cdp, cases)

  // Is and Is Not compare an option exactly, as Contains Any does; Contains stays folded as search.
  const titled = rule('_title', 'starts_with', 'M3 Filter')
  const done = optionId(defOf(ids[C.choice]), 'Done')
  for (const [decision, name, r, want] of [
    ['F-2', 'Select Is names its option by id', rule(ids[C.choice], 'is', done), [FILTER_A]],
    ['F-2', 'Select Is Not names its option by id', rule(ids[C.choice], 'is_not', done), [FILTER_B]],
    ['F-2', 'Select Contains stays folded as search', rule(ids[C.choice], 'contains', 'DON'), [FILTER_A]],
    ['F-2', 'Status Is names its option by id', rule(ids[C.stage], 'is', optionId(defOf(ids[C.stage]), 'Todo')), [FILTER_A]],
    ['F-2', 'Multi-Select Contains Any names its option by id', rule(ids[C.labels], 'contains_any', [work]), [FILTER_A]],
  ]) {
    const filterView = mintViewId()
    await saveView(cdp, filterView, name, [], { filter: filterOf(titled, r) })
    const shown = shownRels(await readTable(cdp, filterView))
    pin(G, decision, name, same(shown, [...want].sort()), show(shown))
  }

  await readTable(cdp, undoView)
  for (const u of undos) {
    const cell = cellOf(u.rel, undoColumns.indexOf(u.column))
    await escapeAll(cdp)
    if (u.typed) {
      await openField(cdp, cell)
      await selectField(cdp)
      await typeText(cdp, u.typed)
      await pressKey(cdp, 'Enter')
    } else {
      await mouseClick(cdp, cell)
      await until('the value picker', () => portalOpen(cdp))
      await mouseAt(cdp, await boxOf(cdp, pickerRowOf(u.pick)))
    }
    await escapeAll(cdp)
    pin(G, u.decision, `${u.name}: the gesture writes ${show(u.want)}`, await wrote(u.rel, u.want), show(blockOf(u.rel)))
    await pressKey(cdp, 'z', META)
    pin(G, u.decision, `${u.name}: undo puts back what the file held`, await wrote(u.rel, u.held), show(blockOf(u.rel)))
  }

  await checkCascades(G, cdp, cascades, {
    option: { label: 'an option rename', decision: 'A-1 F-2', run: () => ask(cdp, 'mutate', { op: 'renameOption', propertyId: ids[C.labels], optionId: work, label: 'Job' }) },
    space: { label: 'a Space retitle', decision: 'A-2', run: () => ask(cdp, 'mutate', { op: 'renameSpace', spaceId: spaceIdOf('Areas', 'M3 Place'), newName: 'M3 Plaza' }) },
  })
  pin(G, 'A-1', 'an option rename edits a Space list by the exact word and leaves another casing',
    same(sidecar('Areas', 'Area One')['M3 Labels'], ['work', 'Job']), show(sidecar('Areas', 'Area One')['M3 Labels']))
  const recase = await tryAgain(cdp, recasePages, ids['M3 Case'], () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M3 Case'], label: 'm3 case' }))
  pin(G, 'A-1 F-3', 'a case-only rename owes its skipped file, and Try Again moves the key',
    !!recase.owed && (await wrote(recase.second, 'm3 case: b')) && (await wrote(recase.first, 'm3 case: a')) && owedOf(ids['M3 Case']) === null,
    show([recase.r, blockOf(recase.first), blockOf(recase.second)]))
  pin(G, 'F-2', "an option rename leaves a saved view naming the option's id",
    same(operandsFor(viewOf(exact), ids[C.labels]), [work]), show(operandsFor(viewOf(exact), ids[C.labels])))
}

// ── Group 4 — Counts and Items (Phase 4) ────────────────────────────────────

async function group4(cdp) {
  const G = 4
  const one = pageAt('M4 One')
  const two = pageAt('M4 Two')
  const variant = pageAt('M4 Variant')
  const tags = [1, 2, 3].map((n) => pageAt(`M4 Tag ${n}`))
  const held = pageAt('M4 Held')
  const pair = [1, 2].map((n) => pageAt(`M4 Pair ${n}`))
  const notice = [1, 2].map((n) => pageAt(`M4 Notice ${n}`))
  const seeds = [
    [one, 'M4 Priority: [hi]'], [two, 'M4 Priority: [lo]'], [variant, 'm4 priority: [hi]'],
    [tags[0], 'M4 Tags: [a]'], [tags[1], 'M4 Tags: [a, b]'], [tags[2], 'M4 Tags: [b]'],
    [held, 'M4 Held: x\nm4 held: y'], ...pair.map((rel) => [rel, 'M4 Pair: x\nm4 pair: y']),
    ...notice.map((rel) => [rel, 'M4 Notice: n']),
  ]
  seedAll(seeds)
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  const priority = await define(cdp, { label: 'M4 Priority', type: 'multiSelect', select_options: ['hi', 'lo'].map(word) })
  const tagsId = await define(cdp, { label: 'M4 Tags', type: 'multiSelect', select_options: ['a', 'b'].map(word) })
  await defineAll(cdp, ['M4 Held', 'M4 Pair', 'M4 Notice'].map((label) => ({ label, type: 'text' })))
  editSidecar('Areas', 'Area One', { 'M4 Priority': ['hi'] })
  editSidecar('Areas', 'Area Two', { 'M4 Tags': ['a'] })
  await must('Area Two orders M4 Priority', ask(cdp, 'mutate', { op: 'setSpaceRowOrder', path: spacePath('Areas', 'Area Two'), ids: [priority] }))
  await sleep(1500)
  seededAsWritten(G, seeds)

  const AREA_ONE = sidecarAt('Areas', 'Area One')
  const AREA_TWO = sidecarAt('Areas', 'Area Two')
  const counted = async (decision, name, of, files, n, run) => {
    const before = snapshot([...files, variant, ...tags, AREA_ONE, AREA_TWO])
    const count = await ask(cdp, 'property:holders', ...of)
    pin(G, decision, `${name}: the count is ${n}`, count.ok && count.value === n, show(count))
    pin(G, decision, `${name}: counting writes nothing`, await before.holds(1500), show(before.changed()))
    await must(name, run())
    await settles(async () => before.changed().length >= n, 6000)
    await sleep(800)
    pin(G, decision, `${name}: it rewrites exactly the ${itemCount(n)} it counted`, same(before.changed().sort(), [...files].sort()), show(before.changed()))
  }
  await counted('J-1 F-4', 'a property delete', [priority, { of: 'property' }], [one, two, AREA_ONE, AREA_TWO], 4, () => ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: priority }))
  const [a, b] = ['a', 'b'].map((label) => optionId(defOf(tagsId), label))
  await counted('F-4', 'a Clear', [tagsId, { of: 'option', optionId: a }], [tags[0], tags[1], AREA_TWO], 3, () => ask(cdp, 'mutate', { op: 'clearOption', propertyId: tagsId, optionId: a }))
  await counted('F-4', 'a Delete', [tagsId, { of: 'option', optionId: b }], [tags[1], tags[2]], 2, () => ask(cdp, 'mutate', { op: 'deleteOption', propertyId: tagsId, optionId: b }))

  pin(G, 'J-1', 'the rename refusal counts one Item', refusedAs(await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M4 Held'], label: 'm4 held' }), COPY.itemsHoldingBothKeys, 1, 'M4 Held', 'm4 held'))
  pin(G, 'J-1', 'the rename refusal counts two Items', refusedAs(await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M4 Pair'], label: 'm4 pair' }), COPY.itemsHoldingBothKeys, 2, 'M4 Pair', 'm4 pair'))
  const skipped = await unreadable(notice[0], () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M4 Notice'], label: 'M4 Notices' }))
  pin(G, 'J-1', 'an unswept notice says Items', skipped.ok && skipped.value?.cascade?.warning === 'Couldn’t update 1 Item.', show(skipped))
  if (skipped.ok && skipped.value?.cascade?.owed) await must('Try Again', ask(cdp, 'mutate', FINISH))
}

// ── Group 5 — The label and key registry (Phases 5A and 5B) ────────────────

async function group5(cdp) {
  const G = 5
  const grade = await define(cdp, { label: 'M5 Grade', type: 'select', select_options: ['A', 'B'].map(word) })
  const phase = await define(cdp, { label: 'M5 Phase', type: 'status', status_groups: statusGroups(['Planned'], ['Shipped']) })
  const g = defOf(grade)
  pin(G, 'C-1 C-2', 'a create stores a label and a key, and every option both words',
    g.label === 'M5 Grade' && g.key === 'M5 Grade' && !('name' in g) && same(wordsOf(grade), [['A', 'A'], ['B', 'B']]) && optionsOf(g).every((o) => !('value' in o)), show(g))
  pin(G, 'C-2', "a Status create stores both words on every grouped option", same(wordsOf(phase), [['Planned', 'Planned'], ['Shipped', 'Shipped']]), show(defOf(phase)))

  const due = [pageAt('M5 Due 1'), pageAt('M5 Due 2')]
  const bare = pageAt('M5 Bare 1')
  const flags = pageAt('M5 Flags 1')
  const kind = [1, 2, 3].map((n) => pageAt(`M5 Kind ${n}`))
  const seeds = [
    [due[0], 'm5_due: soon'], [due[1], 'M5 Due: other'], [bare, 'M5 Bare: plain'], [flags, 'M5 Flags: [done]'],
    [kind[0], 'M5 Kind: [urgent]'], [kind[1], 'M5 Kind: Urgent'], [kind[2], 'M5 Kind: Urgent'],
  ]
  seedAll(seeds)
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  const dueId = await handWritten(cdp, { id: mintPropertyId(), label: 'M5 Due', key: 'm5_due', type: 'text' })
  const bareId = await handWritten(cdp, { id: mintPropertyId(), key: 'M5 Bare', type: 'text' })
  const flagsId = await define(cdp, { label: 'M5 Flags', type: 'multiSelect', select_options: [{ key: 'in-progress', label: 'In Progress' }, { key: 'done', label: 'Done' }] })
  const kindId = await define(cdp, { label: 'M5 Kind', type: 'select', select_options: [{ key: 'urgent', label: 'Urgent' }] })
  const columns = [dueId, bareId, flagsId, kindId]
  const view = mintViewId()
  await saveView(cdp, view, 'Metadata Drive Registry', columns)
  await sleep(2000)
  seededAsWritten(G, seeds)

  const rows = await readTable(cdp, view)
  const cell = (rel, id) => rows[pageIds[rel]]?.[columns.indexOf(id)]
  pin(G, 'C-2', 'a key written by hand apart from its label is the key every read trusts',
    cell(due[0], dueId) === 'soon' && cell(due[1], dueId) === '', show([cell(due[0], dueId), cell(due[1], dueId)]))
  pin(G, 'C-3', 'a definition with no label reads its key', cell(bare, bareId) === 'plain', show(cell(bare, bareId)))
  pin(G, 'C-1', 'an option word decodes to its label', cell(flags, flagsId) === 'Done', show(cell(flags, flagsId)))
  pin(G, 'A-1 C-1', "a Select word is its option's key, and the label written as a word is foreign",
    cell(kind[0], kindId) === 'Urgent' && cell(kind[1], kindId) === '', show([cell(kind[0], kindId), cell(kind[1], kindId)]))

  await setValue(cdp, due[1], dueId, { kind: 'text', value: 'later' })
  pin(G, 'C-2', 'a write lands on the stored key', await wrote(due[1], 'M5 Due: other\nm5_due: later'), show(blockOf(due[1])))
  await must('an unrelated registry write', ask(cdp, 'mutate', { op: 'configureProperty', propertyId: grade, patch: { icon: 'tag' } }))
  await sleep(1000)
  pin(G, 'C-3', 'a definition with no label rides through a write as it was written', !('label' in defOf(bareId)) && defOf(bareId).key === 'M5 Bare', show(defOf(bareId)))
  await setValue(cdp, flags, flagsId, { kind: 'multiSelect', value: ['In Progress', 'Done'] })
  pin(G, 'C-1', "a write encodes each option id as its option's key", await wrote(flags, 'M5 Flags: [in-progress, done]'), show(blockOf(flags)))
  await setValue(cdp, kind[1], kindId, { kind: 'select', value: 'Urgent' })
  pin(G, 'C-1', "a Select pick writes the option's key", await wrote(kind[1], 'M5 Kind:\n  - urgent'), show(blockOf(kind[1])))
  const foreignKind = snapshot([kind[2]])
  await must('clear Urgent', ask(cdp, 'mutate', { op: 'clearOption', propertyId: kindId, optionId: optionId(defOf(kindId), 'Urgent') }))
  pin(G, 'C-1', "Clear names the option by id and strips its key, leaving the label written as a word",
    (await wrote(kind[0], '')) && (await wrote(kind[1], '')) && (await foreignKind.holds()), show(kind.map(blockOf)))

  // Uniqueness: labels and keys are each unique without regard to case, and a reserved key is refused on either word.
  const step = await must('create m5 grade', add(cdp, { label: 'm5 grade', type: 'text' }))
  pin(G, 'D-1', 'a create under a label another holds in another casing steps aside on both words',
    defOf(step.created.propertyId)?.label === 'm5 grade (2)' && defOf(step.created.propertyId)?.key === 'm5 grade (2)', show(defOf(step.created.propertyId)))
  pin(G, 'D-1', 'a rename onto a label another holds in another casing is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: kindId, label: 'm5 grade' }), COPY.aLabelAnotherPropertyHolds, 'm5 grade'))
  pin(G, 'D-1', 'a rename onto a key another property writes is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: kindId, label: 'M5_DUE' }), COPY.aKeyAnotherPropertyWrites, 'M5_DUE') && defOf(kindId).label === 'M5 Kind')
  pin(G, 'D-1', 'a create labelled Id is refused as a key Pommora manages', refusedAs(await add(cdp, { label: 'Id', type: 'text' }), COPY.aKeyPommoraManages))
  pin(G, 'D-1', 'a create labelled Banner is refused as a key Pommora manages', refusedAs(await add(cdp, { label: 'Banner', type: 'text' }), COPY.aKeyPommoraManages))
  const banner = mintPropertyId()
  writeDef({ id: banner, label: 'M5 Banner', key: 'banner', type: 'text' })
  await sleep(1500)
  pin(G, 'D-1', 'a definition written by hand onto a reserved key is not admitted', (await ask(cdp, 'property:holders', banner, { of: 'property' })).ok === false)
  const optionsBefore = show(wordsOf(grade))
  pin(G, 'D-2', 'an option label in another casing of one the property holds is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'editOption', propertyId: grade, edit: { op: 'add', groupId: 'select', id: mintOptionId(), label: 'a' } }), COPY.twoOptionsTitledAlike) && show(wordsOf(grade)) === optionsBefore)
  pin(G, 'D-2', 'two options writing one key in two casings are refused at create',
    refusedAs(await add(cdp, { label: 'M5 Twins', type: 'select', select_options: [{ key: 'A', label: 'A' }, { key: 'a', label: 'B' }] }), COPY.twoOptionsWritingOneKey))
  pin(G, 'D-2', 'an option with a blank key is refused at create',
    refusedAs(await add(cdp, { label: 'M5 Blank', type: 'select', select_options: [{ key: '', label: 'A' }] }), COPY.anEmptyKey, 'Options'))
  pin(G, 'J-1', 'a Status create holding two options in two casings is refused',
    refusedAs(await add(cdp, { label: 'M5 Doubled', type: 'status', status_groups: statusGroups(['Done'], ['done']) }), COPY.twoOptionsTitledAlike))
  pin(G, 'J-1', 'a Status create holding a blank key is refused',
    refusedAs(await add(cdp, { label: 'M5 Hollow', type: 'status', status_groups: [{ id: 'todo', label: 'To-do', color: 'grey', options: [{ key: ' ', label: 'Open' }] }] }), COPY.anEmptyKey, 'Options'))
}

// ── Group 6 — The journal and the cascades (Phase 6) ───────────────────────

async function group6(cdp) {
  const G = 6
  const tone = [pageAt('M6 Tone 1'), pageAt('M6 Tone 2')]
  const stashedPage = pageAt('M6 Stashed', STASH_SET)
  const kind = pageAt('M6 Kind 1')
  const due = [pageAt('M6 Due 1'), pageAt('M6 Due 2')]
  const tint = [pageAt('M6 Tint 1'), pageAt('M6 Tint 2')]
  const doomed = [pageAt('M6 Doomed 1'), pageAt('M6 Doomed 2')]
  const strike = [pageAt('M6 Strike 1'), pageAt('M6 Strike 2')]
  const free = pageAt('M6 Free 1')
  const seeds = [
    [tone[0], 'M6 Tones: [Light Blue, Dark Red]'], [tone[1], 'M6 Tones: [Mid Grey]'], [kind, 'M6 Kind: [urgent]'],
    ...due.map((rel, i) => [rel, `m6_due: ${'ab'[i]}`]), ...tint.map((rel) => [rel, 'M6 Tints: [Pale]']),
    ...doomed.map((rel) => [rel, 'M6 Doomed: z']), ...strike.map((rel) => [rel, 'M6 Strike: [x, y]']), [free, 'M6 Free: f'],
  ]
  seedAll(seeds)
  seedPage(stashedPage, 'M6 Tones: [Light Blue, Mid Grey]')
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  const tones = await define(cdp, { label: 'M6 Tones', type: 'multiSelect', select_options: ['Light Blue', 'Dark Red', 'Mid Grey'].map(word) })
  const kindId = await define(cdp, { label: 'M6 Kind', type: 'select', select_options: [{ key: 'urgent', label: 'Urgent' }] })
  const tints = await define(cdp, { label: 'M6 Tints', type: 'multiSelect', select_options: ['Pale', 'Deep'].map(word) })
  const strikeId = await define(cdp, { label: 'M6 Strike', type: 'multiSelect', select_options: ['x', 'y'].map(word) })
  await defineAll(cdp, ['M6 Doomed', 'M6 Free'].map((label) => ({ label, type: 'text' })))
  const dueId = await handWritten(cdp, { id: mintPropertyId(), label: 'M6 Due', key: 'm6_due', type: 'text' })
  editSidecar('Areas', 'Area One', { 'M6 Tones': ['Light Blue'] })
  await stashed(cdp, tones, stashedPage)
  const toneView = mintViewId()
  const kindView = mintViewId()
  const lightBlue = optionId(defOf(tones), 'Light Blue')
  const urgent = optionId(defOf(kindId), 'Urgent')
  await saveView(cdp, toneView, 'Metadata Drive Tones', [tones], { filter: filterOf(rule(tones, 'contains_any', [lightBlue])) })
  await saveView(cdp, kindView, 'Metadata Drive Kind', [kindId], { filter: filterOf(rule(kindId, 'is', urgent)) })
  const tiles = await viewTile(cdp, 'Areas', 'Area Two', toneView)
  await matrixFilter(cdp, rule(tones, 'contains_any', [lightBlue]))
  await sleep(1500)
  seededAsWritten(G, seeds)

  const named = () => ({
    view: operandsFor(viewOf(toneView), tones),
    tile: operandsFor(JSON.parse(read(tiles)), tones),
    matrix: operandsFor(JSON.parse(read(MATRIX)), tones),
  })
  const namedBefore = named()
  await must('rename Light Blue', ask(cdp, 'mutate', { op: 'renameOption', propertyId: tones, optionId: lightBlue, label: 'Sky Blue' }))
  pin(G, 'F-2', 'an option rename rewrites the page, the Space, and the Collection stash by key',
    (await wrote(tone[0], 'M6 Tones: [Sky Blue, Dark Red]')) && same(sidecar('Areas', 'Area One')['M6 Tones'], ['Sky Blue'])
      && same(stashOf(tones)[pageIds[stashedPage]], ['Sky Blue', 'Mid Grey']),
    show([blockOf(tone[0]), sidecar('Areas', 'Area One')['M6 Tones'], stashOf(tones)]))
  pin(G, 'F-2', "an option rename leaves the saved view, the View Tile, and the Matrix filter naming the option's id",
    same(namedBefore, { view: [lightBlue], tile: [lightBlue], matrix: [lightBlue] }) && same(named(), namedBefore), show([namedBefore, named()]))
  await must('rename Urgent', ask(cdp, 'mutate', { op: 'renameOption', propertyId: kindId, optionId: urgent, label: 'Critical' }))
  pin(G, 'F-2', "under Match Title an option's key follows its label on the page, and the view keeps naming the option's id",
    (await wrote(kind, 'M6 Kind: [Critical]')) && same(operandsFor(viewOf(kindView), kindId), [urgent]) && same(wordsOf(kindId), [['Critical', 'Critical']]),
    show([blockOf(kind), operandsFor(viewOf(kindView), kindId)]))
  await must('delete Critical', ask(cdp, 'mutate', { op: 'deleteOption', propertyId: kindId, optionId: urgent }))
  pin(G, 'F-2', 'an option delete strips the page and the view naming it',
    (await wrote(kind, '')) && !operandsFor(viewOf(kindView), kindId).includes(urgent), show([blockOf(kind), viewOf(kindView).filter]))
  await must('delete Mid Grey', ask(cdp, 'mutate', { op: 'deleteOption', propertyId: tones, optionId: optionId(defOf(tones), 'Mid Grey') }))
  pin(G, 'F-2', 'an option delete strips the page and the Collection stash',
    (await wrote(tone[1], '')) && same(stashOf(tones)[pageIds[stashedPage]], ['Sky Blue']), show([blockOf(tone[1]), stashOf(tones)]))
  await must('clear Sky Blue', ask(cdp, 'mutate', { op: 'clearOption', propertyId: tones, optionId: lightBlue }))
  pin(G, 'J-1', 'Clear strips the Collection stash too', await settles(async () => !listOf(stashOf(tones)[pageIds[stashedPage]]).includes('Sky Blue')), show(stashOf(tones)))
  await must('assign M6 Tones to Collection B again', ask(cdp, 'mutate', { op: 'assignProperty', containerPath: STASH_COLLECTION, propertyId: tones }))
  pin(G, 'J-1', 'a reassign after a Clear brings the cleared value back nowhere',
    await holds(async () => !listOf(fmOf(stashedPage)['M6 Tones']).includes('Sky Blue'), 2500), show(blockOf(stashedPage)))

  // The notes: each item owes its own entry of stored keys, an option change and Clear run while another owes work, a
  // name another option still owes is refused, and Try Again brings the skipped file current.
  const renamed = await unreadable(due[0], () => ask(cdp, 'mutate', { op: 'renameProperty', propertyId: dueId, label: 'M6 When' }))
  pin(G, 'F-1', 'a rename entry carries the stored key',
    !!renamed.value?.cascade?.owed && same(owedOf(dueId), { kind: 'property', rename: ['m6_due'] }), show([renamed, owedOf(dueId)]))
  await must('Try Again', ask(cdp, 'mutate', FINISH))
  pin(G, 'F-1', "the rename's Try Again moves the stored key", (await wrote(due[0], 'M6 When: a')) && owedOf(dueId) === null, show(blockOf(due[0])))

  const [pale, deep] = ['Pale', 'Deep'].map((label) => optionId(defOf(tints), label))
  const optionEntry = { kind: 'property', options: { [pale]: { rename: ['Pale'] } } }
  const owing = await unreadable(tint[0], () => ask(cdp, 'mutate', { op: 'renameOption', propertyId: tints, optionId: pale, label: 'Light' }))
  pin(G, 'F-1', "an option rename entry carries the option's old key",
    !!owing.value?.cascade?.owed && same(owedOf(tints), optionEntry), show([owing, owedOf(tints)]))
  pin(G, 'B-1', 'another option renames while the property owes work',
    (await ask(cdp, 'mutate', { op: 'renameOption', propertyId: tints, optionId: deep, label: 'Dark' })).ok && same(owedOf(tints), optionEntry))
  const held = snapshot([...tint, REGISTRY, NOTES])
  pin(G, 'F-1', 'an option renamed onto a word another option still owes is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'renameOption', propertyId: tints, optionId: deep, label: 'Pale' }), COPY.aNameStillOwed))
  pin(G, 'F-1', 'a refused option rename writes nothing', await held.holds(), show(held.changed()))
  pin(G, 'B-1', 'Clear runs while its own property owes work',
    (await ask(cdp, 'mutate', { op: 'clearOption', propertyId: tints, optionId: deep })).ok && same(owedOf(tints), optionEntry))
  pin(G, 'B-1', 'a property rename runs while another property owes work',
    (await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids['M6 Free'], label: 'M6 Freed' })).ok && (await wrote(free, 'M6 Freed: f')))
  const shielded = seedPage(pageAt('M6 Tint 3'), 'M6 Tints: [Pale]')
  await indexed(cdp, COLLECTION, [shielded])
  pin(G, 'F-1', "the owed entry's old key isn't adopted while it's owed", await holds(async () => !keysOf(tints).includes('Pale'), 3000), show(wordsOf(tints)))
  await must('Try Again', ask(cdp, 'mutate', FINISH))
  pin(G, 'F-1', "the option rename's Try Again brings the skipped file current and clears the entry",
    (await wrote(tint[0], 'M6 Tints: [Light]')) && owedOf(tints) === null, show([blockOf(tint[0]), owedOf(tints)]))

  const removedProp = await unreadable(doomed[0], () => ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: ids['M6 Doomed'] }))
  pin(G, 'F-1', 'a delete entry carries the stored key',
    !!removedProp.value?.cascade?.owed && same(owedOf(ids['M6 Doomed']), { kind: 'property', strip: ['M6 Doomed'] }), show(removedProp))
  if (removedProp.value?.cascade?.owed) await must('Try Again', ask(cdp, 'mutate', FINISH))
  pin(G, 'F-1', "the delete's Try Again strips the skipped file", (await wrote(doomed[0], '')) && owedOf(ids['M6 Doomed']) === null, show(blockOf(doomed[0])))

  const x = optionId(defOf(strikeId), 'x')
  const removedOption = await unreadable(strike[0], () => ask(cdp, 'mutate', { op: 'deleteOption', propertyId: strikeId, optionId: x }))
  pin(G, 'F-1', 'an option delete entry carries the stored key, the option already off the list',
    !!removedOption.value?.cascade?.owed && same(owedOf(strikeId), { kind: 'property', options: { [x]: { strip: ['x'] } } }) && !keysOf(strikeId).includes('x'),
    show([removedOption, owedOf(strikeId)]))
  if (removedOption.value?.cascade?.owed) await must('Try Again', ask(cdp, 'mutate', FINISH))
  pin(G, 'F-1', "the option delete's Try Again strips the skipped file",
    (await wrote(strike[0], 'M6 Strike: [y]')) && (await wrote(strike[1], 'M6 Strike: [y]')) && owedOf(strikeId) === null, show(strike.map(blockOf)))
}

// ── Group 7 — The formats, adoption, and the rows' channels (Phases 7A and 7B) ──

const SLUG_KEYS = {
  'Match Title': 'URL Slug', lowercase: 'url slug', UPPERCASE: 'URL SLUG', 'kebab-case': 'url-slug', PascalCase: 'UrlSlug',
  camelCase: 'urlSlug', snake_case: 'url_slug', 'Train-Case': 'Url-Slug', UPPER_SNAKE_CASE: 'URL_SLUG', 'UPPER-KEBAB-CASE': 'URL-SLUG',
}
const CREATES = [
  ['v5.0', 'kebab-case', 'v5.0'], ['J. Crew', 'kebab-case', 'j.-crew'], ['New Property', 'lowercase', 'new property'],
  ['Due-Date', 'lowercase', 'due-date'], ['IPhone', 'kebab-case', 'i-phone'], ['XMLHttp', 'kebab-case', 'xml-http'],
  ['iPhone 17', 'PascalCase', 'IPhone17'], ['A B Test', 'camelCase', 'aBTest'], ['Due Date', 'snake_case', 'due_date'],
  ['Straße', 'UPPERCASE', 'STRASSE'],
]
const ADOPTS = {
  'Match Title': ['BLUE', 'Red', 'green'], lowercase: ['green'], UPPERCASE: ['BLUE'], 'kebab-case': ['green', 'in-progress'],
  PascalCase: ['Red'], camelCase: ['green'], snake_case: ['green'], 'Train-Case': ['Red'], UPPER_SNAKE_CASE: ['BLUE'],
  'UPPER-KEBAB-CASE': ['BLUE'],
}
const SWATCH_WORDS = { PascalCase: ', AB, J.Crew', 'kebab-case': ', due_date, in-progress' }

async function group7(cdp) {
  const G = 7
  const slug = [pageAt('M7 Slug 1'), pageAt('M7 Slug 2')]
  const kinds = pageAt('M7 Kinds 1')
  const sorts = pageAt('M7 Sorts 1')
  const dueSoon = pageAt('M7 Due Soon')
  const palette = pageAt('M7 Palette')
  const progress = pageAt('M7 Progress')
  const tone = pageAt('M7 Tone')
  const stashedPage = pageAt('M7 Stashed', STASH_SET)
  const wifi = pageAt('M7 Wifi')
  const hues = pageAt('M7 Hues')
  const { cases: shades, add: row } = caseTable('M7')
  row('Shades', 'E-1 E-3', 'Shades', 'Shades: [red, green, PURPLE, Red]', 'red|green', [set('multiSelect', ['red']), 'Shades: [red, PURPLE, Red]'])
  row('Shades', 'E-1 E-3', 'Shades', 'Shades: [Red]', '', [set('multiSelect', ['blue']), 'Shades: [blue, Red]'])
  const owedPage = [pageAt('M7 Owed 1'), pageAt('M7 Owed 2')]
  const skipKey = [pageAt('M7 Skip Key 1'), pageAt('M7 Skip Key 2')]
  const skipValue = [pageAt('M7 Skip Value 1'), pageAt('M7 Skip Value 2')]
  const swatch = FORMATS.map((_, i) => pageAt(`M7 Swatch ${i + 1}`))
  const seeds = [
    [slug[0], 'URL Slug: one'], [slug[1], 'url slug: two'], [kinds, 'x: 1\nKinds: [a]\ny: 2'], [sorts, 'Sorts: a\nsorts: b'],
    [dueSoon, 'Due Soon: x'], [palette, 'Palette: [dark-blue]'], [progress, 'Progress: [in-progress, due_date]'],
    [tone, 'Tones: [Light Blue, "Dark Red"]'], [wifi, 'Wifi: [Wifi Pro]'], [hues, 'Hues: [alpha, green]'],
    ...shades.map((c) => [c.rel, c.held]),
    ...owedPage.map((rel) => [rel, 'Owed Colors: [Red]']),
    ...skipKey.map((rel, i) => [rel, `Skip Key: ${'ab'[i]}`]),
    ...skipValue.map((rel) => [rel, 'Skip Value: [Pale Red]']),
    ...FORMATS.map((f, i) => [swatch[i], `Swatch ${i + 1}: [Red, BLUE, green${SWATCH_WORDS[f] ?? ''}]`]),
  ]
  seedAll(seeds)
  seedPage(stashedPage, 'Tones: [Light Blue]')
  editSidecar('Areas', 'Area One', { 'URL Slug': 'one', Tones: ['Light Blue'] })
  editSidecar('Areas', 'Area Two', { Kinds: ['b'] })
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  const slugId = await define(cdp, { label: 'URL Slug', type: 'text' })
  const kindsId = await define(cdp, { label: 'Kinds', type: 'multiSelect', select_options: ['a', 'b'].map(word) })
  const sortsId = await define(cdp, { label: 'Sorts', type: 'text' })
  const paletteId = await define(cdp, { label: 'Palette', type: 'select', value_format: 'kebab-case', select_options: [{ key: 'x', label: 'Light Blue' }] })
  const progressId = await define(cdp, { label: 'Progress', type: 'multiSelect', value_format: 'kebab-case', select_options: [] })
  const tones = await define(cdp, { label: 'Tones', type: 'multiSelect', select_options: ['Light Blue', 'Dark Red'].map(word) })
  const wifiId = await define(cdp, { label: 'Wifi', type: 'multiSelect', select_options: ['Wifi Pro', 'Wifi-Pro'].map(word) })
  const router = await define(cdp, { label: 'Router', type: 'multiSelect', value_format: 'lowercase', select_options: [{ key: 'wifipro', label: 'WifiPro' }, { key: 'wifi-pro', label: 'WiFi-Pro' }] })
  const huesId = await define(cdp, { label: 'Hues', type: 'multiSelect', value_format: 'UPPERCASE', select_options: [word('alpha')] })
  const shadesId = await define(cdp, { label: 'Shades', type: 'multiSelect', value_format: 'lowercase', select_options: ['red', 'blue'].map(word) })
  const owedColors = await define(cdp, { label: 'Owed Colors', type: 'multiSelect', select_options: [word('Red')] })
  const skipKeyId = await define(cdp, { label: 'Skip Key', type: 'text' })
  const skipValueId = await define(cdp, { label: 'Skip Value', type: 'multiSelect', select_options: [word('Pale Red')] })
  const swatchIds = []
  for (const [i, f] of FORMATS.entries()) swatchIds.push(await define(cdp, { label: `Swatch ${i + 1}`, type: 'multiSelect', value_format: f, select_options: [] }))
  const dueSoonId = await handWritten(cdp, { id: mintPropertyId(), label: 'Due Soon', key: 'Due Soon', key_format: 'snake_case', type: 'text' })
  const kindOf = await handWritten(cdp, { id: mintPropertyId(), label: 'Kind Of', key: 'Kind Of', type: 'select', value_format: 'lowercase' })
  await stashed(cdp, tones, stashedPage)
  const slugView = mintViewId()
  const toneView = mintViewId()
  const progressView = mintViewId()
  await saveView(cdp, slugView, 'Metadata Drive Formats', [slugId, tones, shadesId, dueSoonId])
  const lightBlue = optionId(defOf(tones), 'Light Blue')
  await saveView(cdp, toneView, 'Metadata Drive Tones Filter', [tones], { filter: filterOf(rule(tones, 'contains_any', [lightBlue])) })
  const tiles = await viewTile(cdp, 'Areas', 'Area Two', toneView)
  await matrixFilter(cdp, rule(tones, 'contains_any', [lightBlue]))
  await sleep(2500)
  seededAsWritten(G, seeds)

  // The Key Format: every convention writes the key from the label (B-2, B-5, B-6), counted first and moved on every holder.
  const AREA_ONE = sidecarAt('Areas', 'Area One')
  let prior = 'URL Slug'
  for (const f of [...FORMATS.slice(1), 'Match Title']) {
    const holders = prior === 'URL Slug' ? 2 : 3
    const untouched = snapshot([...slug, AREA_ONE])
    const count = await ask(cdp, 'property:holders', slugId, { of: 'format', change: { key_format: f } })
    pin(G, 'F-4', `Key Format ${f}: the count is ${itemCount(holders)} and writes nothing`, count.ok && count.value === holders && (await untouched.holds(800)), show(count))
    const r = await ask(cdp, 'mutate', { op: 'setFormat', propertyId: slugId, change: { key_format: f } })
    const want = SLUG_KEYS[f]
    const d = defOf(slugId)
    pin(G, 'B-2 B-5 B-6 F-1', `Key Format ${f} writes "${want}" and moves it on every holder`,
      r.ok && d.key === want && d.key_format === f && d.label === 'URL Slug' && (await wrote(slug[0], `${want}: one`))
        && (prior === 'URL Slug' ? blockOf(slug[1]) === 'url slug: two' : await wrote(slug[1], `${want}: two`))
        && (await settles(async () => sidecar('Areas', 'Area One')[want] === 'one' && !(prior in sidecar('Areas', 'Area One')))),
      show([r, d, blockOf(slug[0]), blockOf(slug[1]), sidecar('Areas', 'Area One')]))
    if (f === 'lowercase') {
      const rows = await readTable(cdp, slugView)
      pin(G, 'B-1', 'Key Format lowercase: the page it moved and the page already holding the key both read',
        rows[pageIds[slug[0]]]?.[0] === 'one' && rows[pageIds[slug[1]]]?.[0] === 'two', show([rows[pageIds[slug[0]]], rows[pageIds[slug[1]]]]))
      pin(G, 'C-2', 'a stored key apart from what its format writes is the key reads trust', rows[pageIds[dueSoon]]?.[3] === 'x', show(rows[pageIds[dueSoon]]))
    }
    prior = want
  }
  const registryKept = snapshot([REGISTRY, ...slug])
  const unchanged = await ask(cdp, 'mutate', { op: 'setFormat', propertyId: slugId, change: { key_format: 'Match Title' } })
  pin(G, 'F-1', 'a Key Format change to the format it holds writes nothing', unchanged.ok && same(unchanged.value, {}) && (await registryKept.holds()), show(unchanged))

  const listed = await ask(cdp, 'mutate', { op: 'setFormat', propertyId: kindsId, change: { key_format: 'lowercase' } })
  pin(G, 'B-4 F-1', 'a Key Format change moves a list key on its line on the page and on the Space',
    listed.ok && !!listed.value.cascade && defOf(kindsId).key === 'kinds' && (await wrote(kinds, 'x: 1\nkinds: [a]\ny: 2'))
      && (await settles(async () => same(sidecar('Areas', 'Area Two').kinds, ['b']))) && owedOf(kindsId) === null,
    show([listed, blockOf(kinds), sidecar('Areas', 'Area Two')]))
  const relabel = await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: kindsId, label: 'Labels' })
  pin(G, 'C-2', 'a label rename writes the key through the Key Format', relabel.ok && defOf(kindsId).key === 'labels' && (await wrote(kinds, 'x: 1\nlabels: [a]\ny: 2')), show([relabel, defOf(kindsId)]))
  const kindsKept = snapshot([kinds])
  const recased = await ask(cdp, 'mutate', { op: 'renameProperty', propertyId: kindsId, label: 'LABELS' })
  pin(G, 'C-2', 'a label rename the format writes as the same key moves nothing',
    recased.ok && !recased.value.cascade && defOf(kindsId).label === 'LABELS' && (await kindsKept.holds()), show(recased))

  const sortsKept = snapshot([sorts, NOTES])
  pin(G, 'D-1 J-1', 'a Key Format change onto a key a page holds beside it is refused, and nothing moves',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: sortsId, change: { key_format: 'lowercase' } }), COPY.itemsHoldingBothKeys, 1, 'Sorts', 'sorts') && (await sortsKept.holds()) && defOf(sortsId).key === 'Sorts')

  for (const [label, format, want] of CREATES) {
    const r = await add(cdp, { label, type: 'text', key_format: format })
    pin(G, 'B-5', `a create of "${label}" under ${format} writes "${want}"`, r.ok && defOf(r.value.created.propertyId)?.key === want && defOf(r.value.created.propertyId)?.label === label, show([r, r.ok && defOf(r.value.created.propertyId)]))
  }
  const given = await must('create Given Key', add(cdp, { label: 'Given Key', key: 'whatever', type: 'text' }))
  pin(G, 'C-2', 'a create writes its key from its label, whatever key it is handed', defOf(given.created.propertyId)?.key === 'Given Key', show(defOf(given.created.propertyId)))
  await define(cdp, { label: 'Ship_Date', type: 'text' })
  const stepped = await must('create Ship Date under snake_case', add(cdp, { label: 'Ship Date', type: 'text', key_format: 'snake_case' }))
  pin(G, 'D-1', 'a create whose key alone another property holds steps aside on both words',
    defOf(stepped.created.propertyId)?.label === 'Ship Date (2)' && defOf(stepped.created.propertyId)?.key === 'ship_date_(2)', show(defOf(stepped.created.propertyId)))
  const shipDate = await define(cdp, { label: 'Ship Date', type: 'text' })
  pin(G, 'D-1', 'a create neither of whose words is held lands as written', defOf(shipDate)?.label === 'Ship Date' && defOf(shipDate)?.key === 'Ship Date', show(defOf(shipDate)))
  pin(G, 'D-1', 'a Key Format change onto a key another property writes is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: shipDate, change: { key_format: 'snake_case' } }), COPY.aKeyAnotherPropertyWrites, 'ship_date') && defOf(shipDate).key === 'Ship Date')
  pin(G, 'B-5', 'a create whose format writes no key is refused', refusedAs(await add(cdp, { label: '---', type: 'text', key_format: 'kebab-case' }), COPY.anEmptyKey, 'Properties'))
  const dashes = await define(cdp, { label: '---', type: 'text' })
  pin(G, 'B-5', 'a Key Format change that writes no key is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: dashes, change: { key_format: 'kebab-case' } }), COPY.anEmptyKey, 'Properties') && defOf(dashes).key === '---')
  const hidden = ids['Heading Icon Hidden'] ?? (await define(cdp, { label: 'Heading Icon Hidden', type: 'text' }))
  pin(G, 'D-1', 'a Key Format change onto a key Pommora manages is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: hidden, change: { key_format: 'snake_case' } }), COPY.aKeyPommoraManages) && defOf(hidden).key === 'Heading Icon Hidden')
  pin(G, 'D-1', 'a create whose format writes a key Pommora manages is refused',
    refusedAs(await add(cdp, { label: 'I D', type: 'text', key_format: 'PascalCase' }), COPY.aKeyPommoraManages))

  await must('rename Due Soon', ask(cdp, 'mutate', { op: 'renameProperty', propertyId: dueSoonId, label: 'Due Later' }))
  pin(G, 'C-2', 'the next label change writes that key through the format', defOf(dueSoonId).key === 'due_later' && (await wrote(dueSoon, 'due_later: x')), show([defOf(dueSoonId), blockOf(dueSoon)]))
  await must('an icon on Kind Of', ask(cdp, 'mutate', { op: 'configureProperty', propertyId: kindOf, patch: { icon: 'tag' } }))
  pin(G, 'C-2', 'a type changed outside the app seeds its options through the Value Format',
    await settles(async () => same(wordsOf(kindOf), [['option 1', 'Option 1']])), show(defOf(kindOf)))

  // The Value Format: seeds, adds, and renames key through it, and a create keeps the keys it's handed.
  const seededStatus = await must('a Status under kebab-case', add(cdp, { label: 'Stage Seed', type: 'status', value_format: 'kebab-case' }))
  pin(G, 'C-2', "a Status seed's keys are written through the Value Format",
    same(wordsOf(seededStatus.created.propertyId), [['open', 'Open'], ['active', 'Active'], ['done', 'Done']]), show(defOf(seededStatus.created.propertyId)))
  const seededSelect = await must('a Select under UPPERCASE', add(cdp, { label: 'Option Seed', type: 'select', value_format: 'UPPERCASE' }))
  pin(G, 'C-2', "a Select seed's key is written through the Value Format", same(wordsOf(seededSelect.created.propertyId), [['OPTION 1', 'Option 1']]), show(defOf(seededSelect.created.propertyId)))
  pin(G, 'C-2', 'a create keeps the option keys it is handed', same(wordsOf(paletteId), [['x', 'Light Blue']]), show(defOf(paletteId)))
  await must('add Dark Blue', ask(cdp, 'mutate', { op: 'editOption', propertyId: paletteId, edit: { op: 'add', groupId: 'select', id: mintOptionId(), label: 'Dark Blue' } }))
  pin(G, 'C-2', "an added option's key is written through the Value Format", same(wordsOf(paletteId), [['x', 'Light Blue'], ['dark-blue', 'Dark Blue']]), show(defOf(paletteId)))
  await must('rename Dark Blue', ask(cdp, 'mutate', { op: 'renameOption', propertyId: paletteId, optionId: optionId(defOf(paletteId), 'Dark Blue'), label: 'Navy Blue' }))
  pin(G, 'C-2', "an option label rename writes its key through the Value Format and moves it on the page",
    keysOf(paletteId).includes('navy-blue') && (await wrote(palette, 'Palette: [navy-blue]')), show([defOf(paletteId), blockOf(palette)]))

  pin(G, 'E-1', 'under kebab-case adoption takes in-progress and leaves due_date',
    await settles(async () => same(wordsOf(progressId), [['in-progress', 'in-progress']]), 8000), show(defOf(progressId)))
  const inProgress = optionId(defOf(progressId), 'in-progress')
  await saveView(cdp, progressView, 'Metadata Drive Progress', [progressId], { filter: filterOf(rule(progressId, 'contains_any', [inProgress])) })
  const progressKept = snapshot([progress])
  await must('rename in-progress', ask(cdp, 'mutate', { op: 'renameOption', propertyId: progressId, optionId: inProgress, label: 'In Progress' }))
  pin(G, 'E-1 F-2', "an adopted option renamed to a label its format writes as the same key rewrites no page, and the view keeps naming the option's id",
    same(wordsOf(progressId), [['in-progress', 'In Progress']]) && (await progressKept.holds()) && same(operandsFor(viewOf(progressView), progressId), [inProgress]),
    show([defOf(progressId), operandsFor(viewOf(progressView), progressId)]))

  // A Value Format change re-keys every option on every holder by key, and touches no configuration.
  const config = snapshot([`${COLLECTION}/_pagecollection.json`, tiles, MATRIX])
  const toneKept = snapshot([tone, AREA_ONE])
  const toneCount = await ask(cdp, 'property:holders', tones, { of: 'format', change: { value_format: 'kebab-case' } })
  pin(G, 'F-4', 'a Value Format count covers the page and the Space and leaves out the Collection stash, writing nothing',
    toneCount.ok && toneCount.value === 2 && (await toneKept.holds(800)), show(toneCount))
  const changed = await ask(cdp, 'mutate', { op: 'setFormat', propertyId: tones, change: { value_format: 'kebab-case' } })
  pin(G, 'F-1 C-2', 'a Value Format change re-keys every option and keeps every label',
    changed.ok && !changed.value?.cascade?.owed && defOf(tones).value_format === 'kebab-case' && same(wordsOf(tones), [['light-blue', 'Light Blue'], ['dark-red', 'Dark Red']]) && owedOf(tones) === null,
    show([changed, defOf(tones)]))
  pin(G, 'F-1 F-2', 'a Value Format change rewrites the page, the Space, and the Collection stash by key',
    (await wrote(tone, 'Tones: ["light-blue", "dark-red"]')) && same(sidecar('Areas', 'Area One').Tones, ['light-blue'])
      && same(stashOf(tones)[pageIds[stashedPage]], ['light-blue']),
    show([blockOf(tone), sidecar('Areas', 'Area One').Tones, stashOf(tones)]))
  pin(G, 'F-2', 'a Value Format change leaves the saved view, the View Tile, and the Matrix filter byte-identical', await config.holds(), show(config.changed()))
  const formatted = await readTable(cdp, slugView)
  pin(G, 'F-2', 'after a Value Format change the page still reads its labels', formatted[pageIds[tone]]?.[1] === 'Light Blue|Dark Red', show(formatted[pageIds[tone]]))
  pin(G, 'F-2', 'after a Value Format change the view naming Light Blue still shows the page', shownRels(await readTable(cdp, toneView)).includes(tone))
  await sidebarTo(cdp, 'Contexts', 'Area Two')
  pin(G, 'F-2', 'after a Value Format change the View Tile naming Light Blue still shows the page',
    await settles(() => cdp.evaluate(`!!document.querySelector('.data-row[data-rid="${pageIds[tone]}"]')`), 6000))
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await must('assign Tones to Collection B again', ask(cdp, 'mutate', { op: 'assignProperty', containerPath: STASH_COLLECTION, propertyId: tones }))
  pin(G, 'F-2', 'a reassign after a Value Format change refills the current key', await settles(async () => same(listOf(fmOf(stashedPage).Tones), ['light-blue'])), show(blockOf(stashedPage)))

  // A format change over an unreadable file owes it in its own entry of stored keys alone, and Try Again brings it current.
  const keySkip = await unreadable(skipKey[0], () => ask(cdp, 'mutate', { op: 'setFormat', propertyId: skipKeyId, change: { key_format: 'lowercase' } }))
  pin(G, 'F-1', 'a Key Format change that skips a file owes its stored key and sweeps the rest',
    !!keySkip.value?.cascade?.owed && same(owedOf(skipKeyId), { kind: 'property', rename: ['Skip Key'] }) && (await wrote(skipKey[1], 'skip key: b')), show([keySkip, owedOf(skipKeyId)]))
  const keyReplay = await ask(cdp, 'mutate', FINISH)
  pin(G, 'F-1', "the Key Format change's Try Again moves the skipped file's key and clears the entry",
    keyReplay.ok && (await wrote(skipKey[0], 'skip key: a')) && owedOf(skipKeyId) === null, show([keyReplay, blockOf(skipKey[0])]))
  const paleRed = optionId(defOf(skipValueId), 'Pale Red')
  const valueSkip = await unreadable(skipValue[0], () => ask(cdp, 'mutate', { op: 'setFormat', propertyId: skipValueId, change: { value_format: 'kebab-case' } }))
  pin(G, 'F-1', "a Value Format change that skips a file owes each moved option's old key alone and sweeps the rest",
    !!valueSkip.value?.cascade?.owed && same(owedOf(skipValueId), { kind: 'property', options: { [paleRed]: { rename: ['Pale Red'] } } }) && (await wrote(skipValue[1], 'Skip Value: [pale-red]')),
    show([valueSkip, owedOf(skipValueId)]))
  const valueReplay = await ask(cdp, 'mutate', FINISH)
  pin(G, 'F-1', "the Value Format change's Try Again re-keys the skipped file and clears the entry",
    valueReplay.ok && (await wrote(skipValue[0], 'Skip Value: [pale-red]')) && owedOf(skipValueId) === null, show([valueReplay, blockOf(skipValue[0])]))

  const collision = snapshot([wifi, REGISTRY, NOTES])
  pin(G, 'D-2 F-1', 'a Value Format change giving two options one key is refused, and nothing changes',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: wifiId, change: { value_format: 'kebab-case' } }), COPY.aFormatGivingTwoOptionsOneKey) && (await collision.holds()))
  const crossing = snapshot([REGISTRY, NOTES])
  pin(G, 'F-1', "a Value Format change crossing two options' keys is refused, and nothing changes",
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: router, change: { value_format: 'kebab-case' } }), COPY.aValueFormatChangeCrossingTwoOptionsKeys) && (await crossing.holds()))
  pin(G, 'B-3', 'a Value Format change on a property without options is refused',
    refusedAs(await ask(cdp, 'mutate', { op: 'setFormat', propertyId: slugId, change: { value_format: 'kebab-case' } }), COPY.anOptionEditWithoutOptions))
  pin(G, 'B-3', 'a Value Format count on a property without options is refused',
    refusedAs(await ask(cdp, 'property:holders', slugId, { of: 'format', change: { value_format: 'kebab-case' } }), COPY.anOptionEditWithoutOptions))
  const matchTitle = await ask(cdp, 'property:holders', wifiId, { of: 'format', change: { value_format: 'Match Title' } })
  pin(G, 'F-4', 'a Value Format count that moves no key is zero', matchTitle.ok && matchTitle.value === 0, show(matchTitle))

  const owing = await unreadable(owedPage[0], () => ask(cdp, 'mutate', { op: 'renameOption', propertyId: owedColors, optionId: optionId(defOf(owedColors), 'Red'), label: 'Crimson' }))
  await must('add red', ask(cdp, 'mutate', { op: 'editOption', propertyId: owedColors, edit: { op: 'add', groupId: 'select', id: mintOptionId(), label: 'red' } }))
  const owedKept = snapshot([REGISTRY, NOTES, ...owedPage])
  const onOwed = await ask(cdp, 'mutate', { op: 'setFormat', propertyId: owedColors, change: { value_format: 'Train-Case' } })
  pin(G, 'F-1', 'a Value Format change writing a key another option still owes is refused, and nothing changes',
    !!owing.value?.cascade?.owed && refusedAs(onOwed, COPY.aNameStillOwed) && (await owedKept.holds()) && defOf(owedColors).value_format !== 'Train-Case', show(onOwed))
  if (owing.value?.cascade?.owed) await must('Try Again', ask(cdp, 'mutate', FINISH))

  // Adoption follows the Value Format: a foreign Multi-Select word becomes an option only when the format could have
  // written it, and a Value Format change owes adoption.
  for (const [i, f] of FORMATS.entries())
    pin(G, 'E-1 B-6', `under ${f} adoption takes ${ADOPTS[f].join(', ')}`,
      await settles(async () => same([...keysOf(swatchIds[i])].sort(), [...ADOPTS[f]].sort()), 8000), show(wordsOf(swatchIds[i])))
  pin(G, 'E-1', 'adoption under lowercase takes green and leaves PURPLE and Red foreign',
    await settles(async () => same(wordsOf(shadesId), [['red', 'red'], ['blue', 'blue'], ['green', 'green']]), 8000), show(wordsOf(shadesId)))
  pin(G, 'E-1', 'under UPPERCASE a lowercase word is not adopted', await holds(async () => same(keysOf(huesId), ['alpha']), 2000), show(wordsOf(huesId)))
  await must('Value Format lowercase on Hues', ask(cdp, 'mutate', { op: 'setFormat', propertyId: huesId, change: { value_format: 'lowercase' } }))
  pin(G, 'E-1', 'a Value Format change owes adoption, and the word the new format writes becomes an option',
    await settles(async () => keysOf(huesId).includes('green'), 8000), show(wordsOf(huesId)))

  checkReads(G, shades, await readTable(cdp, slugView), ['URL Slug', 'Tones', 'Shades'])
  await checkWrites(G, cdp, shades)
}

// ── Group 8 — The restore re-spell (Phase 8) ───────────────────────────────

async function group8(cdp) {
  const G = 8
  const SPELLINGS = ['VALUE ONE', 'value one', 'Value One', 'value-one', 'valueOne', 'VALUE-ONE', 'VALUE_ONE', 'value_one']
  const spelled = SPELLINGS.map((_, i) => pageAt(`M8 Spelling ${i + 1}`))
  const P = Object.fromEntries(['Key Format', 'Value Format', 'Both', 'Shared', 'Renamed', 'Grade', 'Marks', 'Areas 1', 'Areas 2', 'ID', 'Link', 'Deadline', 'Deadline Unread', 'Dropped', 'Retitled']
    .map((t) => [t, pageAt(`M8 ${t}`)]))
  const seeds = [
    ...SPELLINGS.map((s, i) => [spelled[i], `${s}: s${i + 1}`]),
    [P['Key Format'], 'Priority: hi'], [P['Value Format'], 'Severity: hi'], [P.Both, 'Urgency: hi\nurgency: lo'],
    [P.Shared, 'arrive-date: x'], [P.Renamed, 'Rank: first'], [P.Grade, 'Grade: top-tier'], [P.Marks, 'Marks: [TOP TIER, low_tier]'],
    [P['Areas 1'], '<Areas>: [area one]'], [P['Areas 2'], '<areas>: [Area One]'], [P.ID, ''], [P.Link, 'source link: "[[Page A]]"'],
    [P.Deadline, 'deadline_date: 2026-01-05'], [P['Deadline Unread'], 'deadline_date: soon'],
    [P.Dropped, 'Marks: [Top Tier, zzz]'], [P.Retitled, '<M8-Kind>: [m8-spot]'],
  ]
  const kindContext = await makeContext(cdp, 'M8-Kind', ['m8-spot'])
  const kindSpace = spaceIdOf('M8-Kind', 'm8-spot')
  seedAll(seeds)
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  const hiLo = ['hi', 'lo'].map(word)
  const tiers = ['Top Tier', 'Low Tier'].map(word)
  await defineAll(cdp, [
    { label: 'Value One', type: 'text' }, { label: 'Priority', type: 'select', select_options: hiLo },
    { label: 'Severity', type: 'select', select_options: hiLo }, { label: 'Urgency', type: 'select', select_options: hiLo },
    { label: 'Arrive Date', type: 'text' }, { label: 'Arrive-Date', type: 'text' }, { label: 'Rank', type: 'text' },
    { label: 'Grade', type: 'select', select_options: tiers }, { label: 'Marks', type: 'multiSelect', value_format: 'Train-Case', select_options: tiers },
    { label: 'I-D', type: 'text' }, { label: 'Source Link', type: 'link' }, { label: 'Deadline Date', type: 'dateTime' },
  ])
  ids['Heading Icon Hidden'] ??= await define(cdp, { label: 'Heading Icon Hidden', type: 'text' })
  await makeSpace(cdp, 'Topics', 'M8 Returning')
  await makeSpace(cdp, 'Topics', 'M8 Hidden')
  editSidecar('Topics', 'M8 Returning', { '<projects>': ['project one'], grade: ['top-tier'] })
  await must('hide the heading icon', ask(cdp, 'mutate', { op: 'setHeadingIconHidden', path: spacePath('Topics', 'M8 Hidden'), kind: 'space', hidden: true }))
  await until("M8 Hidden's heading_icon_hidden", async () => sidecar('Topics', 'M8 Hidden').heading_icon_hidden === true)
  await sleep(1500)
  seededAsWritten(G, seeds)

  const originalId = pageIds[P.ID]
  const bundles = {}
  for (const [rel] of seeds) bundles[rel] = (await must(`trash ${rel}`, ask(cdp, 'mutate', { op: 'delete', path: rel, kind: 'page' }))).bundled.bundlePath
  const hiddenBefore = read(sidecarAt('Topics', 'M8 Hidden'))
  const spaceBundles = {}
  for (const title of ['M8 Returning', 'M8 Hidden'])
    spaceBundles[title] = (await must(`trash ${title}`, ask(cdp, 'mutate', { op: 'delete', path: spacePath('Topics', title), kind: 'space' }))).bundled.bundlePath
  await must('Key Format lowercase on Priority', ask(cdp, 'mutate', { op: 'setFormat', propertyId: ids.Priority, change: { key_format: 'lowercase' } }))
  await must('Value Format UPPERCASE on Severity', ask(cdp, 'mutate', { op: 'setFormat', propertyId: ids.Severity, change: { value_format: 'UPPERCASE' } }))
  await must('rename Rank', ask(cdp, 'mutate', { op: 'renameProperty', propertyId: ids.Rank, label: 'Standing' }))
  await must('retitle M8-Kind', ask(cdp, 'mutate', { op: 'renameContext', contextId: kindContext, newName: 'M8 Kind' }))
  await must('retitle m8-spot', ask(cdp, 'mutate', { op: 'renameSpace', spaceId: kindSpace, newName: 'M8 Spot' }))
  for (const [rel] of seeds) await must(`restore ${rel}`, ask(cdp, 'mutate', { op: 'restore', bundlePath: bundles[rel] }))
  for (const title of ['M8 Returning', 'M8 Hidden']) await must(`restore ${title}`, ask(cdp, 'mutate', { op: 'restore', bundlePath: spaceBundles[title] }))
  await sleep(1500)

  const wrong = []
  for (const [i, rel] of spelled.entries()) if (!(await wrote(rel, `Value One: s${i + 1}`, 3000))) wrong.push(`${SPELLINGS[i]} → ${show(blockOf(rel))}`)
  pin(G, 'G-1', 'a restored page takes back each of the eight spellings G-1 names under the current key', wrong.length === 0, wrong.join('\n      '))
  const fm = (t) => fmOf(P[t])
  pin(G, 'G-1', 'a Key Format change made while the page sat in the Trash reaches it at restore',
    await settles(async () => fm('Key Format').priority === 'hi' && !('Priority' in fm('Key Format'))), show(fm('Key Format')))
  pin(G, 'G-1', 'a Value Format change made while the page sat in the Trash reaches it at restore',
    await settles(async () => same(fm('Value Format').Severity, ['HI'])), show(fm('Value Format')))
  pin(G, 'G-1', 'a held exact key keeps its value, and a variant beside it stays foreign',
    await settles(async () => fm('Both').Urgency === 'hi' && fm('Both').urgency === 'lo'), show(fm('Both')))
  pin(G, 'G-1 G-2', 'a spelling two current keys share returns as foreign data', blockOf(P.Shared) === 'arrive-date: x', show(blockOf(P.Shared)))
  pin(G, 'G-1 G-2', 'a key left from before a label rename made in the Trash returns as foreign data', blockOf(P.Renamed) === 'Rank: first', show(blockOf(P.Renamed)))
  pin(G, 'G-1', 'a Select word in another format takes back its option', await settles(async () => same(fm('Grade').Grade, ['Top Tier'])), show(fm('Grade')))
  pin(G, 'G-1', 'Multi-Select words in other casings and formats take back their options',
    await settles(async () => same(fm('Marks').Marks, ['Top Tier', 'Low Tier'])), show(fm('Marks')))
  pin(G, 'G-1', 'a Space title in another casing takes back the current title', await settles(async () => same(fm('Areas 1')['<Areas>'], ['Area One'])), show(fm('Areas 1')))
  pin(G, 'G-1', 'a Context key in another casing takes back the current key',
    await settles(async () => same(fm('Areas 2')['<Areas>'], ['Area One']) && !('<areas>' in fm('Areas 2'))), show(fm('Areas 2')))
  pin(G, 'G-1 D-1', "a restored page keeps its ID beside a property whose format would write it",
    parse(frontOf(P.ID)).ID === originalId && !('I-D' in fm('ID')), show(frontOf(P.ID)))
  pin(G, 'G-1 A-3', 'a Link key in another casing takes back the current key with its connection as written',
    fm('Link')['Source Link'] === '[[Page A]]' && !('source link' in fm('Link')), show(blockOf(P.Link)))
  pin(G, 'G-1', 'a foreign key a format could have written takes back its Date property',
    String(fm('Deadline')['Deadline Date'] ?? '').startsWith('2026-01-05') && !('deadline_date' in fm('Deadline')), show(fm('Deadline')))
  pin(G, 'G-1 G-2 RULING', 'a foreign key re-spelled onto a Date keeps a value the Date reads as text',
    fm('Deadline Unread')['Deadline Date'] === 'soon' && !('deadline_date' in fm('Deadline Unread')), show(fm('Deadline Unread')))
  pin(G, 'G-2 RULING', 'a restored Multi-Select keeps a word no current option names', await settles(async () => same(fm('Dropped').Marks, ['Top Tier', 'zzz'])), show(fm('Dropped')))
  pin(G, 'G-1', 'a Context and a Space retitled while the page sat in the Trash reach it at restore',
    await settles(async () => same(fm('Retitled')['<M8 Kind>'], ['M8 Spot']) && !('<M8-Kind>' in fm('Retitled'))), show(fm('Retitled')))
  const returning = sidecar('Topics', 'M8 Returning')
  pin(G, 'G-1', "a restored Space's sidecar takes back the current keys, words, and titles",
    same(returning['<Projects>'], ['Project One']) && same(returning.Grade, ['Top Tier']) && !('<projects>' in returning) && !('grade' in returning), show(returning))
  pin(G, 'G-1 D-1', "a restored Space keeps heading_icon_hidden beside a property whose format would write it",
    read(sidecarAt('Topics', 'M8 Hidden')) === hiddenBefore, show(read(sidecarAt('Topics', 'M8 Hidden'))))
}

// ── Group 9 — The gesture pass (Phase 9) ───────────────────────────────────

const RAIL = `[...document.querySelectorAll('.settings-rail [data-reveal-host]')]`
const DIALOG = `document.querySelector('[role="alertdialog"]')`
const trigger = (label) => `document.querySelector('button[aria-label="${label}"]')`
const dialogUp = (cdp) => cdp.evaluate(`!!${DIALOG}`)
const dialogButton = (cancel) => `[...${DIALOG}.querySelectorAll('button')].find((b) => (b.textContent.trim() === 'Cancel') === ${cancel})`

async function openSettings(cdp, frame) {
  if (!(await cdp.evaluate(`!!document.querySelector('.settings-rail')`))) await mouseClick(cdp, ribbon('Settings'))
  await until('the Settings window', () => cdp.evaluate(`!!document.querySelector('.settings-rail')`))
  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === ${JSON.stringify(frame)})`)
  await sleep(800)
}
async function closeSettings(cdp) {
  if (await cdp.evaluate(`!!document.querySelector('.settings-rail')`)) await mouseClick(cdp, ribbon('Settings'))
  await sleep(600)
}
async function openEditor(cdp, label) {
  await escapeAll(cdp)
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(800)
  await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(800)
  await click(cdp, `[...document.querySelectorAll('button, [role=button]')].find((b) => b.textContent.trim() === 'Properties')`)
  await sleep(800)
  await click(cdp, `${textEl('span', label)}.closest('[role=button],button,[data-line-row]')`)
  await until(`${label}'s settings`, () => cdp.evaluate(`!!${trigger('Label Format')}`))
  await sleep(600)
}
const FORMAT_ROWS = `[...document.querySelectorAll('[data-picker-portal] [role=button]')]`
/** Opens a format row's pane, answering its rows. */
async function formatPane(cdp, row) {
  await click(cdp, trigger(row))
  await until(`the ${row} pane`, () => portalOpen(cdp))
  return cdp.evaluate(`${FORMAT_ROWS}.map((e) => e.textContent.trim())`)
}
/** A format picked from its row's pane, confirmed or cancelled when the dialog asks: whether it asked, and the message. */
async function pickFormat(cdp, row, format, { confirm = true } = {}) {
  await formatPane(cdp, row)
  await click(cdp, `${FORMAT_ROWS}.find((e) => e.textContent.trim() === ${JSON.stringify(format)})`)
  const asked = await settles(() => dialogUp(cdp), 2500)
  const message = asked ? await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`) : null
  if (asked) {
    await shot(cdp, `${row}-${format}-confirm`)
    await click(cdp, dialogButton(!confirm))
    await sleep(1200)
  }
  return { asked, message }
}
const askedFor = (asked, n) =>
  !!asked.asked && asked.message === COPY.theFormatChangesConfirmation(itemCount(n))

async function group9(cdp) {
  const G = 9
  const words = [pageAt('M9 Words 1'), pageAt('M9 Words 2')]
  const single = pageAt('M9 Single 1')
  const state = [pageAt('M9 State 1'), pageAt('M9 State 2')]
  const labels = pageAt('M9 Labels 1')
  const trashed = pageAt('M9 Trashed')
  const seeds = [
    [words[0], 'M9 Words: one'], [words[1], 'M9 Words: two'], [single, 'M9 Single: s'],
    [state[0], 'M9 State: Planned'], [state[1], 'M9 State: Shipped'], [labels, 'M9 Labels: [Work, work]'], [trashed, 'M9 Words: back'],
  ]
  seedAll(seeds)
  await indexed(cdp, COLLECTION, seeds.map(([rel]) => rel))
  await defineAll(cdp, [
    { label: 'M9 Words', type: 'text' }, { label: 'M9 Single', type: 'text' }, { label: 'M9 Count', type: 'number' },
    { label: 'M9 State', type: 'status', status_groups: statusGroups(['Planned'], ['Shipped']) },
    { label: 'M9 Labels', type: 'multiSelect', select_options: ['Work', 'Life', 'Spare'].map(word) },
    { label: 'M9 A', type: 'text' }, { label: 'M9 B', type: 'text' }, { label: 'M9 Gone', type: 'text' },
    { label: 'M9 Kind', type: 'select', select_options: ['Low', 'High'].map(word) },
  ])
  const view = mintViewId()
  await saveView(cdp, view, 'Metadata Drive Gestures', [ids['M9 Labels'], ids['M9 State'], ids['M9 Words']], { filter: filterOf(rule('_title', 'starts_with', 'M9')) })
  await sleep(1500)
  seededAsWritten(G, seeds)
  await must('trash M9 Trashed', ask(cdp, 'mutate', { op: 'delete', path: trashed, kind: 'page' }))

  // The Settings window's Metadata leaf and its Maintenance section.
  await openSettings(cdp, 'Metadata').catch(() => {})
  const rail = await cdp.evaluate(`${RAIL}.map((r) => r.textContent.trim())`).catch(() => [])
  pin(G, 'J-1', 'the Settings leaf reads Metadata, and no leaf reads Properties', rail.includes('Metadata') && !rail.includes('Properties'), show(rail))
  const leaf = await cdp.evaluate(`({ heading: document.querySelector('.settings-heading')?.textContent.trim(), sections: [...document.querySelectorAll('.settings-section')].map((s) => s.textContent.trim()) })`)
  pin(G, 'J-1', 'its one section is titled Maintenance and holds Repair Properties On Open',
    leaf.heading === 'Metadata' && leaf.sections.length === 1 && leaf.sections[0].startsWith('Maintenance') && leaf.sections[0].includes('Repair Properties On Open'), show(leaf))
  await shot(cdp, 'metadata-leaf')
  await closeSettings(cdp)

  // The value picker: a word no option claims shows nowhere, and a pick keeps it after the picked options.
  const chips = (await readTable(cdp, view))[pageIds[labels]]?.[0]
  pin(G, 'E-3', 'a word no option claims draws no chip', chips === 'Work', show(chips))
  const labelCell = cellOf(labels, 0)
  await mouseClick(cdp, labelCell)
  await until('the value picker', () => portalOpen(cdp))
  const offered = await cdp.evaluate(`[...document.querySelectorAll(${JSON.stringify(PICKER_ROWS)})].map((e) => e.textContent.trim())`)
  pin(G, 'E-3', 'the value picker offers the options alone', offered.includes('Work') && offered.includes('Life') && !offered.includes('work'), show(offered))
  await shot(cdp, 'value-picker')
  await mouseAt(cdp, await boxOf(cdp, pickerRowOf('Life')))
  pin(G, 'E-3', 'a pick in the value picker keeps the foreign word after the picked options', await wrote(labels, 'M9 Labels: [Work, Life, work]'), show(blockOf(labels)))
  await escapeAll(cdp)

  // The rows: Label Format and Value Format at the top of every property's settings, divided from the type's own.
  await openEditor(cdp, 'M9 Count')
  const count = await cdp.evaluate(`({ shown: ${trigger('Label Format')}?.textContent.trim(), value: !!${trigger('Value Format')} })`)
  pin(G, 'H-1', 'a Number reads Label Format at Match Title, and has no Value Format',
    count.shown?.includes('Match Title') && !count.value, show(count))
  await shot(cdp, 'rows-number')
  const formats = await formatPane(cdp, 'Label Format')
  pin(G, 'B-2', "the format pane lists Match Title and the nine conventions in order", same(formats, FORMATS), show(formats))
  await pressKey(cdp, 'Escape')
  const zero = await pickFormat(cdp, 'Label Format', 'UPPERCASE')
  pin(G, 'F-4', 'a Label Format change over no Items asks nothing', !zero.asked && (await settles(async () => defOf(ids['M9 Count']).key === 'M9 COUNT')), show([zero, defOf(ids['M9 Count'])]))

  await openEditor(cdp, 'M9 Kind')
  const silent = await pickFormat(cdp, 'Value Format', 'UPPERCASE')
  pin(G, 'F-4', 'a Value Format change over no Items asks nothing',
    !silent.asked && (await settles(async () => same(wordsOf(ids['M9 Kind']), [['LOW', 'Low'], ['HIGH', 'High']]))), show([silent, wordsOf(ids['M9 Kind'])]))

  await openEditor(cdp, 'M9 State')
  const status = await cdp.evaluate(`(() => {
    const k = ${trigger('Label Format')}, v = ${trigger('Value Format')}, o = document.querySelector('[aria-label="Edit Option"]')
    const after = (a, b) => !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING))
    const divided = [...document.querySelectorAll('div[aria-hidden="true"]')].some((d) => d.children.length === 1 && d.firstElementChild.tagName === 'SPAN' && !d.textContent.trim() && after(v, d) && after(d, o))
    return { order: after(k, v) && after(v, o), divided }
  })()`)
  pin(G, 'H-1', 'a Status shows Label Format then Value Format above its options, divided from them',
    status.order && status.divided, show(status))
  await shot(cdp, 'rows-status')
  const statusKept = snapshot(state)
  const valueAsk = await pickFormat(cdp, 'Value Format', 'UPPERCASE')
  pin(G, 'F-4', 'a Value Format change over two Items asks with the count', askedFor(valueAsk, 2), show(valueAsk))
  pin(G, 'F-1', 'the confirmed Value Format change re-keys the pages',
    (await settles(async () => same(listOf(fmOf(state[0])['M9 State']), ['PLANNED']) && same(listOf(fmOf(state[1])['M9 State']), ['SHIPPED'])))
      && statusKept.changed().length === 2, show(state.map(blockOf)))

  await openEditor(cdp, 'M9 Words')
  const wordsKept = snapshot([...words, REGISTRY])
  const cancelled = await pickFormat(cdp, 'Label Format', 'lowercase', { confirm: false })
  pin(G, 'F-4', 'a Label Format change over two Items asks with the count', askedFor(cancelled, 2), show(cancelled))
  pin(G, 'F-4', 'a cancelled format change writes nothing', await wordsKept.holds(), show(wordsKept.changed()))
  const confirmed = await pickFormat(cdp, 'Label Format', 'lowercase')
  pin(G, 'F-1 F-4', 'the confirmed Label Format change moves the key on both pages',
    askedFor(confirmed, 2) && (await wrote(words[0], 'm9 words: one')) && (await wrote(words[1], 'm9 words: two')) && defOf(ids['M9 Words']).key_format === 'lowercase',
    show([confirmed, ...words.map(blockOf)]))

  // A property shows its label whatever key its format writes.
  await readTable(cdp, view)
  const headers = await cdp.evaluate(`[...document.querySelectorAll('.table-head > *')].map((h) => h.textContent.trim())`)
  pin(G, 'C-1', 'after a Label Format change the column header reads the label', headers.includes('M9 Words') && !headers.includes('m9 words'), show(headers))
  await mouseClick(cdp, `document.querySelector('.data-row[data-rid="${pageIds[words[0]]}"] .cell-title-text')`)
  await sleep(1200)
  await openPanel(cdp)
  const panelLabel = await cdp.evaluate(`(() => { const v = document.querySelector('[data-property-row="${ids['M9 Words']}"]'); const row = v?.parentElement?.parentElement; return row ? [...row.querySelectorAll('*')].filter((e) => e.children.length === 0 && !v.contains(e)).map((e) => e.textContent.trim()).filter(Boolean) : null })()`)
  pin(G, 'C-1', "after a Label Format change the page's Properties panel row reads the label", !!panelLabel?.includes('M9 Words'), show(panelLabel))
  await closePanel(cdp)

  await openEditor(cdp, 'M9 Single')
  const one = await pickFormat(cdp, 'Label Format', 'kebab-case')
  pin(G, 'F-4', 'a Label Format change over one Item asks nothing', !one.asked && (await wrote(single, 'm9-single: s')), show([one, blockOf(single)]))

  await openEditor(cdp, 'M9 Labels')
  const spareRow = `[...document.querySelectorAll('[data-line-row]')].find((r) => r.textContent.trim() === 'Spare' && r.querySelector('[aria-label="Edit Option"]'))`
  const { chosen: cleared } = await chooseNative(cdp, spareRow, 'Clear')
  pin(G, 'F-4', 'Clear over no Items asks nothing', cleared === true && (await holds(async () => !(await dialogUp(cdp)), 1500)), show({ cleared }))
  await escapeAll(cdp)

  // Delete asks at any count.
  await openEditor(cdp, 'M9 Gone')
  const { chosen: deleting } = await chooseNative(cdp, trigger('Property Menu'), 'Delete', { button: 'left' })
  const deleteAsk = await settles(() => dialogUp(cdp), 2500) ? await cdp.evaluate(`({ message: ${DIALOG}.getAttribute('aria-label'), text: ${DIALOG}.textContent })`) : null
  if (deleteAsk) await click(cdp, dialogButton(true))
  await sleep(800)
  pin(G, 'F-4', 'a property Delete over no Items still asks, without a count, and a cancel keeps the property',
    deleting === true && deleteAsk?.message === 'Delete “M9 Gone” everywhere?' && deleteAsk.text.includes('It is removed from every collection; a restorable record') && !deleteAsk.text.includes('0 Items') && !!defOf(ids['M9 Gone']), show({ deleting, deleteAsk }))
  await escapeAll(cdp)

  // The Trash: a page restored through the Trash browser returns in the current spelling.
  await openSettings(cdp, 'Trash')
  const trashRow = `[...document.querySelectorAll('.trash-row')].find((r) => r.textContent.includes('M9 Trashed'))`
  const { rows: menu } = await chooseNative(cdp, trashRow, 'Restore')
  pin(G, 'G-1', "a page restored from the Trash browser returns under the Label Format set while it was away",
    menu.includes('Restore') && (await wrote(trashed, 'm9 words: back')), show([menu, blockOf(trashed)]))
  await closeSettings(cdp)

  // The Property Panel on a Space orders its rows by id.
  const A = ids['M9 A']
  const B = ids['M9 B']
  await spaceValue(cdp, 'Areas', 'Area Two', A, { kind: 'text', value: 'a' })
  await spaceValue(cdp, 'Areas', 'Area Two', B, { kind: 'text', value: 'b' })
  await sidebarTo(cdp, 'Contexts', 'Area Two')
  await sleep(1200)
  await openPanel(cdp)
  const panelRows = () => cdp.evaluate(`[...document.querySelectorAll('[data-property-row]')].map((e) => e.dataset.propertyRow)`)
  const mine = (list) => list.filter((id) => id === A || id === B)
  await cdp.evaluate(`${textEl('[data-line-row] *', 'M9 B')}.scrollIntoView({ block: 'nearest' })`)
  await sleep(600)
  await drag(cdp, textEl('[data-line-row] *', 'M9 B'), textEl('[data-line-row] *', 'M9 A'))
  const known = new Set([...Object.keys(registry().defs), ...JSON.parse(read(`${CONTEXTS}/contexts.json`)).contexts.map((c) => c.id)])
  const order = () => sidecar('Areas', 'Area Two').$order ?? []
  pin(G, 'F-5', 'a drag on a Space writes its rows to $order by id',
    await settles(async () => same(mine(order()), [B, A]) && order().every((id) => known.has(id))), show(order()))
  pin(G, 'F-5', 'the panel draws the dragged order', same(mine(await panelRows()), [B, A]), show(await panelRows()))
  const orderWas = order()
  await must('rename M9 A', ask(cdp, 'mutate', { op: 'renameProperty', propertyId: A, label: 'M9 Alpha' }))
  pin(G, 'F-5', 'a property rename leaves the order and the panel as they were',
    (await holds(async () => same(order(), orderWas))) && same(mine(await panelRows()), [B, A]), show([order(), await panelRows()]))
  await shot(cdp, 'space-panel')
  await sidebarTo(cdp, 'Collections', COLLECTION)
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'metadata-drive-shots')).cdp
  if (GROUPS.has(1)) await group1(cdp)
  if (GROUPS.has(2)) await group2(cdp)
  if (GROUPS.has(3)) await group3(cdp)
  if (GROUPS.has(4)) await group4(cdp)
  if (GROUPS.has(5)) await group5(cdp)
  if (GROUPS.has(6)) await group6(cdp)
  if (GROUPS.has(7)) await group7(cdp)
  if (GROUPS.has(8)) await group8(cdp)
  if (GROUPS.has(9)) await group9(cdp)
  cdp.close()
} catch (e) {
  check('the drive ran to its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  process.exitCode = failed.length ? 1 : 0
}
