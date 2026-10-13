import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ask, check, click, frontRaw, launch, mintPageId, must, NEXUS, pagePath, restore, results, settles, sleep, until,
} from '../drive-harness.mjs'

const PORT = 9363
const COLLECTION = 'Collection A'
const VIEW_ID = 'view_01KZSPELLDRIVE0000000TABLE'

// ── The matrix ──────────────────────────────────────────────────────────────
// Each case is one page holding one key. `held` is the key's block as the file spells it; `read` is what the
// table shows for it; `act` is the gesture; `want` is the block the gesture leaves, every other byte unchanged.

const PROPS = {
  check: { name: 'Mx Check', type: 'checkbox' },
  amount: { name: 'Mx Amount', type: 'number' },
  choice: { name: 'Mx Choice', type: 'select', select_options: ['Done', 'Doing', '2024'].map((value) => ({ value })) },
  stage: {
    name: 'Mx Stage',
    type: 'status',
    status_groups: [
      { id: 'todo', label: 'To-do', color: 'grey', options: [{ value: 'Todo', group_id: 'todo' }] },
      { id: 'complete', label: 'Complete', color: 'green', options: [{ value: 'Done', group_id: 'complete' }] },
    ],
  },
  labels: { name: 'Mx Labels', type: 'multiSelect', select_options: ['Work', 'Life', 'Home', '2024', '2025'].map((value) => ({ value })) },
  note: { name: 'Mx Note', type: 'text' },
  ref: { name: 'Mx Ref', type: 'link' },
  files: { name: 'Mx Files', type: 'file' },
}
const AREAS = '<Areas>'
const TARGETS = ['Mx Target', 'Mx Other', '2024', '1.10']

const cases = []
const add = (group, prop, held, read, act, want) =>
  cases.push({ title: `Mx ${group} ${String(cases.filter((c) => c.group === group).length + 1).padStart(2, '0')}`, group, prop, held, read, act, want })
const set = (kind, value) => ({ set: value === null ? null : { kind, value } })
const key = (prop) => (prop === 'areas' ? AREAS : PROPS[prop].name)

// Checkbox: every word pair, in three casings and three quote styles, checked and unchecked. A tick over a checked
// word changes nothing; over an unchecked one it writes the partner in the same casing and quotes, except where yaml
// read a bare `false` as a boolean before any spelling was seen. An untick removes the key.
const PAIRS = [['true', 'false'], ['yes', 'no'], ['on', 'off'], ['y', 'n']]
const CASINGS = [(w) => w, (w) => w[0].toUpperCase() + w.slice(1), (w) => w.toUpperCase()]
const YAML_BOOLEAN = /^(true|false)$/i
for (const [on, off] of PAIRS)
  for (const cased of CASINGS)
    for (const q of ['', "'", '"'])
      for (const word of [on, off]) {
        const spelled = `${q}${cased(word)}${q}`
        const ticked = word === on ? spelled : q === '' && YAML_BOOLEAN.test(word) ? 'true' : `${q}${cased(on)}${q}`
        add('Check', 'check', `Mx Check: ${spelled}`, word === on, set('checkbox', true), `Mx Check: ${ticked}`)
      }

// Number: every grammar shape under each quote style. A changed value keeps the symbol, sign, grouping, and decimal
// places with the typed digits; an unchanged one keeps its bytes; a shape the grammar refuses reads as nothing.
for (const [held, read, next, want] of [
  ['1200', 1200, 1300, '1300'],
  ['"1200"', 1200, 1300, '"1300"'],
  ["'1200'", 1200, 1300, "'1300'"],
  ['1,200', 1200, 1300, '1,300'],
  ['"1,200"', 1200, 1300, '"1,300"'],
  ["'1,200'", 1200, 1300, "'1,300'"],
  ['$1,200.00', 1200, 1300, '$1,300.00'],
  ['"$1,200.00"', 1200, 1300, '"$1,300.00"'],
  ["'$1,200.00'", 1200, 1300, "'$1,300.00'"],
  ['$1,200', 1200, 1300.5, '$1,300.5'],
  ['30 €', 30, 31, '31 €'],
  ['€30', 30, 31, '€31'],
  ['"£30"', 30, 31, '"£31"'],
  ['¥500', 500, 600, '¥600'],
  ['A$30', 30, 31, 'A$31'],
  ["'CA$30'", 30, 31, "'CA$31'"],
  ['45%', 45, 50, '50%'],
  ["'45%'", 45, 50, "'50%'"],
  ['"45%"', 45, 50, '"50%"'],
  ['30.50%', 30.5, 45, '45.00%'],
  ['-5', -5, -6, '-6'],
  ['"-5"', -5, -6, '"-6"'],
  ["'+$5'", 5, 6, "'$6'"],
  ['1,234,567.5', 1234567.5, 1234567.25, '1,234,567.25'],
  ['3.5', 3.5, 4, '4'],
  ['1,5', null, 2, '2'],
  ['30 USD', null, 31, '31'],
]) {
  add('Amount', 'amount', `Mx Amount: ${held}`, read, set('number', next), `Mx Amount: ${want}`)
  if (read !== null) add('Amount', 'amount', `Mx Amount: ${held}`, read, set('number', read), `Mx Amount: ${held}`)
}

