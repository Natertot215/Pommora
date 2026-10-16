import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  activate, against, ask, boxOf, check, chooseNative, click, closePanel, createPage, doubleClick, drag, escapeAll, field, frontmatter,
  launch, measure, metrics, mouseAt, mouseClick, must, nativeMenu, NEXUS, openCollection, openPage, openPane, openPanel,
  PAGE_VIEW, pageFile, pageIds, pagePath, PANE, PANE_VIEW, portalOpen, pressKey, printMetrics, read, refusal, restore, results,
  row, sel, SETTINGS_BUTTON, settles, shot, sleep, sweep, typeText, until, writeBody, writeMetrics,
} from '../drive-harness.mjs'

const PORT = 9373
const PERF = 6
const args = process.argv.slice(2)
const at = args.indexOf('--against')
const AGAINST = at >= 0 ? args[at + 1] : null
const GROUPS = new Set((at >= 0 ? [...args.slice(0, at), ...args.slice(at + 2)] : args).map(Number))
if (GROUPS.size === 0 || [...GROUPS].some((g) => ![1, 2, 3, 4, 5, PERF].includes(g)) || (at >= 0 && !AGAINST)) {
  console.error('usage: node live-drive.mjs <group…> [--against <metrics.json>]   (groups 1–6)')
  process.exit(2)
}
// A baseline worktree predates the Aliases row, so the perf group skips what it lacks rather than failing on it.
const BASELINE = !!process.env.POMMORA_DRIVE_REPO
const N = 20

// ── The Nexus on disk ───────────────────────────────────────────────────────

const META_DIR = '.nexus/metadata'
const REGISTRY = '.nexus/properties.json'
const SETTINGS = '.nexus/settings.json'
const SIDECAR = 'Collection A/_pagecollection.json'
const shards = () => readdirSync(join(NEXUS, META_DIR)).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(read(`${META_DIR}/${n}`)))
const entryOf = (title) => shards().map((s) => s.pages?.[pageIds[title]]).find(Boolean)
const aliasesOf = (title) => entryOf(title)?.aliases ?? []
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fileName = (f) => (f === META_DIR ? 'the metadata shard' : f.split('/').pop())
const optionValues = () => (Object.values(JSON.parse(read(REGISTRY)).defs).find((d) => d.name === CHOICE).select_options ?? []).map((o) => o.value)
const excluded = () => JSON.parse(read(SETTINGS)).excluded_folders ?? []
const driveView = () => JSON.parse(read(SIDECAR)).views.find((v) => v.id === VIEW.id)

const editAliases = (cdp, title, edit) => ask(cdp, 'mutate', { op: 'editAliases', path: pagePath(title), edit })
async function resetAliases(cdp, title, list) {
  for (const alias of aliasesOf(title)) await must(`forget ${alias}`, editAliases(cdp, title, { op: 'forget', alias }))
  for (const alias of list) await must(`add ${alias}`, editAliases(cdp, title, { op: 'add', alias }))
  if (!same(aliasesOf(title), list)) throw new Error(`${title}'s aliases reset to ${JSON.stringify(aliasesOf(title))}, not ${JSON.stringify(list)}`)
  await sleep(400)
}

// One gesture, measured: `writes` maps each watched file to how many contents it must pass through, or a [least, most] bound.
async function step(cdp, name, act, { reflect, writes = {}, window } = {}) {
  const m = await measure(cdp, name, act, { reflect, files: Object.keys(writes), window })
  for (const [file, n] of Object.entries(writes)) {
    const [lo, hi = lo] = [n].flat()
    check(`${name} — ${[...new Set([lo, hi])].join('–')} write${hi === 1 ? '' : 's'} to ${fileName(file)}`, m.writes[file] >= lo && m.writes[file] <= hi, `saw ${m.writes[file]}`)
  }
  return m
}
const aliasWrites = (n, title = TARGET) => ({ [META_DIR]: n, [pagePath(title)]: 0 })

// ── The seed ────────────────────────────────────────────────────────────────

const TARGET = 'Drive Target'
const BARE = 'Drive Bare'
const SOURCE = 'Drive Source'
const HOST = 'Drive Host'
const GRID = 'Drive Grid'
const RACE = 'Drive Race'
const LINK = 'Drive Link'
const NOTES = 'Drive Notes'
const CHOICE = 'Drive Choice'
const COLUMNS = [LINK, NOTES, CHOICE]
const VIEW = { id: 'view_01KZALIASDRIVE0000000TABLE', name: 'Drive Alias Table' }
const ids = {}

async function seed(cdp) {
  for (const [name, type] of [[LINK, 'link'], [NOTES, 'text'], [CHOICE, 'select']]) {
    const r = await ask(cdp, 'schema:add', 'Collection A', { id: '', name, type })
    check(`seed: ${name} (${type}) is added`, r.ok, JSON.stringify(r))
    if (!r.ok) throw new Error(`The seed stops: schema:add refused ${name} of type ${type}.`)
    ids[name] = r.value.id
  }
  for (const title of ['Alpha', 'Beta']) await must(`${CHOICE} ${title}`, ask(cdp, 'property:editOption', ids[CHOICE], { op: 'add', groupId: 'select', title }))
  await must('the Drive table', ask(cdp, 'views:save', 'Collection A', 'collection', { id: VIEW.id, name: VIEW.name, type: 'table', property_order: ['_title', ...COLUMNS.map((c) => ids[c])], hidden_properties: [] }, {}))
  for (const title of [TARGET, BARE, SOURCE, GRID, RACE]) await createPage(cdp, title)
  await createPage(cdp, HOST, { [ids[NOTES]]: { kind: 'text', value: 'host notes' } })
  await sleep(800)
  writeBody(TARGET, '## Setup\n\nThe target.\n')
  writeBody(GRID, '| A |\n| --- |\n| x |\n')
  check('seed: every Drive page is on disk, and Drive Choice holds its seeded option, Alpha, and Beta', Object.keys(pageIds).every((t) => pageFile(t)) && same(optionValues(), ['Option 1', 'Alpha', 'Beta']), JSON.stringify(optionValues()))
  await home(cdp)
}

// ── Surfaces ────────────────────────────────────────────────────────────────

