import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import {
  ask, chooseNative, click, escapeAll, FM, launch, mintPageId, mouseClick, must, NEXUS, openCollection, openPage,
  pageIds, pressKey, relaunch, restore, results, settles, shot, sleep, typeText, until,
} from '../drive-harness.mjs'

const PORT = 9393
// The plan's phases in order, named as the plan names them, so `6A` sorts before `6B`.
const PHASES = ['1', '2', '3', '4', '5', '6A', '6B']
const at = (phase) => PHASES.indexOf(String(phase))
const ALL = ['1', '2', '3']
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
async function group3(cdp) {
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

  // The seeds leave as they came, from outside, and the deleted property's bundle is emptied, so a later group meets Collection A, its Archive, and the Trash as group 3 found them.
  for (const rel of [live.rel, linker.rel, withheld.dir, `.nexus/archive/${colA}`]) rmSync(abs(rel), { recursive: true, force: true })
  await until('the seeds out of the tree', async () => !treePaths((await must('nexus:state', ask(cdp, 'nexus:state'))).tree).has(live.rel))
  const stageRow = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === 'Drive Stage')
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  if (stageRow) await must('empty Drive Stage', ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: stageRow.bundlePath }))
  await must('permanentDelete off', ask(cdp, 'personalization:set', 'permanentDelete', false))
  const left = ((await ask(cdp, 'bundles:list', { kind: 'archive', id: colA })).value ?? []).length
  item(3, 3, '—', 'the group leaves Collection A’s Archive and the Trash as it found them', left === 0 && !exists(`.nexus/archive/${colA}`) && !((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).some((r) => r.title === 'Drive Stage'), show({ left }))
  return cdp
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
  if (GROUPS.has('3')) cdp = await group3(cdp)
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