// Select and Status: a scalar of any quote style or casing names its option; a write lands as a one-item list in
// the file's quotes, a quote yaml needed spreading to no value it can leave bare.
for (const [held, read, want] of [
  ['Done', 'Done', '\n  - Doing'],
  ["'Done'", 'Done', "\n  - 'Doing'"],
  ['"Done"', 'Done', '\n  - "Doing"'],
  ['done', 'Done', '\n  - Doing'],
  ['[Done]', 'Done', ' [Doing]'],
  ["['Done']", 'Done', " ['Doing']"],
  ['\n  - "Done"', 'Done', '\n  - "Doing"'],
  ['2024', '2024', '\n  - Doing'],
  ["'2024'", '2024', '\n  - Doing'],
])
  add('Choice', 'choice', `Mx Choice:${held.startsWith('\n') ? '' : ' '}${held}`, read, set('select', 'Doing'), `Mx Choice:${want}`)
for (const [held, read, want] of [
  [' Todo', 'Todo', '\n  - Done'],
  [" 'Todo'", 'Todo', "\n  - 'Done'"],
  [' ["todo"]', 'Todo', ' ["Done"]'],
  ['\n  - "Todo"', 'Todo', '\n  - "Done"'],
])
  add('Stage', 'stage', `Mx Stage:${held}`, read, set('select', 'Done'), `Mx Stage:${want}`)

// Multi-Select: each member keeps its own quotes, a new member takes the quotes the file chose, and a list keeps
// its flow or block style.
for (const [held, read, next, want] of [
  [' [Work]', 'Work', ['Work', 'Life'], ' [Work, Life]'],
  [" ['Work']", 'Work', ['Work', 'Life'], " ['Work', 'Life']"],
  [' ["Work"]', 'Work', ['Work', 'Life'], ' ["Work", "Life"]'],
  ['\n  - Work', 'Work', ['Work', 'Life'], '\n  - Work\n  - Life'],
  ["\n  - 'Work'", 'Work', ['Work', 'Life'], "\n  - 'Work'\n  - 'Life'"],
  ['\n  - "Work"', 'Work', ['Work', 'Life'], '\n  - "Work"\n  - "Life"'],
  [' ["Work", Life]', 'Work|Life', ['Work', 'Life', 'Home'], ' ["Work", Life, "Home"]'],
  ['\n  - 2024', '2024', ['2024', 'Work'], '\n  - 2024\n  - Work'],
  [" ['2024']", '2024', ['2024', 'Work', '2025'], " ['2024', Work, '2025']"],
  [' Work', 'Work', ['Work', 'Life'], '\n  - Work\n  - Life'],
  [' [work, "Life"]', 'Work|Life', ['Work'], ' [work]'],
  [' ["Work", "Life"]', 'Work|Life', ['Life'], ' ["Life"]'],
])
  add('Labels', 'labels', `Mx Labels:${held}`, read, set('multiSelect', next), `Mx Labels:${want}`)

// Text: a string keeps its quotes, a value yaml must quote takes the file's style or yaml's own, and quote marks typed
// into the value are its content.
for (const [held, read, next, want] of [
  ['foo', 'foo', 'bar', 'bar'],
  ["'foo'", 'foo', 'bar', "'bar'"],
  ['"foo"', 'foo', 'bar', '"bar"'],
  ['foo', 'foo', 'foo', 'foo'],
  ["'foo'", 'foo', 'foo', "'foo'"],
  ['"foo"', 'foo', 'foo', '"foo"'],
  ['42', '42', '43', '"43"'],
  ['"42"', '42', '43', '"43"'],
  ["'it''s'", "it's", "don't", "'don''t'"],
  ["'x'", 'x', 'y: z', "'y: z'"],
  ['foo', 'foo', "'foo'", `"'foo'"`],
  [`"'foo'"`, "'foo'", "'foo'", `"'foo'"`],
  ['[a, b]', '[a, b]', '[a, b]', '[a, b]'],
])
  add('Note', 'note', `Mx Note: ${held}`, read, set('text', next), `Mx Note: ${want}`)

