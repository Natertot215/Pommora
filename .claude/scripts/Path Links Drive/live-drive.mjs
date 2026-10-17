import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import {
  activate, ask, attach, blurField, boxOf, chooseNative, click, closePanel, escapeAll, field, fieldValue, FM, KEY, key, launch, META,
  measure, mintPageId, mouseAt, mouseClick, must, NEXUS, nativeMenu, openField, openPane, openPanel, PAGE_VIEW, PANE, PANE_VIEW,
  portalOpen, pressKey, refusal, REPO, restore, results, selectField, settles, SHIFT, shot, sleep, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9383
const SCALE = process.argv.slice(2).includes('scale')
const GROUPS = new Set(process.argv.slice(2).filter((a) => a !== 'scale').map(Number))
const ALL = [1, 2, 3, 4, 5, 6, 7, 8]
if ((GROUPS.size === 0 && !SCALE) || [...GROUPS].some((g) => !ALL.includes(g))) {
  console.error('usage: node live-drive.mjs <group…> [scale]   (groups 1–8, each the plan phase of its number; scale times ~/Benchmark-Medium)')
  process.exit(2)
}
// The last plan phase landed in the build under test: an item owned by a later phase is expected to fail and doesn't fail the run.
const LANDED = Number(process.env.POMMORA_PL_LANDED ?? 1)

// ── Items ───────────────────────────────────────────────────────────────────

const ledger = []
/** One assertion, owned by the plan phase that lands it and the decision it proves. */
function item(group, phase, decision, name, pass, detail) {
  const awaited = phase > LANDED
  const mark = pass ? (awaited ? 'AHEAD' : 'PASS') : awaited ? 'AWAIT' : 'FAIL'
  console.log(`${mark.padEnd(5)}  g${group} [P${phase} ${decision}] ${name}${!pass && detail ? `\n       ${detail}` : ''}`)
  results.push({ name, pass: !!pass || awaited })
  ledger.push({ group, phase, decision, name, mark })
}
/** An item the drive can't run against this build or this harness, with why. */
function pending(group, phase, decision, name, why) {
  console.log(`SKIP   g${group} [P${phase} ${decision}] ${name}\n       ${why}`)
  ledger.push({ group, phase, decision, name, mark: 'SKIP' })
}
const show = (v) => JSON.stringify(v)

// ── The Nexus on disk, by path ──────────────────────────────────────────────

const ids = {}
const A_ALPHA = 'Collection A/Set Alpha'
const A_BETA = 'Collection A/Set Beta'
const B_ALPHA = 'Collection B/Set Alpha'
const abs = (rel) => join(NEXUS, rel)
const readRel = (rel) => readFileSync(abs(rel), 'utf8')
const exists = (rel) => existsSync(abs(rel))
const frontOf = (rel) => parse(FM.exec(readRel(rel))?.[1] ?? '') ?? {}
const bodyOf = (rel) => readRel(rel).replace(FM, '')
function setBody(rel, body) {
  const text = readRel(rel)
  writeFileSync(abs(rel), `${FM.exec(text)[0]}${body}`)
}
const page = (parent, title) => `${parent}/${title}.md`
const containerId = () => { const id = mintPageId(); return `${id.slice(0, 10)}0${id.slice(11)}` }

async function createAt(cdp, parent, title, seeds = {}) {
  const id = mintPageId()
  await must(`createPage ${parent}/${title}`, ask(cdp, 'mutate', { op: 'createPage', id, parentPath: parent, name: title, seeds }))
  ids[page(parent, title)] = id
  return page(parent, title)
}
/** A page written straight to disk, as Finder or Obsidian would leave it. */
function writeOutside(rel, body = '') {
  const id = mintPageId()
  mkdirSync(abs(rel).slice(0, abs(rel).lastIndexOf('/')), { recursive: true })
  writeFileSync(abs(rel), `---\nID: ${id}\n---\n${body}`)
  ids[rel] = id
  return rel
}
function treePaths(tree) {
  const out = new Set()
  const walk = (n) => {
    for (const p of n.pages ?? []) out.add(p.path)
    for (const s of n.sets ?? []) walk(s)
  }
  for (const c of tree.collections) walk(c)
  return out
}
const nexusState = async (cdp) => (await ask(cdp, 'nexus:state')).value
const inTree = async (cdp, rel) => treePaths((await nexusState(cdp)).tree).has(rel)
const waitTree = (cdp, rel, present = true, ms = 10000) =>
  until(`${rel} ${present ? 'in' : 'out of'} the tree`, async () => (await inTree(cdp, rel)) === present, ms)

// ── The seed ────────────────────────────────────────────────────────────────

const LINK = 'PL Link'
const TEXT = 'PL Text'
const FILE = 'PL File'
const props = {}
const VIEW = { id: 'view_01KZPATHLINKSDRIVE000TABLE', name: 'PL Table' }
const NOTES_A = page(A_ALPHA, 'Notes')
const NOTES_BETA = page(A_BETA, 'Notes')
const NOTES_B = page(B_ALPHA, 'Notes')
const SOLO = page(A_ALPHA, 'Solo')
const REPORT = page(A_ALPHA, 'Report.v2')
const SPEC = page(A_ALPHA, 'Spec.md')
const MEMO_DEEP = page(A_ALPHA, 'Memo')
const MEMO_ROOT = 'Set Alpha/Memo.md'
const HASH_SET = 'Collection A/Set #Hash'
const HASHED = page(HASH_SET, 'Hashed')
let hashAdmitted = false

// Every body/Text case: its tag, what it writes, the state it reads in, what it draws, and the decision it proves. `missing` marks a heading the named page lacks.
const CASES = [
  ['c01', '[[Notes]]', 'ambiguous', 'Notes', 'B-2 a bare shared title'],
  ['c02', '[[Collection A/Set Alpha/Notes]]', 'resolved', 'Notes', 'B-1 the full path draws its title only'],
  ['c03', '[[Set Beta/Notes]]', 'resolved', 'Notes', 'A-4 a unique tail'],
  ['c04', '[[Set Alpha/Notes]]', 'ambiguous', 'Notes', 'A-4 a tail two paths end with'],
  ['c05', '[[Set Alpha/Memo#Root]]', 'resolved', 'Memo § Root', 'A-4 a full path beats a tail'],
  ['c06', '[[Set Alpha/Memo#Deep]]', 'resolved', 'Memo § Deep', 'A-4 the full path, not the tail, is named', { missing: true }],
  ['c07', '[[Notes.md]]', 'ambiguous', 'Notes.md', 'A-5 .md read on a shared title'],
  ['c08', '[[Solo.md]]', 'resolved', 'Solo.md', 'A-5 .md read in a wikilink'],
  ['c09', '[[Set Beta/Notes.md]]', 'resolved', 'Notes.md', 'A-5 .md read on a path'],
  ['c10', '[[Spec.md]]', 'resolved', 'Spec.md', 'A-5 the outside-made Spec.md.md'],
  ['c11', '[[Spec]]', 'resolved', 'Spec', "A-5 pageKey drops a title's .md too, so the page titled Spec.md answers Spec (the plan's one key, not Obsidian's reading)"],
  ['c12', '[[Spec.md.md]]', 'resolved', 'Spec.md.md', "A-5 Spec.md.md's own file name, its .md read"],
  ['c13', '[[./Solo]]', 'phantom', '[[./Solo]]', 'A-4 ./ is not read'],
  ['c14', '[[../Solo]]', 'phantom', '[[../Solo]]', 'A-4 ../ is not read'],
  ['c15', '[[/Collection A/Set Alpha/Solo]]', 'phantom', '[[/Collection A/Set Alpha/Solo]]', 'A-2 a leading / is not a path'],
  ['c16', '[[Set Alpha/]]', 'phantom', '[[Set Alpha/]]', 'A-4 a folder alone names no page'],
  ['c17', '[[set beta/notes]]', 'resolved', 'notes', 'A-4 a case variant'],
  ['c18', '[[COLLECTION A/set alpha/NOTES]]', 'resolved', 'NOTES', 'A-4 a case variant of the full path'],
  ['c19', '[n](Collection%20A/Set%20Alpha/Notes)', 'resolved', 'n', 'A-2 a markdown full path'],
  ['c20', '[n](Set%20Beta/Notes)', 'resolved', 'n', 'A-4 a markdown unique tail'],
  ['c21', '[n](Set Beta/Notes)', 'resolved', 'n', 'A-4 a markdown tail spelled with raw spaces'],
  ['c22', '[n](Set%20Alpha/Notes)', 'ambiguous', 'n', 'A-4 a markdown shared tail'],
  ['c23', '[n](Solo.md)', 'resolved', 'n', 'A-5 .md in a markdown link'],
  ['c24', '[n](Set%20Beta/Notes.md)', 'resolved', 'n', 'A-5 .md on a markdown path'],
  ['c25', '[n](./Solo)', 'phantom', '[n](./Solo)', 'A-4 ./ in a markdown link', { or: '[n]' }],
  ['c26', '[x](docs/file.pdf)', 'phantom', '[x](docs/file.pdf)', 'A-4 a relative file is a phantom page, not nothing', { or: '[x]' }],
  ['c27', '[x](https://a.com/b)', 'url', 'x', 'A-8 an address stays an address'],
  ['c28', '[](Set%20Beta/Notes)', 'resolved', 'Notes', 'B-1 an empty label shows the title alone'],
  ['c29', '[[Set Beta/Notes#Diagram.png]]', 'resolved', 'Notes § Diagram.png', 'A-5 a file-named heading'],
  ['c30', '[[Set Beta/Notes#photo.jpeg]]', 'resolved', 'Notes § photo.jpeg', 'A-5 a file-named heading'],
  ['c31', '[[Solo#Notes.md]]', 'resolved', 'Solo § Notes.md', 'A-5 a heading keeps its trailing .md'],
  ['c32', '[[Solo#x/y]]', 'resolved', 'Solo § x/y', 'A-9 a / in a heading is no folder'],
  ['c33', '[[Collection A/Set Beta/Notes#a/b]]', 'resolved', 'Notes § a/b', 'A-9 a / in a heading after a path'],
  ['c34', '[](Set%20Beta/Notes#Diagram.png)', 'resolved', 'Diagram.png', 'A-5 a markdown heading label'],
  ['c35', '[[Set Beta/Notes|Beta]]', 'resolved', 'Beta', 'B-1 an alias on a path'],
  ['c36', '[[Set Beta/Notes|Notes]]', 'resolved', 'Notes', 'B-1 the title alias on a path'],
  ['c37', '[[Report.v2]]', 'resolved', 'Report.v2', 'A-5 a dotted title'],
  ['c38', '[[Collection A/Set Alpha/Report.v2]]', 'resolved', 'Report.v2', 'B-1 a dotted title by path'],
  ['c39', '[[Notes#photo.jpeg]]', 'ambiguous', 'Notes#photo.jpeg', 'B-2 a shared title with a heading'],
  ['c40', '[[Set Beta/Notes#Nope.png]]', 'resolved', 'Notes § Nope.png', 'A-5 a missing file-named heading', { missing: true }],
  ['c41', '[[A/B/]]', 'phantom', '[[A/B/]]', 'B-1 a half ending in / keeps its whole slot'],
  ['c42', '[[Collection A/Set Alpha/Spec.md]]', 'resolved', 'Spec.md', 'A-5 the outside-made page by path'],
]
const HASH_CASES = [
  ['h01', '[n](Collection%20A/Set%20%23Hash/Hashed)', 'resolved', 'n', 'A-6 a folder holding # spelled in markdown'],
  ['h02', '[[Hashed]]', 'resolved', 'Hashed', 'A-6 its unique title'],
]
const LINK_ROWS = [
  ['PL Row 1', '[[Notes]]', 'ambiguous', 'Notes'],
  ['PL Row 2', '[[Collection A/Set Alpha/Notes|Notes]]', 'resolved', 'Notes'],
  ['PL Row 3', '[[Set Beta/Notes]]', 'resolved', 'Notes'],
  ['PL Row 4', '[[Set Alpha/Notes]]', 'ambiguous', 'Notes'],
  ['PL Row 5', '[x](Collection%20B/Set%20Alpha/Notes)', 'resolved', 'x'],
  ['PL Row 6', '[[Set Beta/Notes#Diagram.png]]', 'resolved', 'Notes § Diagram.png'],
  ['PL Row 7', '[[./Solo]]', 'phantom', '[[./Solo]]'],
  ['PL Row 8', '[[Report.v2]]', 'resolved', 'Report.v2'],
  ['PL Row 9', '[[Collection A/Set Alpha/Solo]]', 'resolved', 'Solo'],
]
const PROSE = page(A_ALPHA, 'PL Prose')
const TABLE = page(A_ALPHA, 'PL Grid')
const MENU = page(A_ALPHA, 'PL Menu')
const COMMIT = page(A_ALPHA, 'PL Commit')
const FILES = page(A_ALPHA, 'PL Files')
const caseLines = (cases) => cases.map(([tag, src]) => `${tag} ${src}`).join('\n')
const tableOf = (cases) =>
  ['| Case |', '| --- |', ...cases.map(([tag, src]) => `| ${tag} ${src.replace(/\|/g, '\\|')} |`)].join('\n')
let bodyCases = CASES

async function seed(cdp) {
  for (const [name, type] of [[LINK, 'link'], [TEXT, 'text'], [FILE, 'file']]) {
    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
    if (!r.ok) throw new Error(`The seed stops: schema:add refused ${name}: ${show(r)}`)
    props[name] = r.value.id
  }
  await must('the PL table', ask(cdp, 'views:save', 'Collection A', 'collection', {
    id: VIEW.id, name: VIEW.name, type: 'table', property_order: ['_title', props[LINK], props[TEXT], props[FILE]], hidden_properties: [],
  }, {}))
  const root = await ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Set Alpha' })
  if (!root.ok) throw new Error(`The seed stops: a root Collection named Set Alpha was refused: ${show(root)}`)
  // The app refuses # in a name it makes, so the folder is made as Finder would make it.
  const hash = await ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: 'Collection A', kind: 'set', name: 'Set #Hash' })
  item(0, 1, 'A-6', 'createContainer refuses a Set named with #, as an invalid name', !hash.ok && hash.error?.code === 'invalid-name', show(hash))
  await createAt(cdp, A_ALPHA, 'Notes')
  await createAt(cdp, A_BETA, 'Notes')
  await createAt(cdp, B_ALPHA, 'Notes')
  await createAt(cdp, A_ALPHA, 'Solo')
  await createAt(cdp, A_ALPHA, 'Report.v2')
  await createAt(cdp, A_ALPHA, 'Memo')
  await createAt(cdp, 'Set Alpha', 'Memo')
  writeOutside(HASHED, '')
  writeOutside(SPEC, '## Outside\n')
  await createAt(cdp, A_ALPHA, 'PL Prose', { [props[TEXT]]: { kind: 'text', value: caseLines(CASES) } })
  await createAt(cdp, A_ALPHA, 'PL Grid')
  await createAt(cdp, A_ALPHA, 'PL Menu')
  await createAt(cdp, A_ALPHA, 'PL Commit')
  await createAt(cdp, A_ALPHA, 'PL Files', { [props[FILE]]: { kind: 'file', value: ['[[Report.pdf]]', '[[Report.md]]', '[[Collection A Banner.jpg]]'] } })
  for (const [title, value] of LINK_ROWS) await createAt(cdp, A_ALPHA, title, { [props[LINK]]: { kind: 'link', value } })
  await sleep(800)
  setBody(NOTES_A, '## Diagram.png\n\n## photo.jpeg\n\nAlpha notes.\n')
  setBody(NOTES_BETA, '## Diagram.png\n\n## photo.jpeg\n\n## a/b\n\nBeta notes.\n')
  setBody(NOTES_B, '## Other\n\nCollection B notes.\n')
  setBody(SOLO, '## Notes.md\n\n## x/y\n\nSolo.\n')
  setBody(MEMO_DEEP, '## Deep\n')
  setBody(MEMO_ROOT, '## Root\n')
  setBody(MENU, 'see [[Collection A/Set Alpha/Notes]] here\n')
  await waitTree(cdp, SPEC)
  hashAdmitted = await waitTree(cdp, HASHED, true, 6000).then(() => true, () => false)
  bodyCases = hashAdmitted ? [...CASES, ...HASH_CASES] : CASES
  setBody(PROSE, `${caseLines(bodyCases)}\n`)
  setBody(TABLE, `${tableOf(bodyCases)}\n`)
  item(0, 1, 'A-1', 'seed: three Notes, Solo, Report.v2, two Memos, the outside-made Spec.md.md, and every PL page are in the tree',
    (await Promise.all([NOTES_A, NOTES_BETA, NOTES_B, SOLO, REPORT, MEMO_DEEP, MEMO_ROOT, SPEC, PROSE, TABLE].map((r) => inTree(cdp, r)))).every(Boolean))
  if (!hashAdmitted) pending(1, 1, 'A-6', 'a Finder-made folder holding # (Set #Hash) and its cases h01–h02', 'the folder was not admitted to the tree')
  await sleep(1500)
}

