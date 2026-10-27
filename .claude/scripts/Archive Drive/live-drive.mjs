import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import {
  optionId,
  activeTab, ask, boxOf, chooseNative, click, closeSettings, createPage, DIALOG, doubleClick, escapeAll, FM, holds, hover, labels, launch, mintPageId, mouseAt,
  mouseClick, must, nativeRows, NEXUS, notice, openCollection, openPage, openSettings, PAGE_VIEW, pageIds, pickNative, popNative, portalOpen, pressDialog, pressKey,
  item, menuByEvent, META, RAIL, refusal, relaunch, resizeBy, restore, ribbon, row, sel, SETTINGS_BUTTON, settles, shot, sleep, tally, textEl, trashRowEl, typeText, until, watch, writeBody,
} from '../drive-harness.mjs'

const PORT = 9393
// The plans' phases in order, named as the plans name them: the Archive's, then Disclosable Bundles' 7, whose remaining options 7B to 7D drive.
const PHASES = ['1', '2', '3', '4', '5', '6A', '6B', '7', '7B', '7C', '7D']
const GROUPS = new Set(process.argv.slice(2))
if (GROUPS.size === 0 || [...GROUPS].some((g) => !PHASES.includes(g))) {
  console.error(`usage: node live-drive.mjs <group…>   (groups ${PHASES.join(', ')}, each a plan phase of its name, 7B to 7D the rest of Phase 7's options)`)
  process.exit(2)
}