// Link: a connection reads quoted or bare, a whole-number title included and a decimal one not; a changed
// connection is written quoted, single quotes carried, and an address keeps its quotes.
for (const [held, read, next, want] of [
  ['"[[Mx Target]]"', 'Mx Target', '[[Mx Other]]', '"[[Mx Other]]"'],
  ["'[[Mx Target]]'", 'Mx Target', '[[Mx Other]]', "'[[Mx Other]]'"],
  ['[[Mx Target]]', 'Mx Target', '[[Mx Other]]', '"[[Mx Other]]"'],
  ['https://a.com', 'a.com', 'https://b.com', 'https://b.com'],
  ["'https://a.com'", 'a.com', 'https://b.com', "'https://b.com'"],
  ['"https://a.com"', 'a.com', 'https://b.com', '"https://b.com"'],
  ['[[2024]]', '2024', '[[2024]]', '[[2024]]'],
  ['"[[2024]]"', '2024', '[[2024]]', '"[[2024]]"'],
  ['[[1.10]]', null, null, null],
])
  add('Ref', 'ref', `Mx Ref: ${held}`, read, next === null ? null : set('link', next), want === null ? null : `Mx Ref: ${want}`)

// File: each attachment keeps its own spelling and a new one takes the quotes the file chose; a single wikilink that
// grows becomes a block list.
for (const [held, want] of [
  ['\n  - "[[a.png]]"', '\n  - "[[a.png]]"\n  - "[[b.png]]"'],
  ["\n  - '[[a.png]]'", "\n  - '[[a.png]]'\n  - '[[b.png]]'"],
  ['\n  - [[a.png]]', '\n  - [[a.png]]\n  - "[[b.png]]"'],
  [' ["[[a.png]]"]', ' ["[[a.png]]", "[[b.png]]"]'],
  [' [[a.png]]', '\n  - "[[a.png]]"\n  - "[[b.png]]"'],
  [" '[[a.png]]'", "\n  - '[[a.png]]'\n  - '[[b.png]]'"],
])
  add('Files', 'files', `Mx Files:${held}`, 'a.png', set('file', ['[[a.png]]', '[[b.png]]']), `Mx Files:${want}`)

// Spaces: a Space title matches quoted, bare, or in another casing, and a Space write keeps the file's spelling.
const SPACES = [
  [' [Area One]', 'Area One', ['Area One', 'Area Two'], ' [Area One, Area Two]'],
  [" ['Area One']", 'Area One', ['Area One', 'Area Two'], " ['Area One', 'Area Two']"],
  [' ["Area One"]', 'Area One', ['Area One', 'Area Two'], ' ["Area One", "Area Two"]'],
  ['\n  - Area One', 'Area One', ['Area One', 'Area Two'], '\n  - Area One\n  - Area Two'],
  ['\n  - "Area One"', 'Area One', ['Area One', 'Area Two'], '\n  - "Area One"\n  - "Area Two"'],
  [' area one', 'Area One', ['Area One', 'Area Two'], '\n  - area one\n  - Area Two'],
  [" ['Area One', 'Area Two']", 'Area One|Area Two', ['Area Two'], " ['Area Two']"],
]
for (const [held, read, spaces, want] of SPACES) add('Areas', 'areas', `${AREAS}:${held}`, read, { spaces }, `${AREAS}:${want}`)