// ── Reading a draw ──────────────────────────────────────────────────────────

/** In-page: what one line or cell draws, its link states, whether a heading reads missing, and its visible text with its tag cut. */
const DRAWN = `(el, tag) => {
  const states = new Set()
  for (const e of el.querySelectorAll('*')) {
    const c = typeof e.className === 'string' ? e.className : ''
    if (/md-connection-glyph/.test(c)) continue
    const m = /md-connection-(resolved|ambiguous|phantom|typing)\\b/.exec(c)
    if (m) states.add(m[1])
    else if (/(^|\\s)md-link(\\s|$)/.test(c)) states.add('url')
  }
  const missing = !!el.querySelector('.md-connection-heading-missing')
  const text = el.textContent.replace(/\\u200b/g, '').replace(/\\s*§\\s*/g, ' § ').trim()
  return { states: [...states], missing, text: text.startsWith(tag + ' ') ? text.slice(tag.length + 1) : text }
}`
// A phantom markdown link hides its destination in an editor and shows it in a resting cell, so either text holds (`or`).
const drawnOk = (d, status, shown, opts = {}) =>
  !!d && d.states.length === 1 && d.states[0] === status && (d.text === shown || d.text === opts.or) && (opts.missing === undefined || d.missing === opts.missing)
// The editor line holding a tag, caret parked at its start (before the tag) so the link rests.
async function editorLine(cdp, view, tag) {
  return cdp.evaluate(`(() => {
    const v = ${view}
    const d = v.state.doc.toString()
    const at = d.search(new RegExp('(^|\\\\n)${tag} '))
    if (at < 0) return null
    const pos = at === 0 ? 0 : at + 1
    v.dispatch({ selection: { anchor: pos }, scrollIntoView: true })
    return pos
  })()`).then(async (pos) => {
    if (pos === null) return null
    await sleep(60)
    return cdp.evaluate(`(() => { const v = ${view}; const line = [...v.contentDOM.querySelectorAll('.cm-line')].find((l) => l.textContent.startsWith('${tag} ')); return line ? (${DRAWN})(line, '${tag}') : null })()`)
  })
}

// ── Surfaces ────────────────────────────────────────────────────────────────

async function home(cdp) {
  await escapeAll(cdp)
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === 'Collection A')`)
  await sleep(800)
  await must('show the PL table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEW.id }))
  await until('the PL table', () => cdp.evaluate(`!!${rowOf(PROSE)}`))
  await sleep(500)
}
const rowOf = (rel) => `document.querySelector('.data-row[data-rid="${ids[rel]}"]')`
const COLUMNS = [LINK, TEXT, FILE]
const cellOf = (rel, prop) => `${rowOf(rel)}.querySelectorAll('.data-cell')[${COLUMNS.indexOf(prop) + 1}]`
const tabTitle = (cdp) => cdp.evaluate(`document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('title') ?? null`)
async function openRow(cdp, rel) {
  await cdp.evaluate(`(${rowOf(rel)}).scrollIntoView({ block: 'center' })`)
  await sleep(200)
  await mouseClick(cdp, `${rowOf(rel)}.querySelector('.cell-title-text')`)
  const title = rel.split('/').pop().replace(/\.md$/, '')
  await until(`${title}'s tab`, async () => (await tabTitle(cdp)) === title)
  await sleep(900)
}
const panelRow = (prop) => `document.querySelector('[data-property-row="${props[prop]}"]')`
const CELL_VIEW = `document.querySelector('.mdpm-tbl-cell-editor .cm-content').cmTile.root.view`
const FIELD_LINE = `document.querySelector('.value-field .cm-line')`
const linkEl = (scope, text) =>
  `[...(${scope}).querySelectorAll('.md-connection-resolved, .md-connection-ambiguous, .md-connection-phantom')].find((e) => e.textContent.includes(${JSON.stringify(text)}))`

// The native menu's rows read from System Events; `downs` is the target's place among the rows a Down lands on.
async function menuChoose(cdp, pid, expr, label) {
  let rows = []
  await activate(cdp, pid)
  const box = await boxOf(cdp, expr)
  await mouseAt(cdp, box, { button: 'right' })
  await sleep(700)
  rows = nativeMenu(pid).filter((n) => n && n !== 'missing value')
  const at = rows.indexOf(label)
  if (at < 0) {
    key(KEY.esc)
    await sleep(400)
    return { rows, chosen: false }
  }
  for (let i = 0; i <= at; i++) key(KEY.down)
  key(KEY.ret)
  await sleep(800)
  return { rows, chosen: true }
}
// A press past the value's end, so a Link value, which is a link through and through, opens its field rather than following.
async function openValue(cdp, expr) {
  const box = await boxOf(cdp, expr)
  await mouseAt(cdp, { x: box.right - 6, y: box.y })
  await until('the inline field', () => cdp.evaluate(`!!(${field})`))
}
async function commitField(cdp, expr, text) {
  await openValue(cdp, expr)
  await selectField(cdp)
  await typeText(cdp, text)
  await sleep(300)
  await pressKey(cdp, 'Enter')
  await sleep(900)
}
const linkValueOf = (rel) => frontOf(rel)[LINK]
const shards = () => {
  const dir = abs('.nexus/metadata')
  return readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')))
}
const aliasesOf = (rel) => shards().map((s) => s.pages?.[ids[rel]]).find(Boolean)?.aliases ?? []

// ── Group 1 — the read path (Phase 1) ───────────────────────────────────────