async function home(cdp) {
  await escapeAll(cdp)
  await openCollection(cdp)
  await must('show the Drive table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: VIEW.id }))
  await until('the Drive table', () => cdp.evaluate(`!!${row(SOURCE)}`))
  await sleep(600)
}
const cell = (title, prop) => `${row(title)}.querySelectorAll('.data-cell')[${COLUMNS.indexOf(prop) + 1}]`
const reveal = (cdp, expr) => cdp.evaluate(`(${expr}).scrollIntoView({ block: 'center' })`).then(() => sleep(400))
const tag = (cdp, expr, name) => cdp.evaluate(`(${expr}).dataset.drive = ${JSON.stringify(name)}`)
const tagged = (name) => `document.querySelector('[data-drive=${JSON.stringify(name)}]')`
const selectAll = (cdp) => cdp.evaluate(`document.activeElement.select()`)
const menuRows = (pid) => nativeMenu(pid).filter((n) => n && n !== 'missing value')
// A row about to go: any change to its own attributes before it leaves the DOM is a collapse.
const watchLeaving = (cdp, expr) =>
  cdp.evaluate(`(() => { const r = ${expr}; r.dataset.drive = 'leaving'; window.__changed = 0; new MutationObserver((ms) => { window.__changed += ms.filter((m) => m.attributeName !== 'data-drive').length }).observe(r, { attributes: true }) })()`)
const leftAtOnce = (cdp) => cdp.evaluate(`({ gone: !${tagged('leaving')}, changed: window.__changed })`)
// A point on `css`'s own surface, under nothing that takes a press.
const blankOf = (cdp, css) =>
  cdp.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(css)}); const b = e.getBoundingClientRect(); const x = b.left + b.width / 2; for (let y = b.top + 4; y < b.bottom; y += 8) { const hit = document.elementFromPoint(x, y); const taker = hit?.closest('button, a, input, [role], [tabindex]'); if (hit && e.contains(hit) && (!taker || taker === e || !e.contains(taker))) return { x, y } } throw new Error('no blank point on ' + ${JSON.stringify(css)}) })()`)

// An alias list's scope: the Manage pane, or the body picker that a caret pane holds.
const MANAGE = `document.querySelector('[data-picker-portal] [aria-label="Add alias"]')?.closest('[data-picker-portal]')`
const PICKER = `document.querySelector('.mdpm-ac')`
// Innermost reveals only, so a presence wrapper around a list never counts as a row.
const rows = (S) => `[...((${S})?.querySelectorAll('[data-reveal]:not(:has([data-reveal]))') ?? [])]`
const rowOf = (S, name) => `${rows(S)}.find((r) => !r.querySelector('input') && r.textContent.trim() === ${JSON.stringify(name)})`
// The innermost element reading the whole name: the resting label, which owns the double-click, even where a filter splits its text.
const nameOf = (S, name) => `[...(${rowOf(S, name)}).querySelectorAll('*')].filter((e) => e.textContent.trim() === ${JSON.stringify(name)}).at(-1)`
const xOf = (S, name) => `(${rowOf(S, name)}).querySelector('[aria-label="Delete alias"]')`
const inputOf = (S) => `(${S})?.querySelector('input[aria-label="Alias"]')`
const addOf = (S) => `(${S}).querySelector('[aria-label="Add alias"]')`
const lineRowOf = (S, name) => `(${rowOf(S, name)}).querySelector('[data-line-row]')`
const dragChrome = (cdp, S) => cdp.evaluate(`({ line: !!(${S})?.querySelector('.drop-line'), ghost: !!document.querySelector('.drag-ghost') })`)
const shownIn = (cdp, S) => cdp.evaluate(`${rows(S)}.map((r) => r.querySelector('input')?.value ?? r.textContent.trim())`)
const editingIn = (cdp, S) => cdp.evaluate(`(() => { const i = ${inputOf(S)}; return i ? { value: i.value, focused: document.activeElement === i } : null })()`)

const manageRow = (label, scope = 'document') =>
  `[...(${scope}).querySelectorAll('[data-reveal-host]')].find((r) => [...r.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Manage') && [...r.querySelectorAll('span')].some((e) => e.textContent.trim() === ${JSON.stringify(label)}))`
const manageButton = (label, scope) => `[...(${manageRow(label, scope)}).querySelectorAll('button')].find((b) => b.textContent.trim() === 'Manage')`
const countOf = (cdp, label, scope) =>
  cdp.evaluate(`[...(${manageRow(label, scope)})?.querySelectorAll('span') ?? []].find((e) => e.children.length === 0 && /^\\d+$/.test(e.textContent.trim()))?.textContent.trim() ?? null`)
// The element holding a Manage pane's shared 250 minimum, with its width and both bounds; null where nothing computes it.
const boundsOf = (cdp, S) =>
  cdp.evaluate(`(() => { const p = ${S}; const b = p && [p, ...p.querySelectorAll('*')].find((e) => getComputedStyle(e).minWidth === '250px'); return b ? { width: b.getBoundingClientRect().width, min: getComputedStyle(b).minWidth, max: getComputedStyle(b).maxWidth } : null })()`)

// The editor a gesture types into, and where its alias slot stands.
const CELL_VIEW = `document.querySelector('.mdpm-tbl-cell-editor .cm-content').cmTile.root.view`
const docOf = (cdp, view) => cdp.evaluate(`${view}.state.doc.toString()`)
const inSlot = (view, query = '') =>
  `(() => { const v = ${view}; const d = v.state.doc.toString(); const at = d.indexOf(${JSON.stringify(`[[${TARGET}|`)}); return document.activeElement === v.contentDOM && at >= 0 && v.state.selection.main.head === at + ${TARGET.length + 3 + query.length} })()`
// The primed document is the link alone, so its first line is the link's: every class it draws, and its text.
const linkLine = (view) =>
  `(() => { const line = ${view}.contentDOM.querySelector('.cm-line'); return [...line.querySelectorAll('*')].map((e) => e.className).join('|') + '#' + line.textContent })()`
// Emptying the document closes any picker it held, without an Escape a TextPane would take as its own; the brackets go one key at a time, as typing pairs them.
async function prime(cdp, view, title = TARGET) {
  await cdp.evaluate(`(() => { const v = ${view}; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' }, selection: { anchor: 0 } }) })()`)
  await sleep(300)
  for (const ch of ['[', '[']) await typeText(cdp, ch)
  await typeText(cdp, title)
  await sleep(300)
}
async function openStage(cdp, view, title = TARGET, query = '') {
  await prime(cdp, view, title)
  await typeText(cdp, '|')
  if (query) await typeText(cdp, query)
  await sleep(500)
}

// ── Group 1 — the host and the memory ───────────────────────────────────────

async function group1(cdp) {
  await resetAliases(cdp, TARGET, [])
  const bodies = Object.fromEntries(Object.keys(pageIds).map((t) => [t, pageFile(t)]))
  for (const [name, edit, n, want] of [
    ['add launch on an empty list', { op: 'add', alias: 'launch' }, 1, ['launch']],
    ['add liftoff at the end', { op: 'add', alias: 'liftoff' }, 1, ['launch', 'liftoff']],
    ['add Q3 doc at the end', { op: 'add', alias: 'Q3 doc' }, 1, ['launch', 'liftoff', 'Q3 doc']],
    ['add a held alias keeps its place and writes nothing', { op: 'add', alias: 'liftoff' }, 0, ['launch', 'liftoff', 'Q3 doc']],
    ['rename Q3 doc in place', { op: 'rename', from: 'Q3 doc', to: 'Q4 doc' }, 1, ['launch', 'liftoff', 'Q4 doc']],
    ['rename into a held alias keeps the renamed place', { op: 'rename', from: 'launch', to: 'LIFTOFF' }, 1, ['LIFTOFF', 'Q4 doc']],
    ['a case-only rename respells', { op: 'rename', from: 'LIFTOFF', to: 'liftoff' }, 1, ['liftoff', 'Q4 doc']],
    ['add in another case respells in place', { op: 'add', alias: 'q4 DOC' }, 1, ['liftoff', 'q4 DOC']],
    ['forget by any spelling', { op: 'forget', alias: 'Q4 doc' }, 1, ['liftoff']],
    ['add trims', { op: 'add', alias: '  spaced  ' }, 1, ['liftoff', 'spaced']],
    ['move spaced in another case to the front', { op: 'move', alias: 'SPACED', toIndex: 0 }, 1, ['spaced', 'liftoff']],
    ['move past the end appends', { op: 'move', alias: 'spaced', toIndex: 9 }, 1, ['liftoff', 'spaced']],
    ['move an unknown alias writes nothing', { op: 'move', alias: 'zzz', toIndex: 0 }, 0, ['liftoff', 'spaced']],
    ['move to its own place writes nothing', { op: 'move', alias: 'spaced', toIndex: 1 }, 0, ['liftoff', 'spaced']],
    ['forget an unknown alias writes nothing', { op: 'forget', alias: 'zzz' }, 0, ['liftoff', 'spaced']],
    ['add the title in any case writes nothing', { op: 'add', alias: 'DRIVE TARGET' }, 0, ['liftoff', 'spaced']],
    ['rename onto the title writes nothing', { op: 'rename', from: 'liftoff', to: 'Drive Target' }, 0, ['liftoff', 'spaced']],
    ['rename an unknown alias writes nothing', { op: 'rename', from: 'zzz', to: 'yyy' }, 0, ['liftoff', 'spaced']],
    ['a blank add writes nothing', { op: 'add', alias: '   ' }, 0, ['liftoff', 'spaced']],
    ['a blank rename writes nothing', { op: 'rename', from: 'liftoff', to: ' ' }, 0, ['liftoff', 'spaced']],
    ['forget spaced', { op: 'forget', alias: 'spaced' }, 1, ['liftoff']],
  ]) {
    let reply = null
    await step(cdp, `group 1: ${name}`, async () => { reply = await editAliases(cdp, TARGET, edit) }, { writes: aliasWrites(n) })
    check(`group 1: ${name} — the host takes it and the list reads ${JSON.stringify(want)}`, reply?.ok && same(aliasesOf(TARGET), want), JSON.stringify([reply, aliasesOf(TARGET)]))
  }
  await step(cdp, 'group 1: forgetting the last alias', () => editAliases(cdp, TARGET, { op: 'forget', alias: 'liftoff' }), { writes: aliasWrites(1) })
  check('group 1: forgetting the last alias leaves no entry for the page', entryOf(TARGET) === undefined, JSON.stringify(entryOf(TARGET)))

  // Neither of two edits fired together may bring back what the other removed: a name, once gone from the shard, stays gone.
  // Two locked writes can land inside one 5 ms poll, so the shard is seen once or twice; the final list and `stays` prove both edits.
  const together = (a, b) => cdp.evaluate(`Promise.all([${[a, b].map((edit) => `window.nexus.ask('mutate', ${JSON.stringify({ op: 'editAliases', path: pagePath(RACE), edit })})`).join(', ')}]).then((rs) => rs.every((r) => r.ok))`)
  const stays = (states, name) => {
    const held = states.map((s) => s.includes(JSON.stringify(name)))
    return held.every((h, i) => i === 0 || !h || held[i - 1])
  }
  await resetAliases(cdp, RACE, ['race-a', 'race-b', 'race-c'])
  let ok = false
  const forgets = await step(cdp, 'group 1: two forgets fired together', async () => { ok = await together({ op: 'forget', alias: 'race-a' }, { op: 'forget', alias: 'race-b' }) }, { writes: aliasWrites([1, 2], RACE) })
  check('group 1: two forgets fired together both land, and neither resurrects the other', ok && same(aliasesOf(RACE), ['race-c']) && stays(forgets.states[META_DIR], 'race-a') && stays(forgets.states[META_DIR], 'race-b'), JSON.stringify(aliasesOf(RACE)))
  const mixed = await step(cdp, 'group 1: an add and a forget fired together', async () => { ok = await together({ op: 'add', alias: 'race-d' }, { op: 'forget', alias: 'race-c' }) }, { writes: aliasWrites([1, 2], RACE) })
  check('group 1: an add and a forget fired together both land, and the forgotten name never returns', ok && same(aliasesOf(RACE), ['race-d']) && stays(mixed.states[META_DIR], 'race-c'), JSON.stringify(aliasesOf(RACE)))
  check('group 1: no alias edit touched a page file', Object.entries(bodies).every(([t, b]) => pageFile(t) === b))

  // A Link value remembers in the renderer, once its write lands, so it is committed through the table's field.
  await resetAliases(cdp, TARGET, ['other'])
  await home(cdp)
  const commitLink = async (name, text, [md, shard], want, reads = text) => {
    const box = await boxOf(cdp, cell(SOURCE, LINK))
    await mouseAt(cdp, { x: box.left + 4, y: box.y })
    await until("Drive Source's Link field", () => cdp.evaluate(`!!(${field})`))
    await selectAll(cdp)
    await typeText(cdp, text)
    await step(cdp, `group 1: ${name}`, () => pressKey(cdp, 'Enter'), { writes: { [pagePath(SOURCE)]: md, [META_DIR]: shard }, window: 2000 })
    check(`group 1: ${name} — Drive Link reads ${reads} and the aliases ${JSON.stringify(want)}`, frontmatter(SOURCE)[LINK] === reads && same(aliasesOf(TARGET), want), JSON.stringify([frontmatter(SOURCE)[LINK], aliasesOf(TARGET)]))
  }
  await commitLink('a Link value [[Drive Target|launch]] adds launch at the end', '[[Drive Target|launch]]', [1, 1], ['other', 'launch'])
  await commitLink('the same value committed again writes nothing', '[[Drive Target|launch]]', [0, 0], ['other', 'launch'])
  await commitLink('a retarget still showing launch re-remembers nothing', '[[Drive Target#Setup|launch]]', [1, 0], ['other', 'launch'])
  await commitLink('an unaliased link remembers nothing', '[[Drive Target]]', [1, 0], ['other', 'launch'])
  await commitLink('a phantom page is refused and remembers nothing', '[[Nowhere|ghost]]', [0, 0], ['other', 'launch'], '[[Drive Target]]')
  await commitLink('a respelled alias is respelled in place', '[[Drive Target|LAUNCH]]', [1, 1], ['other', 'LAUNCH'])
}

// ── Group 2 — the Aliases pane ──────────────────────────────────────────────

async function group2(cdp, pid) {
  await resetAliases(cdp, TARGET, ['launch', 'liftoff', 'Q3 doc'])
  await home(cdp)
  await openPage(cdp, TARGET)
  await openPanel(cdp)
  await until('the Aliases row', () => cdp.evaluate(`!!${manageRow('Aliases')}`))
  check('group 2: the page dropdown shows Aliases with its count, 3', (await countOf(cdp, 'Aliases')) === '3', await countOf(cdp, 'Aliases'))
  await shot(cdp, 'aliases-row')

  await step(cdp, 'group 2: Manage opens the pane', () => mouseClick(cdp, manageButton('Aliases')), { reflect: `${rows(MANAGE)}.length === 3`, writes: aliasWrites(0) })
  const rest = await cdp.evaluate(`(() => { const p = ${MANAGE}; return { inside: !!p && p.contains(document.activeElement), rows: ${rows(MANAGE)}.map((r) => ({ name: r.textContent.trim(), x: !!r.querySelector('[aria-label="Delete alias"]'), glyph: !!r.querySelector('svg.lucide-square-split-horizontal') })) } })()`)
  check('group 2: the pane focuses nothing', !rest.inside)
  check('group 2: one menu row per alias, each with the alias glyph and a Delete alias ×', same(rest.rows.map((r) => r.name), ['launch', 'liftoff', 'Q3 doc']) && rest.rows.every((r) => r.x && r.glyph), JSON.stringify(rest.rows))
  const bounds = await boundsOf(cdp, MANAGE)
  check('group 2: the pane is 250–500 wide', bounds && bounds.min === '250px' && bounds.max === '500px' && bounds.width >= 250 && bounds.width <= 500, JSON.stringify(bounds))
  await shot(cdp, 'aliases-pane')

  const draft = async () => {
    await step(cdp, 'group 2: + opens a draft', () => mouseClick(cdp, addOf(MANAGE), { settle: 300 }), { reflect: `document.activeElement === ${inputOf(MANAGE)}`, writes: aliasWrites(0), window: 900 })
    return cdp.evaluate(`(() => { const i = ${inputOf(MANAGE)}; return { seated: !!i && document.activeElement === i && i.value === '' && i.selectionStart === 0, last: ${rows(MANAGE)}.at(-1)?.contains(i), plus: (${addOf(MANAGE)}).disabled } })()`)
  }
  const seat = await draft()
  check('group 2: + seats the caret in an empty draft at the end, and + waits on it', seat.seated && seat.last && seat.plus, JSON.stringify(seat))
  await tag(cdp, `(${inputOf(MANAGE)}).closest('[data-reveal]')`, 'draft')
  await typeText(cdp, 'roadmap')
  await step(cdp, 'group 2: Enter adds roadmap', () => pressKey(cdp, 'Enter'), { reflect: `!!${rowOf(MANAGE, 'roadmap')}`, writes: aliasWrites(1) })
  check("group 2: roadmap lands at the end in the draft's own row, and no input remains",
    same(aliasesOf(TARGET), ['launch', 'liftoff', 'Q3 doc', 'roadmap']) && (await cdp.evaluate(`${tagged('draft')}?.textContent.trim() === 'roadmap' && !${inputOf(MANAGE)}`)), JSON.stringify(aliasesOf(TARGET)))

  await draft()
  await tag(cdp, rowOf(MANAGE, 'liftoff'), 'held')
  await typeText(cdp, 'liftoff')
  await step(cdp, 'group 2: a draft naming a held alias', () => pressKey(cdp, 'Enter'), { reflect: `!${inputOf(MANAGE)}`, writes: aliasWrites(0) })
  check('group 2: a draft naming a held alias keeps it in its own row and place and closes, with no refusal',
    same(aliasesOf(TARGET), ['launch', 'liftoff', 'Q3 doc', 'roadmap']) && same(await shownIn(cdp, MANAGE), ['launch', 'liftoff', 'Q3 doc', 'roadmap']) && (await cdp.evaluate(`${tagged('held')}?.textContent.trim() === 'liftoff' && !${inputOf(MANAGE)}`)) && !(await refusal(cdp)), JSON.stringify(aliasesOf(TARGET)))
  await draft()
  await typeText(cdp, 'LAUNCH')
  await step(cdp, 'group 2: a draft respelling a held alias', () => pressKey(cdp, 'Enter'), { reflect: `!!${rowOf(MANAGE, 'LAUNCH')}`, writes: aliasWrites(1) })
  check("group 2: a draft respelling a held alias respells it in place, and the draft closes",
    same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Q3 doc', 'roadmap']) && same(await shownIn(cdp, MANAGE), ['LAUNCH', 'liftoff', 'Q3 doc', 'roadmap']) && !(await cdp.evaluate(`!!${inputOf(MANAGE)}`)), JSON.stringify([aliasesOf(TARGET), await shownIn(cdp, MANAGE)]))

  await draft()
  await typeText(cdp, 'drive target')
  check('group 2: typing the title marks the field aria-invalid', (await cdp.evaluate(`(${inputOf(MANAGE)}).getAttribute('aria-invalid')`)) === 'true')
  await step(cdp, 'group 2: Enter on the title', () => pressKey(cdp, 'Enter'), { writes: aliasWrites(0) })
  check('group 2: the title is kept nowhere and the draft closes', same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Q3 doc', 'roadmap']) && !(await cdp.evaluate(`!!${inputOf(MANAGE)}`)))
  await draft()
  await step(cdp, 'group 2: Escape on an empty draft', () => pressKey(cdp, 'Escape'), { reflect: `!${inputOf(MANAGE)}`, writes: aliasWrites(0) })
  check('group 2: Escape on an empty draft closes it and leaves the pane open', !(await cdp.evaluate(`!!${inputOf(MANAGE)}`)) && (await cdp.evaluate(`!!${MANAGE}`)))
  await draft()
  await step(cdp, "group 2: the draft's ×", () => mouseClick(cdp, `(${inputOf(MANAGE)}).closest('[data-reveal]').querySelector('[aria-label="Delete alias"]')`), { reflect: `!${inputOf(MANAGE)}`, writes: aliasWrites(0) })
  check("group 2: the draft's × closes it", !(await cdp.evaluate(`!!${inputOf(MANAGE)}`)))

  await step(cdp, 'group 2: a single click on a name', () => mouseClick(cdp, nameOf(MANAGE, 'Q3 doc')), { writes: aliasWrites(0), window: 1200 })
  check('group 2: a single click opens no field', !(await editingIn(cdp, MANAGE)))
  await step(cdp, 'group 2: a double-click on a name', () => doubleClick(cdp, nameOf(MANAGE, 'roadmap')), { reflect: `!!${inputOf(MANAGE)}`, writes: aliasWrites(0), window: 900 })
  check("group 2: a double-click opens the name's field, focused", same(await editingIn(cdp, MANAGE), { value: 'roadmap', focused: true }), JSON.stringify(await editingIn(cdp, MANAGE)))
  // Every text the renamed row shows once its field closes, in turn.
  const recordTexts = (name) => cdp.evaluate(`(() => { const r = (${inputOf(MANAGE)}).closest('[data-reveal]'); r.dataset.drive = ${JSON.stringify(name)}; window.__texts = []; new MutationObserver(() => { if (r.querySelector('input')) return; const t = r.textContent.trim(); if (window.__texts.at(-1) !== t) window.__texts.push(t) }).observe(r, { subtree: true, childList: true, characterData: true }) })()`)
  await recordTexts('renamed')
  await selectAll(cdp)
  await typeText(cdp, 'Road Map')
  await step(cdp, 'group 2: Enter renames roadmap', () => pressKey(cdp, 'Enter'), { reflect: `!!${rowOf(MANAGE, 'Road Map')}`, writes: aliasWrites(1) })
  const texts = await cdp.evaluate('window.__texts')
  check('group 2: the rename lands in place, the label reading Road Map from the commit on', same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Q3 doc', 'Road Map']) && same(texts, ['Road Map']), JSON.stringify([aliasesOf(TARGET), texts]))
  await doubleClick(cdp, nameOf(MANAGE, 'Road Map'))
  await recordTexts('kept')
  await selectAll(cdp)
  await typeText(cdp, 'Drive Target')
  await step(cdp, 'group 2: a rename onto the title', () => pressKey(cdp, 'Enter'), { writes: aliasWrites(0) })
  const held = await cdp.evaluate('window.__texts')
  check('group 2: a rename onto the title closes the field unsent, the row reading Road Map throughout', same(held, ['Road Map']) && same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Q3 doc', 'Road Map']), JSON.stringify(held))

  await doubleClick(cdp, nameOf(MANAGE, 'Q3 doc'))
  await selectAll(cdp)
  await typeText(cdp, 'Q4 doc')
  await step(cdp, "group 2: a double-click on another name mid-rename", () => doubleClick(cdp, nameOf(MANAGE, 'LAUNCH')), { reflect: `(${inputOf(MANAGE)})?.value === 'LAUNCH'`, writes: aliasWrites(1) })
  check('group 2: the first rename commits and the second field opens', same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Q4 doc', 'Road Map']) && same(await editingIn(cdp, MANAGE), { value: 'LAUNCH', focused: true }), JSON.stringify([aliasesOf(TARGET), await editingIn(cdp, MANAGE)]))
  await step(cdp, 'group 2: Escape in a rename', () => pressKey(cdp, 'Escape'), { reflect: `!${inputOf(MANAGE)}`, writes: aliasWrites(0) })
  check('group 2: Escape in a rename closes the field and keeps the pane', !(await editingIn(cdp, MANAGE)) && (await cdp.evaluate(`!!${MANAGE}`)))

  await watchLeaving(cdp, rowOf(MANAGE, 'Q4 doc'))
  await step(cdp, 'group 2: × on Q4 doc', () => mouseClick(cdp, xOf(MANAGE, 'Q4 doc')), { reflect: `!${tagged('leaving')}`, writes: aliasWrites(1) })
  const gone = await leftAtOnce(cdp)
  check('group 2: × deletes Q4 doc with no collapse, and the count follows', same(aliasesOf(TARGET), ['LAUNCH', 'liftoff', 'Road Map']) && gone.gone && gone.changed === 0 && (await countOf(cdp, 'Aliases')) === '3', JSON.stringify([aliasesOf(TARGET), gone]))
  await doubleClick(cdp, nameOf(MANAGE, 'liftoff'))
  await selectAll(cdp)
  await typeText(cdp, 'discarded')
  await step(cdp, 'group 2: × on the row being renamed', () => mouseClick(cdp, `(${inputOf(MANAGE)}).closest('[data-reveal]').querySelector('[aria-label="Delete alias"]')`), { reflect: `!${inputOf(MANAGE)}`, writes: aliasWrites(1) })
  check('group 2: × on the row being renamed deletes it, closes its field, and writes none of its text', same(aliasesOf(TARGET), ['LAUNCH', 'Road Map']) && !(await editingIn(cdp, MANAGE)), JSON.stringify(aliasesOf(TARGET)))

  let menu = []
  await step(cdp, "group 2: the row menu's Rename", () => chooseNative(cdp, pid, rowOf(MANAGE, 'LAUNCH'), { downs: 1, seen: async () => { menu = menuRows(pid) } }), { reflect: `!!${inputOf(MANAGE)}`, writes: aliasWrites(0), window: 2500 })
  check('group 2: the row menu reads Rename · Delete', same(menu, ['Rename', 'Delete']), JSON.stringify(menu))
  check("group 2: the row menu's Rename opens LAUNCH's field", same(await editingIn(cdp, MANAGE), { value: 'LAUNCH', focused: true }), JSON.stringify(await editingIn(cdp, MANAGE)))
  await pressKey(cdp, 'Escape')
  await step(cdp, "group 2: the row menu's Delete", () => chooseNative(cdp, pid, rowOf(MANAGE, 'Road Map'), { downs: 2 }), { reflect: `!${rowOf(MANAGE, 'Road Map')}`, writes: aliasWrites(1), window: 2500 })
  check("group 2: the row menu's Delete deletes Road Map, and the count reads 1", same(aliasesOf(TARGET), ['LAUNCH']) && (await countOf(cdp, 'Aliases')) === '1', JSON.stringify(aliasesOf(TARGET)))

  // Reorder: a drag, a release on its own slot, the keyboard, and a press while a field is open.
  await resetAliases(cdp, TARGET, ['launch', 'liftoff', 'Q3 doc', 'roadmap'])
  await until('the reset pane', async () => same(await shownIn(cdp, MANAGE), ['launch', 'liftoff', 'Q3 doc', 'roadmap']))
  let chrome = null
  await step(cdp, 'group 2: a drag of roadmap above liftoff', () => drag(cdp, lineRowOf(MANAGE, 'roadmap'), lineRowOf(MANAGE, 'liftoff'), async () => {
    chrome = await dragChrome(cdp, MANAGE)
    await shot(cdp, 'aliases-pane-drag')
  }), { reflect: `${rows(MANAGE)}[1]?.textContent.trim() === 'roadmap'`, writes: aliasWrites(1) })
  check('group 2: the drag draws the drop line and ghost mid-drag, and writes the order once', chrome?.line && chrome?.ghost && same(aliasesOf(TARGET), ['launch', 'roadmap', 'liftoff', 'Q3 doc']) && same(await shownIn(cdp, MANAGE), ['launch', 'roadmap', 'liftoff', 'Q3 doc']), JSON.stringify([chrome, aliasesOf(TARGET), await shownIn(cdp, MANAGE)]))
  const own = await boxOf(cdp, lineRowOf(MANAGE, 'liftoff'))
  await step(cdp, 'group 2: a drag released on its own slot', () => sweep(cdp, own, { x: own.x, y: own.y + 8 }, { steps: 4 }), { writes: aliasWrites(0) })
  check('group 2: a release on its own slot leaves the order', same(aliasesOf(TARGET), ['launch', 'roadmap', 'liftoff', 'Q3 doc']) && !(await editingIn(cdp, MANAGE)), JSON.stringify(aliasesOf(TARGET)))
  await activate(cdp, pid)
  await cdp.evaluate(`(${lineRowOf(MANAGE, 'Q3 doc')}).focus()`)
  await step(cdp, 'group 2: Space, ArrowUp, Space on Q3 doc', async () => {
    for (const k of [' ', 'ArrowUp', ' ']) await pressKey(cdp, k)
  }, { reflect: `${rows(MANAGE)}[2]?.textContent.trim() === 'Q3 doc'`, writes: aliasWrites(1) })
  const spoken = await cdp.evaluate(`document.querySelector('[role="status"][aria-live="assertive"]')?.textContent ?? null`)
  check('group 2: the keyboard moves Q3 doc above liftoff and announces it', spoken === 'Moved Q3 doc.' && same(aliasesOf(TARGET), ['launch', 'roadmap', 'Q3 doc', 'liftoff']), JSON.stringify([spoken, aliasesOf(TARGET)]))
  await doubleClick(cdp, nameOf(MANAGE, 'launch'))
  chrome = null
  await step(cdp, 'group 2: a drag while renaming', () => drag(cdp, lineRowOf(MANAGE, 'liftoff'), lineRowOf(MANAGE, 'roadmap'), async () => { chrome = await dragChrome(cdp, MANAGE) }), { writes: aliasWrites(0) })
  check('group 2: a drag while renaming draws no drop line and writes nothing', chrome && !chrome.line && same(aliasesOf(TARGET), ['launch', 'roadmap', 'Q3 doc', 'liftoff']), JSON.stringify([chrome, aliasesOf(TARGET)]))
  await escapeAll(cdp)
  await closePanel(cdp)

  // The PageWindow's side pane holds the same row.
  await resetAliases(cdp, TARGET, ['launch'])
  await chooseNative(cdp, pid, `document.querySelector('[role=tab][title=${JSON.stringify(TARGET)}]')`, { downs: 1 })
  await until('the PageWindow', () => cdp.evaluate(`!!document.querySelector('.page-window')`))
  await mouseClick(cdp, sel('.page-window button[title="Side Pane"]'))
  const SIDE = `document.querySelector('.window-side-pane')`
  await until("the side pane's Aliases row", () => cdp.evaluate(`!!${manageRow('Aliases', SIDE)}`))
  check("group 2: the PageWindow's side pane shows Aliases with its count, 1", (await countOf(cdp, 'Aliases', SIDE)) === '1')
  await reveal(cdp, manageRow('Aliases', SIDE))
  await step(cdp, "group 2: the side pane's Manage", () => mouseClick(cdp, manageButton('Aliases', SIDE)), { reflect: `${rows(MANAGE)}.length === 1`, writes: aliasWrites(0) })
  const side = await boundsOf(cdp, MANAGE)
  check("group 2: the side pane's Manage opens the pane, 250–500 wide", side && side.width >= 250 && side.width <= 500, JSON.stringify(side))
  await shot(cdp, 'side-pane-aliases')
  await mouseClick(cdp, addOf(MANAGE), { settle: 300 })
  await typeText(cdp, 'window alias')
  await step(cdp, 'group 2: the side pane adds window alias', () => pressKey(cdp, 'Enter'), { reflect: `!!${rowOf(MANAGE, 'window alias')}`, writes: aliasWrites(1) })
  check('group 2: the side pane adds window alias at the end, and its count reads 2', same(aliasesOf(TARGET), ['launch', 'window alias']) && (await countOf(cdp, 'Aliases', SIDE)) === '2', JSON.stringify(aliasesOf(TARGET)))
  await step(cdp, 'group 2: the side pane deletes window alias', () => mouseClick(cdp, xOf(MANAGE, 'window alias')), { reflect: `!${rowOf(MANAGE, 'window alias')}`, writes: aliasWrites(1) })
  check('group 2: the side pane deletes window alias', same(aliasesOf(TARGET), ['launch']))
  await escapeAll(cdp)
  await mouseClick(cdp, sel('.page-window button[title="Close"]'))
  await until('the PageWindow gone', () => cdp.evaluate(`!document.querySelector('.page-window')`))
}

// ── Group 3 — the body picker ───────────────────────────────────────────────

async function group3(cdp, pid) {
  let list = ['launch', 'liftoff', 'Q3 doc']
  await resetAliases(cdp, TARGET, list)
  await resetAliases(cdp, BARE, [])
  await home(cdp)
  await openPage(cdp, HOST)
  await activate(cdp, pid)
  const V = PAGE_VIEW
  // Typing autosaves Drive Host, so only the shard and the alias owner's file are watched.
  const writes = aliasWrites(0)
  const writes1 = aliasWrites(1)

  await prime(cdp, V)
  await step(cdp, 'group 3: | opens the alias stage', () => typeText(cdp, '|'), { reflect: `${rows(PICKER)}.length === 3`, writes })
  check("group 3: the alias stage lists Drive Target's aliases in order, each with its ×", same(await shownIn(cdp, PICKER), list) && (await cdp.evaluate(`${rows(PICKER)}.every((r) => r.querySelector('[aria-label="Delete alias"]'))`)), JSON.stringify(await shownIn(cdp, PICKER)))
  await shot(cdp, 'alias-stage')
  await step(cdp, 'group 3: l filters the stage', () => typeText(cdp, 'l'), { reflect: `${rows(PICKER)}.length === 2`, writes })
  await step(cdp, 'group 3: li filters the stage', () => typeText(cdp, 'i'), { reflect: `${rows(PICKER)}.length === 1`, writes })
  check('group 3: the stage reads liftoff alone after li', same(await shownIn(cdp, PICKER), ['liftoff']), JSON.stringify(await shownIn(cdp, PICKER)))

  await openStage(cdp, V)
  const blank = await docOf(cdp, V)
  let early = null
  const click1 = await step(cdp, 'group 3: a single click on launch', async () => {
    await mouseClick(cdp, rowOf(PICKER, 'launch'), { settle: 0 })
    await sleep(150)
    early = await docOf(cdp, V)
  }, { reflect: `${V}.state.doc.toString().includes('[[Drive Target|launch]]')`, writes })
  check('group 3: a single click inserts nothing at 150 ms and launch by 600 ms, after the double-click window', early === blank && click1.domMs !== null && click1.domMs >= 300 && click1.domMs < 600, JSON.stringify({ early, domMs: click1.domMs }))
  check("group 3: the inserted alias reaches Drive Host's file", await settles(async () => pageFile(HOST).includes('[[Drive Target|launch]]')))
  await openStage(cdp, V)
  await step(cdp, 'group 3: a single click, then a keystroke in the slot', async () => {
    await mouseClick(cdp, rowOf(PICKER, 'launch'), { settle: 0 })
    await typeText(cdp, 'q')
    await sleep(600)
  }, { writes })
  check('group 3: a keystroke inside the double-click window drops the pending insert', (await docOf(cdp, V)) === `[[${TARGET}|q]]`, await docOf(cdp, V))
  await prime(cdp, V)
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(`[[${TARGET}|]] [[${TARGET}|]]`)} }, selection: { anchor: ${TARGET.length + 3} } }) })()`)
  await until('the first slot\'s alias stage', () => cdp.evaluate(`${rows(PICKER)}.length === 3`))
  await step(cdp, "group 3: a single click, then the caret into another link's slot", async () => {
    await mouseClick(cdp, rowOf(PICKER, 'launch'), { settle: 0 })
    await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ selection: { anchor: v.state.doc.length - 2 } }) })()`)
    await sleep(600)
  }, { writes })
  check("group 3: moving to another link's slot inside the double-click window inserts nothing in either", !(await docOf(cdp, V)).includes('launch'), await docOf(cdp, V))

  await openStage(cdp, V)
  await step(cdp, 'group 3: a double-click on liftoff', () => doubleClick(cdp, nameOf(PICKER, 'liftoff')), { reflect: `!!${inputOf(PICKER)}`, writes, window: 900 })
  check("group 3: a double-click opens liftoff's field and inserts nothing", same(await editingIn(cdp, PICKER), { value: 'liftoff', focused: true }) && (await docOf(cdp, V)) === blank, JSON.stringify([await editingIn(cdp, PICKER), await docOf(cdp, V)]))
  await selectAll(cdp)
  await typeText(cdp, 'lift-off')
  await step(cdp, 'group 3: Enter renames liftoff in the picker', () => pressKey(cdp, 'Enter'), { reflect: inSlot(V), writes: writes1 })
  list = ['launch', 'lift-off', 'Q3 doc']
  check('group 3: the rename lands, the caret is back in the slot, and the link is untouched', same(aliasesOf(TARGET), list) && (await cdp.evaluate(inSlot(V))) && (await docOf(cdp, V)) === blank, JSON.stringify([aliasesOf(TARGET), await docOf(cdp, V)]))
  await doubleClick(cdp, nameOf(PICKER, 'Q3 doc'))
  await step(cdp, 'group 3: Escape in an alias field', () => pressKey(cdp, 'Escape'), { reflect: inSlot(V), writes })
  check('group 3: Escape in an alias field returns the caret to the slot with the picker open', (await cdp.evaluate(inSlot(V))) && !(await editingIn(cdp, PICKER)) && (await shownIn(cdp, PICKER)).length === 3)

  await openStage(cdp, V)
  let chrome = null
  await step(cdp, 'group 3: a drag of Q3 doc to the top of the picker', () => drag(cdp, lineRowOf(PICKER, 'Q3 doc'), lineRowOf(PICKER, 'launch'), async () => { chrome = await dragChrome(cdp, PICKER) }), { reflect: `${rows(PICKER)}[0]?.textContent.trim() === 'Q3 doc'`, writes: writes1 })
  await sleep(400)
  list = ['Q3 doc', 'launch', 'lift-off']
  check('group 3: the picker drag writes the order, the editor keeps the caret in the slot, and the body is unchanged', chrome?.line && same(aliasesOf(TARGET), list) && same(await shownIn(cdp, PICKER), list) && (await cdp.evaluate(inSlot(V))) && (await docOf(cdp, V)) === blank, JSON.stringify([chrome, aliasesOf(TARGET), await docOf(cdp, V)]))
  await openStage(cdp, V, TARGET, 'l')
  chrome = null
  await step(cdp, 'group 3: a drag in a filtered picker', () => drag(cdp, lineRowOf(PICKER, 'lift-off'), lineRowOf(PICKER, 'launch'), async () => { chrome = await dragChrome(cdp, PICKER) }), { writes })
  check('group 3: a filtered picker draws no drop line, writes nothing, and inserts nothing', chrome && !chrome.line && same(aliasesOf(TARGET), list) && (await docOf(cdp, V)) === `[[${TARGET}|l]]`, JSON.stringify([chrome, aliasesOf(TARGET), await docOf(cdp, V)]))

  await openStage(cdp, V)
  await pressKey(cdp, 'ArrowDown')
  const pick = await step(cdp, 'group 3: Down then Enter', () => pressKey(cdp, 'Enter'), { reflect: `${V}.state.doc.toString().includes('[[Drive Target|launch]]')`, writes })
  check('group 3: a keyboard pick inserts the second alias at once, and the used alias keeps its place', pick.domMs !== null && pick.domMs < 150 && same(aliasesOf(TARGET), list), JSON.stringify([pick.domMs, aliasesOf(TARGET)]))

  await openStage(cdp, V)
  await watchLeaving(cdp, rowOf(PICKER, 'Q3 doc'))
  await step(cdp, 'group 3: × on Q3 doc in the picker', () => mouseClick(cdp, xOf(PICKER, 'Q3 doc')), { reflect: `!${tagged('leaving')}`, writes: writes1 })
  list = ['launch', 'lift-off']
  const gone = await leftAtOnce(cdp)
  check('group 3: × deletes Q3 doc with no collapse, inserts nothing, and the editor keeps the caret in the slot', same(aliasesOf(TARGET), list) && gone.gone && gone.changed === 0 && (await docOf(cdp, V)) === blank && (await cdp.evaluate(inSlot(V))), JSON.stringify([aliasesOf(TARGET), gone]))
  await step(cdp, "group 3: the picker's +", () => mouseClick(cdp, addOf(PICKER), { settle: 300 }), { reflect: `document.activeElement === ${inputOf(PICKER)}`, writes, window: 900 })
  check('group 3: + drafts a focused field in the picker, the picker stays, and the slot keeps its pipe', (await editingIn(cdp, PICKER))?.focused && (await docOf(cdp, V)) === blank)
  await typeText(cdp, 'zeta')
  await step(cdp, "group 3: Enter in the picker's draft", () => pressKey(cdp, 'Enter'), { reflect: inSlot(V), writes: writes1 })
  list = ['launch', 'lift-off', 'zeta']
  check('group 3: the add lands at the end without inserting, and the caret is back in the slot', same(aliasesOf(TARGET), list) && (await docOf(cdp, V)) === blank && (await cdp.evaluate(inSlot(V))) && same(await shownIn(cdp, PICKER), list), JSON.stringify([aliasesOf(TARGET), await shownIn(cdp, PICKER)]))
  await openStage(cdp, V, TARGET, 'l')
  await mouseClick(cdp, addOf(PICKER), { settle: 300 })
  await typeText(cdp, 'omega')
  await step(cdp, 'group 3: an add under the filter l', () => pressKey(cdp, 'Enter'), { reflect: inSlot(V, 'l'), writes: writes1 })
  list = ['launch', 'lift-off', 'zeta', 'omega']
  check("group 3: an add the filter doesn't match lands without showing", same(aliasesOf(TARGET), list) && !(await shownIn(cdp, PICKER)).includes('omega') && (await cdp.evaluate(inSlot(V, 'l'))), JSON.stringify([aliasesOf(TARGET), await shownIn(cdp, PICKER)]))

  await openStage(cdp, V)
  let menu = []
  await step(cdp, "group 3: the picker row menu's Rename", () => chooseNative(cdp, pid, rowOf(PICKER, 'launch'), { downs: 1, seen: async () => { menu = menuRows(pid) } }), { reflect: `!!${inputOf(PICKER)}`, writes, window: 2500 })
  check("group 3: the picker's row menu reads Rename · Delete, and Rename opens the field with the picker open", same(menu, ['Rename', 'Delete']) && (await editingIn(cdp, PICKER))?.value === 'launch', JSON.stringify(menu))
  await pressKey(cdp, 'Escape')
  await step(cdp, "group 3: the picker row menu's Delete", () => chooseNative(cdp, pid, rowOf(PICKER, 'zeta'), { downs: 2 }), { reflect: `!${rowOf(PICKER, 'zeta')}`, writes: writes1, window: 2500 })
  list = ['launch', 'lift-off', 'omega']
  check("group 3: the picker row menu's Delete deletes zeta and inserts nothing", same(aliasesOf(TARGET), list) && (await docOf(cdp, V)) === blank, JSON.stringify(aliasesOf(TARGET)))

  await openStage(cdp, V)
  const open = await cdp.evaluate(linkLine(V))
  await doubleClick(cdp, nameOf(PICKER, 'launch'))
  const held = await cdp.evaluate(linkLine(V))
  check('group 3: the link keeps its open decoration while an edit runs in the picker', open === held && (await editingIn(cdp, PICKER))?.focused, JSON.stringify({ open, held }))
  await shot(cdp, 'picker-rename')
  const outside = await blankOf(cdp, '.sidebar-ribbon')
  await step(cdp, 'group 3: a press on blank chrome mid-edit', () => mouseAt(cdp, outside), { reflect: `!${PICKER}`, writes })
  check('group 3: it closes the picker and collapses the empty slot, as a blur does', !(await cdp.evaluate(`!!${PICKER}`)) && (await docOf(cdp, V)) === `[[${TARGET}]]`, await docOf(cdp, V))

  await openStage(cdp, V, BARE)
  check('group 3: a page with no aliases opens no alias stage', !(await cdp.evaluate(`!!(${PICKER})?.querySelector('[aria-label="Add alias"]')`)))
  await openStage(cdp, V)
  await typeText(cdp, 'fresh one')
  await settles(async () => !(await portalOpen(cdp)), 2000)
  await step(cdp, 'group 3: leaving an authored alias slot', () => cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`), { writes: writes1 })
  list = [...list, 'fresh one']
  check('group 3: leaving an authored alias slot adds it at the end', same(aliasesOf(TARGET), list), JSON.stringify(aliasesOf(TARGET)))

  // A markdown link's label is its alias: typed before the page is picked, or retyped in place.
  const caret = (at) => cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ selection: { anchor: ${at} } }) })()`)
  await cdp.evaluate(`(() => { const v = ${V}; v.focus(); v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' }, selection: { anchor: 0 } }) })()`)
  await sleep(300)
  for (const ch of ['[', 'md label', ']', '(', 'Drive Tar']) await typeText(cdp, ch)
  await sleep(500)
  const MD = `[md label](${encodeURI(TARGET)})`
  await step(cdp, 'group 3: a page picked behind a typed label', () => pressKey(cdp, 'Enter'), { reflect: `${V}.state.doc.toString() === ${JSON.stringify(MD)}`, writes: writes1 })
  list = [...list, 'md label']
  check('group 3: a page picked behind a typed label adds the label at the end', same(aliasesOf(TARGET), list) && (await docOf(cdp, V)) === MD, JSON.stringify([aliasesOf(TARGET), await docOf(cdp, V)]))
  await step(cdp, 'group 3: walking the caret through a label', async () => { await caret(4); await caret(MD.length) }, { writes })
  await caret('[md label'.length)
  await typeText(cdp, ' 2')
  await step(cdp, 'group 3: leaving a retyped label', () => caret(0), { writes: writes1 })
  list = [...list, 'md label 2']
  check('group 3: leaving a retyped label adds it at the end', same(aliasesOf(TARGET), list), JSON.stringify(aliasesOf(TARGET)))
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' }, selection: { anchor: 0 } }) })()`)
  for (const ch of ['[', 'typed', ']', '(', encodeURI(TARGET)]) await typeText(cdp, ch)
  await sleep(500)
  await step(cdp, 'group 3: leaving a markdown link typed out in full', () => caret(0), { writes: writes1 })
  list = [...list, 'typed']
  check('group 3: leaving a markdown link typed out in full adds its label at the end', same(aliasesOf(TARGET), list) && (await docOf(cdp, V)) === `[typed](${encodeURI(TARGET)})`, JSON.stringify([aliasesOf(TARGET), await docOf(cdp, V)]))
  const EMPTY = `[](${encodeURI(TARGET)})`
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(EMPTY)} }, selection: { anchor: ${EMPTY.length} } }) })()`)
  await sleep(300)
  await step(cdp, 'group 3: the caret in an empty label', () => caret(1), { reflect: `${rows(PICKER)}.length === ${list.length}`, writes })
  check('group 3: an empty label lists every alias in order', same(await shownIn(cdp, PICKER), list), JSON.stringify(await shownIn(cdp, PICKER)))
  await shot(cdp, 'label-stage')
  await step(cdp, 'group 3: Enter in the label stage', () => pressKey(cdp, 'Enter'), { reflect: `${V}.state.doc.toString() === ${JSON.stringify(`[${list[0]}]${EMPTY.slice(2)}`)}`, writes })
  check('group 3: Enter picks the first alias into the label and rests past the link', (await cdp.evaluate(`${V}.state.selection.main.head === ${V}.state.doc.length`)) && same(aliasesOf(TARGET), list), JSON.stringify([await docOf(cdp, V), aliasesOf(TARGET)]))
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(`[x${EMPTY.slice(1)}`)} }, selection: { anchor: 2 } }) })()`)
  await sleep(300)
  await pressKey(cdp, 'Backspace')
  const SHOWN = `[${TARGET}]${EMPTY.slice(2)}`
  await step(cdp, 'group 3: leaving an emptied label', () => caret(0), { reflect: `${V}.state.doc.toString() === ${JSON.stringify(SHOWN)}`, writes })
  check("group 3: an emptied label left behind shows its page's title and remembers nothing", (await docOf(cdp, V)) === SHOWN && same(aliasesOf(TARGET), list), JSON.stringify([await docOf(cdp, V), aliasesOf(TARGET)]))
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(EMPTY)} }, selection: { anchor: 1 } }) })()`)
  await sleep(300)
  await caret(0)
  await sleep(300)
  check('group 3: an empty label the caret only passes through stays as written', (await docOf(cdp, V)) === EMPTY, await docOf(cdp, V))
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' }, selection: { anchor: 0 } }) })()`)
  for (const ch of ['[', ']', '(', 'Drive Tar']) await typeText(cdp, ch)
  await sleep(500)
  await step(cdp, 'group 3: a page picked behind an empty label', () => pressKey(cdp, 'Enter'), { reflect: `${V}.state.doc.toString() === ${JSON.stringify(EMPTY)} && ${rows(PICKER)}.length === ${list.length}`, writes })
  check('group 3: a markdown pick opens the alias stage in its label, as a wikilink pick does', (await cdp.evaluate(`${V}.state.selection.main.head === 1`)) && same(await shownIn(cdp, PICKER), list), JSON.stringify([await docOf(cdp, V), await shownIn(cdp, PICKER)]))
  await step(cdp, 'group 3: leaving the stage unpicked', () => caret(0), { reflect: `${V}.state.doc.toString() === ${JSON.stringify(SHOWN)}`, writes })
  check("group 3: a stage left unpicked shows the page's title and remembers nothing", (await docOf(cdp, V)) === SHOWN && same(aliasesOf(TARGET), list), JSON.stringify([await docOf(cdp, V), aliasesOf(TARGET)]))
  await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: ${JSON.stringify(EMPTY)} }, selection: { anchor: ${EMPTY.length - 2} } }) })()`)
  await sleep(300)
  await step(cdp, 'group 3: Return in a markdown destination', () => pressKey(cdp, 'Enter'), { reflect: `${V}.state.selection.main.head === 1 && ${rows(PICKER)}.length === ${list.length}`, writes })
  check('group 3: Return in a markdown destination rests in its label, which lists every alias', (await docOf(cdp, V)) === EMPTY && same(await shownIn(cdp, PICKER), list), JSON.stringify([await docOf(cdp, V), await shownIn(cdp, PICKER)]))

  // TextPane: the same stage inside a Text value's editor.
  await home(cdp)
  await openPane(cdp, cell(HOST, NOTES))
  await openStage(cdp, PANE_VIEW)
  check('group 3: TextPane: the alias stage lists the aliases', same(await shownIn(cdp, PICKER), list), JSON.stringify(await shownIn(cdp, PICKER)))
  await mouseClick(cdp, addOf(PICKER), { settle: 300 })
  await typeText(cdp, 'pane alias')
  await step(cdp, 'group 3: TextPane: + adds pane alias', () => pressKey(cdp, 'Enter'), { reflect: inSlot(PANE_VIEW), writes: writes1 })
  check('group 3: TextPane: the add lands, the pane stays, and the caret is back in its slot', same(aliasesOf(TARGET), [...list, 'pane alias']) && (await cdp.evaluate(`!!document.querySelector('${PANE}') && ${inSlot(PANE_VIEW)}`)), JSON.stringify(aliasesOf(TARGET)))
  await step(cdp, 'group 3: TextPane: × deletes pane alias', () => mouseClick(cdp, xOf(PICKER, 'pane alias')), { reflect: `!${rowOf(PICKER, 'pane alias')}`, writes: writes1 })
  check('group 3: TextPane: × deletes it and the pane stays', same(aliasesOf(TARGET), list) && (await cdp.evaluate(`!!document.querySelector('${PANE}')`)))
  await step(cdp, 'group 3: TextPane: Enter picks', () => pressKey(cdp, 'Enter'), { reflect: `${PANE_VIEW}.state.doc.toString().includes('[[Drive Target|launch]]')`, writes })
  check('group 3: TextPane: Enter picks the first alias into the pane', (await docOf(cdp, PANE_VIEW)).includes('[[Drive Target|launch]]'))
  await pressKey(cdp, 'Escape')
  await until('the TextPane closed', () => cdp.evaluate(`!document.querySelector('${PANE}')`))
  await must('Drive Host restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(HOST), propertyId: ids[NOTES], value: { kind: 'text', value: 'host notes' } }))

  // TextPane: Enter closes the pane with the caret still in an authored slot.
  await openPane(cdp, cell(HOST, NOTES))
  await openStage(cdp, PANE_VIEW)
  await typeText(cdp, 'zzq')
  await settles(async () => !(await cdp.evaluate(`!!${PICKER}`)), 2000)
  await step(cdp, 'group 3: TextPane: Enter with the caret in an authored slot', () => pressKey(cdp, 'Enter'), { reflect: `!document.querySelector('${PANE}')`, writes: writes1, window: 2000 })
  check('group 3: TextPane: Enter closes the pane, the value lands, and the authored alias joins the end', (await settles(async () => String(frontmatter(HOST)[NOTES]).includes(`[[${TARGET}|zzq]]`))) && same(aliasesOf(TARGET), [...list, 'zzq']), JSON.stringify([frontmatter(HOST)[NOTES], aliasesOf(TARGET)]))
  await must('forget zzq', editAliases(cdp, TARGET, { op: 'forget', alias: 'zzq' }))
  await must('Drive Host restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(HOST), propertyId: ids[NOTES], value: { kind: 'text', value: 'host notes' } }))

  // TextPane: a heading of the page holding the value.
  await must('Drive Target notes', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(TARGET), propertyId: ids[NOTES], value: { kind: 'text', value: 'target notes' } }))
  await until("Drive Target's notes", () => cdp.evaluate(`(${cell(TARGET, NOTES)}).textContent.includes('target notes')`))
  await openPane(cdp, cell(TARGET, NOTES))
  await prime(cdp, PANE_VIEW, '#')
  await until('the own-page heading list', () => cdp.evaluate(`!!(${PICKER})?.textContent.includes('Setup')`))
  await step(cdp, 'group 3: TextPane: an own-page heading picked from [[#', () => pressKey(cdp, 'Enter'), { reflect: `${PANE_VIEW}.state.doc.toString() === '[[#Setup]]'`, writes: { [META_DIR]: 0 } })
  check('group 3: TextPane: an own-page heading writes [[#Setup]] and opens no alias slot or stage', (await docOf(cdp, PANE_VIEW)) === '[[#Setup]]' && !(await cdp.evaluate(`!!(${PICKER})?.querySelector('[aria-label="Add alias"]')`)), await docOf(cdp, PANE_VIEW))
  await pressKey(cdp, 'Escape')
  await until('the TextPane closed', () => cdp.evaluate(`!document.querySelector('${PANE}')`))
  await must('Drive Target restored', ask(cdp, 'mutate', { op: 'setProperty', path: pagePath(TARGET), propertyId: ids[NOTES], value: null }))

  // A table cell in the body: its own editor, the same stage.
  await openPage(cdp, GRID)
  await mouseClick(cdp, sel('tbody .mdpm-tbl-cell-static'))
  await until("the table cell's editor", () => cdp.evaluate(`!!document.querySelector('.mdpm-tbl-cell-editor .cm-content')`))
  await openStage(cdp, CELL_VIEW)
  check('group 3: table cell: the alias stage lists the aliases', same(await shownIn(cdp, PICKER), list), JSON.stringify(await shownIn(cdp, PICKER)))
  await mouseClick(cdp, addOf(PICKER), { settle: 300 })
  await typeText(cdp, 'cell alias')
  await step(cdp, 'group 3: table cell: + adds cell alias', () => pressKey(cdp, 'Enter'), { reflect: inSlot(CELL_VIEW), writes: writes1 })
  check("group 3: table cell: the add lands and the caret is back in the cell's slot", same(aliasesOf(TARGET), [...list, 'cell alias']) && (await cdp.evaluate(inSlot(CELL_VIEW))), JSON.stringify(aliasesOf(TARGET)))
  await step(cdp, 'group 3: table cell: Enter picks', () => pressKey(cdp, 'Enter'), { reflect: `${CELL_VIEW}.state.doc.toString().includes('[[Drive Target|launch]]')`, writes })
  check('group 3: table cell: Enter picks the first alias into the cell', (await docOf(cdp, CELL_VIEW)).includes('[[Drive Target|launch]]'))
  await pressKey(cdp, 'Escape')
}

// ── Group 4 — Excluded Directories and Open In Preview ──────────────────────

const RIBBON_SETTINGS = sel('.sidebar-ribbon [aria-label="Settings"]')
async function openSettings(cdp, frame) {
  if (!(await cdp.evaluate(`!!document.querySelector('.settings-rail')`))) await mouseClick(cdp, RIBBON_SETTINGS)
  await until('the Settings window', () => cdp.evaluate(`!!document.querySelector('.settings-rail')`))
  await click(cdp, `[...document.querySelectorAll('.settings-rail [data-reveal-host]')].find((r) => r.textContent.trim() === ${JSON.stringify(frame)})`)
  await sleep(800)
}
const EXCLUDED = `document.querySelector('[data-picker-portal] [aria-label="Add exclusion"]')?.closest('[data-picker-portal]')`
const folders = `[...((${EXCLUDED})?.querySelectorAll('[data-reveal]:not(:has([data-reveal]))') ?? [])]`
const folderRow = (name) => `${folders}.find((r) => r.textContent.trim() === ${JSON.stringify(name)})`
const folderField = (expr) => `(${expr}).querySelector('[aria-label="Excluded folder"]')`

async function group4(cdp) {
  await must('two exclusions', ask(cdp, 'exclusions:set', ['Drive Ghost A', 'Drive Ghost B']))
  await openSettings(cdp, 'Files & Links')
  await reveal(cdp, manageRow('Excluded Directories'))
  check('group 4: Excluded Directories counts 2', (await countOf(cdp, 'Excluded Directories')) === '2', await countOf(cdp, 'Excluded Directories'))
  const w = { [SETTINGS]: 0 }
  const w1 = { [SETTINGS]: 1 }
  await step(cdp, "group 4: Excluded Directories' Manage", () => mouseClick(cdp, manageButton('Excluded Directories')), { reflect: `${folders}.length === 2`, writes: w })
  const ex = await boundsOf(cdp, EXCLUDED)
  check("group 4: Excluded Directories' pane is 250–500 wide", ex && ex.min === '250px' && ex.width >= 250 && ex.width <= 500, JSON.stringify(ex))
  await shot(cdp, 'excluded-pane')

  await step(cdp, 'group 4: + adds a draft folder row', () => mouseClick(cdp, sel('[aria-label="Add exclusion"]')), { reflect: `${folders}.length === 3`, writes: w, window: 900 })
  check('group 4: the draft rests until pressed', !(await cdp.evaluate(`!!(${EXCLUDED}).querySelector('input')`)) && (await cdp.evaluate(`(${sel('[aria-label="Add exclusion"]')}).disabled`)))
  await mouseClick(cdp, folderField(`${folders}.at(-1)`))
  await typeText(cdp, 'Drive Ghost C')
  await step(cdp, 'group 4: Enter writes the drafted folder', () => pressKey(cdp, 'Enter'), { reflect: `!!${folderRow('Drive Ghost C')}`, writes: w1 })
  check('group 4: the drafted folder lands at the end', same(excluded(), ['Drive Ghost A', 'Drive Ghost B', 'Drive Ghost C']), JSON.stringify(excluded()))

  await tag(cdp, folderRow('Drive Ghost A'), 'folder')
  await mouseClick(cdp, folderField(folderRow('Drive Ghost A')))
  await selectAll(cdp)
  await typeText(cdp, 'Drive Ghost Z')
  await step(cdp, "group 4: a folder's field renames it", () => pressKey(cdp, 'Enter'), { reflect: `!!${folderRow('Drive Ghost Z')}`, writes: w1 })
  check("group 4: the rename lands in place and keeps its row's node", same(excluded(), ['Drive Ghost Z', 'Drive Ghost B', 'Drive Ghost C']) && (await cdp.evaluate(`${tagged('folder')}?.textContent.trim() === 'Drive Ghost Z'`)), JSON.stringify(excluded()))

  await tag(cdp, folderRow('Drive Ghost B'), 'kept')
  await mouseClick(cdp, sel('[aria-label="Add exclusion"]'))
  await mouseClick(cdp, folderField(`${folders}.at(-1)`))
  await typeText(cdp, '../Drive Out')
  await step(cdp, 'group 4: a folder outside the Nexus', () => pressKey(cdp, 'Enter'), { writes: w })
  const refused = { status: await refusal(cdp), draft: await cdp.evaluate(`${folders}.length === 4`), kept: await cdp.evaluate(`${tagged('kept')}?.isConnected && ${tagged('kept')}.textContent.trim() === 'Drive Ghost B'`) }
  check('group 4: a refused folder raises the notice, leaves the held row the same node, and keeps the draft row open', refused.status && refused.kept && refused.draft, JSON.stringify(refused))
  await mouseClick(cdp, `${folders}.at(-1).querySelector('[aria-label="Remove exclusion"]')`)
  await mouseClick(cdp, sel('[aria-label="Add exclusion"]'))
  await mouseClick(cdp, folderField(`${folders}.at(-1)`))
  await typeText(cdp, 'drive ghost b')
  await step(cdp, 'group 4: a draft naming a held folder', () => pressKey(cdp, 'Enter'), { writes: w })
  check('group 4: a draft naming a held folder writes nothing new, closes, and leaves the held row alone', same(excluded(), ['Drive Ghost Z', 'Drive Ghost B', 'Drive Ghost C']) && (await cdp.evaluate(`${folders}.length === 3 && ${tagged('kept')}?.isConnected`)), JSON.stringify(excluded()))

  await watchLeaving(cdp, folderRow('Drive Ghost C'))
  await step(cdp, 'group 4: × on Drive Ghost C', () => mouseClick(cdp, `${tagged('leaving')}.querySelector('[aria-label="Remove exclusion"]')`), { reflect: `!${tagged('leaving')}`, writes: w1 })
  const gone = await leftAtOnce(cdp)
  check('group 4: × removes Drive Ghost C with no collapse', same(excluded(), ['Drive Ghost Z', 'Drive Ghost B']) && gone.gone && gone.changed === 0, JSON.stringify([excluded(), gone]))
  await mouseClick(cdp, folderField(folderRow('Drive Ghost Z')))
  await selectAll(cdp)
  await typeText(cdp, 'typed')
  await step(cdp, 'group 4: × on a folder mid-edit', () => mouseClick(cdp, `(${EXCLUDED}).querySelector('input').closest('[data-reveal]').querySelector('[aria-label="Remove exclusion"]')`), { writes: w1 })
  check('group 4: × on a folder mid-edit sends one write without the typed text', same(excluded(), ['Drive Ghost B']), JSON.stringify(excluded()))
  await escapeAll(cdp)

  await openSettings(cdp, 'Navigation')
  await reveal(cdp, manageRow('Open In Preview'))
  await step(cdp, "group 4: Open In Preview's Manage", () => mouseClick(cdp, manageButton('Open In Preview')), { reflect: `!!document.querySelector('[data-picker-portal] [aria-label="Add filter rule"]')`, writes: w })
  const preview = await boundsOf(cdp, `document.querySelector('[data-picker-portal] [aria-label="Add filter rule"]').closest('[data-picker-portal]')`)
  check("group 4: Open In Preview's pane opens at the shared 250 minimum", preview && preview.min === '250px' && preview.width >= 250, JSON.stringify(preview))
  await shot(cdp, 'preview-pane')
  await escapeAll(cdp)
  await mouseClick(cdp, RIBBON_SETTINGS)
  await sleep(600)
}

// ── Group 5 — the option editor and Filter ──────────────────────────────────

const OPTIONS = `document.querySelector('[data-picker-portal] [aria-label="New Option"]')?.closest('[data-picker-portal]')`
const optionRow = (name) => `[...((${OPTIONS})?.querySelectorAll('[data-line-row]') ?? [])].find((r) => r.textContent.trim() === ${JSON.stringify(name)})`
const VALUES = `[...document.querySelectorAll('input[placeholder="Value"]')]`
const REMOVES = `[...document.querySelectorAll('[aria-label="Remove filter"]')]`

async function group5(cdp) {
  check('group 5: Drive Choice holds its seeded option, Alpha, and Beta', same(optionValues(), ['Option 1', 'Alpha', 'Beta']), JSON.stringify(optionValues()))
  await home(cdp)
  await mouseClick(cdp, cell(SOURCE, CHOICE))
  await until("Drive Source's option picker", () => portalOpen(cdp))
  const w = { [REGISTRY]: 0 }
  const newOption = () => step(cdp, 'group 5: New Option', () => mouseClick(cdp, `(${OPTIONS}).querySelector('[aria-label="New Option"]')`, { settle: 300 }), { reflect: `!!document.activeElement?.closest('[data-picker-portal]') && document.activeElement.tagName === 'INPUT'`, writes: w, window: 900 })
  await newOption()
  check("group 5: the property picker's + is disabled while drafting", await cdp.evaluate(`(${OPTIONS}).querySelector('[aria-label="New Option"]').disabled`))
  await typeText(cdp, 'Fresh')
  // Each state the picker passes through after the commit: d while the draft stands, f once Fresh's row does.
  await cdp.evaluate(`(() => { const p = ${OPTIONS}; window.__flow = []; const note = () => { const s = (p.querySelector('input') ? 'd' : '') + ((${optionRow('Fresh')}) ? 'f' : ''); if (window.__flow.at(-1) !== s) window.__flow.push(s) }; note(); new MutationObserver(note).observe(p, { subtree: true, childList: true, characterData: true }) })()`)
  await step(cdp, 'group 5: Enter adds Fresh', () => pressKey(cdp, 'Enter'), { reflect: `!!${optionRow('Fresh')} && !(${OPTIONS}).querySelector('input')`, writes: { [REGISTRY]: 1 } })
  const flow = await cdp.evaluate('window.__flow')
  check('group 5: the draft stands until Fresh lands, with no state between holding neither', same(optionValues(), ['Option 1', 'Alpha', 'Beta', 'Fresh']) && !flow.includes('') && flow.at(-1) === 'f', JSON.stringify(flow))
  await newOption()
  await typeText(cdp, 'alpha')
  await step(cdp, 'group 5: a case-variant duplicate', () => pressKey(cdp, 'Enter'), { writes: w })
  const dup = { notice: await refusal(cdp), draft: await cdp.evaluate(`(${OPTIONS}).querySelector('input')?.value ?? null`) }
  check('group 5: a refused duplicate raises the notice and keeps alpha in the draft', !!dup.notice && dup.draft === 'alpha', JSON.stringify(dup))
  await tag(cdp, optionRow('Alpha'), 'option')
  await cdp.evaluate(`(() => { const i = (${OPTIONS}).querySelector('input'); i.focus(); i.select() })()`)
  await typeText(cdp, 'Alpha')
  await step(cdp, 'group 5: an exact duplicate', () => pressKey(cdp, 'Enter'), { writes: w })
  check('group 5: a refused exact duplicate keeps Alpha in the draft and the held Alpha row the same node', (await cdp.evaluate(`(${OPTIONS}).querySelector('input')?.value === 'Alpha' && ${tagged('option')}?.isConnected`)) && same(optionValues(), ['Option 1', 'Alpha', 'Beta', 'Fresh']))
  await escapeAll(cdp)

  const rule = { property_id: ids[NOTES], op: 'contains' }
  const twoRules = async () => {
    await must('two empty text rules', ask(cdp, 'views:save', 'Collection A', 'collection', driveView(), { filter: { match: 'all', rules: [rule, rule] } }))
    await until('two rule rows', () => cdp.evaluate(`${VALUES}.length === 2`))
    await sleep(400)
  }
  await must('two empty text rules', ask(cdp, 'views:save', 'Collection A', 'collection', driveView(), { filter: { match: 'all', rules: [rule, rule] } }))
  await mouseClick(cdp, SETTINGS_BUTTON)
  await click(cdp, `[...document.querySelectorAll('[data-reveal-host]')].find((r) => [...r.querySelectorAll('span')].some((e) => e.children.length === 0 && e.textContent.trim() === 'Filter'))`)
  await twoRules()
  const ws = { [SIDECAR]: 1 }
  await mouseClick(cdp, `${VALUES}[1]`)
  await typeText(cdp, 'foo')
  await tag(cdp, `${VALUES}[1]`, 'rule')
  await step(cdp, "group 5: rule 1's × while rule 2 is typed into", () => mouseClick(cdp, `${REMOVES}[0]`), { reflect: `${VALUES}.length === 1`, writes: ws })
  const kept = await cdp.evaluate(`(() => { const i = ${tagged('rule')}; return { same: ${VALUES}.length === 1 && ${VALUES}[0] === i, focused: document.activeElement === i, value: i?.value } })()`)
  const saved = driveView().filter?.rules ?? []
  check("group 5: rule 2's input stays the same node, focused, reading foo, and only the removal is saved", same(kept, { same: true, focused: true, value: 'foo' }) && saved.length === 1 && !saved[0].value, JSON.stringify([kept, saved]))
  await twoRules()
  await mouseClick(cdp, `${VALUES}[0]`)
  await typeText(cdp, 'foo')
  await step(cdp, "group 5: rule 1's × while it is typed into", () => mouseClick(cdp, `${REMOVES}[0]`), { reflect: `${VALUES}.length === 1`, writes: ws })
  const left = driveView().filter?.rules ?? []
  check("group 5: Filter's × discards the edit in progress, the remaining input reading nothing", (await cdp.evaluate(`${VALUES}.length === 1 && ${VALUES}[0].value === ''`)) && left.length === 1 && !left[0].value, JSON.stringify(left))
  await escapeAll(cdp)
  if (await cdp.evaluate(`${VALUES}.length > 0`)) await mouseClick(cdp, SETTINGS_BUTTON)
}

// ── Group 6 — the hot paths, timed ──────────────────────────────────────────

const AC_TEXT = `(document.querySelector('.mdpm-ac')?.textContent ?? '')`
const stash = (cdp, expr, name) => cdp.evaluate(`window[${JSON.stringify(name)}] = ${expr}`)

async function group6(cdp) {
  await resetAliases(cdp, TARGET, ['launch', 'liftoff', 'Q3 doc'])
  await home(cdp)
  await openPage(cdp, HOST)
  const V = PAGE_VIEW
  const runs = {}
  const timed = async (name, act, reflect) => {
    const m = await measure(cdp, `perf: ${name}`, act, { reflect })
    runs[name] = [...(runs[name] ?? []), m.domMs]
  }
  for (let i = 0; i < N; i++) {
    await prime(cdp, V)
    await timed('alias stage opens', () => typeText(cdp, '|'), `${AC_TEXT}.includes('liftoff')`)
    await sleep(200)
    await stash(cdp, AC_TEXT, '__acWas')
    await timed('alias filter keystroke', () => typeText(cdp, 'l'), `${AC_TEXT} !== window.__acWas`)
    await sleep(200)
    await stash(cdp, `${V}.state.doc.toString()`, '__docWas')
    await timed('alias keyboard pick', () => pressKey(cdp, 'Enter'), `${V}.state.doc.toString() !== window.__docWas`)
    await escapeAll(cdp)
    await cdp.evaluate(`(() => { const v = ${V}; v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: '' } }) })()`)
    await sleep(400)
    await typeText(cdp, '[')
    await stash(cdp, AC_TEXT, '__acWas')
    await timed('page stage opens', () => typeText(cdp, '['), `${AC_TEXT} !== '' && ${AC_TEXT} !== window.__acWas`)
    await sleep(200)
    await stash(cdp, AC_TEXT, '__acWas')
    await timed('page filter keystroke', () => typeText(cdp, 'D'), `${AC_TEXT} !== window.__acWas`)
    await sleep(200)
    await stash(cdp, `${V}.state.doc.toString()`, '__docWas')
    await timed('page keyboard pick', () => pressKey(cdp, 'Enter'), `${V}.state.doc.toString() !== window.__docWas`)
    await escapeAll(cdp)
    await sleep(400)
  }
  await home(cdp)
  await openPage(cdp, TARGET)
  await openPanel(cdp)
  if (await settles(() => cdp.evaluate(`!!${manageRow('Aliases')}`), 3000)) {
    for (let i = 0; i < N; i++) {
      await timed('Manage pane opens', () => mouseClick(cdp, manageButton('Aliases'), { settle: 0 }), `${rows(MANAGE)}.length === 3`)
      await escapeAll(cdp)
      await sleep(400)
    }
  } else if (!BASELINE) check('group 6: the page dropdown shows the Aliases row to time', false)
  else console.log('group 6: this build has no Aliases row; Manage pane opens is skipped')
  for (const [name, ms] of Object.entries(runs)) check(`group 6: every ${name} run reflected (${ms.length})`, ms.every((x) => x !== null), JSON.stringify(ms))
  await closePanel(cdp)
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  const app = await launch(PORT, 'alias-shots')
  cdp = app.cdp
  const { pid } = app
  await seed(cdp)
  if (GROUPS.has(1)) await group1(cdp)
  if (GROUPS.has(2)) await group2(cdp, pid)
  if (GROUPS.has(3)) await group3(cdp, pid)
  if (GROUPS.has(4)) await group4(cdp)
  if (GROUPS.has(5)) await group5(cdp)
  if (GROUPS.has(PERF)) await group6(cdp)
  cdp.close()
} catch (e) {
  check('the run reached its end', false, String(e?.stack ?? e))
  if (cdp) {
    await shot(cdp, 'failure').catch(() => {})
    console.log(await cdp.evaluate(`JSON.stringify({ tab: document.querySelector('[role=tab][aria-selected=true]')?.title, active: document.activeElement?.outerHTML.slice(0, 200), portals: [...document.querySelectorAll('[data-picker-portal]')].map((p) => p.textContent.slice(0, 200)), text: document.body.innerText.slice(0, 400) })`).catch((err) => String(err)))
  }
} finally {
  if (metrics.length) {
    printMetrics()
    console.log(`metrics in ${writeMetrics()}`)
    if (AGAINST) against(AGAINST)
  }
  await restore()
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