// The cascades: each renames something these pages hold, and every spelling follows it in its own quotes.
const CASCADES = [
  { title: 'Mx Cascade Link 1', held: 'Mx Ref: "[[Mx Target]]"', want: 'Mx Ref: "[[Mx Renamed]]"', by: 'page' },
  { title: 'Mx Cascade Link 2', held: "Mx Ref: '[[Mx Target]]'", want: "Mx Ref: '[[Mx Renamed]]'", by: 'page' },
  { title: 'Mx Cascade Link 3', held: 'Mx Ref: [[Mx Target]]', want: 'Mx Ref: "[[Mx Renamed]]"', by: 'page' },
  { title: 'Mx Cascade Link 4', held: "Mx Note: 'see [[Mx Target]]'", want: "Mx Note: 'see [[Mx Renamed]]'", by: 'page' },
  { title: 'Mx Cascade Year 1', held: 'Mx Ref: [[2024]]', want: 'Mx Ref: "[[2025]]"', by: 'year' },
  { title: 'Mx Cascade Year 2', held: 'Mx Ref: "[[2024]]"', want: 'Mx Ref: "[[2025]]"', by: 'year' },
  { title: 'Mx Cascade Option 1', held: "Mx Labels: ['Work', Life]", want: "Mx Labels: ['Job', Life]", by: 'option' },
  { title: 'Mx Cascade Option 2', held: 'Mx Labels:\n  - "Work"', want: 'Mx Labels:\n  - "Job"', by: 'option' },
  { title: 'Mx Cascade Option 3', held: 'Mx Labels: [work]', want: 'Mx Labels: [Job]', by: 'option' },
  { title: 'Mx Cascade Space 1', held: `${AREAS}: ['Area One']`, want: `${AREAS}: ['Area Uno']`, by: 'space' },
  { title: 'Mx Cascade Space 2', held: `${AREAS}:\n  - "Area One"`, want: `${AREAS}:\n  - "Area Uno"`, by: 'space' },
  { title: 'Mx Cascade Space 3', held: `${AREAS}: [area one]`, want: `${AREAS}: [Area Uno]`, by: 'space' },
  { title: 'Mx Cascade Key 1', held: "Mx Choice: 'Done'", want: "Mx Pick: 'Done'", by: 'key' },
  { title: 'Mx Cascade Key 2', held: 'mx choice:\n  - "Done"', want: 'Mx Pick:\n  - "Done"', by: 'key' },
]

// ── The Nexus on disk ───────────────────────────────────────────────────────

const ids = {}
const pageIds = {}
const block = (title) => frontRaw(title).split('\n').filter((l) => !l.startsWith('ID: ')).join('\n')
function seedPage(title, fm) {
  pageIds[title] = mintPageId()
  writeFileSync(join(NEXUS, pagePath(title)), `---\nID: ${pageIds[title]}\n${fm}${fm ? '\n' : ''}---\nBody\n`)
}
const spaceId = (group, title) =>
  JSON.parse(readFileSync(join(NEXUS, '.nexus/contexts', group, title, '_space.json'), 'utf8')).id
const contextId = (title) =>
  JSON.parse(readFileSync(join(NEXUS, '.nexus/contexts/contexts.json'), 'utf8')).contexts.find((c) => c.title === title).id

async function seed(cdp) {
  for (const t of TARGETS) seedPage(t, '')
  for (const c of cases) seedPage(c.title, c.held)
  for (const c of CASCADES) seedPage(c.title, c.held)
  const all = Object.values(pageIds)
  await until('every seeded page indexed', async () => {
    const r = await ask(cdp, 'view:loadValues', COLLECTION, all)
    return r.ok && all.every((id) => r.value[id])
  }, 30000)
  for (const [prop, { name, type, ...options }] of Object.entries(PROPS)) {
    const r = await ask(cdp, 'schema:add', COLLECTION, { id: '', name, type, ...options })
    if (!r.ok) throw new Error(`The seed stops: schema:add refused ${name}: ${JSON.stringify(r)}`)
    ids[prop] = r.value.id
  }
  ids.areas = contextId('Areas')
  await must('the matrix view', ask(cdp, 'views:save', COLLECTION, 'collection', {
    id: VIEW_ID, name: 'Spelling Matrix', type: 'table', hidden_properties: [],
    property_order: ['_title', ...Object.keys(PROPS).map((p) => ids[p]), ids.areas],
  }, {}))
  await must('show the matrix', ask(cdp, 'mutate', { op: 'setActiveView', path: COLLECTION, kind: 'collection', viewId: VIEW_ID }))
  await sleep(2500)
  const moved = [...cases, ...CASCADES].filter((c) => block(c.title) !== c.held)
  check(`registering leaves all ${cases.length + CASCADES.length} pages byte-identical`, moved.length === 0,
    moved.map((c) => `${c.title}: ${JSON.stringify(block(c.title))}`).join('\n      '))
}

// ── Reading through the table ───────────────────────────────────────────────

const COLUMNS = [...Object.keys(PROPS), 'areas']
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