async function group1(cdp, pid) {
  await home(cdp)

  // The page body, every case resting, then the folder's reveal with the caret.
  await openRow(cdp, PROSE)
  for (const [tag, src, status, shown, decision, opts = {}] of bodyCases) {
    const d = await editorLine(cdp, PAGE_VIEW, tag)
    item(1, 1, decision.split(' ')[0], `body: ${src} reads ${status}, drawing "${shown}"${opts.missing ? ', its heading missing' : ''}`, drawnOk(d, status, shown, opts), show(d))
  }
  const ambiguousColor = await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const a = v.contentDOM.querySelector('.md-connection-ambiguous'); const r = v.contentDOM.querySelector('.md-connection-resolved'); return a && r ? [getComputedStyle(a).color, getComputedStyle(r).color] : null })()`)
  item(1, 1, 'B-2', 'body: an Ambiguous link draws muted, in another color than a resolved one', ambiguousColor && ambiguousColor[0] !== ambiguousColor[1], show(ambiguousColor))
  for (const [tag, src, revealed] of [
    ['c02', '[[Collection A/Set Alpha/Notes]]', '[[Collection A/Set Alpha/Notes]]'],
    ['c29', '[[Set Beta/Notes#Diagram.png]]', '[[Set Beta/Notes#Diagram.png]]'],
    ['c36', '[[Set Beta/Notes|Notes]]', '[[Set Beta/Notes|Notes]]'],
  ]) {
    const line = await cdp.evaluate(`(() => {
      const v = ${PAGE_VIEW}
      const d = v.state.doc.toString()
      const at = d.indexOf(${JSON.stringify(`${tag} ${src}`)}) + ${tag.length + 1 + 3}
      v.focus()
      v.dispatch({ selection: { anchor: at } })
      return null
    })()`).then(() => sleep(150)).then(() => cdp.evaluate(`[...${PAGE_VIEW}.contentDOM.querySelectorAll('.cm-line')].find((l) => l.textContent.startsWith('${tag} '))?.textContent.replace(/\\u200b/g, '') ?? null`))
    item(1, 1, 'B-1', `body: the caret inside ${src} reveals its folder (${revealed})`, line?.includes(revealed), show(line))
  }
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  const typed = await typeInto(cdp, PAGE_VIEW, '[[Collection A/Set Beta/')
  item(1, 1, 'B-1', 'body: typing [[Collection A/Set Beta/ keeps the whole half in the slot', typed?.slot === 'Collection A/Set Beta/', show(typed))
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const d = v.state.doc.toString(); const at = d.lastIndexOf('[[Collection A/Set Beta/'); v.dispatch({ changes: { from: at, to: d.length, insert: '' } }) })()`)
  await escapeAll(cdp)
  await shot(cdp, 'g1-body')

  // A markdown table: every resting cell, then a cell opened for editing.
  await home(cdp)
  await openRow(cdp, TABLE)
  for (const [tag, src, status, shown, decision, opts = {}] of bodyCases) {
    const d = await cdp.evaluate(`(() => { const c = [...document.querySelectorAll('.mdpm-tbl-cell-static')].find((c) => c.textContent.startsWith('${tag} ')); return c ? (${DRAWN})(c, '${tag}') : null })()`)
    item(1, 1, decision.split(' ')[0], `resting table cell: ${src} reads ${status}, drawing "${shown}"`, drawnOk(d, status, shown, opts), show(d))
  }
  for (const tag of ['c02', 'c04', 'c13', 'c29', 'c35']) {
    const [, src, status, shown] = bodyCases.find((c) => c[0] === tag)
    await cdp.evaluate(`[...document.querySelectorAll('.mdpm-tbl-cell-static')].find((c) => c.textContent.startsWith('${tag} ')).scrollIntoView({ block: 'center' })`)
    await sleep(300)
    const box = await boxOf(cdp, `[...document.querySelectorAll('.mdpm-tbl-cell-static')].find((c) => c.textContent.startsWith('${tag} '))`)
    await mouseAt(cdp, { x: box.left + 4, y: box.y }, { settle: 400 })
    const opened = await settles(() => cdp.evaluate(`!!document.querySelector('.mdpm-tbl-cell-editor .cm-content')`), 3000)
    let d = null
    if (opened) {
      await cdp.evaluate(`(() => { const v = ${CELL_VIEW}; v.dispatch({ selection: { anchor: 0 } }) })()`)
      await sleep(150)
      d = await cdp.evaluate(`(() => { const l = document.querySelector('.mdpm-tbl-cell-editor .cm-line'); return l ? (${DRAWN})(l, '${tag}') : null })()`)
    }
    item(1, 1, 'B-1', `editing table cell: ${src} reads ${status}, drawing "${shown}", as its resting cell does`, opened && drawnOk(d, status, shown), show({ opened, d }))
    await pressKey(cdp, 'Escape')
    await sleep(300)
  }
  await shot(cdp, 'g1-table')

  // A Text value: every line resting in its table cell, then in TextPane.
  await home(cdp)
  for (const [tag, src, status, shown, decision, opts = {}] of CASES) {
    const d = await cdp.evaluate(`(() => { const t = (${cellOf(PROSE, TEXT)}).querySelector('.cell-text'); const l = t && [...t.querySelectorAll('.cell-text-line')].find((l) => l.textContent.startsWith('${tag} ')); return l ? (${DRAWN})(l, '${tag}') : null })()`)
    item(1, 1, decision.split(' ')[0], `Text value (resting cell): ${src} reads ${status}, drawing "${shown}"`, drawnOk(d, status, shown, opts), show(d))
  }
  await openPane(cdp, cellOf(PROSE, TEXT))
  for (const [tag, src, status, shown, decision, opts = {}] of CASES) {
    const d = await editorLine(cdp, PANE_VIEW, tag)
    item(1, 1, decision.split(' ')[0], `Text value (TextPane): ${src} reads ${status}, drawing "${shown}"`, drawnOk(d, status, shown, opts), show(d))
  }
  await pressKey(cdp, 'Escape')
  await sleep(500)
  const proseBytes = frontOf(PROSE)[TEXT]
  item(1, 1, 'A-7', 'Text value: opening and closing TextPane leaves the value byte for byte', proseBytes === caseLines(CASES), show(proseBytes?.slice(0, 120)))
  await shot(cdp, 'g1-text')

  // A Link value: each row resting, its field, and the Properties panel.
  for (const [title, raw, status, shown] of LINK_ROWS) {
    const rel = page(A_ALPHA, title)
    const d = await cdp.evaluate(`(() => { const c = ${cellOf(rel, LINK)}; return c ? (${DRAWN})(c, '') : null })()`)
    item(1, 1, 'B-1', `Link value (resting cell): ${raw} reads ${status}, drawing "${shown}"`, drawnOk(d, status, shown), show(d))
  }
  for (const [title, raw, status] of LINK_ROWS.slice(0, 4)) {
    const rel = page(A_ALPHA, title)
    await openValue(cdp, cellOf(rel, LINK))
    const value = await fieldValue(cdp)
    const d = await cdp.evaluate(`(() => { const l = ${FIELD_LINE}; return l ? (${DRAWN})(l, '') : null })()`)
    item(1, 1, 'B-1', `Link value (open field): ${raw} holds its bytes and reads ${status}`, value === raw && d?.states.length === 1 && d.states[0] === status, show({ value, d }))
    await pressKey(cdp, 'Escape')
    await sleep(300)
    item(1, 1, 'A-7', `Link value: an untouched field leaves ${raw} as written`, linkValueOf(rel) === raw, show(linkValueOf(rel)))
  }
  await openRow(cdp, page(A_ALPHA, 'PL Row 6'))
  await openPanel(cdp)
  const panel = await cdp.evaluate(`(() => { const r = ${panelRow(LINK)}; return r ? (${DRAWN})(r, '') : null })()`)
  item(1, 1, 'B-1', 'Properties panel: [[Set Beta/Notes#Diagram.png]] reads resolved, drawing "Notes § Diagram.png"', drawnOk(panel, 'resolved', 'Notes § Diagram.png'), show(panel))
  await closePanel(cdp)
  await home(cdp)
  await openRow(cdp, page(A_ALPHA, 'PL Row 4'))
  await openPanel(cdp)
  const panel4 = await cdp.evaluate(`(() => { const r = ${panelRow(LINK)}; return r ? (${DRAWN})(r, '') : null })()`)
  item(1, 1, 'A-4', 'Properties panel: [[Set Alpha/Notes]] reads ambiguous, drawing "Notes"', drawnOk(panel4, 'ambiguous', 'Notes'), show(panel4))
  await closePanel(cdp)
  await home(cdp)
  await openRow(cdp, PROSE)
  await openPanel(cdp)
  const panelText = await cdp.evaluate(`(() => { const t = (${panelRow(TEXT)})?.querySelector('.cell-text'); const l = t && [...t.querySelectorAll('.cell-text-line')].find((l) => l.textContent.startsWith('c02 ')); return l ? (${DRAWN})(l, 'c02') : null })()`)
  item(1, 1, 'B-1', 'Properties panel: the Text value draws [[Collection A/Set Alpha/Notes]] as "Notes", resolved', drawnOk(panelText, 'resolved', 'Notes'), show(panelText))
  await closePanel(cdp)
  await home(cdp)

  // Committing a Link value: a path is accepted and carries its title, a shared bare title is refused.
  for (const [typed, want, decision, name] of [
    ['[[Collection A/Set Alpha/Notes]]', '[[Collection A/Set Alpha/Notes|Notes]]', 'A-2', 'a full path is accepted and written with its title as alias'],
    ['[[Set Beta/Notes]]', '[[Set Beta/Notes|Notes]]', 'A-7', 'a unique tail is kept at its depth with its title as alias'],
    ['[[set beta/NOTES]]', '[[Set Beta/Notes|Notes]]', 'A-7', 'a case variant is respelled at its depth'],
    ['[[Set Beta/Notes|Notes]]', '[[Set Beta/Notes|Notes]]', 'B-1', 'the title alias on a path is kept'],
    ['[[Set Beta/Notes|Set Beta/Notes]]', '[[Set Beta/Notes|Notes]]', 'A-2', 'an alias repeating the path is dropped and the title alias written'],
    ['[[Set Alpha/Memo]]', '[[Set Alpha/Memo|Memo]]', 'A-4', 'the full path [[Set Alpha/Memo]] names the root Memo, kept at its depth'],
    ['[[Collection A/Set Alpha/Memo]]', '[[Collection A/Set Alpha/Memo|Memo]]', 'A-4', 'the deeper Memo is kept by its full path'],
    ['[[Spec.md]]', '[[Spec.md]]', 'A-5', 'the outside-made Spec.md is accepted as written'],
  ]) {
    await commitField(cdp, cellOf(COMMIT, LINK), typed)
    const got = await settles(async () => linkValueOf(COMMIT) === want, 3000).then(() => linkValueOf(COMMIT))
    item(1, 1, decision, `Link value commit: ${typed} — ${name} (${want})`, got === want, show(got))
    await escapeAll(cdp)
  }
  const beforeRefuse = linkValueOf(COMMIT)
  await commitField(cdp, cellOf(COMMIT, LINK), '[[Notes]]')
  const refusedText = await refusal(cdp)
  const stillOpen = await cdp.evaluate(`!!(${field})`)
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  item(1, 1, 'B-2', 'Link value commit: [[Notes]] is refused as ambiguous and the value is left as it was',
    (await settles(async () => linkValueOf(COMMIT) === beforeRefuse, 1500)) && linkValueOf(COMMIT) === beforeRefuse, show({ value: linkValueOf(COMMIT), refusedText, stillOpen }))
  item(1, 1, 'B-1', 'aliases: neither [[Set Beta/Notes|Notes]] nor [[Set Beta/Notes|Set Beta/Notes]] recorded an alias for Set Beta/Notes', aliasesOf(NOTES_BETA).length === 0, show(aliasesOf(NOTES_BETA)))
  await commitField(cdp, cellOf(COMMIT, LINK), '[n](Set%20Beta/Notes)')
  item(1, 1, 'A-7', 'Link value commit: [n](Set%20Beta/Notes) is written as a wikilink at its depth, its label the alias ([[Set Beta/Notes|n]])',
    (await settles(async () => linkValueOf(COMMIT) === '[[Set Beta/Notes|n]]', 3000)), show(linkValueOf(COMMIT)))
  await escapeAll(cdp)
  for (const alias of aliasesOf(NOTES_BETA)) await must(`${alias} forgotten`, ask(cdp, 'mutate', { op: 'editAliases', path: NOTES_BETA, edit: { op: 'forget', alias } }))
  await commitField(cdp, cellOf(COMMIT, LINK), '[[Set Beta/Notes|Beta Memo]]')
  item(1, 1, 'B-1', 'aliases: [[Set Beta/Notes|Beta Memo]] records Beta Memo on Set Beta/Notes, and the path link keeps it',
    (await settles(async () => aliasesOf(NOTES_BETA).includes('Beta Memo'), 3000)) && linkValueOf(COMMIT) === '[[Set Beta/Notes|Beta Memo]]', show({ aliases: aliasesOf(NOTES_BETA), value: linkValueOf(COMMIT) }))
  await must('Beta Memo forgotten', ask(cdp, 'mutate', { op: 'editAliases', path: NOTES_BETA, edit: { op: 'forget', alias: 'Beta Memo' } }))
  await must('PL Commit cleared', ask(cdp, 'mutate', { op: 'setProperty', path: COMMIT, propertyId: props[LINK], value: null }))
  await escapeAll(cdp)

  // Sort and filter on a Link value read its title, not its path.
  const rowTitles = () => cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.querySelector('.cell-title-text')?.textContent.trim()).filter((t) => t?.startsWith('PL Row'))`)
  const view = () => JSON.parse(readRel('Collection A/_pagecollection.json')).views.find((v) => v.id === VIEW.id)
  await must('sort on PL Link', ask(cdp, 'views:save', 'Collection A', 'collection', view(), { sort: [{ property_id: props[LINK], direction: 'ascending' }] }))
  await sleep(900)
  const sorted = await rowTitles()
  const order = ['PL Row 2', 'PL Row 8', 'PL Row 9', 'PL Row 5'].map((t) => sorted.indexOf(t))
  item(1, 1, 'B-1', 'Link sort: A → Z reads the title (Notes < Report.v2 < Solo < x), not the path', order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1])), show(sorted))
  await must('filter Collection', ask(cdp, 'views:save', 'Collection A', 'collection', view(), { sort: [], filter: { match: 'all', rules: [{ property_id: props[LINK], op: 'contains', value: 'Collection' }] }, filter_enabled: true }))
  await sleep(900)
  const byFolder = await rowTitles()
  await must('filter Solo', ask(cdp, 'views:save', 'Collection A', 'collection', view(), { filter: { match: 'all', rules: [{ property_id: props[LINK], op: 'contains', value: 'Solo' }] }, filter_enabled: true }))
  await sleep(900)
  const byTitle = (await rowTitles()).sort()
  item(1, 1, 'B-1', 'Link filter: contains Collection matches no path link, contains Solo matches PL Row 7 and 9', byFolder.length === 0 && show(byTitle) === show(['PL Row 7', 'PL Row 9']), show({ byFolder, byTitle }))
  await must('filter off', ask(cdp, 'views:save', 'Collection A', 'collection', view(), { filter_enabled: false }))
  await sleep(700)

  // The link menu on a path link in a body: Edit Title, Copy Link, Remove Link; and the Connection format off.
  await openRow(cdp, MENU)
  const target = linkEl(`${PAGE_VIEW}.contentDOM`, 'Notes')
  const edit = await menuChoose(cdp, pid, target, 'Edit Title')
  const selected = await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const s = v.state.selection.main; return v.state.doc.sliceString(s.from, s.to) })()`)
  item(1, 1, 'B-1', "link menu: Edit Title selects a path link's whole page half", edit.chosen && selected === 'Collection A/Set Alpha/Notes', show({ rows: edit.rows, selected }))
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  await sleep(300)
  const clip = execFileSync('pbpaste', { encoding: 'utf8' })
  const copy = await menuChoose(cdp, pid, linkEl(`${PAGE_VIEW}.contentDOM`, 'Notes'), 'Copy Link')
  const copied = (await ask(cdp, 'clipboard:read')).value
  execFileSync('pbcopy', { input: clip })
  item(1, 3, 'A-2', 'link menu: Copy Link on a path link to a shared title copies its full path ([[Collection A/Set Alpha/Notes|Notes]])', copy.chosen && copied === '[[Collection A/Set Alpha/Notes|Notes]]', show({ rows: copy.rows, copied }))
  const remove = await menuChoose(cdp, pid, linkEl(`${PAGE_VIEW}.contentDOM`, 'Notes'), 'Remove Link')
  item(1, 1, 'B-1', 'link menu: Remove Link on a path link leaves its title, Notes', remove.chosen && (await settles(async () => bodyOf(MENU) === 'see Notes here\n', 3000)), show(bodyOf(MENU)))
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: 'see [[Collection A/Set Alpha/Notes]] here\\n' } }) })()`)
  await settles(async () => bodyOf(MENU).includes('[['), 3000)
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const d = v.state.doc.toString(); const a = d.indexOf('[['); const b = d.indexOf(']]') + 2; v.focus(); v.dispatch({ selection: { anchor: a, head: b } }) })()`)
  for (const type of ['rawKeyDown', 'keyUp'])
    await cdp.send('Input.dispatchKeyEvent', { type, key: 'K', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers: META | SHIFT })
  item(1, 1, 'B-1', 'Connection format off (⌘⇧K) on a path link leaves Notes', await settles(async () => bodyOf(MENU) === 'see Notes here\n', 3000), show(bodyOf(MENU)))
  await shot(cdp, 'g1-menu')
  await home(cdp)

  // File values and asset references read as files (A-8).
  const chips = await cdp.evaluate(`[...(${cellOf(FILES, FILE)}).querySelectorAll('[data-file-chip-index]')].map((e) => ({ text: e.textContent.trim(), cls: (e.firstElementChild ?? e).className }))`)
  // A chip draws its name more than once (its measure and its clip), so a chip reads `name` when its text is that name repeated.
  const chip = (name) => chips.find((c) => c.text.length > 0 && c.text.split(name).every((part) => part === ''))
  item(1, 1, 'A-8', 'File value: [[Report.pdf]], [[Report.md]], and [[Collection A Banner.jpg]] read as their file names, the .md kept',
    ['Report.pdf', 'Report.md', 'Collection A Banner.jpg'].every((n) => chip(n)) && show(frontOf(FILES)[FILE]) === show(['[[Report.pdf]]', '[[Report.md]]', '[[Collection A Banner.jpg]]']),
    show({ chips, bytes: frontOf(FILES)[FILE], html: chips.length ? undefined : await cdp.evaluate(`(${cellOf(FILES, FILE)})?.outerHTML.slice(0, 400) ?? null`) }))
  item(1, 1, 'A-8', 'File value: the banner asset resolves and Report.pdf does not (their chips wear different looks)',
    !!chip('Report.pdf') && !!chip('Collection A Banner.jpg') && chip('Report.pdf').cls !== chip('Collection A Banner.jpg').cls && chip('Report.pdf').cls === chip('Report.md')?.cls, show(chips))
  const assets = (await ask(cdp, 'assets:map')).value
  const banner = await cdp.evaluate(`[...document.querySelectorAll('img')].some((i) => decodeURIComponent(i.src).includes('Collection A Banner'))`)
  item(1, 1, 'A-8', "asset reference: Collection A's [[Collection A Banner.jpg]] banner still draws and the asset map holds it",
    banner && JSON.stringify(assets).includes('Collection A Banner.jpg') && frontOrJson('Collection A/_pagecollection.json').banner === '[[Collection A Banner.jpg]]', show({ banner }))
}
const frontOrJson = (rel) => JSON.parse(readRel(rel))