// ── Items ───────────────────────────────────────────────────────────────────

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
async function sidebarTo(cdp, mode, title) {
  if (!(await cdp.evaluate(`!!(${sidebarRow(title)})`))) await click(cdp, ribbon(mode))
  await until(`${title} in the sidebar`, () => cdp.evaluate(`!!(${sidebarRow(title)})`))
  await click(cdp, sidebarRow(title))
}
const drawn = (cdp, title) => cdp.evaluate(`!!(${sidebarRow(title)})`)
/** Scrolled into the Settings body's view first, since a press lands where the element is drawn. */
async function press(cdp, expr) {
  await cdp.evaluate(`(${expr}).scrollIntoView({ block: 'center' })`)
  await sleep(300)
  await mouseClick(cdp, expr)
}
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
  await pressDialog(cdp, 'Delete')
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
  item(1, 'K-1', 'a renamed Set carries its excluded entry to the landing',
    renamed.ok && same(settingsOnDisk().excluded_folders, [`${MOVED}/Private`]) && same(carried, [`${MOVED}/Private`]),
    show({ renamed, onDisk: settingsOnDisk().excluded_folders, carried }))
  item(1, 'K-1', 'the carried folder moves with the Set and is never read as one',
    untouched(`${MOVED}/Private`) && !exists(LIFT), show(exists(MOVED) && readdirSync(abs(MOVED))))

  const { menu, asked } = await deleteFromSidebar(cdp, 'AR Moved')
  await settles(async () => exists(LIFTED) && !exists(MOVED))
  await sleep(800)
  await shot(cdp, 'g1-lifted')
  const bundle = bundleOf('AR Moved')
  const record = bundle ? JSON.parse(readRel(`.trash/${COLLECTION}/${bundle}/_record.json`)) : null
  item(1, 'F-3', "the sidebar's Delete asks, and the Set goes to the Trash",
    menu.chosen && asked === 'Delete “AR Moved”?' && !exists(MOVED) && !!bundle, show({ menu, asked, bundle }))
  item(1, 'F-3', 'its excluded folder is left behind in Collection A, untouched',
    untouched(LIFTED), show(exists(LIFTED) && readdirSync(abs(LIFTED))))
  item(1, 'F-3', "the folder's entry follows it",
    same(settingsOnDisk().excluded_folders, [LIFTED]), show(settingsOnDisk().excluded_folders))
  item(1, 'F-3', 'the bundle holds no excluded folder, and its record names none',
    !!record && !exists(`.trash/${COLLECTION}/${bundle}/AR Moved/Private`) && !('excluded' in record), show(record))
  item(1, 'F-3', 'the sidebar draws neither the Set nor the lifted folder',
    !(await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  const back = await ask(cdp, 'mutate', { op: 'restore', bundlePath: `.trash/${COLLECTION}/${bundle}` })
  await settles(() => drawn(cdp, 'AR Moved'))
  item(1, 'F-2', 'the restored Set returns without the folder, which stays where it was left',
    back.ok && exists(`${MOVED}/_pageset.json`) && !exists(`${MOVED}/Private`) && untouched(LIFTED) && same(settingsOnDisk().excluded_folders, [LIFTED]),
    show({ back, moved: exists(MOVED) && readdirSync(abs(MOVED)), excluded: settingsOnDisk().excluded_folders }))
  item(1, 'F-2', 'the sidebar draws the Set again, and never the folder',
    (await drawn(cdp, 'AR Moved')) && !(await drawn(cdp, 'Private')))

  await makeSet(cdp, 'AR Second')
  await exclude(cdp, [LIFTED, `${COLLECTION}/AR Second/Private`])
  setAside(`${COLLECTION}/AR Second/Private`)
  const second = await ask(cdp, 'mutate', { op: 'delete', path: `${COLLECTION}/AR Second`, kind: 'set' })
  await settles(async () => exists(`${LIFTED} (2)`))
  item(1, 'F-2', 'a folder lifted onto a namesake steps aside to Private (2), its entry following',
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
  item(1, 'K-1', 'a renamed Set carries the asset directory to the landing, the asset file with it',
    carriedAsset.ok && exists(`${MEDIA}/Media/Pixel.png`) && !exists(`${MEDIA}/Media/_pageset.json`) &&
      (await config(cdp)).assetDirectory === `${MEDIA}/Media` && same(settingsOnDisk().excluded_folders, [LIFTED, `${LIFTED} (2)`]),
    show({ carriedAsset, onDisk: settingsOnDisk() }))

  const media = await ask(cdp, 'mutate', { op: 'delete', path: MEDIA, kind: 'set' })
  await settles(async () => exists(`${COLLECTION}/Media/Pixel.png`))
  item(1, 'F-2', 'the asset directory is left behind by a trashed Set, its setting following',
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
  item(2, 'E-2', 'a page delete drops its id from its folder’s page_order', !orderIn(sidecar, 'page_order').includes(three[1]), show(orderIn(sidecar, 'page_order')))
  const listed = await trashed(cdp, 'AR Middle')
  item(2, 'A-3', 'bundles:list answers the Trash’s row with its stored time', typeof listed?.storedAt === 'number', show(listed))
  await must('restore AR Middle', restoreRow(cdp, 'AR Middle'))
  item(2, 'E-2', 'a page restored lands between its old neighbours in page_order', between(orderIn(sidecar, 'page_order'), three), show(orderIn(sidecar, 'page_order')))
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await unfold(cdp, COLLECTION, 'Set Alpha')
  await unfold(cdp, 'Set Alpha', 'AR Middle')
  const sidebarOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(titles)}.includes(t))`)
  item(2, 'E-2', 'the sidebar draws the three in that order', show(sidebarOrder) === show(titles), show(sidebarOrder))

  const sets = []
  for (const name of ['AR Set One', 'AR Set Two', 'AR Set Three']) sets.push(await createSetIn(cdp, name))
  await deleteAt(cdp, 'Collection A/AR Set Two', 'set')
  await must('restore AR Set Two', restoreRow(cdp, 'AR Set Two'))
  const setOrder = orderIn('Collection A/_pagecollection.json', 'set_order')
  item(2, 'E-2', 'a Set restored lands between its old neighbours in set_order', between(setOrder, sets), show(setOrder))

  const coll = containerId()
  await must('create AR Coll', ask(cdp, 'mutate', { op: 'createContainer', id: coll, parentPath: '', kind: 'collection', name: 'AR Coll' }))
  const held = (await heldTree(cdp)).collections.filter((c) => c.id !== coll)
  const tops = held.map((c) => c.id)
  const a = (await collectionA(cdp)).id
  const next = tops[tops.indexOf(a) + 1]
  const ring = [COLLECTION, 'AR Coll', held.find((c) => c.id === next)?.title]
  await must('place AR Coll', ask(cdp, 'mutate', { op: 'reorderTop', order: tops.flatMap((id) => (id === a ? [id, coll] : [id])) }))
  await deleteAt(cdp, 'AR Coll', 'collection')
  item(2, 'E-2', 'a Collection delete drops its id from state.order.collections', !(stateOrder().collections ?? []).includes(coll), show(stateOrder().collections))
  await must('restore AR Coll', restoreRow(cdp, 'AR Coll'))
  item(2, 'E-2', 'a Collection restored lands between its old neighbours in state.order.collections', between(stateOrder().collections ?? [], [a, coll, next]), show(stateOrder().collections))
  await until('AR Coll in the sidebar', () => drawn(cdp, 'AR Coll'))
  const topOrder = await cdp.evaluate(`[...document.querySelectorAll('.tree-item')].map((e) => e.textContent.trim()).filter((t) => ${JSON.stringify(ring)}.includes(t))`)
  item(2, 'E-2', 'the sidebar draws the restored Collection between them', show(topOrder) === show(ring), show(topOrder))

  const group = (await heldTree(cdp)).contexts.find((g) => g.spaces.length >= 2)
  const space = containerId()
  const [s0, s1, ...rest] = group.spaces.map((s) => s.id)
  await must('create AR Space', ask(cdp, 'mutate', { op: 'createSpace', id: space, contextId: group.def.id, name: 'AR Space', order: [s0, space, s1, ...rest] }))
  await deleteAt(cdp, `.nexus/contexts/${group.def.title}/AR Space`, 'space')
  item(2, 'E-2', 'a Space delete drops its id from its Context’s order', !(stateOrder().spaces?.[group.def.id] ?? []).includes(space), show(stateOrder().spaces?.[group.def.id]))
  await must('restore AR Space', restoreRow(cdp, 'AR Space'))
  item(2, 'E-2', 'a Space restored lands between its old neighbours in its Context’s order', between(stateOrder().spaces?.[group.def.id] ?? [], [s0, space, s1]), show(stateOrder().spaces?.[group.def.id]))

  await createAt(cdp, A_ALPHA, 'AR Squat')
  await deleteAt(cdp, page(A_ALPHA, 'AR Squat'), 'page')
  writeFileSync(abs(page(A_ALPHA, 'AR Squat')), `---\nID: ${mintPageId().replace(/^(.{10})P/, '$1T')}\n---\nsquatter`)
  await sleep(1500)
  await openSettings(cdp, 'Trash')
  const { chosen } = await chooseNative(cdp, trashRowEl('AR Squat'), 'Restore')
  const said = await settles(async () => (await notice(cdp)).includes('Restored “AR Squat” as “AR Squat (2)”'))
  item(2, 'E-4', 'a page restored onto an outside file steps aside, and the Trash names the title it took',
    chosen && said && exists(page(A_ALPHA, 'AR Squat (2)')) && readRel(page(A_ALPHA, 'AR Squat')).endsWith('squatter'), show({ chosen, notice: await notice(cdp) }))
  await closeSettings(cdp)

  await createSetIn(cdp, 'AR Excl')
  await deleteAt(cdp, 'Collection A/AR Excl', 'set')
  const excluded = JSON.parse(readRel('.nexus/settings.json')).excluded_folders ?? []
  await must('exclude its origin', ask(cdp, 'exclusions:set', [...excluded, 'Collection A/AR Excl']))
  const settingsBefore = readRel('.nexus/settings.json')
  const back = await restoreRow(cdp, 'AR Excl')
  item(2, 'E-4', 'a Set restored onto an excluded entry steps aside, settings.json unchanged',
    back?.value?.landedAs === 'AR Excl (2)' && exists('Collection A/AR Excl (2)/_pageset.json') && readRel('.nexus/settings.json') === settingsBefore, show(back))
  await must('the exclusions as they were', ask(cdp, 'exclusions:set', excluded))

  for (const t of ['AR Look One', 'AR Look Two']) {
    await createAt(cdp, A_ALPHA, t)
    await deleteAt(cdp, page(A_ALPHA, t), 'page')
  }
  await openSettings(cdp, 'Trash')
  const drawnRows = await listedTitles(cdp)
  const answered = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).map((r) => r.title)
  item(2, 'A-3', 'the Trash browser draws the titles bundles:list answers, in its order', same(drawnRows, answered), show({ drawnRows, answered }))
  for (const t of ['AR Look One', 'AR Look Two']) await checkRow(cdp, t)
  const { chosen: all } = await chooseNative(cdp, trashRowEl('AR Look One'), 'Restore All')
  const batch = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
  item(2, 'A-3', 'a Restore All of two reads Restored 2 Pages', all && batch, show(await notice(cdp)))
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
  const { created: { propertyId: stage } } = await must('add Drive Stage', ask(cdp, 'mutate', { op: 'addProperty', containerPath: 'Collection A', draft: {
    label: 'Drive Stage',
    type: 'select',
    select_options: [{ key: 'Draft', label: 'Draft' }],
  } }))
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
  item(3, 'D-2', 'the tree holds the live pages and never the archived one', held.has(live.rel) && ![...held].some((p) => p.startsWith('.nexus/') || p.endsWith('/Drive Arc.md')), show([...held].filter((p) => p.includes('Drive'))))
  await openCollection(cdp)
  const search = `document.querySelector('.detail-title-search')`
  await cdp.evaluate(`${search}.focus()`)
  await typeText(cdp, 'Drive')
  const drive = [live.id, linker.id, arc.id]
  const filtered = async () => { const rows = await rowIds(cdp); return rows.length > 0 && rows.every((id) => drive.includes(id)) && rows }
  const shown = await until('the search’s rows', filtered).catch(() => rowIds(cdp))
  item(3, 'D-2', "Collection A's view search for Drive lists Drive Live and never Drive Arc", shown.includes(live.id) && !shown.includes(arc.id), show(shown))
  await shot(cdp, 'g3-view-search')
  await cdp.evaluate(`(() => { const i = ${search}; i.select() })()`)
  await pressKey(cdp, 'Backspace')
  pageIds['Drive Linker'] = linker.id
  await openPage(cdp, 'Drive Linker')
  const drawn = await cdp.evaluate(`(() => { const line = [...document.querySelectorAll('.cm-content .cm-line')].find((l) => l.textContent.includes('Drive Arc')); return line ? { phantom: !!line.querySelector('.md-connection-phantom'), resolved: !!line.querySelector('.md-connection-resolved') } : null })()`)
  item(3, 'D-1', 'a link naming the archived page draws unresolved', drawn?.phantom === true && drawn.resolved === false, show(drawn))
  await shot(cdp, 'g3-phantom')
  await escapeAll(cdp)

  const graph = await must('matrix:graph', ask(cdp, 'matrix:graph', true))
  item(3, 'K-2', 'the Matrix graph holds the live page and the one the tree withholds, and no archived page or edge', live.id in graph.values && withheld.id in graph.values && !(arc.id in graph.values) && graph.links.every((l) => !l.path.startsWith('.nexus/')), show(Object.keys(graph.values).length))
  const asked = await must('matrix:graph by path', ask(cdp, 'matrix:graph', false, [arc.rel]))
  item(3, 'K-2', 'the Matrix graph asked for the archived path answers no id', asked.ids.length === 0, show(asked.ids))
  const headings = await must('index:headings', ask(cdp, 'index:headings'))
  const archivedHeadings = await must('index:headings by path', ask(cdp, 'index:headings', [arc.rel]))
  item(3, 'K-2', 'the headings answer no archived path, whole or asked by path', !Object.keys(headings).some((p) => p.startsWith('.nexus/')) && Object.keys(archivedHeadings).length === 0, show(Object.keys(archivedHeadings)))
  const loaded = await must('view:loadValues', ask(cdp, 'view:loadValues', 'Collection A'))
  item(3, 'K-2', "Collection A's value load reads the tree's pages, never the archived one or one under a Set whose sidecar doesn't parse", live.id in loaded && !(arc.id in loaded) && !(withheld.id in loaded), show(Object.keys(loaded).length))

  const count = await must('property:holders', ask(cdp, 'property:holders', stage, { of: 'property' }))
  item(3, 'C-4', 'the delete confirmation’s count leaves the archived holder out', count === 1, show(count))
  await must('rename the Draft option', ask(cdp, 'mutate', { op: 'renameOption', propertyId: stage, optionId: optionId(JSON.parse(readRel('.nexus/properties.json')).defs[stage], 'Draft'), label: 'Final' }))
  item(3, 'C-1', 'an option rename rewrites the archived page as it rewrites the live one', show(frontOf(arc.rel)['Drive Stage']) === show(['Final']) && show(frontOf(live.rel)['Drive Stage']) === show(['Final']), show([frontOf(arc.rel)['Drive Stage'], frontOf(live.rel)['Drive Stage']]))
  await must('rename Drive Live', ask(cdp, 'mutate', { op: 'rename', path: live.rel, kind: 'page', newName: 'Drive Live 2' }))
  live.rel = 'Collection A/Set Alpha/Drive Live 2.md'
  item(3, 'C-1', "renaming Drive Live re-spells the archived page's link", bodyOf(arc.rel).includes('[[Drive Live 2]]'), show(bodyOf(arc.rel)))
  await must('delete Drive Stage', ask(cdp, 'mutate', { op: 'deleteProperty', propertyId: stage }))
  item(3, 'C-2', 'the property delete strips the archived page as it strips the live one', !('Drive Stage' in frontOf(arc.rel)) && !('Drive Stage' in frontOf(live.rel)), show(frontOf(arc.rel)))

  // The seeds leave as they came, from outside, and the deleted property's bundle is emptied, so a later group meets Collection A, its Archive, and the Trash as group 3 found them. The watcher holds a file the app just wrote until it's still for 200 ms, and an unlink inside that hold reaches the app as nothing, so the seeds leave once the delete's writes are still.
  await sleep(400)
  for (const rel of [live.rel, linker.rel, withheld.dir, `.nexus/archive/${colA}`]) rmSync(abs(rel), { recursive: true, force: true })
  await until('the seeds out of the tree', async () => !treePaths((await must('nexus:state', ask(cdp, 'nexus:state'))).tree).has(live.rel))
  const stageRow = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).find((r) => r.title === 'Drive Stage')
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  if (stageRow) await must('empty Drive Stage', ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: stageRow.bundlePath }))
  await must('permanentDelete off', ask(cdp, 'personalization:set', 'permanentDelete', false))
  const left = ((await ask(cdp, 'bundles:list', { kind: 'archive', id: colA })).value ?? []).length
  item(3, '—', 'the group leaves Collection A’s Archive and the Trash as it found them', left === 0 && !exists(`.nexus/archive/${colA}`) && !((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).some((r) => r.title === 'Drive Stage'), show({ left }))
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
  item(4, 'A-2', 'a page archives into its Collection’s Archive under the chain it left',
    stamped(`.nexus/archive/${colA}/${A_ALPHA}`, 'Drive Arc', '.archived').test(A1) && exists(`${A1}/Drive Arc.md`) &&
      archived?.entity === 'page' && archived.id === arcId && archived.parent?.id === alphaId &&
      archived.place?.above === follower && archived.place?.below === pageA && same(archived.trail, [colA]) &&
      !exists(arc) && !orderIn(A_SIDECAR, 'page_order').includes(arcId),
    show({ A1, archived, pageOrder: orderIn(A_SIDECAR, 'page_order') }))

  const listedA = await rows({ kind: 'archive', id: colA })
  item(4, 'D-2', 'the archived page leaves the tree and lists in its Archive',
    !(await heldIds()).has(arcId) && listedA.length === 1 && listedA[0].title === 'Drive Arc' && same(listedA[0].crumbs.map((c) => c.title), ['Collection A', 'Set Alpha']),
    show(listedA))

  await sleep(1000)
  await op('rename Drive Live', { op: 'rename', path: live, kind: 'page', newName: 'Drive Live Renamed' })
  const renamed = page(A_ALPHA, 'Drive Live Renamed')
  item(4, 'C-1', 'a rename reaches the archived file', bodyOf(`${A1}/Drive Arc.md`).includes('[[Drive Live Renamed]]'), show(bodyOf(`${A1}/Drive Arc.md`)))

  const bytes = readRel(`${A1}/Drive Arc.md`)
  const back = await op('restore Drive Arc', { op: 'restore', bundlePath: A1 })
  item(4, 'E-2', 'a restore returns it to its exact place by a plain move',
    exists(arc) && readRel(arc) === bytes && between(orderIn(A_SIDECAR, 'page_order'), [pageA, arcId, follower]) && !exists(A1) && !('unrestored' in back) && !('landedAs' in back),
    show({ back, pageOrder: orderIn(A_SIDECAR, 'page_order') }))

  const again = await bundledBy('archive Drive Arc again', { op: 'archive', path: arc, kind: 'page' })
  const T1 = await bundledBy('delete from the Archive', { op: 'delete', path: again, kind: 'page' })
  item(4, 'E-3', 'a delete from the Archive goes to the Trash keeping the bundle it left',
    stamped(`.trash/${A_ALPHA}`, 'Drive Arc', '.deleted').test(T1) && recordAt(T1).archive === again && !exists(again),
    show({ again, T1, record: T1 && exists(T1) ? recordAt(T1) : null }))

  await op('Undo to the Archive', { op: 'restore', bundlePath: T1, destination: { kind: 'archive' } })
  const undone = exists(`${again}/_record.json`) ? recordAt(again) : null
  item(4, 'E-3', 'its Undo returns it to the Archive under the same name',
    exists(`${again}/Drive Arc.md`) && !!undone && !('archive' in undone) && !('links' in undone) && !('targets' in undone) && !exists(T1) && !(await heldIds()).has(arcId),
    show({ again, undone }))

  const T2 = await bundledBy('delete from the Archive again', { op: 'delete', path: again, kind: 'page' })
  await op('restore from the Trash', { op: 'restore', bundlePath: T2 })
  item(4, 'E-3', 'a Trash restore returns it to where it was archived from', exists(arc) && !exists(T2), show({ T2 }))

  const subId = containerId()
  const SUB = `${A_ALPHA}/Drive Sub`
  await op('create Drive Sub', { op: 'createContainer', id: subId, parentPath: A_ALPHA, kind: 'set', name: 'Drive Sub' })
  const deep = await createAt(cdp, SUB, 'Drive Deep')
  const D1 = await bundledBy('archive Drive Deep', { op: 'archive', path: deep, kind: 'page' })
  await op('move Drive Sub to Collection B', { op: 'moveSet', path: SUB, newParentPath: 'Collection B', order: [...orderIn('Collection B/_pagecollection.json', 'set_order'), subId] })
  const carried = `.nexus/archive/${colB}/${SUB}/${leafOf(D1)}`
  await settles(async () => exists(`${carried}/Drive Deep.md`) && !exists(D1))
  item(4, 'F-6', 'a Set moved to another Collection carries what was archived from within it',
    exists(`${carried}/Drive Deep.md`) && same(recordAt(carried).trail, [colB]) && !exists(D1),
    show({ carried, record: exists(carried) ? recordAt(carried) : null, D1: exists(D1) }))

  await op('move Drive Sub into Set Alpha', { op: 'moveSet', path: 'Collection B/Drive Sub', newParentPath: B_ALPHA, order: [...before.bAlphaSets, subId] })
  await settles(async () => same(recordAt(carried).trail, [colB, bAlphaId]))
  item(4, 'F-6', 'a Set moved within its Collection rewrites the trail alone',
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
  item(4, 'F-5', 'an Archive whose Collection exists nowhere moves into the Trash at the next open',
    swept.length === 1 && same(recordAt(`.trash/Drive Gone/${swept[0]}`), orphanRecord) && !exists(`.nexus/archive/${gone}`),
    show({ swept, archive: exists(`.nexus/archive/${gone}`) }))

  const standing = exists(collArchive)
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  const collRow = (await rows({ kind: 'trash' })).find((r) => r.title === 'Drive Coll')
  if (collRow) await emptyAt(collRow.bundlePath)
  item(4, 'F-4', 'a Collection in the Trash keeps its Archive, and emptying it empties both',
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
  item(4, '—', 'the group leaves Collections A and B, their Archives, and the Trash as it found them', same(after, before), show({ before, after }))
}

// ── Group 5 — Shared Chrome (Phase 5) ───────────────────────────────────────

const LABEL = `document.querySelector('[role=status], [role=alert]')`
const drained = (cdp) => cdp.evaluate(`${LABEL}.hasAttribute('inert')`)
const moveTo = (cdp, { x, y }) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
const checkRow = (cdp, title) => click(cdp, `${trashRowEl(title)}.querySelector('[role=checkbox]')`)
const listedTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
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
  const look = await cdp.evaluate(`(() => { const f = document.querySelector('.trash-frame.table'); const [search, table] = f?.children ?? []; const [head, scroll] = table?.querySelector(':scope > .table-grid')?.children ?? []; return !!f && !!search?.matches('.nav-search-row') && !!table?.matches('.trash-table') && !!head?.matches('.trash-head.table-head') && !!head.querySelector('.trash-head-name') && !!head.querySelector('.trash-head-date') && !!scroll?.matches('.trash-scroll') && !!scroll.querySelector('.data-row') })()`)
  const listed = await listedTitles(cdp)
  item(5, 'G-1', 'the Trash keeps its look and lists newest first',
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
  item(5, 'G-1', 'typed search narrows in place, keeping newest first', narrowed && cleared, show({ found, after: await listedTitles(cdp) }))

  const single = await chooseNative(cdp, trashRowEl('G5 One'), [])
  item(5, 'K-4', "one row's menu reads Restore and Delete", same(single.rows, ['Restore', 'Delete']), show(single.rows))

  for (const t of ['G5 One', 'G5 Two']) await checkRow(cdp, t)
  const onChecked = await chooseNative(cdp, trashRowEl('G5 Two'), [])
  const onUnchecked = await chooseNative(cdp, trashRowEl('G5 Note'), [])
  item(5, 'K-4', "a checked row's menu names the batch; an unchecked one acts alone",
    same(onChecked.rows, ['Restore All', 'Delete All']) && same(onUnchecked.rows, ['Restore', 'Delete']), show({ onChecked, onUnchecked }))

  const { chosen: restoredAll } = await chooseNative(cdp, trashRowEl('G5 Two'), 'Restore All')
  const restoredSaid = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
  const near = await boxOf(cdp, LABEL)
  await moveTo(cdp, near)
  await moveTo(cdp, { x: near.x + 10, y: near.y })
  const drainedUnder = await settles(() => drained(cdp), 4500)
  const back = ['G5 One', 'G5 Two']
  const after = await listedTitles(cdp)
  item(5, 'K-4', 'Restore All restores the checked rows',
    restoredAll && restoredSaid && back.every((t) => exists(page(A_ALPHA, t)) && !!bundles[t] && !exists(bundles[t])) && !after.some((t) => back.includes(t)),
    show({ restoredAll, after, notice: await notice(cdp) }))
  item(5, 'K-3', 'a notice posted under the pointer drains', drainedUnder)

  // The style checks run while G5 Note and G5 Note Long are still listed, so the widest style has rows to fit.
  const trashStyle = () => (settingsOnDisk().personalization ?? {}).trashColumnStyle
  const { chosen: short } = await chooseNative(cdp, sel('.trash-head-date'), 'Short Date')
  const picked = await settles(async () => same(trashStyle(), { date_format: 'short' }))
  const { chosen: full } = await chooseNative(cdp, sel('.trash-head-date'), 'Full Date')
  const returned = await settles(async () => !('trashColumnStyle' in (settingsOnDisk().personalization ?? {})))
  item(5, 'G-1', "the date column's right-click picks a style and returns to the Nexus's own",
    short && picked && full && returned, show({ short, full, style: trashStyle() }))

  const { chosen: widest } = await chooseNative(cdp, sel('.trash-head-date'), 'Full')
  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.trash-frame .bundle-date')]; const head = document.querySelector('.trash-frame .trash-head-date'); return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
  const { chosen: unweekdayed } = await chooseNative(cdp, sel('.trash-head-date'), 'Hide Day')
  const settled = await settles(async () => !('trashColumnStyle' in (settingsOnDisk().personalization ?? {})))
  item(5, 'G-1', 'under its widest style no Trash date and not its heading is cut',
    widest && fit && unweekdayed && settled, show({ widest, fit, style: trashStyle() }))

  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const t of ['G5 Note', 'G5 Note Long']) await checkRow(cdp, t)
  const { chosen: deletedAll } = await chooseNative(cdp, trashRowEl('G5 Note'), 'Delete All')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  const asked = await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`)
  await pressDialog(cdp, 'Delete')
  const deletedSaid = await settles(async () => (await notice(cdp)).startsWith('Deleted 2 Pages'))
  const far = await cdp.evaluate(`({ x: 8, y: innerHeight - 8 })`)
  // Two frames around the leave, so the notice's listener is attached before it and Chromium doesn't coalesce it into the return.
  const frames = () => cdp.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')
  await frames()
  await moveTo(cdp, far)
  await frames()
  const band = await boxOf(cdp, LABEL)
  await moveTo(cdp, band)
  const stalled = await holds(async () => !(await drained(cdp)), 5000)
  await moveTo(cdp, far)
  const drainedAway = await settles(() => drained(cdp), 4500)
  const gone = ['G5 Note', 'G5 Note Long']
  item(5, 'K-4', 'Delete All empties the checked rows',
    deletedAll && asked === 'Delete these 2 Pages?' && gone.every((t) => !!bundles[t] && !exists(bundles[t])) && deletedSaid,
    show({ deletedAll, asked, notice: await notice(cdp) }))
  item(5, 'K-3', 'once the pointer has left its band, returning stalls the drain and leaving drains it', stalled && drainedAway, show({ stalled, drainedAway }))

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
  item(5, '4.7', "the icon picker's rows sit where its list starts and virtualize while scrolled",
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
  item(5, 'G-6', 'the lock glyph cross-fades through the one swap',
    !!openFace && loud(closedFace) && quiet(openFace) && lockShown && loud(openAgain) && quiet(closedAgain),
    show({ locked: [openFace, closedFace], unlocked: [openAgain, closedAgain] }))

  await openSettings(cdp, 'Files & Links')
  const CLEAR = `${settingRow('Clear History')}.querySelector('button')`
  const idle = await facesOf(cdp, CLEAR)
  const w = await widthOf(cdp, CLEAR)
  await press(cdp, CLEAR)
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
  await pressDialog(cdp, 'Clear')
  const marked = await settles(async () => (await facesOf(cdp, CLEAR)).find(loud)?.text === 'Cleared')
  const [clearFace] = await facesOf(cdp, CLEAR)
  const markedWidth = await widthOf(cdp, CLEAR)
  await sleep(1800)
  const returnedFace = (await facesOf(cdp, CLEAR)).find(loud)?.text
  item(5, 'G-6', 'Clear History cross-fades to Cleared, holds, and returns',
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
  item(5, 'G-6', 'the diff tally swaps its counts for Copied in place',
    counts?.face === 'hidden' && copied?.face === 'shown' && copied.text === 'Copied' && Math.abs(copiedWidth - pillWidth) < 0.5 && tagged && countsBack?.face === 'shown' && untagged,
    show({ counts, copied, pillWidth, copiedWidth, tagged, countsBack, untagged }))

  await openSettings(cdp, 'Files & Links')
  const permanentHint = await captionOf(cdp, 'Permanently Delete Files')
  const confirmHint = await captionOf(cdp, 'Confirm Before Deletion')
  item(5, 'K-5', "Settings › Files & Links' Trash & Archive section reads its rewritten hints",
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
  item(5, '—', 'the group leaves Set Alpha and the Trash as it found them',
    same(ended, start) && !made.some((t) => exists(page(A_ALPHA, t))), show({ start, ended }))
}

// ── Group 6A — Archiving (Phase 6A) ─────────────────────────────────────────

/** The bundle under Collection A's Archive whose stamped leaf names `title`, as a page's or a Set's. */
const archivedBundle = (title) => {
  const dir = `.nexus/archive/${JSON.parse(readRel('Collection A/_pagecollection.json')).id}`
  if (!exists(dir)) return undefined
  const leaf = readdirSync(abs(dir), { recursive: true }).find((n) => n.endsWith(`__${title}.md.archived`) || n.endsWith(`__${title}.archived`))
  return leaf && `${dir}/${leaf}`
}
const tailOf = (rows, n) => (rows ?? []).slice(-n).map((r) => (r.separator ? { separator: true } : { label: r.label, enabled: r.enabled }))
const groupsOf = (rows) => (rows ?? []).reduce((out, r) => (r.separator ? [...out, []] : [...out.slice(0, -1), [...out.at(-1), r.label]]), [[]])
const popAt = async (cdp, expr) => popNative(cdp, await boxOf(cdp, expr))
const dialogRead = (cdp) =>
  cdp.evaluate(`(() => { const d = ${DIALOG}; return d && { message: d.getAttribute('aria-label'), detail: [...d.querySelectorAll('span')].find((e) => e.textContent === d.getAttribute('aria-label'))?.nextElementSibling?.textContent ?? null, actions: [...d.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => t !== 'Cancel') } })()`)
/** The notice while its label is up: its text, message then button, and its buttons' text. */
const noticeUp = async (cdp, text) =>
  (await settles(async () => !(await drained(cdp)) && (await notice(cdp)) === text)) && same(await cdp.evaluate(`[...(${SHOWN} ?? ${LABEL}).querySelectorAll('button')].map((b) => b.textContent.trim())`), ['Undo'])
const pressUndo = (cdp) => click(cdp, `[...${LABEL}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo')`)
const SWITCH = (label) => `document.querySelector('[role="switch"][aria-label="${label}"]')`
const sectionOf = (heading) => `[...document.querySelectorAll('.settings-section')].find((s) => s.firstElementChild?.textContent.trim().toLowerCase() === ${JSON.stringify(heading.toLowerCase())})`
const controlsOf = (cdp, heading) => cdp.evaluate(`[...(${sectionOf(heading)}).querySelectorAll('[role="switch"][aria-label], button[aria-label]')].map((e) => e.getAttribute('aria-label'))`)
const adjacent = (list, a, b) => list.indexOf(a) >= 0 && list.indexOf(b) === list.indexOf(a) + 1
const PICKER = (label) => `document.querySelector('.settings-section button[aria-label="${label}"]')`
const pickerText = (cdp, label) => cdp.evaluate(`(${PICKER(label)})?.textContent.trim() ?? null`)
const stepEl = (label) => `[...document.querySelectorAll('[data-picker-portal] *')].find((e) => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(label)})`
const pickable = (cdp, labels) => cdp.evaluate(`${JSON.stringify(labels)}.map((l) => !!([...document.querySelectorAll('[data-picker-portal] *')].find((e) => e.children.length === 0 && e.textContent.trim() === l)?.closest('[role="button"]')))`)
async function openPicker(cdp, label) {
  await press(cdp, PICKER(label))
  await until(`${label}'s list`, () => portalOpen(cdp))
}
async function pickStep(cdp, label, step) {
  await openPicker(cdp, label)
  await mouseClick(cdp, stepEl(step))
  await until(`${label}'s list closed`, async () => !(await portalOpen(cdp)))
}
const personal = () => settingsOnDisk().personalization ?? {}
const STEPS = ['7 Days', '14 Days', '30 Days', '60 Days', '90 Days']

async function group6A(cdp) {
  const kept = personal()
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  const COLL_SIDECAR = `${COLLECTION}/_pagecollection.json`
  const ARC = page(A_ALPHA, 'Arc Page')
  const ARC_SET = `${COLLECTION}/Arc Set`
  const ARCHIVE_A = `.nexus/archive/${sidecarIdOf(COLL_SIDECAR)}`
  const standing = async () => ({
    pageOrder: orderIn(ALPHA_SIDECAR, 'page_order'),
    setOrder: orderIn(COLL_SIDECAR, 'set_order'),
    trash: (await rows({ kind: 'trash' })).length,
    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
  })
  const start = await standing()

  const alphaPages = (await collectionA(cdp)).sets.find((s) => s.path === A_ALPHA).pages.map((p) => p.id)
  const pageId = mintPageId()
  await must('create Arc Page', ask(cdp, 'mutate', { op: 'createPage', id: pageId, parentPath: A_ALPHA, name: 'Arc Page', order: [alphaPages[0], pageId, ...alphaPages.slice(1)] }))
  pageIds['Arc Page'] = pageId
  const pageRing = [alphaPages[0], pageId, alphaPages[1]]
  const aSets = (await collectionA(cdp)).sets.map((s) => s.id)
  const setId = containerId()
  await must('create Arc Set', ask(cdp, 'mutate', { op: 'createContainer', id: setId, parentPath: COLLECTION, kind: 'set', name: 'Arc Set', order: [aSets[0], setId, ...aSets.slice(1)] }))
  const setRing = [aSets[0], setId, aSets[1]]

  await openCollection(cdp)
  const CELL = `${row('Arc Page')}.querySelector('.cell-title-text')`
  await until('Arc Page in the table', () => cdp.evaluate(`!!(${row('Arc Page')})`))
  const pageMenu = await popAt(cdp, CELL)
  await pickNative([])
  item('6A', 'I-1', "a page's row menu closes on Archive above Delete",
    same(tailOf(pageMenu, 3), [{ separator: true }, { label: 'Archive', enabled: true }, { label: 'Delete', enabled: true }]), show(tailOf(pageMenu, 3)))

  const { chosen: askedArchive } = await chooseNative(cdp, CELL, 'Archive')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const question = await dialogRead(cdp)
  item('6A', 'I-2 §Copy', 'Archive asks its question',
    askedArchive && question?.message === 'Archive “Arc Page”?' && question.detail === '“Arc Page” will be moved to this Collection’s archive, where it can be restored.' && same(question.actions, ['Archive']),
    show(question))
  if (question) await pressDialog(cdp, 'Archive')
  const pageSaid = await noticeUp(cdp, 'Archived “Arc Page”Undo')
  const bundle = archivedBundle('Arc Page')
  const moved = {
    gone: !exists(ARC),
    bundled: !!bundle && exists(`${bundle}/Arc Page.md`) && frontOf(`${bundle}/Arc Page.md`).ID === pageId,
    unordered: !orderIn(ALPHA_SIDECAR, 'page_order').includes(pageId),
    unlisted: !(await cdp.evaluate(`!!(${row('Arc Page')})`)),
  }
  if (pageSaid) await pressUndo(cdp)
  item('6A', 'I-3 §Copy', 'the notice reads Archived “Arc Page” with Undo', pageSaid, show(await notice(cdp)))
  item('6A', 'I-1', "pressing Archive moved the page into its Collection's Archive", Object.values(moved).every(Boolean), show({ bundle, moved }))
  const pageBack = await settles(async () => exists(ARC) && !!bundle && !exists(bundle) && between(orderIn(ALPHA_SIDECAR, 'page_order'), pageRing))
  item('6A', 'I-3', 'Undo returns the page to its exact place', pageBack, show({ bundle, pageOrder: orderIn(ALPHA_SIDECAR, 'page_order') }))

  await openSettings(cdp, 'Files & Links')
  const headings = await cdp.evaluate(`[...document.querySelectorAll('.settings-section')].map((s) => s.firstElementChild?.textContent.trim().toLowerCase())`)
  const removal = await controlsOf(cdp, 'Trash & Archive')
  const removalText = await cdp.evaluate(`(${sectionOf('Trash & Archive')})?.textContent ?? ''`)
  const switchOn = await cdp.evaluate(`(${SWITCH('Confirm Before Archiving')})?.getAttribute('aria-checked')`)
  item('6A', 'I-2 §Copy', 'Settings › Trash & Archive holds Confirm Before Archiving under Confirm Before Deletion, on',
    !headings.includes('deletion') && adjacent(removal, 'Confirm Before Deletion', 'Confirm Before Archiving') && removalText.includes('Ask before archiving a page or a Set.') && switchOn === 'true',
    show({ headings, removal, switchOn }))

  await press(cdp, SWITCH('Confirm Before Archiving'))
  const switchedOff = await settles(async () => personal().confirmArchiving === false)
  item('6A', 'I-2', 'the switch off writes confirmArchiving: false', switchedOff, show(personal()))

  await closeSettings(cdp)
  await popAt(cdp, CELL)
  await pickNative(['Archive'])
  const [pageUnasked, unaskedSaid] = await Promise.all([
    holds(async () => !(await cdp.evaluate(`!!${DIALOG}`)), 1500),
    noticeUp(cdp, 'Archived “Arc Page”Undo'),
  ])
  const unaskedBundle = archivedBundle('Arc Page')
  if (unaskedSaid) await pressUndo(cdp)
  const unaskedBack = await settles(async () => exists(ARC) && !!unaskedBundle && !exists(unaskedBundle))
  item('6A', 'I-3', 'with the switch off, Archive asks nothing and still posts its Undo',
    pageUnasked && unaskedSaid && !!unaskedBundle && unaskedBack, show({ pageUnasked, unaskedSaid, unaskedBundle, unaskedBack }))

  await unfold(cdp, COLLECTION, 'Arc Set')
  const setMenu = await popAt(cdp, sidebarRow('Arc Set'))
  await pickNative([])
  const renameGroup = groupsOf(setMenu).find((g) => g.includes('Rename'))
  item('6A', 'I-1', "a Set's menu holds Rename alone and closes on Archive above Delete",
    same(renameGroup, ['Rename']) && same(tailOf(setMenu, 3).map((r) => r.label ?? '|'), ['|', 'Archive', 'Delete']),
    show({ groups: groupsOf(setMenu) }))

  await popAt(cdp, sidebarRow('Arc Set'))
  await pickNative(['Archive'])
  const [setUnasked, setSaid] = await Promise.all([
    holds(async () => !(await cdp.evaluate(`!!${DIALOG}`)), 1500),
    noticeUp(cdp, 'Archived “Arc Set”Undo'),
  ])
  const setBundle = archivedBundle('Arc Set')
  const setMoved = !!setBundle && exists(`${setBundle}/Arc Set/_pageset.json`) && !exists(ARC_SET) && !(await drawn(cdp, 'Arc Set'))
  if (setSaid) await pressUndo(cdp)
  const setBack = await settles(async () => exists(`${ARC_SET}/_pageset.json`) && !!setBundle && !exists(setBundle) && (await drawn(cdp, 'Arc Set')) && between(orderIn(COLL_SIDECAR, 'set_order'), setRing))
  item('6A', 'I-2', 'with the switch off, a Set archives unasked',
    setUnasked && setSaid && setMoved && setBack, show({ setUnasked, setSaid, setBundle, setMoved, setOrder: orderIn(COLL_SIDECAR, 'set_order') }))

  await openSettings(cdp, 'Files & Links')
  await press(cdp, SWITCH('Confirm Before Archiving'))
  const switchedOn = await settles(async () => (await cdp.evaluate(`(${SWITCH('Confirm Before Archiving')})?.getAttribute('aria-checked')`)) === 'true' && !('confirmArchiving' in personal()))
  await closeSettings(cdp)
  await unfold(cdp, COLLECTION, 'Arc Set')
  const { chosen: setAsk } = await chooseNative(cdp, sidebarRow('Arc Set'), 'Archive')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const setQuestion = await dialogRead(cdp)
  if (setQuestion) await pressDialog(cdp, 'Cancel')
  await sleep(600)
  item('6A', 'I-2', 'with the switch on, a Set asks',
    switchedOn && setAsk && setQuestion?.message === 'Archive “Arc Set”?' && exists(`${ARC_SET}/_pageset.json`) && !archivedBundle('Arc Set'),
    show({ switchedOn, setQuestion }))

  const collectionBefore = readRel(COLL_SIDECAR)
  const collMenu = await popAt(cdp, sidebarRow(COLLECTION))
  const collDelete = await pickNative(['Delete'])
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const collQuestion = await dialogRead(cdp)
  if (collQuestion) await pressDialog(cdp, 'Cancel')
  await sleep(600)
  item('6A', 'I-1', "a Collection's menu closes on Delete alone, which still asks",
    !groupsOf(collMenu).flat().includes('Archive') && same(tailOf(collMenu, 2).map((r) => r.label ?? '|'), ['|', 'Delete']) &&
      collDelete && collQuestion?.message === 'Delete “Collection A”?' && readRel(COLL_SIDECAR) === collectionBefore && exists(ARC_SET),
    show({ tail: tailOf(collMenu, 2), collQuestion }))

  await openSettings(cdp, 'Files & Links')
  if ((await pickerText(cdp, 'History Timeframe')) !== '30 Days') await pickStep(cdp, 'History Timeframe', '30 Days')
  await settles(async () => (await pickerText(cdp, 'History Timeframe')) === '30 Days')
  const history = await controlsOf(cdp, 'File History')
  const historyText = await cdp.evaluate(`(${sectionOf('File History')})?.textContent ?? ''`)
  const following = await pickerText(cdp, 'Archive History Timeframe')
  item('6A', 'J-1 §Copy', 'Archive History Timeframe follows History Timeframe until picked',
    adjacent(history, 'History Timeframe', 'Archive History Timeframe') &&
      historyText.includes("How long archived pages keep their snapshots; it follows 'History Timeframe' until set, and never exceeds it.") &&
      following === '30 Days' && !('archiveHistoryDays' in personal()),
    show({ history, following, personalization: personal() }))

  await openPicker(cdp, 'Archive History Timeframe')
  const dimmed = await pickable(cdp, STEPS)
  await mouseClick(cdp, stepEl('90 Days'))
  await sleep(600)
  const unwritten = !('archiveHistoryDays' in personal())
  await pressKey(cdp, 'Escape')
  const listClosed = await settles(async () => !(await portalOpen(cdp)))
  item('6A', 'J-1', "steps above History Timeframe show dimmed and can't be picked",
    same(dimmed, [true, true, true, false, false]) && unwritten && listClosed, show({ dimmed, unwritten, listClosed }))

  await pickStep(cdp, 'Archive History Timeframe', '14 Days')
  const picked = await settles(async () => personal().archiveHistoryDays === 14)
  await mouseAt(cdp, await boxOf(cdp, PICKER('Archive History Timeframe')), { button: 'right' })
  await until('the typed field', () => cdp.evaluate(`!!document.querySelector('.settings-section input[aria-label="Archive History Timeframe"]')`))
  await typeText(cdp, '60')
  await pressKey(cdp, 'Enter')
  const clamped = await settles(async () => personal().archiveHistoryDays === 30 && (await pickerText(cdp, 'Archive History Timeframe')) === '30 Days')
  item('6A', 'J-1', 'a pick stores, and a typed value clamps to History Timeframe', picked && clamped, show({ picked, personalization: personal(), shown: await pickerText(cdp, 'Archive History Timeframe') }))

  const watched = await watch(['.nexus/settings.json'])
  await pickStep(cdp, 'History Timeframe', '7 Days')
  const lowered = await settles(async () => (await pickerText(cdp, 'Archive History Timeframe')) === '7 Days')
  await sleep(400)
  const { writes, final } = await watched.stop()
  const landed = JSON.parse(final['.nexus/settings.json'] ?? '{}').personalization ?? {}
  item('6A', 'J-1', 'shortening History Timeframe switches the archive timeframe down in one write',
    writes['.nexus/settings.json'] === 1 && landed.historyDays === 7 && landed.archiveHistoryDays === 7 && lowered,
    show({ writes, landed, lowered }))

  await pickStep(cdp, 'History Timeframe', '60 Days')
  const lengthened = await settles(async () => personal().historyDays === 60)
  const held = personal().archiveHistoryDays === 7 && (await pickerText(cdp, 'Archive History Timeframe')) === '7 Days'
  await openPicker(cdp, 'Archive History Timeframe')
  const dimmedAfter = await pickable(cdp, STEPS)
  await pressKey(cdp, 'Escape')
  await settles(async () => !(await portalOpen(cdp)))
  item('6A', 'J-1', 'lengthening History Timeframe leaves the pick where it is',
    lengthened && held && same(dimmedAfter, [true, true, true, true, false]), show({ personalization: personal(), dimmedAfter }))
  await closeSettings(cdp)

  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const [title, rel, kind] of [['Arc Page', ARC, 'page'], ['Arc Set', ARC_SET, 'set']]) {
    await deleteAt(cdp, rel, kind)
    await must(`empty ${title}`, ask(cdp, 'mutate', { op: 'emptyBundle', bundlePath: (await trashed(cdp, title))?.bundlePath }))
  }
  for (const key of ['historyDays', 'archiveHistoryDays', 'confirmArchiving', 'permanentDelete']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders the archives and Undos left leave once those writes are still.
  await sleep(400)
  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
  const ended = await standing()
  item('6A', '—', 'the group leaves Set Alpha, Collection A, its Archive, and the Trash as it found them',
    same(ended, start) && !exists(ARC) && !exists(ARC_SET), show({ start, ended }))
}

// ── Group 6B — the Archive's view (Phase 6B) ────────────────────────────────

/** The first match a shown view holds, past every parked host. */
const live = (css) => `[...document.querySelectorAll(${JSON.stringify(css)})].find((e) => !e.closest('[inert]'))`
const SHOWN = `document.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')`
const barButton = (label) =>
  label === 'Delete' ? `${SHOWN}.querySelector('button[title="Delete"]')` : `[...${SHOWN}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`
const arcRow = (title) => `[...document.querySelectorAll('.bundle-rows .data-row')].find((r) => !r.closest('[inert]') && r.querySelector('.cell-title-text')?.textContent === ${JSON.stringify(title)})`
const arcTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.bundle-rows .data-row')].filter((r) => !r.closest('[inert]')).map((r) => r.querySelector('.cell-title-text')?.textContent)`)
const arcChecked = (cdp, title) => cdp.evaluate(`(${arcRow(title)})?.querySelector('[role=checkbox]')?.getAttribute('aria-checked') === 'true'`)
/** A press on the row's Archived cell, outside its title, as a user checks a row. */
const checkArc = (cdp, title) => mouseClick(cdp, `(${arcRow(title)}).querySelector('.bundle-date')`)
const trailOf = (cdp, expr) => cdp.evaluate(`(${expr})?.textContent.split('›') ?? null`)
const READER = `document.querySelector('[aria-label="Archived Page"]')`
const tabCount = (cdp) => cdp.evaluate(`document.querySelectorAll('[role=tab]').length`)
const NEW_VIEW = live('[aria-label="New View"]')
const ARCHIVE_ROW = `[...document.querySelectorAll('[role="button"]')].find((e) => e.textContent.trim() === 'Archive' && e.querySelectorAll('svg').length === 2 && !e.closest('[inert]'))`
const picked = (row) => `getComputedStyle(${row}, '::after').content !== 'none'`
/** The views dropdown opened, its Archive row pressed, and the archive place up, the dropdown closed after. */
async function toArchive(cdp) {
  await mouseClick(cdp, live('button[title="Views"]'))
  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`))
  await mouseClick(cdp, ARCHIVE_ROW)
  await until('the archive place', () => cdp.evaluate(`!!(${live('.detail-title-trailing')})`))
  await pressKey(cdp, 'Escape')
}
/** The pointer off the label, since a notice the bar's own press posts holds while the pointer stays on it. */
const pointerAway = async (cdp) => moveTo(cdp, { x: 10, y: await cdp.evaluate('innerHeight - 10') })
/** The bar's `label` pressed once its face reads `face`, after any notice has drained. */
async function pressBar(cdp, label, face) {
  await until(`the bar reading ${face}`, async () => (await notice(cdp)) === face).catch(() => {})
  await mouseClick(cdp, barButton(label))
}
// The harness's `ask` serializes its arguments as JSON, where an undefined `within` would arrive as null and be refused.
const archivedTitles = async (store, within) => (await ask(cdp, 'bundles:list', ...(within === undefined ? [store] : [store, within]))).value?.map((r) => r.title) ?? []

// Group 6B relaunches, so it drives the run's own `cdp`, and a failure inside it leaves the run holding the live session.
async function group6B() {
  const kept = personal()
  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
  const colB = sidecarIdOf('Collection B/_pagecollection.json')
  const alphaId = sidecarIdOf(`${A_ALPHA}/_pageset.json`)
  const ARCHIVE_A = { kind: 'archive', id: colA }
  const ARCHIVE_B = { kind: 'archive', id: colB }
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  await must('confirmDeletion on', ask(cdp, 'personalization:set', 'confirmDeletion', true))
  // Seeded with an explicit order, as group 6A's are, so "its exact place" has neighbours to land between.
  const alphaPages = (await collectionA(cdp)).sets.find((s) => s.path === A_ALPHA).pages.map((p) => p.id)
  const [arc1Id, arc2Id] = [mintPageId(), mintPageId()]
  const arc1 = page(A_ALPHA, 'Drive Arc 1')
  const arc2 = page(A_ALPHA, 'Drive Arc 2')
  await must('create Drive Arc 1', ask(cdp, 'mutate', { op: 'createPage', id: arc1Id, parentPath: A_ALPHA, name: 'Drive Arc 1', order: [alphaPages[0], arc1Id, ...alphaPages.slice(1)] }))
  await must('create Drive Arc 2', ask(cdp, 'mutate', { op: 'createPage', id: arc2Id, parentPath: A_ALPHA, name: 'Drive Arc 2', order: [alphaPages[0], arc1Id, arc2Id, ...alphaPages.slice(1)] }))
  const rings = [[alphaPages[0], arc1Id, arc2Id], [arc1Id, arc2Id, alphaPages[1]]]
  const arcRoot = await createAt(cdp, COLLECTION, 'Drive Arc Root')
  const arcSet = `${COLLECTION}/Drive Arc Set`
  await makeSet(cdp, 'Drive Arc Set')
  await createAt(cdp, arcSet, 'Drive Arc Inside')
  const bulk = []
  for (let i = 1; i <= 60; i++) bulk.push(await createAt(cdp, 'Collection B', `Drive Bulk ${String(i).padStart(2, '0')}`))
  // Outside the app, once its create is still past the watcher's 200 ms hold.
  await sleep(400)
  writeFileSync(abs(arcRoot), `${FM.exec(readRel(arcRoot))[0]}Root body.\n`)
  await sleep(600)
  for (const [rel, kind] of [[arc1, 'page'], [arc2, 'page'], [arcRoot, 'page'], [arcSet, 'set'], ...bulk.map((rel) => [rel, 'page'])]) {
    await op(`archive ${rel}`, { op: 'archive', path: rel, kind })
    await sleep(20)
  }

  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(1200)
  await mouseClick(cdp, live('button[title="Views"]'))
  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
  const footing = await cdp.evaluate(`(() => { const f = (${NEW_VIEW})?.closest('div'); const a = ${ARCHIVE_ROW}; const more = f?.lastElementChild; return { last: !!a && a.parentElement?.lastElementChild === a, divided: a?.previousElementSibling?.getAttribute('aria-hidden') ?? null, reorder: !!a?.closest('[data-line-row]'), picked: !!a && ${picked('a')}, more: more?.getAttribute('aria-label') ?? null, disabled: more?.disabled ?? null } })()`)
  item('6B', 'G-4', 'the views list closes on an Archive row below its last view, and the footing ends in the disabled More button',
    footing.last && footing.divided === 'true' && !footing.reorder && !footing.picked && footing.more === 'More' && footing.disabled === true, show(footing))

  const tabsBefore = await tabCount(cdp)
  await mouseClick(cdp, ARCHIVE_ROW)
  await until('the archive place', () => cdp.evaluate(`!!(${live('.detail-title-trailing')})`)).catch(() => {})
  if (!(await cdp.evaluate(`!!(${ARCHIVE_ROW})`))) await mouseClick(cdp, live('button[title="Views"]'))
  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
  const pressed = await cdp.evaluate(`(() => { const a = ${ARCHIVE_ROW}; return !!a && ${picked('a')} })()`)
  await pressKey(cdp, 'Escape')
  const header = await cdp.evaluate(`(() => { const t = ${live('.detail-title')}; const last = t?.lastElementChild; return { last: last?.className ?? null, text: last?.textContent ?? null, before: last?.previousElementSibling?.classList.contains('detail-title-clear') ?? false } })()`)
  item('6B', 'G-4, G-5', 'Archive shows the archive place in the same tab, pressed',
    (await tabCount(cdp)) === tabsBefore && pressed && header.last === 'detail-title-trailing' && header.text === 'Archive' && header.before,
    show({ tabsBefore, tabs: await tabCount(cdp), pressed, header }))

  const title = await cdp.evaluate(`(${live('.detail-title-text')})?.textContent ?? null`)
  const banner = await cdp.evaluate(`({ image: !!(${live('.banner')}), add: !!(${live('[aria-label="Add banner"]')}), seat: !!(${live('.banner-empty')}) })`)
  const titleMenu = await chooseNative(cdp, live('.detail-title-text'), [])
  item('6B', 'G-3', "the header keeps the owner's title with no banner",
    title === COLLECTION && !banner.image && !banner.add && banner.seat && titleMenu.rows.includes('Rename'), show({ title, banner, menu: titleMenu.rows }))

  const tab = await activeTab(cdp)
  const glyph = await cdp.evaluate(`!!document.querySelector('[role=tab][aria-selected=true] svg.lucide-archive')`)
  item('6B', 'G-3 ruling 9', "the tab reads the owner's title with the archive glyph", tab === COLLECTION && glyph, show({ tab, glyph }))

  await until('the archived rows', async () => (await arcTitles(cdp)).length === 4).catch(() => {})
  const listed = await arcTitles(cdp)
  const arc1Trail = await trailOf(cdp, `(${arcRow('Drive Arc 1')})?.querySelector('.bundle-trail')`)
  const dates = await cdp.evaluate(`[...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]')).map((c) => c.textContent)`)
  const counted = await cdp.evaluate(`(${live('[title="Results"]')})?.textContent.trim() ?? null`)
  item('6B', 'G-1, G-2', 'rows list each archived item with its trail and time, newest first',
    same(listed, ['Drive Arc Set', 'Drive Arc Root', 'Drive Arc 2', 'Drive Arc 1']) && same(arc1Trail, [COLLECTION, 'Set Alpha']) && dates.length === 4 && dates.every((d) => d !== '') && counted === '4',
    show({ listed, arc1Trail, dates, counted }))
  await shot(cdp, 'g6b-archive')

  await checkArc(cdp, 'Drive Arc 1')
  await checkArc(cdp, 'Drive Arc 2')
  const bar = await cdp.evaluate(`(() => { const f = ${SHOWN}; return f && { text: f.textContent, delete: !!f.querySelector('button[title="Delete"]') } })()`)
  item('6B', 'G-6', 'two checks declare the bar', bar?.text === 'Restore2 Pages' && bar.delete, show(bar))

  const before = Object.fromEntries((await rows(ARCHIVE_A)).map((r) => [r.title, r.bundlePath]))
  await pressBar(cdp, 'Restore', 'Restore2 Pages')
  const restoredSaid = await noticeUp(cdp, 'Restored 2 PagesUndo')
  const restoredGone = await settles(async () => !(await arcTitles(cdp)).some((t) => t === 'Drive Arc 1' || t === 'Drive Arc 2'), 3000)
  const placed = await settles(async () => exists(arc1) && exists(arc2) && rings.every((ring) => between(orderIn(ALPHA_SIDECAR, 'page_order'), ring)), 3000)
  if (restoredSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const rearchived = await settles(async () => {
    const now = Object.fromEntries((await rows(ARCHIVE_A)).map((r) => [r.title, r.bundlePath]))
    return ['Drive Arc 1', 'Drive Arc 2'].every((t) => now[t] === before[t] && now[t]?.startsWith(`.nexus/archive/${colA}/${A_ALPHA}/`) && exists(now[t])) && !exists(arc1) && !exists(arc2)
  })
  const rowsBack = await settles(async () => same(await arcTitles(cdp), listed))
  item('6B', 'G-6', 'Restore cross-fades to Restored 2 Pages, and its Undo archives them again',
    restoredSaid && restoredGone && placed && rearchived && rowsBack, show({ restoredSaid, restoredGone, placed, rearchived, rowsBack, notice: await notice(cdp) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await checkArc(cdp, 'Drive Arc 1')
  await pressBar(cdp, 'Delete', 'Restore1 Page')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const asked = await dialogRead(cdp)
  if (asked) await pressDialog(cdp, 'Delete')
  const deletedSaid = await noticeUp(cdp, 'Deleted “Drive Arc 1”Undo')
  const trashBundle = (await trashed(cdp, 'Drive Arc 1'))?.bundlePath
  const intoTrash = !!trashBundle && stamped(`.trash/${A_ALPHA}`, 'Drive Arc 1', '.deleted').test(trashBundle) && recordAt(trashBundle).archive === before['Drive Arc 1'] && !exists(before['Drive Arc 1'])
  if (deletedSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const deleteBack = await settles(async () => exists(before['Drive Arc 1']) && !!trashBundle && !exists(trashBundle))
  item('6B', 'E-3', 'Delete from the bar moves one row into the Trash, and its Undo returns it to the Archive',
    asked?.message === 'Delete “Drive Arc 1”?' && deletedSaid && intoTrash && deleteBack, show({ asked, deletedSaid, trashBundle, intoTrash, deleteBack }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await until('Drive Arc 1 back', async () => (await arcTitles(cdp)).includes('Drive Arc 1')).catch(() => {})
  await checkArc(cdp, 'Drive Arc 1')
  await checkArc(cdp, 'Drive Arc 2')
  await pressBar(cdp, 'Delete', 'Restore2 Pages')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const batchAsked = await dialogRead(cdp)
  if (batchAsked) await pressDialog(cdp, 'Delete')
  await until('the confirmation closed', async () => !(await cdp.evaluate(`!!${DIALOG}`))).catch(() => {})
  const askedOnce = await holds(async () => !(await cdp.evaluate(`!!${DIALOG}`)), 1500)
  const batchSaid = await noticeUp(cdp, 'Deleted 2 PagesUndo')
  const batchTrashed = (await rows({ kind: 'trash' })).filter((r) => r.title === 'Drive Arc 1' || r.title === 'Drive Arc 2')
  if (batchSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const batchBack = await settles(async () => ['Drive Arc 1', 'Drive Arc 2'].every((t) => exists(before[t])) && batchTrashed.every((r) => !exists(r.bundlePath)))
  item('6B', 'G-6', 'a batch Delete asks once and offers one Undo',
    batchAsked?.message === 'Delete these 2 Pages?' && askedOnce && batchSaid && batchTrashed.length === 2 && batchBack, show({ batchAsked, askedOnce, batchSaid, batchTrashed: batchTrashed.length, batchBack }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await until('both back', async () => ['Drive Arc 1', 'Drive Arc 2'].every((t) => listed.includes(t)) && same(await arcTitles(cdp), listed)).catch(() => {})
  await checkArc(cdp, 'Drive Arc 1')
  await checkArc(cdp, 'Drive Arc 2')
  const onChecked = await chooseNative(cdp, arcRow('Drive Arc 1'), [])
  const onUnchecked = await chooseNative(cdp, arcRow('Drive Arc Root'), [])
  await checkArc(cdp, 'Drive Arc 1')
  await checkArc(cdp, 'Drive Arc 2')
  const withdrawn = await settles(() => drained(cdp))
  item('6B', 'G-6', 'the right-click menu acts on the checked rows',
    same(onChecked.rows, ['Restore All', 'Delete All']) && same(onUnchecked.rows, ['Restore', 'Delete']) && withdrawn, show({ onChecked: onChecked.rows, onUnchecked: onUnchecked.rows, withdrawn }))

  await mouseClick(cdp, live('.detail-title-text'))
  await until('the search field', () => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`)).catch(() => {})
  await typeText(cdp, 'Arc')
  const order = (await archivedTitles(ARCHIVE_A)).filter((t) => t.toLowerCase().includes('arc'))
  const narrowed = await settles(async () => same(await arcTitles(cdp), order))
  await typeText(cdp, ' 2')
  const alone = await settles(async () => same(await arcTitles(cdp), ['Drive Arc 2']))
  await mouseClick(cdp, live('.detail-title-clear button'))
  const unsearched = await settles(async () => (await arcTitles(cdp)).length === order.length)
  item('6B', 'G-1 ruling 15', 'search narrows in place, keeping archived order',
    narrowed && alone && unsearched, show({ order, shown: await arcTitles(cdp) }))

  const ROOT_TITLE = `(${arcRow('Drive Arc Root')}).querySelector('.cell-title-text')`
  await doubleClick(cdp, ROOT_TITLE)
  await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
  await until('the reader’s body', () => cdp.evaluate(`(${READER})?.querySelector('.cm-content')?.textContent.includes('Root body.') ?? false`)).catch(() => {})
  const crumbs = `(${READER})?.querySelector('.page-window-crumbs')`
  const crumbTrail = await trailOf(cdp, crumbs)
  if (await cdp.evaluate(`!!(${crumbs})`)) await doubleClick(cdp, `(${crumbs}).lastElementChild`)
  const reader = await cdp.evaluate(`(() => { const w = ${READER}; return w && { lock: !!w.querySelector('.reader-lock[title="Read Only"]'), input: !!w.querySelector('input'), restore: [...w.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Restore'), doc: w.querySelector('.cm-content')?.textContent ?? null } })()`)
  await shot(cdp, 'g6b-reader')
  if (reader) await click(cdp, `(${READER}).querySelector('button[title="Close"]')`)
  const closed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
  const leftChecked = await arcChecked(cdp, 'Drive Arc Root')
  const oneBar = await settles(async () => (await notice(cdp)) === 'Restore1 Page')
  item('6B', 'H-1', "a page row's double-click opens the read-only reader and leaves the row checked",
    reader?.lock && !reader.input && !reader.restore && reader.doc?.includes('Root body.') && same(crumbTrail, [COLLECTION, 'Drive Arc Root']) && closed && leftChecked && oneBar,
    show({ reader, crumbTrail, closed, leftChecked, oneBar }))

  // A double-click's first press toggles the checked row off and its second checks it again, so the row stays checked.
  await doubleClick(cdp, ROOT_TITLE)
  await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
  const stillBar = await settles(async () => (await notice(cdp)) === 'Restore1 Page')
  await mouseClick(cdp, barButton('Restore'))
  await pointerAway(cdp)
  const readerGone = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
  await until('Drive Arc Root restored', async () => exists(arcRoot)).catch(() => {})
  await sleep(400)
  await op('archive Drive Arc Root again', { op: 'archive', path: arcRoot, kind: 'page' })
  item('6B', 'H-1 Cautionary 32', 'the reader closes once its item leaves the Archive',
    stillBar && readerGone, show({ stillBar, readerGone }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const SET_TITLE = `(${arcRow('Drive Arc Set')}).querySelector('.cell-title-text')`
  const setExpanded = () => cdp.evaluate(`(${arcRow('Drive Arc Set')})?.getAttribute('aria-expanded') ?? null`)
  await mouseClick(cdp, SET_TITLE)
  const disclosed = await settles(async () => { const t = await arcTitles(cdp); return t[t.indexOf('Drive Arc Set') + 1] === 'Drive Arc Inside' })
  const insideTrail = await trailOf(cdp, `(${arcRow('Drive Arc Inside')})?.querySelector('.bundle-trail')`)
  const setDisclosure = { expanded: await setExpanded(), opened: await cdp.evaluate(`!!${READER}`), checked: await arcChecked(cdp, 'Drive Arc Set') }
  await mouseClick(cdp, SET_TITLE)
  const collapsed = await settles(async () => !(await arcTitles(cdp)).includes('Drive Arc Inside') && (await setExpanded()) === 'false')
  item('6B', 'Clicks', "a Set row's click discloses its rows and opens nothing",
    disclosed && same(insideTrail, [COLLECTION, 'Drive Arc Set']) && setDisclosure.expanded === 'true' && !setDisclosure.opened && !setDisclosure.checked && collapsed,
    show({ disclosed, insideTrail, setDisclosure, collapsed }))

  const archiveStyle = () => personal().archiveColumnStyle
  const HEADING = live('.col-header.archive-date')
  const firstDate = () => cdp.evaluate(`(${live('.bundle-rows .bundle-date')})?.textContent ?? null`)
  const dateBefore = await firstDate()
  const { chosen: short } = await chooseNative(cdp, HEADING, 'Short Date')
  const styled = await settles(async () => same(archiveStyle(), { date_format: 'short' }))
  const changed = await settles(async () => (await firstDate()) !== dateBefore)
  const { chosen: full } = await chooseNative(cdp, HEADING, 'Full Date')
  const unstyled = await settles(async () => !('archiveColumnStyle' in personal()))
  item('6B', 'G-1', "the Archived heading's right-click picks its date style",
    short && styled && changed && full && unstyled, show({ short, full, dateBefore, style: archiveStyle() }))

  const { chosen: widest } = await chooseNative(cdp, HEADING, 'Full')
  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]')); const head = ${HEADING}; return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
  const { chosen: unweekdayed } = await chooseNative(cdp, HEADING, 'Hide Day')
  const restyled = await settles(async () => !('archiveColumnStyle' in personal()))
  item('6B', 'G-1', 'under its widest style no Archived date and not its heading is cut',
    widest && fit && unweekdayed && restyled, show({ widest, fit, style: archiveStyle() }))

  await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(600)
  const pane = await cdp.evaluate(`(() => { const s = [...document.querySelectorAll('div')].find((d) => d.style.minHeight === '24px'); return { spacer: !!s, frame: !!document.querySelector('[aria-label="Add Property"]') } })()`)
  await mouseClick(cdp, SETTINGS_BUTTON)
  await sleep(600)
  item('6B', 'G-3 ruling 12', "the toolbar's settings pane is the empty one", pane.spacer && !pane.frame, show(pane))

  await mouseClick(cdp, sel('button[title="Back"]'))
  const backed = await settles(async () => !(await cdp.evaluate(`!!(${live('.detail-title-trailing')})`)) && (await cdp.evaluate(`!!(${live('.table-view .data-row')})`)))
  await mouseClick(cdp, sel('button[title="Forward"]'))
  const forwarded = await settles(() => cdp.evaluate(`!!(${live('.detail-title-trailing')})`))
  item('6B', 'G-5', 'Back returns to the view and Forward to the archive', backed && forwarded, show({ backed, forwarded }))

  cdp = await relaunch(cdp, async () => {})
  const reopened = await settles(async () => (await activeTab(cdp)) === COLLECTION && (await cdp.evaluate(`!!document.querySelector('[role=tab][aria-selected=true] svg.lucide-archive') && !!(${live('.detail-title-trailing')})`)), 15000)
  item('6B', 'G-5', 'relaunch reopens the archive tab', reopened, show({ tab: await activeTab(cdp) }))

  if (!(await drawn(cdp, COLLECTION))) await click(cdp, ribbon('Collections'))
  await until(`${COLLECTION} in the sidebar`, () => drawn(cdp, COLLECTION))
  await unfold(cdp, COLLECTION, 'Set Alpha')
  await click(cdp, sidebarRow('Set Alpha'))
  await sleep(1200)
  await toArchive(cdp)
  const within = await archivedTitles(ARCHIVE_A, alphaId)
  const alphaShown = await settles(async () => same(await arcTitles(cdp), within))
  item('6B', 'G-4', "a top-level Set's archive lists only what left from within it",
    alphaShown && same([...within].sort(), ['Drive Arc 1', 'Drive Arc 2']), show({ within, shown: await arcTitles(cdp) }))

  await sidebarTo(cdp, 'Collections', 'Collection B')
  await sleep(1200)
  await toArchive(cdp)
  const bulkCount = (await rows(ARCHIVE_B)).length
  await until('the bulk rows', async () => (await arcTitles(cdp)).length > 0).catch(() => {})
  const sized = await cdp.evaluate(`(() => { const l = ${live('.bundle-rows')}; return { height: l?.getBoundingClientRect().height ?? null, drawn: l?.querySelectorAll('.data-row').length ?? 0 } })()`)
  await cdp.evaluate(`(() => { const s = ${live('.detail-scroll')}; s.scrollTop = s.scrollHeight })()`)
  const bottomed = await settles(async () => (await arcTitles(cdp)).includes('Drive Bulk 01'))
  item('6B', '4.7', 'virtual rows render a window of a long archive',
    bulkCount === 60 && Math.round(sized.height) === Math.round(29.75 * bulkCount) && sized.drawn < bulkCount && bottomed, show({ bulkCount, sized, bottomed }))

  await checkArc(cdp, 'Drive Bulk 01')
  const archiveTab = await cdp.evaluate(`[...document.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true')`)
  await mouseClick(cdp, sel('[aria-label="New Tab"]'))
  const parkedOut = await settles(() => drained(cdp))
  await mouseClick(cdp, `document.querySelectorAll('[role=tab]')[${archiveTab}]`)
  const returned = await settles(async () => (await notice(cdp)) === 'Restore1 Page' && !(await drained(cdp)))
  await checkArc(cdp, 'Drive Bulk 01')
  item('6B', 'G-6', 'the bar withdraws when its tab parks', parkedOut && returned, show({ parkedOut, returned }))

  for (const key of ['confirmDeletion', 'archiveColumnStyle']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
}

// ── Group 7 — Disclosure (Disclosable Bundles, Phase 7) ─────────────────────

/** The path into `title` among a destination ask's rows: a container holding others names itself first inside its own submenu. */
const intoPath = (rows, title) => ((rows ?? []).find((r) => r.label === title)?.submenu ? [title, title] : [title])
/** The Restore ▸ path into `title` from a row menu's rows. */
const restoreInto = (menu, title) => ['Restore', ...intoPath((menu ?? []).find((r) => r.label === 'Restore')?.submenu, title)]
/** The titles drawn right after `title`'s row. */
const titlesAfter = (titles, title, n) => titles.slice(titles.indexOf(title) + 1, titles.indexOf(title) + 1 + n)
const trashTrailOf = (cdp, title) => trailOf(cdp, `(${trashRowEl(title)})?.querySelector('.bundle-trail')`)
const checkedIn = (cdp, scope) => cdp.evaluate(`document.querySelectorAll('${scope} .data-row [role=checkbox][aria-checked="true"]').length`)

const trashChecked = (cdp, title) => cdp.evaluate(`(${trashRowEl(title)})?.querySelector('[role=checkbox]')?.getAttribute('aria-checked') === 'true'`)
const expandedOf = (cdp, expr) => cdp.evaluate(`(${expr})?.getAttribute('aria-expanded') ?? null`)
/** Scrolled into the Trash's view first, since a press lands where the row is drawn. */
async function trashRowShown(cdp, title) {
  await until(`the ${title} row`, () => cdp.evaluate(`!!(${trashRowEl(title)})`))
  await cdp.evaluate(`(${trashRowEl(title)}).scrollIntoView({ block: 'nearest' })`)
  await sleep(200)
  return trashRowEl(title)
}
/** A press on the row's date cell, outside its title, as a user checks a Trash row. */
const checkTrash = async (cdp, title) => mouseClick(cdp, `(${await trashRowShown(cdp, title)}).querySelector('.bundle-date')`)
const boxIn = (expr) => `(${expr}).querySelector('[role=checkbox]')`
const titleIn = (expr) => `(${expr}).querySelector('.cell-title-text')`
/** The notice while its label is up, reading `text` with no button. */
const postedPlain = async (cdp, text) =>
  (await settles(async () => !(await drained(cdp)) && (await notice(cdp)) === text)) && (await cdp.evaluate(`(${SHOWN} ?? ${LABEL}).querySelectorAll('button').length`)) === 0

async function group7(cdp) {
  const kept = personal()
  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
  const ARCHIVE_A = `.nexus/archive/${colA}`
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  const CHAINS = ['.trash/Collection A/Shelf Set', '.trash/Collection A/Set Alpha', '.trash/Collection A', '.trash/Collection B']
  const standing = async () => ({
    collections: stateOrder().collections ?? [],
    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
    alphaSets: orderIn(ALPHA_SIDECAR, 'set_order'),
    bPages: orderIn('Collection B/_pagecollection.json', 'page_order'),
    excluded: settingsOnDisk().excluded_folders ?? [],
    trash: (await rows({ kind: 'trash' })).length,
    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
    chains: CHAINS.filter(exists),
  })
  const start = await standing()
  await must('confirmDeletion on', ask(cdp, 'personalization:set', 'confirmDeletion', true))

  await op('create Nest Coll', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Nest Coll' })
  await op('create Nest Set', { op: 'createContainer', id: containerId(), parentPath: 'Nest Coll', kind: 'set', name: 'Nest Set' })
  for (const t of ['Nest One', 'Nest Two', 'Nest Three', 'Nest Four']) await createAt(cdp, 'Nest Coll', t)
  await createAt(cdp, 'Nest Coll/Nest Set', 'Nest Deep')
  const loose = await createAt(cdp, A_ALPHA, 'Nest Loose')
  await makeSet(cdp, 'Shelf Set')
  for (const t of ['Shelf Kept', 'Shelf Gone']) await createAt(cdp, `${COLLECTION}/Shelf Set`, t)
  const LANE = `${A_ALPHA}/Lane Set`
  await op('create Lane Set', { op: 'createContainer', id: containerId(), parentPath: A_ALPHA, kind: 'set', name: 'Lane Set' })
  await op('create Lane Sub', { op: 'createContainer', id: containerId(), parentPath: LANE, kind: 'set', name: 'Lane Sub' })
  await createAt(cdp, `${LANE}/Lane Sub`, 'Lane Deep')
  await createAt(cdp, LANE, 'Lane Top')
  await sleep(400)
  const coll = await bundledBy('delete Nest Coll', { op: 'delete', path: 'Nest Coll', kind: 'collection' })
  await deleteAt(cdp, loose, 'page')
  const shelf = await bundledBy('archive Shelf Set', { op: 'archive', path: `${COLLECTION}/Shelf Set`, kind: 'set' })
  const lane = await bundledBy('archive Lane Set', { op: 'archive', path: LANE, kind: 'set' })
  const inner = {
    one: `${coll}/Nest Coll/Nest One.md`,
    two: `${coll}/Nest Coll/Nest Two.md`,
    three: `${coll}/Nest Coll/Nest Three.md`,
    four: `${coll}/Nest Coll/Nest Four.md`,
    deep: `${coll}/Nest Coll/Nest Set/Nest Deep.md`,
    set: `${coll}/Nest Coll/Nest Set`,
    kept: `${shelf}/Shelf Set/Shelf Kept.md`,
    gone: `${shelf}/Shelf Set/Shelf Gone.md`,
  }
  const looseBundle = (await trashed(cdp, 'Nest Loose'))?.bundlePath

  await openSettings(cdp, 'Trash')
  await until('the Nest Coll row', () => cdp.evaluate(`!!(${trashRowEl('Nest Coll')})`))
  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
  const collOpened = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 3), ['Nest Set', 'Nest One', 'Nest Two']))
  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
  const setOpened = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 4), ['Nest Set', 'Nest Deep', 'Nest One', 'Nest Two']))
  const rowState = (title) => cdp.evaluate(`(() => { const r = ${trashRowEl(title)}; return r && { expanded: r.getAttribute('aria-expanded'), nested: !!r.querySelector('.row-chevron') } })()`)
  const tree = { coll: await rowState('Nest Coll'), set: await rowState('Nest Set'), page: await rowState('Nest Deep') }
  const deepTrail = await trashTrailOf(cdp, 'Nest Deep')
  const unchecked = (await checkedIn(cdp, '.trash-frame')) === 0
  await shot(cdp, 'g7-disclosed')
  item(7, 'Clicks, Nesting, Trails', 'a trashed Collection discloses its Set and pages, and the Set its own',
    collOpened && setOpened && same(tree, { coll: { expanded: 'true', nested: false }, set: { expanded: 'true', nested: true }, page: { expanded: null, nested: false } }) && same(deepTrail, ['Nest Coll', 'Nest Set']) && unchecked,
    show({ shown: await listedTitles(cdp), tree, deepTrail, unchecked }))

  const revealedAll = (on) => cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row')].every((r) => r.dataset.revealHost === ${JSON.stringify(on)})`)
  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
  const boxed = { checked: await trashChecked(cdp, 'Nest Set'), expanded: await expandedOf(cdp, trashRowEl('Nest Set')), deep: (await listedTitles(cdp)).includes('Nest Deep'), revealed: await revealedAll('on') }
  const topChevron = await cdp.evaluate(`(() => { const t = (${trashRowEl('Nest Coll')}).querySelector('.bundle-title'); const last = t?.lastElementChild; return !!last?.matches('[data-drop-outline]') && !!last.previousElementSibling?.matches('.cell-title') })()`)
  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
  const unboxed = { checked: await trashChecked(cdp, 'Nest Set'), revealed: await revealedAll('') }
  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
  const folded = await settles(async () => (await expandedOf(cdp, trashRowEl('Nest Set'))) === 'false' && !(await listedTitles(cdp)).includes('Nest Deep'))
  await doubleClick(cdp, titleIn(trashRowEl('Nest Set')))
  await sleep(600)
  const openedOnce = (await expandedOf(cdp, trashRowEl('Nest Set'))) === 'true' && same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep'])
  item(7, 'Clicks, Chevron, Double-Click', "a container's box checks it in place, every box shows, a top chevron follows its title, and a double-click opens a container once",
    same(boxed, { checked: true, expanded: 'true', deep: true, revealed: true }) && topChevron && same(unboxed, { checked: false, revealed: true }) && folded && openedOnce,
    show({ boxed, topChevron, unboxed, folded, openedOnce }))

  const tabs = await tabCount(cdp)
  await doubleClick(cdp, titleIn(trashRowEl('Nest One')))
  await sleep(600)
  const byTitle = { checked: await trashChecked(cdp, 'Nest One'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp), settings: await cdp.evaluate(`!!document.querySelector('.settings-rail')`) }
  await doubleClick(cdp, boxIn(trashRowEl('Nest One')))
  await sleep(600)
  const byBox = { checked: await trashChecked(cdp, 'Nest One'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
  await mouseClick(cdp, boxIn(trashRowEl('Nest One')))
  const unpressed = !(await trashChecked(cdp, 'Nest One'))
  item(7, 'Clicks, Double-Click', "a Trash page's double-click leaves it checked and opens nothing, and a double-click on its box opens nothing",
    same(byTitle, { checked: true, reader: false, tabs, settings: true }) && same(byBox, { checked: true, reader: false, tabs }) && unpressed,
    show({ tabs, byTitle, byBox, unpressed }))

  const NEST_PAGES = ['Nest One', 'Nest Two', 'Nest Three', 'Nest Four']
  const reopen = async (title) => {
    await mouseClick(cdp, titleIn(trashRowEl(title)))
    await settles(async () => (await expandedOf(cdp, trashRowEl(title))) === 'false')
    await mouseClick(cdp, titleIn(trashRowEl(title)))
  }
  await exclude(cdp, [...start.excluded, 'Nest Coll/Nest Set'])
  await reopen('Nest Coll')
  const leftOut = await settles(async () => { const t = await listedTitles(cdp); return same(titlesAfter(t, 'Nest Coll', 4), NEST_PAGES) && !t.includes('Nest Set') })
  const stillBundled = exists(inner.set)
  await exclude(cdp, start.excluded)
  await reopen('Nest Coll')
  const backIn = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 1), ['Nest Set']))
  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep']))
  item(7, 'Excluded Folders', "a folder the Nexus excludes stays out of an inner listing until it's unexcluded",
    leftOut && stillBundled && backIn, show({ leftOut, stillBundled, backIn, shown: await listedTitles(cdp) }))

  for (const t of ['Nest Two', 'Nest Loose']) await checkTrash(cdp, t)
  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
  await settles(async () => !(await listedTitles(cdp)).includes('Nest Two'))
  const hidden = await chooseNative(cdp, trashRowEl('Nest Loose'), [])
  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
  await settles(async () => (await listedTitles(cdp)).includes('Nest Two'))
  const remembered = await trashChecked(cdp, 'Nest Two')
  const shownAgain = await chooseNative(cdp, trashRowEl('Nest Loose'), [])
  for (const t of ['Nest Two', 'Nest Loose']) await checkTrash(cdp, t)
  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep']))
  item(7, 'Collapsing', 'a collapsed container keeps its inner check out of the menu, and reopening shows it',
    same(hidden.rows, ['Restore', 'Delete']) && remembered && same(shownAgain.rows, ['Restore All', 'Delete All']) && (await checkedIn(cdp, '.trash-frame')) === 0,
    show({ hidden: hidden.rows, remembered, shownAgain: shownAgain.rows }))

  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
  await checkTrash(cdp, 'Nest Deep')
  const covered = await popAt(cdp, trashRowEl('Nest Deep'))
  await pickNative([])
  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
  await checkTrash(cdp, 'Nest Deep')
  item(7, 'Nesting', 'a checked Set covers its checked page: the menu acts once, on the Set',
    same(labels(covered), ['Restore', 'Delete']) && !!covered?.find((r) => r.label === 'Restore')?.submenu && (await checkedIn(cdp, '.trash-frame')) === 0,
    show({ covered: labels(covered), submenu: !!covered?.find((r) => r.label === 'Restore')?.submenu }))

  const oneMenu = await popAt(cdp, trashRowEl('Nest One'))
  const onePath = restoreInto(oneMenu, 'Collection B')
  const oneChosen = await pickNative(onePath)
  const oneLanded = await settles(async () => exists('Collection B/Nest One.md') && !exists(inner.one))
  const oneLeft = await settles(async () => { const t = await listedTitles(cdp); return !t.includes('Nest One') && same(titlesAfter(t, 'Nest Coll', 3), ['Nest Set', 'Nest Deep', 'Nest Two']) })
  item(7, 'Homeless Items', 'an inner page restores through Restore ▸ into the container picked',
    same(labels(oneMenu), ['Restore', 'Delete']) && oneChosen && oneLanded && frontOf('Collection B/Nest One.md').ID === ids[page('Nest Coll', 'Nest One')] && oneLeft,
    show({ menu: labels(oneMenu), onePath, oneChosen, oneLanded, oneLeft }))

  for (const t of ['Nest Two', 'Nest Deep']) await checkTrash(cdp, t)
  const twoChecked = (await checkedIn(cdp, '.trash-frame')) === 2
  const { chosen: allChosen } = await chooseNative(cdp, trashRowEl('Nest Two'), 'Restore All')
  const asked = await until('the destination ask', nativeRows, 3000).catch(() => null)
  const askChosen = await pickNative(intoPath(asked, 'Collection B'))
  const once = await holds(async () => (await nativeRows()) === null, 1500)
  const allSaid = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
  const allLanded = await settles(async () => ['Nest Two', 'Nest Deep'].every((t) => exists(`Collection B/${t}.md`)) && !exists(inner.two) && !exists(inner.deep))
  item(7, 'Batch Restore', 'a Restore All of two inner pages asks once where they go',
    twoChecked && allChosen && askChosen && once && allSaid && allLanded, show({ twoChecked, allChosen, asked: labels(asked), askChosen, once, allSaid, allLanded }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  for (const t of ['Nest Three', 'Nest Loose']) await checkTrash(cdp, t)
  const { chosen: firstAll } = await chooseNative(cdp, trashRowEl('Nest Three'), 'Restore All')
  const firstAsk = await until('the destination ask', nativeRows, 3000).catch(() => null)
  await pickNative([])
  const dismissed = await holds(async () => { const t = await listedTitles(cdp); return t.includes('Nest Three') && t.includes('Nest Loose') && exists(inner.three) && !!looseBundle && exists(looseBundle) }, 1500)
  const { chosen: secondAll } = await chooseNative(cdp, trashRowEl('Nest Three'), 'Restore All')
  const secondAsk = await until('the destination ask', nativeRows, 3000).catch(() => null)
  const sent = await pickNative(intoPath(secondAsk, 'Collection B'))
  const homed = await settles(async () => exists('Collection B/Nest Three.md') && exists(page(A_ALPHA, 'Nest Loose')) && !exists('Collection B/Nest Loose.md'))
  const batchSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Pages')
  item(7, 'Batch Destination', "a batch's ask sends only its homeless rows, and a dismissed ask restores nothing",
    firstAll && !!firstAsk && dismissed && secondAll && sent && homed && batchSaid, show({ firstAll, firstAsk: labels(firstAsk), dismissed, secondAll, sent, homed, notice: await notice(cdp) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  const { chosen: fourChosen } = await chooseNative(cdp, trashRowEl('Nest Four'), 'Delete')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const fourAsked = await dialogRead(cdp)
  if (fourAsked) await pressDialog(cdp, 'Delete')
  const fourSaid = await postedPlain(cdp, 'Deleted “Nest Four”')
  const fourGone = await settles(async () => !exists(inner.four) && exists(coll) && exists(inner.set) && (await listedTitles(cdp)).includes('Nest Set') && !(await listedTitles(cdp)).includes('Nest Four'))
  item(7, 'Nesting', "an inner page's Delete empties that item alone",
    fourChosen && fourAsked?.message === 'Delete “Nest Four”?' && fourAsked.detail === 'It will be erased from this computer. This cannot be undone.' && fourSaid && fourGone,
    show({ fourChosen, fourAsked, fourSaid, fourGone, notice: await notice(cdp) }))
  await closeSettings(cdp)

  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(1200)
  await toArchive(cdp)
  await until('the Shelf Set row', async () => (await arcTitles(cdp)).includes('Shelf Set'))
  await mouseClick(cdp, titleIn(arcRow('Shelf Set')))
  await until('the Shelf Set rows', async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone'])).catch(() => {})
  const keptMenu = await popAt(cdp, arcRow('Shelf Kept'))
  const keptChosen = await pickNative(restoreInto(keptMenu, COLLECTION))
  const keptSaid = await noticeUp(cdp, 'Restored “Shelf Kept”Undo')
  const keptLanded = exists(`${COLLECTION}/Shelf Kept.md`) && !exists(inner.kept)
  if (keptSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const keptBack = await settles(async () => exists(inner.kept) && !exists(`${COLLECTION}/Shelf Kept.md`) && !archivedBundle('Shelf Kept'))
  const keptRow = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone']))
  item(7, 'Homeless Items, Undo', "an archived Set's inner page restores, and its Undo files it back inside the Set",
    keptChosen && keptSaid && keptLanded && keptBack && keptRow, show({ keptChosen, keptSaid, keptLanded, keptBack, keptRow, notice: await notice(cdp) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const { chosen: goneChosen } = await chooseNative(cdp, arcRow('Shelf Gone'), 'Delete')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const goneAsked = await dialogRead(cdp)
  if (goneAsked) await pressDialog(cdp, 'Delete')
  const goneSaid = await noticeUp(cdp, 'Deleted “Shelf Gone”Undo')
  const goneBundle = (await trashed(cdp, 'Shelf Gone'))?.bundlePath
  const intoTrash = !!goneBundle && exists(`${goneBundle}/Shelf Gone.md`) && !!recordAt(goneBundle).archive && !exists(inner.gone)
  if (goneSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const goneBack = await settles(async () => exists(inner.gone) && !exists(goneBundle) && !archivedBundle('Shelf Gone'))
  const goneRow = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone']))
  item(7, 'Undo', 'an inner page deleted from the Archive goes to the Trash, and its Undo files it back inside the Set',
    goneChosen && goneAsked?.message === 'Delete “Shelf Gone”?' && goneSaid && intoTrash && goneBack && goneRow,
    show({ goneChosen, goneAsked, goneSaid, goneBundle, intoTrash, goneBack, goneRow }))
  await until('the notice drained', () => drained(cdp)).catch(() => {})

  await unfold(cdp, COLLECTION, 'Set Alpha')
  await click(cdp, sidebarRow('Set Alpha'))
  await sleep(1200)
  await toArchive(cdp)
  await until('the Lane Set row', async () => (await arcTitles(cdp)).includes('Lane Set'))
  await mouseClick(cdp, titleIn(arcRow('Lane Set')))
  const laneOpened = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Lane Set', 2), ['Lane Sub', 'Lane Top']))
  await mouseClick(cdp, titleIn(arcRow('Lane Sub')))
  const subOpened = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Lane Sub', 1), ['Lane Deep']))
  const subChevron = await cdp.evaluate(`!!(${arcRow('Lane Sub')})?.querySelector('.row-chevron')`)
  const laneTrail = await trailOf(cdp, `(${arcRow('Lane Deep')})?.querySelector('.bundle-trail')`)
  await doubleClick(cdp, boxIn(arcRow('Lane Top')))
  const boxOpened = await settles(() => cdp.evaluate(`!!${READER}`), 800)
  await doubleClick(cdp, titleIn(arcRow('Lane Deep')))
  await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
  const laneCrumbs = await trailOf(cdp, `(${READER})?.querySelector('.page-window-crumbs')`)
  await pressKey(cdp, 'Escape')
  const laneClosed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
  const deepChecked = await arcChecked(cdp, 'Lane Deep')
  await checkArc(cdp, 'Lane Deep')
  item(7, 'Nesting, Trails, Chevron, Double-Click', "a Set archived from inside a Set discloses recursively in that Set's archive, and its inner page opens the reader on its own trail",
    laneOpened && subOpened && subChevron && same(laneTrail, [COLLECTION, 'Set Alpha', 'Lane Set', 'Lane Sub']) && !boxOpened &&
      same(laneCrumbs, [COLLECTION, 'Set Alpha', 'Lane Set', 'Lane Sub', 'Lane Deep']) && laneClosed && deepChecked && !(await arcChecked(cdp, 'Lane Deep')),
    show({ laneOpened, subOpened, subChevron, laneTrail, boxOpened, laneCrumbs, laneClosed, deepChecked, shown: await arcTitles(cdp) }))

  await until('the bar withdrawn', () => drained(cdp)).catch(() => {})
  await mouseClick(cdp, boxIn(arcRow('Lane Set')))
  await checkArc(cdp, 'Lane Top')
  const setBox = { checked: await arcChecked(cdp, 'Lane Set'), expanded: await expandedOf(cdp, arcRow('Lane Set')), top: await arcChecked(cdp, 'Lane Top') }
  const setFace = await settles(async () => (await notice(cdp)) === 'Restore1 Set')
  const topMenu = await chooseNative(cdp, arcRow('Lane Top'), [])
  await pressBar(cdp, 'Restore', 'Restore1 Set')
  const laneSaid = await noticeUp(cdp, 'Restored “Lane Set”Undo')
  const laneLanded = exists(`${LANE}/Lane Sub/Lane Deep.md`)
  if (laneSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const laneBack = await settles(async () => (await rows({ kind: 'archive', id: colA })).find((r) => r.title === 'Lane Set')?.bundlePath === lane && exists(lane) && !exists(LANE))
  item(7, 'Nesting, Clicks, Undo', 'a checked Set and its checked page reach the bar as the Set, which restores whole and its Undo archives it again',
    same(setBox, { checked: true, expanded: 'true', top: true }) && setFace && same(topMenu.rows, ['Restore', 'Delete']) && laneSaid && laneLanded && laneBack,
    show({ setBox, setFace, topMenu: topMenu.rows, laneSaid, laneLanded, laneBack, notice: await notice(cdp) }))
  await until('the notice drained', () => drained(cdp)).catch(() => {})

  await emptyAt(coll)
  for (const [t, rel] of [['Nest One', 'Collection B/Nest One.md'], ['Nest Two', 'Collection B/Nest Two.md'], ['Nest Deep', 'Collection B/Nest Deep.md'], ['Nest Three', 'Collection B/Nest Three.md'], ['Nest Loose', page(A_ALPHA, 'Nest Loose')]]) {
    await deleteAt(cdp, rel, 'page')
    await emptyAt((await trashed(cdp, t))?.bundlePath)
  }
  await emptyAt(await bundledBy('delete Shelf Set', { op: 'delete', path: shelf, kind: 'set' }))
  await emptyAt(await bundledBy('delete Lane Set', { op: 'delete', path: lane, kind: 'set' }))
  for (const key of ['confirmDeletion', 'permanentDelete']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
  await sleep(400)
  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
  const ended = await standing()
  item(7, '—', 'the group leaves Collections A and B, the Archive, and the Trash as it found them',
    same(ended, start) && !exists('Nest Coll'), show({ start, ended }))
}

// ── Group 7B — the shared table (Disclosable Bundles, Phase 7) ──────────────

const TRASH_SEARCH = `document.querySelector('.trash-frame .nav-search-row input')`
/** The title of the row holding the focus, or null when no row does. */
const focusedRow = (cdp) => cdp.evaluate(`(() => { const a = document.activeElement; return a?.matches?.('.data-row[role=treeitem]') ? (a.querySelector('.cell-title-text')?.textContent ?? null) : null })()`)
const trashStyle = () => personal().trashColumnStyle
async function searchTrash(cdp, text) {
  await cdp.evaluate(`${TRASH_SEARCH}.focus()`)
  await cdp.evaluate(`${TRASH_SEARCH}.select()`)
  await pressKey(cdp, 'Backspace')
  if (text) await typeText(cdp, text)
  await sleep(400)
}
const ZONE = `(${live('.bundle-rows')}).closest('.line-zone')`
const settingsWidth = (cdp) => cdp.evaluate(`document.querySelector('.settings-window')?.getBoundingClientRect().width ?? null`)
const searching = (cdp) => cdp.evaluate(`!!(${live('.detail-title-lead.is-searching')})`)
const results = (cdp) => cdp.evaluate(`(${live('[title="Results"]')})?.textContent.trim() ?? null`)
const emptyLine = (cdp, css) => cdp.evaluate(`(${live(css)})?.textContent ?? null`)

async function group7B(cdp) {
  const kept = personal()
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  const CHAINS = ['.trash/Collection A/Set Alpha', '.trash/Collection A', '.trash/Key Shelf']
  const standing = async () => ({
    collections: stateOrder().collections ?? [],
    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
    trash: (await rows({ kind: 'trash' })).length,
    trashColumnStyle: personal().trashColumnStyle ?? null,
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
    chains: CHAINS.filter(exists),
  })
  const start = await standing()
  await must('confirmDeletion on', ask(cdp, 'personalization:set', 'confirmDeletion', true))

  await op('create Key Coll', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Key Coll' })
  for (const t of ['Key One', 'Key Two']) await createAt(cdp, 'Key Coll', t)
  const looseA = await createAt(cdp, A_ALPHA, 'Key Loose A')
  const looseB = await createAt(cdp, A_ALPHA, 'Key Loose B')
  const shelfId = containerId()
  await op('create Key Shelf', { op: 'createContainer', id: shelfId, parentPath: '', kind: 'collection', name: 'Key Shelf' })
  await op('create Key Box', { op: 'createContainer', id: containerId(), parentPath: 'Key Shelf', kind: 'set', name: 'Key Box' })
  await createAt(cdp, 'Key Shelf/Key Box', 'Key Inside')
  const back = await createAt(cdp, 'Key Shelf', 'Key Back')
  const spent = await createAt(cdp, 'Key Shelf', 'Key Spent')
  const bulk = []
  for (let i = 1; i <= 40; i++) bulk.push(await createAt(cdp, 'Key Shelf', `Key Bulk ${String(i).padStart(2, '0')}`))
  await op('create Key Bare', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Key Bare' })
  await makeSet(cdp, 'Key Empty')
  // Outside the app, once its create is still past the watcher's 200 ms hold.
  await sleep(400)
  writeFileSync(abs(back), `${FM.exec(readRel(back))[0]}Back body.\n`)
  await sleep(600)
  for (const rel of [looseA, looseB]) {
    await deleteAt(cdp, rel, 'page')
    await sleep(20)
  }
  const keyColl = await bundledBy('delete Key Coll', { op: 'delete', path: 'Key Coll', kind: 'collection' })
  // The named rows archive last, so they list first, above the window's fold.
  for (const [rel, kind] of [...bulk.map((rel) => [rel, 'page']), ['Key Shelf/Key Box', 'set'], [back, 'page'], [spent, 'page']]) {
    await op(`archive ${rel}`, { op: 'archive', path: rel, kind })
    await sleep(20)
  }
  const SHELF = { kind: 'archive', id: shelfId }

  await openSettings(cdp, 'Trash')
  await until('the Key Coll row', () => cdp.evaluate(`!!(${trashRowEl('Key Coll')})`))
  const startWidth = await settingsWidth(cdp)
  await cdp.evaluate(`${TRASH_SEARCH}.focus()`)
  await pressKey(cdp, 'Tab')
  const landed = await focusedRow(cdp)
  await pressKey(cdp, 'ArrowDown')
  const stepped = await focusedRow(cdp)
  await pressKey(cdp, 'ArrowUp')
  const steppedBack = await focusedRow(cdp)
  await pressKey(cdp, 'Enter')
  const disclosed = await settles(async () => (await expandedOf(cdp, trashRowEl('Key Coll'))) === 'true' && same(titlesAfter(await listedTitles(cdp), 'Key Coll', 2), ['Key One', 'Key Two']))
  for (const key of ['ArrowRight', 'ArrowLeft']) await pressKey(cdp, key)
  const sideways = { focused: await focusedRow(cdp), expanded: await expandedOf(cdp, trashRowEl('Key Coll')), checked: await checkedIn(cdp, '.trash-frame') }
  await pressKey(cdp, 'ArrowDown')
  const onOne = await focusedRow(cdp)
  await pressKey(cdp, ' ')
  const spaced = await trashChecked(cdp, 'Key One')
  await pressKey(cdp, 'ArrowDown')
  const tabs = await tabCount(cdp)
  await pressKey(cdp, 'Enter')
  await sleep(500)
  const entered = { checked: await trashChecked(cdp, 'Key Two'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
  await pressKey(cdp, ' ')
  await pressKey(cdp, 'ArrowUp')
  await pressKey(cdp, ' ')
  const cleared = (await checkedIn(cdp, '.trash-frame')) === 0
  await pressKey(cdp, 'Tab')
  const left = await cdp.evaluate(`(() => { const a = document.activeElement; return !a?.closest('.bundle-rows') && !a?.matches('[role=checkbox]') })()`)
  item('7B', 'Keyboard', "the Trash's rows are one Tab stop whose arrows step, whose Enter discloses a container and checks a page, opening nothing, and whose Space checks a page",
    landed === 'Key Coll' && stepped === 'Key Loose B' && steppedBack === 'Key Coll' && disclosed && onOne === 'Key One' && spaced && same(entered, { checked: true, reader: false, tabs }) && cleared && left,
    show({ landed, stepped, steppedBack, disclosed, onOne, spaced, entered, cleared, left }))
  item('7B', '— (current behavior)', 'Left and Right on a row do nothing', same(sideways, { focused: 'Key Coll', expanded: 'true', checked: 0 }), show(sideways))

  await searchTrash(cdp, 'key one')
  const innerUnmatched = await settles(async () => { const t = await listedTitles(cdp); return !t.includes('Key Coll') && !t.includes('Key One') })
  await searchTrash(cdp, 'key coll')
  const followed = await settles(async () => same(await listedTitles(cdp), ['Key Coll', 'Key One', 'Key Two']))
  await searchTrash(cdp, '')
  item('7B', 'Search', "the search narrows top rows only, an open container's rows following it", innerUnmatched && followed, show({ innerUnmatched, followed, shown: await listedTitles(cdp) }))

  for (const t of ['Key Loose A', 'Key Loose B']) await checkTrash(cdp, t)
  await searchTrash(cdp, 'loose a')
  await settles(async () => same(await listedTitles(cdp), ['Key Loose A']))
  const searched = await chooseNative(cdp, trashRowEl('Key Loose A'), [])
  await searchTrash(cdp, '')
  await settles(async () => (await listedTitles(cdp)).includes('Key Loose B'))
  const unsearched = await chooseNative(cdp, trashRowEl('Key Loose A'), [])
  for (const t of ['Key Loose A', 'Key Loose B']) await checkTrash(cdp, t)
  item('7B', 'Collapsing, Search', 'a search that hides a checked row keeps it out of the menu',
    same(searched.rows, ['Restore', 'Delete']) && same(unsearched.rows, ['Restore All', 'Delete All']) && (await checkedIn(cdp, '.trash-frame')) === 0,
    show({ searched: searched.rows, unsearched: unsearched.rows }))

  await searchTrash(cdp, 'key loose')
  await pressKey(cdp, 'Escape')
  const trashEscape = await cdp.evaluate(`({ focused: document.activeElement === ${TRASH_SEARCH}, value: ${TRASH_SEARCH}.value, settings: !!document.querySelector('.settings-rail') })`)
  trashEscape.shown = await listedTitles(cdp)
  await searchTrash(cdp, 'zzz')
  const trashNothing = { line: await emptyLine(cdp, '.trash-empty'), rows: await cdp.evaluate(`document.querySelectorAll('.trash-frame .data-row').length`) }
  await searchTrash(cdp, '')
  await cdp.evaluate('document.activeElement?.blur()')

  const DATE_HEAD = sel('.trash-head-date')
  const styled = async (label, key, value) => {
    const { chosen } = await chooseNative(cdp, DATE_HEAD, label)
    return chosen && (await settles(async () => (trashStyle() ?? {})[key] === value))
  }
  const firstDate = () => cdp.evaluate(`document.querySelector('.trash-frame .bundle-date')?.textContent ?? ''`)
  const styles = {}
  styles.monthDayYear = (await styled('MM/DD/YYYY', 'date_format', 'monthDayYear')) && /^\d{2}\/\d{2}\/\d{4}/.test(await firstDate())
  styles.dayMonthYear = await styled('DD/MM/YYYY', 'date_format', 'dayMonthYear')
  styles.twentyFourHour = (await styled('24 Hours', 'time_format', 'twentyFourHour')) &&
    (await cdp.evaluate(`[...document.querySelectorAll('.trash-frame .bundle-date')].every((c) => !/AM|PM/.test(c.textContent))`))
  styles.hideTime = await styled('Hide Time', 'time_format', 'none')
  styles.relative = await styled('Relative', 'date_format', 'relative')
  styles.short = (await styled('Short Date', 'date_format', 'short')) && (await styled('Short', 'weekday', 'short'))
  for (const label of ['Full Date', 'Show Time', 'Hide Day']) await chooseNative(cdp, DATE_HEAD, label)
  styles.returned = await settles(async () => trashStyle() === undefined)
  item('7B', 'G-1', "the date column's other styles write their keys and draw their forms", Object.values(styles).every(Boolean), show({ styles, style: trashStyle() }))

  const look = await cdp.evaluate(`(() => { const hd = document.querySelector('.trash-head-date').getBoundingClientRect(); const cell = document.querySelector('.trash-frame .bundle-date').getBoundingClientRect(); const name = document.querySelector('.trash-head-name').firstElementChild.getBoundingClientRect(); const box = document.querySelector('.trash-frame .data-row [role=checkbox]').getBoundingClientRect(); return { column: Math.abs(hd.left - cell.left), nameLeft: name.left, box: [box.left, box.right], heights: [...document.querySelectorAll('.trash-frame .data-row')].every((r) => Math.abs(r.getBoundingClientRect().height - 29.75) < 0.01) } })()`)
  await chooseNative(cdp, DATE_HEAD, 'Full')
  await resizeBy(cdp, sel('.settings-window .resize-edge-se'), { dx: -400 })
  const narrowWidth = await settingsWidth(cdp)
  const narrow = await cdp.evaluate(`(() => { const t = document.querySelector('.trash-table'); const head = document.querySelector('.trash-head'); const row = document.querySelector('.trash-frame .data-row'); const at = () => ({ head: head.getBoundingClientRect().left, row: row.getBoundingClientRect().left }); const before = at(); t.scrollLeft = 120; const after = at(); const out = { over: t.scrollWidth > t.clientWidth, scrolled: t.scrollLeft, head: before.head - after.head, row: before.row - after.row, fit: [...document.querySelectorAll('.trash-frame .bundle-date')].every((c) => c.scrollWidth <= c.clientWidth) }; return out })()`)
  await shot(cdp, 'g7b-narrow-trash')
  await cdp.evaluate(`document.querySelector('.trash-table').scrollLeft = 0`)
  await resizeBy(cdp, sel('.settings-window .resize-edge-se'), { dx: startWidth - narrowWidth })
  const widthBack = await settingsWidth(cdp)
  await chooseNative(cdp, DATE_HEAD, 'Hide Day')
  await settles(async () => trashStyle() === undefined)
  item('7B', "Width, The Trash's Look, Row Look", 'a narrow Trash scrolls sideways with its heading, its labels where they were',
    look.column < 0.5 && look.nameLeft >= look.box[0] && look.nameLeft < look.box[1] && look.heights && Math.abs(narrowWidth - 620) < 0.5 &&
      narrow.over && narrow.scrolled === 120 && Math.abs(narrow.head - 120) < 0.5 && Math.abs(narrow.row - 120) < 0.5 && narrow.fit,
    show({ look, startWidth, narrowWidth, narrow, widthBack }))

  const ctrl = await popNative(cdp, await boxOf(cdp, `(${trashRowEl('Key Loose A')}).querySelector('.bundle-date')`), 'left', 2)
  await pickNative([])
  item('7B', 'Clicks', "a ctrl-press opens a row's menu and checks nothing",
    same(labels(ctrl), ['Restore', 'Delete']) && !(await trashChecked(cdp, 'Key Loose A')), show({ ctrl: labels(ctrl) }))
  await closeSettings(cdp)

  await sidebarTo(cdp, 'Collections', 'Key Shelf')
  await sleep(1200)
  await toArchive(cdp)
  await until('the Key Shelf rows', async () => (await arcTitles(cdp))[0] === 'Key Spent')
  await cdp.evaluate(`${ZONE}.focus()`)
  const arcLanded = await focusedRow(cdp)
  await pressKey(cdp, 'ArrowDown')
  const onBack = await focusedRow(cdp)
  await pressKey(cdp, ' ')
  const spacedBack = { checked: await arcChecked(cdp, 'Key Back'), face: await settles(async () => (await notice(cdp)) === 'Restore1 Page'), reader: await settles(() => cdp.evaluate(`!!${READER}`), 800) }
  await pressKey(cdp, ' ')
  const spacedOff = !(await arcChecked(cdp, 'Key Back'))
  await pressKey(cdp, 'Enter')
  const read = await settles(() => cdp.evaluate(`(${READER})?.querySelector('.cm-content')?.textContent.includes('Back body.') ?? false`))
  const enteredBack = await arcChecked(cdp, 'Key Back')
  await pressKey(cdp, 'Escape')
  const readerClosed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
  await cdp.evaluate(`${ZONE}.focus()`)
  const refocused = await focusedRow(cdp)
  await pressKey(cdp, ' ')
  await pressKey(cdp, 'ArrowDown')
  const onBox = await focusedRow(cdp)
  await pressKey(cdp, ' ')
  const boxSpaced = { checked: await arcChecked(cdp, 'Key Box'), expanded: await expandedOf(cdp, arcRow('Key Box')) }
  await pressKey(cdp, ' ')
  await pressKey(cdp, 'Enter')
  const boxEntered = await settles(async () => (await expandedOf(cdp, arcRow('Key Box'))) === 'true' && same(titlesAfter(await arcTitles(cdp), 'Key Box', 1), ['Key Inside']))
  item('7B', 'Keyboard, Clicks', "in the Archive, Space checks and unchecks a row, a Set's too, and Enter opens a page's reader leaving it checked and discloses a Set",
    arcLanded === 'Key Spent' && onBack === 'Key Back' && same(spacedBack, { checked: true, face: true, reader: false }) && spacedOff && read && enteredBack && readerClosed &&
      refocused === 'Key Back' && !(await arcChecked(cdp, 'Key Back')) && onBox === 'Key Box' && same(boxSpaced, { checked: true, expanded: 'false' }) && !(await arcChecked(cdp, 'Key Box')) && boxEntered,
    show({ arcLanded, onBack, spacedBack, spacedOff, read, enteredBack, readerClosed, refocused, onBox, boxSpaced, boxEntered }))

  const held = await focusedRow(cdp)
  await cdp.evaluate(`(() => { const s = ${live('.detail-scroll')}; s.scrollTop = s.scrollHeight })()`)
  await sleep(600)
  const kept7B = await cdp.evaluate(`(() => { const a = document.activeElement; return { connected: !!a?.isConnected, row: a?.matches?.('.data-row[role=treeitem]') ?? false, title: a?.querySelector?.('.cell-title-text')?.textContent ?? null, drawn: document.querySelectorAll('.bundle-rows .data-row').length } })()`)
  const listedCount = (await rows(SHELF)).length
  await cdp.evaluate(`(${live('.detail-scroll')}).scrollTop = 0`)
  item('7B', '4.7, Keyboard', 'the focused row stays drawn while the list scrolls past it',
    held === 'Key Box' && kept7B.connected && kept7B.row && kept7B.title === held && kept7B.drawn < listedCount, show({ held, kept7B, listedCount }))

  await mouseClick(cdp, live('.detail-title-text'))
  await until('the search field', () => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`)).catch(() => {})
  await typeText(cdp, 'bulk')
  await settles(async () => (await arcTitles(cdp)).every((t) => t.startsWith('Key Bulk')))
  await pressKey(cdp, 'Escape')
  const archiveEscape = await cdp.evaluate(`({ focused: document.activeElement?.matches('.detail-title-search') ?? false, value: (${live('.detail-title-search')})?.value ?? null })`)
  archiveEscape.count = await results(cdp)
  await pressKey(cdp, 'Escape')
  const archiveClosed = await settles(async () => !(await searching(cdp)) && (await results(cdp)) === '43')
  item('7B', 'Search', "Escape in either search leaves its field and keeps its query, and a second closes the Archive's",
    same(trashEscape, { focused: false, value: 'key loose', settings: true, shown: ['Key Loose B', 'Key Loose A'] }) && same(archiveEscape, { focused: false, value: 'bulk', count: '40' }) && archiveClosed,
    show({ trashEscape, archiveEscape, archiveClosed }))

  await cdp.evaluate('document.activeElement?.blur()')
  await pressKey(cdp, 'f', META)
  const commanded = await settles(() => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`))
  await pressKey(cdp, 'Escape')
  const commandClosed = await settles(async () => !(await searching(cdp)))
  const { chosen: menuSearch } = await chooseNative(cdp, live('.detail-title-text'), 'Search')
  const fromMenu = await settles(() => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`))
  const counted = await results(cdp)
  await typeText(cdp, 'key b')
  const narrowedCount = await settles(async () => (await results(cdp)) === '42')
  const insideFollows = same(titlesAfter(await arcTitles(cdp), 'Key Box', 1), ['Key Inside'])
  await mouseClick(cdp, live('.detail-title-clear button'))
  await settles(async () => (await arcTitles(cdp)).includes('Key Spent'))
  item('7B', 'Search, G-1 ruling 15', "⌘F and the title's Search open the Archive's search, and its Results count only the top rows it leaves",
    commanded && commandClosed && menuSearch && fromMenu && counted === '43' && narrowedCount && insideFollows, show({ commanded, commandClosed, menuSearch, fromMenu, counted, results: await results(cdp), insideFollows }))

  await mouseClick(cdp, live('.detail-title-text'))
  await until('the search field', () => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`)).catch(() => {})
  await typeText(cdp, 'zzz')
  await settles(async () => (await arcTitles(cdp)).length === 0)
  const archiveNothing = { line: await emptyLine(cdp, '.archive-empty'), rows: (await arcTitles(cdp)).length }
  await mouseClick(cdp, live('.detail-title-clear button'))
  await settles(async () => (await arcTitles(cdp)).includes('Key Spent'))

  const before = Object.fromEntries((await rows(SHELF)).map((r) => [r.title, r.bundlePath]))
  const { chosen: backChosen, rows: backRows } = await chooseNative(cdp, arcRow('Key Back'), 'Restore')
  const backSaid = await noticeUp(cdp, 'Restored “Key Back”Undo')
  const backLanded = exists('Key Shelf/Key Back.md')
  await pointerAway(cdp)
  await cdp.evaluate('document.activeElement?.blur()')
  await pressKey(cdp, 'z', META)
  const chorded = await settles(async () => exists(before['Key Back']) && !exists('Key Shelf/Key Back.md') && (await drained(cdp)))
  item('7B', 'Undo, I-3', "a page's Restore from the Archive offers an Undo that ⌘Z runs", backChosen && backSaid && backLanded && chorded, show({ backChosen, backRows, backSaid, backLanded, chorded, notice: await notice(cdp) }))

  await until('Key Back back', async () => (await arcTitles(cdp)).includes('Key Back')).catch(() => {})
  const { chosen: spentChosen } = await chooseNative(cdp, arcRow('Key Spent'), 'Delete')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  if (await cdp.evaluate(`!!${DIALOG}`)) await pressDialog(cdp, 'Delete')
  const spentSaid = await noticeUp(cdp, 'Deleted “Key Spent”Undo')
  const frames = () => cdp.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')
  await frames()
  const far = await cdp.evaluate(`({ x: 8, y: innerHeight - 8 })`)
  await moveTo(cdp, far)
  await frames()
  await moveTo(cdp, await boxOf(cdp, LABEL))
  await click(cdp, ribbon('Settings'))
  await until('the Settings window', () => cdp.evaluate(`!!document.querySelector('.settings-rail')`))
  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === 'Trash')`)
  await until('the Key Spent row', () => cdp.evaluate(`!!(${trashRowEl('Key Spent')})`))
  const spentMenu = await menuByEvent(cdp, trashRowEl('Key Spent'))
  const spentPicked = await pickNative(['Restore'])
  const spentNamed = async () => [...(await rows({ kind: 'trash' })), ...(await rows(SHELF))].some((r) => r.title === 'Key Spent')
  const spentBack = await settles(async () => exists('Key Shelf/Key Spent.md') && !(await spentNamed()) && (await notice(cdp)) === 'Restored “Key Spent”', 1500)
  await moveTo(cdp, far)
  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const spentStays = exists('Key Shelf/Key Spent.md') && !(await spentNamed())
  item('7B', 'Undo, E-3', "a Trash restore of what an Archive delete moved spends that delete's Undo",
    spentChosen && spentSaid && same(labels(spentMenu), ['Restore', 'Delete']) && spentPicked && spentBack && spentStays, show({ spentChosen, spentSaid, spentMenu: labels(spentMenu), spentPicked, spentBack, spentStays, notice: await notice(cdp) }))
  await click(cdp, ribbon('Settings'))
  await sleep(600)

  const grid = `(${live('.bundle-rows')}).closest('.table-grid')`
  const roomy = await cdp.evaluate(`(() => { const g = ${grid}; return { min: parseFloat(getComputedStyle(g).minWidth), content: (${live('.detail-scroll')}).clientWidth, viewport: innerWidth, height: innerHeight } })()`)
  const narrowTo = Math.round(roomy.viewport - (roomy.content - (roomy.min - 120)))
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: narrowTo, height: roomy.height, deviceScaleFactor: 0, mobile: false })
  await sleep(1000)
  const squeezed = await cdp.evaluate(`(() => {
    const g = ${grid}
    const scroller = (() => { for (let e = g.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if ((o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth) return e } return null })()
    const row = ${live('.bundle-rows .data-row')}
    const before = row.getBoundingClientRect().left
    if (scroller) scroller.scrollLeft = 60
    const moved = before - row.getBoundingClientRect().left
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
    const edge = scroller ? scroller.getBoundingClientRect().right : innerWidth
    const dates = [...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]'))
    return {
      viewport: innerWidth,
      gridWidth: g.getBoundingClientRect().width,
      min: parseFloat(getComputedStyle(g).minWidth),
      scroller: scroller?.className ?? null,
      moved,
      fit: dates.every((c) => c.scrollWidth <= c.clientWidth),
      reached: Math.max(...dates.map((c) => c.getBoundingClientRect().right)) <= edge + 0.5,
    }
  })()`)
  await shot(cdp, 'g7b-narrow-archive')
  await cdp.evaluate(`(() => { const g = ${grid}; for (let e = g.parentElement; e; e = e.parentElement) e.scrollLeft = 0 })()`)
  await cdp.send('Emulation.clearDeviceMetricsOverride')
  await sleep(800)
  item('7B', 'Width', 'a narrow Archive scrolls sideways, nothing clipped',
    !!squeezed.scroller && Math.abs(squeezed.moved - 60) < 0.5 && squeezed.gridWidth >= squeezed.min - 0.5 && squeezed.fit && squeezed.reached,
    show({ roomy, narrowTo, squeezed }))

  const crumbs = await trailOf(cdp, live('.subfield-crumbs'))
  await mouseClick(cdp, `[...document.querySelectorAll('.subfield-crumbs *')].find((e) => !e.closest('[inert]') && e.children.length === 0 && e.textContent.trim() === 'Key Shelf')`)
  const byCrumb = await settles(async () => !(await cdp.evaluate(`!!(${live('.detail-title-trailing')})`)))
  await toArchive(cdp)
  await mouseClick(cdp, live('button[title="Views"]'))
  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
  const VIEW_ROW = `(${ARCHIVE_ROW})?.parentElement.querySelector('[data-line-row] [role="button"], [data-line-row][role="button"]')`
  await mouseClick(cdp, VIEW_ROW)
  const byView = await settles(async () => !(await cdp.evaluate(`!!(${live('.detail-title-trailing')})`)))
  if (!(await cdp.evaluate(`!!(${ARCHIVE_ROW})`))) await mouseClick(cdp, live('button[title="Views"]'))
  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
  const rings = await cdp.evaluate(`(() => { const v = ${VIEW_ROW}; const a = ${ARCHIVE_ROW}; return { view: !!v && ${picked('v')}, archive: !!a && ${picked('a')} } })()`)
  await pressKey(cdp, 'Escape')
  item('7B', 'G-4, G-5', "picking a view, or the owner's crumb, leaves the Archive",
    same(crumbs, ['Key Shelf', 'Archive']) && byCrumb && byView && same(rings, { view: true, archive: false }), show({ crumbs, byCrumb, byView, rings }))

  await sidebarTo(cdp, 'Collections', 'Key Bare')
  await sleep(1200)
  await toArchive(cdp)
  await settles(async () => (await emptyLine(cdp, '.archive-empty')) !== null)
  const bare = { line: await emptyLine(cdp, '.archive-empty'), count: await results(cdp) }
  await unfold(cdp, COLLECTION, 'Key Empty')
  await click(cdp, sidebarRow('Key Empty'))
  await sleep(1200)
  await toArchive(cdp)
  await settles(async () => (await emptyLine(cdp, '.archive-empty')) === "This Set's archive is empty.")
  const emptySet = await emptyLine(cdp, '.archive-empty')
  item('7B', 'G-1', 'an archive or a search with nothing to show reads its line',
    bare.line === "This Collection's archive is empty." && bare.count === '0' && emptySet === "This Set's archive is empty." &&
      same(archiveNothing, { line: 'Nothing matches.', rows: 0 }) && same(trashNothing, { line: 'Nothing matches.', rows: 0 }),
    show({ bare, emptySet, archiveNothing, trashNothing }))

  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  await emptyAt(keyColl)
  for (const t of ['Key Loose A', 'Key Loose B']) await emptyAt((await trashed(cdp, t))?.bundlePath)
  for (const [path, kind] of [['Key Shelf', 'collection'], ['Key Bare', 'collection'], [`${COLLECTION}/Key Empty`, 'set']])
    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
  for (const key of ['confirmDeletion', 'permanentDelete', 'trashColumnStyle']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
  await sleep(400)
  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
  const ended = await standing()
  item('7B', '—', 'the group leaves Collection A, the Trash, and every Archive it touched as it found them',
    same(ended, start) && Math.abs(widthBack - startWidth) < 1 && !['Key Coll', 'Key Shelf', 'Key Bare'].some(exists) && !exists(`.nexus/archive/${shelfId}`),
    show({ start, ended, startWidth, widthBack }))
}

// ── Group 7C — questions and settings (Disclosable Bundles, Phase 7) ────────

const ASKS = ['confirmDeletion', 'permanentDelete', 'restoreLinksOnDeletion']
const propertyIds = () => Object.keys(JSON.parse(readRel('.nexus/properties.json')).defs ?? {}).sort()
/** A row's Delete, or `label`, chosen and its question read once it's up. */
async function askDelete(cdp, expr, label = 'Delete') {
  await chooseNative(cdp, expr, label)
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  return dialogRead(cdp)
}
const dialogGone = (cdp) => settles(async () => !(await cdp.evaluate(`!!${DIALOG}`)))
async function flip(cdp, label) {
  await openSettings(cdp, 'Files & Links')
  await press(cdp, SWITCH(label))
  await sleep(400)
}

async function group7C(cdp) {
  const kept = personal()
  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
  const ARCHIVE_A = `.nexus/archive/${colA}`
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  const CHAINS = ['.trash/Collection A/Set Alpha', '.trash/Collection A']
  const standing = async () => ({
    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
    trash: (await rows({ kind: 'trash' })).length,
    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
    properties: propertyIds(),
    keys: Object.fromEntries(ASKS.map((k) => [k, personal()[k] ?? null])),
    chains: CHAINS.filter(exists),
  })
  const start = await standing()

  const askPage = await createAt(cdp, A_ALPHA, 'Ask Page')
  const askGone = await createAt(cdp, A_ALPHA, 'Ask Gone')
  await makeSet(cdp, 'Ask Set')
  const askArc = await createAt(cdp, A_ALPHA, 'Ask Arc')
  await makeSet(cdp, 'Ask Shelf')
  await createAt(cdp, `${COLLECTION}/Ask Shelf`, 'Ask Inside')
  const { created: { propertyId: linkId } } = await op('add Drive Link', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Link', type: 'link' } })
  const target = await createAt(cdp, A_ALPHA, 'Link Target')
  const holder = await createAt(cdp, A_ALPHA, 'Link Holder')
  await op('link the holder', { op: 'setProperty', path: holder, propertyId: linkId, value: { kind: 'link', value: '[[Link Target]]' } })
  await sleep(400)
  for (const [rel, kind] of [[askPage, 'page'], [askGone, 'page'], [`${COLLECTION}/Ask Set`, 'set']]) {
    await deleteAt(cdp, rel, kind)
    await sleep(20)
  }
  for (const [rel, kind] of [[askArc, 'page'], [`${COLLECTION}/Ask Shelf`, 'set']]) await op(`archive ${rel}`, { op: 'archive', path: rel, kind })
  const bundles = {}
  for (const t of ['Ask Page', 'Ask Gone', 'Ask Set']) bundles[t] = (await trashed(cdp, t))?.bundlePath
  const ERASED = 'It will be erased from this computer. This cannot be undone.'

  await flip(cdp, 'Permanently Delete Files')
  const permanentOn = await settles(async () => personal().permanentDelete === true)
  await openSettings(cdp, 'Trash')
  await until('the Ask Page row', () => cdp.evaluate(`!!(${trashRowEl('Ask Page')})`))
  const asked = await askDelete(cdp, trashRowEl('Ask Page'))
  await pressKey(cdp, 'Enter')
  const enterKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
  await askDelete(cdp, trashRowEl('Ask Page'))
  await pressKey(cdp, 'Escape')
  const escapeKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
  await askDelete(cdp, trashRowEl('Ask Page'))
  await mouseAt(cdp, { x: 6, y: 6 })
  const outsideKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
  await askDelete(cdp, trashRowEl('Ask Page'))
  await pressDialog(cdp, 'Cancel')
  const cancelKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
  await flip(cdp, 'Permanently Delete Files')
  const permanentOff = await settles(async () => !('permanentDelete' in personal()))
  await openSettings(cdp, 'Trash')
  const offAsked = await askDelete(cdp, trashRowEl('Ask Page'))
  await pressDialog(cdp, 'Cancel')
  await dialogGone(cdp)
  await flip(cdp, 'Permanently Delete Files')
  await settles(async () => personal().permanentDelete === true)
  await openSettings(cdp, 'Trash')
  const goneAsked = await askDelete(cdp, trashRowEl('Ask Gone'))
  if (goneAsked) await pressDialog(cdp, 'Delete')
  const goneSaid = await postedPlain(cdp, 'Deleted “Ask Gone”')
  const goneEmptied = await settles(async () => !exists(bundles['Ask Gone']) && exists(bundles['Ask Page']))
  item('7C', 'K-4, K-5', "a Trash Delete's question follows Permanently Delete, and Escape, an outside press, and Cancel each keep the bundle",
    permanentOn && asked?.message === 'Delete “Ask Page”?' && asked.detail === ERASED && escapeKept && outsideKept && cancelKept && permanentOff &&
      offAsked?.detail === 'It will move to your system trash, which is where you would get it back from.' && goneAsked?.message === 'Delete “Ask Gone”?' && goneSaid && goneEmptied,
    show({ permanentOn, asked, escapeKept, outsideKept, cancelKept, permanentOff, offAsked, goneAsked, goneSaid, goneEmptied, notice: await notice(cdp) }))
  item('7C', '— (current behavior)', "Enter in a Trash Delete's question cancels it, keeping the bundle", enterKept, show({ enterKept }))
  await closeSettings(cdp)

  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(1200)
  await toArchive(cdp)
  await until('the Ask rows', async () => { const t = await arcTitles(cdp); return t.includes('Ask Arc') && t.includes('Ask Shelf') })
  const arcBundle = archivedBundle('Ask Arc')
  const arcAsked = await askDelete(cdp, arcRow('Ask Arc'))
  await pressKey(cdp, 'Enter')
  const enterSaid = await noticeUp(cdp, 'Deleted “Ask Arc”Undo')
  const enterTrash = (await trashed(cdp, 'Ask Arc'))?.bundlePath
  const enterMoved = !!enterTrash && stamped(`.trash/${A_ALPHA}`, 'Ask Arc', '.deleted').test(enterTrash) && !exists(arcBundle)
  if (enterSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const enterBack = await settles(async () => exists(arcBundle) && !exists(enterTrash))
  item('7C', '— (current behavior)', "Enter in an Archive Delete's question answers Delete, and its Undo returns the page to the Archive",
    arcAsked?.message === 'Delete “Ask Arc”?' && enterSaid && enterMoved && enterBack, show({ arcAsked, enterSaid, enterTrash, enterMoved, enterBack }))
  await until('the notice drained', () => drained(cdp)).catch(() => {})

  await flip(cdp, 'Confirm Before Deletion')
  const confirmOff = await settles(async () => personal().confirmDeletion === false)
  await closeSettings(cdp)
  await chooseNative(cdp, arcRow('Ask Arc'), 'Delete')
  const [unasked, unaskedSaid] = await Promise.all([
    holds(async () => !(await cdp.evaluate(`!!${DIALOG}`)), 1500),
    noticeUp(cdp, 'Deleted “Ask Arc”Undo'),
  ])
  if (unaskedSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const unaskedBack = await settles(async () => exists(arcBundle) && !(await trashed(cdp, 'Ask Arc')))
  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const shelfBundle = archivedBundle('Ask Shelf')
  const shelfAsked = await askDelete(cdp, arcRow('Ask Shelf'))
  if (shelfAsked) await pressDialog(cdp, 'Delete')
  const shelfSaid = await noticeUp(cdp, 'Deleted “Ask Shelf”Undo')
  const shelfTrashed = !!(await trashed(cdp, 'Ask Shelf')) && !exists(shelfBundle)
  if (shelfSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const shelfBack = await settles(async () => exists(shelfBundle) && !(await trashed(cdp, 'Ask Shelf')))
  await until('the notice drained', () => drained(cdp)).catch(() => {})
  item('7C', 'I-2, K-5', "with Confirm Before Deletion off, an Archive page's Delete asks nothing, while an Archive Set's still asks",
    confirmOff && unasked && unaskedSaid && unaskedBack && shelfAsked?.message === 'Delete “Ask Shelf”?' && shelfSaid && shelfTrashed && shelfBack,
    show({ confirmOff, unasked, unaskedSaid, unaskedBack, shelfAsked, shelfSaid, shelfTrashed, shelfBack }))
  await openSettings(cdp, 'Trash')
  const setAsked = await askDelete(cdp, trashRowEl('Ask Set'))
  if (setAsked) await pressDialog(cdp, 'Cancel')
  const setKept = (await dialogGone(cdp)) && exists(bundles['Ask Set'])
  item('7C', '— (current behavior)', "with Confirm Before Deletion off, the Trash's Delete still asks", setAsked?.message === 'Delete “Ask Set”?' && setKept, show({ setAsked, setKept }))
  await flip(cdp, 'Confirm Before Deletion')
  const confirmBack = await settles(async () => !('confirmDeletion' in personal()))
  await closeSettings(cdp)

  await checkArc(cdp, 'Ask Arc')
  await mouseClick(cdp, boxIn(arcRow('Ask Shelf')))
  const itemsFace = await settles(async () => (await notice(cdp)) === 'Restore2 Items')
  await pressBar(cdp, 'Delete', 'Restore2 Items')
  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
  const barAsked = await dialogRead(cdp)
  if (barAsked) await pressDialog(cdp, 'Cancel')
  const barKept = (await dialogGone(cdp)) && exists(arcBundle) && exists(shelfBundle)
  await checkArc(cdp, 'Ask Arc')
  await mouseClick(cdp, boxIn(arcRow('Ask Shelf')))
  await openSettings(cdp, 'Trash')
  const checkBoth = async () => {
    await checkTrash(cdp, 'Ask Page')
    await mouseClick(cdp, boxIn(trashRowEl('Ask Set')))
  }
  await checkBoth()
  const allAsked = await askDelete(cdp, trashRowEl('Ask Page'), 'Delete All')
  if (allAsked) await pressDialog(cdp, 'Cancel')
  const allKept = (await dialogGone(cdp)) && exists(bundles['Ask Page']) && exists(bundles['Ask Set'])
  await checkBoth()
  item('7C', 'G-6, K-4', 'a batch of a page and a Set reads Items in the bar and in both questions',
    confirmBack && itemsFace && barAsked?.message === 'Delete these 2 Items?' && barKept && allAsked?.message === 'Delete these 2 Items?' && allKept,
    show({ confirmBack, itemsFace, barAsked, barKept, allAsked, allKept }))

  const linked = () => frontOf(holder)['Drive Link'] ?? null
  await closeSettings(cdp)
  await deleteAt(cdp, target, 'page')
  const stripped = await settles(async () => linked() === null)
  await openSettings(cdp, 'Trash')
  await until('the Link Target row', () => cdp.evaluate(`!!(${trashRowEl('Link Target')})`))
  await chooseNative(cdp, trashRowEl('Link Target'), 'Restore')
  const relinked = await settles(async () => exists(target) && linked() === '[[Link Target]]')
  await flip(cdp, 'Restore Links On Deletion')
  const linksOff = await settles(async () => personal().restoreLinksOnDeletion === false)
  await deleteAt(cdp, target, 'page')
  await settles(async () => linked() === null)
  await openSettings(cdp, 'Trash')
  await until('the Link Target row', () => cdp.evaluate(`!!(${trashRowEl('Link Target')})`))
  await chooseNative(cdp, trashRowEl('Link Target'), 'Restore')
  const unlinked = (await settles(async () => exists(target))) && (await holds(async () => linked() === null, 1500))
  await flip(cdp, 'Restore Links On Deletion')
  const linksOn = await settles(async () => !('restoreLinksOnDeletion' in personal()))
  await closeSettings(cdp)
  item('7C', 'F-2', 'Restore Links On Deletion puts a restored page back into the Link values that named it, and off leaves them removed',
    stripped && relinked && linksOff && unlinked && linksOn, show({ stripped, relinked, linksOff, unlinked, linksOn, linked: linked() }))

  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
  for (const t of ['Ask Page', 'Ask Set']) await emptyAt(bundles[t])
  for (const [path, kind] of [[arcBundle, 'page'], [shelfBundle, 'set'], [target, 'page'], [holder, 'page']])
    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
  await op('delete Drive Link', { op: 'deleteProperty', propertyId: linkId })
  await emptyAt((await trashed(cdp, 'Drive Link'))?.bundlePath)
  for (const key of ASKS) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
  await sleep(400)
  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
  const ended = await standing()
  item('7C', '—', 'the group leaves Set Alpha, Collection A, its Archive, and the Trash as it found them', same(ended, start), show({ start, ended }))
}

// ── Group 7D — single and homeless rows (Disclosable Bundles, Phase 7) ──────

const CONTEXTS_JSON = '.nexus/contexts/contexts.json'
const contextTitles = () => JSON.parse(readRel(CONTEXTS_JSON)).contexts.map((c) => c.title)
const contextIdOf = (title) => JSON.parse(readRel(CONTEXTS_JSON)).contexts.find((c) => c.title === title)?.id
const fontStyleOf = (cdp, expr) => cdp.evaluate(`(() => { const t = (${expr})?.querySelector('.bundle-trail'); return t ? getComputedStyle(t).fontStyle : null })()`)
/** A page shadowed at its old path by an outside file carrying a task-marked id, as another editor leaves one. */
const squat = (rel) => writeFileSync(abs(rel), `---\nID: ${mintPageId().replace(/^(.{10})P/, '$1T')}\n---\nsquatter`)

async function group7D(cdp) {
  const kept = personal()
  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
  const ARCHIVE_A = `.nexus/archive/${colA}`
  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
  const CHAINS = [`${ARCHIVE_A}/Collection A/Arc Gone Set`, '.trash/Collection A/Set Alpha', '.trash/Collection A/Stray Set', '.trash/Collection A/Arc Gone Set', '.trash/Collection A', '.trash/Collection B', '.trash/.nexus/contexts/Drive Ctx', '.trash/.nexus/contexts/Areas', '.trash/.nexus/contexts', '.trash/.nexus']
  const standing = async () => ({
    collections: stateOrder().collections ?? [],
    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
    bPages: orderIn('Collection B/_pagecollection.json', 'page_order'),
    contexts: readRel(CONTEXTS_JSON),
    properties: propertyIds(),
    trash: (await rows({ kind: 'trash' })).length,
    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
    chains: CHAINS.filter(exists),
  })
  const start = await standing()

  const wholeId = containerId()
  await op('create Whole Coll', { op: 'createContainer', id: wholeId, parentPath: '', kind: 'collection', name: 'Whole Coll' })
  const wholePage = await createAt(cdp, 'Whole Coll', 'Whole Page')
  const live7D = await createAt(cdp, A_ALPHA, 'Live Page')
  await makeSet(cdp, 'Stray Set')
  const strays = [await createAt(cdp, `${COLLECTION}/Stray Set`, 'Stray Page'), await createAt(cdp, `${COLLECTION}/Stray Set`, 'Stray Two')]
  const ctxId = containerId()
  await op('create Drive Ctx', { op: 'createContextGroup', id: ctxId, name: 'Drive Ctx' })
  for (const s of ['Drive Spc', 'Drive Spc Two']) await op(`create ${s}`, { op: 'createSpace', id: containerId(), contextId: ctxId, name: s })
  const { created: { propertyId: propId } } = await op('add Drive Prop', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Prop', type: 'select', select_options: [{ key: 'One', label: 'One' }] } })
  const partId = containerId()
  await op('create Part Coll', { op: 'createContainer', id: partId, parentPath: '', kind: 'collection', name: 'Part Coll' })
  await createAt(cdp, 'Part Coll', 'Part Page')
  await makeSet(cdp, 'Arc Gone Set')
  const arcLost = await createAt(cdp, `${COLLECTION}/Arc Gone Set`, 'Arc Lost')
  const squats = ['Squat One', 'Squat Two', 'Squat Arc'].map((t) => page(A_ALPHA, t))
  for (const rel of squats) await createAt(cdp, A_ALPHA, rel.split('/').at(-1).replace(/\.md$/, ''))
  const dup = await createAt(cdp, A_ALPHA, 'Dup Page')
  const fine = await createAt(cdp, A_ALPHA, 'Dup Fine')
  await sleep(400)
  const collectionsBefore = stateOrder().collections ?? []

  await deleteAt(cdp, 'Whole Coll', 'collection')
  await deleteAt(cdp, live7D, 'page')
  for (const rel of strays) await deleteAt(cdp, rel, 'page')
  await deleteAt(cdp, `${COLLECTION}/Stray Set`, 'set')
  for (const s of ['Drive Spc', 'Drive Spc Two']) await deleteAt(cdp, `.nexus/contexts/Drive Ctx/${s}`, 'space')
  await deleteAt(cdp, '.nexus/contexts/Drive Ctx', 'context')
  await op('delete Drive Prop', { op: 'deleteProperty', propertyId: propId })
  const part = await bundledBy('delete Part Coll', { op: 'delete', path: 'Part Coll', kind: 'collection' })
  await op('archive Arc Lost', { op: 'archive', path: arcLost, kind: 'page' })
  await deleteAt(cdp, `${COLLECTION}/Arc Gone Set`, 'set')
  for (const rel of squats.slice(0, 2)) await deleteAt(cdp, rel, 'page')
  await op('archive Squat Arc', { op: 'archive', path: squats[2], kind: 'page' })
  for (const rel of [dup, fine]) await deleteAt(cdp, rel, 'page')
  await sleep(400)
  for (const rel of squats) squat(rel)
  writeFileSync(abs(page(A_ALPHA, 'Dup Twin')), `---\nID: ${frontOf(`${(await trashed(cdp, 'Dup Page')).bundlePath}/Dup Page.md`).ID}\n---\ntwin\n`)
  writeFileSync(abs(`${part}/_record.json`), JSON.stringify({ ...recordAt(part), partial: true }))
  await sleep(1500)
  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))

  await openSettings(cdp, 'Trash')
  await chooseNative(cdp, await trashRowShown(cdp, 'Whole Coll'), 'Restore')
  const wholeSaid = await postedPlain(cdp, 'Restored “Whole Coll”')
  const wholeBack = await settles(async () => exists(wholePage) && frontOf(wholePage).ID === ids[wholePage] && same(stateOrder().collections ?? [], collectionsBefore.filter((id) => id !== partId)) && !(await listedTitles(cdp)).includes('Whole Coll'))
  item('7D', 'E-2, A-3', "a trashed Collection's Restore returns it whole and posts its title", wholeSaid && wholeBack, show({ wholeSaid, wholeBack, notice: await notice(cdp), order: stateOrder().collections }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await closeSettings(cdp)
  await deleteAt(cdp, 'Whole Coll', 'collection')
  await openSettings(cdp, 'Trash')
  const wholeBundle = (await trashed(cdp, 'Whole Coll'))?.bundlePath
  const wholeAsked = await askDelete(cdp, await trashRowShown(cdp, 'Whole Coll'))
  if (wholeAsked) await pressDialog(cdp, 'Delete')
  const wholeGoneSaid = await postedPlain(cdp, 'Deleted “Whole Coll”')
  const wholeEmptied = await settles(async () => !!wholeBundle && !exists(wholeBundle) && !exists(`.nexus/archive/${wholeId}`))
  item('7D', 'K-4', "a trashed Collection's Delete asks by its title, empties it, and posts its title",
    wholeAsked?.message === 'Delete “Whole Coll”?' && wholeGoneSaid && wholeEmptied, show({ wholeAsked, wholeGoneSaid, wholeEmptied }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const liveTrail = { trail: await trashTrailOf(cdp, 'Live Page'), style: await fontStyleOf(cdp, await trashRowShown(cdp, 'Live Page')) }
  const strayTrail = { trail: await trashTrailOf(cdp, 'Stray Two'), style: await fontStyleOf(cdp, await trashRowShown(cdp, 'Stray Two')) }
  const strayMenu = await popAt(cdp, trashRowEl('Stray Two'))
  const strayChosen = await pickNative(restoreInto(strayMenu, 'Collection B'))
  const strayLanded = await settles(async () => exists('Collection B/Stray Two.md'))
  item('7D', 'Trails, Homeless Items', "a resolving row's trail reads live, a homeless one's reads historical, and the homeless page restores through Restore ▸",
    same(liveTrail, { trail: [COLLECTION, 'Set Alpha'], style: 'normal' }) && same(strayTrail, { trail: [COLLECTION, 'Stray Set'], style: 'italic' }) &&
      !!strayMenu?.find((r) => r.label === 'Restore')?.submenu && strayChosen && strayLanded,
    show({ liveTrail, strayTrail, strayMenu: labels(strayMenu), strayChosen, strayLanded }))

  const singles = ['Drive Ctx', 'Drive Spc', 'Drive Prop']
  const singleShape = async (title) => cdp.evaluate(`(() => { const r = ${await trashRowShown(cdp, title)}; return { expanded: r.getAttribute('aria-expanded'), outline: !!r.querySelector('[data-drop-outline]'), chevron: !!r.querySelector('.row-chevron') } })()`)
  const shapes = {}
  const checkedOnClick = {}
  for (const t of singles) {
    shapes[t] = await singleShape(t)
    await checkTrash(cdp, t)
    checkedOnClick[t] = await trashChecked(cdp, t)
  }
  const tabs = await tabCount(cdp)
  await doubleClick(cdp, titleIn(trashRowEl('Drive Prop')))
  await sleep(600)
  const propDouble = { checked: await trashChecked(cdp, 'Drive Prop'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
  const selectGlyph = await cdp.evaluate(`!!(${trashRowEl('Drive Prop')}).querySelector('.cell-title svg.lucide-send')`)
  for (const t of singles) await checkTrash(cdp, t)
  const flat = { expanded: null, outline: false, chevron: false }
  item('7D', 'Single Rows', 'a Context, a Space, and a property list as single rows that check on a click',
    singles.every((t) => same(shapes[t], flat) && checkedOnClick[t]) && same(propDouble, { checked: true, reader: false, tabs }) && selectGlyph && (await checkedIn(cdp, '.trash-frame')) === 0,
    show({ shapes, checkedOnClick, propDouble, selectGlyph }))

  const spaceMenu = await popAt(cdp, await trashRowShown(cdp, 'Drive Spc Two'))
  const spaceTargets = labels(spaceMenu?.find((r) => r.label === 'Restore')?.submenu)
  const spaceChosen = await pickNative(restoreInto(spaceMenu, 'Areas'))
  const spaceLanded = await settles(async () => exists('.nexus/contexts/Areas/Drive Spc Two/_space.json'))
  item('7D', 'Homeless Items', 'a homeless Space restores into the Context picked',
    same(spaceTargets, contextTitles()) && !spaceTargets.includes(COLLECTION) && spaceChosen && spaceLanded, show({ spaceTargets, spaceChosen, spaceLanded }))

  for (const t of ['Stray Page', 'Drive Spc']) await checkTrash(cdp, t)
  const answerOf = (rows) => (labels(rows).includes('Areas') ? 'Areas' : 'Collection B')
  const askedKinds = []
  await chooseNative(cdp, trashRowEl('Stray Page'), 'Restore All')
  const firstAsk = await until('the first ask', nativeRows, 3000).catch(() => null)
  askedKinds.push(answerOf(firstAsk))
  await pickNative(intoPath(firstAsk, answerOf(firstAsk)))
  const secondAsk = await until('the second ask', nativeRows, 3000).catch(() => null)
  askedKinds.push(answerOf(secondAsk))
  await pickNative([])
  const nothing = await holds(async () => { const t = await listedTitles(cdp); return t.includes('Stray Page') && t.includes('Drive Spc') && !exists('Collection B/Stray Page.md') && !exists('.nexus/contexts/Areas/Drive Spc') }, 1500)
  await chooseNative(cdp, trashRowEl('Stray Page'), 'Restore All')
  for (let i = 0; i < 2; i++) {
    const asked = await until('the ask', nativeRows, 3000).catch(() => null)
    await pickNative(intoPath(asked, answerOf(asked)))
  }
  const bothLanded = await settles(async () => exists('Collection B/Stray Page.md') && exists('.nexus/contexts/Areas/Drive Spc/_space.json'))
  const itemsSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Items')
  item('7D', 'Batch Restore', 'a batch of a homeless page and a homeless Space asks once per kind, and dismissing the second restores nothing',
    same([...askedKinds].sort(), ['Areas', 'Collection B']) && nothing && bothLanded && itemsSaid, show({ askedKinds, nothing, bothLanded, notice: await notice(cdp) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await chooseNative(cdp, await trashRowShown(cdp, 'Drive Ctx'), 'Restore')
  const ctxSaid = await postedPlain(cdp, 'Restored “Drive Ctx”')
  const ctxBack = await settles(async () => contextTitles().includes('Drive Ctx') && !(await listedTitles(cdp)).includes('Drive Ctx'))
  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await chooseNative(cdp, await trashRowShown(cdp, 'Drive Prop'), 'Restore')
  const propSaid = await postedPlain(cdp, 'Restored “Drive Prop”')
  const propBack = await settles(async () => propertyIds().includes(propId) && !(await listedTitles(cdp)).includes('Drive Prop'))
  item('7D', 'Single Rows, E-2', "a Context's and a property's Restore return them to the registry and post their titles",
    ctxSaid && ctxBack && propSaid && propBack, show({ ctxSaid, ctxBack, propSaid, propBack }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await closeSettings(cdp)
  await op('delete Drive Prop again', { op: 'deleteProperty', propertyId: propId })
  await openSettings(cdp, 'Trash')
  const propBundle = (await trashed(cdp, 'Drive Prop'))?.bundlePath
  const propAsked = await askDelete(cdp, await trashRowShown(cdp, 'Drive Prop'))
  if (propAsked) await pressDialog(cdp, 'Delete')
  const propGoneSaid = await postedPlain(cdp, 'Deleted “Drive Prop”')
  const propEmptied = await settles(async () => !!propBundle && !exists(propBundle))
  item('7D', 'K-4', "a property's Delete asks by its name, empties it, and posts its name",
    propAsked?.message === 'Delete “Drive Prop”?' && propGoneSaid && propEmptied, show({ propAsked, propGoneSaid, propEmptied }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const PARTIAL = '[aria-label="Recorded Partly"]'
  const partMarked = await cdp.evaluate(`!!(${await trashRowShown(cdp, 'Part Coll')}).querySelector('${PARTIAL}')`)
  await mouseClick(cdp, titleIn(trashRowEl('Part Coll')))
  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Part Coll', 1), ['Part Page']))
  const innerMarked = await cdp.evaluate(`!!(${await trashRowShown(cdp, 'Part Page')}).querySelector('${PARTIAL}')`)
  const partMenu = await popAt(cdp, trashRowEl('Part Page'))
  await pickNative(restoreInto(partMenu, 'Collection B'))
  const partLanded = await settles(async () => exists('Collection B/Part Page.md'))
  const warned = await settles(async () => (await refusal(cdp)).includes('“Part Page” was recorded partly, so some of what it held may not come back.'))
  item('7D', 'Partial Mark', "a partly recorded bundle marks its row and its inner rows, and an inner restore warns under the page's own title",
    partMarked && innerMarked && partLanded && warned, show({ partMarked, innerMarked, partLanded, warned, refusal: await refusal(cdp) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  for (const t of ['Dup Page', 'Dup Fine']) await checkTrash(cdp, t)
  const dupBundle = (await trashed(cdp, 'Dup Page'))?.bundlePath
  await chooseNative(cdp, trashRowEl('Dup Page'), 'Restore All')
  const refusedSaid = await settles(async () => (await notice(cdp)) === 'Restored 1 Page. 1 Page couldn’t be restored.')
  const refusedKept = exists(fine) && !!dupBundle && exists(dupBundle) && !exists(dup) && (await listedTitles(cdp)).includes('Dup Page')
  item('7D', 'E-4', "a Restore All counts the row it couldn't restore",
    refusedSaid && refusedKept, show({ refusedKept, notice: await notice(cdp) }))
  await checkTrash(cdp, 'Dup Page')

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  for (const t of ['Squat One', 'Squat Two']) await checkTrash(cdp, t)
  await chooseNative(cdp, trashRowEl('Squat One'), 'Restore All')
  const renamedSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Pages2 Renamed')
  const renamedLanded = squats.slice(0, 2).every((rel) => exists(rel.replace(/\.md$/, ' (2).md')) && readRel(rel).endsWith('squatter'))
  await closeSettings(cdp)

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  await sidebarTo(cdp, 'Collections', COLLECTION)
  await sleep(1200)
  await toArchive(cdp)
  await until('the Arc Lost row', async () => (await arcTitles(cdp)).includes('Arc Lost'))
  const ARCHIVE = { kind: 'archive', id: colA }
  const archivedAs = async (rel) => (await rows(ARCHIVE)).find((r) => r.stored?.id === ids[rel])?.bundlePath
  const lostTrailOf = async () => ({ trail: await trailOf(cdp, `(${arcRow('Arc Lost')})?.querySelector('.bundle-trail')`), style: await fontStyleOf(cdp, arcRow('Arc Lost')) })
  const LOST_TRAIL = { trail: [COLLECTION, 'Arc Gone Set'], style: 'italic' }
  const lostTrail = await lostTrailOf()
  const lostAt = await archivedAs(arcLost)
  const lostRecord = lostAt && readRel(`${lostAt}/_record.json`)
  const lostMenu = await popAt(cdp, arcRow('Arc Lost'))
  const lostChosen = await pickNative(restoreInto(lostMenu, COLLECTION))
  const lostSaid = await noticeUp(cdp, 'Restored “Arc Lost”Undo')
  const lostLanded = exists(`${COLLECTION}/Arc Lost.md`)
  if (lostSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const lostBack = await settles(async () => !!lostAt && (await archivedAs(arcLost)) === lostAt && exists(`${lostAt}/Arc Lost.md`) && !exists(`${COLLECTION}/Arc Lost.md`))
  const lostExact = lostBack && readRel(`${lostAt}/_record.json`) === lostRecord
  const lostHomeless = await settles(async () => same(await lostTrailOf(), LOST_TRAIL))
  item('7D', 'Homeless Items, Trails, Undo', 'an archived page whose Set is gone restores through Restore ▸, and its Undo puts it back exactly as it was archived',
    same(lostTrail, LOST_TRAIL) && lostChosen && lostSaid && lostLanded && lostBack && lostExact && lostHomeless,
    show({ lostTrail, lostChosen, lostSaid, lostLanded, lostBack, lostExact, lostHomeless, lostAt, now: await archivedAs(arcLost) }))

  await until('the notice drained', () => drained(cdp)).catch(() => {})
  const squatAt = await archivedAs(squats[2])
  const squatRecord = squatAt && readRel(`${squatAt}/_record.json`)
  const { chosen: squatChosen } = await chooseNative(cdp, arcRow('Squat Arc'), 'Restore')
  const squatSaid = await noticeUp(cdp, 'Restored “Squat Arc” as “Squat Arc (2)”Undo')
  const squatLanded = exists(page(A_ALPHA, 'Squat Arc (2)')) && readRel(squats[2]).endsWith('squatter')
  if (squatSaid) await pressUndo(cdp)
  await pointerAway(cdp)
  const squatBack = await settles(async () => !!squatAt && (await archivedAs(squats[2])) === squatAt && exists(`${squatAt}/Squat Arc.md`))
  const steppedLeft = readdirSync(NEXUS, { recursive: true }).filter((n) => n.endsWith('Squat Arc (2).md'))
  const squatExact = squatBack && readRel(`${squatAt}/_record.json`) === squatRecord && steppedLeft.length === 0
  item('7D', 'E-4', "a restore onto an outside file steps aside, the Archive's with an Undo that puts it back exactly as it was archived, and a Trash batch's counted",
    squatChosen && squatSaid && squatLanded && squatExact && renamedSaid && renamedLanded, show({ squatChosen, squatSaid, squatLanded, squatBack, squatExact, steppedLeft, renamedSaid, renamedLanded, squatAt, now: await archivedAs(squats[2]) }))
  await until('the notice drained', () => drained(cdp)).catch(() => {})

  const trashOf = async (title) => (await trashed(cdp, title))?.bundlePath
  for (const t of ['Live Page', 'Stray Set', 'Arc Gone Set', 'Dup Page']) await emptyAt(await trashOf(t))
  for (const rel of squats) rmSync(abs(rel), { force: true })
  await sleep(600)
  for (const rel of [page(A_ALPHA, 'Dup Twin'), 'Collection B/Stray Two.md', 'Collection B/Stray Page.md', 'Collection B/Part Page.md', fine, page(A_ALPHA, 'Squat One (2)'), page(A_ALPHA, 'Squat Two (2)')]) {
    await deleteAt(cdp, rel, 'page')
    await emptyAt(await trashOf(rel.split('/').at(-1).replace(/\.md$/, '')))
  }
  for (const [path, kind] of [[await archivedAs(arcLost), 'page'], [await archivedAs(squats[2]), 'page'], ['.nexus/contexts/Drive Ctx', 'context'], ['.nexus/contexts/Areas/Drive Spc', 'space'], ['.nexus/contexts/Areas/Drive Spc Two', 'space']])
    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
  await emptyAt(part)
  await must('permanentDelete as it was', ask(cdp, 'personalization:set', 'permanentDelete', kept.permanentDelete ?? null))
  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
  await sleep(400)
  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
  const ended = await standing()
  item('7D', '—', 'the group leaves Collections A and B, the Contexts, the registry, the Archive, and the Trash as they were', same(ended, start), show({ start, ended }))
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
  if (GROUPS.has('6A')) await group6A(cdp)
  if (GROUPS.has('6B')) await group6B()
  if (GROUPS.has('7')) await group7(cdp)
  if (GROUPS.has('7B')) await group7B(cdp)
  if (GROUPS.has('7C')) await group7C(cdp)
  if (GROUPS.has('7D')) await group7D(cdp)
  cdp.close()
} catch (e) {
  item(0, '—', 'the run reached its end', false, String(e?.stack ?? e))
  if (cdp) await shot(cdp, 'failure').catch(() => {})
} finally {
  await restore()
}
tally(['0', ...PHASES].filter((g) => g === '0' || GROUPS.has(g)))
