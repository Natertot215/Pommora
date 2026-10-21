import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import {
  ask, boxOf, chooseNative, click, createPage, escapeAll, FM, holds, hover, launch, mintPageId, mouseClick, must, NEXUS,
  openCollection, openPage, PAGE_VIEW, pageIds, portalOpen, pressKey, relaunch, restore, results, sel, settles, shot, sleep,
  textEl, typeText, until, writeBody,
} from '../drive-harness.mjs'

const PORT = 9393
// The plan's phases in order, named as the plan names them, so `6A` sorts before `6B`.
const PHASES = ['1', '2', '3', '4', '5', '6A', '6B']
const at = (phase) => PHASES.indexOf(String(phase))
const ALL = ['1', '2', '3', '4', '5']
const GROUPS = new Set(process.argv.slice(2))
// The last plan phase landed in the build under test: an item owned by a later phase is expected to fail and doesn't fail the run.
const LANDED = process.env.POMMORA_ARCHIVE_LANDED ?? '1'
if (GROUPS.size === 0 || [...GROUPS].some((g) => !ALL.includes(g)) || at(LANDED) < 0) {
  console.error(`usage: POMMORA_ARCHIVE_LANDED=<${PHASES.join('|')}> node live-drive.mjs <group…>   (groups ${ALL.join(', ')}, each the plan phase of its name)`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

const ledger = []
/** One assertion, owned by the plan phase that lands it and the decision it proves, printed as MATRIX.md lists it. */
function item(group, phase, decision, name, pass, detail) {
  const awaited = at(phase) > at(LANDED)
  const mark = pass ? (awaited ? 'AHEAD' : 'PASS') : awaited ? 'AWAIT' : 'FAIL'
  console.log(`${mark.padEnd(5)}  [g${group} ${decision}] ${name}${!pass && detail ? `\n       ${detail}` : ''}`)
  results.push({ name, pass: !!pass || awaited })
  ledger.push({ group: String(group), phase, decision, name, mark })
}
const show = (v) => JSON.stringify(v)
const same = (a, b) => show(a) === show(b)

// ── The Nexus on disk ───────────────────────────────────────────────────────

const COLLECTION = 'Collection A'
const abs = (rel) => join(NEXUS, rel)
const exists = (rel) => existsSync(abs(rel))
const readRel = (rel) => readFileSync(abs(rel), 'utf8')
const frontOf = (rel) => parse(FM.exec(readRel(rel))?.[1] ?? '') ?? {}
const bodyOf = (rel) => readRel(rel).replace(FM, '')
function treePaths(tree) {
  const out = new Set()
  const walk = (n) => {
    for (const p of n.pages ?? []) out.add(p.path)
    for (const s of n.sets ?? []) walk(s)
  }
  for (const c of tree.collections) walk(c)
  return out
}
const settingsOnDisk = () => JSON.parse(readRel('.nexus/settings.json'))
const config = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree.config
const containerId = () => { const id = mintPageId(); return `${id.slice(0, 10)}0${id.slice(11)}` }
const makeSet = (cdp, name) =>
  must(`Set ${name}`, ask(cdp, 'mutate', { op: 'createContainer', id: containerId(), parentPath: COLLECTION, kind: 'set', name }))
/** Through Settings' own channel, held by the tree before any folder it names exists, so none is ever adopted as a Set. */
async function exclude(cdp, folders) {
  await must('exclusions:set', ask(cdp, 'exclusions:set', folders))
  await until('the exclusions in the tree', async () => same((await config(cdp)).excluded, folders))
}
const KEEP = '# Keep\n'
/** A folder Pommora leaves alone, holding a page with no ID as an outside editor leaves one. */
function setAside(rel) {
  mkdirSync(abs(rel), { recursive: true })
  writeFileSync(abs(`${rel}/Keep.md`), KEEP)
}
/** Its page never stamped and no sidecar written: the folder was never read as a Set. */
const untouched = (rel) => exists(`${rel}/Keep.md`) && readRel(`${rel}/Keep.md`) === KEEP && !exists(`${rel}/_pageset.json`)
const bundleOf = (name) => readdirSync(abs(`.trash/${COLLECTION}`)).find((n) => n.endsWith(`__${name}.deleted`))
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const ids = {}
const A_ALPHA = `${COLLECTION}/Set Alpha`
const page = (parent, title) => `${parent}/${title}.md`
async function createAt(cdp, parent, title, seeds = {}) {
  const id = mintPageId()
  await must(`createPage ${parent}/${title}`, ask(cdp, 'mutate', { op: 'createPage', id, parentPath: parent, name: title, seeds }))
  ids[page(parent, title)] = id
  return page(parent, title)
}

// ── The sidebar ─────────────────────────────────────────────────────────────

const sidebarRow = (title) => `[...document.querySelectorAll('.row span')].findLast((e) => e.textContent.trim() === ${JSON.stringify(title)})`
const ribbon = (label) => `document.querySelector('.sidebar-ribbon [aria-label="${label}"]')`
async function sidebarTo(cdp, mode, title) {
  if (!(await cdp.evaluate(`!!(${sidebarRow(title)})`))) await click(cdp, ribbon(mode))
  await until(`${title} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(title)})`))
  await click(cdp, sidebarRow(title))
}
const RAIL = `[...document.querySelectorAll('.settings-rail [data-reveal-host]')]`
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
const drawn = (cdp, title) => cdp.evaluate(`!!(${sidebarRow(title)})`)
const DIALOG = `document.querySelector('[role="alertdialog"]')`
/** A folded row's chevron pressed as a pointer presses it, since the chevron is an svg, which takes no `.click()`. */
async function unfold(cdp, title, child) {
  if (await drawn(cdp, child)) return
  await mouseClick(cdp, `${sidebarRow(title)}.closest('.row').querySelector('[data-drop-outline]')`)
  await until(`${child} in the sidebar`, () => drawn(cdp, child))
  await sleep(400)
}
/** Right-click, the native menu's Delete, and the confirmation's Delete, as a user deletes a Set: the menu as chosen and the question asked. */
async function deleteFromSidebar(cdp, title) {
  await unfold(cdp, COLLECTION, title)
  const menu = await chooseNative(cdp, sidebarRow(title), 'Delete')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  const asked = await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`)
  await click(cdp, `[...${DIALOG}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')`)
  return { menu, asked }
}

// ── Group 1 — the lift and the carry (Phase 1) ──────────────────────────────

async function group1(cdp) {
  const LIFT = `${COLLECTION}/AR Lift`
  const MOVED = `${COLLECTION}/AR Moved`
  const LIFTED = `${COLLECTION}/Private`
  await makeSet(cdp, 'AR Lift')
  await exclude(cdp, [`${LIFT}/Private`])
  setAside(`${LIFT}/Private`)

  const renamed = await ask(cdp, 'mutate', { op: 'rename', path: LIFT, kind: 'set', newName: 'AR Moved' })
  await settles(async () => same(settingsOnDisk().excluded_folders, [`${MOVED}/Private`]))
  const carried = (await config(cdp)).excluded
  item(1, 1, 'K-1', 'a renamed Set carries its excluded entry to the landing',
    renamed.ok && same(settingsOnDisk().excluded_folders, [`${MOVED}/Private`]) && same(carried, [`${MOVED}/Private`]),
    show({ renamed, onDisk: settingsOnDisk().excluded_folders, carried }))
  item(1, 1, 'K-1', 'the carried folder moves with the Set and is never read as one',
    untouched(`${MOVED}/Private`) && !exists(LIFT), show(exists(MOVED) && readdirSync(abs(MOVED))))

  const { menu, asked } = await deleteFromSidebar(cdp, 'AR Moved')
  await settles(async () => exists(LIFTED) && !exists(MOVED))
  await sleep(800)
  await shot(cdp, 'g1-lifted')
  const bundle = bundleOf('AR Moved')
  const record = bundle ? JSON.parse(readRel(`.trash/${COLLECTION}/${bundle}/_record.json`)) : null
  item(1, 1, 'F-3', "the sidebar's Delete asks, and the Set goes to the Trash",
    menu.chosen && asked === 'Delete “AR Moved”?' && !exists(MOVED) && !!bundle, show({ menu, asked, bundle }))
  item(1, 1, 'F-3', 'its excluded folder is left behind in Collection A, untouched',
    untouched(LIFTED), show(exists(LIFTED) && readdirSync(abs(LIFTED))))
  item(1, 1, 'F-3', "the folder's entry follows it",
    same(settingsOnDisk().excluded_folders, [LIFTED]), show(settingsOnDisk().excluded_folders))
  item(1, 1, 'F-3', 'the bundle holds no excluded folder, and its record names none',
    !!record && !exists(`.trash/${COLLECTION}/${bundle}/AR Moved/Private`) && !('excluded' in record), show(record))
  item(1, 1, 'F-3', 'the sidebar draws neither the Set nor the lifted folder',
    !(await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  const back = await ask(cdp, 'mutate', { op: 'restore', bundlePath: `.trash/${COLLECTION}/${bundle}` })
  await settles(() => drawn(cdp, 'AR Moved'))
  item(1, 1, 'F-2', 'the restored Set returns without the folder, which stays where it was left',
    back.ok && exists(`${MOVED}/_pageset.json`) && !exists(`${MOVED}/Private`) && untouched(LIFTED) && same(settingsOnDisk().excluded_folders, [LIFTED]),
    show({ back, moved: exists(MOVED) && readdirSync(abs(MOVED)), excluded: settingsOnDisk().excluded_folders }))
  item(1, 1, 'F-2', 'the sidebar draws the Set again, and never the folder',
    (await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  await makeSet(cdp, 'AR Second')
  await exclude(cdp, [LIFTED, `${COLLECTION}/AR Second/Private`])
  setAside(`${COLLECTION}/AR Second/Private`)
  const second = await ask(cdp, 'mutate', { op: 'delete', path: `${COLLECTION}/AR Second`, kind: 'set' })
  await settles(async () => exists(`${LIFTED} (2)`))
  item(1, 1, 'F-2', 'a folder lifted onto a namesake steps aside to Private (2), its entry following',
    second.ok && untouched(`${LIFTED} (2)`) && untouched(LIFTED) && same(settingsOnDisk().excluded_folders, [LIFTED, `${LIFTED} (2)`]),
    show({ second, excluded: settingsOnDisk().excluded_folders }))

  const CARRY = `${COLLECTION}/AR Carry`
  const MEDIA = `${COLLECTION}/AR Media`
  await makeSet(cdp, 'AR Carry')
  // Written from outside, ahead of the folder: assets:setDir would refuse a folder the watcher already adopted as a Set, and its migration would move ~/Test's own assets.
  writeFileSync(abs('.nexus/settings.json'), `${JSON.stringify({ ...settingsOnDisk(), asset_directory: `${CARRY}/Media` }, null, 2)}\n`)
  await until('the asset directory in the tree', async () => (await config(cdp)).assetDirectory === `${CARRY}/Media`)
  mkdirSync(abs(`${CARRY}/Media`))
  writeFileSync(abs(`${CARRY}/Media/Pixel.png`), PIXEL)
  await sleep(1000)
  const carriedAsset = await ask(cdp, 'mutate', { op: 'rename', path: CARRY, kind: 'set', newName: 'AR Media' })
  await settles(async () => settingsOnDisk().asset_directory === `${MEDIA}/Media`)
  item(1, 1, 'K-1', 'a renamed Set carries the asset directory to the landing, the asset file with it',
    carriedAsset.ok && exists(`${MEDIA}/Media/Pixel.png`) && !exists(`${MEDIA}/Media/_pageset.json`) &&
      (await config(cdp)).assetDirectory === `${MEDIA}/Media` && same(settingsOnDisk().excluded_folders, [LIFTED, `${LIFTED} (2)`]),
    show({ carriedAsset, onDisk: settingsOnDisk() }))

  const media = await ask(cdp, 'mutate', { op: 'delete', path: MEDIA, kind: 'set' })
  await settles(async () => exists(`${COLLECTION}/Media/Pixel.png`))
  item(1, 1, 'F-2', 'the asset directory is left behind by a trashed Set, its setting following',
    media.ok && exists(`${COLLECTION}/Media/Pixel.png`) && !exists(`${COLLECTION}/Media/_pageset.json`) &&
      settingsOnDisk().asset_directory === `${COLLECTION}/Media` && (await config(cdp)).assetDirectory === `${COLLECTION}/Media`,
    show({ media, onDisk: settingsOnDisk().asset_directory }))

  // The lifted folders leave the disk while still set aside, so none is adopted once ~/Test's own settings return.
  for (const rel of [LIFTED, `${LIFTED} (2)`, `${COLLECTION}/Media`]) rmSync(abs(rel), { recursive: true, force: true })
  await must('exclusions:set []', ask(cdp, 'exclusions:set', []))
  await must("assets:setDir ''", ask(cdp, 'assets:setDir', ''))
  await until("~/Test's own scope", async () => {
    const { excluded, assetDirectory } = await config(cdp)
    return excluded.length === 0 && assetDirectory === '.nexus/assets'
  })
}

// ── Group 2 — every restore returns to its place and steps past the disk (Phase 2) ──

const trashed = async (cdp, title) =>
  ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === title)
const restoreRow = async (cdp, title) => {
  const row = await trashed(cdp, title)
  return row ? ask(cdp, 'mutate', { op: 'restore', bundlePath: row.bundlePath }) : null
}
const deleteAt = (cdp, path, kind) => must(`delete ${path}`, ask(cdp, 'mutate', { op: 'delete', path, kind }))
const orderIn = (rel, key) => JSON.parse(readRel(rel))[key] ?? []
const stateOrder = () => JSON.parse(readRel('.nexus/state.json')).order ?? {}
const between = (order, [a, x, b]) =>
  order.indexOf(a) >= 0 && order.indexOf(x) === order.indexOf(a) + 1 && order.indexOf(b) === order.indexOf(x) + 1
const heldTree = async (cdp) => (await ask(cdp, 'nexus:state')).value.tree
const collectionA = async (cdp) => (await heldTree(cdp)).collections.find((c) => c.path === 'Collection A')
const notice = (cdp) => cdp.evaluate(`document.querySelector('[role=status], [role=alert]')?.textContent ?? ''`)
const trashRowEl = (title) => `[...document.querySelectorAll('.trash-row')].find((r) => r.textContent.includes(${JSON.stringify(title)}))`

async function createSetIn(cdp, name) {
  const id = containerId()
  const held = await collectionA(cdp)
  await must(`create ${name}`, ask(cdp, 'mutate', { op: 'createContainer', id, parentPath: 'Collection A', kind: 'set', name, order: [...held.sets.map((s) => s.id), id] }))
  return id
}

async function group2(cdp) {
  const titles = ['AR Before', 'AR Middle', 'AR After']
  for (const t of titles) await createAt(cdp, A_ALPHA, t)
  const three = titles.map((t) => ids[page(A_ALPHA, t)])
  const alpha = (await collectionA(cdp)).sets.find((s) => s.path === A_ALPHA)
  const others = alpha.pages.map((p) => p.id).filter((id) => !three.includes(id))
  await must('order the three', ask(cdp, 'mutate', { op: 'movePage', path: page(A_ALPHA, 'AR Middle'), newParentPath: A_ALPHA, order: [...others, ...three] }))
  await deleteAt(cdp, page(A_ALPHA, 'AR Middle'), 'page')
  const sidecar = `${A_ALPHA}/_pageset.json`
  item(2, 2, 'E-2', 'a page delete drops its id from its folder’s page_order', !orderIn(sidecar, 'page_order').includes(three[1]), show(orderIn(sidecar, 'page_order')))
  const listed = await trashed(cdp, 'AR Middle')
  item(2, 2, 'A-3', 'bundles:list answers the Trash’s row with its stored time', typeof listed?.storedAt === 'number', show(listed))
  await must('restore AR Middle', restoreRow(cdp, 'AR Middle'))
  item(2, 2, 'E-2', 'a page restored lands between its old neighbours in page_order', between(orderIn(sidecar, 'page_order'), three), show(orderIn(sidecar, 'page_order')))
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await unfold(cdp, COLLECTION, 'Set Alpha')
  await unfold(cdp, 'Set Alpha', 'AR Middle')
  const sidebarOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(titles)}.includes(t))`)
  item(2, 2, 'E-2', 'the sidebar draws the three in that order', show(sidebarOrder) === show(titles), show(sidebarOrder))

  const sets = []
  for (const name of ['AR Set One', 'AR Set Two', 'AR Set Three']) sets.push(await createSetIn(cdp, name))
  await deleteAt(cdp, 'Collection A/AR Set Two', 'set')
  await must('restore AR Set Two', restoreRow(cdp, 'AR Set Two'))
  const setOrder = orderIn('Collection A/_pagecollection.json', 'set_order')
  item(2, 2, 'E-2', 'a Set restored lands between its old neighbours in set_order', between(setOrder, sets), show(setOrder))

  const coll = containerId()
  await must('create AR Coll', ask(cdp, 'mutate', { op: 'createContainer', id: coll, parentPath: '', kind: 'collection', name: 'AR Coll' }))
  const held = (await heldTree(cdp)).collections.filter((c) => c.id !== coll)
  const tops = held.map((c) => c.id)
  const a = (await collectionA(cdp)).id
  const next = tops[tops.indexOf(a) + 1]
  const ring = [COLLECTION, 'AR Coll', held.find((c) => c.id === next)?.title]
  await must('place AR Coll', ask(cdp, 'mutate', { op: 'reorderTop', order: tops.flatMap((id) => (id === a ? [id, coll] : [id])) }))
  await deleteAt(cdp, 'AR Coll', 'collection')
  item(2, 2, 'E-2', 'a Collection delete drops its id from state.order.collections', !(stateOrder().collections ?? []).includes(coll), show(stateOrder().collections))
  await must('restore AR Coll', restoreRow(cdp, 'AR Coll'))
  item(2, 2, 'E-2', 'a Collection restored lands between its old neighbours in state.order.collections', between(stateOrder().collections ?? [], [a, coll, next]), show(stateOrder().collections))
  await until('AR Coll in the sidebar', () => drawn(cdp, 'AR Coll'))
  const topOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(ring)}.includes(t))`)
  item(2, 2, 'E-2', 'the sidebar draws the restored Collection between them', show(topOrder) === show(ring), show(topOrder))

  const group = (await heldTree(cdp)).contexts.find((g) => g.spaces.length >= 2)
  const space = containerId()
  const [s0, s1, ...rest] = group.spaces.map((s) => s.id)
  await must('create AR Space', ask(cdp, 'mutate', { op: 'createSpace', id: space, contextId: group.def.id, name: 'AR Space', order: [s0, space, s1, ...rest] }))
  await deleteAt(cdp, `.nexus/contexts/${group.def.title}/AR Space`, 'space')
  item(2, 2, 'E-2', 'a Space delete drops its id from its Context’s order', !(stateOrder().spaces?.[group.def.id] ?? []).includes(space), show(stateOrder().spaces?.[group.def.id]))
  await must('restore AR Space', restoreRow(cdp, 'AR Space'))
  item(2, 2, 'E-2', 'a Space restored lands between its old neighbours in its Context’s order', between(stateOrder().spaces?.[group.def.id] ?? [], [s0, space, s1]), show(stateOrder().spaces?.[group.def.id]))

  await createAt(cdp, A_ALPHA, 'AR Squat')
  await deleteAt(cdp, page(A_ALPHA, 'AR Squat'), 'page')
  writeFileSync(abs(page(A_ALPHA, 'AR Squat')), `---\nID: ${mintPageId().replace(/^(.{10})P/, '$1T')}\n---\nsquatter`)
  await sleep(1500)
  await openSettings(cdp, 'Trash')
  const { chosen } = await chooseNative(cdp, trashRowEl('AR Squat'), 'Restore')
  const said = await settles(async () => (await notice(cdp)).includes('Restored “AR Squat” as “AR Squat (2)”'))
  item(2, 2, 'E-4', 'a page restored onto an outside file steps aside, and the Trash names the title it took',
    chosen && said && exists(page(A_ALPHA, 'AR Squat (2)')) && readRel(page(A_ALPHA, 'AR Squat')).endsWith('squatter'), show({ chosen, notice: await notice(cdp) }))
  await closeSettings(cdp)

  await createSetIn(cdp, 'AR Excl')
  await deleteAt(cdp, 'Collection A/AR Excl', 'set')
  const excluded = JSON.parse(readRel('.nexus/settings.json')).excluded_folders ?? []
  await must('exclude its origin', ask(cdp, 'exclusions:set', [...excluded, 'Collection A/AR Excl']))
  const settingsBefore = readRel('.nexus/settings.json')
  const back = await restoreRow(cdp, 'AR Excl')
  item(2, 2, 'E-4', 'a Set restored onto an excluded entry steps aside, settings.json unchanged',
    back?.value?.landedAs === 'AR Excl (2)' && exists('Collection A/AR Excl (2)/_pageset.json') && readRel('.nexus/settings.json') === settingsBefore, show(back))
  await must('the exclusions as they were', ask(cdp, 'exclusions:set', excluded))

  for (const t of ['AR Look One', 'AR Look Two']) {
    await createAt(cdp, A_ALPHA, t)
    await deleteAt(cdp, page(A_ALPHA, t), 'page')
  }
  await openSettings(cdp, 'Trash')
  const drawnRows = await cdp.evaluate(`[...document.querySelectorAll('.trash-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
  const answered = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).map((r) => r.title)
  item(2, 2, 'A-3', 'the Trash browser draws the titles bundles:list answers, in its order', same(drawnRows, answered), show({ drawnRows, answered }))
  for (const t of ['AR Look One', 'AR Look Two']) await click(cdp, `${trashRowEl(t)}.querySelector('[role=checkbox]')`)
  const { chosen: all } = await chooseNative(cdp, trashRowEl('AR Look One'), 'Restore All')
  const batch = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
  item(2, 2, 'A-3', 'a Restore All of two reads Restored 2 Pages', all && batch, show(await notice(cdp)))
  await shot(cdp, 'trash-frame')
  await closeSettings(cdp)
}

// ── Group 3 — Reach (Phase 3) ───────────────────────────────────────────────

const STAMP = '2026-10-20T12-00-00-000Z'
const rowIds = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.data-row[data-rid]')].map((r) => r.dataset.rid)`)

/** Seeds an archived page by hand, as the archive op will file one (Phase 4), and answers the relaunched window. */
// Group 3 relaunches, so it drives the run's own `cdp`, and a failure inside it leaves the run holding the live session.
async function group3() {
  const colA = JSON.parse(readRel('Collection A/_pagecollection.json')).id
  const alpha = JSON.parse(readRel('Collection A/Set Alpha/_pageset.json')).id
  const { id: stage } = await must('add Drive Stage', ask(cdp, 'schema:add', 'Collection A', {
    id: '',
    label: 'Drive Stage',
    type: 'select',
    select_options: [{ key: 'Draft', label: 'Draft' }],
  }))
  const live = { rel: 'Collection A/Set Alpha/Drive Live.md', id: mintPageId() }
  const linker = { rel: 'Collection A/Set Alpha/Drive Linker.md', id: mintPageId() }
  // A Set whose sidecar doesn't parse is listed unreadable and never stamped, so the tree withholds its page while the index and a folder walk still read it.
  const withheld = { dir: 'Collection A/Drive Damaged', rel: 'Collection A/Drive Damaged/Drive Withheld.md', id: mintPageId() }
  const bundle = `.nexus/archive/${colA}/Collection A/Set Alpha/${STAMP}__Drive Arc.md.archived`
  const arc = { rel: `${bundle}/Drive Arc.md`, id: mintPageId() }
  cdp = await relaunch(cdp, async () => {
    writeFileSync(abs(live.rel), `---\nID: ${live.id}\nDrive Stage: Draft\n---\nbody\n`)
    writeFileSync(abs(linker.rel), `---\nID: ${linker.id}\n---\n[[Drive Arc]]\n`)
    mkdirSync(abs(withheld.dir), { recursive: true })
    writeFileSync(abs(`${withheld.dir}/_pageset.json`), '{ not json')
    writeFileSync(abs(withheld.rel), `---\nID: ${withheld.id}\n---\nbody\n`)
    mkdirSync(abs(bundle), { recursive: true })
    writeFileSync(abs(`${bundle}/_record.json`), JSON.stringify({ entity: 'page', id: arc.id, parent: { kind: 'container', id: alpha } }))
    writeFileSync(abs(arc.rel), `---\nID: ${arc.id}\nDrive Stage: Draft\n---\n## Drive Heading\n\nsee [[Drive Live]]\n`)
  })

  const state = await must('nexus:state', ask(cdp, 'nexus:state'))
  const held = treePaths(state.tree)
  item(3, 3, 'D-2', 'the tree holds the live pages and never the archived one', held.has(live.rel) && ![...held].some((p) => p.startsWith('.nexus/') || p.endsWith('/Drive Arc.md')), show([...held].filter((p) => p.includes('Drive'))))
  await openCollection(cdp)
  const search = `document.querySelector('.detail-title-search')`
  await cdp.evaluate(`${search}.focus()`)
  await typeText(cdp, 'Drive')
  const drive = [live.id, linker.id, arc.id]
  const filtered = async () => { const rows = await rowIds(cdp); return rows.length > 0 && rows.every((id) => drive.includes(id)) && rows }
  const shown = await until('the search’s rows', filtered).catch(() => rowIds(cdp))
  item(3, 3, 'D-2', "Collection A's view search for Drive lists Drive Live and never Drive Arc", shown.includes(live.id) && !shown.includes(arc.id), show(shown))
  await shot(cdp, 'g3-view-search')
  await cdp.evaluate(`(() => { const i = ${search}; i.select() })()`)
  await pressKey(cdp, 'Backspace')
  pageIds['Drive Linker'] = linker.id
  await openPage(cdp, 'Drive Linker')
  const drawn = await cdp.evaluate(`(() => { const line = [...document.querySelectorAll('.cm-content .cm-line')].find((l) => l.textContent.includes('Drive Arc')); return line ? { phantom: !!line.querySelector('.md-connection-phantom'), resolved: !!line.querySelector('.md-connection-resolved') } : null })()`)
  item(3, 3, 'D-1', 'a link naming the archived page draws unresolved', drawn?.phantom === true && drawn.resolved === false, show(drawn))
  await shot(cdp, 'g3-phantom')
  await escapeAll(cdp)

  const graph = await must('matrix:graph', ask(cdp, 'matrix:graph', true))
  item(3, 3, 'K-2', 'the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge', live.id in graph.values && withheld.id in graph.values && !(arc.id in graph.values) && graph.links.every((l) => !l.path.startsWith('.nexus/')), show(Object.keys(graph.values).length))
  const asked = await must('matrix:graph by path', ask(cdp, 'matrix:graph', false, [arc.rel]))
  item(3, 3, 'K-2', 'the Matrix graph asked for the archived path answers no id', asked.ids.length === 0, show(asked.ids))
  const headings = await must('index:headings', ask(cdp, 'index:headings'))
  const archivedHeadings = await must('index:headings by path', ask(cdp, 'index:headings', [arc.rel]))
  item(3, 3, 'K-2', 'the headings answer no archived path, whole or asked by path', !Object.keys(headings).some((p) => p.startsWith('.nexus/')) && Object.keys(archivedHeadings).length === 0, show(Object.keys(archivedHeadings)))
  const loaded = await must('view:loadValues', ask(cdp, 'view:loadValues', 'Collection A'))
  item(3, 3, 'K-2', "Collection A's value load reads the tree's pages, never the archived one or one under a Set whose sidecar doesn't parse", live.id in loaded && !(arc.id in loaded) && !(withheld.id in loaded), show(Object.keys(loaded).length))

  const count = await must('property:holders', ask(cdp, 'property:holders', stage))
  item(3, 3, 'C-4', 'the delete confirmation’s count leaves the archived holder out', count === 1, show(count))
  await must('rename the Draft option', ask(cdp, 'property:renameOption', stage, 'Draft', 'Final'))
  item(3, 3, 'C-1', 'an option rename rewrites the archived page as it rewrites the live one', show(frontOf(arc.rel)['Drive Stage']) === show(['Final']) && show(frontOf(live.rel)['Drive Stage']) === show(['Final']), show([frontOf(arc.rel)['Drive Stage'], frontOf(live.rel)['Drive Stage']]))
  await must('rename Drive Live', ask(cdp, 'mutate', { op: 'rename', path: live.rel, kind: 'page', newName: 'Drive Live 2' }))
  live.rel = 'Collection A/Set Alpha/Drive Live 2.md'
  item(3, 3, 'C-1', "renaming Drive Live re-spells the archived page's link", bodyOf(arc.rel).includes('[[Drive Live 2]]'), show(bodyOf(arc.rel)))
  await must('delete Drive Stage', ask(cdp, 'property:delete', stage))
  item(3, 3, 'C-2', 'the property delete strips the archived page as it strips the live one', !('Drive Stage' in frontOf(arc.rel)) && !('Drive Stage' in frontOf(live.rel)), show(frontOf(arc.rel)))

  // The seeds leave as they came, from outside, and the deleted property's bundle is emptied, so a later group meets Collection A, its Archive, and the Trash as group 3 found them. The watcher holds a file the app just wrote until it's still for 200 ms, and an unlink inside that hold reaches the app as nothing, so the seeds leave once the delete's writes are still.
  await sleep(400)
  for (const rel of [live.rel, linker.rel, withheld.dir, `.nexus/archive/${colA}`]) rmSync(abs(rel), { recursive: true, force: true })
  await until('the seeds out of the tree', async () => !treePaths((await must('nexus:state', ask(cdp, 'nexus:state'))).tree).has(live.rel))
  const stageRow = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === 'Drive Stage')
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  if (stageRow) await must('empty Drive Stage', ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: stageRow.bundlePath }))
  await must('permanentDelete off', ask(cdp, 'personalization:set', 'permanentDelete', false))
  const left = ((await ask(cdp, 'bundles:list', { kind: 'archive', id: colA })).value ?? []).length
  item(3, 3, '—', 'the group leaves Collection A’s Archive and the Trash as it found them', left === 0 && !exists(`.nexus/archive/${colA}`) && !((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).some((r) => r.title === 'Drive Stage'), show({ left }))
}

// ── Group 4 — the Archive's ops (Phase 4) ───────────────────────────────────

const rows = async (store) => (await ask(cdp, 'bundles:list', store)).value ?? []
const recordAt = (bundle) => JSON.parse(readRel(`${bundle}/_record.json`))
const heldIds = async () => {
  const out = new Set()
  const walk = (n) => {
    for (const p of n.pages ?? []) out.add(p.id)
    for (const s of n.sets ?? []) walk(s)
  }
  for (const c of (await heldTree(cdp)).collections) walk(c)
  return out
}
const op = (what, req) => must(what, ask(cdp, 'mutate', req))
const bundledBy = async (what, req) => (await op(what, req)).bundled?.bundlePath
const emptyAt = (bundlePath) => op(`empty ${bundlePath}`, { op: 'emptyBundle', bundlePath })
const leafOf = (bundlePath) => bundlePath.split('/').at(-1)
const sidecarIdOf = (rel) => JSON.parse(readRel(rel)).id
const stamped = (dir, name, suffix) => new RegExp(`^${dir.replaceAll('.', '\\.')}/[^/]+__${name}\\.md\\${suffix}$`)

// Group 4 relaunches, so it drives the run's own `cdp`, and a failure inside it leaves the run holding the live session.
async function group4() {
  const colA = sidecarIdOf('Collection A/_pagecollection.json')
  const colB = sidecarIdOf('Collection B/_pagecollection.json')
  const alphaId = sidecarIdOf(`${A_ALPHA}/_pageset.json`)
  const B_ALPHA = 'Collection B/Set Alpha'
  const bAlphaId = sidecarIdOf(`${B_ALPHA}/_pageset.json`)
  const A_SIDECAR = `${A_ALPHA}/_pageset.json`
  const CHAINS = ['.trash/Collection A/Set Alpha/Drive Sub', '.trash/Collection A/Set Alpha', '.trash/Collection A', '.trash/Collection B/Set Alpha', '.trash/Collection B', '.trash/Drive Gone', '.trash']
  const before = {
    pageOrder: orderIn(A_SIDECAR, 'page_order'),
    bSets: orderIn('Collection B/_pagecollection.json', 'set_order'),
    bAlphaSets: orderIn(`${B_ALPHA}/_pageset.json`, 'set_order'),
    collections: stateOrder().collections ?? [],
    trash: (await rows({ kind: 'trash' })).length,
    archiveA: (await rows({ kind: 'archive', id: colA })).length,
    archiveB: (await rows({ kind: 'archive', id: colB })).length,
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
    chains: CHAINS.filter(exists),
  }

  const pageA = frontOf(page(A_ALPHA, 'Page A')).ID
  const arcId = mintPageId()
  const arc = page(A_ALPHA, 'Drive Arc')
  const slot = before.pageOrder.indexOf(pageA) + 1
  const follower = before.pageOrder[slot]
  await op('createPage Drive Arc', { op: 'createPage', id: arcId, parentPath: A_ALPHA, name: 'Drive Arc', order: [...before.pageOrder.slice(0, slot), arcId, ...before.pageOrder.slice(slot)] })
  const live = await createAt(cdp, A_ALPHA, 'Drive Live')
  await sleep(400)
  writeFileSync(abs(arc), `${FM.exec(readRel(arc))[0]}[[Drive Live]]\n`)
  await sleep(1000)

  const A1 = await bundledBy('archive Drive Arc', { op: 'archive', path: arc, kind: 'page' })
  const archived = A1 ? recordAt(A1) : null
  item(4, 4, 'A-2', 'a page archives into its Collection’s Archive under the chain it left',
    stamped(`.nexus/archive/${colA}/${A_ALPHA}`, 'Drive Arc', '.archived').test(A1) && exists(`${A1}/Drive Arc.md`) &&
      archived?.entity === 'page' && archived.id === arcId && archived.parent?.id === alphaId &&
      archived.place?.above === follower && archived.place?.below === pageA && same(archived.trail, [colA]) &&
      !exists(arc) && !orderIn(A_SIDECAR, 'page_order').includes(arcId),
    show({ A1, archived, pageOrder: orderIn(A_SIDECAR, 'page_order') }))

  const listedA = await rows({ kind: 'archive', id: colA })
  item(4, 4, 'D-2', 'the archived page leaves the tree and lists in its Archive',
    !(await heldIds()).has(arcId) && listedA.length === 1 && listedA[0].title === 'Drive Arc' && same(listedA[0].crumbs.map((c) => c.title), ['Collection A', 'Set Alpha']),
    show(listedA))

  await sleep(1000)
  await op('rename Drive Live', { op: 'rename', path: live, kind: 'page', newName: 'Drive Live Renamed' })
  const renamed = page(A_ALPHA, 'Drive Live Renamed')
  item(4, 4, 'C-1', 'a rename reaches the archived file', bodyOf(`${A1}/Drive Arc.md`).includes('[[Drive Live Renamed]]'), show(bodyOf(`${A1}/Drive Arc.md`)))

  const bytes = readRel(`${A1}/Drive Arc.md`)
  const back = await op('restore Drive Arc', { op: 'restore', bundlePath: A1 })
  item(4, 4, 'E-2', 'a restore returns it to its exact place by a plain move',
    exists(arc) && readRel(arc) === bytes && between(orderIn(A_SIDECAR, 'page_order'), [pageA, arcId, follower]) && !exists(A1) && !('unrestored' in back) && !('landedAs' in back),
    show({ back, pageOrder: orderIn(A_SIDECAR, 'page_order') }))

  const again = await bundledBy('archive Drive Arc again', { op: 'archive', path: arc, kind: 'page' })
  const T1 = await bundledBy('delete from the Archive', { op: 'delete', path: again, kind: 'page' })
  item(4, 4, 'E-3', 'a delete from the Archive goes to the Trash keeping the bundle it left',
    stamped(`.trash/${A_ALPHA}`, 'Drive Arc', '.deleted').test(T1) && recordAt(T1).archive === again && !exists(again),
    show({ again, T1, record: T1 && exists(T1) ? recordAt(T1) : null }))

  await op('Undo to the Archive', { op: 'restore', bundlePath: T1, destination: { kind: 'archive' } })
  const undone = exists(`${again}/_record.json`) ? recordAt(again) : null
  item(4, 4, 'E-3', 'its Undo returns it to the Archive under the same name',
    exists(`${again}/Drive Arc.md`) && !!undone && !('archive' in undone) && !('links' in undone) && !('targets' in undone) && !exists(T1) && !(await heldIds()).has(arcId),
    show({ again, undone }))

  const T2 = await bundledBy('delete from the Archive again', { op: 'delete', path: again, kind: 'page' })
  await op('restore from the Trash', { op: 'restore', bundlePath: T2 })
  item(4, 4, 'E-3', 'a Trash restore returns it to where it was archived from', exists(arc) && !exists(T2), show({ T2 }))

  const subId = containerId()
  const SUB = `${A_ALPHA}/Drive Sub`
  await op('create Drive Sub', { op: 'createContainer', id: subId, parentPath: A_ALPHA, kind: 'set', name: 'Drive Sub' })
  const deep = await createAt(cdp, SUB, 'Drive Deep')
  const D1 = await bundledBy('archive Drive Deep', { op: 'archive', path: deep, kind: 'page' })
  await op('move Drive Sub to Collection B', { op: 'moveSet', path: SUB, newParentPath: 'Collection B', order: [...orderIn('Collection B/_pagecollection.json', 'set_order'), subId] })
  const carried = `.nexus/archive/${colB}/${SUB}/${leafOf(D1)}`
  await settles(async () => exists(`${carried}/Drive Deep.md`) && !exists(D1))
  item(4, 4, 'F-6', 'a Set moved to another Collection carries what was archived from within it',
    exists(`${carried}/Drive Deep.md`) && same(recordAt(carried).trail, [colB]) && !exists(D1),
    show({ carried, record: exists(carried) ? recordAt(carried) : null, D1: exists(D1) }))

  await op('move Drive Sub into Set Alpha', { op: 'moveSet', path: 'Collection B/Drive Sub', newParentPath: B_ALPHA, order: [...before.bAlphaSets, subId] })
  await settles(async () => same(recordAt(carried).trail, [colB, bAlphaId]))
  item(4, 4, 'F-6', 'a Set moved within its Collection rewrites the trail alone',
    exists(`${carried}/Drive Deep.md`) && same(recordAt(carried).trail, [colB, bAlphaId]),
    show(exists(carried) ? recordAt(carried) : null))

  const collId = containerId()
  await op('create Drive Coll', { op: 'createContainer', id: collId, parentPath: '', kind: 'collection', name: 'Drive Coll' })
  const kept = await createAt(cdp, 'Drive Coll', 'Drive Kept')
  await bundledBy('archive Drive Kept', { op: 'archive', path: kept, kind: 'page' })
  await op('delete Drive Coll', { op: 'delete', path: 'Drive Coll', kind: 'collection' })
  const collArchive = `.nexus/archive/${collId}`
  // One relaunch serves both: the open pass sweeps an Archive whose Collection exists nowhere and keeps one whose Collection sits in the Trash.
  const gone = containerId()
  const orphanBundle = `.nexus/archive/${gone}/Drive Gone/2026-10-20T00-00-00-000Z__Drive Orphan.md.archived`
  const orphanRecord = { entity: 'page', parent: { id: containerId(), kind: 'container' } }
  cdp = await relaunch(cdp, async () => {
    mkdirSync(abs(orphanBundle), { recursive: true })
    writeFileSync(abs(`${orphanBundle}/Drive Orphan.md`), `---\nID: ${mintPageId()}\n---\norphan\n`)
    writeFileSync(abs(`${orphanBundle}/_record.json`), JSON.stringify(orphanRecord))
  })
  const sweptBundles = () => (exists('.trash/Drive Gone') ? readdirSync(abs('.trash/Drive Gone')).filter((n) => n.endsWith('__Drive Orphan.md.deleted')) : [])
  await settles(async () => sweptBundles().length === 1 && !exists(`.nexus/archive/${gone}`))
  const swept = sweptBundles()
  item(4, 4, 'F-5', 'an Archive whose Collection exists nowhere moves into the Trash at the next open',
    swept.length === 1 && same(recordAt(`.trash/Drive Gone/${swept[0]}`), orphanRecord) && !exists(`.nexus/archive/${gone}`),
    show({ swept, archive: exists(`.nexus/archive/${gone}`) }))

  const standing = exists(collArchive)
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  const collRow = (await rows({ kind: 'trash' })).find((r) => r.title === 'Drive Coll')
  if (collRow) await emptyAt(collRow.bundlePath)
  item(4, 4, 'F-4', 'a Collection in the Trash keeps its Archive, and emptying it empties both',
    standing && !!collRow && !exists(collArchive) && !exists(collRow.bundlePath), show({ standing, collRow }))

  const trashOf = async (title) => (await rows({ kind: 'trash' })).find((r) => r.title === title)?.bundlePath
  for (const [title, rel] of [['Drive Arc', arc], ['Drive Live Renamed', renamed]]) {
    await op(`delete ${title}`, { op: 'delete', path: rel, kind: 'page' })
    await emptyAt(await trashOf(title))
  }
  await op('delete Drive Deep from the Archive', { op: 'delete', path: carried, kind: 'page' })
  await emptyAt(await trashOf('Drive Deep'))
  await op('delete Drive Sub', { op: 'delete', path: `${B_ALPHA}/Drive Sub`, kind: 'set' })
  await emptyAt(await trashOf('Drive Sub'))
  await emptyAt(`.trash/Drive Gone/${swept[0]}`)
  await must('permanentDelete as it was', ask(cdp, 'personalization:set', 'permanentDelete', before.permanentDelete))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, and a removal inside that hold reaches the app as nothing, so the chain folders leave once the empties' writes are still.
  await sleep(400)
  for (const id of [colA, colB]) rmSync(abs(`.nexus/archive/${id}`), { recursive: true, force: true })
  for (const rel of CHAINS) if (!before.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
  const after = {
    pageOrder: orderIn(A_SIDECAR, 'page_order'),
    bSets: orderIn('Collection B/_pagecollection.json', 'set_order'),
    bAlphaSets: orderIn(`${B_ALPHA}/_pageset.json`, 'set_order'),
    collections: stateOrder().collections ?? [],
    trash: (await rows({ kind: 'trash' })).length,
    archiveA: (await rows({ kind: 'archive', id: colA })).length,
    archiveB: (await rows({ kind: 'archive', id: colB })).length,
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
    chains: CHAINS.filter(exists),
  }
  item(4, 4, '—', 'the group leaves Collections A and B, their Archives, and the Trash as it found them', same(after, before), show({ before, after }))
}

// ── Group 5 — Shared Chrome (Phase 5) ───────────────────────────────────────

const LABEL = `document.querySelector('[role=status], [role=alert]')`
const drained = (cdp) => cdp.evaluate(`${LABEL}.hasAttribute('inert')`)
const moveTo = (cdp, { x, y }) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
const g5Row = (title) => `[...document.querySelectorAll('.trash-row')].find((r) => r.querySelector('[role=checkbox]')?.getAttribute('aria-label') === ${JSON.stringify(`Select ${title}`)})`
const checkRow = (cdp, title) => click(cdp, `${g5Row(title)}.querySelector('[role=checkbox]')`)
const listedTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.trash-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
/** Each face of the one swap inside `expr`, in its order: shown or hidden, and whether it's inert and unnamed. */
const facesOf = (cdp, expr) =>
  cdp.evaluate(`[...(${expr}).querySelectorAll('[data-face]')].map((f) => ({ face: f.dataset.face, text: f.textContent.trim(), inert: f.hasAttribute('inert'), hidden: f.getAttribute('aria-hidden') === 'true' }))`)
const quiet = (f) => f.face === 'hidden' && f.inert && f.hidden
const loud = (f) => f.face === 'shown' && !f.inert && !f.hidden
const widthOf = (cdp, expr) => cdp.evaluate(`(${expr}).getBoundingClientRect().width`)
/** A settings row from its label's own text: the label, its title column, then the row. */
const settingRow = (label) => `${textEl('span', label)}.parentElement.parentElement`
const captionOf = (cdp, label) => cdp.evaluate(`${textEl('span', label)}.nextElementSibling?.textContent ?? null`)

async function group5(cdp) {
  const kept = settingsOnDisk().personalization ?? {}
  const A_SIDECAR = `${A_ALPHA}/_pageset.json`
  const standing = async () => ({
    pageOrder: orderIn(A_SIDECAR, 'page_order'),
    trash: (await rows({ kind: 'trash' })).length,
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
  })
  const start = await standing()
  const titles = ['G5 One', 'G5 Two', 'G5 Note', 'G5 Note Long']
  for (const t of titles) await createPage(cdp, t)
  await createPage(cdp, 'G5 Diff')
  await sleep(400)
  writeBody('G5 Diff', '```diff\n+a\n+b\n-c\n```\n')
  for (const t of titles) {
    await deleteAt(cdp, page(A_ALPHA, t), 'page')
    await sleep(50)
  }
  const bundles = {}
  for (const t of titles) bundles[t] = (await trashed(cdp, t))?.bundlePath

  await openSettings(cdp, 'Trash')
  await until('the Trash rows', async () => (await listedTitles(cdp)).includes('G5 One'))
  const look = await cdp.evaluate(`(() => { const f = document.querySelector('.trash-frame.table'); const [search, head] = f?.children ?? []; const rows = [...(f?.querySelectorAll('.trash-row.table-divider') ?? [])]; return !!f && !!search?.matches('.nav-search-row') && !!head?.matches('.trash-head.table-head') && !!head.querySelector('.trash-head-name') && !!head.querySelector('.trash-head-date') && rows.length > 0 && rows.every((r) => head.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) })()`)
  const listed = await listedTitles(cdp)
  item(5, 5, 'G-1', 'the Trash keeps its look and lists newest first',
    look && same(listed.slice(0, 4), [...titles].reverse()), show({ look, listed }))
  await shot(cdp, 'g5-trash')

  const SEARCH = `document.querySelector('.trash-frame .nav-search-row input')`
  await cdp.evaluate(`${SEARCH}.focus()`)
  await typeText(cdp, 'g5 note')
  const narrowed = await settles(async () => same(await listedTitles(cdp), ['G5 Note Long', 'G5 Note']))
  const found = await listedTitles(cdp)
  await cdp.evaluate(`${SEARCH}.select()`)
  await pressKey(cdp, 'Backspace')
  const cleared = await settles(async () => same(await listedTitles(cdp), listed))
  item(5, 5, 'G-1', 'typed search narrows in place, keeping newest first', narrowed && cleared, show({ found, after: await listedTitles(cdp) }))

  const single = await chooseNative(cdp, g5Row('G5 One'), [])
  item(5, 5, 'K-4', "one row's menu reads Restore and Delete", same(single.rows, ['Restore', 'Delete']), show(single.rows))

  for (const t of ['G5 One', 'G5 Two']) await checkRow(cdp, t)
  const onChecked = await chooseNative(cdp, g5Row('G5 Two'), [])
  const onUnchecked = await chooseNative(cdp, g5Row('G5 Note'), [])
  item(5, 5, 'K-4', "a checked row's menu names the batch; an unchecked one acts alone",
    same(onChecked.rows, ['Restore All', 'Delete All']) && same(onUnchecked.rows, ['Restore', 'Delete']), show({ onChecked, onUnchecked }))

  const { chosen: restoredAll } = await chooseNative(cdp, g5Row('G5 Two'), 'Restore All')
  const restoredSaid = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
  const near = await boxOf(cdp, LABEL)
  await moveTo(cdp, near)
  await moveTo(cdp, { x: near.x + 10, y: near.y })
  const drainedUnder = await settles(() => drained(cdp), 4500)
  const back = ['G5 One', 'G5 Two']
  const after = await listedTitles(cdp)
  item(5, 5, 'K-4', 'Restore All restores the checked rows',
    restoredAll && restoredSaid && back.every((t) => exists(page(A_ALPHA, t)) && !!bundles[t] && !exists(bundles[t])) && !after.some((t) => back.includes(t)),
    show({ restoredAll, after, notice: await notice(cdp) }))
  item(5, 5, 'K-3', 'a notice posted under the pointer drains', drainedUnder)

  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const t of ['G5 Note', 'G5 Note Long']) await checkRow(cdp, t)
  const { chosen: deletedAll } = await chooseNative(cdp, g5Row('G5 Note'), 'Delete All')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  const asked = await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`)
  await click(cdp, `[...${DIALOG}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')`)
  const deletedSaid = await settles(async () => (await notice(cdp)).startsWith('Deleted 2 Pages'))
  const far = await cdp.evaluate(`({ x: 8, y: innerHeight - 8 })`)
  await moveTo(cdp, far)
  const band = await boxOf(cdp, LABEL)
  await moveTo(cdp, band)
  const stalled = await holds(async () => !(await drained(cdp)), 5000)
  await moveTo(cdp, far)
  const drainedAway = await settles(() => drained(cdp), 4500)
  const gone = ['G5 Note', 'G5 Note Long']
  item(5, 5, 'K-4', 'Delete All empties the checked rows',
    deletedAll && asked === 'Delete these 2 Items?' && gone.every((t) => !!bundles[t] && !exists(bundles[t])) && deletedSaid,
    show({ deletedAll, asked, notice: await notice(cdp) }))
  item(5, 5, 'K-3', 'once the pointer has left its band, returning stalls the drain and leaving drains it', stalled && drainedAway, show({ stalled, drainedAway }))

  const trashStyle = () => (settingsOnDisk().personalization ?? {}).trashColumnStyle
  const { chosen: short } = await chooseNative(cdp, sel('.trash-head-date'), 'Short Date')
  const picked = await settles(async () => same(trashStyle(), { date_format: 'short' }))
  const { chosen: full } = await chooseNative(cdp, sel('.trash-head-date'), 'Full Date')
  const returned = await settles(async () => !('trashColumnStyle' in (settingsOnDisk().personalization ?? {})))
  item(5, 5, 'G-1', "the date column's right-click picks a style and returns to the Nexus's own",
    short && picked && full && returned, show({ short, full, style: trashStyle() }))

  await must('iconFavorites', ask(cdp, 'personalization:set', 'iconFavorites', ['alarm-clock']))
  await until('the favorites in the tree', async () => same((await config(cdp)).personalization.iconFavorites, ['alarm-clock']))
  await closeSettings(cdp)
  await openCollection(cdp)
  await openPage(cdp, 'G5 One')
  const TITLE = `[...document.querySelectorAll('.detail-title-text')].find((e) => !e.closest('[inert]') && e.textContent.trim() === 'G5 One')`
  const { chosen: editIcon } = await chooseNative(cdp, TITLE, 'Edit Icon')
  const GRID = `document.querySelector('[data-picker-portal] .scroll-fade')`
  const geometry = () =>
    cdp.evaluate(`(() => { const grid = ${GRID}; const list = grid.lastElementChild; const strip = grid.firstElementChild === list ? null : grid.firstElementChild; const rows = [...list.children].map((r) => r.getBoundingClientRect()); const g = grid.getBoundingClientRect(); return { stripBottom: strip?.getBoundingClientRect().bottom ?? null, listTop: list.getBoundingClientRect().top, listHeight: list.offsetHeight, gridTop: g.top, gridHeight: grid.clientHeight, rows: rows.map((r) => ({ top: r.top, bottom: r.bottom })) } })()`)
  const atTop = await until('the icon list', async () => { const g = await geometry(); return g.rows.length > 0 && g.listHeight > g.gridHeight + 600 && g })
  await cdp.evaluate(`${GRID}.scrollTop = 600`)
  await sleep(300)
  const scrolled = await geometry()
  const total = Math.round(scrolled.listHeight / (scrolled.rows[0].bottom - scrolled.rows[0].top))
  await pressKey(cdp, 'Escape')
  const closed = await settles(async () => !(await portalOpen(cdp)))
  item(5, 5, '4.7', "the icon picker's rows sit where its list starts and virtualize while scrolled",
    editIcon && atTop.stripBottom !== null && atTop.listTop >= atTop.stripBottom && Math.abs(atTop.rows[0].top - atTop.listTop) < 0.5 &&
      scrolled.rows.length < total && scrolled.rows.some((r) => r.top <= scrolled.gridTop && r.bottom > scrolled.gridTop) && closed,
    show({ editIcon, atTop: { ...atTop, rows: atTop.rows.slice(0, 2) }, scrolled: { ...scrolled, rows: scrolled.rows.length }, total, closed }))

  const ROW = `${sidebarRow(COLLECTION)}.closest('.row')`
  const lockButton = (label) => `${ROW}.querySelector('[aria-label="${label}"]')`
  await must('lock Collection A', ask(cdp, 'mutate', { op: 'setDisclosureLock', path: COLLECTION, kind: 'collection', locked: true }))
  await until('the Unlock Folder button', () => cdp.evaluate(`!!${lockButton('Unlock Folder')}`))
  const [openFace, closedFace] = await facesOf(cdp, lockButton('Unlock Folder'))
  // Only an unlock pressed on the lock keeps its open face up, until the pointer leaves the row; an unlock from elsewhere takes the button away at once.
  await hover(cdp, ROW)
  await mouseClick(cdp, lockButton('Unlock Folder'))
  const lockShown = await settles(() => cdp.evaluate(`!!${lockButton('Lock Folder')}`))
  const [openAgain, closedAgain] = lockShown ? await facesOf(cdp, lockButton('Lock Folder')) : []
  item(5, 5, 'G-6', 'the lock glyph cross-fades through the one swap',
    !!openFace && loud(closedFace) && quiet(openFace) && lockShown && loud(openAgain) && quiet(closedAgain),
    show({ locked: [openFace, closedFace], unlocked: [openAgain, closedAgain] }))

  await openSettings(cdp, 'Files & Links')
  const CLEAR = `${settingRow('Clear History')}.querySelector('button')`
  await cdp.evaluate(`${CLEAR}.scrollIntoView({ block: 'center' })`)
  await sleep(300)
  const idle = await facesOf(cdp, CLEAR)
  const w = await widthOf(cdp, CLEAR)
  await mouseClick(cdp, CLEAR)
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  await click(cdp, `[...${DIALOG}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Clear')`)
  const marked = await settles(async () => (await facesOf(cdp, CLEAR)).find(loud)?.text === 'Cleared')
  const [clearFace] = await facesOf(cdp, CLEAR)
  const markedWidth = await widthOf(cdp, CLEAR)
  await sleep(1800)
  const returnedFace = (await facesOf(cdp, CLEAR)).find(loud)?.text
  item(5, 5, 'G-6', 'Clear History cross-fades to Cleared, holds, and returns',
    idle.find(loud)?.text === 'Clear' && marked && clearFace?.text === 'Clear' && quiet(clearFace) && Math.abs(markedWidth - w) < 0.5 && returnedFace === 'Clear',
    show({ idle, w, marked, clearFace, markedWidth, returnedFace }))

  await closeSettings(cdp)
  await openCollection(cdp)
  await openPage(cdp, 'G5 Diff')
  // The tag draws only off the fence line, so the caret rests past the block.
  await cdp.evaluate(`(() => { const v = ${PAGE_VIEW}; v.dispatch({ selection: { anchor: v.state.doc.length } }) })()`)
  const TALLY = `[...document.querySelectorAll('.codeblock-tally')].find((e) => !e.closest('[inert]'))`
  await until('the diff tally', () => cdp.evaluate(`!!${TALLY}`))
  const pillWidth = await widthOf(cdp, TALLY)
  await mouseClick(cdp, TALLY)
  const [counts, copied] = await facesOf(cdp, TALLY)
  const copiedWidth = await widthOf(cdp, TALLY)
  const tagged = await cdp.evaluate(`(${TALLY}).closest('.codeblock-language').classList.contains('is-copied')`)
  await sleep(1800)
  const [countsBack] = await facesOf(cdp, TALLY)
  const untagged = await cdp.evaluate(`!(${TALLY}).closest('.codeblock-language').classList.contains('is-copied')`)
  item(5, 5, 'G-6', 'the diff tally swaps its counts for Copied in place',
    counts?.face === 'hidden' && copied?.face === 'shown' && copied.text === 'Copied' && Math.abs(copiedWidth - pillWidth) < 0.5 && tagged && countsBack?.face === 'shown' && untagged,
    show({ counts, copied, pillWidth, copiedWidth, tagged, countsBack, untagged }))

  await openSettings(cdp, 'Files & Links')
  const permanentHint = await captionOf(cdp, 'Permanently Delete Files')
  const confirmHint = await captionOf(cdp, 'Confirm Before Deletion')
  item(5, 5, 'K-5', "Settings › Files & Links' Deletion section reads its rewritten hints",
    permanentHint === 'Erase items emptied from the Trash instead of moving them to the system trash.' &&
      !!confirmHint?.endsWith('Collections, Sets, Contexts, Spaces, views and properties always ask.'),
    show({ permanentHint, confirmHint }))
  await closeSettings(cdp)

  const made = ['G5 One', 'G5 Two', 'G5 Diff']
  for (const t of made) {
    await deleteAt(cdp, page(A_ALPHA, t), 'page')
    await must(`empty ${t}`, ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: (await trashed(cdp, t))?.bundlePath }))
  }
  for (const key of ['permanentDelete', 'iconFavorites']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
  const ended = await standing()
  item(5, 5, '—', 'the group leaves Set Alpha and the Trash as it found them',
    same(ended, start) && !made.some((t) => exists(page(A_ALPHA, t))), show({ start, ended }))
}

// ── The run ─────────────────────────────────────────────────────────────────

let cdp
try {
  cdp = (await launch(PORT, 'archive-shots')).cdp
  // Collection A's one saved view draws cards, so the run shows a table of its own, which the harness's restore takes back.
  const table = { id: 'view_01KZARCHIVEDRIVE0000TABLE', name: 'Drive Table', type: 'table', property_order: ['_title'], hidden_properties: [] }
  await must('save the Drive Table', ask(cdp, 'views:save', 'Collection A', 'collection', table, {}))
  await must('show the Drive Table', ask(cdp, 'mutate', { op: 'setActiveView', path: 'Collection A', kind: 'collection', viewId: table.id }))
  if (GROUPS.has('1')) await group1(cdp)
  if (GROUPS.has('2')) await group2(cdp)
  if (GROUPS.has('3')) await group3()
  if (GROUPS.has('4')) await group4()
  if (GROUPS.has('5')) await group5(cdp)
  cdp.close()
} catch (e) {
  item(0, 1, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
const count = (f) => ledger.filter(f).length
console.log('\ngroup  pass  fail  ahead  await')
for (const g of ['0', ...ALL].filter((g) => g === '0' || GROUPS.has(g))) {
  const of = (m) => count((r) => r.group === g && r.mark === m)
  console.log(`${g.padStart(5)} ${String(of('PASS')).padStart(5)} ${String(of('FAIL')).padStart(5)} ${String(of('AHEAD')).padStart(6)} ${String(of('AWAIT')).padStart(6)}`)
}
console.log(`${results.filter((r) => r.pass).length}/${results.length} held (an item awaiting a later phase than ${LANDED} holds by definition)`)
process.exit(results.every((r) => r.pass) ? 0 : 1)