/** Types `text` at the end of a document a key at a time where it opens a link, and answers the slot the typing span covers. */
async function typeInto(cdp, view, text) {
  await cdp.evaluate(`${view}.focus()`)
  for (const ch of ['[', '[']) await typeText(cdp, ch)
  await typeText(cdp, text.slice(2))
  await sleep(400)
  return cdp.evaluate(`(() => { const v = ${view}; const t = [...v.contentDOM.querySelectorAll('.md-connection-typing, .md-connection-phantom')].at(-1); return { slot: t?.textContent ?? null, doc: v.state.doc.toString().slice(-40) } })()`)
}

// ── Shared by Groups 2–8 ────────────────────────────────────────────────────

/** A body line by its tag, the tag cut. */
const lineOf = (rel, tag) => bodyOf(rel).split('\n').find((l) => l.startsWith(`${tag} `))?.slice(tag.length + 1) ?? null
const tagged = (lines) => `${lines.map(([tag, text]) => `${tag} ${text}`).join('\n')}\n`
/** What a link spells: its syntax, page half, heading, and shown text. */
function spelled(s) {
  const w = /^\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]$/.exec(s?.trim() ?? '')
  if (w) return { syntax: 'wiki', page: w[1], heading: w[2], alias: w[3] }
  const m = /^\[([^\]]*)\]\(([^)#]*)(?:#([^)]*))?\)$/.exec(s?.trim() ?? '')
  return m ? { syntax: 'markdown', page: decodeURIComponent(m[2]), heading: m[3] && decodeURIComponent(m[3]), alias: m[1] } : null
}
/** Whether a link spells `page` (and `heading` where given), its shown text one of `aliases` (undefined meaning none). */
const spells = (s, page, { heading, aliases } = {}) => {
  const l = spelled(s)
  return !!l && l.page === page && (heading === undefined || l.heading === heading) && (aliases === undefined || aliases.includes(l.alias))
}
const setDoc = (cdp, view, text) =>
  cdp.evaluate(`(() => { const v = ${view}; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(text)} }, selection: { anchor: ${text.length} } }) })()`).then(() => sleep(300))
const docOf = (cdp, view) => cdp.evaluate(`${view}.state.doc.toString()`)
const selOf = (cdp, view) => cdp.evaluate(`(() => { const s = ${view}.state.selection.main; return { from: s.from, to: s.to } })()`)
const acOpen = (cdp) => cdp.evaluate(`!!document.querySelector('.mdpm-ac') && !!document.querySelector('.mdpm-ac').textContent.trim()`)
const acText = (cdp) => cdp.evaluate(`document.querySelector('.mdpm-ac')?.innerText ?? ''`)
// One key at a time where typing pairs, so the picker sees what a hand would give it.
async function typeLink(cdp, open, rest) {
  for (const ch of open) await typeText(cdp, ch)
  if (rest) await typeText(cdp, rest)
  await sleep(700)
}
async function pickRowReading(cdp, needle) {
  // The innermost element holding a holder's title and its trail both is its row.
  const row = `[...document.querySelectorAll('.mdpm-ac *')].filter((e) => e.textContent.includes(${JSON.stringify(needle)}) && e.textContent.includes('Notes')).at(-1)`
  if (!(await cdp.evaluate(`!!(${row})`))) return false
  await mouseClick(cdp, row)
  await sleep(600)
  return true
}
const clip = {
  saved: null,
  save() { this.saved = execFileSync('pbpaste', { encoding: 'utf8' }) },
  restore() { if (this.saved !== null) execFileSync('pbcopy', { input: this.saved }) },
}
/** The drive's own index database: the newest drive userData, under the Nexus id `~/Test` carries. */
function driveDb() {
  const nexusId = JSON.parse(readRel('.nexus/nexus.json')).id
  const dirs = readdirSync(tmpdir()).filter((n) => n.startsWith('pommora-drive-')).map((n) => join(tmpdir(), n))
    .filter((d) => existsSync(join(d, 'ud'))).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const d of dirs) {
    const f = join(d, 'ud', 'Nexuses', nexusId, 'nexus.db')
    if (existsSync(f)) return f
  }
  return null
}
const sql = (db, q) => JSON.parse(execFileSync('sqlite3', ['-readonly', '-json', db, q], { encoding: 'utf8' }).trim() || '[]')
const quote = (s) => `'${s.replace(/'/g, "''")}'`

// ── Group 2 — the index key (Phase 2) ───────────────────────────────────────

async function group2(cdp) {
  const INDEX = await createAt(cdp, A_ALPHA, 'PL Index')
  const MARKDOWN = await createAt(cdp, A_ALPHA, 'PL Index Markdown')
  await sleep(600)
  setBody(INDEX, '## H\n\n[[Set Beta/Notes]]\n[[Notes.md]]\n[[#H]]\n[[Collection A/Set Alpha/Solo|Solo]] and [[Solo]]\n[[Solo.md#Notes.md]]\n')
  setBody(MARKDOWN, '[x](Set%20Beta/Notes)\n')
  const db = driveDb()
  if (!db) {
    pending(2, 2, 'A-4', 'every index row', 'the drive could not find its own nexus.db under the harness userData')
    return
  }
  const rowsOf = (rel) => sql(db, `SELECT kind, target, qualifier FROM relations WHERE path = ${quote(rel)}`)
  await settles(async () => rowsOf(INDEX).length >= 5 && rowsOf(MARKDOWN).length >= 1, 10000)
  const rows = rowsOf(INDEX)
  const has = (target, qualifier = '') => rows.some((r) => r.target === target && r.qualifier === qualifier)
  item(2, 2, 'A-4', 'index: [[Set Beta/Notes]] keys set beta/notes', has('set beta/notes'), show(rows))
  item(2, 2, 'A-5', 'index: [[Notes.md]] keys notes, its .md dropped by pageKey', has('notes') && !has('notes.md'), show(rows))
  item(2, 2, 'E-7', "index: a self [[#H]] keys no page ('' under h), never its own title", has('', 'h') && !has('pl index', 'h'), show(rows))
  item(2, 2, 'A-4', 'index: [[Collection A/Set Alpha/Solo|Solo]] beside [[Solo]] keys its full path and the bare title apart', has('collection a/set alpha/solo') && has('solo'), show(rows))
  item(2, 2, 'A-5', 'index: [[Solo.md#Notes.md]] keys solo, its heading notes.md kept whole', has('solo', 'notes.md'), show(rows))
  const md = rowsOf(MARKDOWN)
  item(2, 2, 'A-4', 'index: [x](Set%20Beta/Notes) keys set beta/notes as the wikilink does', md.some((r) => r.target === 'set beta/notes'), show(md))
  const generation = sql(db, "SELECT value FROM meta WHERE key = 'index_generation'")[0]?.value
  item(2, 2, 'G-1', 'index: the generation reads 18, so every index stamped 17 reseeded on this open', generation === '18', show(generation))
  const graph = (await ask(cdp, 'matrix:graph', false, [INDEX])).value
  const solo = (graph?.links ?? []).filter((l) => l.pageId === ids[INDEX] && ['collection a/set alpha/solo', 'solo'].includes(l.target))
  item(2, 2, 'A-4', 'Matrix: matrix:graph answers the path row and the bare row for the one page pair, each by its pageKey', solo.length >= 2, show(graph?.links?.filter((l) => l.pageId === ids[INDEX])))
  pending(2, 2, 'G-1', 'Matrix: those two rows draw one edge (the dedupe runs in the renderer after resolution, on a canvas)', 'the edge list lives in the renderer and draws to a canvas; built output exposes no hook to count it')
}

// ── Group 3 — the writers and the picker (Phase 3) ──────────────────────────

const WRITER = page(A_ALPHA, 'PL Writer')
const HASH_OUT = 'Collection A/Set #Out/Hashed.md'

