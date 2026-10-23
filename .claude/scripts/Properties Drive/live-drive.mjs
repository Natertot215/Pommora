import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ask, click, escapeAll, launch, mouseClick, must, NEXUS, openCollection, portalOpen, restore, results, sel,
  SETTINGS_BUTTON, settles, shot, sleep, until,
} from '../drive-harness.mjs'

const PORT = 9403
// The drive's groups in order, each landed by the plan phase that adds it.
const LANDED = ['1']
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

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'properties-shots')).cdp
  if (GROUPS.has('1')) await group1(cdp)
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