async function readTable(cdp) {
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(COLLECTION)})`)
  await until('the matrix on screen', () => cdp.evaluate(`!!document.querySelector('.data-row[data-rid]')`))
  await sleep(800)
  const rows = {}
  await cdp.evaluate(`(${SCROLLER}).scrollTop = 0`)
  for (let pass = 0; pass < 200; pass++) {
    Object.assign(rows, await cdp.evaluate(ROWS_ON_SCREEN))
    const done = await cdp.evaluate(`(() => { const s = ${SCROLLER}; const end = s.scrollTop + s.clientHeight >= s.scrollHeight - 2; s.scrollTop += s.clientHeight * 0.7; return end })()`)
    await sleep(250)
    if (done) break
  }
  return rows
}

function checkReads(rows) {
  const wrong = []
  for (const c of cases) {
    const cell = rows[pageIds[c.title]]?.[COLUMNS.indexOf(c.prop)]
    const shown = c.prop === 'amount' && typeof cell === 'string' ? (cell === '' ? null : Number(cell.replace(/[^0-9.-]/g, ''))) : cell
    const want = c.read === null ? (c.prop === 'amount' ? null : '') : c.read
    const ok = c.prop === 'ref' || c.prop === 'files' ? (want === '' ? shown === '' : String(shown).includes(want)) : shown === want
    if (!ok) wrong.push(`${c.title} ${c.held.replace(/\n/g, '⏎')} shows ${JSON.stringify(shown)}, expected ${JSON.stringify(want)}`)
  }
  check(`every value reads as its type reads it (${cases.length} cases)`, wrong.length === 0, wrong.join('\n      '))
}

// ── Writing ─────────────────────────────────────────────────────────────────

async function act(cdp, c) {
  const path = pagePath(c.title)
  if (c.act.spaces) {
    const spaceIds = c.act.spaces.map((t) => spaceId('Areas', t))
    return must(`${c.title} Spaces`, ask(cdp, 'mutate', { op: 'setContext', path, contextId: ids.areas, spaceIds }))
  }
  return must(`${c.title} ${key(c.prop)}`, ask(cdp, 'mutate', { op: 'setProperty', path, propertyId: ids[c.prop], value: c.act.set }))
}

async function checkWrites(cdp) {
  for (const group of [...new Set(cases.map((c) => c.group))]) {
    const wrong = []
    const acted = cases.filter((c) => c.group === group && c.act)
    for (const c of acted) {
      await act(cdp, c)
      if (!(await settles(async () => block(c.title) === c.want, 3000)))
        wrong.push(`${c.title} ${c.held.replace(/\n/g, '⏎')} → ${JSON.stringify(block(c.title))}, expected ${JSON.stringify(c.want)}`)
    }
    check(`${group}: every write keeps the file's spelling (${acted.length} cases)`, wrong.length === 0, wrong.join('\n      '))
  }
  const unticked = cases.filter((c) => c.group === 'Check')
  const kept = []
  for (const c of unticked) {
    await must(`${c.title} untick`, ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(c.title), propertyId: ids.check, value: null }))
    if (!(await settles(async () => block(c.title) === '', 3000))) kept.push(`${c.title}: ${JSON.stringify(block(c.title))}`)
  }
  check(`Check: every untick removes the key (${unticked.length} cases)`, kept.length === 0, kept.join('\n      '))
}

async function checkCascades(cdp) {
  const steps = {
    page: () => ask(cdp, 'mutate', { op: 'rename', path: pagePath('Mx Target'), kind: 'page', newName: 'Mx Renamed' }),
    year: () => ask(cdp, 'mutate', { op: 'rename', path: pagePath('2024'), kind: 'page', newName: '2025' }),
    option: () => ask(cdp, 'property:renameOption', ids.labels, 'Work', 'Job'),
    space: () => ask(cdp, 'mutate', { op: 'renameSpace', spaceId: spaceId('Areas', 'Area One'), newName: 'Area Uno' }),
    key: () => ask(cdp, 'property:rename', ids.choice, 'Mx Pick'),
  }
  const LABEL = { page: 'a page rename', year: "a whole-number page's rename", option: 'an option rename', space: 'a Space retitle', key: 'a property rename' }
  for (const [by, step] of Object.entries(steps)) {
    await must(LABEL[by], step())
    const mine = CASCADES.filter((c) => c.by === by)
    const wrong = []
    for (const c of mine)
      if (!(await settles(async () => block(c.title) === c.want, 6000)))
        wrong.push(`${c.title} ${c.held.replace(/\n/g, '⏎')} → ${JSON.stringify(block(c.title))}, expected ${JSON.stringify(c.want)}`)
    check(`${LABEL[by]} rewrites every spelling in its own quotes (${mine.length} cases)`, wrong.length === 0, wrong.join('\n      '))
  }
}

// ── The run ─────────────────────────────────────────────────────────────────

const { cdp } = await launch(PORT, 'pommora-spelling-drive')
try {
  await seed(cdp)
  checkReads(await readTable(cdp))
  await checkWrites(cdp)
  await checkCascades(cdp)
} catch (e) {
  check('the drive ran to its end', false, e.stack)
} finally {
  await restore()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed over ${cases.length + CASCADES.length} pages`)
  process.exitCode = failed.length ? 1 : 0
}