async function group3(cdp, pid) {
  await createAt(cdp, A_ALPHA, 'PL Writer')
  await createAt(cdp, A_ALPHA, 'Hashed')
  writeOutside(HASH_OUT, '')
  const hashIn = await waitTree(cdp, HASH_OUT, true, 6000).then(() => true, () => false)
  await home(cdp)
  await openRow(cdp, WRITER)
  const paths = ['Collection A/Set Alpha', 'Collection A/Set Beta', 'Collection B/Set Alpha']

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[[', 'Notes')
  const listed = await acText(cdp)
  item(3, 3, 'B-4', 'picker: [[Notes lists all three holders of Notes', (listed.match(/\bNotes\b/g) ?? []).length >= 3, show(listed))
  item(3, 3, 'B-4', "picker: each holder's row shows its location", ['Set Beta', 'Collection B'].every((p) => listed.includes(p)), show(listed))
  await pressKey(cdp, 'Enter')
  await sleep(600)
  const picked = (await docOf(cdp, PAGE_VIEW)).trim()
  item(3, 3, 'A-3', 'picker: a pick of a shared title writes its full path with its title as alias', paths.some((p) => picked === `[[${p}/Notes|Notes]]`), show(picked))
  item(3, 3, 'B-4', 'picker: the pick closes the picker', !(await acOpen(cdp)))
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: 4 } }) })()`)
  await sleep(700)
  item(3, 3, 'B-4', 'picker: the caret inside a finished path link opens nothing', !(await acOpen(cdp)), show(await acText(cdp)))

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[[', 'Sol')
  await pressKey(cdp, 'Enter')
  await sleep(600)
  item(3, 3, 'A-2', 'picker: a pick of a unique title writes it bare ([[Solo]])', (await docOf(cdp, PAGE_VIEW)).trim() === '[[Solo]]', show(await docOf(cdp, PAGE_VIEW)))

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[[', 'Solo')
  item(3, 3, 'B-4', 'picker: a typed title that resolves ([[Solo]]) closes the picker', !(await acOpen(cdp)), show(await acText(cdp)))

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[[', 'Notes.md')
  const dotted = await acText(cdp)
  item(3, 3, 'B-4', 'picker: [[Notes.md, ambiguous through its .md, lists the holders of Notes', (dotted.match(/\bNotes\b/g) ?? []).length >= 3, show(dotted))
  await escapeAll(cdp)

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '![[', 'Not')
  await pressKey(cdp, 'Enter')
  await sleep(600)
  const embedded = (await docOf(cdp, PAGE_VIEW)).trim()
  item(3, 3, 'A-3', 'picker: an embed pick of a shared title writes its full path with no alias', paths.some((p) => embedded === `![[${p}/Notes]]`), show(embedded))

  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[n](', 'Notes')
  await pressKey(cdp, 'Enter')
  await sleep(600)
  const mdPicked = (await docOf(cdp, PAGE_VIEW)).trim()
  item(3, 3, 'A-2', 'picker: a markdown pick of a shared title writes its encoded full path', paths.some((p) => mdPicked === `[n](${p.replace(/ /g, '%20')}/Notes)`), show(mdPicked))

  for (const [needle, want, name] of [
    ['Set Beta', '[[Collection A/Set Beta/Notes#Diagram.png|A]]', 'a holder with Diagram.png keeps the heading'],
    ['Collection B', '[[Collection B/Set Alpha/Notes|A]]', 'a holder without it drops the heading'],
  ]) {
    await setDoc(cdp, PAGE_VIEW, '[[Notes#Diagram.png|A]]')
    await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.focus(); v.dispatch({ selection: { anchor: 2, head: 7 } }) })()`)
    await typeText(cdp, 'Notes')
    await sleep(700)
    const chose = await pickRowReading(cdp, needle)
    const doc = (await docOf(cdp, PAGE_VIEW)).trim()
    item(3, 3, 'C-5', `picker: re-aiming [[Notes#Diagram.png|A]] at ${needle} — ${name} (${want})`, chose && doc === want, show({ chose, doc, rows: chose ? undefined : await acText(cdp) }))
    await escapeAll(cdp)
  }

  for (const [pasted, page_, name] of [
    ['[[Set Beta/Notes]]', 'Set Beta/Notes', 'keeps its depth'],
    ['[[set beta/notes]]', 'set beta/notes', 'is left as written, since it resolves'],
    ['[[Collection A/Set Alpha/Notes]]', 'Collection A/Set Alpha/Notes', 'keeps its full path'],
  ]) {
    await setDoc(cdp, PAGE_VIEW, '')
    await cdp.evaluate(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(pasted)}); ${PAGE_VIEW}.contentDOM.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })) })()`)
    await sleep(600)
    const doc = (await docOf(cdp, PAGE_VIEW)).trim()
    item(3, 3, 'A-7', `paste: ${pasted} ${name}`, spells(doc, page_), show(doc))
  }
  await setDoc(cdp, PAGE_VIEW, '')
  await escapeAll(cdp)

  await home(cdp)
  clip.save()
  for (const [rel, want, phase] of [[NOTES_A, '[[Collection A/Set Alpha/Notes|Notes]]', 3], [SOLO, '[[Solo]]', 3]]) {
    await cdp.evaluate(`(${rowOf(rel)}).scrollIntoView({ block: 'center' })`)
    const r = await menuChoose(cdp, pid, `${rowOf(rel)}.querySelector('.cell-title-text')`, 'Copy Link')
    const copied = (await ask(cdp, 'clipboard:read')).value
    item(3, phase, 'A-2', `page menu: Copy Link on ${rel} copies ${want}`, r.chosen && copied === want, show({ rows: r.rows, copied }))
  }
  const hashRow = hashIn && (await home(cdp), await settles(() => cdp.evaluate(`!!${rowOf(HASH_OUT)}`), 5000))
  item(3, 1, 'A-6', 'a Finder-made folder holding # is admitted, its page drawn as a row', hashRow, show({ inTree: hashIn }))
  if (hashRow) {
    await cdp.evaluate(`(${rowOf(HASH_OUT)}).scrollIntoView({ block: 'center' })`)
    await sleep(300)
    const r = await menuChoose(cdp, pid, `${rowOf(HASH_OUT)}.querySelector('.cell-title-text')`, 'Copy Link')
    const copied = (await ask(cdp, 'clipboard:read')).value
    item(3, 3, 'A-6', 'page menu: Copy Link on a shared title whose folder holds # falls back to the markdown form', r.chosen && copied === '[Hashed](Collection%20A/Set%20%23Out/Hashed)', show({ rows: r.rows, copied }))
  } else pending(3, 3, 'A-6', 'Copy Link on a page whose folder holds #', 'the Finder-made "Set #Out" page drew no row to open its menu on')
  clip.restore()

  const row2 = page(A_ALPHA, 'PL Row 2')
  const r = await menuChoose(cdp, pid, linkEl(cellOf(row2, LINK), 'Notes'), 'Rename')
  await sleep(500)
  const full = await cdp.evaluate(`(() => { const c = ${cellOf(row2, LINK)}; return c ? (${DRAWN})(c, '') : null })()`)
  item(3, 3, 'A-7', 'Show Full Link: a Link value [[Collection A/Set Alpha/Notes|Notes]] shown in full keeps its path and reads resolved', r.chosen && full?.states[0] === 'resolved', show({ rows: r.rows, full }))
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  pending(3, 3, 'A-3', 'the embed pick tree writes the written name (![[Collection A/Set Alpha/Notes]])', 'the pick tree is a nested native-free picker the drive has no path through yet; the writer is covered by the picker and Copy Link items')
}

// ── Group 4 — one search (Phase 4) ──────────────────────────────────────────

async function group4(cdp) {
  const SEARCH = await createAt(cdp, A_ALPHA, 'PL Search')
  await home(cdp)
  await openRow(cdp, SEARCH)
  for (const [typed, test, decision, name] of [
    ['Set Beta/No', (t) => /\bNotes\b/.test(t), 'D-1', 'a typed folder narrows the picker to Set Beta/Notes'],
    ['Alpha/Not', (t) => (t.match(/\bNotes\b/g) ?? []).length >= 2, 'D-4', 'a / reads as a word break, so Alpha/Not finds both Set Alpha Notes'],
    ['Sol', (t) => t.split('\n').find((l) => l.trim())?.trim() === 'Solo', 'D-4', 'a plain title query still ranks Solo first'],
  ]) {
    await setDoc(cdp, PAGE_VIEW, '')
    await typeLink(cdp, '[[', typed)
    const t = await acText(cdp)
    item(4, typed === 'Sol' ? 1 : 4, decision, `picker: [[${typed} — ${name}`, test(t), show(t))
    if (typed === 'Sol') {
      const split = await cdp.evaluate(`[...document.querySelectorAll('.mdpm-ac *')].some((e) => e.children.length === 0 && e.textContent === 'Sol')`)
      item(4, 4, 'D-6', 'picker: no typed-match emphasis splits a row (Sol drawn apart from lo)', !split)
    }
  }
  await setDoc(cdp, PAGE_VIEW, '')
  await typeLink(cdp, '[[', 'Notes')
  await pressKey(cdp, 'ArrowRight')
  await sleep(700)
  const slid = await docOf(cdp, PAGE_VIEW)
  await pressKey(cdp, 'ArrowLeft')
  await sleep(700)
  const relisted = await acText(cdp)
  item(4, 4, 'C-6', `picker: after sliding into one holder's headings (${slid.trim()}), Back relists that holder by its location`, /#/.test(slid) && (await acOpen(cdp)) && /\bNotes\b/.test(relisted) && ['Set Alpha', 'Set Beta', 'Collection B'].some((p) => relisted.includes(p)), show({ slid, relisted }))
  await escapeAll(cdp)

  await setDoc(cdp, PAGE_VIEW, '')
  await typeText(cdp, '/')
  await typeText(cdp, 'hr')
  await sleep(600)
  const block = await cdp.evaluate(`document.querySelector('.mdpm-block-menu')?.innerText ?? ''`)
  item(4, 4, 'D-2', 'block menu: /hr lists Horizontal Rule under its Insert section', block.includes('Horizontal Rule') && /insert/i.test(block), show(block))
  await pressKey(cdp, 'Escape')
  await setDoc(cdp, PAGE_VIEW, '')

  await home(cdp)
  const search = `document.querySelector('.detail-title-search')`
  if (await cdp.evaluate(`!!${search}`)) {
    await cdp.evaluate(`${search}.focus()`)
    await typeText(cdp, 'Set Beta')
    await sleep(900)
    const shown = await cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid)`)
    item(4, 4, 'D-1', "view search: typing Set Beta narrows Collection A's view to Set Beta's pages (its Notes in, Set Alpha's out)", shown.includes(ids[NOTES_BETA]) && !shown.includes(ids[NOTES_A]), show(shown.length))
    await cdp.evaluate(`(() => { const i = ${search}; i.select() })()`)
    await typeText(cdp, 'Notes')
    await sleep(900)
    const titled = await cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid)`)
    item(4, 1, 'D-4', 'view search: typing Notes still finds both Collection A Notes by title', titled.includes(ids[NOTES_A]) && titled.includes(ids[NOTES_BETA]), show(titled.length))
    await cdp.evaluate(`(() => { const i = ${search}; i.select() })()`)
    await pressKey(cdp, 'Backspace')
    await pressKey(cdp, 'Escape')
  } else pending(4, 4, 'D-1', "view search narrowing by folder", 'no .detail-title-search field was found on the Collection view')
  pending(4, 4, 'D-1', 'sidebar search and Trash search narrow by folder', 'the nav-view search lives in a NavView window and the Trash search in Settings; neither has a driven path in the harness yet')
}

// ── Group 5 — the click rule (Phase 5) ──────────────────────────────────────

async function group5(cdp, pid) {
  const CLICK = await createAt(cdp, A_ALPHA, 'PL Click')
  const CLICK_TEXT = await createAt(cdp, A_ALPHA, 'PL Click Text', { [props[TEXT]]: { kind: 'text', value: 'see [[Nowhere|x]]' } })
  const CLICK_LINK = await createAt(cdp, A_ALPHA, 'PL Click Link', { [props[LINK]]: { kind: 'link', value: '[[Notes|Shared]]' } })
  await sleep(600)
  setBody(CLICK, `${tagged([['k01', 'x [[Notes|Shared]] y'], ['k02', 'x [[Nowhere|Here]] y'], ['k03', 'x [[Set Beta/Notes|Beta]] y']])}\n| K |\n| --- |\n| k04 [[Nowhere\\|There]] |\n`)
  await sleep(1200)
  await home(cdp)
  await openRow(cdp, CLICK)
  const spanIn = async (tag, inner) => cdp.evaluate(`(() => { const d = ${PAGE_VIEW}.state.doc.toString(); const l = d.indexOf('${tag} '); const a = d.indexOf(${JSON.stringify(inner)}, l); return [a, a + ${inner.length}] })()`)
  for (const [tag, alias, title] of [['k01', 'Shared', 'Notes'], ['k02', 'Here', 'Nowhere']]) {
    await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
    await sleep(300)
    await mouseClick(cdp, linkEl(`${PAGE_VIEW}.contentDOM`, alias))
    const [a, b] = await spanIn(tag, `${title}|`)
    const s = await selOf(cdp, PAGE_VIEW)
    item(5, 5, 'C-1', `body: a click on ${tag}'s ${alias} (unresolved) seats the caret in its title ${title}`, s.from >= a && s.to <= b - 1, show({ sel: s, title: [a, b - 1] }))
    item(5, 5, 'C-1', `body: that click opens the picker on ${title}`, await acOpen(cdp), show(await acText(cdp)))
    const [aa, ab] = await spanIn(tag, `${alias}]]`)
    const box = await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const c = v.coordsAtPos(${aa} + 2); return { x: c.left, y: (c.top + c.bottom) / 2 } })()`)
    await mouseAt(cdp, box)
    const s2 = await selOf(cdp, PAGE_VIEW)
    item(5, 5, 'C-1', `body: a second click, the caret already inside ${tag}, lands where it presses (in ${alias})`, s2.from >= aa && s2.to <= ab - 2, show({ sel: s2, alias: [aa, ab - 2] }))
    await escapeAll(cdp)
  }
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  await sleep(300)
  await mouseClick(cdp, linkEl(`${PAGE_VIEW}.contentDOM`, 'Beta'))
  item(5, 1, 'C-2', 'body: a click on a resolved path link still follows it', await settles(async () => (await tabTitle(cdp)) === 'Notes', 3000))
  await home(cdp)
  await openRow(cdp, CLICK)
  const there = `[...document.querySelectorAll('.mdpm-tbl-cell-static')].find((c) => c.textContent.startsWith('k04 '))`
  await cdp.evaluate(`(${there}).scrollIntoView({ block: 'center' })`)
  await sleep(300)
  await mouseClick(cdp, linkEl(there, 'There'))
  const opened = await settles(() => cdp.evaluate(`!!document.querySelector('.mdpm-tbl-cell-editor .cm-content')`), 3000)
  const cellSel = opened ? await cdp.evaluate(`(() => { const v = ${CELL_VIEW}; const d = v.state.doc.toString(); const s = v.state.selection.main; const a = d.indexOf('Nowhere'); return { from: s.from, to: s.to, a, b: a + 7 } })()`) : null
  item(5, 5, 'C-1', 'resting table cell: a click on a phantom opens the cell with the caret in its title and the picker open',
    opened && cellSel.from >= cellSel.a && cellSel.to <= cellSel.b && (await acOpen(cdp)), show({ opened, cellSel }))
  await pressKey(cdp, 'Escape')
  await home(cdp)

  const textCell = cellOf(CLICK_TEXT, TEXT)
  await mouseAt(cdp, await boxOf(cdp, `(${textCell}).querySelector('.cell-text')`).then((b) => ({ x: b.left + 3, y: b.y })))
  const atEnd = await settles(() => cdp.evaluate(`(() => { const f = ${field}; if (!f) return false; const v = f.cmTile.root.view; const s = v.state.selection.main; return s.empty && s.head === v.state.doc.length })()`), 3000)
  item(5, 1, 'C-3', 'Text value: a first click opens its field with the caret at the end', atEnd)
  if (atEnd) {
    await mouseClick(cdp, linkEl(`document.querySelector('.value-field')`, 'x'))
    const s = await cdp.evaluate(`(() => { const v = (${field}).cmTile.root.view; const d = v.state.doc.toString(); const s = v.state.selection.main; const a = d.indexOf('Nowhere'); return { from: s.from, to: s.to, a, b: a + 7 } })()`)
    item(5, 5, 'C-3', 'Text value: a second click on the unresolved link in the open field seats the caret in Nowhere', s.from >= s.a && s.to <= s.b, show(s))
  }
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  await home(cdp)
  await mouseClick(cdp, linkEl(cellOf(CLICK_LINK, LINK), 'Shared'))
  const linkField = await settles(() => cdp.evaluate(`!!(${field})`), 3000)
  const lf = linkField ? await cdp.evaluate(`(() => { const v = (${field}).cmTile.root.view; const d = v.state.doc.toString(); const s = v.state.selection.main; const a = d.indexOf('Notes'); return { from: s.from, to: s.to, a, b: a + 5 } })()`) : null
  const rows = await acText(cdp)
  item(5, 5, 'C-1', 'Link value: a click on an ambiguous [[Notes|Shared]] opens its field in the title with the holders listed',
    linkField && lf.from >= lf.a && lf.to <= lf.b && (rows.match(/\bNotes\b/g) ?? []).length >= 2, show({ lf, rows }))
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  await home(cdp)
  const row3 = page(A_ALPHA, 'PL Row 3')
  const edit = await menuChoose(cdp, pid, linkEl(cellOf(row3, LINK), 'Notes'), 'Edit Title')
  const ef = await settles(() => cdp.evaluate(`!!(${field})`), 3000)
  const picked = ef ? await cdp.evaluate(`(() => { const v = (${field}).cmTile.root.view; const s = v.state.selection.main; return v.state.doc.sliceString(s.from, s.to) })()`) : null
  item(5, 5, 'C-4', 'Link value: Edit Title opens the field with the target selected', edit.chosen && picked === 'Set Beta/Notes', show({ rows: edit.rows, picked }))
  await escapeAll(cdp)
  await pressKey(cdp, 'Escape')
  pending(5, 5, 'C-1', "a click on a markdown tile's phantom opens the picker", 'markdown tiles are driven in Group 6 through their channels; a tile surface click has no harness path yet')
}

// ── Group 6 — the in-app re-spell (Phase 6) ─────────────────────────────────

async function group6(cdp) {
  const T = (title, parent = A_ALPHA) => page(parent, title)
  await must('Set G6', ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: 'Collection A', kind: 'set', name: 'Set G6' }))
  await must('Collection G6', ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Collection G6' }))
  await must('Set Inner', ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: 'Collection G6', kind: 'set', name: 'Set Inner' }))
  for (const [title, parent] of [['G6 Target'], ['G6 Twin'], ['G6 Twin', B_ALPHA], ['G6 Mover', 'Collection A/Set G6'], ['G6 Deep', 'Collection G6/Set Inner'], ['G6 Lone'], ['G6 Case']])
    await createAt(cdp, parent ?? A_ALPHA, title)
  const HOLDER = await createAt(cdp, A_ALPHA, 'PL G6 Holder', {
    [props[LINK]]: { kind: 'link', value: '[[Set Alpha/G6 Target]]' },
    [props[TEXT]]: { kind: 'text', value: 'see [[G6 Target]] and [[Set Alpha/G6 Target]]' },
  })
  await sleep(600)
  setBody(T('G6 Target'), '## Part\n')
  setBody(T('G6 Twin'), '## Part\n')
  setBody(T('G6 Twin', B_ALPHA), '## Part\n')
  setBody(HOLDER, tagged([
    ['g01', '[[G6 Target]]'], ['g02', '[[Set Alpha/G6 Target]]'], ['g03', '[[G6 Target|Kept Alias]]'], ['g04', '[[G6 Target#Part]]'],
    ['g05', '[[G6 Target.md]]'], ['g06', '[x](Set%20Alpha/G6%20Target)'], ['g07', '[[Collection A/Set Alpha/G6 Twin|G6 Twin]]'],
    ['g08', '[[Collection B/Set Alpha/G6 Twin|G6 Twin]]'], ['g09', '[[Collection A/Set Alpha/G6 Twin#Part]]'], ['g10', '[[Collection B/Set Alpha/G6 Twin#Part]]'],
    ['g11', '[[Collection A/Set G6/G6 Mover]]'], ['g12', '[[Set G6/G6 Mover]]'], ['g13', '[[Collection G6/Set Inner/G6 Deep]]'], ['g14', '[[Set Inner/G6 Deep]]'],
    ['g15', '[[G6 Lone]]'], ['g16', '[[Untitled]]'], ['g17', '[[G6 Case]]'], ['g18', '[[Set Alpha/G6 Target#Part|Part Alias]]'],
  ]))
  const SPACE = '.nexus/contexts/Topics/Topic One'
  const spaceSet = await ask(cdp, 'mutate', { op: 'setProperty', path: SPACE, propertyId: props[LINK], value: { kind: 'link', value: '[[Set Alpha/G6 Target]]' } })
  const spaceLink = () => JSON.parse(readRel(`${SPACE}/_space.json`))[LINK]
  const tile = await ask(cdp, 'tiles:create', { kind: 'homepage' }, { kind: 'append' })
  let tileId = tile.ok ? tile.value.id : null
  if (tileId) {
    const { hash } = (await ask(cdp, 'tiles:readMarkdown', { kind: 'homepage' }, tileId)).value
    const w = await ask(cdp, 'tiles:writeMarkdown', { kind: 'homepage' }, tileId, 't01 [[Set Alpha/G6 Target]]\nt02 [[G6 Target]]\n', hash)
    if (!w.ok) tileId = null
  }
  const tileLine = async (tag) => (await ask(cdp, 'tiles:readMarkdown', { kind: 'homepage' }, tileId)).value?.body.split('\n').find((l) => l.startsWith(`${tag} `))?.slice(4) ?? null
  await sleep(2000)

  // The heading rename runs first, while the twins still share a title.
  await must('renameHeading on Collection B twin', ask(cdp, 'mutate', { op: 'renameHeading', path: T('G6 Twin', B_ALPHA), heading: 'Part', to: 'Piece' }))
  setBody(T('G6 Twin', B_ALPHA), '## Piece\n')
  await settles(async () => lineOf(HOLDER, 'g10')?.includes('Piece'), 5000)
  item(6, 6, 'E-7', "heading rename: Part → Piece on Collection B's G6 Twin rewrites [[Collection B/…/G6 Twin#Part]]", spells(lineOf(HOLDER, 'g10'), 'Collection B/Set Alpha/G6 Twin', { heading: 'Piece' }), show(lineOf(HOLDER, 'g10')))
  item(6, 6, 'E-7', "heading rename: …and leaves Collection A's twin's [[…#Part]] alone", lineOf(HOLDER, 'g09') === '[[Collection A/Set Alpha/G6 Twin#Part]]', show(lineOf(HOLDER, 'g09')))

  await must('rename G6 Target', ask(cdp, 'mutate', { op: 'rename', path: T('G6 Target'), kind: 'page', newName: 'G6 Renamed' }))
  await settles(async () => lineOf(HOLDER, 'g01') === '[[G6 Renamed]]', 5000)
  await sleep(1200)
  const L = (tag) => lineOf(HOLDER, tag)
  item(6, 1, 'E-2', 'page rename: a bare [[G6 Target]] follows (today\'s cascade)', L('g01') === '[[G6 Renamed]]', show(L('g01')))
  item(6, 6, 'E-2', 'page rename: [[Set Alpha/G6 Target]] follows at its depth', spells(L('g02'), 'Set Alpha/G6 Renamed', { aliases: [undefined, 'G6 Renamed'] }), show(L('g02')))
  item(6, 1, 'E-2', 'page rename: an alias is carried ([[G6 Renamed|Kept Alias]])', L('g03') === '[[G6 Renamed|Kept Alias]]', show(L('g03')))
  item(6, 1, 'E-2', 'page rename: a heading is carried ([[G6 Renamed#Part]])', L('g04') === '[[G6 Renamed#Part]]', show(L('g04')))
  item(6, 6, 'A-5', 'page rename: a .md-written link follows, written without .md ([[G6 Renamed]])', L('g05') === '[[G6 Renamed]]', show(L('g05')))
  item(6, 6, 'E-2', 'page rename: a markdown path follows ([x](Set%20Alpha/G6%20Renamed))', L('g06') === '[x](Set%20Alpha/G6%20Renamed)', show(L('g06')))
  item(6, 6, 'E-2', 'page rename: a path with a heading and alias follows with both', spells(L('g18'), 'Set Alpha/G6 Renamed', { heading: 'Part', aliases: ['Part Alias'] }), show(L('g18')))
  item(6, 6, 'E-1', 'page rename: the Link value by path follows', spells(frontOf(HOLDER)[LINK], 'Set Alpha/G6 Renamed', { aliases: [undefined, 'G6 Renamed'] }), show(frontOf(HOLDER)[LINK]))
  item(6, 6, 'E-1', 'page rename: the Text value follows in both spellings', /\[\[G6 Renamed\]\]/.test(frontOf(HOLDER)[TEXT]) && /\[\[Set Alpha\/G6 Renamed(\|G6 Renamed)?\]\]/.test(frontOf(HOLDER)[TEXT]), show(frontOf(HOLDER)[TEXT]))
  if (spaceSet.ok) item(6, 6, 'E-1', 'page rename: the Space value by path follows', spells(spaceLink(), 'Set Alpha/G6 Renamed', { aliases: [undefined, 'G6 Renamed'] }), show(spaceLink()))
  else pending(6, 6, 'E-1', 'a Space value by path follows', `setProperty on ${SPACE} was refused: ${show(spaceSet)}`)
  if (tileId) {
    item(6, 1, 'E-1', 'page rename: a markdown tile\'s bare link follows', (await tileLine('t02')) === '[[G6 Renamed]]', show(await tileLine('t02')))
    item(6, 6, 'E-1', "page rename: a markdown tile's path link follows", spells(await tileLine('t01'), 'Set Alpha/G6 Renamed', { aliases: [undefined, 'G6 Renamed'] }), show(await tileLine('t01')))
  } else pending(6, 6, 'E-1', 'markdown tile links follow', `tiles:create or writeMarkdown was refused: ${show(tile)}`)

  await must('rename one twin', ask(cdp, 'mutate', { op: 'rename', path: T('G6 Twin'), kind: 'page', newName: 'G6 Twin A' }))
  await settles(async () => !L('g07')?.includes('Twin|'), 4000)
  item(6, 6, 'E-2', 'twin rename: [[Collection A/…/G6 Twin]] follows to G6 Twin A (today the rename skips a held title)', spells(L('g07'), 'Collection A/Set Alpha/G6 Twin A'), show(L('g07')))
  item(6, 6, 'E-2', "twin rename: the other twin's path link stays", L('g08') === '[[Collection B/Set Alpha/G6 Twin|G6 Twin]]', show(L('g08')))

  await must('move G6 Renamed', ask(cdp, 'mutate', { op: 'movePage', path: T('G6 Renamed'), newParentPath: A_BETA }))
  await settles(async () => L('g02')?.includes('Set Beta'), 4000)
  item(6, 6, 'E-1', 'page move: [[Set Alpha/G6 Renamed]] follows to Set Beta', spells(L('g02'), 'Set Beta/G6 Renamed', { aliases: [undefined, 'G6 Renamed'] }), show(L('g02')))
  item(6, 1, 'E-2', 'page move: a bare [[G6 Renamed]] stays as written', L('g01') === '[[G6 Renamed]]', show(L('g01')))

  const setOrder = JSON.parse(readRel('Collection B/_pagecollection.json')).set_order ?? []
  const moved = await ask(cdp, 'mutate', { op: 'moveSet', path: 'Collection A/Set G6', newParentPath: 'Collection B', order: setOrder })
  await settles(async () => L('g11')?.includes('Collection B'), 4000)
  item(6, 6, 'E-1', 'Set move: [[Collection A/Set G6/G6 Mover]] follows to Collection B', moved.ok && spells(L('g11'), 'Collection B/Set G6/G6 Mover'), show({ moved: moved.ok || moved, line: L('g11') }))
  item(6, 6, 'E-2', 'Set move: [[Set G6/G6 Mover]], its tail unchanged, stays as written', L('g12') === '[[Set G6/G6 Mover]]', show(L('g12')))

  await must('rename Collection G6', ask(cdp, 'mutate', { op: 'rename', path: 'Collection G6', kind: 'collection', newName: 'Collection G7' }))
  await settles(async () => L('g13')?.includes('G7'), 4000)
  item(6, 6, 'E-1', 'Collection rename: [[Collection G6/Set Inner/G6 Deep]] follows to Collection G7', spells(L('g13'), 'Collection G7/Set Inner/G6 Deep'), show(L('g13')))
  await must('rename Set Inner', ask(cdp, 'mutate', { op: 'rename', path: 'Collection G7/Set Inner', kind: 'set', newName: 'Set Outer' }))
  await settles(async () => L('g14')?.includes('Outer'), 4000)
  item(6, 6, 'E-1', 'Set rename: [[Set Inner/G6 Deep]] follows to Set Outer', spells(L('g14'), 'Set Outer/G6 Deep'), show(L('g14')))
  item(6, 6, 'E-1', 'Set rename: the full path follows too', spells(L('g13'), 'Collection G7/Set Outer/G6 Deep'), show(L('g13')))

  await createAt(cdp, B_ALPHA, 'G6 Lone')
  await settles(async () => L('g15') !== '[[G6 Lone]]', 4000)
  item(6, 6, 'E-3', "create onto a held title: the first holder's bare [[G6 Lone]] becomes its full path", spells(L('g15'), 'Collection A/Set Alpha/G6 Lone', { aliases: [undefined, 'G6 Lone'] }), show(L('g15')))
  await createAt(cdp, A_ALPHA, 'Untitled')
  await createAt(cdp, B_ALPHA, 'Untitled')
  await sleep(2000)
  item(6, 6, 'E-3', 'Untitled is no arrival: a second Untitled re-spells nothing', L('g16') === '[[Untitled]]', show(L('g16')))
  await must('case-only rename', ask(cdp, 'mutate', { op: 'rename', path: T('G6 Case'), kind: 'page', newName: 'g6 case' }))
  await settles(async () => L('g17') === '[[g6 case]]', 4000)
  item(6, 1, 'E-2', 'case-only rename: [[G6 Case]] follows into [[g6 case]]', L('g17') === '[[g6 case]]', show(L('g17')))
  if (tileId) await ask(cdp, 'tiles:removeTile', { kind: 'homepage' }, tileId)
}

// ── Group 7 — the outside-move lane (Phase 7) ───────────────────────────────

let second = null
async function group7(cdp) {
  await must('Set G7', ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: 'Collection A', kind: 'set', name: 'Set G7' }))
  for (const [title, parent] of [['G7 Target'], ['G7 Folder Page', 'Collection B/Set Beta'], ['G7 Copy', 'Collection A/Set G7'], ['G7 Lone'], ['G7 Closed']])
    await createAt(cdp, parent ?? A_ALPHA, title)
  const HOLDER = await createAt(cdp, A_ALPHA, 'PL G7 Holder')
  await sleep(600)
  setBody(HOLDER, tagged([
    ['o01', '[[G7 Target]]'], ['o02', '[[Set Alpha/G7 Target]]'], ['o03', '[[Collection B/Set Beta/G7 Folder Page]]'],
    ['o04', '[[G7 Copy]]'], ['o05', '[[G7 Lone]]'], ['o06', '[[G7 Closed]]'],
  ]))
  await sleep(2500)
  const L = (tag) => lineOf(HOLDER, tag)

  renameSync(abs(page(A_ALPHA, 'G7 Target')), abs(page(A_ALPHA, 'G7 Out')))
  await settles(async () => L('o01') !== '[[G7 Target]]', 8000)
  item(7, 7, 'E-4', 'Finder rename: [[G7 Target]] follows to [[G7 Out]]', L('o01') === '[[G7 Out]]', show(L('o01')))
  item(7, 7, 'E-4', 'Finder rename: [[Set Alpha/G7 Target]] follows at its depth', spells(L('o02'), 'Set Alpha/G7 Out', { aliases: [undefined, 'G7 Out'] }), show(L('o02')))
  const bare = L('o01')
  renameSync(abs(page(A_ALPHA, 'G7 Out')), abs(page(A_BETA, 'G7 Out')))
  await settles(async () => L('o02')?.includes('Set Beta'), 8000)
  item(7, 7, 'E-4', 'Finder move: [[Set Alpha/G7 Out]] follows to Set Beta', spells(L('o02'), 'Set Beta/G7 Out', { aliases: [undefined, 'G7 Out'] }), show(L('o02')))
  item(7, 1, 'E-2', 'Finder move: the bare link, its tail unchanged, is left as the move found it', L('o01') === bare, show({ before: bare, after: L('o01') }))
  renameSync(abs('Collection B/Set Beta'), abs('Collection B/Set Gamma'))
  await settles(async () => L('o03')?.includes('Gamma'), 8000)
  item(7, 7, 'E-4', 'folder renamed outside: [[Collection B/Set Beta/G7 Folder Page]] follows to Set Gamma', spells(L('o03'), 'Collection B/Set Gamma/G7 Folder Page'), show(L('o03')))
  cpSync(abs('Collection A/Set G7'), abs('Collection A/Set G7 Copy'), { recursive: true })
  await settles(async () => L('o04') !== '[[G7 Copy]]', 8000)
  item(7, 7, 'E-3', "copied folder: the collision re-spells [[G7 Copy]] to the original's full path, never the copy's", spells(L('o04'), 'Collection A/Set G7/G7 Copy', { aliases: [undefined, 'G7 Copy'] }), show(L('o04')))
  writeOutside(page(B_ALPHA, 'G7 Lone'))
  await settles(async () => L('o05') !== '[[G7 Lone]]', 8000)
  item(7, 7, 'E-3', "a twin made outside: [[G7 Lone]] becomes the first holder's full path", spells(L('o05'), 'Collection A/Set Alpha/G7 Lone', { aliases: [undefined, 'G7 Lone'] }), show(L('o05')))
  return HOLDER
}

/** Quits the app, renames a page while it's closed, and reopens it on the same userData, answering the new connection. */
async function closedMove(cdp, pid, HOLDER) {
  const ud = readdirSync(tmpdir()).filter((n) => n.startsWith('pommora-drive-')).map((n) => join(tmpdir(), n, 'ud')).filter(existsSync)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  cdp.close()
  process.kill(pid, 'SIGTERM')
  await until('the app to quit', async () => { try { process.kill(pid, 0); return false } catch { return true } }, 15000)
  await sleep(1000)
  renameSync(abs(page(A_ALPHA, 'G7 Closed')), abs(page(A_ALPHA, 'G7 Closed Moved')))
  const env = { ...process.env, POMMORA_USERDATA: ud, POMMORA_DEBUG_PORT: String(PORT) }
  delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL
  second = spawn(join(REPO, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), ['.'], { cwd: join(REPO, 'Desktop'), env, stdio: 'ignore' })
  const next = (await attach(PORT)).cdp
  await until('the sidebar', () => next.evaluate(`!!document.querySelector('.row span')`), 30000)
  await settles(async () => lineOf(HOLDER, 'o06') !== '[[G7 Closed]]', 12000)
  item(7, 7, 'E-4', 'closed-app rename: [[G7 Closed]] follows to [[G7 Closed Moved]] on the next open', lineOf(HOLDER, 'o06') === '[[G7 Closed Moved]]', show(lineOf(HOLDER, 'o06')))
  return { cdp: next, pid: second.pid }
}

// ── Group 8 — the Trash (Phase 8) ───────────────────────────────────────────

async function group8(cdp) {
  await must('Set G8', ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: 'Collection A', kind: 'set', name: 'Set G8' }))
  for (const [title, parent] of [['G8 Twin'], ['G8 Twin', B_ALPHA], ['G8 Solo'], ['G8 Off'], ['G8 Returner'], ['G8 Mover'], ['G8 Orphan', 'Collection A/Set G8']])
    await createAt(cdp, parent ?? A_ALPHA, title)
  const link = (value) => ({ [props[LINK]]: { kind: 'link', value } })
  const H_TWIN = await createAt(cdp, A_ALPHA, 'PL G8 Twin Holder', link('[[Collection A/Set Alpha/G8 Twin|G8 Twin]]'))
  const H_OTHER = await createAt(cdp, A_ALPHA, 'PL G8 Other Holder', link('[[Collection B/Set Alpha/G8 Twin|G8 Twin]]'))
  const H_PATH = await createAt(cdp, A_ALPHA, 'PL G8 Path Holder', link('[[Collection A/Set Alpha/G8 Solo|G8 Solo]]'))
  const H_BARE = await createAt(cdp, A_ALPHA, 'PL G8 Bare Holder', link('[[G8 Solo]]'))
  const H_OFF = await createAt(cdp, A_ALPHA, 'PL G8 Off Holder', link('[[G8 Off]]'))
  const H_ORPHAN = await createAt(cdp, A_ALPHA, 'PL G8 Orphan Holder')
  await sleep(600)
  setBody(H_TWIN, 'b01 [[Collection A/Set Alpha/G8 Twin|G8 Twin]]\n')
  setBody(page(A_ALPHA, 'G8 Returner'), 'r01 [[Set Alpha/G8 Mover]]\nr02 [[G8 Mover]]\n')
  setBody(H_ORPHAN, 'p01 [[Set G8/G8 Orphan]]\n')
  await sleep(2000)
  const V = (rel) => frontOf(rel)[LINK]
  const del = async (rel) => (await must(`delete ${rel}`, ask(cdp, 'mutate', { op: 'delete', path: rel, kind: 'page' }))).trashed.bundlePath

  const twinBytes = bodyOf(H_TWIN)
  const twinBundle = await del(page(A_ALPHA, 'G8 Twin'))
  await sleep(1500)
  const stripped = V(H_TWIN) === undefined
  item(8, 6, 'F-4', "delete one twin: the Link value naming it by path is stripped", stripped, show(V(H_TWIN)))
  item(8, 1, 'F-3', "delete one twin: the value naming the other twin is kept", V(H_OTHER) === '[[Collection B/Set Alpha/G8 Twin|G8 Twin]]', show(V(H_OTHER)))
  item(8, 1, 'F-3', "delete one twin: another page's body is never touched", bodyOf(H_TWIN) === twinBytes, show(bodyOf(H_TWIN)))
  await must('restore the twin', ask(cdp, 'mutate', { op: 'restore', bundlePath: twinBundle }))
  await settles(async () => V(H_TWIN) !== undefined, 4000)
  item(8, 8, 'F-6', 'restore: the stripped value comes back by identity ([[Collection A/Set Alpha/G8 Twin|G8 Twin]])', stripped && spells(V(H_TWIN), 'Collection A/Set Alpha/G8 Twin'), show({ stripped, value: V(H_TWIN) }))

  const soloId = ids[page(A_ALPHA, 'G8 Solo')]
  const soloBundle = await del(page(A_ALPHA, 'G8 Solo'))
  await sleep(1500)
  const pathStripped = V(H_PATH) === undefined
  item(8, 6, 'F-4', 'delete: a Link value naming the page by its full path is stripped', pathStripped, show(V(H_PATH)))
  item(8, 1, 'F-3', 'delete: a Link value naming it bare is stripped (today)', V(H_BARE) === undefined, show(V(H_BARE)))
  await createAt(cdp, A_ALPHA, 'G8 Solo')
  await sleep(800)
  await must('restore onto the held name', ask(cdp, 'mutate', { op: 'restore', bundlePath: soloBundle }))
  await sleep(2500)
  const landed = readdirSync(abs(A_ALPHA)).filter((n) => n.endsWith('.md')).find((n) => readRel(`${A_ALPHA}/${n}`).includes(`ID: ${soloId}`))
  const landedTitle = landed?.replace(/\.md$/, '')
  const names = landedTitle ? [landedTitle, `Collection A/Set Alpha/${landedTitle}`, `Set Alpha/${landedTitle}`] : []
  item(8, 8, 'F-6', `restore onto a collision: the path value refills naming the restored page (${landedTitle})`, pathStripped && names.some((n) => spells(V(H_PATH), n)), show({ pathStripped, value: V(H_PATH), landed }))
  item(8, 8, 'F-6', 'restore onto a collision: the bare value refills naming the restored page, never the newcomer', names.some((n) => spells(V(H_BARE), n)) && !spells(V(H_BARE), 'G8 Solo'), show({ value: V(H_BARE), landed }))

  await must('Restore Links On Deletion off', ask(cdp, 'personalization:set', 'restoreLinksOnDeletion', false))
  const offBundle = await del(page(A_ALPHA, 'G8 Off'))
  await sleep(1200)
  await must('restore G8 Off', ask(cdp, 'mutate', { op: 'restore', bundlePath: offBundle }))
  await sleep(1500)
  item(8, 1, 'F-4', 'Restore Links On Deletion off: a restore refills nothing', V(H_OFF) === undefined, show(V(H_OFF)))
  await must('Restore Links On Deletion on', ask(cdp, 'personalization:set', 'restoreLinksOnDeletion', true))

  const returner = page(A_ALPHA, 'G8 Returner')
  const retBundle = await del(returner)
  await sleep(1000)
  await must('rename G8 Mover', ask(cdp, 'mutate', { op: 'rename', path: page(A_ALPHA, 'G8 Mover'), kind: 'page', newName: 'G8 Moved' }))
  await sleep(1000)
  await must('restore G8 Returner', ask(cdp, 'mutate', { op: 'restore', bundlePath: retBundle }))
  await settles(async () => exists(returner) && lineOf(returner, 'r02') === '[[G8 Moved]]', 5000)
  item(8, 8, 'F-5', "a returning page's own bare link follows a rename made while it sat in the Trash", exists(returner) && lineOf(returner, 'r02') === '[[G8 Moved]]', show(exists(returner) && bodyOf(returner)))
  item(8, 8, 'F-5', "a returning page's own path link follows too", exists(returner) && spells(lineOf(returner, 'r01'), 'Set Alpha/G8 Moved', { aliases: [undefined, 'G8 Moved'] }), show(exists(returner) && lineOf(returner, 'r01')))

  const orphanBundle = await del(page('Collection A/Set G8', 'G8 Orphan'))
  await must('delete Set G8', ask(cdp, 'mutate', { op: 'delete', path: 'Collection A/Set G8', kind: 'set' }))
  await sleep(1200)
  const collectionA = JSON.parse(readRel('Collection A/_pagecollection.json')).id
  const back = await ask(cdp, 'mutate', { op: 'restore', bundlePath: orphanBundle, destination: { kind: 'container', id: collectionA } })
  await settles(async () => lineOf(H_ORPHAN, 'p01') !== '[[Set G8/G8 Orphan]]', 5000)
  item(8, 8, 'F-2', 'restored after its Set was deleted: [[Set G8/G8 Orphan]] follows it to Collection A as a move', back.ok && spells(lineOf(H_ORPHAN, 'p01'), 'Collection A/G8 Orphan', { aliases: [undefined, 'G8 Orphan'] }), show({ back: back.ok || back, line: lineOf(H_ORPHAN, 'p01') }))
}

// ── The scale pass ──────────────────────────────────────────────────────────

const BENCH = join(homedir(), 'Benchmark-Medium')
const BENCH_LINK = 'PL Bench Link'
const BENCH_VIEW = { id: 'view_01KZPATHLINKSBENCH000TABLE', name: 'PL Bench' }
const BENCH_PLAIN_VIEW = { id: 'view_01KZPATHLINKSBENCH000PLAIN', name: 'PL Bench Plain' }

const idOf = (path) => (existsSync(path) ? /ID: (\S+)/.exec(readFileSync(path, 'utf8'))?.[1] : null) ?? mintPageId()
/** Seeds the benchmark Nexus on disk, before it opens: a Twin in every Set (the heaviest shared title), a page holding fifty path links beside two controls, fifty bare links to unique titles and the same prose with no links, and a path Link value on every page of the first Collection. */
function seedBench() {
  const collections = readdirSync(BENCH).filter((n) => n.startsWith('Collection ')).sort()
  const first = collections[0]
  const twins = []
  for (const c of collections)
    for (const s of readdirSync(join(BENCH, c)).filter((n) => n.startsWith('Set ')).sort()) {
      const rel = `${c}/${s}/Twin.md`
      if (!existsSync(join(BENCH, rel))) writeFileSync(join(BENCH, rel), `---\nID: ${mintPageId()}\n---\n## Part\n`)
      twins.push(rel.replace(/\.md$/, ''))
    }
  const fifty = twins.slice(0, 50).map((t, i) => (i % 2 ? `[[${t}]]` : `[[${t.split('/').slice(1).join('/')}#Part]]`))
  const titles = readdirSync(join(BENCH, first, 'Set 2')).filter((n) => n.endsWith('.md') && n !== 'Twin.md').slice(0, 50).map((n) => n.replace(/\.md$/, ''))
  const pages = {}
  for (const [title, lines] of [['PL Fifty', fifty], ['PL Bare', titles.map((t) => `[[${t}]]`)], ['PL Plain', fifty.map((l) => l.replace(/[[\]#]/g, ''))]]) {
    const rel = `${first}/Set 1/${title}.md`
    const id = idOf(join(BENCH, rel))
    writeFileSync(join(BENCH, rel), `---\nID: ${id}\n---\n${lines.map((l, i) => `Line ${i + 1} reads ${l} in its prose.`).join('\n')}\n`)
    pages[title] = id
  }
  let valued = 0
  const walk = (dir) => {
    for (const n of readdirSync(join(BENCH, dir))) {
      const rel = `${dir}/${n}`
      if (statSync(join(BENCH, rel)).isDirectory()) walk(rel)
      else if (n.endsWith('.md') && !['Twin.md', 'PL Fifty.md', 'PL Bare.md', 'PL Plain.md'].includes(n)) {
        const text = readFileSync(join(BENCH, rel), 'utf8')
        if (!text.includes(`${BENCH_LINK}:`)) writeFileSync(join(BENCH, rel), text.replace(/^---\n/, `---\n${BENCH_LINK}: "[[${twins[valued % twins.length]}|Twin]]"\n`))
        valued++
      }
    }
  }
  walk(first)
  return { first, twins: twins.length, pages, valued }
}

/** Opens a page through the view's search and times its decoration build: each dispatch builds synchronously, the caret walking in and out of every link (or the same offsets on a page without links), then one-character edits, then a native ArrowDown. */
async function timePage(cdp, title, id) {
  const search = `document.querySelector('.detail-title-search')`
  await cdp.evaluate(`(() => { const i = ${search}; i.focus(); i.select() })()`)
  await typeText(cdp, title)
  await until(`the ${title} row`, () => cdp.evaluate(`!!document.querySelector('.data-row[data-rid="${id}"]')`), 10000)
  await mouseClick(cdp, `document.querySelector('.data-row[data-rid="${id}"] .cell-title-text')`)
  await until(`the ${title} tab`, async () => (await tabTitle(cdp)) === title, 10000)
  await sleep(1500)
  const states = await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; const c = (k) => v.contentDOM.querySelectorAll('.md-connection-' + k).length; return { resolved: c('resolved'), ambiguous: c('ambiguous'), phantom: c('phantom') } })()`)
  const timed = await cdp.evaluate(`(() => {
    const v = ${PAGE_VIEW}
    v.focus()
    const d = v.state.doc.toString()
    const stops = []
    for (let i = d.indexOf(' reads '); i >= 0; i = d.indexOf(' reads ', i + 1)) stops.push(i + 7)
    const times = []
    for (let r = 0; r < 4; r++)
      for (const at of stops)
        for (const pos of [at + 3, at - 2]) {
          const t = performance.now()
          v.dispatch({ selection: { anchor: pos } })
          times.push(performance.now() - t)
        }
    const edit = []
    for (let r = 0; r < 20; r++) {
      const at = stops[r % stops.length] - 2
      let t = performance.now()
      v.dispatch({ changes: { from: at, insert: 'x' }, selection: { anchor: at + 1 } })
      edit.push(performance.now() - t)
      t = performance.now()
      v.dispatch({ changes: { from: at, to: at + 1 }, selection: { anchor: at } })
      edit.push(performance.now() - t)
    }
    v.dispatch({ selection: { anchor: stops[10] + 3 } })
    const stat = (xs) => { const s = [...xs].sort((a, b) => a - b); const q = (p) => Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100; return { n: s.length, median: q(0.5), p95: q(0.95), max: q(1), over16: s.filter((x) => x > 16).length } }
    return { caret: stat(times), edit: stat(edit) }
  })()`)
  console.log(`scale: ${title} draws ${show(states)}`)
  console.log(`scale: ${title} caret moves (decoration build per dispatch, ms) ${show(timed.caret)}`)
  console.log(`scale: ${title} one-character edits (ms) ${show(timed.edit)}`)
  for (let i = 0; i < 5; i++) {
    const m = await measure(cdp, `a native ArrowDown on ${title}`, () => pressKey(cdp, i % 2 ? 'ArrowUp' : 'ArrowDown'), { reflect: 'true' })
    console.log(`scale: ${title} ArrowDown/Up ${show({ domMs: m.domMs, paintMs: m.paintMs, longtasks: m.longtasks, scriptMs: m.ScriptDuration, taskMs: m.TaskDuration })}`)
  }
  await shot(cdp, `scale-${title.replace(/ /g, '-')}`)
}

async function scale(cdp) {
  const seeded = seedBench()
  console.log(`scale: ${seeded.twins} Twins, ${seeded.valued} Link values in ${seeded.first}`)
  await must('open the benchmark', ask(cdp, 'nexus:openPath', BENCH))
  await until('the benchmark open', async () => (await nexusState(cdp))?.tree?.nexus.rootPath === BENCH, 60000)
  // The raw channel switches the host's Nexus; the window reads it again on a reload, as it does at launch.
  await cdp.send('Page.reload')
  await until('the sidebar', () => cdp.evaluate(`[...document.querySelectorAll('.row span')].some((e) => e.textContent.trim() === ${JSON.stringify(seeded.first)})`), 60000)
  await sleep(8000)
  const added = await ask(cdp, 'schema:add', seeded.first, { id: '', name: BENCH_LINK, type: 'link' })
  if (!added.ok) throw new Error(`schema:add refused ${BENCH_LINK}: ${show(added)}`)
  for (const [v, order] of [[BENCH_VIEW, ['_title', added.value.id]], [BENCH_PLAIN_VIEW, ['_title']]])
    await must(v.name, ask(cdp, 'views:save', seeded.first, 'collection', { id: v.id, name: v.name, type: 'table', property_order: order, hidden_properties: added.value.id === order.at(-1) ? [] : [added.value.id] }, {}))
  await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(seeded.first)})`)
  await sleep(1500)
  const show_ = (viewId) => ask(cdp, 'mutate', { op: 'setActiveView', path: seeded.first, kind: 'collection', viewId })
  for (let i = 0; i < 4; i++) {
    await must('the plain view', show_(BENCH_PLAIN_VIEW.id))
    await until('the plain view', () => cdp.evaluate(`document.querySelectorAll('.data-row[data-rid]').length > 5 && !document.querySelector('.data-row[data-rid] .md-connection-resolved')`), 10000)
    await sleep(1000)
    const m = await measure(cdp, 'a Link column of path links opens in a view', () => show_(BENCH_VIEW.id),
      { reflect: `document.querySelectorAll('.data-row[data-rid] .md-connection-resolved').length >= 10`, window: 8000 })
    const drawn = await cdp.evaluate(`document.querySelectorAll('.data-row[data-rid] .md-connection-resolved').length`)
    console.log(`scale: Link column open ${show({ domMs: m.domMs, paintMs: m.paintMs, longtasks: m.longtasks, scriptMs: m.ScriptDuration, taskMs: m.TaskDuration, resolvedCells: drawn })}`)
  }
  await shot(cdp, 'scale-link-column')
  await timePage(cdp, 'PL Fifty', seeded.pages['PL Fifty'])
  for (const control of ['PL Bare', 'PL Plain']) {
    await click(cdp, `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(seeded.first)})`)
    await sleep(1500)
    await timePage(cdp, control, seeded.pages[control])
  }
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  const app = await launch(PORT, 'path-links-shots')
  cdp = app.cdp
  let pid = app.pid
  if (GROUPS.size) await seed(cdp)
  if (GROUPS.has(1)) await group1(cdp, pid)
  if (GROUPS.has(2)) await group2(cdp)
  if (GROUPS.has(3)) await group3(cdp, pid)
  if (GROUPS.has(4)) await group4(cdp)
  if (GROUPS.has(5)) await group5(cdp, pid)
  if (GROUPS.has(6)) await group6(cdp)
  if (GROUPS.has(8)) await group8(cdp)
  // The outside lane runs last: its closed-app item quits and reopens the app.
  if (GROUPS.has(7)) {
    const holder = await group7(cdp)
    ;({ cdp, pid } = await closedMove(cdp, pid, holder))
  }
  if (SCALE) await scale(cdp)
  cdp.close()
} catch (e) {
  item(0, 1, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) {
    await shot(cdp, 'failure').catch(() => {})
    console.log(await cdp.evaluate(`JSON.stringify({ tab: document.querySelector('[role=tab][aria-selected=true]')?.title, text: document.body.innerText.slice(0, 400) })`).catch((err) => String(err)))
  }
} finally {
  if (second) second.kill('SIGKILL')
  await restore()
}
const count = (f) => ledger.filter(f).length
console.log('\ngroup  pass  fail  ahead  await  skip')
for (const g of [0, ...ALL].filter((g) => g === 0 || GROUPS.has(g))) {
  const of = (m) => count((r) => r.group === g && r.mark === m)
  console.log(`${String(g).padStart(5)} ${String(of('PASS')).padStart(5)} ${String(of('FAIL')).padStart(5)} ${String(of('AHEAD')).padStart(6)} ${String(of('AWAIT')).padStart(6)} ${String(of('SKIP')).padStart(5)}`)
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} held (an item awaiting a later phase than ${LANDED} holds by definition)`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
