### Disclosable Bundles — Results

| Actionable | All-Inclusive | Comments | Documentation | Tests | Files |
|------------|---------------|----------|---------------|-------|-------|
| =🟢+1757=(=🟢+2549=/=🔴-792=) | =🟢+5718=(=🟢+7134=/=🔴-1416=) | =🟢+78=(=🟢+113=/=🔴-35=) | =🟢+1370=(=🟢+1748=/=🔴-378=) | =🟢+2513=(=🟢+2724=/=🔴-211=) | =🟢+8=(=🟢+9=/=🔴-1=) |

- **FILES:** =🟢+1835=(=🟢+2662=/=🔴-827=)
- **TESTS:** =🟢+2513=(=🟢+2724=/=🔴-211=)
- **DOCS:** =🟢+1370=(=🟢+1748=/=🔴-378=)

---

##### .claude/scripts/drive-harness.mjs

```/.claude/scripts/drive-harness.mjs diff
@@ -150 +150 @@ async function attachMain(inspectPort) {
 }
 
 // A freshly popped menu's rows: each visible item as { label, enabled, submenu? } or { separator }, answering null when no menu pops. A menu a button pops takes a left press.
-export async function popNative(cdp, at, button = 'right') {
+export async function popNative(cdp, at, button = 'right', modifiers = 0) {
   const seq = await main.evaluate('__drive.seq')
-  await mouseAt(cdp, at, { button, settle: 0 })
+  await mouseAt(cdp, at, { button, modifiers, settle: 0 })
+  return until('the native menu', () => main.evaluate(`__drive.seq > ${seq} && __drive.rows()`), 3000).catch(() => null)
+}
+/** The rows of the native menu a `contextmenu` event dispatched on `expr` pops, the pointer left where it is. */
+export async function menuByEvent(cdp, expr) {
+  const seq = await main.evaluate('__drive.seq')
+  await cdp.evaluate(`(${expr}).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))`)
   return until('the native menu', () => main.evaluate(`__drive.seq > ${seq} && __drive.rows()`), 3000).catch(() => null)
 }
 /** Chooses the row a path of labels names in the menu now up, or closes it when the path is empty or names no enabled row, answering whether one was chosen. */
 export const pickNative = (path) => main.evaluate(`__drive.choose(${JSON.stringify(path)})`)
+/** The rows of the menu now up, one the app popped on its own after a choice, or null while none is. */
+export const nativeRows = () => main.evaluate('__drive.rows()')
 export const labels = (rows) => (rows ?? []).filter((r) => !r.separator).map((r) => r.label)
 
 /** Pops `expr`'s native menu and chooses `path`, answering the menu's top-level labels, disabled rows among them. `edge` presses the element's leading padding, so a link inside it is never the target. */
@@ -201 +209 @@ export async function sweep(cdp, a, b, { steps, held }) {
   await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
   await sleep(800)
 }
+/** A press on `expr`'s box carried `dx` and `dy` across in steps, then released, as a pointer resizes by an edge. */
+export async function resizeBy(cdp, expr, { dx = 0, dy = 0 }) {
+  const a = await boxOf(cdp, expr)
+  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y, button: 'none' })
+  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
+  for (let i = 1; i <= 8; i++)
+    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (dx * i) / 8, y: a.y + (dy * i) / 8, button: 'left', buttons: 1 })
+  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: a.x + dx, y: a.y + dy, button: 'left', buttons: 0, clickCount: 1 })
+  await sleep(800)
+}
 export async function drag(cdp, from, to, held) {
   const a = await boxOf(cdp, from)
   const b = await boxOf(cdp, to)
@@ -216 +234 @@ export const hover = async (cdp, expr, dwell = 600) => {
 
 export const click = (cdp, expr) => cdp.evaluate(`(${expr}).click()`)
 
-const VK = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, b: 66, z: 90, ArrowDown: 40, ArrowUp: 38, ' ': 32 }
+const VK = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, b: 66, f: 70, z: 90, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, ' ': 32 }
 export async function pressKey(cdp, name, modifiers = 0) {
   for (const type of ['rawKeyDown', 'keyUp'])
     await cdp.send('Input.dispatchKeyEvent', { type, key: name, code: name === ' ' ? 'Space' : name.length === 1 ? `Key${name.toUpperCase()}` : name, windowsVirtualKeyCode: VK[name], modifiers })
@@ -616 +634 @@ export async function closeSettings(cdp) {
 export const DIALOG = `document.querySelector('[role="alertdialog"]')`
 export const pressDialog = (cdp, label) => click(cdp, `[...${DIALOG}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`)
 export const notice = (cdp) => cdp.evaluate(`document.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')?.textContent ?? ''`)
-export const trashRowEl = (title) => `[...document.querySelectorAll('.trash-row')].find((r) => r.textContent.includes(${JSON.stringify(title)}))`
+export const trashRowEl = (title) => `[...document.querySelectorAll('.trash-frame .data-row')].find((r) => r.querySelector('[role=checkbox]')?.getAttribute('aria-label') === ${JSON.stringify(`Select ${title}`)})`
```

##### .claude/scripts/Archive Drive/live-drive.mjs

```/.claude/scripts/Archive Drive/live-drive.mjs diff
@@ -3 +3 @@ import { join } from 'node:path'
 import { parse } from 'yaml'
 import {
   optionId,
-  activeTab, ask, boxOf, chooseNative, click, closeSettings, createPage, DIALOG, doubleClick, escapeAll, FM, holds, hover, launch, mintPageId, mouseAt,
-  mouseClick, must, NEXUS, notice, openCollection, openPage, openSettings, PAGE_VIEW, pageIds, pickNative, popNative, portalOpen, pressDialog, pressKey,
-  item, RAIL, relaunch, restore, ribbon, row, sel, SETTINGS_BUTTON, settles, shot, sleep, tally, textEl, trashRowEl, typeText, until, watch, writeBody,
+  activeTab, ask, boxOf, chooseNative, click, closeSettings, createPage, DIALOG, doubleClick, escapeAll, FM, holds, hover, labels, launch, mintPageId, mouseAt,
+  mouseClick, must, nativeRows, NEXUS, notice, openCollection, openPage, openSettings, PAGE_VIEW, pageIds, pickNative, popNative, portalOpen, pressDialog, pressKey,
+  item, menuByEvent, META, RAIL, refusal, relaunch, resizeBy, restore, ribbon, row, sel, SETTINGS_BUTTON, settles, shot, sleep, tally, textEl, trashRowEl, typeText, until, watch, writeBody,
 } from '../drive-harness.mjs'
 
 const PORT = 9393
-// The plan's phases in order, named as the plan names them.
-const PHASES = ['1', '2', '3', '4', '5', '6A', '6B']
+// The plans' phases in order, named as the plans name them: the Archive's, then Disclosable Bundles' 7, whose remaining options 7B to 7D drive.
+const PHASES = ['1', '2', '3', '4', '5', '6A', '6B', '7', '7B', '7C', '7D']
 const GROUPS = new Set(process.argv.slice(2))
 if (GROUPS.size === 0 || [...GROUPS].some((g) => !PHASES.includes(g))) {
-  console.error(`usage: node live-drive.mjs <group…>   (groups ${PHASES.join(', ')}, each the plan phase of its name)`)
+  console.error(`usage: node live-drive.mjs <group…>   (groups ${PHASES.join(', ')}, each a plan phase of its name, 7B to 7D the rest of Phase 7's options)`)
   process.exit(2)
 }
 
@@ -288 +288 @@ async function group2(cdp) {
     await deleteAt(cdp, page(A_ALPHA, t), 'page')
   }
   await openSettings(cdp, 'Trash')
-  const drawnRows = await cdp.evaluate(`[...document.querySelectorAll('.trash-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
+  const drawnRows = await listedTitles(cdp)
   const answered = ((await ask(cdp, 'bundles:list', { kind: 'trash' })).value ?? []).map((r) => r.title)
   item(2, 'A-3', 'the Trash browser draws the titles bundles:list answers, in its order', same(drawnRows, answered), show({ drawnRows, answered }))
-  for (const t of ['AR Look One', 'AR Look Two']) await click(cdp, `${trashRowEl(t)}.querySelector('[role=checkbox]')`)
+  for (const t of ['AR Look One', 'AR Look Two']) await checkRow(cdp, t)
   const { chosen: all } = await chooseNative(cdp, trashRowEl('AR Look One'), 'Restore All')
   const batch = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
   item(2, 'A-3', 'a Restore All of two reads Restored 2 Pages', all && batch, show(await notice(cdp)))
@@ -558 +558 @@ async function group4() {
 const LABEL = `document.querySelector('[role=status], [role=alert]')`
 const drained = (cdp) => cdp.evaluate(`${LABEL}.hasAttribute('inert')`)
 const moveTo = (cdp, { x, y }) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' })
-const g5Row = (title) => `[...document.querySelectorAll('.trash-row')].find((r) => r.querySelector('[role=checkbox]')?.getAttribute('aria-label') === ${JSON.stringify(`Select ${title}`)})`
-const checkRow = (cdp, title) => click(cdp, `${g5Row(title)}.querySelector('[role=checkbox]')`)
-const listedTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.trash-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
+const checkRow = (cdp, title) => click(cdp, `${trashRowEl(title)}.querySelector('[role=checkbox]')`)
+const listedTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row [role=checkbox]')].map((c) => c.getAttribute('aria-label').replace(/^Select /, ''))`)
 /** Each face of the one swap inside `expr`, in its order: shown or hidden, and whether it's inert and unnamed. */
 const facesOf = (cdp, expr) =>
   cdp.evaluate(`[...(${expr}).querySelectorAll('[data-face]')].map((f) => ({ face: f.dataset.face, text: f.textContent.trim(), inert: f.hasAttribute('inert'), hidden: f.getAttribute('aria-hidden') === 'true' }))`)
@@ -594 +593 @@ async function group5(cdp) {
 
   await openSettings(cdp, 'Trash')
   await until('the Trash rows', async () => (await listedTitles(cdp)).includes('G5 One'))
-  const look = await cdp.evaluate(`(() => { const f = document.querySelector('.trash-frame.table'); const [search, head] = f?.children ?? []; const rows = [...(f?.querySelectorAll('.trash-row.table-divider') ?? [])]; return !!f && !!search?.matches('.nav-search-row') && !!head?.matches('.trash-head.table-head') && !!head.querySelector('.trash-head-name') && !!head.querySelector('.trash-head-date') && rows.length > 0 && rows.every((r) => head.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) })()`)
+  const look = await cdp.evaluate(`(() => { const f = document.querySelector('.trash-frame.table'); const [search, table] = f?.children ?? []; const [head, scroll] = table?.querySelector(':scope > .table-grid')?.children ?? []; return !!f && !!search?.matches('.nav-search-row') && !!table?.matches('.trash-table') && !!head?.matches('.trash-head.table-head') && !!head.querySelector('.trash-head-name') && !!head.querySelector('.trash-head-date') && !!scroll?.matches('.trash-scroll') && !!scroll.querySelector('.data-row') })()`)
   const listed = await listedTitles(cdp)
   item(5, 'G-1', 'the Trash keeps its look and lists newest first',
     look && same(listed.slice(0, 4), [...titles].reverse()), show({ look, listed }))
@@ -610 +609 @@ async function group5(cdp) {
   const cleared = await settles(async () => same(await listedTitles(cdp), listed))
   item(5, 'G-1', 'typed search narrows in place, keeping newest first', narrowed && cleared, show({ found, after: await listedTitles(cdp) }))
 
-  const single = await chooseNative(cdp, g5Row('G5 One'), [])
+  const single = await chooseNative(cdp, trashRowEl('G5 One'), [])
   item(5, 'K-4', "one row's menu reads Restore and Delete", same(single.rows, ['Restore', 'Delete']), show(single.rows))
 
   for (const t of ['G5 One', 'G5 Two']) await checkRow(cdp, t)
-  const onChecked = await chooseNative(cdp, g5Row('G5 Two'), [])
-  const onUnchecked = await chooseNative(cdp, g5Row('G5 Note'), [])
+  const onChecked = await chooseNative(cdp, trashRowEl('G5 Two'), [])
+  const onUnchecked = await chooseNative(cdp, trashRowEl('G5 Note'), [])
   item(5, 'K-4', "a checked row's menu names the batch; an unchecked one acts alone",
     same(onChecked.rows, ['Restore All', 'Delete All']) && same(onUnchecked.rows, ['Restore', 'Delete']), show({ onChecked, onUnchecked }))
 
-  const { chosen: restoredAll } = await chooseNative(cdp, g5Row('G5 Two'), 'Restore All')
+  const { chosen: restoredAll } = await chooseNative(cdp, trashRowEl('G5 Two'), 'Restore All')
   const restoredSaid = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
   const near = await boxOf(cdp, LABEL)
   await moveTo(cdp, near)
@@ -642 +641 @@ async function group5(cdp) {
     short && picked && full && returned, show({ short, full, style: trashStyle() }))
 
   const { chosen: widest } = await chooseNative(cdp, sel('.trash-head-date'), 'Full')
-  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.trash-frame .trash-date')]; const head = document.querySelector('.trash-frame .trash-head-date'); return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
-  const { chosen: unweekdayed } = await chooseNative(cdp, sel('.trash-head-date'), 'Hidden')
+  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.trash-frame .bundle-date')]; const head = document.querySelector('.trash-frame .trash-head-date'); return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
+  const { chosen: unweekdayed } = await chooseNative(cdp, sel('.trash-head-date'), 'Hide Day')
   const settled = await settles(async () => !('trashColumnStyle' in (settingsOnDisk().personalization ?? {})))
   item(5, 'G-1', 'under its widest style no Trash date and not its heading is cut',
     widest && fit && unweekdayed && settled, show({ widest, fit, style: trashStyle() }))
 
   await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
   for (const t of ['G5 Note', 'G5 Note Long']) await checkRow(cdp, t)
-  const { chosen: deletedAll } = await chooseNative(cdp, g5Row('G5 Note'), 'Delete All')
+  const { chosen: deletedAll } = await chooseNative(cdp, trashRowEl('G5 Note'), 'Delete All')
   await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`))
   const asked = await cdp.evaluate(`${DIALOG}.getAttribute('aria-label')`)
   await pressDialog(cdp, 'Delete')
@@ -1002 +1001 @@ const live = (css) => `[...document.querySelectorAll(${JSON.stringify(css)})].fi
 const SHOWN = `document.querySelector('[role=status] [data-face="shown"], [role=alert] [data-face="shown"]')`
 const barButton = (label) =>
   label === 'Delete' ? `${SHOWN}.querySelector('button[title="Delete"]')` : `[...${SHOWN}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`
-const arcRow = (title) => `[...document.querySelectorAll('.archive-rows .data-row')].find((r) => !r.closest('[inert]') && r.querySelector('.cell-title-text')?.textContent === ${JSON.stringify(title)})`
-const arcTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.archive-rows .data-row')].filter((r) => !r.closest('[inert]')).map((r) => r.querySelector('.cell-title-text')?.textContent)`)
+const arcRow = (title) => `[...document.querySelectorAll('.bundle-rows .data-row')].find((r) => !r.closest('[inert]') && r.querySelector('.cell-title-text')?.textContent === ${JSON.stringify(title)})`
+const arcTitles = (cdp) => cdp.evaluate(`[...document.querySelectorAll('.bundle-rows .data-row')].filter((r) => !r.closest('[inert]')).map((r) => r.querySelector('.cell-title-text')?.textContent)`)
 const arcChecked = (cdp, title) => cdp.evaluate(`(${arcRow(title)})?.querySelector('[role=checkbox]')?.getAttribute('aria-checked') === 'true'`)
 /** A press on the row's Archived cell, outside its title, as a user checks a row. */
-const checkArc = (cdp, title) => mouseClick(cdp, `(${arcRow(title)}).querySelector('.data-cell.archive-date')`)
+const checkArc = (cdp, title) => mouseClick(cdp, `(${arcRow(title)}).querySelector('.bundle-date')`)
 const trailOf = (cdp, expr) => cdp.evaluate(`(${expr})?.textContent.split('›') ?? null`)
 const READER = `document.querySelector('[aria-label="Archived Page"]')`
 const tabCount = (cdp) => cdp.evaluate(`document.querySelectorAll('[role=tab]').length`)
@@ -1096 +1095 @@ async function group6B() {
 
   await until('the archived rows', async () => (await arcTitles(cdp)).length === 4).catch(() => {})
   const listed = await arcTitles(cdp)
-  const arc1Trail = await trailOf(cdp, `(${arcRow('Drive Arc 1')})?.querySelector('.cell-lead')?.lastElementChild`)
-  const dates = await cdp.evaluate(`[...document.querySelectorAll('.archive-rows .data-cell.archive-date')].filter((c) => !c.closest('[inert]')).map((c) => c.textContent)`)
+  const arc1Trail = await trailOf(cdp, `(${arcRow('Drive Arc 1')})?.querySelector('.bundle-trail')`)
+  const dates = await cdp.evaluate(`[...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]')).map((c) => c.textContent)`)
   const counted = await cdp.evaluate(`(${live('[title="Results"]')})?.textContent.trim() ?? null`)
   item('6B', 'G-1, G-2', 'rows list each archived item with its trail and time, newest first',
     same(listed, ['Drive Arc Set', 'Drive Arc Root', 'Drive Arc 2', 'Drive Arc 1']) && same(arc1Trail, [COLLECTION, 'Set Alpha']) && dates.length === 4 && dates.every((d) => d !== '') && counted === '4',
@@ -1181 +1180 @@ async function group6B() {
   item('6B', 'G-1 ruling 15', 'search narrows in place, keeping archived order',
     narrowed && alone && unsearched, show({ order, shown: await arcTitles(cdp) }))
 
-  await mouseClick(cdp, `(${arcRow('Drive Arc Root')}).querySelector('.cell-title-text')`)
+  const ROOT_TITLE = `(${arcRow('Drive Arc Root')}).querySelector('.cell-title-text')`
+  await doubleClick(cdp, ROOT_TITLE)
   await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
   await until('the reader’s body', () => cdp.evaluate(`(${READER})?.querySelector('.cm-content')?.textContent.includes('Root body.') ?? false`)).catch(() => {})
   const crumbs = `(${READER})?.querySelector('.page-window-crumbs')`
@@ -1191 +1191 @@ async function group6B() {
   await shot(cdp, 'g6b-reader')
   if (reader) await click(cdp, `(${READER}).querySelector('button[title="Close"]')`)
   const closed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
-  item('6B', 'H-1', "a page row's title opens the read-only reader",
-    reader?.lock && !reader.input && !reader.restore && reader.doc?.includes('Root body.') && same(crumbTrail, [COLLECTION, 'Drive Arc Root']) && closed,
-    show({ reader, crumbTrail, closed }))
+  const leftChecked = await arcChecked(cdp, 'Drive Arc Root')
+  const oneBar = await settles(async () => (await notice(cdp)) === 'Restore1 Page')
+  item('6B', 'H-1', "a page row's double-click opens the read-only reader and leaves the row checked",
+    reader?.lock && !reader.input && !reader.restore && reader.doc?.includes('Root body.') && same(crumbTrail, [COLLECTION, 'Drive Arc Root']) && closed && leftChecked && oneBar,
+    show({ reader, crumbTrail, closed, leftChecked, oneBar }))
 
-  await checkArc(cdp, 'Drive Arc Root')
-  await mouseClick(cdp, `(${arcRow('Drive Arc Root')}).querySelector('.cell-title-text')`)
+  // A double-click's first press toggles the checked row off and its second checks it again, so the row stays checked.
+  await doubleClick(cdp, ROOT_TITLE)
   await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
-  const stillChecked = await arcChecked(cdp, 'Drive Arc Root')
-  const oneBar = await settles(async () => (await notice(cdp)) === 'Restore1 Page')
+  const stillBar = await settles(async () => (await notice(cdp)) === 'Restore1 Page')
   await mouseClick(cdp, barButton('Restore'))
   await pointerAway(cdp)
   const readerGone = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
@@ -1207 +1208 @@ async function group6B() {
   await sleep(400)
   await op('archive Drive Arc Root again', { op: 'archive', path: arcRoot, kind: 'page' })
   item('6B', 'H-1 Cautionary 32', 'the reader closes once its item leaves the Archive',
-    stillChecked && oneBar && readerGone, show({ stillChecked, oneBar, readerGone }))
+    stillBar && readerGone, show({ stillBar, readerGone }))
 
   await until('the notice drained', () => drained(cdp)).catch(() => {})
-  await mouseClick(cdp, `(${arcRow('Drive Arc Set')}).querySelector('.cell-title-text')`)
-  const setOpened = await cdp.evaluate(`!!${READER}`)
-  const setChecked = await arcChecked(cdp, 'Drive Arc Set')
-  await checkArc(cdp, 'Drive Arc Set')
-  item('6B', 'G-2 ruling 11', "a Set row's title opens nothing and checks its row", !setOpened && setChecked && !(await arcChecked(cdp, 'Drive Arc Set')), show({ setOpened, setChecked }))
+  const SET_TITLE = `(${arcRow('Drive Arc Set')}).querySelector('.cell-title-text')`
+  const setExpanded = () => cdp.evaluate(`(${arcRow('Drive Arc Set')})?.getAttribute('aria-expanded') ?? null`)
+  await mouseClick(cdp, SET_TITLE)
+  const disclosed = await settles(async () => { const t = await arcTitles(cdp); return t[t.indexOf('Drive Arc Set') + 1] === 'Drive Arc Inside' })
+  const insideTrail = await trailOf(cdp, `(${arcRow('Drive Arc Inside')})?.querySelector('.bundle-trail')`)
+  const setDisclosure = { expanded: await setExpanded(), opened: await cdp.evaluate(`!!${READER}`), checked: await arcChecked(cdp, 'Drive Arc Set') }
+  await mouseClick(cdp, SET_TITLE)
+  const collapsed = await settles(async () => !(await arcTitles(cdp)).includes('Drive Arc Inside') && (await setExpanded()) === 'false')
+  item('6B', 'Clicks', "a Set row's click discloses its rows and opens nothing",
+    disclosed && same(insideTrail, [COLLECTION, 'Drive Arc Set']) && setDisclosure.expanded === 'true' && !setDisclosure.opened && !setDisclosure.checked && collapsed,
+    show({ disclosed, insideTrail, setDisclosure, collapsed }))
 
   const archiveStyle = () => personal().archiveColumnStyle
   const HEADING = live('.col-header.archive-date')
-  const firstDate = () => cdp.evaluate(`(${live('.archive-rows .data-cell.archive-date')})?.textContent ?? null`)
+  const firstDate = () => cdp.evaluate(`(${live('.bundle-rows .bundle-date')})?.textContent ?? null`)
   const dateBefore = await firstDate()
   const { chosen: short } = await chooseNative(cdp, HEADING, 'Short Date')
   const styled = await settles(async () => same(archiveStyle(), { date_format: 'short' }))
@@ -1229 +1236 @@ async function group6B() {
     short && styled && changed && full && unstyled, show({ short, full, dateBefore, style: archiveStyle() }))
 
   const { chosen: widest } = await chooseNative(cdp, HEADING, 'Full')
-  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.archive-rows .data-cell.archive-date')].filter((c) => !c.closest('[inert]')); const head = ${HEADING}; return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
-  const { chosen: unweekdayed } = await chooseNative(cdp, HEADING, 'Hidden')
+  const fit = await settles(() => cdp.evaluate(`(() => { const cells = [...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]')); const head = ${HEADING}; return cells.length > 0 && cells.every((c) => /day, /.test(c.textContent) && c.scrollWidth <= c.clientWidth) && !!head && head.scrollWidth <= head.clientWidth })()`))
+  const { chosen: unweekdayed } = await chooseNative(cdp, HEADING, 'Hide Day')
   const restyled = await settles(async () => !('archiveColumnStyle' in personal()))
   item('6B', 'G-1', 'under its widest style no Archived date and not its heading is cut',
     widest && fit && unweekdayed && restyled, show({ widest, fit, style: archiveStyle() }))
@@ -1268 +1275 @@ async function group6B() {
   await toArchive(cdp)
   const bulkCount = (await rows(ARCHIVE_B)).length
   await until('the bulk rows', async () => (await arcTitles(cdp)).length > 0).catch(() => {})
-  const sized = await cdp.evaluate(`(() => { const l = ${live('.archive-rows')}; return { height: l?.getBoundingClientRect().height ?? null, drawn: l?.querySelectorAll('.data-row').length ?? 0 } })()`)
+  const sized = await cdp.evaluate(`(() => { const l = ${live('.bundle-rows')}; return { height: l?.getBoundingClientRect().height ?? null, drawn: l?.querySelectorAll('.data-row').length ?? 0 } })()`)
   await cdp.evaluate(`(() => { const s = ${live('.detail-scroll')}; s.scrollTop = s.scrollHeight })()`)
   const bottomed = await settles(async () => (await arcTitles(cdp)).includes('Drive Bulk 01'))
   item('6B', '4.7', 'virtual rows render a window of a long archive',
-    bulkCount === 60 && Math.round(sized.height) === 30 * bulkCount && sized.drawn < bulkCount && bottomed, show({ bulkCount, sized, bottomed }))
+    bulkCount === 60 && Math.round(sized.height) === Math.round(29.75 * bulkCount) && sized.drawn < bulkCount && bottomed, show({ bulkCount, sized, bottomed }))
 
   await checkArc(cdp, 'Drive Bulk 01')
   const archiveTab = await cdp.evaluate(`[...document.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true')`)
@@ -1286 +1293 @@ async function group6B() {
   for (const key of ['confirmDeletion', 'archiveColumnStyle']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
 }
 
+// ── Group 7 — Disclosure (Disclosable Bundles, Phase 7) ─────────────────────
+
+/** The path into `title` among a destination ask's rows: a container holding others names itself first inside its own submenu. */
+const intoPath = (rows, title) => ((rows ?? []).find((r) => r.label === title)?.submenu ? [title, title] : [title])
+/** The Restore ▸ path into `title` from a row menu's rows. */
+const restoreInto = (menu, title) => ['Restore', ...intoPath((menu ?? []).find((r) => r.label === 'Restore')?.submenu, title)]
+/** The titles drawn right after `title`'s row. */
+const titlesAfter = (titles, title, n) => titles.slice(titles.indexOf(title) + 1, titles.indexOf(title) + 1 + n)
+const trashTrailOf = (cdp, title) => trailOf(cdp, `(${trashRowEl(title)})?.querySelector('.bundle-trail')`)
+const checkedIn = (cdp, scope) => cdp.evaluate(`document.querySelectorAll('${scope} .data-row [role=checkbox][aria-checked="true"]').length`)
+
+const trashChecked = (cdp, title) => cdp.evaluate(`(${trashRowEl(title)})?.querySelector('[role=checkbox]')?.getAttribute('aria-checked') === 'true'`)
+const expandedOf = (cdp, expr) => cdp.evaluate(`(${expr})?.getAttribute('aria-expanded') ?? null`)
+/** Scrolled into the Trash's view first, since a press lands where the row is drawn. */
+async function trashRowShown(cdp, title) {
+  await until(`the ${title} row`, () => cdp.evaluate(`!!(${trashRowEl(title)})`))
+  await cdp.evaluate(`(${trashRowEl(title)}).scrollIntoView({ block: 'nearest' })`)
+  await sleep(200)
+  return trashRowEl(title)
+}
+/** A press on the row's date cell, outside its title, as a user checks a Trash row. */
+const checkTrash = async (cdp, title) => mouseClick(cdp, `(${await trashRowShown(cdp, title)}).querySelector('.bundle-date')`)
+const boxIn = (expr) => `(${expr}).querySelector('[role=checkbox]')`
+const titleIn = (expr) => `(${expr}).querySelector('.cell-title-text')`
+/** The notice while its label is up, reading `text` with no button. */
+const postedPlain = async (cdp, text) =>
+  (await settles(async () => !(await drained(cdp)) && (await notice(cdp)) === text)) && (await cdp.evaluate(`(${SHOWN} ?? ${LABEL}).querySelectorAll('button').length`)) === 0
+
+async function group7(cdp) {
+  const kept = personal()
+  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
+  const ARCHIVE_A = `.nexus/archive/${colA}`
+  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
+  const CHAINS = ['.trash/Collection A/Shelf Set', '.trash/Collection A/Set Alpha', '.trash/Collection A', '.trash/Collection B']
+  const standing = async () => ({
+    collections: stateOrder().collections ?? [],
+    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
+    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
+    alphaSets: orderIn(ALPHA_SIDECAR, 'set_order'),
+    bPages: orderIn('Collection B/_pagecollection.json', 'page_order'),
+    excluded: settingsOnDisk().excluded_folders ?? [],
+    trash: (await rows({ kind: 'trash' })).length,
+    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
+    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
+    chains: CHAINS.filter(exists),
+  })
+  const start = await standing()
+  await must('confirmDeletion on', ask(cdp, 'personalization:set', 'confirmDeletion', true))
+
+  await op('create Nest Coll', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Nest Coll' })
+  await op('create Nest Set', { op: 'createContainer', id: containerId(), parentPath: 'Nest Coll', kind: 'set', name: 'Nest Set' })
+  for (const t of ['Nest One', 'Nest Two', 'Nest Three', 'Nest Four']) await createAt(cdp, 'Nest Coll', t)
+  await createAt(cdp, 'Nest Coll/Nest Set', 'Nest Deep')
+  const loose = await createAt(cdp, A_ALPHA, 'Nest Loose')
+  await makeSet(cdp, 'Shelf Set')
+  for (const t of ['Shelf Kept', 'Shelf Gone']) await createAt(cdp, `${COLLECTION}/Shelf Set`, t)
+  const LANE = `${A_ALPHA}/Lane Set`
+  await op('create Lane Set', { op: 'createContainer', id: containerId(), parentPath: A_ALPHA, kind: 'set', name: 'Lane Set' })
+  await op('create Lane Sub', { op: 'createContainer', id: containerId(), parentPath: LANE, kind: 'set', name: 'Lane Sub' })
+  await createAt(cdp, `${LANE}/Lane Sub`, 'Lane Deep')
+  await createAt(cdp, LANE, 'Lane Top')
+  await sleep(400)
+  const coll = await bundledBy('delete Nest Coll', { op: 'delete', path: 'Nest Coll', kind: 'collection' })
+  await deleteAt(cdp, loose, 'page')
+  const shelf = await bundledBy('archive Shelf Set', { op: 'archive', path: `${COLLECTION}/Shelf Set`, kind: 'set' })
+  const lane = await bundledBy('archive Lane Set', { op: 'archive', path: LANE, kind: 'set' })
+  const inner = {
+    one: `${coll}/Nest Coll/Nest One.md`,
+    two: `${coll}/Nest Coll/Nest Two.md`,
+    three: `${coll}/Nest Coll/Nest Three.md`,
+    four: `${coll}/Nest Coll/Nest Four.md`,
+    deep: `${coll}/Nest Coll/Nest Set/Nest Deep.md`,
+    set: `${coll}/Nest Coll/Nest Set`,
+    kept: `${shelf}/Shelf Set/Shelf Kept.md`,
+    gone: `${shelf}/Shelf Set/Shelf Gone.md`,
+  }
+  const looseBundle = (await trashed(cdp, 'Nest Loose'))?.bundlePath
+
+  await openSettings(cdp, 'Trash')
+  await until('the Nest Coll row', () => cdp.evaluate(`!!(${trashRowEl('Nest Coll')})`))
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
+  const collOpened = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 3), ['Nest Set', 'Nest One', 'Nest Two']))
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
+  const setOpened = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 4), ['Nest Set', 'Nest Deep', 'Nest One', 'Nest Two']))
+  const rowState = (title) => cdp.evaluate(`(() => { const r = ${trashRowEl(title)}; return r && { expanded: r.getAttribute('aria-expanded'), nested: !!r.querySelector('.row-chevron') } })()`)
+  const tree = { coll: await rowState('Nest Coll'), set: await rowState('Nest Set'), page: await rowState('Nest Deep') }
+  const deepTrail = await trashTrailOf(cdp, 'Nest Deep')
+  const unchecked = (await checkedIn(cdp, '.trash-frame')) === 0
+  await shot(cdp, 'g7-disclosed')
+  item(7, 'Clicks, Nesting, Trails', 'a trashed Collection discloses its Set and pages, and the Set its own',
+    collOpened && setOpened && same(tree, { coll: { expanded: 'true', nested: false }, set: { expanded: 'true', nested: true }, page: { expanded: null, nested: false } }) && same(deepTrail, ['Nest Coll', 'Nest Set']) && unchecked,
+    show({ shown: await listedTitles(cdp), tree, deepTrail, unchecked }))
+
+  const revealedAll = (on) => cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row')].every((r) => r.dataset.revealHost === ${JSON.stringify(on)})`)
+  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
+  const boxed = { checked: await trashChecked(cdp, 'Nest Set'), expanded: await expandedOf(cdp, trashRowEl('Nest Set')), deep: (await listedTitles(cdp)).includes('Nest Deep'), revealed: await revealedAll('on') }
+  const topChevron = await cdp.evaluate(`(() => { const t = (${trashRowEl('Nest Coll')}).querySelector('.bundle-title'); const last = t?.lastElementChild; return !!last?.matches('[data-drop-outline]') && !!last.previousElementSibling?.matches('.cell-title') })()`)
+  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
+  const unboxed = { checked: await trashChecked(cdp, 'Nest Set'), revealed: await revealedAll('') }
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
+  const folded = await settles(async () => (await expandedOf(cdp, trashRowEl('Nest Set'))) === 'false' && !(await listedTitles(cdp)).includes('Nest Deep'))
+  await doubleClick(cdp, titleIn(trashRowEl('Nest Set')))
+  await sleep(600)
+  const openedOnce = (await expandedOf(cdp, trashRowEl('Nest Set'))) === 'true' && same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep'])
+  item(7, 'Clicks, Chevron, Double-Click', "a container's box checks it in place, every box shows, a top chevron follows its title, and a double-click opens a container once",
+    same(boxed, { checked: true, expanded: 'true', deep: true, revealed: true }) && topChevron && same(unboxed, { checked: false, revealed: true }) && folded && openedOnce,
+    show({ boxed, topChevron, unboxed, folded, openedOnce }))
+
+  const tabs = await tabCount(cdp)
+  await doubleClick(cdp, titleIn(trashRowEl('Nest One')))
+  await sleep(600)
+  const byTitle = { checked: await trashChecked(cdp, 'Nest One'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp), settings: await cdp.evaluate(`!!document.querySelector('.settings-rail')`) }
+  await doubleClick(cdp, boxIn(trashRowEl('Nest One')))
+  await sleep(600)
+  const byBox = { checked: await trashChecked(cdp, 'Nest One'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
+  await mouseClick(cdp, boxIn(trashRowEl('Nest One')))
+  const unpressed = !(await trashChecked(cdp, 'Nest One'))
+  item(7, 'Clicks, Double-Click', "a Trash page's double-click leaves it checked and opens nothing, and a double-click on its box opens nothing",
+    same(byTitle, { checked: true, reader: false, tabs, settings: true }) && same(byBox, { checked: true, reader: false, tabs }) && unpressed,
+    show({ tabs, byTitle, byBox, unpressed }))
+
+  const NEST_PAGES = ['Nest One', 'Nest Two', 'Nest Three', 'Nest Four']
+  const reopen = async (title) => {
+    await mouseClick(cdp, titleIn(trashRowEl(title)))
+    await settles(async () => (await expandedOf(cdp, trashRowEl(title))) === 'false')
+    await mouseClick(cdp, titleIn(trashRowEl(title)))
+  }
+  await exclude(cdp, [...start.excluded, 'Nest Coll/Nest Set'])
+  await reopen('Nest Coll')
+  const leftOut = await settles(async () => { const t = await listedTitles(cdp); return same(titlesAfter(t, 'Nest Coll', 4), NEST_PAGES) && !t.includes('Nest Set') })
+  const stillBundled = exists(inner.set)
+  await exclude(cdp, start.excluded)
+  await reopen('Nest Coll')
+  const backIn = await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Coll', 1), ['Nest Set']))
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
+  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep']))
+  item(7, 'Excluded Folders', "a folder the Nexus excludes stays out of an inner listing until it's unexcluded",
+    leftOut && stillBundled && backIn, show({ leftOut, stillBundled, backIn, shown: await listedTitles(cdp) }))
+
+  for (const t of ['Nest Two', 'Nest Loose']) await checkTrash(cdp, t)
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
+  await settles(async () => !(await listedTitles(cdp)).includes('Nest Two'))
+  const hidden = await chooseNative(cdp, trashRowEl('Nest Loose'), [])
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Coll')))
+  await settles(async () => (await listedTitles(cdp)).includes('Nest Two'))
+  const remembered = await trashChecked(cdp, 'Nest Two')
+  const shownAgain = await chooseNative(cdp, trashRowEl('Nest Loose'), [])
+  for (const t of ['Nest Two', 'Nest Loose']) await checkTrash(cdp, t)
+  await mouseClick(cdp, titleIn(trashRowEl('Nest Set')))
+  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Nest Set', 1), ['Nest Deep']))
+  item(7, 'Collapsing', 'a collapsed container keeps its inner check out of the menu, and reopening shows it',
+    same(hidden.rows, ['Restore', 'Delete']) && remembered && same(shownAgain.rows, ['Restore All', 'Delete All']) && (await checkedIn(cdp, '.trash-frame')) === 0,
+    show({ hidden: hidden.rows, remembered, shownAgain: shownAgain.rows }))
+
+  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
+  await checkTrash(cdp, 'Nest Deep')
+  const covered = await popAt(cdp, trashRowEl('Nest Deep'))
+  await pickNative([])
+  await mouseClick(cdp, boxIn(trashRowEl('Nest Set')))
+  await checkTrash(cdp, 'Nest Deep')
+  item(7, 'Nesting', 'a checked Set covers its checked page: the menu acts once, on the Set',
+    same(labels(covered), ['Restore', 'Delete']) && !!covered?.find((r) => r.label === 'Restore')?.submenu && (await checkedIn(cdp, '.trash-frame')) === 0,
+    show({ covered: labels(covered), submenu: !!covered?.find((r) => r.label === 'Restore')?.submenu }))
+
+  const oneMenu = await popAt(cdp, trashRowEl('Nest One'))
+  const onePath = restoreInto(oneMenu, 'Collection B')
+  const oneChosen = await pickNative(onePath)
+  const oneLanded = await settles(async () => exists('Collection B/Nest One.md') && !exists(inner.one))
+  const oneLeft = await settles(async () => { const t = await listedTitles(cdp); return !t.includes('Nest One') && same(titlesAfter(t, 'Nest Coll', 3), ['Nest Set', 'Nest Deep', 'Nest Two']) })
+  item(7, 'Homeless Items', 'an inner page restores through Restore ▸ into the container picked',
+    same(labels(oneMenu), ['Restore', 'Delete']) && oneChosen && oneLanded && frontOf('Collection B/Nest One.md').ID === ids[page('Nest Coll', 'Nest One')] && oneLeft,
+    show({ menu: labels(oneMenu), onePath, oneChosen, oneLanded, oneLeft }))
+
+  for (const t of ['Nest Two', 'Nest Deep']) await checkTrash(cdp, t)
+  const twoChecked = (await checkedIn(cdp, '.trash-frame')) === 2
+  const { chosen: allChosen } = await chooseNative(cdp, trashRowEl('Nest Two'), 'Restore All')
+  const asked = await until('the destination ask', nativeRows, 3000).catch(() => null)
+  const askChosen = await pickNative(intoPath(asked, 'Collection B'))
+  const once = await holds(async () => (await nativeRows()) === null, 1500)
+  const allSaid = await settles(async () => (await notice(cdp)).startsWith('Restored 2 Pages'))
+  const allLanded = await settles(async () => ['Nest Two', 'Nest Deep'].every((t) => exists(`Collection B/${t}.md`)) && !exists(inner.two) && !exists(inner.deep))
+  item(7, 'Batch Restore', 'a Restore All of two inner pages asks once where they go',
+    twoChecked && allChosen && askChosen && once && allSaid && allLanded, show({ twoChecked, allChosen, asked: labels(asked), askChosen, once, allSaid, allLanded }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  for (const t of ['Nest Three', 'Nest Loose']) await checkTrash(cdp, t)
+  const { chosen: firstAll } = await chooseNative(cdp, trashRowEl('Nest Three'), 'Restore All')
+  const firstAsk = await until('the destination ask', nativeRows, 3000).catch(() => null)
+  await pickNative([])
+  const dismissed = await holds(async () => { const t = await listedTitles(cdp); return t.includes('Nest Three') && t.includes('Nest Loose') && exists(inner.three) && !!looseBundle && exists(looseBundle) }, 1500)
+  const { chosen: secondAll } = await chooseNative(cdp, trashRowEl('Nest Three'), 'Restore All')
+  const secondAsk = await until('the destination ask', nativeRows, 3000).catch(() => null)
+  const sent = await pickNative(intoPath(secondAsk, 'Collection B'))
+  const homed = await settles(async () => exists('Collection B/Nest Three.md') && exists(page(A_ALPHA, 'Nest Loose')) && !exists('Collection B/Nest Loose.md'))
+  const batchSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Pages')
+  item(7, 'Batch Destination', "a batch's ask sends only its homeless rows, and a dismissed ask restores nothing",
+    firstAll && !!firstAsk && dismissed && secondAll && sent && homed && batchSaid, show({ firstAll, firstAsk: labels(firstAsk), dismissed, secondAll, sent, homed, notice: await notice(cdp) }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
+  const { chosen: fourChosen } = await chooseNative(cdp, trashRowEl('Nest Four'), 'Delete')
+  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
+  const fourAsked = await dialogRead(cdp)
+  if (fourAsked) await pressDialog(cdp, 'Delete')
+  const fourSaid = await postedPlain(cdp, 'Deleted “Nest Four”')
+  const fourGone = await settles(async () => !exists(inner.four) && exists(coll) && exists(inner.set) && (await listedTitles(cdp)).includes('Nest Set') && !(await listedTitles(cdp)).includes('Nest Four'))
+  item(7, 'Nesting', "an inner page's Delete empties that item alone",
+    fourChosen && fourAsked?.message === 'Delete “Nest Four”?' && fourAsked.detail === 'It will be erased from this computer. This cannot be undone.' && fourSaid && fourGone,
+    show({ fourChosen, fourAsked, fourSaid, fourGone, notice: await notice(cdp) }))
+  await closeSettings(cdp)
+
+  await sidebarTo(cdp, 'Collections', COLLECTION)
+  await sleep(1200)
+  await toArchive(cdp)
+  await until('the Shelf Set row', async () => (await arcTitles(cdp)).includes('Shelf Set'))
+  await mouseClick(cdp, titleIn(arcRow('Shelf Set')))
+  await until('the Shelf Set rows', async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone'])).catch(() => {})
+  const keptMenu = await popAt(cdp, arcRow('Shelf Kept'))
+  const keptChosen = await pickNative(restoreInto(keptMenu, COLLECTION))
+  const keptSaid = await noticeUp(cdp, 'Restored “Shelf Kept”Undo')
+  const keptLanded = exists(`${COLLECTION}/Shelf Kept.md`) && !exists(inner.kept)
+  if (keptSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const keptBack = await settles(async () => exists(inner.kept) && !exists(`${COLLECTION}/Shelf Kept.md`) && !archivedBundle('Shelf Kept'))
+  const keptRow = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone']))
+  item(7, 'Homeless Items, Undo', "an archived Set's inner page restores, and its Undo files it back inside the Set",
+    keptChosen && keptSaid && keptLanded && keptBack && keptRow, show({ keptChosen, keptSaid, keptLanded, keptBack, keptRow, notice: await notice(cdp) }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const { chosen: goneChosen } = await chooseNative(cdp, arcRow('Shelf Gone'), 'Delete')
+  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
+  const goneAsked = await dialogRead(cdp)
+  if (goneAsked) await pressDialog(cdp, 'Delete')
+  const goneSaid = await noticeUp(cdp, 'Deleted “Shelf Gone”Undo')
+  const goneBundle = (await trashed(cdp, 'Shelf Gone'))?.bundlePath
+  const intoTrash = !!goneBundle && exists(`${goneBundle}/Shelf Gone.md`) && !!recordAt(goneBundle).archive && !exists(inner.gone)
+  if (goneSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const goneBack = await settles(async () => exists(inner.gone) && !exists(goneBundle) && !archivedBundle('Shelf Gone'))
+  const goneRow = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Shelf Set', 2), ['Shelf Kept', 'Shelf Gone']))
+  item(7, 'Undo', 'an inner page deleted from the Archive goes to the Trash, and its Undo files it back inside the Set',
+    goneChosen && goneAsked?.message === 'Delete “Shelf Gone”?' && goneSaid && intoTrash && goneBack && goneRow,
+    show({ goneChosen, goneAsked, goneSaid, goneBundle, intoTrash, goneBack, goneRow }))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+
+  await unfold(cdp, COLLECTION, 'Set Alpha')
+  await click(cdp, sidebarRow('Set Alpha'))
+  await sleep(1200)
+  await toArchive(cdp)
+  await until('the Lane Set row', async () => (await arcTitles(cdp)).includes('Lane Set'))
+  await mouseClick(cdp, titleIn(arcRow('Lane Set')))
+  const laneOpened = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Lane Set', 2), ['Lane Sub', 'Lane Top']))
+  await mouseClick(cdp, titleIn(arcRow('Lane Sub')))
+  const subOpened = await settles(async () => same(titlesAfter(await arcTitles(cdp), 'Lane Sub', 1), ['Lane Deep']))
+  const subChevron = await cdp.evaluate(`!!(${arcRow('Lane Sub')})?.querySelector('.row-chevron')`)
+  const laneTrail = await trailOf(cdp, `(${arcRow('Lane Deep')})?.querySelector('.bundle-trail')`)
+  await doubleClick(cdp, boxIn(arcRow('Lane Top')))
+  const boxOpened = await settles(() => cdp.evaluate(`!!${READER}`), 800)
+  await doubleClick(cdp, titleIn(arcRow('Lane Deep')))
+  await until('the reader', () => cdp.evaluate(`!!${READER}`)).catch(() => {})
+  const laneCrumbs = await trailOf(cdp, `(${READER})?.querySelector('.page-window-crumbs')`)
+  await pressKey(cdp, 'Escape')
+  const laneClosed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
+  const deepChecked = await arcChecked(cdp, 'Lane Deep')
+  await checkArc(cdp, 'Lane Deep')
+  item(7, 'Nesting, Trails, Chevron, Double-Click', "a Set archived from inside a Set discloses recursively in that Set's archive, and its inner page opens the reader on its own trail",
+    laneOpened && subOpened && subChevron && same(laneTrail, [COLLECTION, 'Set Alpha', 'Lane Set', 'Lane Sub']) && !boxOpened &&
+      same(laneCrumbs, [COLLECTION, 'Set Alpha', 'Lane Set', 'Lane Sub', 'Lane Deep']) && laneClosed && deepChecked && !(await arcChecked(cdp, 'Lane Deep')),
+    show({ laneOpened, subOpened, subChevron, laneTrail, boxOpened, laneCrumbs, laneClosed, deepChecked, shown: await arcTitles(cdp) }))
+
+  await until('the bar withdrawn', () => drained(cdp)).catch(() => {})
+  await mouseClick(cdp, boxIn(arcRow('Lane Set')))
+  await checkArc(cdp, 'Lane Top')
+  const setBox = { checked: await arcChecked(cdp, 'Lane Set'), expanded: await expandedOf(cdp, arcRow('Lane Set')), top: await arcChecked(cdp, 'Lane Top') }
+  const setFace = await settles(async () => (await notice(cdp)) === 'Restore1 Set')
+  const topMenu = await chooseNative(cdp, arcRow('Lane Top'), [])
+  await pressBar(cdp, 'Restore', 'Restore1 Set')
+  const laneSaid = await noticeUp(cdp, 'Restored “Lane Set”Undo')
+  const laneLanded = exists(`${LANE}/Lane Sub/Lane Deep.md`)
+  if (laneSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const laneBack = await settles(async () => (await rows({ kind: 'archive', id: colA })).find((r) => r.title === 'Lane Set')?.bundlePath === lane && exists(lane) && !exists(LANE))
+  item(7, 'Nesting, Clicks, Undo', 'a checked Set and its checked page reach the bar as the Set, which restores whole and its Undo archives it again',
+    same(setBox, { checked: true, expanded: 'true', top: true }) && setFace && same(topMenu.rows, ['Restore', 'Delete']) && laneSaid && laneLanded && laneBack,
+    show({ setBox, setFace, topMenu: topMenu.rows, laneSaid, laneLanded, laneBack, notice: await notice(cdp) }))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+
+  await emptyAt(coll)
+  for (const [t, rel] of [['Nest One', 'Collection B/Nest One.md'], ['Nest Two', 'Collection B/Nest Two.md'], ['Nest Deep', 'Collection B/Nest Deep.md'], ['Nest Three', 'Collection B/Nest Three.md'], ['Nest Loose', page(A_ALPHA, 'Nest Loose')]]) {
+    await deleteAt(cdp, rel, 'page')
+    await emptyAt((await trashed(cdp, t))?.bundlePath)
+  }
+  await emptyAt(await bundledBy('delete Shelf Set', { op: 'delete', path: shelf, kind: 'set' }))
+  await emptyAt(await bundledBy('delete Lane Set', { op: 'delete', path: lane, kind: 'set' }))
+  for (const key of ['confirmDeletion', 'permanentDelete']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
+  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
+  await sleep(400)
+  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
+  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
+  const ended = await standing()
+  item(7, '—', 'the group leaves Collections A and B, the Archive, and the Trash as it found them',
+    same(ended, start) && !exists('Nest Coll'), show({ start, ended }))
+}
+
+// ── Group 7B — the shared table (Disclosable Bundles, Phase 7) ──────────────
+
+const TRASH_SEARCH = `document.querySelector('.trash-frame .nav-search-row input')`
+/** The title of the row holding the focus, or null when no row does. */
+const focusedRow = (cdp) => cdp.evaluate(`(() => { const a = document.activeElement; return a?.matches?.('.data-row[role=treeitem]') ? (a.querySelector('.cell-title-text')?.textContent ?? null) : null })()`)
+const trashStyle = () => personal().trashColumnStyle
+async function searchTrash(cdp, text) {
+  await cdp.evaluate(`${TRASH_SEARCH}.focus()`)
+  await cdp.evaluate(`${TRASH_SEARCH}.select()`)
+  await pressKey(cdp, 'Backspace')
+  if (text) await typeText(cdp, text)
+  await sleep(400)
+}
+const ZONE = `(${live('.bundle-rows')}).closest('.line-zone')`
+const settingsWidth = (cdp) => cdp.evaluate(`document.querySelector('.settings-window')?.getBoundingClientRect().width ?? null`)
+const searching = (cdp) => cdp.evaluate(`!!(${live('.detail-title-lead.is-searching')})`)
+const results = (cdp) => cdp.evaluate(`(${live('[title="Results"]')})?.textContent.trim() ?? null`)
+const emptyLine = (cdp, css) => cdp.evaluate(`(${live(css)})?.textContent ?? null`)
+
+async function group7B(cdp) {
+  const kept = personal()
+  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
+  const CHAINS = ['.trash/Collection A/Set Alpha', '.trash/Collection A', '.trash/Key Shelf']
+  const standing = async () => ({
+    collections: stateOrder().collections ?? [],
+    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
+    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
+    trash: (await rows({ kind: 'trash' })).length,
+    trashColumnStyle: personal().trashColumnStyle ?? null,
+    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
+    chains: CHAINS.filter(exists),
+  })
+  const start = await standing()
+  await must('confirmDeletion on', ask(cdp, 'personalization:set', 'confirmDeletion', true))
+
+  await op('create Key Coll', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Key Coll' })
+  for (const t of ['Key One', 'Key Two']) await createAt(cdp, 'Key Coll', t)
+  const looseA = await createAt(cdp, A_ALPHA, 'Key Loose A')
+  const looseB = await createAt(cdp, A_ALPHA, 'Key Loose B')
+  const shelfId = containerId()
+  await op('create Key Shelf', { op: 'createContainer', id: shelfId, parentPath: '', kind: 'collection', name: 'Key Shelf' })
+  await op('create Key Box', { op: 'createContainer', id: containerId(), parentPath: 'Key Shelf', kind: 'set', name: 'Key Box' })
+  await createAt(cdp, 'Key Shelf/Key Box', 'Key Inside')
+  const back = await createAt(cdp, 'Key Shelf', 'Key Back')
+  const spent = await createAt(cdp, 'Key Shelf', 'Key Spent')
+  const bulk = []
+  for (let i = 1; i <= 40; i++) bulk.push(await createAt(cdp, 'Key Shelf', `Key Bulk ${String(i).padStart(2, '0')}`))
+  await op('create Key Bare', { op: 'createContainer', id: containerId(), parentPath: '', kind: 'collection', name: 'Key Bare' })
+  await makeSet(cdp, 'Key Empty')
+  // Outside the app, once its create is still past the watcher's 200 ms hold.
+  await sleep(400)
+  writeFileSync(abs(back), `${FM.exec(readRel(back))[0]}Back body.\n`)
+  await sleep(600)
+  for (const rel of [looseA, looseB]) {
+    await deleteAt(cdp, rel, 'page')
+    await sleep(20)
+  }
+  const keyColl = await bundledBy('delete Key Coll', { op: 'delete', path: 'Key Coll', kind: 'collection' })
+  // The named rows archive last, so they list first, above the window's fold.
+  for (const [rel, kind] of [...bulk.map((rel) => [rel, 'page']), ['Key Shelf/Key Box', 'set'], [back, 'page'], [spent, 'page']]) {
+    await op(`archive ${rel}`, { op: 'archive', path: rel, kind })
+    await sleep(20)
+  }
+  const SHELF = { kind: 'archive', id: shelfId }
+
+  await openSettings(cdp, 'Trash')
+  await until('the Key Coll row', () => cdp.evaluate(`!!(${trashRowEl('Key Coll')})`))
+  const startWidth = await settingsWidth(cdp)
+  await cdp.evaluate(`${TRASH_SEARCH}.focus()`)
+  await pressKey(cdp, 'Tab')
+  const landed = await focusedRow(cdp)
+  await pressKey(cdp, 'ArrowDown')
+  const stepped = await focusedRow(cdp)
+  await pressKey(cdp, 'ArrowUp')
+  const steppedBack = await focusedRow(cdp)
+  await pressKey(cdp, 'Enter')
+  const disclosed = await settles(async () => (await expandedOf(cdp, trashRowEl('Key Coll'))) === 'true' && same(titlesAfter(await listedTitles(cdp), 'Key Coll', 2), ['Key One', 'Key Two']))
+  for (const key of ['ArrowRight', 'ArrowLeft']) await pressKey(cdp, key)
+  const sideways = { focused: await focusedRow(cdp), expanded: await expandedOf(cdp, trashRowEl('Key Coll')), checked: await checkedIn(cdp, '.trash-frame') }
+  await pressKey(cdp, 'ArrowDown')
+  const onOne = await focusedRow(cdp)
+  await pressKey(cdp, ' ')
+  const spaced = await trashChecked(cdp, 'Key One')
+  await pressKey(cdp, 'ArrowDown')
+  const tabs = await tabCount(cdp)
+  await pressKey(cdp, 'Enter')
+  await sleep(500)
+  const entered = { checked: await trashChecked(cdp, 'Key Two'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
+  await pressKey(cdp, ' ')
+  await pressKey(cdp, 'ArrowUp')
+  await pressKey(cdp, ' ')
+  const cleared = (await checkedIn(cdp, '.trash-frame')) === 0
+  await pressKey(cdp, 'Tab')
+  const left = await cdp.evaluate(`(() => { const a = document.activeElement; return !a?.closest('.bundle-rows') && !a?.matches('[role=checkbox]') })()`)
+  item('7B', 'Keyboard', "the Trash's rows are one Tab stop whose arrows step, whose Enter discloses a container and checks a page, opening nothing, and whose Space checks a page",
+    landed === 'Key Coll' && stepped === 'Key Loose B' && steppedBack === 'Key Coll' && disclosed && onOne === 'Key One' && spaced && same(entered, { checked: true, reader: false, tabs }) && cleared && left,
+    show({ landed, stepped, steppedBack, disclosed, onOne, spaced, entered, cleared, left }))
+  item('7B', '— (current behavior)', 'Left and Right on a row do nothing', same(sideways, { focused: 'Key Coll', expanded: 'true', checked: 0 }), show(sideways))
+
+  await searchTrash(cdp, 'key one')
+  const innerUnmatched = await settles(async () => { const t = await listedTitles(cdp); return !t.includes('Key Coll') && !t.includes('Key One') })
+  await searchTrash(cdp, 'key coll')
+  const followed = await settles(async () => same(await listedTitles(cdp), ['Key Coll', 'Key One', 'Key Two']))
+  await searchTrash(cdp, '')
+  item('7B', 'Search', "the search narrows top rows only, an open container's rows following it", innerUnmatched && followed, show({ innerUnmatched, followed, shown: await listedTitles(cdp) }))
+
+  for (const t of ['Key Loose A', 'Key Loose B']) await checkTrash(cdp, t)
+  await searchTrash(cdp, 'loose a')
+  await settles(async () => same(await listedTitles(cdp), ['Key Loose A']))
+  const searched = await chooseNative(cdp, trashRowEl('Key Loose A'), [])
+  await searchTrash(cdp, '')
+  await settles(async () => (await listedTitles(cdp)).includes('Key Loose B'))
+  const unsearched = await chooseNative(cdp, trashRowEl('Key Loose A'), [])
+  for (const t of ['Key Loose A', 'Key Loose B']) await checkTrash(cdp, t)
+  item('7B', 'Collapsing, Search', 'a search that hides a checked row keeps it out of the menu',
+    same(searched.rows, ['Restore', 'Delete']) && same(unsearched.rows, ['Restore All', 'Delete All']) && (await checkedIn(cdp, '.trash-frame')) === 0,
+    show({ searched: searched.rows, unsearched: unsearched.rows }))
+
+  await searchTrash(cdp, 'key loose')
+  await pressKey(cdp, 'Escape')
+  const trashEscape = await cdp.evaluate(`({ focused: document.activeElement === ${TRASH_SEARCH}, value: ${TRASH_SEARCH}.value, settings: !!document.querySelector('.settings-rail') })`)
+  trashEscape.shown = await listedTitles(cdp)
+  await searchTrash(cdp, 'zzz')
+  const trashNothing = { line: await emptyLine(cdp, '.trash-empty'), rows: await cdp.evaluate(`document.querySelectorAll('.trash-frame .data-row').length`) }
+  await searchTrash(cdp, '')
+  await cdp.evaluate('document.activeElement?.blur()')
+
+  const DATE_HEAD = sel('.trash-head-date')
+  const styled = async (label, key, value) => {
+    const { chosen } = await chooseNative(cdp, DATE_HEAD, label)
+    return chosen && (await settles(async () => (trashStyle() ?? {})[key] === value))
+  }
+  const firstDate = () => cdp.evaluate(`document.querySelector('.trash-frame .bundle-date')?.textContent ?? ''`)
+  const styles = {}
+  styles.monthDayYear = (await styled('MM/DD/YYYY', 'date_format', 'monthDayYear')) && /^\d{2}\/\d{2}\/\d{4}/.test(await firstDate())
+  styles.dayMonthYear = await styled('DD/MM/YYYY', 'date_format', 'dayMonthYear')
+  styles.twentyFourHour = (await styled('24 Hours', 'time_format', 'twentyFourHour')) &&
+    (await cdp.evaluate(`[...document.querySelectorAll('.trash-frame .bundle-date')].every((c) => !/AM|PM/.test(c.textContent))`))
+  styles.hideTime = await styled('Hide Time', 'time_format', 'none')
+  styles.relative = await styled('Relative', 'date_format', 'relative')
+  styles.short = (await styled('Short Date', 'date_format', 'short')) && (await styled('Short', 'weekday', 'short'))
+  for (const label of ['Full Date', 'Show Time', 'Hide Day']) await chooseNative(cdp, DATE_HEAD, label)
+  styles.returned = await settles(async () => trashStyle() === undefined)
+  item('7B', 'G-1', "the date column's other styles write their keys and draw their forms", Object.values(styles).every(Boolean), show({ styles, style: trashStyle() }))
+
+  const look = await cdp.evaluate(`(() => { const hd = document.querySelector('.trash-head-date').getBoundingClientRect(); const cell = document.querySelector('.trash-frame .bundle-date').getBoundingClientRect(); const name = document.querySelector('.trash-head-name').firstElementChild.getBoundingClientRect(); const box = document.querySelector('.trash-frame .data-row [role=checkbox]').getBoundingClientRect(); return { column: Math.abs(hd.left - cell.left), nameLeft: name.left, box: [box.left, box.right], heights: [...document.querySelectorAll('.trash-frame .data-row')].every((r) => Math.abs(r.getBoundingClientRect().height - 29.75) < 0.01) } })()`)
+  await chooseNative(cdp, DATE_HEAD, 'Full')
+  await resizeBy(cdp, sel('.settings-window .resize-edge-se'), { dx: -400 })
+  const narrowWidth = await settingsWidth(cdp)
+  const narrow = await cdp.evaluate(`(() => { const t = document.querySelector('.trash-table'); const head = document.querySelector('.trash-head'); const row = document.querySelector('.trash-frame .data-row'); const at = () => ({ head: head.getBoundingClientRect().left, row: row.getBoundingClientRect().left }); const before = at(); t.scrollLeft = 120; const after = at(); const out = { over: t.scrollWidth > t.clientWidth, scrolled: t.scrollLeft, head: before.head - after.head, row: before.row - after.row, fit: [...document.querySelectorAll('.trash-frame .bundle-date')].every((c) => c.scrollWidth <= c.clientWidth) }; return out })()`)
+  await shot(cdp, 'g7b-narrow-trash')
+  await cdp.evaluate(`document.querySelector('.trash-table').scrollLeft = 0`)
+  await resizeBy(cdp, sel('.settings-window .resize-edge-se'), { dx: startWidth - narrowWidth })
+  const widthBack = await settingsWidth(cdp)
+  await chooseNative(cdp, DATE_HEAD, 'Hide Day')
+  await settles(async () => trashStyle() === undefined)
+  item('7B', "Width, The Trash's Look, Row Look", 'a narrow Trash scrolls sideways with its heading, its labels where they were',
+    look.column < 0.5 && look.nameLeft >= look.box[0] && look.nameLeft < look.box[1] && look.heights && Math.abs(narrowWidth - 620) < 0.5 &&
+      narrow.over && narrow.scrolled === 120 && Math.abs(narrow.head - 120) < 0.5 && Math.abs(narrow.row - 120) < 0.5 && narrow.fit,
+    show({ look, startWidth, narrowWidth, narrow, widthBack }))
+
+  const ctrl = await popNative(cdp, await boxOf(cdp, `(${trashRowEl('Key Loose A')}).querySelector('.bundle-date')`), 'left', 2)
+  await pickNative([])
+  item('7B', 'Clicks', "a ctrl-press opens a row's menu and checks nothing",
+    same(labels(ctrl), ['Restore', 'Delete']) && !(await trashChecked(cdp, 'Key Loose A')), show({ ctrl: labels(ctrl) }))
+  await closeSettings(cdp)
+
+  await sidebarTo(cdp, 'Collections', 'Key Shelf')
+  await sleep(1200)
+  await toArchive(cdp)
+  await until('the Key Shelf rows', async () => (await arcTitles(cdp))[0] === 'Key Spent')
+  await cdp.evaluate(`${ZONE}.focus()`)
+  const arcLanded = await focusedRow(cdp)
+  await pressKey(cdp, 'ArrowDown')
+  const onBack = await focusedRow(cdp)
+  await pressKey(cdp, ' ')
+  const spacedBack = { checked: await arcChecked(cdp, 'Key Back'), face: await settles(async () => (await notice(cdp)) === 'Restore1 Page'), reader: await settles(() => cdp.evaluate(`!!${READER}`), 800) }
+  await pressKey(cdp, ' ')
+  const spacedOff = !(await arcChecked(cdp, 'Key Back'))
+  await pressKey(cdp, 'Enter')
+  const read = await settles(() => cdp.evaluate(`(${READER})?.querySelector('.cm-content')?.textContent.includes('Back body.') ?? false`))
+  const enteredBack = await arcChecked(cdp, 'Key Back')
+  await pressKey(cdp, 'Escape')
+  const readerClosed = await settles(async () => !(await cdp.evaluate(`!!${READER}`)))
+  await cdp.evaluate(`${ZONE}.focus()`)
+  const refocused = await focusedRow(cdp)
+  await pressKey(cdp, ' ')
+  await pressKey(cdp, 'ArrowDown')
+  const onBox = await focusedRow(cdp)
+  await pressKey(cdp, ' ')
+  const boxSpaced = { checked: await arcChecked(cdp, 'Key Box'), expanded: await expandedOf(cdp, arcRow('Key Box')) }
+  await pressKey(cdp, ' ')
+  await pressKey(cdp, 'Enter')
+  const boxEntered = await settles(async () => (await expandedOf(cdp, arcRow('Key Box'))) === 'true' && same(titlesAfter(await arcTitles(cdp), 'Key Box', 1), ['Key Inside']))
+  item('7B', 'Keyboard, Clicks', "in the Archive, Space checks and unchecks a row, a Set's too, and Enter opens a page's reader leaving it checked and discloses a Set",
+    arcLanded === 'Key Spent' && onBack === 'Key Back' && same(spacedBack, { checked: true, face: true, reader: false }) && spacedOff && read && enteredBack && readerClosed &&
+      refocused === 'Key Back' && !(await arcChecked(cdp, 'Key Back')) && onBox === 'Key Box' && same(boxSpaced, { checked: true, expanded: 'false' }) && !(await arcChecked(cdp, 'Key Box')) && boxEntered,
+    show({ arcLanded, onBack, spacedBack, spacedOff, read, enteredBack, readerClosed, refocused, onBox, boxSpaced, boxEntered }))
+
+  const held = await focusedRow(cdp)
+  await cdp.evaluate(`(() => { const s = ${live('.detail-scroll')}; s.scrollTop = s.scrollHeight })()`)
+  await sleep(600)
+  const kept7B = await cdp.evaluate(`(() => { const a = document.activeElement; return { connected: !!a?.isConnected, row: a?.matches?.('.data-row[role=treeitem]') ?? false, title: a?.querySelector?.('.cell-title-text')?.textContent ?? null, drawn: document.querySelectorAll('.bundle-rows .data-row').length } })()`)
+  const listedCount = (await rows(SHELF)).length
+  await cdp.evaluate(`(${live('.detail-scroll')}).scrollTop = 0`)
+  item('7B', '4.7, Keyboard', 'the focused row stays drawn while the list scrolls past it',
+    held === 'Key Box' && kept7B.connected && kept7B.row && kept7B.title === held && kept7B.drawn < listedCount, show({ held, kept7B, listedCount }))
+
+  await mouseClick(cdp, live('.detail-title-text'))
+  await until('the search field', () => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`)).catch(() => {})
+  await typeText(cdp, 'bulk')
+  await settles(async () => (await arcTitles(cdp)).every((t) => t.startsWith('Key Bulk')))
+  await pressKey(cdp, 'Escape')
+  const archiveEscape = await cdp.evaluate(`({ focused: document.activeElement?.matches('.detail-title-search') ?? false, value: (${live('.detail-title-search')})?.value ?? null })`)
+  archiveEscape.count = await results(cdp)
+  await pressKey(cdp, 'Escape')
+  const archiveClosed = await settles(async () => !(await searching(cdp)) && (await results(cdp)) === '43')
+  item('7B', 'Search', "Escape in either search leaves its field and keeps its query, and a second closes the Archive's",
+    same(trashEscape, { focused: false, value: 'key loose', settings: true, shown: ['Key Loose B', 'Key Loose A'] }) && same(archiveEscape, { focused: false, value: 'bulk', count: '40' }) && archiveClosed,
+    show({ trashEscape, archiveEscape, archiveClosed }))
+
+  await cdp.evaluate('document.activeElement?.blur()')
+  await pressKey(cdp, 'f', META)
+  const commanded = await settles(() => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`))
+  await pressKey(cdp, 'Escape')
+  const commandClosed = await settles(async () => !(await searching(cdp)))
+  const { chosen: menuSearch } = await chooseNative(cdp, live('.detail-title-text'), 'Search')
+  const fromMenu = await settles(() => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`))
+  const counted = await results(cdp)
+  await typeText(cdp, 'key b')
+  const narrowedCount = await settles(async () => (await results(cdp)) === '42')
+  const insideFollows = same(titlesAfter(await arcTitles(cdp), 'Key Box', 1), ['Key Inside'])
+  await mouseClick(cdp, live('.detail-title-clear button'))
+  await settles(async () => (await arcTitles(cdp)).includes('Key Spent'))
+  item('7B', 'Search, G-1 ruling 15', "⌘F and the title's Search open the Archive's search, and its Results count only the top rows it leaves",
+    commanded && commandClosed && menuSearch && fromMenu && counted === '43' && narrowedCount && insideFollows, show({ commanded, commandClosed, menuSearch, fromMenu, counted, results: await results(cdp), insideFollows }))
+
+  await mouseClick(cdp, live('.detail-title-text'))
+  await until('the search field', () => cdp.evaluate(`document.activeElement?.matches('.detail-title-search') ?? false`)).catch(() => {})
+  await typeText(cdp, 'zzz')
+  await settles(async () => (await arcTitles(cdp)).length === 0)
+  const archiveNothing = { line: await emptyLine(cdp, '.archive-empty'), rows: (await arcTitles(cdp)).length }
+  await mouseClick(cdp, live('.detail-title-clear button'))
+  await settles(async () => (await arcTitles(cdp)).includes('Key Spent'))
+
+  const before = Object.fromEntries((await rows(SHELF)).map((r) => [r.title, r.bundlePath]))
+  const { chosen: backChosen, rows: backRows } = await chooseNative(cdp, arcRow('Key Back'), 'Restore')
+  const backSaid = await noticeUp(cdp, 'Restored “Key Back”Undo')
+  const backLanded = exists('Key Shelf/Key Back.md')
+  await pointerAway(cdp)
+  await cdp.evaluate('document.activeElement?.blur()')
+  await pressKey(cdp, 'z', META)
+  const chorded = await settles(async () => exists(before['Key Back']) && !exists('Key Shelf/Key Back.md') && (await drained(cdp)))
+  item('7B', 'Undo, I-3', "a page's Restore from the Archive offers an Undo that ⌘Z runs", backChosen && backSaid && backLanded && chorded, show({ backChosen, backRows, backSaid, backLanded, chorded, notice: await notice(cdp) }))
+
+  await until('Key Back back', async () => (await arcTitles(cdp)).includes('Key Back')).catch(() => {})
+  const { chosen: spentChosen } = await chooseNative(cdp, arcRow('Key Spent'), 'Delete')
+  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
+  if (await cdp.evaluate(`!!${DIALOG}`)) await pressDialog(cdp, 'Delete')
+  const spentSaid = await noticeUp(cdp, 'Deleted “Key Spent”Undo')
+  const frames = () => cdp.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')
+  await frames()
+  const far = await cdp.evaluate(`({ x: 8, y: innerHeight - 8 })`)
+  await moveTo(cdp, far)
+  await frames()
+  await moveTo(cdp, await boxOf(cdp, LABEL))
+  await click(cdp, ribbon('Settings'))
+  await until('the Settings window', () => cdp.evaluate(`!!document.querySelector('.settings-rail')`))
+  await click(cdp, `${RAIL}.find((r) => r.textContent.trim() === 'Trash')`)
+  await until('the Key Spent row', () => cdp.evaluate(`!!(${trashRowEl('Key Spent')})`))
+  const spentMenu = await menuByEvent(cdp, trashRowEl('Key Spent'))
+  const spentPicked = await pickNative(['Restore'])
+  const spentNamed = async () => [...(await rows({ kind: 'trash' })), ...(await rows(SHELF))].some((r) => r.title === 'Key Spent')
+  const spentBack = await settles(async () => exists('Key Shelf/Key Spent.md') && !(await spentNamed()) && (await notice(cdp)) === 'Restored “Key Spent”', 1500)
+  await moveTo(cdp, far)
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const spentStays = exists('Key Shelf/Key Spent.md') && !(await spentNamed())
+  item('7B', 'Undo, E-3', "a Trash restore of what an Archive delete moved spends that delete's Undo",
+    spentChosen && spentSaid && same(labels(spentMenu), ['Restore', 'Delete']) && spentPicked && spentBack && spentStays, show({ spentChosen, spentSaid, spentMenu: labels(spentMenu), spentPicked, spentBack, spentStays, notice: await notice(cdp) }))
+  await click(cdp, ribbon('Settings'))
+  await sleep(600)
+
+  const grid = `(${live('.bundle-rows')}).closest('.table-grid')`
+  const roomy = await cdp.evaluate(`(() => { const g = ${grid}; return { min: parseFloat(getComputedStyle(g).minWidth), content: (${live('.detail-scroll')}).clientWidth, viewport: innerWidth, height: innerHeight } })()`)
+  const narrowTo = Math.round(roomy.viewport - (roomy.content - (roomy.min - 120)))
+  await cdp.send('Emulation.setDeviceMetricsOverride', { width: narrowTo, height: roomy.height, deviceScaleFactor: 0, mobile: false })
+  await sleep(1000)
+  const squeezed = await cdp.evaluate(`(() => {
+    const g = ${grid}
+    const scroller = (() => { for (let e = g.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if ((o === 'auto' || o === 'scroll') && e.scrollWidth > e.clientWidth) return e } return null })()
+    const row = ${live('.bundle-rows .data-row')}
+    const before = row.getBoundingClientRect().left
+    if (scroller) scroller.scrollLeft = 60
+    const moved = before - row.getBoundingClientRect().left
+    if (scroller) scroller.scrollLeft = scroller.scrollWidth
+    const edge = scroller ? scroller.getBoundingClientRect().right : innerWidth
+    const dates = [...document.querySelectorAll('.bundle-rows .bundle-date')].filter((c) => !c.closest('[inert]'))
+    return {
+      viewport: innerWidth,
+      gridWidth: g.getBoundingClientRect().width,
+      min: parseFloat(getComputedStyle(g).minWidth),
+      scroller: scroller?.className ?? null,
+      moved,
+      fit: dates.every((c) => c.scrollWidth <= c.clientWidth),
+      reached: Math.max(...dates.map((c) => c.getBoundingClientRect().right)) <= edge + 0.5,
+    }
+  })()`)
+  await shot(cdp, 'g7b-narrow-archive')
+  await cdp.evaluate(`(() => { const g = ${grid}; for (let e = g.parentElement; e; e = e.parentElement) e.scrollLeft = 0 })()`)
+  await cdp.send('Emulation.clearDeviceMetricsOverride')
+  await sleep(800)
+  item('7B', 'Width', 'a narrow Archive scrolls sideways, nothing clipped',
+    !!squeezed.scroller && Math.abs(squeezed.moved - 60) < 0.5 && squeezed.gridWidth >= squeezed.min - 0.5 && squeezed.fit && squeezed.reached,
+    show({ roomy, narrowTo, squeezed }))
+
+  const crumbs = await trailOf(cdp, live('.subfield-crumbs'))
+  await mouseClick(cdp, `[...document.querySelectorAll('.subfield-crumbs *')].find((e) => !e.closest('[inert]') && e.children.length === 0 && e.textContent.trim() === 'Key Shelf')`)
+  const byCrumb = await settles(async () => !(await cdp.evaluate(`!!(${live('.detail-title-trailing')})`)))
+  await toArchive(cdp)
+  await mouseClick(cdp, live('button[title="Views"]'))
+  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
+  const VIEW_ROW = `(${ARCHIVE_ROW})?.parentElement.querySelector('[data-line-row] [role="button"], [data-line-row][role="button"]')`
+  await mouseClick(cdp, VIEW_ROW)
+  const byView = await settles(async () => !(await cdp.evaluate(`!!(${live('.detail-title-trailing')})`)))
+  if (!(await cdp.evaluate(`!!(${ARCHIVE_ROW})`))) await mouseClick(cdp, live('button[title="Views"]'))
+  await until('the views dropdown', () => cdp.evaluate(`!!(${ARCHIVE_ROW})`)).catch(() => {})
+  const rings = await cdp.evaluate(`(() => { const v = ${VIEW_ROW}; const a = ${ARCHIVE_ROW}; return { view: !!v && ${picked('v')}, archive: !!a && ${picked('a')} } })()`)
+  await pressKey(cdp, 'Escape')
+  item('7B', 'G-4, G-5', "picking a view, or the owner's crumb, leaves the Archive",
+    same(crumbs, ['Key Shelf', 'Archive']) && byCrumb && byView && same(rings, { view: true, archive: false }), show({ crumbs, byCrumb, byView, rings }))
+
+  await sidebarTo(cdp, 'Collections', 'Key Bare')
+  await sleep(1200)
+  await toArchive(cdp)
+  await settles(async () => (await emptyLine(cdp, '.archive-empty')) !== null)
+  const bare = { line: await emptyLine(cdp, '.archive-empty'), count: await results(cdp) }
+  await unfold(cdp, COLLECTION, 'Key Empty')
+  await click(cdp, sidebarRow('Key Empty'))
+  await sleep(1200)
+  await toArchive(cdp)
+  await settles(async () => (await emptyLine(cdp, '.archive-empty')) === "This Set's archive is empty.")
+  const emptySet = await emptyLine(cdp, '.archive-empty')
+  item('7B', 'G-1', 'an archive or a search with nothing to show reads its line',
+    bare.line === "This Collection's archive is empty." && bare.count === '0' && emptySet === "This Set's archive is empty." &&
+      same(archiveNothing, { line: 'Nothing matches.', rows: 0 }) && same(trashNothing, { line: 'Nothing matches.', rows: 0 }),
+    show({ bare, emptySet, archiveNothing, trashNothing }))
+
+  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
+  await emptyAt(keyColl)
+  for (const t of ['Key Loose A', 'Key Loose B']) await emptyAt((await trashed(cdp, t))?.bundlePath)
+  for (const [path, kind] of [['Key Shelf', 'collection'], ['Key Bare', 'collection'], [`${COLLECTION}/Key Empty`, 'set']])
+    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
+  for (const key of ['confirmDeletion', 'permanentDelete', 'trashColumnStyle']) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
+  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
+  await sleep(400)
+  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
+  const ended = await standing()
+  item('7B', '—', 'the group leaves Collection A, the Trash, and every Archive it touched as it found them',
+    same(ended, start) && Math.abs(widthBack - startWidth) < 1 && !['Key Coll', 'Key Shelf', 'Key Bare'].some(exists) && !exists(`.nexus/archive/${shelfId}`),
+    show({ start, ended, startWidth, widthBack }))
+}
+
+// ── Group 7C — questions and settings (Disclosable Bundles, Phase 7) ────────
+
+const ASKS = ['confirmDeletion', 'permanentDelete', 'restoreLinksOnDeletion']
+const propertyIds = () => Object.keys(JSON.parse(readRel('.nexus/properties.json')).defs ?? {}).sort()
+/** A row's Delete, or `label`, chosen and its question read once it's up. */
+async function askDelete(cdp, expr, label = 'Delete') {
+  await chooseNative(cdp, expr, label)
+  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
+  return dialogRead(cdp)
+}
+const dialogGone = (cdp) => settles(async () => !(await cdp.evaluate(`!!${DIALOG}`)))
+async function flip(cdp, label) {
+  await openSettings(cdp, 'Files & Links')
+  await press(cdp, SWITCH(label))
+  await sleep(400)
+}
+
+async function group7C(cdp) {
+  const kept = personal()
+  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
+  const ARCHIVE_A = `.nexus/archive/${colA}`
+  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
+  const CHAINS = ['.trash/Collection A/Set Alpha', '.trash/Collection A']
+  const standing = async () => ({
+    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
+    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
+    trash: (await rows({ kind: 'trash' })).length,
+    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
+    properties: propertyIds(),
+    keys: Object.fromEntries(ASKS.map((k) => [k, personal()[k] ?? null])),
+    chains: CHAINS.filter(exists),
+  })
+  const start = await standing()
+
+  const askPage = await createAt(cdp, A_ALPHA, 'Ask Page')
+  const askGone = await createAt(cdp, A_ALPHA, 'Ask Gone')
+  await makeSet(cdp, 'Ask Set')
+  const askArc = await createAt(cdp, A_ALPHA, 'Ask Arc')
+  await makeSet(cdp, 'Ask Shelf')
+  await createAt(cdp, `${COLLECTION}/Ask Shelf`, 'Ask Inside')
+  const { created: { propertyId: linkId } } = await op('add Drive Link', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Link', type: 'link' } })
+  const target = await createAt(cdp, A_ALPHA, 'Link Target')
+  const holder = await createAt(cdp, A_ALPHA, 'Link Holder')
+  await op('link the holder', { op: 'setProperty', path: holder, propertyId: linkId, value: { kind: 'link', value: '[[Link Target]]' } })
+  await sleep(400)
+  for (const [rel, kind] of [[askPage, 'page'], [askGone, 'page'], [`${COLLECTION}/Ask Set`, 'set']]) {
+    await deleteAt(cdp, rel, kind)
+    await sleep(20)
+  }
+  for (const [rel, kind] of [[askArc, 'page'], [`${COLLECTION}/Ask Shelf`, 'set']]) await op(`archive ${rel}`, { op: 'archive', path: rel, kind })
+  const bundles = {}
+  for (const t of ['Ask Page', 'Ask Gone', 'Ask Set']) bundles[t] = (await trashed(cdp, t))?.bundlePath
+  const ERASED = 'It will be erased from this computer. This cannot be undone.'
+
+  await flip(cdp, 'Permanently Delete Files')
+  const permanentOn = await settles(async () => personal().permanentDelete === true)
+  await openSettings(cdp, 'Trash')
+  await until('the Ask Page row', () => cdp.evaluate(`!!(${trashRowEl('Ask Page')})`))
+  const asked = await askDelete(cdp, trashRowEl('Ask Page'))
+  await pressKey(cdp, 'Enter')
+  const enterKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
+  await askDelete(cdp, trashRowEl('Ask Page'))
+  await pressKey(cdp, 'Escape')
+  const escapeKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
+  await askDelete(cdp, trashRowEl('Ask Page'))
+  await mouseAt(cdp, { x: 6, y: 6 })
+  const outsideKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
+  await askDelete(cdp, trashRowEl('Ask Page'))
+  await pressDialog(cdp, 'Cancel')
+  const cancelKept = (await dialogGone(cdp)) && exists(bundles['Ask Page'])
+  await flip(cdp, 'Permanently Delete Files')
+  const permanentOff = await settles(async () => !('permanentDelete' in personal()))
+  await openSettings(cdp, 'Trash')
+  const offAsked = await askDelete(cdp, trashRowEl('Ask Page'))
+  await pressDialog(cdp, 'Cancel')
+  await dialogGone(cdp)
+  await flip(cdp, 'Permanently Delete Files')
+  await settles(async () => personal().permanentDelete === true)
+  await openSettings(cdp, 'Trash')
+  const goneAsked = await askDelete(cdp, trashRowEl('Ask Gone'))
+  if (goneAsked) await pressDialog(cdp, 'Delete')
+  const goneSaid = await postedPlain(cdp, 'Deleted “Ask Gone”')
+  const goneEmptied = await settles(async () => !exists(bundles['Ask Gone']) && exists(bundles['Ask Page']))
+  item('7C', 'K-4, K-5', "a Trash Delete's question follows Permanently Delete, and Escape, an outside press, and Cancel each keep the bundle",
+    permanentOn && asked?.message === 'Delete “Ask Page”?' && asked.detail === ERASED && escapeKept && outsideKept && cancelKept && permanentOff &&
+      offAsked?.detail === 'It will move to your system trash, which is where you would get it back from.' && goneAsked?.message === 'Delete “Ask Gone”?' && goneSaid && goneEmptied,
+    show({ permanentOn, asked, escapeKept, outsideKept, cancelKept, permanentOff, offAsked, goneAsked, goneSaid, goneEmptied, notice: await notice(cdp) }))
+  item('7C', '— (current behavior)', "Enter in a Trash Delete's question cancels it, keeping the bundle", enterKept, show({ enterKept }))
+  await closeSettings(cdp)
+
+  await sidebarTo(cdp, 'Collections', COLLECTION)
+  await sleep(1200)
+  await toArchive(cdp)
+  await until('the Ask rows', async () => { const t = await arcTitles(cdp); return t.includes('Ask Arc') && t.includes('Ask Shelf') })
+  const arcBundle = archivedBundle('Ask Arc')
+  const arcAsked = await askDelete(cdp, arcRow('Ask Arc'))
+  await pressKey(cdp, 'Enter')
+  const enterSaid = await noticeUp(cdp, 'Deleted “Ask Arc”Undo')
+  const enterTrash = (await trashed(cdp, 'Ask Arc'))?.bundlePath
+  const enterMoved = !!enterTrash && stamped(`.trash/${A_ALPHA}`, 'Ask Arc', '.deleted').test(enterTrash) && !exists(arcBundle)
+  if (enterSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const enterBack = await settles(async () => exists(arcBundle) && !exists(enterTrash))
+  item('7C', '— (current behavior)', "Enter in an Archive Delete's question answers Delete, and its Undo returns the page to the Archive",
+    arcAsked?.message === 'Delete “Ask Arc”?' && enterSaid && enterMoved && enterBack, show({ arcAsked, enterSaid, enterTrash, enterMoved, enterBack }))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+
+  await flip(cdp, 'Confirm Before Deletion')
+  const confirmOff = await settles(async () => personal().confirmDeletion === false)
+  await closeSettings(cdp)
+  await chooseNative(cdp, arcRow('Ask Arc'), 'Delete')
+  const [unasked, unaskedSaid] = await Promise.all([
+    holds(async () => !(await cdp.evaluate(`!!${DIALOG}`)), 1500),
+    noticeUp(cdp, 'Deleted “Ask Arc”Undo'),
+  ])
+  if (unaskedSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const unaskedBack = await settles(async () => exists(arcBundle) && !(await trashed(cdp, 'Ask Arc')))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const shelfBundle = archivedBundle('Ask Shelf')
+  const shelfAsked = await askDelete(cdp, arcRow('Ask Shelf'))
+  if (shelfAsked) await pressDialog(cdp, 'Delete')
+  const shelfSaid = await noticeUp(cdp, 'Deleted “Ask Shelf”Undo')
+  const shelfTrashed = !!(await trashed(cdp, 'Ask Shelf')) && !exists(shelfBundle)
+  if (shelfSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const shelfBack = await settles(async () => exists(shelfBundle) && !(await trashed(cdp, 'Ask Shelf')))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  item('7C', 'I-2, K-5', "with Confirm Before Deletion off, an Archive page's Delete asks nothing, while an Archive Set's still asks",
+    confirmOff && unasked && unaskedSaid && unaskedBack && shelfAsked?.message === 'Delete “Ask Shelf”?' && shelfSaid && shelfTrashed && shelfBack,
+    show({ confirmOff, unasked, unaskedSaid, unaskedBack, shelfAsked, shelfSaid, shelfTrashed, shelfBack }))
+  await openSettings(cdp, 'Trash')
+  const setAsked = await askDelete(cdp, trashRowEl('Ask Set'))
+  if (setAsked) await pressDialog(cdp, 'Cancel')
+  const setKept = (await dialogGone(cdp)) && exists(bundles['Ask Set'])
+  item('7C', '— (current behavior)', "with Confirm Before Deletion off, the Trash's Delete still asks", setAsked?.message === 'Delete “Ask Set”?' && setKept, show({ setAsked, setKept }))
+  await flip(cdp, 'Confirm Before Deletion')
+  const confirmBack = await settles(async () => !('confirmDeletion' in personal()))
+  await closeSettings(cdp)
+
+  await checkArc(cdp, 'Ask Arc')
+  await mouseClick(cdp, boxIn(arcRow('Ask Shelf')))
+  const itemsFace = await settles(async () => (await notice(cdp)) === 'Restore2 Items')
+  await pressBar(cdp, 'Delete', 'Restore2 Items')
+  await until('the confirmation', () => cdp.evaluate(`!!${DIALOG}`)).catch(() => {})
+  const barAsked = await dialogRead(cdp)
+  if (barAsked) await pressDialog(cdp, 'Cancel')
+  const barKept = (await dialogGone(cdp)) && exists(arcBundle) && exists(shelfBundle)
+  await checkArc(cdp, 'Ask Arc')
+  await mouseClick(cdp, boxIn(arcRow('Ask Shelf')))
+  await openSettings(cdp, 'Trash')
+  const checkBoth = async () => {
+    await checkTrash(cdp, 'Ask Page')
+    await mouseClick(cdp, boxIn(trashRowEl('Ask Set')))
+  }
+  await checkBoth()
+  const allAsked = await askDelete(cdp, trashRowEl('Ask Page'), 'Delete All')
+  if (allAsked) await pressDialog(cdp, 'Cancel')
+  const allKept = (await dialogGone(cdp)) && exists(bundles['Ask Page']) && exists(bundles['Ask Set'])
+  await checkBoth()
+  item('7C', 'G-6, K-4', 'a batch of a page and a Set reads Items in the bar and in both questions',
+    confirmBack && itemsFace && barAsked?.message === 'Delete these 2 Items?' && barKept && allAsked?.message === 'Delete these 2 Items?' && allKept,
+    show({ confirmBack, itemsFace, barAsked, barKept, allAsked, allKept }))
+
+  const linked = () => frontOf(holder)['Drive Link'] ?? null
+  await closeSettings(cdp)
+  await deleteAt(cdp, target, 'page')
+  const stripped = await settles(async () => linked() === null)
+  await openSettings(cdp, 'Trash')
+  await until('the Link Target row', () => cdp.evaluate(`!!(${trashRowEl('Link Target')})`))
+  await chooseNative(cdp, trashRowEl('Link Target'), 'Restore')
+  const relinked = await settles(async () => exists(target) && linked() === '[[Link Target]]')
+  await flip(cdp, 'Restore Links On Deletion')
+  const linksOff = await settles(async () => personal().restoreLinksOnDeletion === false)
+  await deleteAt(cdp, target, 'page')
+  await settles(async () => linked() === null)
+  await openSettings(cdp, 'Trash')
+  await until('the Link Target row', () => cdp.evaluate(`!!(${trashRowEl('Link Target')})`))
+  await chooseNative(cdp, trashRowEl('Link Target'), 'Restore')
+  const unlinked = (await settles(async () => exists(target))) && (await holds(async () => linked() === null, 1500))
+  await flip(cdp, 'Restore Links On Deletion')
+  const linksOn = await settles(async () => !('restoreLinksOnDeletion' in personal()))
+  await closeSettings(cdp)
+  item('7C', 'F-2', 'Restore Links On Deletion puts a restored page back into the Link values that named it, and off leaves them removed',
+    stripped && relinked && linksOff && unlinked && linksOn, show({ stripped, relinked, linksOff, unlinked, linksOn, linked: linked() }))
+
+  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
+  for (const t of ['Ask Page', 'Ask Set']) await emptyAt(bundles[t])
+  for (const [path, kind] of [[arcBundle, 'page'], [shelfBundle, 'set'], [target, 'page'], [holder, 'page']])
+    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
+  await op('delete Drive Link', { op: 'deleteProperty', propertyId: linkId })
+  await emptyAt((await trashed(cdp, 'Drive Link'))?.bundlePath)
+  for (const key of ASKS) await must(`${key} as it was`, ask(cdp, 'personalization:set', key, kept[key] ?? null))
+  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
+  await sleep(400)
+  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
+  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
+  const ended = await standing()
+  item('7C', '—', 'the group leaves Set Alpha, Collection A, its Archive, and the Trash as it found them', same(ended, start), show({ start, ended }))
+}
+
+// ── Group 7D — single and homeless rows (Disclosable Bundles, Phase 7) ──────
+
+const CONTEXTS_JSON = '.nexus/contexts/contexts.json'
+const contextTitles = () => JSON.parse(readRel(CONTEXTS_JSON)).contexts.map((c) => c.title)
+const contextIdOf = (title) => JSON.parse(readRel(CONTEXTS_JSON)).contexts.find((c) => c.title === title)?.id
+const fontStyleOf = (cdp, expr) => cdp.evaluate(`(() => { const t = (${expr})?.querySelector('.bundle-trail'); return t ? getComputedStyle(t).fontStyle : null })()`)
+/** A page shadowed at its old path by an outside file carrying a task-marked id, as another editor leaves one. */
+const squat = (rel) => writeFileSync(abs(rel), `---\nID: ${mintPageId().replace(/^(.{10})P/, '$1T')}\n---\nsquatter`)
+
+async function group7D(cdp) {
+  const kept = personal()
+  const colA = sidecarIdOf(`${COLLECTION}/_pagecollection.json`)
+  const ARCHIVE_A = `.nexus/archive/${colA}`
+  const ALPHA_SIDECAR = `${A_ALPHA}/_pageset.json`
+  const CHAINS = [`${ARCHIVE_A}/Collection A/Arc Gone Set`, '.trash/Collection A/Set Alpha', '.trash/Collection A/Stray Set', '.trash/Collection A/Arc Gone Set', '.trash/Collection A', '.trash/Collection B', '.trash/.nexus/contexts/Drive Ctx', '.trash/.nexus/contexts/Areas', '.trash/.nexus/contexts', '.trash/.nexus']
+  const standing = async () => ({
+    collections: stateOrder().collections ?? [],
+    aSets: orderIn(`${COLLECTION}/_pagecollection.json`, 'set_order'),
+    alphaPages: orderIn(ALPHA_SIDECAR, 'page_order'),
+    bPages: orderIn('Collection B/_pagecollection.json', 'page_order'),
+    contexts: readRel(CONTEXTS_JSON),
+    properties: propertyIds(),
+    trash: (await rows({ kind: 'trash' })).length,
+    archive: exists(ARCHIVE_A) && readdirSync(abs(ARCHIVE_A), { recursive: true }),
+    permanentDelete: (await config(cdp)).personalization.permanentDelete === true,
+    chains: CHAINS.filter(exists),
+  })
+  const start = await standing()
+
+  const wholeId = containerId()
+  await op('create Whole Coll', { op: 'createContainer', id: wholeId, parentPath: '', kind: 'collection', name: 'Whole Coll' })
+  const wholePage = await createAt(cdp, 'Whole Coll', 'Whole Page')
+  const live7D = await createAt(cdp, A_ALPHA, 'Live Page')
+  await makeSet(cdp, 'Stray Set')
+  const strays = [await createAt(cdp, `${COLLECTION}/Stray Set`, 'Stray Page'), await createAt(cdp, `${COLLECTION}/Stray Set`, 'Stray Two')]
+  const ctxId = containerId()
+  await op('create Drive Ctx', { op: 'createContextGroup', id: ctxId, name: 'Drive Ctx' })
+  for (const s of ['Drive Spc', 'Drive Spc Two']) await op(`create ${s}`, { op: 'createSpace', id: containerId(), contextId: ctxId, name: s })
+  const { created: { propertyId: propId } } = await op('add Drive Prop', { op: 'addProperty', containerPath: COLLECTION, draft: { label: 'Drive Prop', type: 'select', select_options: [{ key: 'One', label: 'One' }] } })
+  const partId = containerId()
+  await op('create Part Coll', { op: 'createContainer', id: partId, parentPath: '', kind: 'collection', name: 'Part Coll' })
+  await createAt(cdp, 'Part Coll', 'Part Page')
+  await makeSet(cdp, 'Arc Gone Set')
+  const arcLost = await createAt(cdp, `${COLLECTION}/Arc Gone Set`, 'Arc Lost')
+  const squats = ['Squat One', 'Squat Two', 'Squat Arc'].map((t) => page(A_ALPHA, t))
+  for (const rel of squats) await createAt(cdp, A_ALPHA, rel.split('/').at(-1).replace(/\.md$/, ''))
+  const dup = await createAt(cdp, A_ALPHA, 'Dup Page')
+  const fine = await createAt(cdp, A_ALPHA, 'Dup Fine')
+  await sleep(400)
+  const collectionsBefore = stateOrder().collections ?? []
+
+  await deleteAt(cdp, 'Whole Coll', 'collection')
+  await deleteAt(cdp, live7D, 'page')
+  for (const rel of strays) await deleteAt(cdp, rel, 'page')
+  await deleteAt(cdp, `${COLLECTION}/Stray Set`, 'set')
+  for (const s of ['Drive Spc', 'Drive Spc Two']) await deleteAt(cdp, `.nexus/contexts/Drive Ctx/${s}`, 'space')
+  await deleteAt(cdp, '.nexus/contexts/Drive Ctx', 'context')
+  await op('delete Drive Prop', { op: 'deleteProperty', propertyId: propId })
+  const part = await bundledBy('delete Part Coll', { op: 'delete', path: 'Part Coll', kind: 'collection' })
+  await op('archive Arc Lost', { op: 'archive', path: arcLost, kind: 'page' })
+  await deleteAt(cdp, `${COLLECTION}/Arc Gone Set`, 'set')
+  for (const rel of squats.slice(0, 2)) await deleteAt(cdp, rel, 'page')
+  await op('archive Squat Arc', { op: 'archive', path: squats[2], kind: 'page' })
+  for (const rel of [dup, fine]) await deleteAt(cdp, rel, 'page')
+  await sleep(400)
+  for (const rel of squats) squat(rel)
+  writeFileSync(abs(page(A_ALPHA, 'Dup Twin')), `---\nID: ${frontOf(`${(await trashed(cdp, 'Dup Page')).bundlePath}/Dup Page.md`).ID}\n---\ntwin\n`)
+  writeFileSync(abs(`${part}/_record.json`), JSON.stringify({ ...recordAt(part), partial: true }))
+  await sleep(1500)
+  await must('permanentDelete on', ask(cdp, 'personalization:set', 'permanentDelete', true))
+
+  await openSettings(cdp, 'Trash')
+  await chooseNative(cdp, await trashRowShown(cdp, 'Whole Coll'), 'Restore')
+  const wholeSaid = await postedPlain(cdp, 'Restored “Whole Coll”')
+  const wholeBack = await settles(async () => exists(wholePage) && frontOf(wholePage).ID === ids[wholePage] && same(stateOrder().collections ?? [], collectionsBefore.filter((id) => id !== partId)) && !(await listedTitles(cdp)).includes('Whole Coll'))
+  item('7D', 'E-2, A-3', "a trashed Collection's Restore returns it whole and posts its title", wholeSaid && wholeBack, show({ wholeSaid, wholeBack, notice: await notice(cdp), order: stateOrder().collections }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await closeSettings(cdp)
+  await deleteAt(cdp, 'Whole Coll', 'collection')
+  await openSettings(cdp, 'Trash')
+  const wholeBundle = (await trashed(cdp, 'Whole Coll'))?.bundlePath
+  const wholeAsked = await askDelete(cdp, await trashRowShown(cdp, 'Whole Coll'))
+  if (wholeAsked) await pressDialog(cdp, 'Delete')
+  const wholeGoneSaid = await postedPlain(cdp, 'Deleted “Whole Coll”')
+  const wholeEmptied = await settles(async () => !!wholeBundle && !exists(wholeBundle) && !exists(`.nexus/archive/${wholeId}`))
+  item('7D', 'K-4', "a trashed Collection's Delete asks by its title, empties it, and posts its title",
+    wholeAsked?.message === 'Delete “Whole Coll”?' && wholeGoneSaid && wholeEmptied, show({ wholeAsked, wholeGoneSaid, wholeEmptied }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const liveTrail = { trail: await trashTrailOf(cdp, 'Live Page'), style: await fontStyleOf(cdp, await trashRowShown(cdp, 'Live Page')) }
+  const strayTrail = { trail: await trashTrailOf(cdp, 'Stray Two'), style: await fontStyleOf(cdp, await trashRowShown(cdp, 'Stray Two')) }
+  const strayMenu = await popAt(cdp, trashRowEl('Stray Two'))
+  const strayChosen = await pickNative(restoreInto(strayMenu, 'Collection B'))
+  const strayLanded = await settles(async () => exists('Collection B/Stray Two.md'))
+  item('7D', 'Trails, Homeless Items', "a resolving row's trail reads live, a homeless one's reads historical, and the homeless page restores through Restore ▸",
+    same(liveTrail, { trail: [COLLECTION, 'Set Alpha'], style: 'normal' }) && same(strayTrail, { trail: [COLLECTION, 'Stray Set'], style: 'italic' }) &&
+      !!strayMenu?.find((r) => r.label === 'Restore')?.submenu && strayChosen && strayLanded,
+    show({ liveTrail, strayTrail, strayMenu: labels(strayMenu), strayChosen, strayLanded }))
+
+  const singles = ['Drive Ctx', 'Drive Spc', 'Drive Prop']
+  const singleShape = async (title) => cdp.evaluate(`(() => { const r = ${await trashRowShown(cdp, title)}; return { expanded: r.getAttribute('aria-expanded'), outline: !!r.querySelector('[data-drop-outline]'), chevron: !!r.querySelector('.row-chevron') } })()`)
+  const shapes = {}
+  const checkedOnClick = {}
+  for (const t of singles) {
+    shapes[t] = await singleShape(t)
+    await checkTrash(cdp, t)
+    checkedOnClick[t] = await trashChecked(cdp, t)
+  }
+  const tabs = await tabCount(cdp)
+  await doubleClick(cdp, titleIn(trashRowEl('Drive Prop')))
+  await sleep(600)
+  const propDouble = { checked: await trashChecked(cdp, 'Drive Prop'), reader: await cdp.evaluate(`!!${READER}`), tabs: await tabCount(cdp) }
+  const selectGlyph = await cdp.evaluate(`!!(${trashRowEl('Drive Prop')}).querySelector('.cell-title svg.lucide-send')`)
+  for (const t of singles) await checkTrash(cdp, t)
+  const flat = { expanded: null, outline: false, chevron: false }
+  item('7D', 'Single Rows', 'a Context, a Space, and a property list as single rows that check on a click',
+    singles.every((t) => same(shapes[t], flat) && checkedOnClick[t]) && same(propDouble, { checked: true, reader: false, tabs }) && selectGlyph && (await checkedIn(cdp, '.trash-frame')) === 0,
+    show({ shapes, checkedOnClick, propDouble, selectGlyph }))
+
+  const spaceMenu = await popAt(cdp, await trashRowShown(cdp, 'Drive Spc Two'))
+  const spaceTargets = labels(spaceMenu?.find((r) => r.label === 'Restore')?.submenu)
+  const spaceChosen = await pickNative(restoreInto(spaceMenu, 'Areas'))
+  const spaceLanded = await settles(async () => exists('.nexus/contexts/Areas/Drive Spc Two/_space.json'))
+  item('7D', 'Homeless Items', 'a homeless Space restores into the Context picked',
+    same(spaceTargets, contextTitles()) && !spaceTargets.includes(COLLECTION) && spaceChosen && spaceLanded, show({ spaceTargets, spaceChosen, spaceLanded }))
+
+  for (const t of ['Stray Page', 'Drive Spc']) await checkTrash(cdp, t)
+  const answerOf = (rows) => (labels(rows).includes('Areas') ? 'Areas' : 'Collection B')
+  const askedKinds = []
+  await chooseNative(cdp, trashRowEl('Stray Page'), 'Restore All')
+  const firstAsk = await until('the first ask', nativeRows, 3000).catch(() => null)
+  askedKinds.push(answerOf(firstAsk))
+  await pickNative(intoPath(firstAsk, answerOf(firstAsk)))
+  const secondAsk = await until('the second ask', nativeRows, 3000).catch(() => null)
+  askedKinds.push(answerOf(secondAsk))
+  await pickNative([])
+  const nothing = await holds(async () => { const t = await listedTitles(cdp); return t.includes('Stray Page') && t.includes('Drive Spc') && !exists('Collection B/Stray Page.md') && !exists('.nexus/contexts/Areas/Drive Spc') }, 1500)
+  await chooseNative(cdp, trashRowEl('Stray Page'), 'Restore All')
+  for (let i = 0; i < 2; i++) {
+    const asked = await until('the ask', nativeRows, 3000).catch(() => null)
+    await pickNative(intoPath(asked, answerOf(asked)))
+  }
+  const bothLanded = await settles(async () => exists('Collection B/Stray Page.md') && exists('.nexus/contexts/Areas/Drive Spc/_space.json'))
+  const itemsSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Items')
+  item('7D', 'Batch Restore', 'a batch of a homeless page and a homeless Space asks once per kind, and dismissing the second restores nothing',
+    same([...askedKinds].sort(), ['Areas', 'Collection B']) && nothing && bothLanded && itemsSaid, show({ askedKinds, nothing, bothLanded, notice: await notice(cdp) }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await chooseNative(cdp, await trashRowShown(cdp, 'Drive Ctx'), 'Restore')
+  const ctxSaid = await postedPlain(cdp, 'Restored “Drive Ctx”')
+  const ctxBack = await settles(async () => contextTitles().includes('Drive Ctx') && !(await listedTitles(cdp)).includes('Drive Ctx'))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await chooseNative(cdp, await trashRowShown(cdp, 'Drive Prop'), 'Restore')
+  const propSaid = await postedPlain(cdp, 'Restored “Drive Prop”')
+  const propBack = await settles(async () => propertyIds().includes(propId) && !(await listedTitles(cdp)).includes('Drive Prop'))
+  item('7D', 'Single Rows, E-2', "a Context's and a property's Restore return them to the registry and post their titles",
+    ctxSaid && ctxBack && propSaid && propBack, show({ ctxSaid, ctxBack, propSaid, propBack }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await closeSettings(cdp)
+  await op('delete Drive Prop again', { op: 'deleteProperty', propertyId: propId })
+  await openSettings(cdp, 'Trash')
+  const propBundle = (await trashed(cdp, 'Drive Prop'))?.bundlePath
+  const propAsked = await askDelete(cdp, await trashRowShown(cdp, 'Drive Prop'))
+  if (propAsked) await pressDialog(cdp, 'Delete')
+  const propGoneSaid = await postedPlain(cdp, 'Deleted “Drive Prop”')
+  const propEmptied = await settles(async () => !!propBundle && !exists(propBundle))
+  item('7D', 'K-4', "a property's Delete asks by its name, empties it, and posts its name",
+    propAsked?.message === 'Delete “Drive Prop”?' && propGoneSaid && propEmptied, show({ propAsked, propGoneSaid, propEmptied }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const PARTIAL = '[aria-label="Recorded Partly"]'
+  const partMarked = await cdp.evaluate(`!!(${await trashRowShown(cdp, 'Part Coll')}).querySelector('${PARTIAL}')`)
+  await mouseClick(cdp, titleIn(trashRowEl('Part Coll')))
+  await settles(async () => same(titlesAfter(await listedTitles(cdp), 'Part Coll', 1), ['Part Page']))
+  const innerMarked = await cdp.evaluate(`!!(${await trashRowShown(cdp, 'Part Page')}).querySelector('${PARTIAL}')`)
+  const partMenu = await popAt(cdp, trashRowEl('Part Page'))
+  await pickNative(restoreInto(partMenu, 'Collection B'))
+  const partLanded = await settles(async () => exists('Collection B/Part Page.md'))
+  const warned = await settles(async () => (await refusal(cdp)).includes('“Part Page” was recorded partly, so some of what it held may not come back.'))
+  item('7D', 'Partial Mark', "a partly recorded bundle marks its row and its inner rows, and an inner restore warns under the page's own title",
+    partMarked && innerMarked && partLanded && warned, show({ partMarked, innerMarked, partLanded, warned, refusal: await refusal(cdp) }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  for (const t of ['Dup Page', 'Dup Fine']) await checkTrash(cdp, t)
+  const dupBundle = (await trashed(cdp, 'Dup Page'))?.bundlePath
+  await chooseNative(cdp, trashRowEl('Dup Page'), 'Restore All')
+  const refusedSaid = await settles(async () => (await notice(cdp)) === 'Restored 1 Page. 1 Page couldn’t be restored.')
+  const refusedKept = exists(fine) && !!dupBundle && exists(dupBundle) && !exists(dup) && (await listedTitles(cdp)).includes('Dup Page')
+  item('7D', 'E-4', "a Restore All counts the row it couldn't restore",
+    refusedSaid && refusedKept, show({ refusedKept, notice: await notice(cdp) }))
+  await checkTrash(cdp, 'Dup Page')
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  for (const t of ['Squat One', 'Squat Two']) await checkTrash(cdp, t)
+  await chooseNative(cdp, trashRowEl('Squat One'), 'Restore All')
+  const renamedSaid = await settles(async () => (await notice(cdp)) === 'Restored 2 Pages2 Renamed')
+  const renamedLanded = squats.slice(0, 2).every((rel) => exists(rel.replace(/\.md$/, ' (2).md')) && readRel(rel).endsWith('squatter'))
+  await closeSettings(cdp)
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  await sidebarTo(cdp, 'Collections', COLLECTION)
+  await sleep(1200)
+  await toArchive(cdp)
+  await until('the Arc Lost row', async () => (await arcTitles(cdp)).includes('Arc Lost'))
+  const ARCHIVE = { kind: 'archive', id: colA }
+  const archivedAs = async (rel) => (await rows(ARCHIVE)).find((r) => r.stored?.id === ids[rel])?.bundlePath
+  const lostTrailOf = async () => ({ trail: await trailOf(cdp, `(${arcRow('Arc Lost')})?.querySelector('.bundle-trail')`), style: await fontStyleOf(cdp, arcRow('Arc Lost')) })
+  const LOST_TRAIL = { trail: [COLLECTION, 'Arc Gone Set'], style: 'italic' }
+  const lostTrail = await lostTrailOf()
+  const lostAt = await archivedAs(arcLost)
+  const lostRecord = lostAt && readRel(`${lostAt}/_record.json`)
+  const lostMenu = await popAt(cdp, arcRow('Arc Lost'))
+  const lostChosen = await pickNative(restoreInto(lostMenu, COLLECTION))
+  const lostSaid = await noticeUp(cdp, 'Restored “Arc Lost”Undo')
+  const lostLanded = exists(`${COLLECTION}/Arc Lost.md`)
+  if (lostSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const lostBack = await settles(async () => !!lostAt && (await archivedAs(arcLost)) === lostAt && exists(`${lostAt}/Arc Lost.md`) && !exists(`${COLLECTION}/Arc Lost.md`))
+  const lostExact = lostBack && readRel(`${lostAt}/_record.json`) === lostRecord
+  const lostHomeless = await settles(async () => same(await lostTrailOf(), LOST_TRAIL))
+  item('7D', 'Homeless Items, Trails, Undo', 'an archived page whose Set is gone restores through Restore ▸, and its Undo puts it back exactly as it was archived',
+    same(lostTrail, LOST_TRAIL) && lostChosen && lostSaid && lostLanded && lostBack && lostExact && lostHomeless,
+    show({ lostTrail, lostChosen, lostSaid, lostLanded, lostBack, lostExact, lostHomeless, lostAt, now: await archivedAs(arcLost) }))
+
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+  const squatAt = await archivedAs(squats[2])
+  const squatRecord = squatAt && readRel(`${squatAt}/_record.json`)
+  const { chosen: squatChosen } = await chooseNative(cdp, arcRow('Squat Arc'), 'Restore')
+  const squatSaid = await noticeUp(cdp, 'Restored “Squat Arc” as “Squat Arc (2)”Undo')
+  const squatLanded = exists(page(A_ALPHA, 'Squat Arc (2)')) && readRel(squats[2]).endsWith('squatter')
+  if (squatSaid) await pressUndo(cdp)
+  await pointerAway(cdp)
+  const squatBack = await settles(async () => !!squatAt && (await archivedAs(squats[2])) === squatAt && exists(`${squatAt}/Squat Arc.md`))
+  const steppedLeft = readdirSync(NEXUS, { recursive: true }).filter((n) => n.endsWith('Squat Arc (2).md'))
+  const squatExact = squatBack && readRel(`${squatAt}/_record.json`) === squatRecord && steppedLeft.length === 0
+  item('7D', 'E-4', "a restore onto an outside file steps aside, the Archive's with an Undo that puts it back exactly as it was archived, and a Trash batch's counted",
+    squatChosen && squatSaid && squatLanded && squatExact && renamedSaid && renamedLanded, show({ squatChosen, squatSaid, squatLanded, squatBack, squatExact, steppedLeft, renamedSaid, renamedLanded, squatAt, now: await archivedAs(squats[2]) }))
+  await until('the notice drained', () => drained(cdp)).catch(() => {})
+
+  const trashOf = async (title) => (await trashed(cdp, title))?.bundlePath
+  for (const t of ['Live Page', 'Stray Set', 'Arc Gone Set', 'Dup Page']) await emptyAt(await trashOf(t))
+  for (const rel of squats) rmSync(abs(rel), { force: true })
+  await sleep(600)
+  for (const rel of [page(A_ALPHA, 'Dup Twin'), 'Collection B/Stray Two.md', 'Collection B/Stray Page.md', 'Collection B/Part Page.md', fine, page(A_ALPHA, 'Squat One (2)'), page(A_ALPHA, 'Squat Two (2)')]) {
+    await deleteAt(cdp, rel, 'page')
+    await emptyAt(await trashOf(rel.split('/').at(-1).replace(/\.md$/, '')))
+  }
+  for (const [path, kind] of [[await archivedAs(arcLost), 'page'], [await archivedAs(squats[2]), 'page'], ['.nexus/contexts/Drive Ctx', 'context'], ['.nexus/contexts/Areas/Drive Spc', 'space'], ['.nexus/contexts/Areas/Drive Spc Two', 'space']])
+    await emptyAt(await bundledBy(`delete ${path}`, { op: 'delete', path, kind }))
+  await emptyAt(part)
+  await must('permanentDelete as it was', ask(cdp, 'personalization:set', 'permanentDelete', kept.permanentDelete ?? null))
+  // The watcher holds a folder the app just wrote until it's still for 200 ms, so the empty chain folders leave once those writes are still.
+  await sleep(400)
+  if (!start.archive) rmSync(abs(ARCHIVE_A), { recursive: true, force: true })
+  for (const rel of CHAINS) if (!start.chains.includes(rel) && exists(rel) && readdirSync(abs(rel)).length === 0) rmSync(abs(rel), { recursive: true })
+  const ended = await standing()
+  item('7D', '—', 'the group leaves Collections A and B, the Contexts, the registry, the Archive, and the Trash as they were', same(ended, start), show({ start, ended }))
+}
+
 // ── The run ─────────────────────────────────────────────────────────────────
 
 let cdp
@@ -1302 +2437 @@ try {
   if (GROUPS.has('5')) await group5(cdp)
   if (GROUPS.has('6A')) await group6A(cdp)
   if (GROUPS.has('6B')) await group6B()
+  if (GROUPS.has('7')) await group7(cdp)
+  if (GROUPS.has('7B')) await group7B(cdp)
+  if (GROUPS.has('7C')) await group7C(cdp)
+  if (GROUPS.has('7D')) await group7D(cdp)
   cdp.close()
 } catch (e) {
   item(0, '—', 'the run reached its end', false, String(e?.stack ?? e))
```

##### .claude/scripts/Metadata Drive/live-drive.mjs

```/.claude/scripts/Metadata Drive/live-drive.mjs diff
@@ -6 +6 @@ import {
   mintOptionId, optionId,
   ask, check, chooseNative, click, COPY, drag, FM, holds, itemCount, launch, META, mintPageId, mouseAt, boxOf, mouseClick,
   closePanel, closeSettings, DIALOG, must, NEXUS, openField, openPanel, openSettings, PORTAL_ROWS, portalOpen, pressKey, RAIL, read,
-  restore, results, ribbon, selectField, SETTINGS_BUTTON, settles, shot, sleep, textEl, typeText, until, viewFrame,
+  restore, results, ribbon, selectField, SETTINGS_BUTTON, settles, shot, sleep, textEl, trashRowEl, typeText, until, viewFrame,
 } from '../drive-harness.mjs'
 
 const PORT = 9363
@@ -1496 +1496 @@ async function group9(cdp) {
 
   // The Trash: a page restored through the Trash browser returns in the current spelling.
   await openSettings(cdp, 'Trash')
-  const trashRow = `[...document.querySelectorAll('.trash-row')].find((r) => r.textContent.includes('M9 Trashed'))`
-  const { rows: menu } = await chooseNative(cdp, trashRow, 'Restore')
+  const { rows: menu } = await chooseNative(cdp, trashRowEl('M9 Trashed'), 'Restore')
   pin(G, 'G-1', "a page restored from the Trash browser returns under the Label Format set while it was away",
     menu.includes('Restore') && (await wrote(trashed, 'm9 words: back')), show([menu, blockOf(trashed)]))
   await closeSettings(cdp)
```

##### .claude/scripts/Properties Drive/live-drive.mjs

```/.claude/scripts/Properties Drive/live-drive.mjs diff
@@ -623 +623 @@ async function group10() {
   const listed = (await trashRows(cdp)).find((r) => r.title === 'Drive Partial')
   await openSettings(cdp, 'Trash')
   const marked = await cdp.evaluate(`!!(${trashRowEl('Drive Partial')})?.querySelector('[role="img"][aria-label="Recorded Partly"]')`)
-  const plain = await cdp.evaluate(`[...document.querySelectorAll('.trash-row [aria-label="Recorded Partly"]')].length`)
+  const plain = await cdp.evaluate(`[...document.querySelectorAll('.trash-frame .data-row [aria-label="Recorded Partly"]')].length`)
   item(10, 'N-1', 'a partly recorded Trash entry shows its mark, and no other row does', listed?.partial === true && marked && plain === 1, show({ listed, marked, plain }))
   const back = await op('restore Drive Partial', { op: 'restore', bundlePath: partialBundle })
   item(10, 'N-1', 'its restore says it may not hold everything',
```

##### .claude/scripts/reveal-parity/run.mjs

```/.claude/scripts/reveal-parity/run.mjs diff
@@ -53 +53 @@ const reset = async () => {
 // ── Navigation ──
 const VIEW_EL = `__rv.q('.content-view .cm-content')?.cmTile?.root?.view`
 const VIEW = `__rv.q('.content-view .cm-content').cmTile.root.view`
-const ribbon = (name) => press(q(`button[aria-label="${name}" i]`), `ribbon ${name}`)
+const ribbon = (name) => press(q(`.sidebar-ribbon button[aria-label="${name}" i]`), `ribbon ${name}`)
 const collection = async (name) => {
   await ribbon('collections')
   await press(byText('.row', name), `row ${name}`)
@@ -344 +344 @@ surface('navPins', async () => {
 surface('trashChecks', async () => {
   await ribbon('settings')
   await press(byText('[role=dialog] *', 'Trash'), 'Trash rail row')
-  await need(q('.trash-frame .trash-row'), 'trash row')
+  await need(q('.trash-frame .data-row'), 'trash row')
   await sleep(SETTLE)
-  const rows = await ev(`__rv.all('.trash-frame .trash-row').length`)
-  const check = (i) => ({ id: `check${i}`, el: `__rv.all('.trash-frame .trash-row')[${i}]?.querySelector('[role=checkbox]')`, host: `__rv.all('.trash-frame .trash-row')[${i}]` })
+  const rows = await ev(`__rv.all('.trash-frame .data-row').length`)
+  const check = (i) => ({ id: `check${i}`, el: `__rv.all('.trash-frame .data-row')[${i}]?.querySelector('[role=checkbox]')`, host: `__rv.all('.trash-frame .data-row')[${i}]` })
   const res = { first: await settled(check(0)) }
   // Checking one row shows every check.
-  await press(`__rv.all('.trash-frame .trash-row')[0]`)
+  await press(`__rv.all('.trash-frame .data-row')[0]`)
   res.checkedOther = rows > 1 ? await settled(check(1)) : null
   res.checkedSelf = await settled(check(0))
-  await press(`__rv.all('.trash-frame .trash-row')[0]`)
+  await press(`__rv.all('.trash-frame .data-row')[0]`)
   await escape()
   await sleep(SETTLE)
   return res
```

##### Core/Actions/columnMenu.ts

```/Core/Actions/columnMenu.ts diff
@@ -4 +4 @@ import {
   DATE_FORMATS,
   LOOKS,
   showsWeekday,
+  STORED_TIME_FORMATS,
   TIME_FORMATS,
   WEEKDAY_FORMATS,
   type ColumnLook,
@@ -66 +67 @@ export function styleMenuItems(ctx: StyleMenuContext): ActionItem<StyleAction>[]
     return [
       ...DATE_FORMATS.map((f) => date(DATE_FORMAT_LABELS[f], f)),
       ...(showsWeekday(current.date_format)
-        ? WEEKDAY_FORMATS.map((w, i) => weekday(WEEKDAY_FORMAT_LABELS[w], w, i === 0))
+        ? [
+            ...WEEKDAY_FORMATS.filter((w) => w !== 'none').map((w, i) =>
+              weekday(WEEKDAY_FORMAT_LABELS[w], w, i === 0),
+            ),
+            current.weekday === 'none' ? weekday('Show Day', 'long') : weekday('Hide Day', 'none'),
+          ]
         : []),
-      ...TIME_FORMATS.map((t, i) => time(TIME_FORMAT_LABELS[t], t, i === 0)),
+      ...TIME_FORMATS.filter((t) => t !== 'none').map((t, i) =>
+        time(TIME_FORMAT_LABELS[t], t, i === 0),
+      ),
+      current.time_format === 'none' ? time('Show Time', 'shown') : time('Hide Time', 'none'),
     ]
   }
   const look = row('look', current.look)
@@ -96 +105 @@ export function columnMenuItems(ctx: ColumnMenuContext): ActionItem<ColumnMenuAc
 const STYLE_VALUES: Record<string, readonly string[]> = {
   look: COLUMN_LOOKS,
   date_format: DATE_FORMATS,
-  time_format: TIME_FORMATS,
+  time_format: STORED_TIME_FORMATS,
   weekday: WEEKDAY_FORMATS,
 }
 
```

##### Core/Archive/ArchiveView.tsx

```/Core/Archive/ArchiveView.tsx diff
@@ -1 +1 @@
-import { memo, useMemo, useState } from 'react'
-import { Checkbox } from '@pommora/uix/Controls/Checkbox'
-import { NavTrail } from '@pommora/uix/Elements/NavTrail'
-import { historical } from '@pommora/uix/Elements/nav-trail.css'
-import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
-import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
-import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
-import { text } from '@pommora/uix/Theme'
-import { cx } from '@pommora/uix/Utilities/cx'
+import { useMemo, useState } from 'react'
 import { useStableApi } from '@pommora/uix/Utilities/stableApi'
 import { Icon } from '@pommora/uix/Symbols'
 import { entityIcon } from '../Assets/entityIconPolicy'
-import { archivedKind, crumbSegments, useBundleBrowser } from '../Bundles/browser'
-import { DateHeading } from '../Bundles/DateHeading'
+import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
+import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
 import { countPhrase } from '../Nexus/entities'
 import type { BundleRow } from '../Bundles/rows'
 import { InterfaceScaffold } from '../Interface/InterfaceScaffold'
@@ -23 +15 @@ import { containerOwner } from '../Nexus/treeIndex'
 import { owningCollection } from '../Nexus/treePatch'
 import { propertyTypeIconName } from '../Properties/typeDisplay'
 import { personalizationOf } from '../Session/configSlice'
-import type { Personalization } from '../Settings/personalization'
 import { useSession } from '../Session/store'
-import { COLUMN_LAYOUT } from '../Views/Table/useColumns'
 import '../Views/Table/table-view.css'
 import { ARCHIVE_TITLE } from './archivePlace'
 import './archive-view.css'
 
-const ROW_H = 30
-
-type RowApi = {
-  toggle: (row: BundleRow) => void
-  menu: (row: BundleRow) => void
-  open: (row: BundleRow) => void
-}
-
-/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete, a page opened in the reader. */
+/** A Collection's or a top-level Set's archived items on TableView's sheet: checked for Restore and Delete. A Set discloses what it holds, and a page opens in the reader on a double-click. */
 export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): React.JSX.Element {
   const host = useContentHost()
   const shown = useHostShown()
@@ -46 +28 @@ export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): Rea
   const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
   const openReader = useSession((s) => s.openReader)
   const archiveId = useSession((s) => owningCollection(s.tree, owner)?.id) ?? owner.id
+  const open = (row: BundleRow): void => {
+    const stored = row.stored
+    if (!stored) return
+    openReader({
+      kind: 'archive',
+      page: { kind: 'page', ...stored },
+      trail: [
+        ...crumbSegments(row.crumbs, defaultIcons),
+        { title: row.title, icon: entityIcon('page', row.icon, defaultIcons) },
+      ],
+    })
+  }
   const browser = useBundleBrowser(
     { kind: 'archive', id: archiveId },
-    { query, shown, within: owner.kind === 'set' ? owner.id : undefined },
+    { query, shown, within: owner.kind === 'set' ? owner.id : undefined, open },
   )
   const { listing, visible } = browser
-  const dateTrack =
-    browser.date.width === null
-      ? `${COLUMN_LAYOUT.dateTime.width}px`
-      : `calc(${browser.date.width}px + 2 * var(--cell-padding-x))`
-  const cols = `minmax(${COLUMN_LAYOUT.title.width}px, 1fr) ${dateTrack}`
-
-  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
-  const { rows: slots, height } = useVirtualRows(
-    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl },
-    [],
-  )
-
   const api = useStableApi({
-    toggle: (row: BundleRow) => browser.toggle(row.bundlePath),
-    menu: (row: BundleRow) => void browser.openMenu(row),
-    open: (row: BundleRow) => {
-      const stored = row.stored
-      if (!stored) return
-      openReader({
-        kind: 'archive',
-        page: { kind: 'page', ...stored },
-        trail: [
-          ...crumbSegments(row.crumbs, defaultIcons),
-          { title: row.title, icon: entityIcon('page', row.icon, defaultIcons) },
-        ],
-      })
-    },
     restore: () => void browser.restore(browser.picked),
     remove: () => void browser.remove(browser.picked),
   })
@@ -88 +56 @@ export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): Rea
     [count, api],
   )
   useDeclareActions(bar)
-  usePublishCount(listing.status === 'ready' ? visible.length : null)
+  usePublishCount(listing.status === 'ready' ? browser.found : null)
 
   const footing = (): React.JSX.Element | null => {
     switch (listing.status) {
@@ -117 +85 @@ export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): Rea
       scrollRef={setScrollEl}
     >
       <div className="table table-view">
-        <div
-          className={cx('table-grid', text.body.standard)}
-          style={{ '--cols': cols } as React.CSSProperties}
-        >
+        <BundleTable date={browser.date}>
           <div className="table-head">
             <div className="col-header">
               <span className="col-header-icon">
@@ -131 +96 @@ export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): Rea
             <DateHeading
               date={browser.date}
               className="archive-date"
-              sampleClass={text.body.standard}
               label={
                 <span>
                   <span className="col-header-icon">
@@ -142 +106 @@ export function ArchiveView({ owner }: { owner: CollectionNode | SetNode }): Rea
               }
             />
           </div>
-          <div ref={setListEl} className="archive-rows" style={{ height }}>
-            {slots.map(({ index, start }) => {
-              const row = visible[index]
-              return (
-                <ArchiveRow
-                  key={row.bundlePath}
-                  row={row}
-                  start={start}
-                  lead={index === 0}
-                  checked={browser.checked.has(row.bundlePath)}
-                  revealed={browser.picked.length > 0}
-                  when={browser.date.when(row.storedAt)}
-                  icons={defaultIcons}
-                  api={api}
-                />
-              )
-            })}
-          </div>
-        </div>
+          {visible.length > 0 && <BundleRows browser={browser} scrollEl={scrollEl} />}
+        </BundleTable>
         {footing()}
       </div>
     </InterfaceScaffold>
   )
 }
-
-const ArchiveRow = memo(function ArchiveRow({
-  row,
-  start,
-  lead,
-  checked,
-  revealed,
-  when,
-  icons,
-  api,
-}: {
-  row: BundleRow
-  start: number
-  lead: boolean
-  checked: boolean
-  revealed: boolean
-  when: string
-  icons: Personalization['defaultIcons']
-  api: RowApi
-}): React.JSX.Element {
-  return (
-    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
-    <div
-      className={cx('data-row', lead && 'row-lead')}
-      data-reveal-host={revealed ? 'on' : ''}
-      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
-      onClick={() => api.toggle(row)}
-      onContextMenu={(e) => {
-        e.preventDefault()
-        api.menu(row)
-      }}
-    >
-      <div className="data-cell cell-lead">
-        <span className={cx('row-check', revealTarget)}>
-          <Checkbox
-            size="compact"
-            state={checked}
-            onChange={() => api.toggle(row)}
-            ariaLabel={`Select ${row.title}`}
-          />
-        </span>
-        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
-        <span
-          className={cx(overScrollLabel, 'cell-title')}
-          onClick={
-            row.kind === 'page'
-              ? (e) => {
-                  e.stopPropagation()
-                  api.open(row)
-                }
-              : undefined
-          }
-        >
-          <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
-          <span className="cell-title-text">{row.title}</span>
-        </span>
-        <NavTrail
-          segments={crumbSegments(row.crumbs, icons)}
-          iconSize="control"
-          className={cx('archive-trail', row.historical && historical)}
-        />
-      </div>
-      <div className="data-cell archive-date">{when}</div>
-    </div>
-  )
-})
```

##### Core/Archive/archive-view.css

```/Core/Archive/archive-view.css diff
@@ -1 +1 @@
-/* ArchiveView on TableView's sheet: the virtual list, each title with the trail it left at its right, as the Trash's rows carry theirs, and the Archived column. */
-.archive-rows {
-  position: relative;
-}
-.archive-rows > .data-row {
-  position: absolute;
-  inset-inline: 0;
-}
-.archive-rows .data-cell {
-  display: flex;
-  align-items: center;
-  gap: 8px; /* KNOB — the title from its trail */
-}
-.archive-rows .cell-title {
-  flex: 1 1 auto;
-  min-width: 0;
-}
-.archive-rows .archive-trail {
-  flex: 0 1 auto;
-  min-width: 0;
-  max-width: 55%;
-}
-.col-header.archive-date,
-.data-cell.archive-date {
-  align-items: center;
+/* ArchiveView's own heading over the bundle table, its Archived label centered over its column, and its empty line. */
+.col-header.archive-date {
   text-align: center;
 }
-.data-cell.archive-date {
-  justify-content: center;
-}
 .archive-empty {
   padding: var(--cell-padding-y) var(--cell-padding-x);
   color: var(--label-tertiary);
```

##### Core/Archive/archive.ts

```/Core/Archive/archive.ts diff
@@ -1 +1 @@
 // The Archive's own ops: a page or Set leaves its Collection for the Collection's Archive, where every cascade still reaches it, and comes back by a plain move to its exact place, with nothing to reconcile.
 
-import { dirname, join, relative } from '../Paths/posix'
-import { archiveStoreOf } from '../Paths/names'
+import { basename, dirname, isMarkdownFile, join, relative, titleFromPath } from '../Paths/posix'
+import { archiveStoreOf, holdsName } from '../Paths/names'
+import { hiddenFolder } from '../Paths/exclusion'
 import { fail, ok } from '../Contract/result'
-import { pathExists, relocate, removeOwn } from '../Files/atomicWrite'
-import { listMarkdownFiles } from '../Files/walk'
+import { pathExists, relocate } from '../Files/atomicWrite'
+import { isContentName, listMarkdownFiles } from '../Files/walk'
 import { archiveDirRel } from '../Paths/nexusPaths'
 import { machine } from '../Platform/machine'
 import { liveTreeOf, mutableTarget, NOT_HELD } from '../Nexus/liveTree'
@@ -12 +13 @@ import { owningCollection } from '../Nexus/treePatch'
 import { dropDeparture } from '../Nexus/reorder'
 import { archivedSetIds } from '../Nexus/configReach'
 import { nexusPages } from '../Nexus/heldPages'
-import { returningCascade } from '../Nexus/settle'
+import { departingCascade, returningCascade } from '../Nexus/settle'
 import { liftSetAside } from '../Nexus/folderEntity'
+import type { NexusTree } from '../Nexus/tree'
 import type { MutateContext } from '../Nexus/mutate'
 import type { MutateReply, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
 import {
   contentPages,
   fileInto,
   originPagesOf,
-  originPathOf,
   type OpenBundle,
+  spendBundle,
 } from '../Bundles/bundle'
-import { gatherContentRecord } from '../Bundles/record'
-import { placeRecord } from '../Bundles/placement'
-import { refileLanded } from './refile'
+import { type BundleStore, bundleAddressOf, originPathOf } from '../Bundles/layout'
+import {
+  archivedRecord,
+  decodeRecord,
+  gatherContentRecord,
+  type RecordFile,
+} from '../Bundles/record'
+import { archiveFiling, placeRecord } from '../Bundles/placement'
+import { refileFiled, refileLanded } from './refile'
 
-/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs. */
+/** Link values and saved views naming what leaves stay where they are and resolve again on its restore, so nothing is stripped and no configuration pass runs; filed under another path than it stood under, what names it re-spells to that path. */
 export async function archiveOp(
   { root }: MutateContext,
   req: Extract<MutateRequest, { op: 'archive' }>,
@@ -39 +47 @@ export async function archiveOp(
   const store = archiveStoreOf(owningCollection(tree, req.path)?.id)
   if (!store)
     return fail('invalid-path', 'Only pages and Sets inside a Collection can be archived.')
-  const record = await gatherContentRecord(root, tree, req.kind, abs)
+  const { to, origin, record, at } = await filingOf(root, tree, req, abs, store)
   const lifted = req.kind === 'set' ? await liftSetAside(root, abs) : null
   if (lifted && !lifted.ok) return lifted
-  const bundle = await fileInto(root, store, abs, abs, record, req.leaf).catch(async (e) => {
+  const filed = await fileInto(root, to, origin, abs, record, at).catch(async (e) => {
     await lifted?.value.rollback()
     throw e
   })
   await dropDeparture(root, tree, req.kind, req.path)
-  return ok({ bundled: { bundlePath: relative(root, bundle) } })
+  if (req.kind === 'set' && req.at !== undefined) await refileFiled(root, filed.address, store.id)
+  const into = bundleAddressOf(root, join(root, filed.address))?.store
+  const cascade =
+    into && originPathOf(root, into, filed.landed) !== relative(root, abs)
+      ? await departingCascade(
+          root,
+          tree,
+          await originPagesOf(root, into, await contentPages(req.kind, filed.landed)),
+          titleFromPath(origin),
+        )
+      : undefined
+  return ok({ ...(cascade ? { cascade } : {}), bundled: { bundlePath: filed.address } })
+}
+
+/** Where an archive files the item: back at the Archive address `at` names, as `archiveFiling` re-roots it, with the record the request carries, when it's of the item's kind; else its own Collection's Archive from where it stands, recorded afresh. Under `name` when it's one its kind may take, by the walk's rule rather than `nameError`'s, since it's a name the item already held on disk. */
+async function filingOf(
+  root: string,
+  tree: NexusTree,
+  req: Extract<MutateRequest, { op: 'archive' }>,
+  abs: string,
+  store: BundleStore,
+): Promise<{ to: BundleStore; origin: string; record: RecordFile; at?: string }> {
+  const name =
+    req.name !== undefined &&
+    holdsName(req.name) &&
+    (req.kind === 'page'
+      ? isContentName(req.name)
+      : !hiddenFolder(req.name) && !isMarkdownFile(req.name))
+      ? req.name
+      : basename(abs)
+  const carried = req.record === undefined ? null : decodeRecord(req.record)
+  const filing =
+    req.at !== undefined &&
+    (carried?.entity === 'page' || carried?.entity === 'set') &&
+    carried.entity === req.kind
+      ? await archiveFiling(root, tree, carried, req.at)
+      : null
+  if (filing?.ok) {
+    const { into, at, folder, record } = filing.value
+    return {
+      to: into,
+      at,
+      origin: join(root, folder, name),
+      record: await archivedRecord(record, abs),
+    }
+  }
+  return {
+    to: store,
+    at: req.at,
+    origin: join(dirname(abs), name),
+    record: await gatherContentRecord(root, tree, req.kind, abs),
+  }
 }
 
 /** An archived page or Set returns by a plain move to the place it left, or to `destination`, with nothing reconciled or refilled, since every cascade kept it current; its own links keep naming its own pages, and path links naming where it lived follow it. */
@@ -77 +136 @@ export async function restoreArchived(
   await machine().mkdir(dirname(targetAbs))
   await relocate(artifact, targetAbs)
   await writeOrder?.()
-  await removeOwn(bundle.abs)
+  await spendBundle(root, bundle)
   const title = finalTitle ?? finalName
   const { cascade } = await returningCascade(root, tree, back, title, {
     entity: record.entity,
@@ -87 +146 @@ export async function restoreArchived(
   return ok({
     ...(cascade ? { cascade } : {}),
     ...(landedAs ? { landedAs } : {}),
+    undo: {
+      op: 'archive',
+      path: relative(root, targetAbs),
+      kind: held.entity,
+      at: relative(root, bundle.inner ? artifact : bundle.abs),
+      name: basename(artifact),
+      ...(bundle.inner ? {} : { record: held }),
+    },
   })
 }
 
```

##### Core/Archive/refile.ts

```/Core/Archive/refile.ts diff
@@ -1 +1 @@
-// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees and a restore.
+// Every archived record stays filed in the Archive of the Collection its origin sits in now, its trail current. One carry, `refileArchived`, serves each landing that moves a Set: the settle's comparison of trees, a restore, and an Undo filing a Set back into the Archive.
 // The open pass, `settleArchives`, re-files each record a Set moved while Pommora was closed left misfiled, and moves an Archive whose Collection exists nowhere into the Trash, recoverable.
 
-import { basename, join } from '../Paths/posix'
+import { join } from '../Paths/posix'
 import { isPlainObject } from '../Contract/validators'
 import { errText } from '../Contract/result'
 import { isContainerKind } from '../Nexus/entities'
@@ -18 +18 @@ import {
   collectionsElsewhere,
   listBundles,
   moveIntoStore,
+  openBundle,
 } from '../Bundles/bundle'
-import { collectionOf, originOf, patchRecord, type RecordFile, trailAbove } from '../Bundles/record'
+import {
+  collectionOf,
+  originOf,
+  patchRecord,
+  type RecordFile,
+  retrailed,
+  trailAbove,
+} from '../Bundles/record'
 import { ARCHIVE_DIR_REL, archiveDirRel } from '../Paths/nexusPaths'
 import { listEntries, listFilesRecursive } from '../Files/walk'
 
@@ -35 +43 @@ async function refile(
   const into = archiveStoreOf(to)
   if (!into) return
   const bundle = join(root, bundlePath)
-  if (from !== to) await moveIntoStore(root, bundle, into, { trail }, basename(bundle))
+  if (from !== to) await moveIntoStore(root, bundle, into, { trail })
   else if (!sameItems(stored, trail)) await patchRecord(bundle, () => ({ trail }))
 }
 
-/** Each record archived from within the Set `setId` takes the trail the Set gives it now, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored. */
+/** Each record archived from within the Set `setId` takes the trail the Set gives it now, `above` it, and `to`'s Archive when the Set now sits in another Collection. An origin the tree holds is placed by its current trail, and one it no longer holds by the ids its record stored below the Set. */
 async function refileArchived(
   root: string,
   setId: string,
   from: string,
   to: string,
   tree: NexusTree,
+  above = trailAbove(tree, setId),
 ): Promise<void> {
-  const above = trailAbove(tree, setId)
   if (!above) return
   for (const { bundlePath, origin, held } of await archivedWithin(root, setId, from, tree)) {
-    const below = origin.trail.slice(origin.trail.indexOf(setId) + 1)
-    await refile(root, bundlePath, origin.trail, held ?? [...above, setId, ...below], from, to)
+    const trail = held ?? retrailed(origin, [...above, setId])
+    await refile(root, bundlePath, origin.trail, trail, from, to)
   }
 }
 
@@ -78 +86 @@ export const refileLanded = (
     if (to) await refileArchived(root, record.id, from, to, tree)
   })
 
+/** The Undo's trigger: a Set filed back at `address` carries what was archived from within it out of `from`, the Archive of the Collection it stood in, into the Archive it was filed in, along the trail it was filed on, that Archive the same one or another. */
+export const refileFiled = (root: string, address: string, from: string): Promise<void> =>
+  carried(async () => {
+    const opened = await openBundle(root, join(root, address))
+    if (!opened.ok || opened.value.store.kind !== 'archive') return
+    const { record, store } = opened.value
+    const origin = originOf(record)
+    if (record.entity !== 'set' || !record.id || !origin) return
+    const above = [...origin.trail, origin.parent]
+    await refileArchived(root, record.id, from, store.id, await liveTreeOf(root), above)
+  })
+
 const isContainerNode = (v: unknown): v is CollectionNode | SetNode =>
   isPlainObject(v) && isContainerKind(v.kind)
 
```

##### Core/Bundles/BundleTable.tsx

```/Core/Bundles/BundleTable.tsx diff
@@ -0 +1 @@
+import { memo, type ReactNode, useMemo, useState } from 'react'
+import { Checkbox } from '@pommora/uix/Controls/Checkbox'
+import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
+import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
+import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
+import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
+import { DropOutline } from '@pommora/uix/Menus'
+import { Icon } from '@pommora/uix/Symbols'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
+import { RowRail } from '@pommora/uix/Table/RowRail'
+import { text } from '@pommora/uix/Theme'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { useStableApi } from '@pommora/uix/Utilities/stableApi'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import { propertyTypeIconName } from '../Properties/typeDisplay'
+import { personalizationOf } from '../Session/configSlice'
+import { useSession } from '../Session/store'
+import type { Personalization } from '../Settings/personalization'
+import { COLUMN_LAYOUT } from '../Views/Table/useColumns'
+import { crumbSegments, type useBundleBrowser } from './browser'
+import type { BundleRow } from './rows'
+import './bundle-table.css'
+
+type Browser = ReturnType<typeof useBundleBrowser>
+
+/** TableView's row as it draws, measured live: the cell's padding around a body line its inline title stands a little taller than, and the hairline between rows. */
+const ROW_H = 29.75
+
+/** The table's grid in its body type, each skin setting its own heading and rows in it: the title track, at least TableView's title width, and the date track, the date column's measured width inside the cell's padding; narrower than both, it scrolls sideways. */
+export function BundleTable({
+  date: { width },
+  children,
+}: {
+  date: Browser['date']
+  children: ReactNode
+}): React.JSX.Element {
+  const track =
+    width === null
+      ? `${COLUMN_LAYOUT.dateTime.width}px`
+      : `calc(${width}px + 2 * var(--cell-padding-x))`
+  const style = {
+    '--cols': `minmax(${COLUMN_LAYOUT.title.width}px, 1fr) ${track}`,
+    minWidth: `calc(${COLUMN_LAYOUT.title.width}px + ${track})`,
+  } as React.CSSProperties
+  return (
+    <div className={cx('table-grid', text.body.standard)} style={style}>
+      {children}
+    </div>
+  )
+}
+
+/** A store's date heading: `label` over the column's widest date, drawn unseen in the rows' type, so the column measures whichever is wider; a right-click picks the date's style. */
+export function DateHeading({
+  date,
+  label,
+  className,
+}: {
+  date: Browser['date']
+  label: ReactNode
+  className: string
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
+    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
+      <span ref={date.measureRef} className="col-measure">
+        {label}
+        <span className={text.body.standard} aria-hidden>
+          {date.sample}
+        </span>
+      </span>
+    </div>
+  )
+}
+
+type RowApi = Pick<Browser, 'toggle' | 'rowClick' | 'openMenu'> & {
+  focus: (address: string) => void
+}
+
+/** A store's rows under its skin's heading, drawn in a window of `scrollEl` that keeps the row focus last stood on: one Tab stop whose arrows step between rows, whose Space toggles a row's check and whose Enter acts as a keyboard's click, each row a tree item that discloses, checks, and opens through the browser. */
+export function BundleRows({
+  browser: { visible, checked, picked, date, toggle, rowClick, openMenu },
+  scrollEl,
+}: {
+  browser: Pick<
+    Browser,
+    'visible' | 'checked' | 'picked' | 'date' | 'toggle' | 'rowClick' | 'openMenu'
+  >
+  scrollEl: HTMLElement | null
+}): React.JSX.Element {
+  const icons = useSession((s) => personalizationOf(s).defaultIcons)
+  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
+  const [focused, setFocused] = useState<string | null>(null)
+  const keep = useMemo(() => {
+    const at = visible.findIndex((t) => t.row.bundlePath === focused)
+    return at < 0 ? null : at
+  }, [visible, focused])
+  const { rows: slots, height } = useVirtualRows(
+    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl, keep },
+    [],
+  )
+  const api = useStableApi({ toggle, rowClick, openMenu, focus: setFocused })
+  return (
+    <LineZone {...lineList({ locked: true, commit: () => {}, label: () => '', watch: [] })}>
+      <div ref={setListEl} className="bundle-rows" style={{ height }}>
+        {slots.map(({ index, start }) => {
+          const { row, depth, open } = visible[index]
+          return (
+            <BundleRowView
+              key={row.bundlePath}
+              row={row}
+              depth={depth}
+              open={open}
+              start={start}
+              lead={index === 0}
+              checked={checked.has(row.bundlePath)}
+              revealed={picked.length > 0}
+              when={date.when(row.storedAt)}
+              icons={icons}
+              api={api}
+            />
+          )
+        })}
+      </div>
+    </LineZone>
+  )
+}
+
+/** A row's glyph: a property's by its type, any other item's own ahead of its kind's. */
+const rowIcon = (row: BundleRow, icons: Personalization['defaultIcons']): string =>
+  row.kind === 'property'
+    ? row.propertyType
+      ? propertyTypeIconName(row.propertyType)
+      : 'tag'
+    : entityIcon(row.kind, row.icon, icons)
+
+const BundleRowView = memo(function BundleRowView({
+  row,
+  depth,
+  open,
+  start,
+  lead,
+  checked,
+  revealed,
+  when,
+  icons,
+  api,
+}: {
+  row: BundleRow
+  depth: number
+  open: boolean | null
+  start: number
+  lead: boolean
+  checked: boolean
+  revealed: boolean
+  when: string
+  icons: Personalization['defaultIcons']
+  api: RowApi
+}): React.JSX.Element {
+  const chevron = open === null ? null : <DropOutline open={open} />
+  return (
+    <LineRow
+      id={row.bundlePath}
+      open={() => api.rowClick(row, 0)}
+      space={() => api.toggle(row.bundlePath)}
+      className={cx('data-row', lead && 'row-lead')}
+      data-reveal-host={revealed ? 'on' : ''}
+      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
+      role="treeitem"
+      aria-expanded={open ?? undefined}
+      onFocus={() => api.focus(row.bundlePath)}
+      onClick={(e) => {
+        if (!isSecondaryClick(e)) api.rowClick(row, e.detail)
+      }}
+      onContextMenu={(e) => {
+        e.preventDefault()
+        void api.openMenu(row)
+      }}
+    >
+      <div className="data-cell cell-lead">
+        <RowRail />
+        <span className={cx('row-check', revealTarget)}>
+          <Checkbox
+            size="compact"
+            state={checked}
+            tabIndex={-1}
+            onChange={() => api.toggle(row.bundlePath)}
+            ariaLabel={`Select ${row.title}`}
+          />
+        </span>
+        <span className="bundle-title" style={{ marginLeft: rowIndent(depth) }}>
+          {depth > 0 && chevron && <span className="row-chevron">{chevron}</span>}
+          <span className={cx(overScrollLabel, 'cell-title')}>
+            <Icon name={rowIcon(row, icons)} size="body" />
+            <span className={cx('cell-title-text', open !== null && text.body.emphasized)}>
+              {row.title}
+            </span>
+          </span>
+          {depth === 0 && chevron}
+        </span>
+        <NavTrail
+          segments={crumbSegments(row.crumbs, icons)}
+          iconSize="control"
+          className={cx('bundle-trail', row.historical && historical)}
+        />
+        {row.partial && (
+          <Icon
+            name="triangle-alert"
+            size="body"
+            role="img"
+            aria-label="Recorded Partly"
+            className="bundle-partial"
+          />
+        )}
+      </div>
+      <div className="data-cell bundle-date">{when}</div>
+    </LineRow>
+  )
+})
```

##### Core/Bundles/DateHeading.tsx

```/Core/Bundles/DateHeading.tsx diff
@@ -1 +0 @@
-import type { ReactNode } from 'react'
-import { cx } from '@pommora/uix/Utilities/cx'
-import type { useBundleBrowser } from './browser'
-
-/** A store's date heading: `label` over the column's widest date in the rows' type, drawn unseen, so the column measures whichever is wider; a right-click picks the date's style. */
-export function DateHeading({
-  date,
-  label,
-  className,
-  sampleClass,
-}: {
-  date: ReturnType<typeof useBundleBrowser>['date']
-  label: ReactNode
-  className: string
-  sampleClass: string
-}): React.JSX.Element {
-  return (
-    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
-    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
-      <span ref={date.measureRef} className="col-measure">
-        {label}
-        <span className={sampleClass} aria-hidden>
-          {date.sample}
-        </span>
-      </span>
-    </div>
-  )
-}
```

##### Core/Bundles/browser.ts

```/Core/Bundles/browser.ts diff
@@ -6 +6 @@ import { entityIcon } from '../Assets/entityIconPolicy'
 import {
   askEmptyTrash,
   askTrashing,
-  confirmDelete,
+  offerDeleted,
   offerUndo,
   spendUndo,
 } from '../Interface/Confirm/confirmations'
-import { countPhrase } from '../Nexus/entities'
-import {
-  notifyOutcome,
-  notifyReport,
-  unrestoredLine,
-} from '../Interface/Notifications/notifications'
-import type { RestoreDestination } from '../Nexus/mutateRequest'
+import { countPhrase, isContainerKind } from '../Nexus/entities'
+import { notifyOutcome, unrestoredLine } from '../Interface/Notifications/notifications'
+import type { MutateOutcome, MutateRequest, RestoreDestination } from '../Nexus/mutateRequest'
 import { nodesByIdOf } from '../Nexus/treeIndex'
 import { matches, matchQuery } from '../Paths/caseFold'
-import { basename } from '../Paths/posix'
+import { basename, isAtOrUnder, relDirname } from '../Paths/posix'
 import { formatDate } from '../Properties/formatValue'
 import {
   type DateStyle,
@@ -31 +27 @@ import {
 import { parseStyleAction, styleMenuItems } from '../Actions/columnMenu'
 import { containerTargets, contextTargets } from '../Actions/destinationTree'
 import { popMenu } from '../Actions/menuActions'
-import { destinationRows } from '../Actions/pageMenu'
+import { destinationRows, type MoveTarget } from '../Actions/pageMenu'
 import { restoreMenuItems } from '../Actions/restoreMenu'
 import { useNexusForms } from '../Views/Host/useColumnStyles'
 import { useSession } from '../Session/store'
@@ -39 +35 @@ import { personalizationOf } from '../Session/configSlice'
 import { storesChanged } from '../Session/nexusSlice'
 import { dialer } from '../Platform/dialer'
 import type { Personalization } from '../Settings/personalization'
-import type { BundleStore } from './bundle'
+import type { BundleStore } from './layout'
 import type { BundleCrumb, BundleRow } from './rows'
 
 const steppedTo = (title: string, landedAs: string): string => `“${title}” as “${landedAs}”`
@@ -61 +57 @@ export const crumbSegments = (
   }))
 
 /** What the Archive stores: a page or a Set. */
-export const archivedKind = (row: BundleRow): 'page' | 'set' =>
-  row.kind === 'set' ? 'set' : 'page'
+const archivedKind = (row: BundleRow): 'page' | 'set' => (row.kind === 'set' ? 'set' : 'page')
+
+/** A row as a browser shows it: how deep it sits, and whether it's open, null for a row with nothing to disclose. */
+export interface TreeRow {
+  row: BundleRow
+  depth: number
+  open: boolean | null
+}
+
+/** Each open container's inner rows, null while its reply is pending. */
+type OpenRows = ReadonlyMap<string, readonly BundleRow[] | null>
+
+/** The rows in view: each top row, and beneath each open one the inner rows it lists, in order. */
+export function treeRows(rows: readonly BundleRow[], open: OpenRows): TreeRow[] {
+  const out: TreeRow[] = []
+  const walk = (row: BundleRow, depth: number): void => {
+    const opens = isContainerKind(row.kind)
+    const inner = opens ? open.get(row.bundlePath) : undefined
+    out.push({ row, depth, open: opens ? inner !== undefined : null })
+    for (const child of inner ?? []) walk(child, depth + 1)
+  }
+  for (const row of rows) walk(row, 0)
+  return out
+}
+
+/** A batch acts on each item once: a row inside another the batch holds goes with it. */
+export const outermostOf = (rows: readonly BundleRow[]): BundleRow[] =>
+  rows.filter((r) => !rows.some((o) => o !== r && isAtOrUnder(r.bundlePath, o.bundlePath)))
+
+/** The open rows a tree over `rows` still reaches; one inside a closed or gone row goes with it. */
+const reachedOver = (rows: readonly BundleRow[], open: OpenRows): OpenRows => {
+  const reached = new Set(treeRows(rows, open).map((t) => t.row.bundlePath))
+  return new Map([...open].filter(([address]) => reached.has(address)))
+}
+
+/** The checks a listing keeps: a listed row's, and one inside a closed or pending container, whose contents aren't loaded to say otherwise. */
+function keepsCheck(rows: readonly BundleRow[], open: OpenRows): (address: string) => boolean {
+  const listed = new Set(
+    [...rows, ...[...open.values()].flatMap((v) => v ?? [])].map((r) => r.bundlePath),
+  )
+  return (address) => {
+    if (listed.has(address)) return true
+    for (let at = relDirname(address); at; at = relDirname(at))
+      if (listed.has(at)) return !open.get(at)
+    return false
+  }
+}
 
 const ARCHIVE_UNDO: RestoreDestination = { kind: 'archive' }
 
-type BatchOp = 'restore' | 'emptyBundle' | 'delete'
+type BundleOp = 'restore' | 'emptyBundle' | 'delete'
+
+/** What an op sends for a row: an Archive delete its path and kind, a restore or an empty its bundle. */
+const requestOf = (
+  row: BundleRow,
+  op: BundleOp,
+  destination?: RestoreDestination,
+): MutateRequest =>
+  op === 'delete'
+    ? { op, path: row.bundlePath, kind: archivedKind(row) }
+    : { op, bundlePath: row.bundlePath, ...(destination ? { destination } : {}) }
+
+/** Where a homeless row can be sent: a Space to a Context, anything else into a container. */
+type DestinationKind = Extract<RestoreDestination, { id: string }>['kind']
+
+const destinationKind = (row: BundleRow): DestinationKind =>
+  row.kind === 'space' ? 'context' : 'container'
 
-/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
-const rearchive = (rows: BundleRow[]) => async (): Promise<void> => {
-  for (const row of rows) {
+const destinationTargets = (kind: DestinationKind): MoveTarget[] => {
+  const { tree } = useSession.getState()
+  switch (kind) {
+    case 'context':
+      return contextTargets(tree)
+    case 'container':
+      return containerTargets(tree)
+  }
+}
+
+/** The one ask of where a kind's rows go, answering null when dismissed. */
+async function askDestination(kind: DestinationKind): Promise<RestoreDestination | null> {
+  const id = await popMenu(destinationRows(destinationTargets(kind), (t) => t.id))
+  return id ? { kind, id } : null
+}
+
+/** A restored row and the archive request its reply says takes the restore back. */
+type Undone = { row: BundleRow; undo: Extract<MutateRequest, { op: 'archive' }> }
+
+/** The row with the archive request its reply carries, when it carries one. */
+const undoneOf = (row: BundleRow, { undo }: MutateOutcome): Undone[] =>
+  undo?.op === 'archive' ? [{ row, undo }] : []
+
+/** A restore from the Archive undoes by sending each reply's own request, the item found by id so it follows a rename made since, under that new name once it has one. */
+const rearchive = (undone: Undone[]) => async (): Promise<void> => {
+  for (const { row, undo } of undone) {
     const { tree, mutate } = useSession.getState()
     const id = row.stored?.id
     if (!id || !tree) continue
     const path = nodesByIdOf(tree).get(id)?.path
     if (path)
-      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
+      await mutate({
+        ...undo,
+        path,
+        ...(basename(path) !== basename(undo.path) ? { name: basename(path) } : {}),
+      })
   }
 }
 
@@ -145 +229 @@ function useDateColumn(key: DateKey): {
   }
 }
 
-/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, for one row and for a batch, and what a restore's and a delete's Undo do. */
+/** What the Trash and the Archive do differently under one browser: the date column's setting, what a delete sends and how it asks, and what a restore's and a delete's Undo do. */
 function rulesOf(kind: BundleStore['kind']): {
   dateKey: DateKey
   deleteOp: 'emptyBundle' | 'delete'
-  askBatch: (targets: BundleRow[]) => Promise<boolean>
-  deleteOne: (row: BundleRow) => Promise<boolean>
-  restoreUndo?: (rows: BundleRow[]) => () => Promise<void>
+  askDelete: (targets: BundleRow[]) => Promise<boolean>
+  restoreUndo?: (undone: Undone[]) => () => Promise<void>
   deleteUndo?: RestoreDestination
 } {
   switch (kind) {
@@ -159 +242 @@ function rulesOf(kind: BundleStore['kind']): {
       return {
         dateKey: 'trashColumnStyle',
         deleteOp: 'emptyBundle',
-        askBatch: askEmptyTrash,
-        deleteOne: async (row) =>
-          (await askEmptyTrash([row])) &&
-          (await useSession
-            .getState()
-            .mutate({ op: 'emptyBundle', bundlePath: row.bundlePath })) !== null,
+        askDelete: askEmptyTrash,
       }
     case 'archive':
       return {
         dateKey: 'archiveColumnStyle',
         deleteOp: 'delete',
-        askBatch: askTrashing,
-        deleteOne: (row) =>
-          confirmDelete({
-            path: row.bundlePath,
-            kind: archivedKind(row),
-            title: row.title,
-            undoTo: ARCHIVE_UNDO,
-          }),
+        askDelete: askTrashing,
         restoreUndo: rearchive,
         deleteUndo: ARCHIVE_UNDO,
       }
@@ -186 +257 @@ function rulesOf(kind: BundleStore['kind']): {
 
 type Listing = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; rows: BundleRow[] }
 
-/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing; the checked set, and the checked rows in view; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
+/** A store's browser, narrowed `within` a top-level Set when given: its rows, listed again on each change while shown and on each showing, as a tree whose open map holds each open container's inner rows, asked for on opening and again on each listing; the checked set, kept across a container's collapsing, and the outermost checked rows in view; `rowClick`, a row's one click intent, opening a page through `open` when given; Restore and Delete, run by the right-click menu over a row or the checked rows in view and by the bar over the checked rows; and its date column. */
 export function useBundleBrowser(
   store: BundleStore,
-  { query, shown, within }: { query: string; shown: boolean; within?: string },
+  {
+    query,
+    shown,
+    within,
+    open: openPage,
+  }: { query: string; shown: boolean; within?: string; open?: (row: BundleRow) => void },
 ): {
   listing: Listing
-  visible: BundleRow[]
+  visible: TreeRow[]
+  found: number
   checked: ReadonlySet<string>
   picked: BundleRow[]
   toggle: (bundlePath: string) => void
+  rowClick: (row: BundleRow, detail: number) => void
   openMenu: (row: BundleRow) => Promise<void>
   date: ReturnType<typeof useDateColumn>
   restore: (targets: BundleRow[]) => Promise<void>
@@ -208 +286 @@ export function useBundleBrowser(
   const finishOwed = useSession((s) => s.finishOwed)
   const [listing, setListing] = useState<Listing>({ status: 'loading' })
   const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
+  const [open, setOpen] = useState<OpenRows>(new Map())
+
+  /** The open map a reply lands on, read as it lands rather than as it was asked, so a late reply builds on what stands by then. */
+  const held = useRef<OpenRows>(new Map())
+  const openTo = (next: OpenRows): void => {
+    held.current = next
+    setOpen(next)
+  }
 
   // Keyed on the store's fields rather than the object, so a caller may pass a fresh literal; only the latest ask's reply lands, since replies can arrive out of order.
   const asks = useRef(0)
@@ -219 +305 @@ export function useBundleBrowser(
       setListing({ status: 'failed' })
       return
     }
-    setListing({ status: 'ready', rows: res.value })
-    const live = new Set(res.value.map((r) => r.bundlePath))
-    setChecked((prev) => retained(prev, live))
+    const rows = res.value
+    const addresses = [...held.current.keys()]
+    const inner = addresses.length > 0 ? await dialer().ask('bundles:children', addresses) : null
+    if (ask !== asks.current) return
+    const replied = new Map<string, readonly BundleRow[]>(
+      inner?.ok ? addresses.map((address, i) => [address, inner.value[i]]) : [],
+    )
+    const next = reachedOver(
+      rows,
+      new Map([...held.current].map(([address, v]) => [address, replied.get(address) ?? v])),
+    )
+    setListing({ status: 'ready', rows })
+    openTo(next)
+    setChecked((prev) => retained(prev, keepsCheck(rows, next)))
   }, [store.kind, store.kind === 'archive' ? store.id : null, within])
 
   // A parked browser stays mounted, so it lists again on its next showing rather than on every change behind another tab.
@@ -231 +328 @@ export function useBundleBrowser(
     return storesChanged.subscribe(() => void refresh())
   }, [refresh, shown])
 
-  const visible = useMemo(
+  const top = useMemo(
     () => (listing.status === 'ready' ? filterRows(listing.rows, query) : []),
     [listing, query],
   )
-  const picked = useMemo(() => checkedIn(checked, visible, (r) => r.bundlePath), [checked, visible])
+  const visible = useMemo(() => treeRows(top, open), [top, open])
+  const rowsInView = useMemo(() => visible.map((t) => t.row), [visible])
+  const picked = useMemo(
+    () => outermostOf(checkedIn(checked, rowsInView, (r) => r.bundlePath)),
+    [checked, rowsInView],
+  )
   const toggle = (bundlePath: string): void => setChecked((prev) => toggled(prev, bundlePath))
 
+  /** Opens a closed container at once, its rows filled in when the host answers while it's still pending, or closes an open one with every open row inside it. A failed ask leaves it pending for the next listing to ask again, and an address the host can't list opens empty while its row lists. */
+  const disclose = async (address: string): Promise<void> => {
+    const was = held.current
+    if (was.has(address))
+      return openTo(new Map([...was].filter(([at]) => !isAtOrUnder(at, address))))
+    openTo(new Map(was).set(address, null))
+    const res = await dialer().ask('bundles:children', [address])
+    if (res.ok && held.current.get(address) === null)
+      openTo(new Map(held.current).set(address, res.value[0]))
+  }
+
+  /** A container's click discloses it; a page's checks it, and its double-click, or a click with no count where pages open, leaves it checked and opens it. */
+  const rowClick = (row: BundleRow, detail: number): void => {
+    const address = row.bundlePath
+    if (isContainerKind(row.kind)) {
+      if (detail < 2) void disclose(address)
+      return
+    }
+    if (detail === 2 || (detail === 0 && openPage)) {
+      setChecked((prev) => (prev.has(address) ? prev : toggled(prev, address)))
+      openPage?.(row)
+    } else if (detail < 2) toggle(address)
+  }
+
   // One action in flight: a press before it settles is dropped, rather than acting on a row the first already moved.
   const busy = useRef(false)
   const flight = async (act: () => Promise<void>): Promise<void> => {
@@ -250 +376 @@ export function useBundleBrowser(
     }
   }
 
-  const placesFor = (row: BundleRow) => {
-    const { tree } = useSession.getState()
-    return row.kind === 'space'
-      ? { kind: 'context' as const, targets: contextTargets(tree) }
-      : { kind: 'container' as const, targets: containerTargets(tree) }
-  }
-
   /** A row whose place is gone asks where to go first, unless the menu's submenu already chose. */
   const restoreOne = async (row: BundleRow, destination?: RestoreDestination): Promise<void> => {
-    let to = destination
-    if (!to && !row.homeResolves) {
-      const places = placesFor(row)
-      const id = await popMenu(destinationRows(places.targets, (t) => t.id))
-      if (!id) return
-      to = { kind: places.kind, id }
-    }
-    const done = await mutate({
-      op: 'restore',
-      bundlePath: row.bundlePath,
-      ...(to ? { destination: to } : {}),
-    })
+    const to =
+      destination ?? (row.homeResolves ? undefined : await askDestination(destinationKind(row)))
+    if (to === null) return
+    const done = await mutate(requestOf(row, 'restore', to))
+    if (!done) return
+    spendUndo(row.bundlePath)
+    const undone = undoneOf(row, done)
+    // The notice replaces the slice's, so it carries the reply's lines and its Try Again.
+    notifyOutcome(
+      `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
+      undefined,
+      [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
+      undone.length > 0 ? rules.restoreUndo?.(undone) : undefined,
+      done.cascade?.owed ? finishOwed : undefined,
+    )
+  }
+
+  const deleteOne = async (row: BundleRow): Promise<void> => {
+    if (!(await rules.askDelete([row]))) return
+    const done = await mutate(requestOf(row, rules.deleteOp))
     if (!done) return
     spendUndo(row.bundlePath)
-    // A restore the store can undo always reports, since its notice carries the Undo; the Trash's reports a step aside alone. The notice replaces the slice's, so it carries the reply's lines and its Try Again.
-    if (done.landedAs || rules.restoreUndo)
-      notifyOutcome(
-        `Restored ${done.landedAs ? steppedTo(row.title, done.landedAs) : `“${row.title}”`}`,
-        undefined,
-        [done.unrestored !== undefined && unrestoredLine(done.unrestored), done.cascade?.warning],
-        rules.restoreUndo?.([row]),
-        done.cascade?.owed ? finishOwed : undefined,
-      )
+    offerDeleted(row.title, done, rules.deleteUndo)
   }
 
   /** Answers null when a Nexus switch stopped it, as the slice's `mutate` drops a held op: the paths left belong to the Nexus it left, so the batch reports nothing. */
   const many = async (
     targets: BundleRow[],
-    op: BatchOp,
+    op: BundleOp,
+    destinationOf?: (row: BundleRow) => RestoreDestination | undefined,
   ): Promise<{
     done: BundleRow[]
     refused: BundleRow[]
@@ -295 +415 @@ export function useBundleBrowser(
     warnings: string[]
     renamed: string[]
     bundled: string[]
+    undone: Undone[]
     owed: boolean
   } | null> => {
     const done: BundleRow[] = []
@@ -303 +424 @@ export function useBundleBrowser(
     const warnings = new Set<string>()
     const renamed: string[] = []
     const bundled: string[] = []
+    const undone: Undone[] = []
     let owed = false
     const switched = (): boolean => useSession.getState().tree?.nexus.id !== nexusId
     for (const row of targets) {
       if (switched()) break
-      const res = await mutate(
-        op === 'delete'
-          ? { op, path: row.bundlePath, kind: archivedKind(row) }
-          : { op, bundlePath: row.bundlePath },
-        { quiet: true },
-      )
+      const to = destinationOf?.(row)
+      const res = await mutate(requestOf(row, op, to), { quiet: true })
       ;(res ? done : refused).push(row)
       if (!res) continue
       spendUndo(row.bundlePath)
@@ -321 +439 @@ export function useBundleBrowser(
       owed ||= !!res.cascade?.owed
       if (res.landedAs) renamed.push(steppedTo(row.title, res.landedAs))
       if (res.bundled) bundled.push(res.bundled.bundlePath)
+      undone.push(...undoneOf(row, res))
     }
     storesChanged.emit()
     return switched()
       ? null
-      : { done, refused, unrestored, warnings: [...warnings], renamed, bundled, owed }
+      : { done, refused, unrestored, warnings: [...warnings], renamed, bundled, undone, owed }
   }
 
   const restoreBatch = async (targets: BundleRow[]): Promise<void> => {
-    const addressable = targets.filter((r) => r.homeResolves)
-    const homeless = targets.filter((r) => !r.homeResolves)
-    const nowhere = `${countPhrase(homeless)} had nowhere to go — restore those one at a time to choose where.`
-    if (addressable.length === 0) return notifyReport(nowhere, true)
-    const ran = await many(addressable, 'restore')
+    // What has no home left asks once where it goes, one ask per kind of destination, and a dismissed ask restores nothing.
+    const to = new Map<DestinationKind, RestoreDestination>()
+    for (const kind of new Set(targets.filter((r) => !r.homeResolves).map(destinationKind))) {
+      const destination = await askDestination(kind)
+      if (!destination) return
+      to.set(kind, destination)
+    }
+    const ran = await many(targets, 'restore', (row) =>
+      row.homeResolves ? undefined : to.get(destinationKind(row)),
+    )
     if (!ran) return
-    const { done, refused, unrestored, warnings, renamed, owed } = ran
+    const { done, refused, unrestored, warnings, renamed, undone, owed } = ran
     notifyOutcome(
       `Restored ${countPhrase(done)}`,
       renamed.length > 1 ? `${renamed.length} Renamed` : renamed[0],
       [
-        homeless.length > 0 && nowhere,
         refused.length > 0 && `${countPhrase(refused)} couldn’t be restored.`,
         unrestored.length > 0 && unrestoredLine(unrestored),
         ...warnings,
       ],
-      done.length > 0 ? rules.restoreUndo?.(done) : undefined,
+      undone.length > 0 ? rules.restoreUndo?.(undone) : undefined,
       owed ? finishOwed : undefined,
     )
   }
 
   const deleteBatch = async (targets: BundleRow[]): Promise<void> => {
-    if (!(await rules.askBatch(targets))) return
+    if (!(await rules.askDelete(targets))) return
     const ran = await many(targets, rules.deleteOp)
     if (!ran) return
     const { done, refused, warnings, bundled, owed } = ran
@@ -380 +503 @@ export function useBundleBrowser(
   const remove = (targets: BundleRow[]): Promise<void> =>
     flight(async () => {
       if (targets.length > 1) return deleteBatch(targets)
-      if (targets.length && (await rules.deleteOne(targets[0]))) spendUndo(targets[0].bundlePath)
+      if (targets.length) return deleteOne(targets[0])
     })
 
   const openMenu = async (row: BundleRow): Promise<void> => {
-    const targets = actedOn(checked, visible, row, (r) => r.bundlePath)
+    const targets = outermostOf(actedOn(checked, rowsInView, row, (r) => r.bundlePath))
     const batch = targets.length > 1
-    const places = !batch && !row.homeResolves ? placesFor(row) : null
+    const [one] = targets
+    const kind = !batch && !one.homeResolves ? destinationKind(one) : null
     const action = await popMenu(
-      restoreMenuItems({ batch, ...(places ? { destinations: places.targets } : {}) }),
+      restoreMenuItems({ batch, ...(kind ? { destinations: destinationTargets(kind) } : {}) }),
     )
     if (!action) return
-    if (action.startsWith('restoreTo:') && places) {
+    if (action.startsWith('restoreTo:') && kind) {
       const id = action.slice('restoreTo:'.length)
-      return flight(() => restoreOne(row, { kind: places.kind, id }))
+      return flight(() => restoreOne(one, { kind, id }))
     }
     switch (action) {
       case 'restore':
@@ -403 +527 @@ export function useBundleBrowser(
     }
   }
 
-  return { listing, visible, checked, picked, toggle, openMenu, date, restore, remove }
+  return {
+    listing,
+    visible,
+    found: top.length,
+    checked,
+    picked,
+    toggle,
+    rowClick,
+    openMenu,
+    date,
+    restore,
+    remove,
+  }
 }
```

##### Core/Bundles/bundle-table.css

```/Core/Bundles/bundle-table.css diff
@@ -0 +1 @@
+/* The bundle table's own layout over the table vocabulary: its rows in a virtual window, each title line with its chevron, the trail it left at its right, its partial mark, and its date centered in its column. */
+.bundle-rows {
+  position: relative;
+}
+.bundle-rows > .data-row {
+  position: absolute;
+  inset-inline: 0;
+}
+.bundle-rows .data-cell {
+  display: flex;
+  align-items: center;
+  gap: 8px; /* KNOB — the title from its trail */
+}
+/* The box a nested row's chevron takes its rail slot against. */
+.bundle-title {
+  position: relative;
+  display: flex;
+  align-items: center;
+  gap: var(--cell-icon-gap);
+  min-width: 0;
+  margin-right: auto;
+}
+.bundle-trail {
+  flex: 0 1 auto;
+  min-width: 0;
+  max-width: 55%;
+}
+.bundle-partial {
+  flex: none;
+  color: var(--label-secondary);
+}
+.bundle-date {
+  justify-content: center;
+}
```

##### Core/Bundles/bundle.ts

```/Core/Bundles/bundle.ts diff
@@ -1 +1 @@
-import { basename, dirname, join, relative } from '../Paths/posix'
+import {
+  basename,
+  dirname,
+  isAtOrUnder,
+  isMarkdownFile,
+  join,
+  relative,
+  titleFromPath,
+} from '../Paths/posix'
+import { sidecarPath } from '../Paths/paths'
 import { escapes } from '../Paths/pathSafety'
-import { hiddenName } from '../Paths/exclusion'
+import { hiddenName, outsideContent, type WatchScope } from '../Paths/exclusion'
 import { archiveStoreOf, holdsName } from '../Paths/names'
-import {
-  type ArchiveStore,
-  archiveDirRel,
-  archivedCollectionIdOf,
-  NEXUS_DIR,
-  TRASH_DIR,
-} from '../Paths/nexusPaths'
+import { NEXUS_DIR, TRASH_DIR } from '../Paths/nexusPaths'
 import { machine } from '../Platform/machine'
-import { fault, ok, type Result } from '../Contract/result'
-import { type ConnPage, connPage } from '../Connections/pageIndex'
+import { fail, fault, ok, type Result } from '../Contract/result'
+import { isPlainObject } from '../Contract/validators'
+import { buildPageIndex, type ConnPage, connPage } from '../Connections/pageIndex'
+import { linkedPage } from '../Connections/linkValue'
 import { stampedIdOf } from '../Files/pageFile'
 import { sidecarId } from '../Files/sidecar'
-import { listEntries, listMarkdownFiles } from '../Files/walk'
-import { relocate, removeOwn } from '../Files/atomicWrite'
+import { isContentFile, listEntries, listMarkdownFiles } from '../Files/walk'
+import { pathExists, readJsonObject, relocate, removeOwn } from '../Files/atomicWrite'
+import { asStringArray } from '../Nexus/coerce'
+import { resolveOrder } from '../Nexus/order'
+import { isContainerKind } from '../Nexus/entities'
+import { distinct, editNote, readNotes } from '../Nexus/owed'
 import type { NexusTree } from '../Nexus/tree'
 import {
+  identityOf,
   originOf,
   originWithin,
   type RawRecord,
+  patchRecord,
   type RecordFile,
   readRawRecord,
   readRecord,
   trailAbove,
   writeRecord,
 } from './record'
-
-export type BundleStore = { kind: 'trash' } | ArchiveStore
-
-export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
-  switch (store.kind) {
-    case 'trash':
-      return { dir: TRASH_DIR, suffix: '.deleted' }
-    case 'archive':
-      return { dir: archiveDirRel(store.id), suffix: '.archived' }
-  }
-}
-
-export function storeOf(root: string, bundleAbs: string): BundleStore | null {
-  const rel = relative(root, bundleAbs)
-  const id = archivedCollectionIdOf(rel)
-  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
-  const { dir, suffix } = layoutOf(store)
-  return rel.startsWith(`${dir}/`) && rel.endsWith(suffix) ? store : null
-}
-
-export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')
-
-const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
-
-export function storedAtOf(bundlePath: string): number | null {
-  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
-  if (!m) return null
-  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
-  return Number.isNaN(t) ? null : t
-}
-
-export const stampedLeaf = (stamp: string, n: number, base: string): string =>
-  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`
+import {
+  type BundleStore,
+  bundleAddressOf,
+  fileStamp,
+  layoutOf,
+  originPathOf,
+  stampedLeaf,
+} from './layout'
 
 /** A store reads as a shadow of the nexus, so a stored item shows where it lived. A path that isn't under the root has no chain to mirror, and following its `..` would write outside the store entirely — it lands flat instead. */
 export async function chainDir(
@@ -74 +60 @@ export async function chainDir(
   return dir
 }
 
-/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name, stamped, ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
+/** `leaf` asks for one bundle name back, tried only when the source could have been minted under it: one name ending in the source's own; a fresh stamp answers anything else, and a leaf something holds. */
 export async function mintBundle(
   root: string,
   store: BundleStore,
@@ -83 +69 @@ export async function mintBundle(
 ): Promise<string> {
   const dir = await chainDir(root, store, absSource)
   const base = `${basename(absSource)}${layoutOf(store).suffix}`
-  const own =
-    leaf !== undefined && holdsName(leaf) && storedAtOf(leaf) !== null && leaf.endsWith(`__${base}`)
+  const own = leaf !== undefined && holdsName(leaf) && leaf.endsWith(`__${base}`)
   if (own && (await machine().mkdir(join(dir, leaf))) === 'created') return join(dir, leaf)
   const stamp = fileStamp()
   for (let n = 0; ; n++) {
@@ -93 +78 @@ export async function mintBundle(
   }
 }
 
-/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix stays in the path. */
-export function originPathOf(root: string, store: BundleStore, file: string): string {
-  const { dir, suffix } = layoutOf(store)
-  const segs = relative(join(root, dir), file).split('/')
-  const bundle = segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
-  return segs.filter((_, i) => i !== bundle).join('/')
-}
-
 export async function bundleArtifact(bundleDir: string): Promise<string | null> {
   const found = (await listEntries(bundleDir)).filter((e) => !hiddenName(e.name))
   return found.length === 1 ? join(bundleDir, found[0].name) : null
 }
 
-/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
+/** Files `artifact` back at `at`, the address it held, under its origin's name: into the folder it sat in while that folder still stands, in a store of `to`'s kind since `at` arrives from the interface, and holds nothing of its name, else into a bundle minted in `to` for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle. A failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
 export async function fileInto(
   root: string,
   to: BundleStore,
   origin: string,
   artifact: string,
   record: RecordFile | RawRecord,
-  leaf?: string,
-): Promise<string> {
-  const bundle = await mintBundle(root, to, origin, leaf)
+  at?: string,
+): Promise<{ address: string; landed: string }> {
+  const held = at === undefined ? null : bundleAddressOf(root, join(root, at))
+  if (held?.item && held.store.kind === to.kind) {
+    const landed = join(dirname(held.item), basename(origin))
+    if ((await pathExists(dirname(held.item))) && !(await pathExists(landed))) {
+      await relocate(artifact, landed)
+      return { address: relative(root, landed), landed }
+    }
+  }
+  const bundle = await mintBundle(
+    root,
+    to,
+    origin,
+    held && !held.item ? basename(held.bundle) : undefined,
+  )
   try {
     await writeRecord(bundle, record)
-    await relocate(artifact, join(bundle, basename(artifact)))
+    await relocate(artifact, join(bundle, basename(origin)))
   } catch (e) {
     await removeOwn(bundle)
     throw e
   }
-  return bundle
+  return { address: relative(root, bundle), landed: join(bundle, basename(origin)) }
 }
 
-/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle; `leaf` asks for that bundle name back. */
+/** Moves a bundle's artifact into `to`, under the chain it left from, with its raw record spread with `extra`, and removes the emptied bundle, asking its name back where the store takes it. */
 export async function moveIntoStore(
   root: string,
   fromBundle: string,
   to: BundleStore,
   extra: RawRecord,
-  leaf?: string,
 ): Promise<void> {
-  const from = storeOf(root, fromBundle)
+  const from = bundleAddressOf(root, fromBundle)?.store
   const artifact = await bundleArtifact(fromBundle)
   const raw = await readRawRecord(fromBundle)
   if (!from || !artifact || !raw) return
   const origin = join(root, originPathOf(root, from, artifact))
-  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, leaf)
+  await fileInto(root, to, origin, artifact, { ...raw, ...extra }, relative(root, fromBundle))
   await removeOwn(fromBundle)
 }
 
@@ -213 +202 @@ export async function archiveOwned(
   )
 }
 
-/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
-export interface OpenBundle {
-  abs: string
-  store: BundleStore
-  record: RecordFile
-  artifact: string | null
+/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. An inner item opens as `inner`: the record the bundle's own derives for it, and the item as the artifact. */
+export type OpenBundle = { abs: string; store: BundleStore; record: RecordFile } & (
+  | { inner: true; artifact: string }
+  | { inner: false; artifact: string | null }
+)
+
+type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
+
+const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
+  isContainerKind(record.entity)
+
+type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
+
+/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more. */
+async function readBundleAt(root: string, abs: string) {
+  const at = bundleAddressOf(root, abs)
+  if (!at) return fault('Only a trash or archive record can be spent.')
+  const record = await readRecord(at.bundle)
+  if (!record) return fault('That record is unreadable.')
+  const artifact = await bundleArtifact(at.bundle)
+  const { bundle, store, item } = at
+  if (!item) return ok({ bundle, store, record, artifact, inner: null })
+  if (
+    !isContainerRecord(record) ||
+    !artifact ||
+    !isAtOrUnder(item, artifact) ||
+    !(await pathExists(item))
+  )
+    return fail('not-found', 'That item is no longer there.')
+  return ok({ bundle, store, record, artifact, inner: { item, held: record, artifact } })
+}
+
+/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; null when one of them has no id. */
+async function trailWithin(
+  held: ContainerRecord,
+  artifact: string,
+  folder: string,
+): Promise<string[] | null> {
+  const steps = relative(artifact, folder).split('/').filter(Boolean)
+  const inner = await Promise.all(
+    steps.map((_, i) => sidecarId(join(artifact, ...steps.slice(0, i + 1)), 'set')),
+  )
+  const ids = [
+    ...(held.trail ?? []),
+    ...(held.parent.kind === 'container' ? [held.parent.id] : []),
+    held.id,
+    ...inner,
+  ]
+  return ids.every((id): id is string => id !== undefined) ? ids : null
+}
+
+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
+async function innerRecord(
+  held: ContainerRecord,
+  trail: readonly string[] | null,
+  item: string,
+): Promise<InnerRecord> {
+  const entity = isMarkdownFile(item) ? 'page' : 'set'
+  const { id, icon } = await identityOf(entity, item)
+  return {
+    entity,
+    ...(id ? { id } : {}),
+    ...(icon ? { icon } : {}),
+    parent: trail ? { kind: 'container', id: trail[trail.length - 1] } : { kind: 'unaddressable' },
+    ...(trail && trail.length > 1 ? { trail: trail.slice(0, -1) } : {}),
+    ...(held.targets ? { targets: held.targets } : {}),
+    ...(held.partial ? { partial: true as const } : {}),
+  }
+}
+
+/** The Link values the bundle keeps whose page, resolved over the bundle's own pages where they lived, lies at or under `item`, read from the record as it stands at the op, so a value its delete's finish appends later stays with the bundle; a title two of its pages share stays with the bundle. */
+async function keptLinksUnder(
+  root: string,
+  store: BundleStore,
+  held: ContainerRecord,
+  artifact: string,
+  item: string,
+) {
+  if (!held.links?.length) return []
+  const files = await listMarkdownFiles(artifact)
+  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, store, f))))
+  return held.links.filter((link) => {
+    const page = linkedPage(link.value, index)
+    return page !== undefined && isAtOrUnder(page.id, item)
+  })
 }
 
 export async function openBundle(root: string, abs: string): Promise<Result<OpenBundle>> {
-  const store = storeOf(root, abs)
-  if (!store) return fault('Only a trash or archive record can be spent.')
-  const record = await readRecord(abs)
-  if (!record) return fault('That record is unreadable.')
-  return ok({ abs, store, record, artifact: await bundleArtifact(abs) })
+  const read = await readBundleAt(root, abs)
+  if (!read.ok) return read
+  const { bundle, store, record, artifact, inner } = read.value
+  if (!inner) return ok({ abs: bundle, store, record, artifact, inner: false })
+  const { item, held } = inner
+  const own = await innerRecord(held, await trailWithin(held, inner.artifact, dirname(item)), item)
+  const links = await keptLinksUnder(root, store, held, inner.artifact, item)
+  return ok({
+    abs: bundle,
+    store,
+    record: links.length ? { ...own, links } : own,
+    artifact: item,
+    inner: true,
+  })
+}
+
+/** One level of a container address's inner items under the bundle they sit in, its record and store, and the folder they share. */
+export interface InnerListing {
+  bundle: string
+  store: BundleStore
+  record: ContainerRecord
+  folder: string
+  items: { address: string; record: InnerRecord }[]
+}
+
+/** One level of a container address's inner items, its Sets and then its pages, each in the order the folder's sidecar keeps, with the record it carries; the trail above them is read once for the level. */
+export async function listInner(
+  root: string,
+  abs: string,
+  scope: WatchScope,
+): Promise<Result<InnerListing>> {
+  const read = await readBundleAt(root, abs)
+  if (!read.ok) return read
+  const { bundle, store, record, artifact, inner } = read.value
+  if (!isContainerRecord(record) || !artifact)
+    return fail('not-found', 'That holds no inner items.')
+  const folder = inner?.item ?? artifact
+  const trail = await trailWithin(record, artifact, folder)
+  const entries = (await listEntries(folder)).filter(
+    (e) =>
+      (e.kind === 'dir' || isContentFile(e)) &&
+      !outsideContent(originPathOf(root, store, join(folder, e.name)), scope),
+  )
+  const items = await Promise.all(
+    entries.map(async ({ name }) => {
+      const at = join(folder, name)
+      const own = await innerRecord(record, trail, at)
+      return {
+        address: relative(root, at),
+        record: own,
+        id: own.id ?? at,
+        title: titleFromPath(name),
+      }
+    }),
+  )
+  const meta =
+    (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
+  const ordered = [
+    ...resolveOrder(
+      items.filter((i) => i.record.entity === 'set'),
+      asStringArray(meta.set_order),
+    ),
+    ...resolveOrder(
+      items.filter((i) => i.record.entity === 'page'),
+      asStringArray(meta.page_order),
+    ),
+  ]
+  return ok({
+    bundle: relative(root, bundle),
+    store,
+    record,
+    folder: relative(root, folder),
+    items: ordered.map(({ address, record }) => ({ address, record })),
+  })
+}
+
+/** Spends what a restore, an empty, or an Archive delete took: the whole bundle, or from an inner item's bundle only the item's share — the Link values it carried away, and its pages on the strip the bundle's delete still owes — so the bundle's own restore never writes them twice and a later finish never strips a link to what came back. */
+export async function spendBundle(root: string, opened: OpenBundle): Promise<void> {
+  const { abs, store, record, artifact, inner } = opened
+  if (!inner) return void (await removeOwn(abs))
+  const gone = 'links' in record ? (record.links ?? []) : []
+  const same = (l: unknown): boolean =>
+    isPlainObject(l) &&
+    gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
+  if (gone.length)
+    await patchRecord(abs, (raw) => {
+      const links = (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l))
+      return { links: links.length ? links : undefined }
+    })
+  const bundle = relative(root, abs)
+  const owing = Object.entries(await readNotes(root)).find(
+    ([, e]) => e.kind === 'container' && e.bundle === bundle,
+  )
+  if (!owing) return
+  const from = originPathOf(root, store, artifact)
+  await editNote(root, owing[0], (e) =>
+    e?.kind === 'container'
+      ? { ...e, strip: distinct(e.strip?.filter((path) => !isAtOrUnder(path, from))) }
+      : e,
+  )
 }
 
 export async function contentPages(
```

##### Core/Bundles/handlers.ts

```/Core/Bundles/handlers.ts diff
@@ -4 +4 @@ import { isPlainObject, isString } from '../Contract/validators'
 import { liveTreeOf } from '../Nexus/liveTree'
 import { nexusPages } from '../Nexus/heldPages'
 import { archiveStoreOf } from '../Paths/names'
-import { archivedWithin, type BundleStore, listBundles } from './bundle'
-import { bundleRows } from './rows'
+import { scopeOf } from '../Settings/codec'
+import { resolveUnderRoot } from '../Paths/pathSafety'
+import { archivedWithin, listBundles, listInner } from './bundle'
+import type { BundleStore } from './layout'
+import { bundleRows, innerRows } from './rows'
 
 function storeFrom(raw: unknown): BundleStore | null {
   if (!isPlainObject(raw)) return null
@@ -28 +31 @@ export const bundlesHandlers = {
         : await listBundles(root, store)
     return ok(bundleRows(listed, store, tree, byId))
   }),
+  'bundles:children': withRoot(async (root, _ctx, raw: unknown) => {
+    if (!Array.isArray(raw) || !raw.every(isString)) return fault('Addresses are required.')
+    const tree = await liveTreeOf(root)
+    const { byId } = await nexusPages(root, tree)
+    const scope = scopeOf(tree.config)
+    return ok(
+      await Promise.all(
+        raw.map(async (address) => {
+          const resolved = await resolveUnderRoot(root, address)
+          const listed = resolved.ok ? await listInner(root, resolved.value, scope) : resolved
+          return listed.ok ? innerRows(listed.value, tree, byId) : []
+        }),
+      ),
+    )
+  }),
 } satisfies Partial<Handlers>
```

##### Core/Bundles/layout.ts

```/Core/Bundles/layout.ts diff
@@ -0 +1 @@
+import { basename, join, relative } from '../Paths/posix'
+import { hiddenName } from '../Paths/exclusion'
+import {
+  type ArchiveStore,
+  archiveDirRel,
+  archivedCollectionIdOf,
+  TRASH_DIR,
+} from '../Paths/nexusPaths'
+
+export type BundleStore = { kind: 'trash' } | ArchiveStore
+
+export function layoutOf(store: BundleStore): { dir: string; suffix: string } {
+  switch (store.kind) {
+    case 'trash':
+      return { dir: TRASH_DIR, suffix: '.deleted' }
+    case 'archive':
+      return { dir: archiveDirRel(store.id), suffix: '.archived' }
+  }
+}
+
+export const fileStamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')
+
+const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
+
+export function storedAtOf(bundlePath: string): number | null {
+  const m = STAMP.exec(basename(bundlePath).split('__')[0] ?? '')
+  if (!m) return null
+  const t = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)
+  return Number.isNaN(t) ? null : t
+}
+
+export const stampedLeaf = (stamp: string, n: number, base: string): string =>
+  n === 0 ? `${stamp}__${base}` : `${stamp}__${n}__${base}`
+
+/** The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix is never taken for it. */
+const stampedSegment = (segs: readonly string[], suffix: string): number =>
+  segs.findIndex((seg) => seg.endsWith(suffix) && storedAtOf(seg) !== null)
+
+/** The bundle a store path lies in, and the inner item it names inside the bundle's artifact when it names one: the address a row restores, deletes, and files back by. Null for anything else, the artifact itself and a hidden segment included. */
+export function bundleAddressOf(
+  root: string,
+  abs: string,
+): { bundle: string; store: BundleStore; item?: string } | null {
+  const rel = relative(root, abs)
+  const id = archivedCollectionIdOf(rel)
+  const store: BundleStore = id === null ? { kind: 'trash' } : { kind: 'archive', id }
+  const { dir, suffix } = layoutOf(store)
+  if (!rel.startsWith(`${dir}/`)) return null
+  const segs = rel.split('/')
+  const at = stampedSegment(segs, suffix)
+  if (at === -1) return null
+  const bundle = join(root, ...segs.slice(0, at + 1))
+  if (segs.length === at + 1) return { bundle, store }
+  const inner = segs.slice(at + 1)
+  return inner.length > 1 && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
+}
+
+/** Where a stored file lived: its path under the store's root with the bundle's own folder taken out. */
+export function originPathOf(root: string, store: BundleStore, file: string): string {
+  const { dir, suffix } = layoutOf(store)
+  const segs = relative(join(root, dir), file).split('/')
+  const bundle = stampedSegment(segs, suffix)
+  return segs.filter((_, i) => i !== bundle).join('/')
+}
```

##### Core/Bundles/placement.ts

```/Core/Bundles/placement.ts diff
@@ -1 +1 @@
 // Where a recorded artifact re-enters: the placement resolved against the CURRENT tree and stepped past what the disk holds, the order it lands in, or the refusal that says why it cannot be placed.
 
-import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
-import { basename, isAtOrUnder, join, relative, titleFromPath } from '../Paths/posix'
-import { createDisambiguated, freeName } from '../Paths/names'
+import { type ArchiveStore, CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
+import { basename, dirname, isAtOrUnder, join, relative, titleFromPath } from '../Paths/posix'
+import { archiveStoreOf, createDisambiguated, freeName } from '../Paths/names'
 import { pathExists } from '../Files/atomicWrite'
 import { landingRefusal } from '../Nexus/folderEntity'
 import { fail, fault, ok, type Result } from '../Contract/result'
@@ -10 +10 @@ import type { NexusTree } from '../Nexus/tree'
 import type { RestoreDestination } from '../Nexus/mutateRequest'
 import type { NexusPages } from '../Nexus/heldPages'
 import type { EntityRecord } from '../Nexus/record'
-import { findContainerById } from '../Nexus/treePatch'
+import { containerTrailById, findContainerById } from '../Nexus/treePatch'
 import { type Slot, spliceBeside } from '../Nexus/order'
 import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
 import { contextWorldOf } from '../Contexts/contextResolve'
-import type { ArtifactRecord, Place } from './record'
-import { archiveOwned, type BundleStore, collectionsElsewhere, storeOf } from './bundle'
+import { type ArtifactRecord, originOf, type Place, retrailed } from './record'
+import { archiveOwned, collectionsElsewhere } from './bundle'
+import { type BundleStore, bundleAddressOf, layoutOf, originPathOf } from './layout'
 
 interface Placement {
+  /** The folder it lands in; for an Archive destination, the address it files back at. */
   dir: string
   finalName: string
   /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells).*/
@@ -182 +184 @@ async function freeOnDisk(
   })
 }
 
+/** Where a page or Set files back into the Archive at `address`, an Archive address it held: the Archive of the Collection its origin sits in now, else the one `address` names, while that Collection still answers for it; `address` re-rooted into it, the origin folder it files back into, and its record on the trail its origin stands on now. */
+export async function archiveFiling<R extends Extract<ArtifactRecord, { entity: 'page' | 'set' }>>(
+  root: string,
+  tree: NexusTree,
+  record: R,
+  address: string,
+): Promise<Result<{ into: ArchiveStore; at: string; folder: string; record: R }>> {
+  // The address it names may be gone, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
+  const named = bundleAddressOf(root, join(root, address))
+  if (named?.store.kind !== 'archive') return fault(NO_DESTINATION)
+  const origin = originOf(record)
+  const live = origin
+    ? [...origin.trail, origin.parent]
+        .reverse()
+        .map((id) => containerTrailById(tree, id))
+        .find((held) => held !== null)
+    : undefined
+  const into = archiveStoreOf(live?.[0].id) ?? named.store
+  // A Collection in the Trash keeps its Archive; one gone for good would leave the item filed where no view reaches it.
+  if (!(await archiveOwned(tree, into.id, () => collectionsElsewhere(root, tree))))
+    return fault(REFUSAL_TEXT['parent-gone'])
+  const left = originPathOf(root, named.store, named.item ?? named.bundle)
+  return ok({
+    into,
+    at: join(
+      layoutOf(into).dir,
+      relative(join(root, layoutOf(named.store).dir), join(root, address)),
+    ),
+    folder: named.item ? dirname(left) : left,
+    record:
+      origin && live
+        ? {
+            ...record,
+            trail: retrailed(
+              origin,
+              live.map((n) => n.id),
+            ),
+          }
+        : record,
+  })
+}
+
 export async function placeRecord(
   root: string,
   stored: ArtifactRecord,
@@ -203 +247 @@ export async function placeRecord(
   if (destination?.kind === 'archive') {
     if ((stored.entity !== 'page' && stored.entity !== 'set') || !stored.archive)
       return fault(NO_DESTINATION)
-    // The bundle it names was removed, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
-    const into = storeOf(root, join(root, stored.archive))
-    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
-    // A Collection in the Trash keeps its Archive; one gone for good would leave the item filed where no view reaches it.
-    if (!(await archiveOwned(tree, into.id, () => collectionsElsewhere(root, tree))))
-      return fault(REFUSAL_TEXT['parent-gone'])
+    const filing = await archiveFiling(root, tree, stored, stored.archive)
+    if (!filing.ok) return filing
     if (stored.id && heldElsewhere(byId.get(stored.id), restoring))
       return fault(REFUSAL_TEXT['id-live'])
+    const { into, at, record } = filing.value
     return ok({
-      record: stored,
+      record,
       placement: {
-        dir: stored.archive,
+        dir: at,
         finalName: baseName,
         ...(stored.entity === 'page' ? { finalTitle: titleFromPath(baseName) } : {}),
       },
```

##### Core/Bundles/record.ts

```/Core/Bundles/record.ts diff
@@ -53 +53 @@ const contentRecord = <E extends string>(entity: E) =>
     place,
     /** The ids of the containers above `parent`, Collection first; read once the tree no longer holds `parent`, and kept current in the Archive by its carry. */
     trail: z.array(z.string()).optional(),
-    /** A Trash record's only: the Archive bundle a delete took the item out of, where its Undo returns it. */
+    /** A Trash record's only: the Archive address a delete took the item from, a bundle or an inner item of one, where its Undo files it back. */
     archive: z.string().optional(),
     /** Each Link value the delete stripped from a page outside it, by that page's id and the property's, so a restore can put it back. */
     links: z.array(strippedLink).optional(),
@@ -124 +124 @@ export async function writeRecord(
 export const readRawRecord = (bundleDir: string): Promise<RawRecord | null> =>
   readJsonObject(join(bundleDir, RECORD_FILENAME))
 
-export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
-  const raw = await readRawRecord(bundleDir)
-  if (raw === null) return null
+export const decodeRecord = (raw: unknown): RecordFile | null => {
   const parsed = recordFile.safeParse(raw)
   return parsed.success ? parsed.data : null
 }
 
+export async function readRecord(bundleDir: string): Promise<RecordFile | null> {
+  return decodeRecord(await readRawRecord(bundleDir))
+}
+
 /** Merges what `patch` answers into the record in place, raw. */
 export async function patchRecord(
   bundleDir: string,
@@ -166 +168 @@ export const collectionOf = ({ parent, trail }: Origin): string => trail[0] ?? p
 export const originWithin = (origin: Origin, setId: string, held: string[] | null): boolean =>
   origin.parent === setId || (held ?? origin.trail).includes(setId)
 
+/** The trail an origin stands on once a container on its chain stands at `held`, its ids Collection first: those down to it, then those the origin's record stored below it. */
+export function retrailed(origin: Origin, held: readonly string[]): string[] {
+  const chain = [...origin.trail, origin.parent]
+  return [...held, ...chain.slice(chain.indexOf(held[held.length - 1]) + 1)].slice(0, -1)
+}
+
+/** A page's stamped id, or a container's sidecar id and icon. */
+export async function identityOf(
+  kind: 'page' | ContainerKind,
+  abs: string,
+): Promise<{ id?: string; icon?: string }> {
+  return kind === 'page'
+    ? { id: (await stampedIdOf(abs)) ?? undefined }
+    : sidecarIdentity(abs, kind)
+}
+
+/** The record an Archive files a page or Set under from a decoded one: where it left from, and its identity read from the file at `abs` alone, since what a delete records belongs to the Trash. */
+export async function archivedRecord(
+  { entity, parent, place, trail }: Extract<RecordFile, { entity: 'page' | 'set' }>,
+  abs: string,
+): Promise<RecordFile> {
+  const { id, icon } = await identityOf(entity, abs)
+  return {
+    entity,
+    ...(id ? { id } : {}),
+    ...(icon ? { icon } : {}),
+    parent,
+    ...(place ? { place } : {}),
+    ...(trail ? { trail } : {}),
+  }
+}
+
 export async function gatherContentRecord(
   root: string,
   tree: NexusTree,
   kind: 'page' | ContainerKind,
   abs: string,
 ): Promise<RecordFile> {
-  const { id, icon } =
-    kind === 'page'
-      ? { id: await stampedIdOf(abs), icon: undefined }
-      : await sidecarIdentity(abs, kind)
+  const { id, icon } = await identityOf(kind, abs)
   const atRoot = dirname(abs) === root
   const container = atRoot ? null : containerAt(tree, relative(root, dirname(abs)))
   const siblings: readonly { id: string }[] | undefined = atRoot
```

##### Core/Bundles/rows.ts

```/Core/Bundles/rows.ts diff
@@ -1 +1 @@
-import { dirname, relative, relJoin, titleFromPath } from '../Paths/posix'
+import { basename, dirname, relative, relJoin, titleFromPath } from '../Paths/posix'
 import { CONTEXTS_DIR_REL } from '../Paths/nexusPaths'
 import { type MatchKey, matchKey } from '../Paths/caseFold'
 import type { HeldKind } from '../Nexus/entities'
@@ -7 +7 @@ import type { NexusPages } from '../Nexus/heldPages'
 import { containerTrailById } from '../Nexus/treePatch'
 import { type PropertyType, typeIds } from '../Properties/properties'
 import { contextWorldOf } from '../Contexts/contextResolve'
-import { type BundleStore, type ListedBundle, layoutOf, storedAtOf } from './bundle'
+import type { InnerListing, ListedBundle } from './bundle'
+import { type BundleStore, layoutOf, storedAtOf } from './layout'
 import { resolveRecord } from './placement'
 import type { ArtifactRecord } from './record'
 
@@ -19 +20 @@ export interface BundleCrumb {
 
 /** Main owns the parse: the renderer never sees a bundle suffix, a folder stamp, or the record union. */
 export interface BundleRow {
+  /** Its address: a bundle's folder, or the inner item's own path. */
   bundlePath: string
   kind: HeldKind | 'property'
   title: string
@@ -36 +38 @@ export interface BundleRow {
   match: MatchKey
   /** The item's own icon: a page's from the metadata the tree holds, a container's or a Space's from its record, which keeps the sidecar's. */
   icon?: string
-  /** A page or Set as stored, by its record's id and its path inside the bundle: what the reader opens and a restore's Undo finds again. */
+  /** A page or Set as stored, by its record's id and its path in the Nexus: what the reader opens and a restore's Undo finds again. */
   stored?: { id: string; path: string }
   /** Set when the delete recorded only part of what the item held. */
   partial?: true
@@ -65 +67 @@ function liveCrumbs(record: ArtifactRecord, tree: NexusTree): BundleCrumb[] | nu
   return chain?.map((n) => ({ kind: n.kind, title: n.title })) ?? null
 }
 
-function homeResolvesFor(
-  record: ArtifactRecord,
-  artifactName: string,
-  tree: NexusTree,
-  byId: NexusPages['byId'],
-  restoring: string,
-): boolean {
-  const resolution = resolveRecord(record, artifactName, tree, byId, restoring)
-  return !('refuse' in resolution) || resolution.refuse === 'id-live'
-}
-
 export const matched = (row: Omit<BundleRow, 'match'>): BundleRow => ({
   ...row,
   match: matchKey(row.title, row.crumbs.map((c) => c.title).join('/')),
@@ -103 +94 @@ export function bundleRowOf(
     })
   }
   if (!artifactName) return null
+  return artifactRow(
+    record,
+    { bundlePath, path: relJoin(bundlePath, artifactName), storedAt: storedAtOf(bundlePath) },
+    bundleCrumbs(record, store, bundlePath, tree),
+    tree,
+    byId,
+  )
+}
+
+/** A bundle's trail: live from its recorded parent, else frozen from the chain it was filed under. */
+function bundleCrumbs(
+  record: ArtifactRecord,
+  store: BundleStore,
+  bundlePath: string,
+  tree: NexusTree,
+): { crumbs: BundleCrumb[]; historical: boolean } {
   const live = liveCrumbs(record, tree)
-  const path = relJoin(bundlePath, artifactName)
+  return { crumbs: live ?? frozenCrumbs(store, bundlePath), historical: !live }
+}
+
+/** The one row an artifact reads as, a bundle's own or an inner item's: the place it shows, the date it entered, and whether its home still answers. */
+function artifactRow(
+  record: ArtifactRecord,
+  at: { bundlePath: string; path: string; storedAt: number | null },
+  place: { crumbs: BundleCrumb[]; historical: boolean },
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow {
+  const name = basename(at.path)
   const icon =
     record.entity === 'page'
       ? record.id
@@ -113 +131 @@ export function bundleRowOf(
       : record.entity === 'context'
         ? undefined
         : record.icon
+  const home = resolveRecord(record, name, tree, byId, at.bundlePath)
   return matched({
-    bundlePath,
+    bundlePath: at.bundlePath,
     kind: record.entity,
-    title: record.entity === 'page' ? titleFromPath(artifactName) : artifactName,
-    crumbs: live ?? frozenCrumbs(store, bundlePath),
-    ...(live ? {} : { historical: true }),
-    storedAt: storedAtOf(bundlePath),
+    title: record.entity === 'page' ? titleFromPath(name) : name,
+    crumbs: place.crumbs,
+    ...(place.historical ? { historical: true } : {}),
+    storedAt: at.storedAt,
     ...(icon ? { icon } : {}),
     ...((record.entity === 'page' || record.entity === 'set') && record.id
-      ? { stored: { id: record.id, path } }
+      ? { stored: { id: record.id, path: at.path } }
       : {}),
-    homeResolves: homeResolvesFor(record, artifactName, tree, byId, bundlePath),
+    homeResolves: !('refuse' in home) || home.refuse === 'id-live',
     ...(record.partial ? { partial: true as const } : {}),
   })
 }
 
+/** A bundle's inner items as rows: each addressed by its own path, dated by its bundle's stamp, its trail the bundle's own followed by the containers inside it down to the row's folder. */
+export function innerRows(
+  listed: InnerListing,
+  tree: NexusTree,
+  byId: NexusPages['byId'],
+): BundleRow[] {
+  const { bundle, store, record, folder, items } = listed
+  const { crumbs, historical } = bundleCrumbs(record, store, bundle, tree)
+  const [held, ...sets] = relative(bundle, folder).split('/')
+  const place = {
+    crumbs: [
+      ...crumbs,
+      { kind: record.entity, title: held },
+      ...sets.map((title) => ({ kind: 'set' as const, title })),
+    ],
+    historical,
+  }
+  const storedAt = storedAtOf(bundle)
+  return items.map(({ address, record }) =>
+    artifactRow(record, { bundlePath: address, path: address, storedAt }, place, tree, byId),
+  )
+}
+
 export function bundleRows(
   bundles: ListedBundle[],
   store: BundleStore,
```

##### Core/Connections/linkValue.ts

```/Core/Connections/linkValue.ts diff
@@ -94 +94 @@ export function readLinkText(text: string): LinkTarget | null {
   return isValidLink(s) ? { kind: 'url', syntax: 'bare', url: s } : null
 }
 
+/** The page a Link value's page link resolves to in `index`; an address, or a title `index` can't settle, names none. */
+export const linkedPage = (value: string, index: PageIndex): ConnPage | undefined => {
+  const link = readLinkText(value)
+  return link?.kind === 'page' ? index.resolve(link.title).page : undefined
+}
+
 /** A bare heading names `own`, the page holding a value, and otherwise the document it's written in. */
 export const bareHeading = (heading: string, own?: ConnPage): ResolvedLink =>
   own ? { kind: 'page', page: own, heading } : { kind: 'self', heading }
```

##### Core/Contract/bridge.ts

```/Core/Contract/bridge.ts diff
@@ -5 +5 @@ import type { EditorMenuRequest } from '../Actions/editorMenu'
 import type { EditMenuAction, KeyPress, MenuCommand, NativeEdit } from '../Actions/commands'
 import type { RemovedView, SavedView, ViewPatch } from '../Views/views'
 import type { BodyWrite, PageDetail } from '../Pages/pageDetail'
-import type { BundleStore } from '../Bundles/bundle'
+import type { BundleStore } from '../Bundles/layout'
 import type { BundleRow } from '../Bundles/rows'
 import type { TrashMode } from '../Trash/trashMode'
 import type { ClearReport } from '../Settings/exclusionScan'
@@ -197 +197 @@ export interface Asks {
   // No push carries what a store holds, so a browser asks again after every action and on `storesChanged`.
   // `within` narrows a Collection's Archive to what left from within one of its top-level Sets.
   'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
+  // One level of inner items per row a browser holds open, asked on opening and again on each refresh, since `bundles:list` walks no artifact.
+  'bundles:children': { args: [addresses: string[]]; reply: Result<BundleRow[][]> }
   // Read at the moment of asking, never from the renderer's cache, so the confirmation can't promise the system trash while main erases outright.
   'delete:facts': { args: []; reply: Result<{ trashMode: TrashMode; permanentDelete: boolean }> }
 
```

##### Core/Interface/Confirm/confirmations.ts

```/Core/Interface/Confirm/confirmations.ts diff
@@ -1 +1 @@
-import type { RestoreDestination } from '../../Nexus/mutateRequest'
+import type { MutateOutcome, RestoreDestination } from '../../Nexus/mutateRequest'
 import { type Counted, countPhrase, type HeldKind, itemCount } from '../../Nexus/entities'
 import { valueOr } from '../../Contract/result'
 import { DEFAULT_TRASH_MODE } from '../../Trash/trashMode'
@@ -97 +97 @@ export const confirmDelete = async (
       ? askDestroyProperty(target.propertyId, target.title)
       : askTrashing([target])
   if (!(await asked)) return false
-  const { mutate, finishOwed } = useSession.getState()
-  const done = await mutate(
-    'propertyId' in target
-      ? { op: 'deleteProperty', propertyId: target.propertyId }
-      : { op: 'delete', path: target.path, kind: target.kind },
-  )
+  const done = await useSession
+    .getState()
+    .mutate(
+      'propertyId' in target
+        ? { op: 'deleteProperty', propertyId: target.propertyId }
+        : { op: 'delete', path: target.path, kind: target.kind },
+    )
   if (!done) return false
-  const { bundled, cascade } = done
+  offerDeleted(target.title, done, target.undoTo)
+  return true
+}
+
+/** A delete's one notice, by `title`: the Undo for the bundle it minted, to `undoTo` when given, and the cascade's links, warning, and Try Again. */
+export function offerDeleted(
+  title: string,
+  { bundled, cascade }: MutateOutcome,
+  undoTo?: RestoreDestination,
+): void {
+  const { finishOwed } = useSession.getState()
   offerUndo(
     bundled ? [bundled.bundlePath] : [],
-    (undo) => notifyDeleted(target.title, undo, cascade, cascade?.owed ? finishOwed : undefined),
-    target.undoTo,
+    (undo) => notifyDeleted(title, undo, cascade, cascade?.owed ? finishOwed : undefined),
+    undoTo,
   )
-  return true
 }
 
 export const confirmArchive = async (target: {
```

##### Core/Interface/Windows/PageReaderWindow.tsx

```/Core/Interface/Windows/PageReaderWindow.tsx diff
@@ -145 +145 @@ function HistoryReader({ reader, closing }: Branch<'history'>): React.JSX.Elemen
     if (!reportRefusal(list)) return
     setRows(list.value)
     const live = new Set(list.value)
-    setChecked((prev) => retained(prev, live))
+    setChecked((prev) => retained(prev, (k) => live.has(k)))
     setShown((prev) => (prev !== null && live.has(prev) ? prev : null))
   }, [target.id])
   useEffect(() => {
```

##### Core/Nexus/configReach.ts

```/Core/Nexus/configReach.ts diff
@@ -284 +284 @@ const reaches = (dir: string, under?: string): boolean => !under || isAtOrUnder(
 const setSidecarsUnder = async (root: string, scope: WatchScope, abs: string): Promise<string[]> =>
   (await sidecarsUnder(root, scope, abs)).filter((file) => basename(file) === SIDECAR_FILENAME.set)
 
-/** The ids of the Sets an archived folder holds, read from their sidecars, so every saved view drops them once the folder leaves for good. */
+/** The ids of the Sets an archived folder holds, read from their sidecars. */
 export async function archivedSetIds(root: string, abs: string): Promise<string[]> {
   const ids = await Promise.all(
     (await setSidecarsUnder(root, await readWatchScope(root), abs)).map((file) =>
```

##### Core/Nexus/finishOwed.ts

```/Core/Nexus/finishOwed.ts diff
@@ -15 +15 @@ import { patchRecord } from '../Bundles/record'
 import { parkLinks } from '../Trash/trashedCopies'
 import { findContainerById } from './treePatch'
 import { pagesByIdOf } from './record'
-import { type ConfigReach, NO_REACH, reachConfig, retries } from './configReach'
+import { archivedSetIds, type ConfigReach, NO_REACH, reachConfig, retries } from './configReach'
 import { oweWalk } from './fileEvents'
 import { machine } from '../Platform/machine'
 import { heldName, relocate, targetTaken } from '../Files/atomicWrite'
 import { contextsDir } from '../Paths/paths'
-import { contextDirRel } from '../Paths/nexusPaths'
+import { ARCHIVE_DIR_REL, archiveDirRel, contextDirRel } from '../Paths/nexusPaths'
 import { basename, join } from '../Paths/posix'
 import { readRegistryStrict, unlistContext } from '../Contexts/contextsRegistry'
 import { contextWorldOf } from '../Contexts/contextResolve'
@@ -49 +49 @@ import {
   type SpaceEntry,
 } from './owed'
 import { stashAndStrip } from '../Properties/unassignProperty'
-import { contentPages, listBundles } from '../Bundles/bundle'
+import { archiveOwned, collectionsElsewhere, contentPages, listBundles } from '../Bundles/bundle'
+import { listEntries } from '../Files/walk'
 import { refillStash } from '../Properties/assignment'
 
 type Finished<E extends Entry> = { left: E; reach: ConfigReach }
@@ -378 +379 @@ async function finishContainer(
   e: ContainerEntry,
 ): Promise<Finished<ContainerEntry>> {
   const reach: ConfigReach = { skipped: 0, hosts: [] }
-  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
+  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets neither the tree nor an Archive its Collection still owns holds; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
   const tree = await liveTreeOf(root)
   const live = findContainerById(tree, id)
   const back = e.within ? live?.path === e.at : pagesByIdOf(tree).has(id) || !!live
+  const owedEdit = async (): Promise<ContainerEntry['edit']> => {
+    if (e.edit?.kind !== 'gone' || e.within) return back ? undefined : e.edit
+    const unheld = e.edit.ids.filter((x) => !findContainerById(tree, x))
+    if (!unheld.length) return undefined
+    let elsewhere: Promise<Set<string>> | undefined
+    const archived: string[] = []
+    for (const { name, kind } of await listEntries(join(root, ARCHIVE_DIR_REL)))
+      if (
+        kind === 'dir' &&
+        (await archiveOwned(tree, name, () => (elsewhere ??= collectionsElsewhere(root, tree))))
+      )
+        archived.push(...(await archivedSetIds(root, join(root, archiveDirRel(name)))))
+    const ids = unheld.filter((x) => !archived.includes(x))
+    return ids.length ? { ...e.edit, ids } : undefined
+  }
+  const edit = await owedEdit()
   const gone = e.strip && !back ? await deleteCascade(root, join(root, e.at), e.strip) : null
   if (gone?.links.length) {
     if (e.bundle)
@@ -392 +409 @@ async function finishContainer(
   }
   const stripped = !!gone && add(reach, gone.reach)
   const viewed =
-    !!e.edit &&
-    !back &&
-    add(reach, await reachConfig(root, e.edit, e.within && join(root, e.within)))
+    !!edit && add(reach, await reachConfig(root, edit, e.within && join(root, e.within)))
   return {
     left: { ...e, strip: stripped ? e.strip : undefined, edit: viewed ? e.edit : undefined },
     reach,
```

##### Core/Nexus/heldPages.ts

```/Core/Nexus/heldPages.ts diff
@@ -10 +10 @@ import { ARCHIVE_DIR_REL, archivedCollectionIdOf } from '../Paths/nexusPaths'
 import { corpusFilesUnder } from '../Files/walk'
 import { stampedIdOf } from '../Files/pageFile'
 import { scopeOf } from '../Settings/codec'
-import { originPathOf } from '../Bundles/bundle'
+import { originPathOf } from '../Bundles/layout'
 import { buildPageIndex, type ConnPage, connPage, type PageIndex } from '../Connections/pageIndex'
 
 type ById = Map<string, EntityRecord | null>
```

##### Core/Nexus/mutate.ts

```/Core/Nexus/mutate.ts diff
@@ -23 +23 @@ import {
 } from '../Properties/optionOps'
 import { emptyBundle, restoreTrashed } from '../Trash/spend'
 import { archiveOp, restoreArchived } from '../Archive/archive'
-import { openBundle, storeOf } from '../Bundles/bundle'
+import { openBundle } from '../Bundles/bundle'
+import { bundleAddressOf } from '../Bundles/layout'
 import { deleteOp } from '../Trash/delete'
 import { updateSettings } from '../Settings/settings'
 import { setProfileImageOp } from '../Assets/setProfileImage'
@@ -147 +148 @@ async function dispatch(ctx: MutateContext, req: MutateRequest): Promise<MutateR
           ? restoreArchived(root, opened.value, req.destination)
           : restoreTrashed(root, opened.value, req.destination)
       }
-      return storeOf(root, resolved.value)?.kind === 'archive'
+      return bundleAddressOf(root, resolved.value)?.store.kind === 'archive'
         ? inSettleTurn(root, restore)
         : underContexts(root, () => inSettleTurn(root, restore))
     }
```

##### Core/Nexus/mutateRequest.ts

```/Core/Nexus/mutateRequest.ts diff
@@ -17 +17 @@ export interface MutateOutcome {
   created?: { path: string } | { propertyId: string }
   cascade?: CascadeReport
   adopted?: string
-  /** The bundle a removal minted, in the Trash or an Archive; absent when the system trash took it. */
+  /** Where a removal filed what it took, in the Trash or an Archive; absent when the system trash took it. */
   bundled?: { bundlePath: string }
   /** The titles of what a restore brought back without all it held. */
   unrestored?: string[]
@@ -45 +45 @@ export type BannerOwnerKind = z.infer<typeof bannerOwner>
 
 const containerKind = z.enum(CONTAINER_KINDS)
 
-/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the bundle its record names. */
+/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the address its record names. */
 const restoreDestination = z.discriminatedUnion('kind', [
   z.object({ kind: z.enum(['container', 'context']), id: z.string() }),
   z.object({ kind: z.literal('archive') }),
@@ -94 +94 @@ export const mutateRequest = z.discriminatedUnion('op', [
   }),
   op('renameHeading', { path: z.string(), heading: z.string(), to: z.string() }),
   op('delete', { path: z.string(), kind: heldKind }),
-  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), leaf: z.string().optional() }),
+  op('archive', {
+    path: z.string(),
+    kind: z.enum(['page', 'set']),
+    at: z.string().optional(),
+    name: z.string().optional(),
+    record: z.record(z.string(), z.unknown()).optional(),
+  }),
   op('restore', { bundlePath: z.string(), destination: restoreDestination.optional() }),
   op('emptyBundle', { bundlePath: z.string() }),
   op('setProfileImage', { source: z.string().nullable() }),
```

##### Core/Nexus/settle.ts

```/Core/Nexus/settle.ts diff
@@ -1 +1 @@
 // The one place a change to the tree, pages, values, tiles, or assets reaches the window. The app's own writes land here as events while they happen; a write's gate and the watcher's batch then stamp what their events listed missing, and settle: the heading renames outside edits owed cascaded, the walk the events owed, whose own listing of what is missing its ID is stamped as `stampable` allows and settled in turn, the outside moves and arrivals the index saw re-spelled, the options the owed files hold registered, and one push of what moved.
 
-import { join, relDirname, relative, titleFromPath } from '../Paths/posix'
+import { join, relDirname, relative, stripMarkdownExt, titleFromPath } from '../Paths/posix'
 import { escapes } from '../Paths/pathSafety'
 import type { HostContext } from '../Contract/handlers'
 import { errText } from '../Contract/result'
@@ -352 +352 @@ export async function returningCascade(
   }
 }
 
+/** An archive's re-spell when it files the item under another path than it stood under, its restore's in reverse: each key naming it where it stood re-spells to where `back` puts its pages, wherever the live world it left names nothing there, and to a page's whole path where a live page holds the shorter name. */
+export async function departingCascade(
+  root: string,
+  tree: NexusTree,
+  back: readonly ConnPage[],
+  title: string,
+): Promise<CascadeReport | undefined> {
+  const after = await settledIndex(root)
+  if (!after) return linksNotUpdated(title)
+  const ids = back.map((p) => p.id)
+  const departing = buildPageIndex(back)
+  const names = respellings(pageIndexOf(tree), departing, ids, [])
+  for (const [key, name] of names) {
+    if (after.resolve(name).status === 'phantom') continue
+    const path = departing.resolve(name).page?.path
+    const whole = path && stripMarkdownExt(path)
+    if (whole && after.resolve(whole).status === 'phantom') names.set(key, whole)
+    else names.delete(key)
+  }
+  return names.size ? respell(root, ids, names, title) : undefined
+}
+
 // What an outside payment leaves: a warning logged, since no one is there to read a notice, and the files it wrote owed to the push.
 function paid(root: string, c: CascadeReport | undefined, what: string): void {
   if (!c) return
```

##### Core/Properties/columnStyles.ts

```/Core/Properties/columnStyles.ts diff
@@ -40 +40 @@ export type DateFormat = (typeof DATE_FORMATS)[number]
 
 export const TIME_FORMATS = ['twelveHour', 'twentyFourHour', 'none'] as const
 export type TimeFormat = (typeof TIME_FORMATS)[number]
+/** What a column stores for its time: a form, or `shown` for the Nexus clock. */
+export const STORED_TIME_FORMATS = [...TIME_FORMATS, 'shown'] as const
 
 export const WEEKDAY_FORMATS = ['long', 'short', 'none'] as const
 export type WeekdayFormat = (typeof WEEKDAY_FORMATS)[number]
@@ -53 +55 @@ export const columnStyle = looseDecoder(
   z.object({
     look: z.enum(COLUMN_LOOKS).optional().catch(undefined),
     date_format: z.enum(DATE_FORMATS).optional().catch(undefined),
-    time_format: z
-      .enum([...TIME_FORMATS, 'shown'])
-      .optional()
-      .catch(undefined),
+    time_format: z.enum(STORED_TIME_FORMATS).optional().catch(undefined),
     weekday: z.enum(WEEKDAY_FORMATS).optional().catch(undefined),
   }),
 )
@@ -95 +94 @@ export function resolveStyle(
   }
 }
 
-/** What a pick stores: nothing when it matches the default, so the date or clock goes on following the Nexus. */
+/** What a pick stores: nothing when it matches the default, so the date or clock goes on following the Nexus; a time shown (`shown`) reads as the clock. */
 export function storedPick(
   key: keyof ColumnStyle & string,
   value: string,
   defaults: ColumnStyle,
   clock: TimeFormat,
 ): string | undefined {
-  if (value === defaults[key]) return undefined
-  return key === 'time_format' && value === clock ? 'shown' : value
+  const picked = key === 'time_format' && value === 'shown' ? clock : value
+  if (picked === defaults[key]) return undefined
+  return key === 'time_format' && picked === clock ? 'shown' : picked
 }
 
 export function defaultStyleFor(
```

##### Core/Settings/TrashFrame.tsx

```/Core/Settings/TrashFrame.tsx diff
@@ -1 +1 @@
 import { useState } from 'react'
-import { Checkbox } from '@pommora/uix/Controls/Checkbox'
 import { SearchField } from '@pommora/uix/Fields/SearchField'
 import { Scrollbar } from '@pommora/uix/Interactions/Scrollbar'
-import { NavTrail } from '@pommora/uix/Elements/NavTrail'
-import { historical } from '@pommora/uix/Elements/nav-trail.css'
-import { MenuItem } from '@pommora/uix/Menus'
-import { overlay } from '@pommora/uix/Menus/menu-row.css'
 import { cx } from '@pommora/uix/Utilities/cx'
 import { Icon } from '@pommora/uix/Symbols'
-import { entityIcon } from '../Assets/entityIconPolicy'
 import { text } from '@pommora/uix/Theme'
-import type { Personalization } from './personalization'
-import type { BundleRow } from '../Bundles/rows'
 import { propertyTypeIconName } from '../Properties/typeDisplay'
 import { useSession } from '../Session/store'
-import { personalizationOf } from '../Session/configSlice'
-import { crumbSegments, useBundleBrowser } from '../Bundles/browser'
-import { DateHeading } from '../Bundles/DateHeading'
+import { useBundleBrowser } from '../Bundles/browser'
+import { BundleRows, BundleTable, DateHeading } from '../Bundles/BundleTable'
 import '../Navigation/nav-list.css'
 import './trash-frame.css'
 
@@ -28 +19 @@ export function TrashFrame(): React.JSX.Element {
 
 function TrashBody(): React.JSX.Element {
   const [query, setQuery] = useState('')
-  const { listing, visible, checked, picked, toggle, openMenu, date } = useBundleBrowser(
-    { kind: 'trash' },
-    { query, shown: true },
-  )
-  const defaultIcons = useSession((s) => personalizationOf(s).defaultIcons)
+  const browser = useBundleBrowser({ kind: 'trash' }, { query, shown: true })
+  const { listing, visible, date } = browser
+  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
 
-  const body = (): React.JSX.Element => {
+  const footing = (): React.JSX.Element | null => {
     switch (listing.status) {
       case 'loading':
-        return <div className="trash-empty" />
+        return null
       case 'failed':
         return (
           <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
         )
       case 'ready':
-        if (visible.length === 0)
-          return (
-            <div className={cx('trash-empty', text.body.standard)}>
-              {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
-            </div>
-          )
+        if (visible.length > 0) return null
         return (
-          <>
-            <div className="trash-scroll scroll-fade">
-              <div className="nav-list">
-                {visible.map((row) => (
-                  <TrashRowView
-                    key={row.bundlePath}
-                    row={row}
-                    checked={checked.has(row.bundlePath)}
-                    revealed={picked.length > 0}
-                    onToggle={() => toggle(row.bundlePath)}
-                    onMenu={() => void openMenu(row)}
-                    icon={
-                      row.kind === 'property'
-                        ? row.propertyType
-                          ? propertyTypeIconName(row.propertyType)
-                          : 'tag'
-                        : entityIcon(row.kind, row.icon, defaultIcons)
-                    }
-                    defaultIcons={defaultIcons}
-                    when={date.when(row.storedAt)}
-                  />
-                ))}
-              </div>
-            </div>
-            <Scrollbar />
-          </>
+          <div className={cx('trash-empty', text.body.standard)}>
+            {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
+          </div>
         )
     }
   }
 
   return (
-    <div
-      className="trash-frame table is-clear"
-      style={
-        date.width === null
-          ? undefined
-          : ({
-              '--trash-date-lane': `calc(${date.width}px + var(--trash-date-inset))`,
-            } as React.CSSProperties)
-      }
-    >
+    <div className="trash-frame table">
       <div className="nav-search-row">
         <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
       </div>
-
-      <div className={cx('trash-head', 'table-head')}>
-        <span className="trash-head-name col-header">
-          <span className="trash-head-glyph">
-            <Icon name={propertyTypeIconName('title')} size="body" />
-          </span>
-          File Name
-        </span>
-        <DateHeading
-          date={date}
-          className="trash-head-date"
-          sampleClass={text.caption.standard}
-          label={
-            <span className="trash-head-label">
-              <Icon name="clock-fading" size="body" />
-              Time Deleted
+      <div className="trash-table">
+        <BundleTable date={date}>
+          <div className="trash-head table-head">
+            <span className="trash-head-name col-header">
+              <span className="trash-head-glyph">
+                <Icon name={propertyTypeIconName('title')} size="body" />
+              </span>
+              File Name
             </span>
-          }
-        />
+            <DateHeading
+              date={date}
+              className="trash-head-date"
+              label={
+                <span className="trash-head-label">
+                  <Icon name="clock-fading" size="body" />
+                  Time Deleted
+                </span>
+              }
+            />
+          </div>
+          {visible.length > 0 && (
+            <div ref={setScrollEl} className="trash-scroll scroll-fade">
+              <BundleRows browser={browser} scrollEl={scrollEl} />
+            </div>
+          )}
+        </BundleTable>
       </div>
-
-      {body()}
+      {footing()}
+      <Scrollbar of={scrollEl} />
     </div>
   )
 }
-
-function TrashRowView({
-  row,
-  checked,
-  revealed,
-  onToggle,
-  onMenu,
-  icon,
-  when,
-  defaultIcons,
-}: {
-  row: BundleRow
-  checked: boolean
-  revealed: boolean
-  onToggle: () => void
-  onMenu: () => void
-  icon: string
-  when: string
-  defaultIcons: Personalization['defaultIcons']
-}): React.JSX.Element {
-  return (
-    <MenuItem
-      className="trash-row table-divider"
-      revealed={revealed}
-      leading={<Icon name={icon} size="headline" />}
-      detail={
-        <NavTrail
-          segments={crumbSegments(row.crumbs, defaultIcons)}
-          iconSize="control"
-          className={cx('trash-trail', row.historical && historical)}
-        />
-      }
-      trailing={
-        <>
-          {row.partial && (
-            <Icon name="triangle-alert" size="body" role="img" aria-label="Recorded Partly" />
-          )}
-          <span className={cx('trash-date', text.caption.standard)}>{when}</span>
-        </>
-      }
-      overlay={
-        <Checkbox
-          className={overlay}
-          size="compact"
-          state={checked}
-          onChange={onToggle}
-          ariaLabel={`Select ${row.title}`}
-        />
-      }
-      onClick={onToggle}
-      onContextMenu={(e) => {
-        e.preventDefault()
-        onMenu()
-      }}
-    >
-      {row.title}
-    </MenuItem>
-  )
-}
```

##### Core/Settings/trash-frame.css

```/Core/Settings/trash-frame.css diff
@@ -1 +1 @@
 .trash-frame.table {
-  --trash-date-inset: 8px; /* KNOB — clears the column divider, heading and rows alike */
-  --cell-padding-x: var(--surface-inset);
+  --heading-fill: none;
+  --heading-divider: var(--width-150) solid var(--border-base);
   --heading-padding-y: 6px; /* KNOB */
   flex: 1;
   min-width: 0;
@@ -10 +10 @@
   padding-top: var(--app-inset);
 }
 
-.trash-frame .trash-head {
+/* Sideways when the window is narrower than the table's columns, the heading riding with the rows; the leading inset is the checkboxes' gutter. */
+.trash-table {
+  flex: 0 1 auto;
+  min-height: 0;
   display: flex;
-  align-items: center;
-  position: relative;
+  flex-direction: column;
+  overflow-x: auto;
+  overflow-y: hidden;
+  padding: 0 var(--surface-inset) 0 var(--rail-inset);
+}
+.trash-table > .table-grid {
+  flex: 0 1 auto;
+  min-height: 0;
+  display: flex;
+  flex-direction: column;
+}
+
+/* The heading keeps its own place: reaching back over the gutter to the frame's inset, where its divider and File Name begin, its first track taking up the width so its column line meets the rows'. */
+.trash-frame .trash-head {
   flex-shrink: 0;
+  margin-left: calc(var(--surface-inset) - var(--rail-inset));
 }
-.trash-frame .trash-head::after {
-  content: "";
-  position: absolute;
-  left: var(--surface-inset);
-  right: var(--surface-inset);
-  bottom: 0;
-  border-bottom: var(--width-150) solid var(--border-base);
+.trash-frame .trash-head-name {
+  padding-left: 0;
 }
-/* The leading bar normally marks the gutter↔Title junction; this strip has no gutter column, so it's suppressed here — the divider between columns stays. */
+.trash-frame .trash-head-date {
+  padding-left: 8px; /* KNOB — clears the column line */
+}
+/* The heading keeps its plain lead, without the bar a table's first heading draws at its gutter. */
 .trash-head .col-header:first-child::before {
   content: none;
 }
-.trash-frame .trash-row {
-  --row-pad-trail: 0px;
-}
-.trash-frame .trash-row::after {
-  right: var(--trash-date-lane);
-}
-.trash-frame .trash-head-name {
-  flex: 1;
-  min-width: 0;
+.trash-frame .trash-head-name,
+.trash-frame .trash-head-date {
   display: flex;
   align-items: center;
 }
@@ -47 +54 @@
 .trash-frame .trash-head svg {
   color: var(--label-secondary);
 }
-.trash-frame .trash-head-date {
-  flex: 0 0 var(--trash-date-lane);
-  display: flex;
-  align-items: center;
-  padding-left: var(--trash-date-inset);
-  padding-right: 0; /* the lane is the measured date plus its inset, as the rows' cells are */
-}
 .trash-head-label {
   display: flex;
   align-items: center;
   gap: 6px;
 }
 
+/* Reaching back across the gutter, so the rows' checkboxes sit inside the scroller that clips them. */
 .trash-scroll {
   flex: 1;
   min-height: 0;
   overflow-y: auto;
   scrollbar-width: none;
+  margin-left: calc(-1 * var(--rail-inset));
+  padding-left: var(--rail-inset);
   padding-bottom: 6px;
 }
 
-.trash-frame .trash-row + .trash-row::before {
-  content: "";
-  position: absolute;
-  left: var(--surface-inset);
-  right: var(--surface-inset);
-  top: 0;
-  border-top: var(--table-border);
-}
-
-.trash-frame .trash-trail {
-  padding-right: 8px; /* KNOB — with the cluster's 4px gap, mirrors --trash-date-inset across the divider */
-}
-.trash-date {
-  flex: 0 0 var(--trash-date-lane);
-  padding-left: var(--trash-date-inset);
-  white-space: nowrap;
-  color: var(--label-secondary);
-}
-
 .trash-empty {
   flex: 1;
   display: flex;
```

##### Core/Testing/hostFs.ts

```/Core/Testing/hostFs.ts diff
@@ -1 +1 @@
 import { mkdtempSync, realpathSync } from 'node:fs'
 import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
 import { tmpdir } from 'node:os'
+import { vi } from 'vitest'
+import * as atomicWrite from '../Files/atomicWrite'
+import { listFilesRecursive } from '../Files/walk'
 import { contextsDir, nexusConfig, sidecarPath } from '../Paths/paths'
 import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES, SPACE_SIDECAR } from '../Paths/nexusPaths'
 import { basename, dirname, join } from '../Paths/posix'
@@ -25 +28 @@ export const putJson = async (file: string, value: unknown): Promise<void> => {
   await writeFile(file, JSON.stringify(value, null, 2))
 }
 
+/** Each file under `dir` with its text, so a refused op shows the folder left byte-identical. */
+export const bytesUnder = async (dir: string): Promise<Record<string, string>> =>
+  Object.fromEntries(
+    await Promise.all(
+      (await listFilesRecursive(dir)).map(async (f) => [f, await readFile(f, 'utf8')]),
+    ),
+  )
+
+const writers = {
+  atomicWriteFile: atomicWrite.atomicWriteFile,
+  rewritePreservingTimes: atomicWrite.rewritePreservingTimes,
+  editJsonStrict: atomicWrite.editJsonStrict,
+}
+
+/** Refuses `name`'s write to each file `refuses` picks, and hands every other file to the real write. */
+export const refuseWrites = (name: keyof typeof writers, refuses: (file: string) => boolean) => {
+  const real = writers[name] as (file: string, ...rest: never[]) => Promise<unknown>
+  return vi
+    .spyOn(atomicWrite, name)
+    .mockImplementation(((file: string, ...rest: never[]) =>
+      refuses(file) ? Promise.reject(new Error('refused')) : real(file, ...rest)) as never)
+}
+
 /** A Space the tree holds: its sidecar, and its Context in the Context list when the list doesn't name it. */
 export const seedSpaceSidecar = async (
   root: string,
```

##### Core/Testing/virtualRows.ts

```/Core/Testing/virtualRows.ts diff
@@ -0 +1 @@
+/** The virtualizer's stand-in for renderer suites: every row drawn, each at its fixed height's offset, since jsdom lays nothing out. */
+export function useVirtualRows({ count, rowHeight }: { count: number; rowHeight: number }): {
+  height: number
+  rows: { key: number; index: number; start: number }[]
+} {
+  return {
+    height: count * rowHeight,
+    rows: Array.from({ length: count }, (_, index) => ({
+      key: index,
+      index,
+      start: index * rowHeight,
+    })),
+  }
+}
```

##### Core/Trash/delete.ts

```/Core/Trash/delete.ts diff
@@ -26 +26 @@ import type { CascadeReport } from '../Nexus/cascade'
 import type { MutateReply, MutateRequest } from '../Nexus/mutateRequest'
 import { machine } from '../Platform/machine'
 import { discardFile } from './discard'
-import { contentPages, mintBundle, openBundle, originPathOf, pageIdsOf } from '../Bundles/bundle'
+import { contentPages, mintBundle, openBundle, pageIdsOf, spendBundle } from '../Bundles/bundle'
+import { originPathOf } from '../Bundles/layout'
 import {
   buildContextRecord,
   gatherContextEvidence,
@@ -36 +37 @@ import {
 import { gatherContentRecord, type RecordFile, writeRecord } from '../Bundles/record'
 import { liftSetAside } from '../Nexus/folderEntity'
 
-/** A delete naming an Archive bundle takes the item inside it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the bundle it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
+/** A delete naming an Archive bundle, or an inner item of one, takes it to the Trash under the chain it was archived from, so a Trash restore returns it there, and its record keeps the address it left for the Undo. Its pages' index rows sit at their Archive paths, while Link values name them where they lived. */
 async function fromArchive(root: string, req: Extract<MutateRequest, { op: 'delete' }>) {
   if (!isArchived(req.path)) return null
   const resolved = await resolveUnderRoot(root, req.path)
-  const opened = resolved.ok ? await openBundle(root, resolved.value) : null
-  if (!opened?.ok) return NOT_HELD
-  const { abs: bundle, store, record: held, artifact: abs } = opened.value
+  if (!resolved.ok) return NOT_HELD
+  const opened = await openBundle(root, resolved.value)
+  if (!opened.ok) return NOT_HELD
+  const { store, record: held, artifact: abs } = opened.value
   if (store.kind !== 'archive' || !abs) return NOT_HELD
   if ((held.entity !== 'page' && held.entity !== 'set') || held.entity !== req.kind) return NOT_HELD
   const pages = await contentPages(held.entity, abs)
   const sets = held.entity === 'set' ? await archivedSetIds(root, abs) : []
   return ok({
-    bundle,
+    opened: opened.value,
     abs,
     origin: join(root, originPathOf(root, store, abs)),
     under: pages.map((file) => relative(root, file)),
     keys: pages.map((file) => originPathOf(root, store, file)),
     edit: sets.length ? goneContainers(sets) : null,
-    record: { ...held, archive: relative(root, bundle) },
+    record: { ...held, archive: relative(root, resolved.value) },
   })
 }
 /** A Context's or Space's delete note: every title it still owed and the current one leave, with the bundle a finish moves the folder into. */
@@ -131 +133 @@ export async function deleteOp(
       else await machine().lock(abs, () => discardFile(root, abs, deps))
       moved = true
       if (archive) await machine().lock(archive.abs, () => discardFile(root, archive.abs, deps))
-      if (from) await removeOwn(from.bundle)
+      if (from) await spendBundle(root, from.opened)
       else await dropDeparture(root, before, req.kind, req.path)
       await dropPageMetadata(root, pageIds)
     }
```

##### Core/Trash/discard.ts

```/Core/Trash/discard.ts diff
@@ -3 +3 @@ import { machine } from '../Platform/machine'
 import { pathExists } from '../Files/atomicWrite'
 import { noteOwn, recordWrite } from '../Files/writeEcho'
 import type { HostContext } from '../Contract/handlers'
-import { chainDir, fileStamp, stampedLeaf } from '../Bundles/bundle'
+import { chainDir } from '../Bundles/bundle'
+import { fileStamp, stampedLeaf } from '../Bundles/layout'
 import type { TrashMode } from './trashMode'
 
 export async function trashFileFlat(nexusRoot: string, absPath: string): Promise<string> {
```

##### Core/Trash/spend.ts

```/Core/Trash/spend.ts diff
@@ -1 +1 @@
-import { basename, dirname, join, relative } from '../Paths/posix'
+import { dirname, join, relative } from '../Paths/posix'
 import { contextKey } from '../Contexts/contexts'
 import { spaceIdsIn } from '../Contexts/spaceSidecar'
 import type { MutateOutcome, MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
@@ -18 +18 @@ import {
   openBundle,
   type OpenBundle,
   originPagesOf,
-  originPathOf,
   pageIdsOf,
+  spendBundle,
 } from '../Bundles/bundle'
-import { collectionOf, originOf, recordedPartly } from '../Bundles/record'
-import { readJsonObject, relocate, removeOwn } from '../Files/atomicWrite'
+import { originPathOf } from '../Bundles/layout'
+import { archivedRecord, collectionOf, originOf, recordedPartly } from '../Bundles/record'
+import { readJsonObject, relocate } from '../Files/atomicWrite'
 import { dropPageMetadata } from '../Nexus/pageMetadata'
 import { dropContextOrder } from '../Nexus/reorder'
 import { machine } from '../Platform/machine'
@@ -89 +90 @@ export async function emptyBundle(
   const archive = record.entity === 'collection' ? await collectionArchive(root, record.id) : null
   const pages = await contentPages(record.entity, artifactAbs)
   const pageIds = await pageIdsOf([...pages, ...(archive?.files ?? [])])
-  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key. Noted first, keyed by the bundle, so what the strip misses is owed and parked as a finish strips it.
+  // Permanent now, a Collection's Archive with it: a Link value naming one of their pages, recorded by the delete or taken up since, names nothing any more unless another trashed page answers its key. Noted first, keyed by what it empties, so what the strip misses is owed and parked as a finish strips it.
   const id = relative(root, bundleAbs)
   const noted = await editNote(root, id, () => ({
     kind: 'container',
@@ -106 +107 @@ export async function emptyBundle(
   if (archive) await dispose(archive.abs)
   await dropPageMetadata(root, pageIds)
   if (record.entity === 'context') await dropContextOrder(root, record.registry.id)
-  await removeOwn(bundleAbs)
+  await spendBundle(root, opened.value)
   const recorded = 'links' in record ? (record.links ?? []) : []
   await parkLinks(root, recorded)
   return ok({ cascade: owedReport(root, await finishEntry(root, id, deps)) })
@@ -129 +130 @@ export async function restoreTrashed(
     const { unrestored, dropped, ...said } = rebuilt.value
     await parkLinks(root, dropped)
     // A value that no longer fits is named rather than kept: the property is back, so its record could only ever refuse.
-    await removeOwn(bundleAbs)
+    await spendBundle(root, bundle)
     return ok({ ...restored(unrestored), ...said })
   }
   if (!artifactAbs)
@@ -190 +191 @@ export async function restoreTrashed(
     if (!committed.ok) return committed
   }
   try {
-    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
+    // The Undo of a delete from the Archive files back at the address its record keeps, in the Archive that holds it now, reconciled as any Trash restore, and nothing lands in the tree.
     if (into && (record.entity === 'page' || record.entity === 'set')) {
       const origin = join(root, originPathOf(root, store, artifactAbs))
-      const { archive, links, targets, partial, ...filed } = record
-      targetAbs = join(
-        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
-        finalName,
-      )
+      const filed = await archivedRecord(record, artifactAbs)
+      targetAbs = (await fileInto(root, into, origin, artifactAbs, filed, dir)).landed
     } else {
       await machine().mkdir(dirname(targetAbs))
       await relocate(artifactAbs, targetAbs)
@@ -294 +292 @@ export async function restoreTrashed(
     recordedPartly(stored, title),
   )
   // The record outlives a partial re-tag, so what didn't come back stays written down.
-  if (!unspent.length) await removeOwn(bundleAbs)
+  if (!unspent.length) await spendBundle(root, bundle)
   const left = originOf(stored)
   if (!into) await refileLanded(root, record, left && collectionOf(left), dir)
   return ok({
```

##### Core/Trash/trashedCopies.ts

```/Core/Trash/trashedCopies.ts diff
@@ -2 +2 @@
 
 import { join, relative } from '../Paths/posix'
 import { SPACE_SIDECAR } from '../Paths/nexusPaths'
-import { readLinkText } from '../Connections/linkValue'
+import { linkedPage } from '../Connections/linkValue'
 import { buildPageIndex, type PageIndex, pageKey } from '../Connections/pageIndex'
 import type { StrippedLink } from '../Nexus/cascade'
 import type { Frozen } from '../Nexus/governedRoot'
@@ -38 +38 @@ export async function parkLinks(root: string, links: StrippedLink[]): Promise<vo
   const index = buildPageIndex(await originPagesIn(root, { kind: 'trash' }))
   const parked = new Map<string, StrippedLink[]>()
   for (const link of links) {
-    const page = readLinkText(link.value)
-    const bundle = page?.kind === 'page' ? index.resolve(page.title).page?.id : undefined
+    const bundle = linkedPage(link.value, index)?.id
     if (bundle) parked.set(bundle, [...(parked.get(bundle) ?? []), link])
   }
   for (const [bundle, rows] of parked) await appendLinks(bundle, rows)
```

##### Core/Views/Bands/GroupBand.tsx

```/Core/Views/Bands/GroupBand.tsx diff
@@ -177 +177 @@ function HeadedBand({
         >
           <button
             type="button"
-            className="group-band-drop-outline"
+            className="group-band-drop-outline row-chevron"
             onClick={toggle}
             aria-label={collapsed ? 'Expand group' : 'Collapse group'}
           >
```

##### Core/Views/Table/TableView.tsx

```/Core/Views/Table/TableView.tsx diff
@@ -20 +20 @@ import { isCmd, isSecondaryClick } from '@pommora/uix/Interactions/chords'
 import { Cell } from '../../Properties/Cells/Cell'
 import { EntityIcon } from '../../Assets/EntityIcon'
 import { GroupBand } from '../Bands/GroupBand'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
+import { RowRail } from '@pommora/uix/Table/RowRail'
 import { memberDepth } from '../Bands/bandModel'
 import { Reveal } from '@pommora/uix/Animations/Reveal'
 import { columnIcon, columnLabel } from '../../Properties/columnDisplay'
@@ -259 +261 @@ export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
       </span>
     )
   const indent = (depth: number): string =>
-    depth > 0 ? `calc(var(--loose-inset) + var(--row-indent) * ${depth})` : 'var(--loose-inset)'
-  const groupIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`
+    depth > 0 ? `calc(var(--loose-inset) + ${rowIndent(depth)})` : 'var(--loose-inset)'
 
   const ghost = interactions.ghost.ghost
   const ghostRowProps = {
@@ -276 +277 @@ export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
     const isCollapsed = collapsed.has(g.key)
     const itemsVisible = visible && !isCollapsed
     const itemDepth = memberDepth(g.kind, depth)
-    const memberIndent = g.kind === 'tail' ? indent : groupIndent
+    const memberIndent = g.kind === 'tail' ? indent : rowIndent
     const members: React.JSX.Element[] = [
       ...g.items.flatMap((row, i) => {
         const lead = i === 0 && (g.kind !== 'tail' || !renderedAnyRow)
@@ -320 +321 @@ export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
         key={`gb-${g.key}`}
         node={bands.byKey.get(g.key)}
         bands={interactions.bandView}
-        indent={groupIndent(depth)}
+        indent={rowIndent(depth)}
       >
         {members}
       </GroupBand>,
@@ -334 +335 @@ export function TableView({ host }: { host: ViewHostApi }): React.JSX.Element {
       className={cx('table table-view', overflowing && 'overflowing')}
     >
       {interactions.iconPicker}
-      <LineZone {...interactions.listZone(groupIndent)}>
+      <LineZone {...interactions.listZone(rowIndent)}>
         <div
           className={cx(
             'table-grid',
@@ -529 +530 @@ const DataRow = memo(function DataRow({
             }}
             onClick={(e) => api.click(row, c, e)}
           >
-            {i === 0 && (
-              <span
-                className="row-rail"
-                aria-hidden="true"
-                onPointerDown={(e) => e.stopPropagation()}
-                onClick={(e) => e.stopPropagation()}
-                onContextMenu={(e) => e.stopPropagation()}
-              />
-            )}
+            {i === 0 && <RowRail />}
             {i === 0 && (
               // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a bubble guard, not a control
               <span
```

##### Core/Views/Table/table-view.css

```/Core/Views/Table/table-view.css diff
@@ -1 +1 @@
-/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip and check, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
+/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
 
 .table-view {
   /* Width is auto so the negative side margins widen the box to both glass edges while the grid's content box (and so every row) stays exactly where it was. */
@@ -22 +22 @@
 }
 
 /* Each band is itself a grid reading --cols; inline min-width forces scroll, width:100% lets the Title track eat slack. */
-.table-grid {
+.table-view .table-grid {
   width: 100%;
   zoom: calc(var(--zoom) * var(--tile-zoom, 1));
 }
@@ -36 +36 @@
   transition: grid-template-columns var(--duration-fast) var(--ease-base) !important;
 }
 
-.data-cell.cell-lead {
-  position: relative;
-  overflow: visible;
-}
 .data-cell.cell-sweep {
   background: var(--text-selection);
 }
 :root.native-highlight .data-cell.cell-sweep {
   background: var(--col-highlight);
 }
-.row-grip,
-.row-check,
-.table-view .group-band-drop-outline {
-  position: absolute;
-  left: calc(-1 * var(--rail-inset));
-  width: var(--rail-inset);
-  top: 50%;
-  transform: translateY(-50%);
-  justify-content: center;
-}
-.row-grip,
-.row-check {
-  display: inline-flex;
-  align-items: center;
-}
 .row-grip {
   color: var(--label-tertiary);
   cursor: grab;
   touch-action: none;
-  transition: opacity var(--reveal-fade) var(--ease-base);
-}
-.row-rail {
-  position: absolute;
-  top: 0;
-  bottom: 0;
-  left: calc(-1 * var(--rail-inset));
-  width: var(--rail-inset);
 }
 .row-grip:active {
   cursor: grabbing;
```

##### Desktop/Store/driver.ts

```/Desktop/Store/driver.ts diff
@@ -2 +2 @@ import { DatabaseSync } from 'node:sqlite'
 import { existsSync, renameSync } from 'node:fs'
 import { basename } from 'node:path'
 import { errText } from '@pommora/core/Contract/result'
-import { fileStamp } from '@pommora/core/Bundles/bundle'
+import { fileStamp } from '@pommora/core/Bundles/layout'
 
 export type Db = DatabaseSync
 
```

##### UIX/Controls/Checkbox.tsx

```/UIX/Controls/Checkbox.tsx diff
@@ -17 +17 @@ export function Checkbox({
   filled,
   color,
   readOnly,
+  tabIndex,
 }: {
   state: boolean
   onChange?: (next: boolean) => void
@@ -26 +27 @@ export function Checkbox({
   filled?: boolean
   color?: string
   readOnly?: boolean
+  tabIndex?: number
 }): React.JSX.Element {
   const compact = size === 'compact'
   const cls = cx(
@@ -53 +55 @@ export function Checkbox({
       aria-label={ariaLabel}
       className={cls}
       style={style}
+      tabIndex={tabIndex}
       onPointerDown={(e) => e.stopPropagation()}
       onClick={(e) => {
         e.stopPropagation()
```

##### UIX/Interactions/engine.tsx

```/UIX/Interactions/engine.tsx diff
@@ -176 +176 @@ type LineHandle = {
   'aria-describedby': string
   'data-line-row': string
 }
-type LineRowOptions = { spring?: (dragged: string) => void; open?: () => void }
+type LineRowOptions = {
+  spring?: (dragged: string) => void
+  open?: () => void
+  /** Space where the row can't lift, in place of `open`. */
+  space?: () => void
+}
 type DragItemOptions = { open?: () => void; tabStop?: boolean }
 type Active = { zone: string; id: string }
 type SlotBox = { zone: string; own: boolean; box: Box; clip: Rect | null }
@@ -195 +200 @@ type Api = {
   focusRow: (zoneId: string, from: Element, step: number) => void
   invalidate: (zoneId: string) => void
   begin: (zoneId: string, id: string, e: ReactPointerEvent) => void
-  liftKeyboard: (zoneId: string, id: string) => void
+  liftKeyboard: (zoneId: string, id: string) => boolean
   busy: () => boolean
   holdChrome: (el: HTMLDivElement | null) => void
   dispose: () => void
@@ -1006 +1011 @@ function createEngine(setChrome: (c: Chrome | null) => void): Api {
     else if (!dir) cancel()
   }
 
-  const liftKeyboard = (zoneId: string, id: string): void => {
-    if (session?.phase === 'live') return
-    pending?.()
+  const liftKeyboard = (zoneId: string, id: string): boolean => {
     const s = lift(zoneId, id, 'keyboard')
-    if (!s) return
+    if (!s) return false
     const onKey = (e: KeyboardEvent): void => keyboard(s, e)
     const onOut = (e: FocusEvent): void => {
       if (!(e.relatedTarget instanceof Node && s.el.contains(e.relatedTarget))) cancel()
@@ -1023 +1026 @@ function createEngine(setChrome: (c: Chrome | null) => void): Api {
       s.el.removeEventListener('focusout', onOut)
       outside.release()
     }
+    return true
   }
 
   // ── Pointer ──
@@ -1297 +1301 @@ export function useDragItem(id: string, { open, tabStop = true }: DragItemOption
       onPointerDown: (e: ReactPointerEvent) => api.begin(zoneId, id, e),
       onKeyDown: (e: ReactKeyboardEvent) => {
         if (e.target !== e.currentTarget || e.repeat || heldWhileBusy(api, e)) return
-        if (e.key === 'Enter' && opens) {
-          e.preventDefault()
-          run.current?.()
-        } else if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
-          e.preventDefault()
-          api.liftKeyboard(zoneId, id)
-        }
+        if (e.key !== ' ' && e.key !== 'Enter') return
+        e.preventDefault()
+        if ((e.key === 'Enter' && opens) || !api.liftKeyboard(zoneId, id)) run.current?.()
       },
       role: 'button',
       tabIndex: tabStop && (opens || !disabled) ? 0 : -1,
@@ -1339 +1339 @@ export function useLineSpring(
 
 export function useLineRow(
   id: string,
-  { spring, open }: LineRowOptions = {},
+  { spring, open, space }: LineRowOptions = {},
 ): { ref: (el: HTMLElement | null) => void; handle: LineHandle } {
   const { api, zoneId } = useZone('useLineRow')
   const springRef = useLineSpring(spring)
   const run = useLatest(open)
+  const runSpace = useLatest(space)
   const opens = open !== undefined
   const ref = useCallback(
     (el: HTMLElement | null) => {
@@ -1364 +1365 @@ export function useLineRow(
         e.preventDefault()
         if (opening) run.current?.()
         else if (step !== 0) api.focusRow(zoneId, row, step)
-        else if (!e.repeat) api.liftKeyboard(zoneId, id)
+        else if (!e.repeat && !api.liftKeyboard(zoneId, id)) (runSpace.current ?? run.current)?.()
       },
       tabIndex: -1,
       'aria-describedby': INSTRUCTIONS_ID,
@@ -1384 +1385 @@ export function LineRow({
   id,
   spring,
   open,
+  space,
   ...div
 }: { id: string } & LineRowOptions & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
-  const { ref, handle } = useLineRow(id, { spring, open })
+  const { ref, handle } = useLineRow(id, { spring, open, space })
   return <div ref={ref} {...div} {...handle} />
 }
 
```

##### UIX/Interactions/gesture.ts

```/UIX/Interactions/gesture.ts diff
@@ -158 +158 @@ export function beginPointerGesture(spec: PointerGestureSpec): GestureHandle | n
             ok = false
           }
           if (ok === false) {
+            g.active = false
             g.handlers.cancel()
             return
           }
```

##### UIX/Interactions/virtualRows.ts

```/UIX/Interactions/virtualRows.ts diff
@@ -1 +1 @@
 import { type Key, useLayoutEffect, useState } from 'react'
-import { useVirtualizer } from '@tanstack/react-virtual'
+import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
 
-/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top. `deps` re-measure where the list sits whenever what lies above it changes. */
+/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top, and the row at `keep` drawn wherever it sits, with its neighbours, so the row focus last stood on outlives scrolling out of view and the arrows still step from it, since a removed element takes its focus with it. `deps` re-measure where the list sits whenever what lies above it changes. */
 export function useVirtualRows(
   {
     count,
     rowHeight,
     listEl,
     scrollEl,
-  }: { count: number; rowHeight: number; listEl: HTMLElement | null; scrollEl: HTMLElement | null },
+    keep = null,
+  }: {
+    count: number
+    rowHeight: number
+    listEl: HTMLElement | null
+    scrollEl: HTMLElement | null
+    keep?: number | null
+  },
   deps: readonly unknown[],
 ): { height: number; rows: { key: Key; index: number; start: number }[] } {
   const [margin, setMargin] = useState(0)
@@ -24 +31 @@ export function useVirtualRows(
     estimateSize: () => rowHeight,
     overscan: 6,
     scrollMargin: margin,
+    rangeExtractor: (range) => {
+      const drawn = defaultRangeExtractor(range)
+      if (keep === null) return drawn
+      const kept = [keep - 1, keep, keep + 1].filter((i) => i >= 0 && i < count)
+      if (kept.every((i) => drawn.includes(i))) return drawn
+      return [...new Set([...drawn, ...kept])].sort((a, b) => a - b)
+    },
   })
   return {
     height: virtual.getTotalSize(),
```

##### UIX/Menus/MenuRows.tsx

```/UIX/Menus/MenuRows.tsx diff
@@ -78 +78 @@ type MenuItemProps = {
   centered?: boolean
   disabled?: boolean
   inert?: boolean
-  /** Shows every reveal target in the row, as while any row of its list is checked. */
-  revealed?: boolean
   indent?: number
   tabIndex?: number
   onClick?: (e: MouseEvent<HTMLDivElement>) => void
@@ -105 +103 @@ export function MenuItem({
   centered = false,
   disabled = false,
   inert = false,
-  revealed = false,
   indent = 0,
   tabIndex,
   onClick,
@@ -139 +136 @@ export function MenuItem({
         className,
       )}
       style={rowStyle}
-      data-reveal-host={inert ? undefined : revealed ? 'on' : ''}
+      data-reveal-host={inert ? undefined : ''}
       role={act ? 'button' : undefined}
       tabIndex={act ? (tabIndex ?? 0) : undefined}
       onClick={act}
```

##### UIX/Table/RowRail.tsx

```/UIX/Table/RowRail.tsx diff
@@ -0 +1 @@
+/** The gutter beside a row's lead cell, drawn as part of the row so a hover arriving straight at its rail slot reveals what sits there; a press, click, or right-click on it reaches nothing. */
+export function RowRail(): React.JSX.Element {
+  return (
+    <span
+      className="row-rail"
+      aria-hidden="true"
+      onPointerDown={(e) => e.stopPropagation()}
+      onClick={(e) => e.stopPropagation()}
+      onContextMenu={(e) => e.stopPropagation()}
+    />
+  )
+}
```

##### UIX/Table/rowIndent.ts

```/UIX/Table/rowIndent.ts diff
@@ -0 +1 @@
+/** How far a row at `depth` steps in from its lead, by the table's `--row-indent`. */
+export const rowIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`
```

##### UIX/Table/table.css

```/UIX/Table/table.css diff
@@ -8 +8 @@
   align-items: stretch;
 }
 
-/* For a heading that already sits under chrome of its own, such as the Trash's inset hairline. */
-.table.is-clear {
-  --heading-fill: none;
-  --heading-divider: none;
-}
-
 .table-head {
   /* The one place a heading's type is set — TableView's and ArchiveView's .col-header and the Trash's head inherit it. */
   font-size: var(--text-callout-size);
@@ -88 +82 @@
   text-overflow: ellipsis;
   white-space: nowrap;
 }
+/* The lead cell seats its row's rail slot in the gutter beside it. */
+.data-cell.cell-lead {
+  position: relative;
+  overflow: visible;
+}
 .cell-rename {
   display: flex;
   align-items: center;
@@ -106 +105 @@
 }
 /* Absolutely placed so they add no track width; the radius reuses the bar width so the thin caps fully round. */
 .col-header:not(:last-child)::after,
-.col-header:first-child::before,
-.table-divider::after {
+.col-header:first-child::before {
   content: "";
   position: absolute;
   top: 50%;
@@ -119 +117 @@
   background: var(--heading-segment);
   pointer-events: none;
 }
-.table-divider {
-  position: relative;
-}
 .col-header:first-child::before {
   left: 0;
 }
@@ -196 +191 @@
 .cell-title-text {
   color: var(--label-primary);
 }
+/* A disclosure chevron in a table is muted. */
+.table [data-drop-outline] {
+  color: var(--label-tertiary);
+}
+/* The rail slot directly left of a row's icon, centering its grip, its check, or a band's or nested row's chevron. */
+.row-grip,
+.row-check,
+.table .row-chevron {
+  position: absolute;
+  left: calc(-1 * var(--rail-inset));
+  width: var(--rail-inset);
+  top: 50%;
+  transform: translateY(-50%);
+  display: inline-flex;
+  align-items: center;
+  justify-content: center;
+}
+.row-rail {
+  position: absolute;
+  top: 0;
+  bottom: 0;
+  left: calc(-1 * var(--rail-inset));
+  width: var(--rail-inset);
+}
+.row-grip,
+.row-check {
+  transition: opacity var(--reveal-fade) var(--ease-base);
+}
 .cell-text-scroll {
   display: inline-block;
   max-width: 100%;
```

##### UIX/Utilities/checkSet.ts

```/UIX/Utilities/checkSet.ts diff
@@ -4 +4 @@ export function toggled<T>(prev: ReadonlySet<T>, key: T): ReadonlySet<T> {
   return next
 }
 
-export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): ReadonlySet<T> {
-  const next = new Set([...prev].filter((k) => live.has(k)))
+export function retained<T>(prev: ReadonlySet<T>, keep: (key: T) => boolean): ReadonlySet<T> {
+  const next = new Set([...prev].filter(keep))
   return next.size === prev.size ? prev : next
 }
 
```

---

##### Core/Actions/columnMenu.test.ts

```/Core/Actions/columnMenu.test.ts diff
@@ -68 +68 @@ describe('styleMenuItems', () => {
       ['Relative', 'style:date_format:relative'],
       ['Full', 'style:weekday:long'],
       ['Short', 'style:weekday:short'],
-      ['Hidden', 'style:weekday:none'],
+      ['Show Day', 'style:weekday:long'],
       ['12 Hours', 'style:time_format:twelveHour'],
       ['24 Hours', 'style:time_format:twentyFourHour'],
-      ['Hidden', 'style:time_format:none'],
+      ['Show Time', 'style:time_format:shown'],
     ])
     expect(rows.find((r) => r.action === 'style:weekday:long')?.separatorBefore).toBe(true)
     expect(rows.find((r) => r.action === 'style:time_format:twelveHour')?.separatorBefore).toBe(
       true,
     )
-    expect(rows.filter((r) => r.checked).map((r) => r.action)).toEqual([
-      'style:date_format:full',
-      'style:weekday:none',
-      'style:time_format:none',
-    ])
+    expect(rows.filter((r) => r.checked).map((r) => r.action)).toEqual(['style:date_format:full'])
   })
 
   it('offers no weekday under a numeric or Relative form, as the Date editor hides its Day row', () => {
@@ -91 +87 @@ describe('styleMenuItems', () => {
     }
   })
 
-  it('offers the Relative date radio and Full/Short/Hidden weekday radios', () => {
-    const rows = items('dateTime', { date_format: 'full', time_format: 'none', weekday: 'none' })
-    expect(rows.find((r) => r.action === 'style:date_format:relative')?.label).toBe('Relative')
-    expect(
-      rows.filter((r) => r.action?.startsWith('style:weekday:')).map((r) => [r.label, r.action]),
-    ).toEqual([
-      ['Full', 'style:weekday:long'],
-      ['Short', 'style:weekday:short'],
-      ['Hidden', 'style:weekday:none'],
+  it('a shown weekday and time check their form and close each group with an unchecked Hide row', () => {
+    const rows = items('dateTime', {
+      date_format: 'full',
+      time_format: 'twentyFourHour',
+      weekday: 'short',
+    })
+    expect(rows.slice(5).map((r) => [r.label, r.action, r.checked])).toEqual([
+      ['Full', 'style:weekday:long', false],
+      ['Short', 'style:weekday:short', true],
+      ['Hide Day', 'style:weekday:none', false],
+      ['12 Hours', 'style:time_format:twelveHour', false],
+      ['24 Hours', 'style:time_format:twentyFourHour', true],
+      ['Hide Time', 'style:time_format:none', false],
     ])
   })
 
@@ -158 +158 @@ describe('parseStyleAction', () => {
     expect(parseStyleAction('style:weekday:long')).toEqual({ key: 'weekday', value: 'long' })
   })
 
+  it('accepts a time shown on the Nexus clock', () => {
+    expect(parseStyleAction('style:time_format:shown')).toEqual({
+      key: 'time_format',
+      value: 'shown',
+    })
+  })
+
   it('rejects non-style or malformed actions', () => {
     expect(parseStyleAction('align:left')).toBeNull()
     expect(parseStyleAction('style:bogus_key:x')).toBeNull()
```

##### Core/Archive/ArchiveView.test.tsx

```/Core/Archive/ArchiveView.test.tsx diff
@@ -16 +16 @@ import { resetUndo } from '../Session/undo'
 import { storesChanged } from '../Session/nexusSlice'
 import { captureWarm, clearWarm } from '../Session/warmCache'
 import type { CollectionNode, SetNode } from '../Nexus/tree'
+import { dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
 
-vi.mock('@pommora/uix/Interactions/virtualRows', () => ({
-  useVirtualRows: ({ count, rowHeight }: { count: number; rowHeight: number }) => ({
-    height: count * rowHeight,
-    rows: Array.from({ length: count }, (_, index) => ({
-      key: index,
-      index,
-      start: index * rowHeight,
-    })),
-  }),
-}))
+vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))
 vi.mock('../MarkdownPM/MarkdownEditor', () => ({
   MarkdownEditor: (p: { initialBody: string }) =>
     createElement('div', { className: 'stub-editor' }, p.initialBody),
@@ -43 +36 @@ const archived = (title: string, over: Partial<BundleRow> = {}): BundleRow => {
   })
 }
 
+const SET_BUNDLE = '.nexus/archive/c1/Notes/2026-10-20T12-00-00-000Z__Ideas.archived'
+
+const archivedSet = (): BundleRow =>
+  bundleRow({ title: 'Ideas', kind: 'set', bundlePath: SET_BUNDLE })
+
+const inner = (title: string, over: Partial<BundleRow> = {}): BundleRow => {
+  const bundlePath = `${SET_BUNDLE}/Ideas/${title}.md`
+  return bundleRow({
+    title,
+    bundlePath,
+    stored: { id: `id-${title}`, path: bundlePath },
+    crumbs: [
+      { kind: 'collection', title: 'Notes' },
+      { kind: 'set', title: 'Ideas' },
+    ],
+    ...over,
+  })
+}
+
 describe('ArchiveView', () => {
   let host: HTMLDivElement
   let root: Root
@@ -50 +62 @@ describe('ArchiveView', () => {
   let list: ReturnType<typeof vi.fn>
   let mutated: ReturnType<typeof vi.fn>
   let picked: string | null
+  let menu: ReturnType<typeof vi.fn>
   let readable: boolean
+  let children: Record<string, BundleRow[]>
   const tree = makeTree()
   const collection = tree.collections[0] as CollectionNode
   const set = collection.sets[0] as SetNode
@@ -68 +82 @@ describe('ArchiveView', () => {
       ),
     )
   const rowEls = (): HTMLElement[] => [
-    ...host.querySelectorAll<HTMLElement>('.archive-rows .data-row'),
+    ...host.querySelectorAll<HTMLElement>('.bundle-rows .data-row'),
   ]
   const titles = (): string[] =>
     rowEls().map((r) => r.querySelector('.cell-title-text')?.textContent ?? '')
@@ -89 +103 @@ describe('ArchiveView', () => {
   const check = async (...rows: string[]): Promise<void> => {
     for (const title of rows) await act(async () => rowOf(title).click())
   }
+  const press = async (title: string, detail: number): Promise<void> =>
+    act(async () => {
+      rowOf(title).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
+    })
+  const doubleClick = async (title: string): Promise<void> => {
+    await press(title, 1)
+    await press(title, 2)
+    await act(async () => {
+      rowOf(title).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
+    })
+  }
+  const indentOf = (title: string): string =>
+    (rowOf(title).querySelector('.cell-title')?.parentElement as HTMLElement).style.marginLeft
+  const chevronOf = (title: string): Element | null =>
+    rowOf(title).querySelector('[data-drop-outline]')
   const undo = async (): Promise<void> => {
     mutated.mockClear()
     await act(async () => {
@@ -101 +130 @@ describe('ArchiveView', () => {
     listed = [archived('A', { stored: { id: 'p1', path: 'x/A.md' } })]
     picked = null
     readable = true
+    children = {}
     mutated = vi.fn(async () => ({ ok: true, value: {} }))
     list = vi.fn(async () => ({ ok: true, value: listed }))
+    menu = vi.fn(async () => ({ ok: true, value: picked }))
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
       'bundles:list': list,
-      menu: vi.fn(async () => ({ ok: true, value: picked })),
+      'bundles:children': vi.fn(async (addresses: string[]) => ({
+        ok: true,
+        value: addresses.map((address) => children[address] ?? []),
+      })),
+      menu,
       mutate: mutated,
       'delete:facts': vi.fn(async () => ({
         ok: true,
@@ -143 +178 @@ describe('ArchiveView', () => {
     await render()
     expect(list).toHaveBeenCalledWith({ kind: 'archive', id: 'c1' }, undefined)
     expect(titles()).toEqual(['Newer', 'Older'])
-    const cell = rowOf('Newer').querySelector('.cell-lead')
-    expect(cell?.lastElementChild?.textContent).toBe('Notes›Ideas')
-    const dates = rowEls().map((r) => r.querySelector('.data-cell.archive-date')?.textContent ?? '')
+    expect(rowOf('Newer').querySelector('.bundle-trail')?.textContent).toBe('Notes›Ideas')
+    const dates = rowEls().map((r) => r.querySelector('.bundle-date')?.textContent ?? '')
     expect(dates.every((d) => d !== '')).toBe(true)
     expect(dates[0]).not.toBe(dates[1])
   })
@@ -156 +190 @@ describe('ArchiveView', () => {
     expect(heads.map((h) => h.querySelectorAll('.col-header-icon svg').length)).toEqual([1, 1])
   })
 
-  it('a click on a row checks it, and a page row’s title opens the reader titled by its trail under the filled lock', async () => {
+  it('a page row’s click checks it, and its double-click opens the reader titled by its trail under the filled lock, leaving it checked whether or not it started checked', async () => {
     await render()
-    await check('A')
+    await press('A', 1)
     expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
-    const title = rowOf('A').querySelector('.cell-title') as HTMLElement
-    await act(async () => title.click())
+    expect(useSession.getState().reader).toBeNull()
+    await press('A', 1)
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('false')
+    await doubleClick('A')
     expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
     expect(useSession.getState().reader).toEqual({
       kind: 'archive',
@@ -169 +205 @@ describe('ArchiveView', () => {
       trail: [expect.objectContaining({ title: 'Notes' }), expect.objectContaining({ title: 'A' })],
     })
     expect(host.querySelector('.reader-lock svg rect[fill="currentColor"]')).not.toBeNull()
+    await act(async () => useSession.setState({ reader: null }))
+    await doubleClick('A')
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
+    expect(useSession.getState().reader?.page).toEqual({ kind: 'page', id: 'p1', path: 'x/A.md' })
   })
 
-  it('a Set row’s title opens nothing and checks its row', async () => {
-    listed = [archived('Ideas', { kind: 'set' })]
+  it('Space checks and unchecks any row, and Enter discloses a Set and opens a page’s reader, leaving it checked', async () => {
+    listed = [archivedSet(), archived('A')]
+    children = { [SET_BUNDLE]: [inner('P')] }
     await render()
-    const title = rowOf('Ideas').querySelector('.cell-title') as HTMLElement
-    await act(async () => title.click())
-    expect(useSession.getState().reader).toBeNull()
+    const key = async (title: string, k: string): Promise<void> =>
+      act(async () => {
+        rowOf(title).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
+      })
+    await key('Ideas', ' ')
     expect(boxOf('Ideas')?.getAttribute('aria-checked')).toBe('true')
+    expect(titles()).toEqual(['Ideas', 'A'])
+    await key('Ideas', 'Enter')
+    expect(titles()).toEqual(['Ideas', 'P', 'A'])
+    await key('A', ' ')
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
+    await key('A', ' ')
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('false')
+    expect(useSession.getState().reader).toBeNull()
+    await key('A', 'Enter')
+    expect(boxOf('A')?.getAttribute('aria-checked')).toBe('true')
+    expect(useSession.getState().reader?.page).toMatchObject({ kind: 'page', id: 'id-A' })
+  })
+
+  it('an inner page’s double-click opens the reader titled by its row’s trail, then the page', async () => {
+    listed = [archivedSet()]
+    children = { [SET_BUNDLE]: [inner('P')] }
+    await render()
+    await press('Ideas', 1)
+    await doubleClick('P')
+    expect(useSession.getState().reader).toEqual(
+      expect.objectContaining({
+        trail: ['Notes', 'Ideas', 'P'].map((title) => expect.objectContaining({ title })),
+      }),
+    )
+  })
+
+  it('a Set row’s click discloses its inner rows beneath it, indented, with its chevron open; a second click folds them, and a double-click leaves them open', async () => {
+    listed = [archivedSet(), archived('A')]
+    children = { [SET_BUNDLE]: [inner('P')] }
+    await render()
+    expect(chevronOf('Ideas')?.classList.contains(dropOutlineOpen)).toBe(false)
+    expect(chevronOf('A')).toBeNull()
+    await press('Ideas', 1)
+    expect(titles()).toEqual(['Ideas', 'P', 'A'])
+    expect([indentOf('Ideas'), indentOf('P'), indentOf('A')]).toEqual([
+      rowIndent(0),
+      rowIndent(1),
+      rowIndent(0),
+    ])
+    expect(chevronOf('Ideas')?.classList.contains(dropOutlineOpen)).toBe(true)
+    expect(boxOf('Ideas')?.getAttribute('aria-checked')).toBe('false')
+    await press('Ideas', 1)
+    expect(titles()).toEqual(['Ideas', 'A'])
+    await doubleClick('Ideas')
+    expect(titles()).toEqual(['Ideas', 'P', 'A'])
+    expect(useSession.getState().reader).toBeNull()
+  })
+
+  it('a double-click on a page’s box opens nothing', async () => {
+    await render()
+    const box = boxOf('A') as HTMLElement
+    for (const detail of [1, 2])
+      await act(async () => {
+        box.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
+      })
+    await act(async () => {
+      box.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
+    })
+    expect(useSession.getState().reader).toBeNull()
+  })
+
+  it('an inner row shows its trail: its bundle’s trail, then the containers inside the bundle', async () => {
+    listed = [archivedSet()]
+    children = { [SET_BUNDLE]: [inner('P')] }
+    await render()
+    await press('Ideas', 1)
+    expect(rowOf('P').querySelector('.bundle-trail')?.textContent).toBe('Notes›Ideas')
+  })
+
+  it('publishes the count of top rows, whatever an open Set discloses', async () => {
+    listed = [archivedSet(), archived('A')]
+    children = { [SET_BUNDLE]: [inner('P'), inner('Q')] }
+    await render()
+    await press('Ideas', 1)
+    expect(titles()).toEqual(['Ideas', 'P', 'Q', 'A'])
+    expect(useSession.getState().detailCount).toBe(2)
+  })
+
+  it('a checked Set and its checked page restore once, as the Set', async () => {
+    listed = [archivedSet()]
+    children = { [SET_BUNDLE]: [inner('P')] }
+    await render()
+    await press('Ideas', 1)
+    await act(async () => (boxOf('Ideas') as HTMLElement).click())
+    await press('P', 1)
+    await pressBar('Restore')
+    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: SET_BUNDLE }]])
   })
 
   it('the header names its owner with Archive in its trailing slot after the search’s clear button', async () => {
@@ -198 +328 @@ describe('ArchiveView', () => {
     expect(host.querySelector('.banner-empty .detail-title-text')?.textContent).toBe('Notes')
   })
 
-  it('an empty archive reads its one line', async () => {
+  it('an empty archive reads its one line and leaves no Tab stop', async () => {
     listed = []
     await render()
     expect(empty()).toBe("This Collection's archive is empty.")
+    expect(host.querySelector('.line-zone')).toBeNull()
   })
 
   it('a top-level Set’s empty archive reads the Set’s line', async () => {
@@ -211 +342 @@ describe('ArchiveView', () => {
     expect(empty()).toBe("This Set's archive is empty.")
   })
 
-  it('a listing that fails reads its one line and draws no rows', async () => {
+  it('a listing that fails reads its one line and draws no rows or Tab stop', async () => {
     await render()
     expect(titles()).toEqual(['A'])
     list.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
     await act(async () => storesChanged.emit())
     expect(titles()).toEqual([])
     expect(empty()).toBe("The archive couldn't be read.")
+    expect(host.querySelector('.line-zone')).toBeNull()
   })
 
   it('narrows in place by the tab’s search, keeping archived order', async () => {
@@ -229 +361 @@ describe('ArchiveView', () => {
     expect(titles()).toEqual(['Beta Two', 'Beta One'])
   })
 
-  it('a search that hides every row reads Nothing matches.', async () => {
+  it('a search that hides every row reads Nothing matches. and leaves no Tab stop', async () => {
     await render()
     expect(empty()).toBeNull()
     await act(async () =>
@@ -237 +369 @@ describe('ArchiveView', () => {
     )
     expect(titles()).toEqual([])
     expect(empty()).toBe('Nothing matches.')
+    expect(host.querySelector('.line-zone')).toBeNull()
   })
 
   it('declares its bar while rows are checked, reading their count, and withdraws it when parked', async () => {
@@ -266 +399 @@ describe('ArchiveView', () => {
     ])
   })
 
-  it('the bar’s Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo archives each item again where the tree now holds it, under the bundle name it left', async () => {
+  it('the bar’s Restore of one row posts Restored “A”, and of two Restored 2 Pages, whose Undo sends each reply’s own request where the tree now holds the item', async () => {
     listed = [
       archived('A', { stored: { id: 'p1', path: 'x/A.md' } }),
       archived('B', { stored: { id: 'p2', path: 'x/B.md' } }),
     ]
+    const undoOf = (bundlePath: string, path: string) => ({
+      op: 'archive',
+      path,
+      kind: 'page',
+      at: bundlePath,
+      name: path.split('/').at(-1),
+    })
+    const landed = ['Notes/Alpha.md', 'Notes/Ideas/Beta.md']
+    mutated.mockImplementation(async ({ op, bundlePath }: { op: string; bundlePath: string }) => {
+      const at = listed.findIndex((r) => r.bundlePath === bundlePath)
+      return { ok: true, value: op === 'restore' ? { undo: undoOf(bundlePath, landed[at]) } : {} }
+    })
     await render()
     await check('A')
     await pressBar('Restore')
@@ -282 +427 @@ describe('ArchiveView', () => {
     expect(currentNotification()?.message).toBe('Restored 2 Pages')
     await undo()
     expect(mutated.mock.calls).toEqual([
-      [
-        {
-          op: 'archive',
-          path: 'Notes/Alpha.md',
-          kind: 'page',
-          leaf: '2026-10-20T12-00-00-000Z__A.md.archived',
-        },
-      ],
-      [
-        {
-          op: 'archive',
-          path: 'Notes/Ideas/Beta.md',
-          kind: 'page',
-          leaf: '2026-10-20T12-00-00-000Z__B.md.archived',
-        },
-      ],
+      [undoOf(listed[0].bundlePath, 'Notes/Alpha.md')],
+      [undoOf(listed[1].bundlePath, 'Notes/Ideas/Beta.md')],
     ])
   })
 
@@ -356 +487 @@ describe('ArchiveView', () => {
     expect(currentNotification()).toBeNull()
   })
 
-  it('the bar’s Restore of a row whose place is gone asks where and restores there, and a batch restores the rest and says what had nowhere to go', async () => {
-    listed = [archived('Gone', { homeResolves: false }), archived('Kept')]
+  it('the bar’s Restore of a disclosed inner page whose place is gone asks where and restores there, and a mixed batch asks once, sending only that row there', async () => {
+    const gone = inner('Gone', { homeResolves: false })
+    listed = [archivedSet(), archived('Kept')]
+    children = { [SET_BUNDLE]: [gone] }
     picked = collection.id
     await render()
+    await press('Ideas', 1)
     await check('Gone')
     await pressBar('Restore')
     expect(mutated.mock.calls).toEqual([
       [
         {
           op: 'restore',
-          bundlePath: listed[0].bundlePath,
+          bundlePath: gone.bundlePath,
           destination: { kind: 'container', id: collection.id },
         },
       ],
@@ -375 +509 @@ describe('ArchiveView', () => {
     act(() => clearNotification())
     await check('Kept')
     mutated.mockClear()
+    menu.mockClear()
     await pressBar('Restore')
-    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: listed[1].bundlePath }]])
-    expect(currentNotification()).toMatchObject({
-      message:
-        'Restored 1 Page. 1 Page had nowhere to go — restore those one at a time to choose where.',
-      tone: 'error',
-    })
+    expect(menu).toHaveBeenCalledTimes(1)
+    expect(mutated.mock.calls).toEqual([
+      [
+        {
+          op: 'restore',
+          bundlePath: gone.bundlePath,
+          destination: { kind: 'container', id: collection.id },
+        },
+      ],
+      [{ op: 'restore', bundlePath: listed[1].bundlePath }],
+    ])
+    expect(currentNotification()?.message).toBe('Restored 2 Pages')
   })
 
   it('a search that hides the checked row withdraws the bar and shows no box', async () => {
@@ -421 +562 @@ describe('ArchiveView', () => {
         return held.get(this) ?? 0
       },
       set(this: Element, top: number) {
-        const rows = this.querySelector<HTMLElement>('.archive-rows')
+        const rows = this.querySelector<HTMLElement>('.bundle-rows')
         held.set(this, Math.min(top, Number.parseFloat(rows?.style.height ?? '') || 0))
       },
     })
@@ -466 +607 @@ describe('ArchiveView', () => {
     })
     await render()
     await check('A', 'B')
-    await act(async () => (rowOf('A').querySelector('.cell-title') as HTMLElement).click())
+    await doubleClick('A')
+    expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
+    await pressBar('Restore')
+    expect(useSession.getState().reader).toBeNull()
+  })
+
+  it('a batch restore closes an open reader of an inner page', async () => {
+    listed = [archivedSet()]
+    children = { [SET_BUNDLE]: [inner('P')] }
+    mutated.mockImplementation(async () => {
+      readable = false
+      return { ok: true, value: {} }
+    })
+    await render()
+    await press('Ideas', 1)
+    await doubleClick('P')
     expect(host.querySelector('[aria-label="Archived Page"]')).not.toBeNull()
     await pressBar('Restore')
+    expect(mutated.mock.calls).toEqual([[{ op: 'restore', bundlePath: inner('P').bundlePath }]])
     expect(useSession.getState().reader).toBeNull()
   })
 })
```

##### Core/Archive/archive.test.ts

```/Core/Archive/archive.test.ts diff
@@ -1 +1 @@
 import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { basename, join } from '../Paths/posix'
-import { readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
+import {
+  bytesUnder,
+  putJson,
+  readJsonAt,
+  refuseWrites,
+  seedNexus,
+  tempRoot,
+} from '../Testing/hostFs'
 import { settledMutate } from '../Testing/settledMutate'
 import * as atomicWrite from '../Files/atomicWrite'
 import * as record from '../Bundles/record'
@@ -23 +30 @@ import { readNexus } from '../Nexus/readNexus'
 import { nexusPages } from '../Nexus/heldPages'
 import { minted, type MutateReply, type RestoreDestination } from '../Nexus/mutateRequest'
 import { writeExcludedFolders } from '../Settings/settings'
-import { type BundleStore, listBundles, mintBundle } from '../Bundles/bundle'
-import { readRecord, writeRecord } from '../Bundles/record'
+import { readNotes } from '../Nexus/owed'
+import { listBundles, mintBundle } from '../Bundles/bundle'
+import type { BundleStore } from '../Bundles/layout'
+import { readRawRecord, readRecord, writeRecord } from '../Bundles/record'
 import { bundleRows } from '../Bundles/rows'
 import { NO_DESTINATION } from '../Bundles/placement'
 import type { TrashDeps } from '../Trash/discard'
@@ -35 +44 @@ const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
 const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
 const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
 const PAGE_K = '01KVGMT8BFP350FZZXAMG1QDVK'
+const OTHER = '01KVGMT8BFP350FZZXAMG1QDO0'
+const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
+const SHELF = '01KVGMT8BFP350FZZXAMG1QDH0'
+const PAGE_D = '01KVGMT8BFP350FZZXAMG1QDVD'
+const THIRD = '01KVGMT8BFP350FZZXAMG1QDT0'
+const THIRD_DAILY = '01KVGMT8BFP350FZZXAMG1QDY0'
+const PAGE_X = '01KVGMT8BFP350FZZXAMG1QDVX'
+const DEEP = `---\nID: ${PAGE_D}\n---\ndeep\n`
 const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }
 const ARCHIVE: BundleStore = { kind: 'archive', id: NOTES }
 const BETA = `---\nID: ${PAGE_B}\n---\nbeta\n`
@@ -59 +76 @@ const archive = async (path: string, kind: 'page' | 'set' = 'page'): Promise<str
 const restore = (bundlePath: string, destination?: RestoreDestination): Promise<MutateReply> =>
   mutate({ op: 'restore', bundlePath, ...(destination ? { destination } : {}) })
 const INTO_NOTES: RestoreDestination = { kind: 'container', id: NOTES }
+const undo = (r: MutateReply): Promise<MutateReply> => {
+  if (!r.ok || !r.value.undo) throw new Error('The reply carries no Undo.')
+  return mutate(r.value.undo)
+}
 
 beforeEach(async () => {
   root = tempRoot('pom-archive-')
@@ -216 +237 @@ describe('archive — a page or Set leaves for its Collection’s Archive', () =
     ).toEqual(['Notes/Daily/Private'])
   })
 
-  it('an archive handed the bundle name its item left takes it back, and one naming another name or a path takes a fresh stamp', async () => {
-    const rearchive = async (path: string, leaf: string): Promise<string> => {
-      const r = await mutate({ op: 'archive', path, kind: 'page', leaf })
+  it('an archive handed the bundle address its item left takes its name back, and one naming another name or a path outside the store takes a fresh stamp', async () => {
+    const rearchive = async (path: string, at: string): Promise<string> => {
+      const r = await mutate({ op: 'archive', path, kind: 'page', at })
       expect(r.ok).toBe(true)
       return r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
     }
     const first = await archive('Notes/Daily/Beta.md')
     expect((await restore(first)).ok).toBe(true)
-    expect(await rearchive('Notes/Daily/Beta.md', basename(first))).toBe(first)
+    expect(await rearchive('Notes/Daily/Beta.md', first)).toBe(first)
     expect((await restore(first)).ok).toBe(true)
     const renamed = await mutate({
       op: 'rename',
@@ -233 +254 @@ describe('archive — a page or Set leaves for its Collection’s Archive', () =
       newName: 'Beta 2',
     })
     expect(renamed.ok).toBe(true)
-    const second = await rearchive('Notes/Daily/Beta 2.md', basename(first))
+    const second = await rearchive('Notes/Daily/Beta 2.md', first)
     expect(second).toMatch(
       new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta 2\\.md\\.archived$`),
     )
@@ -290 +311 @@ describe('restore — an archived item comes back by a plain move', () => {
     expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Notes/Beta|Beta]]`)
   })
 
+  it('a page pulled from an archived Set restores by a plain move to a given container', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    expect((await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)).ok).toBe(true)
+    expect(await text('Notes', 'Beta.md')).toBe(BETA)
+    expect((await readdir(at(bundlePath, 'Daily'))).sort()).toEqual([
+      'Alpha.md',
+      'Gamma.md',
+      '_pageset.json',
+    ])
+  })
+
+  it('a nested Set pulled from an archived Set lands with its pages, and carries what was archived from within it into the landing Collection’s Archive', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    const KEPT = '01KVGMT8BFP350FZZXAMG1QDVE'
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${KEPT}\n---\nkept\n`)
+    await reseed()
+    await archive('Notes/Daily/Sub/Kept.md')
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const r = await restore(join(bundlePath, 'Daily', 'Sub'), { kind: 'container', id: OTHER })
+    expect(r.ok).toBe(true)
+    expect((await readdir(at('Other', 'Sub'))).sort()).toEqual(['Deep.md', '_pageset.json'])
+    expect((await readdir(at(bundlePath, 'Daily'))).sort()).toEqual([
+      'Alpha.md',
+      'Beta.md',
+      'Gamma.md',
+      '_pageset.json',
+    ])
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([bundlePath])
+    const [refiled, ...rest] = await listBundles(root, { kind: 'archive', id: OTHER })
+    expect(rest).toEqual([])
+    expect(refiled).toMatchObject({
+      artifactName: 'Kept.md',
+      record: { id: KEPT, parent: { kind: 'container', id: SUB }, trail: [OTHER] },
+    })
+  })
+
+  it('a Set restored into another Collection is put back by its Undo with what was archived from within it, each on the trail it was archived on', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const beta = await archive('Notes/Daily/Beta.md')
+    const record = await readFile(at(beta, '_record.json'), 'utf8')
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(daily, { kind: 'container', id: OTHER })
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toHaveLength(1)
+    expect((await undo(restored)).ok).toBe(true)
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath).sort()).toEqual(
+      [beta, daily].sort(),
+    )
+    expect(await readFile(at(beta, '_record.json'), 'utf8')).toBe(record)
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
+  })
+
+  it('a Set pulled from an archived Set into another Collection is put back by its Undo with what was archived from within it', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    const KEPT = '01KVGMT8BFP350FZZXAMG1QDVE'
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${KEPT}\n---\nkept\n`)
+    await reseed()
+    const kept = await archive('Notes/Daily/Sub/Kept.md')
+    const record = await readFile(at(kept, '_record.json'), 'utf8')
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(join(daily, 'Daily', 'Sub'), { kind: 'container', id: OTHER })
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toHaveLength(1)
+    expect((await undo(restored)).ok).toBe(true)
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath).sort()).toEqual(
+      [daily, kept].sort(),
+    )
+    expect(await readFile(at(kept, '_record.json'), 'utf8')).toBe(record)
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
+  })
+
+  it('a Set restored under another Set in its Collection is put back by its Undo with what was archived from within it on the trail it was archived on', async () => {
+    await putJson(at('Notes', 'Shelf', '_pageset.json'), { id: SHELF })
+    await reseed()
+    const beta = await archive('Notes/Daily/Beta.md')
+    const record = await readFile(at(beta, '_record.json'), 'utf8')
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(daily, { kind: 'container', id: SHELF })
+    expect(await readRawRecord(at(beta))).toMatchObject({ trail: [NOTES, SHELF] })
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await readFile(at(beta, '_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('a Set pulled from an archived Set under another Set in its Collection is put back by its Undo with what was archived from within it on the trail it was archived on', async () => {
+    await putJson(at('Notes', 'Shelf', '_pageset.json'), { id: SHELF })
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    const KEPT = '01KVGMT8BFP350FZZXAMG1QDVE'
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Kept.md'), `---\nID: ${KEPT}\n---\nkept\n`)
+    await reseed()
+    const kept = await archive('Notes/Daily/Sub/Kept.md')
+    const record = await readFile(at(kept, '_record.json'), 'utf8')
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(join(daily, 'Daily', 'Sub'), { kind: 'container', id: SHELF })
+    expect(await readRawRecord(at(kept))).toMatchObject({ trail: [NOTES, SHELF] })
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await readFile(at(kept, '_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('a page pulled from an archived Set and restored is put back by its Undo inside the Set’s bundle, at its folder', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const inner = join(bundlePath, 'Daily', 'Beta.md')
+    const before = await bytesUnder(at(bundlePath))
+    expect((await restore(inner, INTO_NOTES)).ok).toBe(true)
+    const r = await mutate({ op: 'archive', path: 'Notes/Beta.md', kind: 'page', at: inner })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
+    expect(await pathExists(at('Notes', 'Beta.md'))).toBe(false)
+    expect(await bytesUnder(at(bundlePath))).toEqual(before)
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([bundlePath])
+  })
+
+  it('a page pulled from an archived Set into another Collection is put back by its Undo inside the Set’s bundle', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const inner = join(bundlePath, 'Daily', 'Beta.md')
+    const before = await bytesUnder(at(bundlePath))
+    expect((await restore(inner, { kind: 'container', id: OTHER })).ok).toBe(true)
+    const r = await mutate({ op: 'archive', path: 'Other/Beta.md', kind: 'page', at: inner })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
+    expect(await bytesUnder(at(bundlePath))).toEqual(before)
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
+  })
+
+  it('a Set pulled from an archived Set is put back by its Undo inside the Set’s bundle', async () => {
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+    await reseed()
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const inner = join(bundlePath, 'Daily', 'Sub')
+    const before = await bytesUnder(at(bundlePath))
+    expect((await restore(inner, INTO_NOTES)).ok).toBe(true)
+    const r = await mutate({ op: 'archive', path: 'Notes/Sub', kind: 'set', at: inner })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath: inner })
+    expect(await pathExists(at('Notes', 'Sub'))).toBe(false)
+    expect(await bytesUnder(at(bundlePath))).toEqual(before)
+  })
+
+  it('a page pulled from an archived Set and renamed is put back by its Undo under its new name', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    expect((await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)).ok).toBe(true)
+    const renamed = {
+      op: 'rename',
+      path: 'Notes/Beta.md',
+      kind: 'page',
+      newName: 'Beta 2',
+    } as const
+    expect((await mutate(renamed)).ok).toBe(true)
+    const r = await mutate({
+      op: 'archive',
+      path: 'Notes/Beta 2.md',
+      kind: 'page',
+      at: join(bundlePath, 'Daily', 'Beta.md'),
+    })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath: join(bundlePath, 'Daily', 'Beta 2.md') })
+    expect(await text(bundlePath, 'Daily', 'Beta 2.md')).toBe(BETA)
+    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('a restore’s reply carries the archive request that puts the item back as it was archived', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const raw = await readRawRecord(at(bundlePath))
+    const r = await restore(bundlePath)
+    expect(r.ok && r.value.undo).toEqual({
+      op: 'archive',
+      path: 'Notes/Daily/Beta.md',
+      kind: 'page',
+      at: bundlePath,
+      name: 'Beta.md',
+      record: raw,
+    })
+    const set = await archive('Notes/Daily', 'set')
+    const inner = join(set, 'Daily', 'Alpha.md')
+    const pulled = await restore(inner, INTO_NOTES)
+    expect(pulled.ok && pulled.value.undo).toEqual({
+      op: 'archive',
+      path: 'Notes/Alpha.md',
+      kind: 'page',
+      at: inner,
+      name: 'Alpha.md',
+    })
+  })
+
+  it('a homeless restore’s Undo files the item back at its address with the record it was archived with', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    expect((await mutate({ op: 'delete', path: 'Notes/Daily', kind: 'set' })).ok).toBe(true)
+    const r = await undo(await restore(bundlePath, INTO_NOTES))
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
+    expect(message(await restore(bundlePath))).toBe('The place this belonged to no longer exists.')
+  })
+
+  it('a step-aside restore’s Undo files the item back under its own name at its address', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))
+    const restored = await restore(bundlePath)
+    expect(restored.ok && restored.value.landedAs).toBe('Beta (2)')
+    const r = await undo(restored)
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await text(bundlePath, 'Beta.md')).toBe(BETA)
+    expect(await readFile(at(bundlePath, '_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('a step-aside restore’s Undo leaves a link naming the stepped-aside name where its own name names another', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))
+    const restored = await restore(bundlePath)
+    expect(restored.ok && restored.value.landedAs).toBe('Beta (2)')
+    await writeFile(at('Notes', 'Linker.md'), `---\nID: ${PAGE_K}\n---\n[[Beta (2)]]`)
+    await reseed()
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Beta (2)]]`)
+  })
+
+  it('a restore into another Collection is put back by its Undo into the Archive it left', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const r = await undo(await restore(bundlePath, { kind: 'container', id: OTHER }))
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await text(bundlePath, 'Beta.md')).toBe(BETA)
+    expect(await listBundles(root, { kind: 'archive', id: OTHER })).toEqual([])
+  })
+
+  it('a step-aside restore’s Undo re-spells the links its restore moved to the stepped-aside name back to the name it files the item under', async () => {
+    await writeFile(
+      at('Notes', 'Daily', 'Gamma.md'),
+      `---\nID: ${PAGE_G}\n---\nsee [[Notes/Daily/Alpha]]\n`,
+    )
+    await reseed()
+    const bundlePath = await archive('Notes/Daily', 'set')
+    await putJson(at('Notes', 'Daily', '_pageset.json'), { id: SUB })
+    await reseed()
+    const restored = await restore(bundlePath)
+    expect(restored.ok && restored.value.landedAs).toBe('Daily (2)')
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Notes/Daily (2)/Beta|Beta]]`,
+    )
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Beta|Beta]]`,
+    )
+    expect(await text(bundlePath, 'Daily', 'Gamma.md')).toBe(
+      `---\nID: ${PAGE_G}\n---\nsee [[Notes/Daily/Alpha|Alpha]]\n`,
+    )
+  })
+
+  it('a restore’s Undo re-spells the links its restore moved with a Set renamed meanwhile back to where it files the item', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const renamed = await mutate({
+      op: 'rename',
+      path: 'Notes/Daily',
+      kind: 'set',
+      newName: 'Journal',
+    })
+    expect(renamed.ok).toBe(true)
+    const restored = await restore(bundlePath)
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Notes/Journal/Beta|Beta]]`,
+    )
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Beta|Beta]]`,
+    )
+  })
+
+  it('a restore into another Collection has its Undo re-spell the links it moved back to where it files the item', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const restored = await restore(bundlePath, { kind: 'container', id: OTHER })
+    expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Other/Beta|Beta]]`)
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(`---\nID: ${PAGE_K}\n---\n[[Daily/Beta|Beta]]`)
+  })
+
+  it('a restore into another Collection whose shorter spelling a live page holds has its Undo re-spell the links to the whole path', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const restored = await restore(bundlePath, { kind: 'container', id: OTHER })
+    await putJson(at('Third', '_pagecollection.json'), { id: THIRD })
+    await putJson(at('Third', 'Daily', '_pageset.json'), { id: THIRD_DAILY })
+    await writeFile(at('Third', 'Daily', 'Beta.md'), `---\nID: ${PAGE_X}\n---\nthird`)
+    await reseed()
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Beta|Beta]]`,
+    )
+  })
+
+  it('an inner Set restored into another Collection has its Undo re-spell the links it moved back to where it files the Set', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+    await writeFile(at('Notes', 'Linker.md'), `---\nID: ${PAGE_K}\n---\n[[Notes/Daily/Sub/Deep]]`)
+    await reseed()
+    const daily = await archive('Notes/Daily', 'set')
+    const restored = await restore(join(daily, 'Daily', 'Sub'), { kind: 'container', id: OTHER })
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Other/Sub/Deep|Deep]]`,
+    )
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await text('Notes', 'Linker.md')).toBe(
+      `---\nID: ${PAGE_K}\n---\n[[Daily/Sub/Deep|Deep]]`,
+    )
+  })
+
+  it('an inner item restored under a stepped-aside name is put back by its Undo under the name it held', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const before = await bytesUnder(at(bundlePath))
+    await mutate(minted({ op: 'createPage', parentPath: 'Notes', name: 'Beta' }))
+    const restored = await restore(join(bundlePath, 'Daily', 'Beta.md'), INTO_NOTES)
+    expect(restored.ok && restored.value.landedAs).toBe('Beta (2)')
+    expect((await undo(restored)).ok).toBe(true)
+    expect(await bytesUnder(at(bundlePath))).toEqual(before)
+  })
+
+  it('an Undo whose address is taken mints a fresh stamp in that chain, with its record and its own name', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const record = await readFile(at(bundlePath, '_record.json'), 'utf8')
+    await mutate(minted({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Beta' }))
+    const restored = await restore(bundlePath)
+    await mkdir(at(bundlePath))
+    const r = await undo(restored)
+    const filed = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+    expect(filed).not.toBe(bundlePath)
+    expect(filed).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
+    )
+    expect(await text(filed, 'Beta.md')).toBe(BETA)
+    expect(await readFile(at(filed, '_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('an Undo files the item into the Archive of the Collection its origin sits in now, at its address there, on its trail now', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const raw = await readRawRecord(at(bundlePath))
+    const restored = await restore(bundlePath)
+    if (!restored.ok || restored.value.undo?.op !== 'archive') throw new Error('No Undo.')
+    const moved = await mutate({
+      op: 'moveSet',
+      path: 'Notes/Daily',
+      newParentPath: 'Other',
+      order: [DAILY],
+    })
+    expect(moved.ok).toBe(true)
+    const r = await mutate({ ...restored.value.undo, path: 'Other/Daily/Beta.md' })
+    const carried = bundlePath.replace(`/${NOTES}/`, `/${OTHER}/`)
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath: carried })
+    expect(await text(carried, 'Beta.md')).toBe(BETA)
+    expect(await readRawRecord(at(carried))).toEqual({ ...raw, trail: [OTHER] })
+    expect(await listBundles(root, ARCHIVE)).toEqual([])
+  })
+
+  it('an Undo whose origin and Archive are both gone for good records the item afresh in its own Collection’s Archive', async () => {
+    const GONE = '01KVGMT8BFP350FZZXAMG1QDZ0'
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const raw = await readRawRecord(at(bundlePath))
+    const restored = await restore(bundlePath)
+    if (!restored.ok || restored.value.undo?.op !== 'archive') throw new Error('No Undo.')
+    const r = await mutate({
+      ...restored.value.undo,
+      at: bundlePath.replace(`/${NOTES}/`, `/${GONE}/`),
+      record: { ...raw, parent: { kind: 'container', id: SUB }, trail: [GONE] },
+    })
+    const filed = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+    expect(filed).toBe(bundlePath)
+    expect(await readRawRecord(at(filed))).toEqual(raw)
+    expect(await pathExists(at('.nexus', 'archive', GONE))).toBe(false)
+  })
+
+  it('an archive carrying a record of the other kind, or an address outside an Archive, records the item afresh from where it stands', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const raw = await readRawRecord(at(bundlePath))
+    expect((await restore(bundlePath, INTO_NOTES)).ok).toBe(true)
+    const afresh = async (at: string, carried: unknown): Promise<void> => {
+      const r = await mutate({
+        op: 'archive',
+        path: 'Notes/Beta.md',
+        kind: 'page',
+        at,
+        name: 'Beta.md',
+        record: carried as Record<string, unknown>,
+      })
+      const filed = r.ok ? (r.value.bundled?.bundlePath ?? '') : ''
+      expect(filed).toMatch(
+        new RegExp(`^\\.nexus/archive/${NOTES}/Notes/[^/]+__Beta\\.md\\.archived$`),
+      )
+      expect(await readRecord(join(root, filed))).toMatchObject({
+        id: PAGE_B,
+        parent: { kind: 'container', id: NOTES },
+      })
+      expect((await restore(filed)).ok).toBe(true)
+    }
+    await afresh(bundlePath, { ...raw, entity: 'set' })
+    await afresh(
+      `.trash/Notes/Daily/${basename(bundlePath).replace(/\.archived$/, '.deleted')}`,
+      raw,
+    )
+  })
+
+  it('an archive’s carried record keeps only where the item left from, its identity read from the file', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const raw = await readRawRecord(at(bundlePath))
+    const restored = await restore(bundlePath)
+    if (!restored.ok || restored.value.undo?.op !== 'archive') throw new Error('No Undo.')
+    const forged = {
+      ...raw,
+      id: PAGE_A,
+      icon: 'moon',
+      archive: '.nexus/archive/elsewhere',
+      links: [{ page: PAGE_K, property: 'prop_related', value: '[[Beta]]' }],
+      targets: { beta: { id: PAGE_A, path: 'Notes/Daily/Alpha.md' } },
+      partial: true,
+    }
+    const r = await mutate({ ...restored.value.undo, record: forged })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await readRawRecord(at(bundlePath))).toEqual(raw)
+  })
+
+  it('an archive asking for a name no page may take, a hidden one among them, files it under its own', async () => {
+    const bundlePath = await archive('Notes/Daily/Beta.md')
+    const restored = await restore(bundlePath)
+    if (!restored.ok || restored.value.undo?.op !== 'archive') throw new Error('No Undo.')
+    const r = await mutate({ ...restored.value.undo, name: '_Beta.md' })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await readdir(at(bundlePath))).toEqual(['Beta.md', '_record.json'])
+  })
+
+  it('a Set archive asking for a page’s name files it under its own', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const restored = await restore(bundlePath)
+    if (!restored.ok || restored.value.undo?.op !== 'archive') throw new Error('No Undo.')
+    const r = await mutate({ ...restored.value.undo, name: 'Daily.md' })
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await readdir(at(bundlePath))).toEqual(['Daily', '_record.json'])
+  })
+
+  it('a step-aside restore’s Undo files a page back under a name it held that no page may be given', async () => {
+    const PAGE_C = '01KVGMT8BFP350FZZXAMG1QDVC'
+    const PAGE_N = '01KVGMT8BFP350FZZXAMG1QDVN'
+    await writeFile(at('Notes', 'Daily', 'C# Notes.md'), `---\nID: ${PAGE_C}\n---\nc\n`)
+    await reseed()
+    const bundlePath = await archive('Notes/Daily/C# Notes.md')
+    await writeFile(at('Notes', 'Daily', 'C# Notes.md'), `---\nID: ${PAGE_N}\n---\nn\n`)
+    await reseed()
+    const restored = await restore(bundlePath)
+    expect(restored.ok && restored.value.landedAs).toBe('C# Notes (2)')
+    const r = await undo(restored)
+    expect(r.ok && r.value.bundled).toEqual({ bundlePath })
+    expect(await readdir(at(bundlePath))).toEqual(['C# Notes.md', '_record.json'])
+  })
+
+  it('an inner item refused as homeless leaves its bundle byte-identical', async () => {
+    const bundlePath = await archive('Notes/Daily', 'set')
+    const before = await bytesUnder(at(bundlePath))
+    expect(message(await restore(join(bundlePath, 'Daily', 'Beta.md')))).toBe(
+      'The place this belonged to no longer exists.',
+    )
+    expect(await bytesUnder(at(bundlePath))).toEqual(before)
+  })
+
   it('a restore landing on a taken name steps aside and says so', async () => {
     const bundlePath = await archive('Notes/Daily/Beta.md')
     const created = await mutate(
@@ -421 +912 @@ describe('a delete from the Archive', () => {
   })
 
   it('an archived Set takes the views naming it and its sub-Sets', async () => {
-    const SUB = '01KVGMT8BFP350FZZXAMG1QDS0'
     await mkdir(at('Notes', 'Daily', 'Sub'), { recursive: true })
     await writeFile(at('Notes', 'Daily', 'Sub', '_pageset.json'), JSON.stringify({ id: SUB }))
     const filter = (rules: unknown[]) => ({ match: 'all', rules })
@@ -452 +942 @@ describe('a delete from the Archive', () => {
     )
   })
 
+  it('an inner item’s delete takes it to the Trash, its record naming the address it held', async () => {
+    const archived = await archive('Notes/Daily', 'set')
+    const inner = join(archived, 'Daily', 'Beta.md')
+    const trashed = await trash(inner)
+    expect(trashed).toMatch(/^\.trash\/Notes\/Daily\/[^/]+__Beta\.md\.deleted$/)
+    expect(await text(trashed, 'Beta.md')).toBe(BETA)
+    expect(await readRecord(at(trashed))).toMatchObject({
+      entity: 'page',
+      id: PAGE_B,
+      archive: inner,
+    })
+    expect((await readdir(at(archived, 'Daily'))).sort()).toEqual([
+      'Alpha.md',
+      'Gamma.md',
+      '_pageset.json',
+    ])
+  })
+
+  it('an inner Set’s delete owes the view edit naming it and its sub-Sets', async () => {
+    const DEEPER = '01KVGMT8BFP350FZZXAMG1QDS1'
+    await putJson(at('Notes', 'Daily', 'Sub', 'Deeper', '_pageset.json'), { id: DEEPER })
+    await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+    const sidecar = at('Notes', '_pagecollection.json')
+    await putJson(sidecar, {
+      id: NOTES,
+      views: [
+        {
+          id: 'view_1',
+          name: 'V',
+          type: 'table',
+          filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [SUB] }] },
+        },
+      ],
+    })
+    await reseed()
+    const archived = await archive('Notes/Daily', 'set')
+    refuseWrites('editJsonStrict', (file) => file === sidecar)
+    await trash(join(archived, 'Daily', 'Sub'), 'set')
+    const [owed] = Object.values(await readNotes(root))
+    const edit = owed?.kind === 'container' ? owed.edit : undefined
+    expect(edit?.kind === 'gone' && [...edit.ids].sort()).toEqual([SUB, DEEPER])
+  })
+
   it('refuses a kind its record doesn’t carry', async () => {
     const archived = await archive('Notes/Daily/Beta.md')
     const r = await mutate({ op: 'delete', path: archived, kind: 'set' })
@@ -498 +1031 @@ describe('a delete from the Archive', () => {
     expect(daily?.pages.map((p) => p.title)).toEqual(['Alpha', 'Gamma'])
   })
 
+  it('an inner item’s Undo returns it inside its Set’s bundle, its Link values back', async () => {
+    const archived = await archive('Notes/Daily', 'set')
+    const inner = join(archived, 'Daily', 'Beta.md')
+    const before = await bytesUnder(at(archived))
+    const trashed = await trash(inner)
+    expect(await related()).toBeUndefined()
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    expect(await bytesUnder(at(archived))).toEqual(before)
+    expect((await listBundles(root, ARCHIVE)).map((b) => b.bundlePath)).toEqual([archived])
+    expect(await related()).toBe('[[Beta]]')
+    expect(await pathExists(at(trashed))).toBe(false)
+  })
+
+  it('an inner item’s Undo after its Set’s restore returns it as its own Archive row', async () => {
+    const archived = await archive('Notes/Daily', 'set')
+    const trashed = await trash(join(archived, 'Daily', 'Beta.md'))
+    expect((await restore(archived)).ok).toBe(true)
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    const [own, ...rest] = await listBundles(root, ARCHIVE)
+    expect(rest).toEqual([])
+    expect(own.bundlePath).toMatch(
+      new RegExp(`^\\.nexus/archive/${NOTES}/Notes/Daily/[^/]+__Beta\\.md\\.archived$`),
+    )
+    expect(own.record).toMatchObject({
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: DAILY },
+    })
+    expect(await text(own.bundlePath, 'Beta.md')).toBe(BETA)
+    expect(await related()).toBe('[[Beta]]')
+    expect(heldTreeOf(root)?.collections[0].sets[0].pages.map((p) => p.title)).toEqual([
+      'Alpha',
+      'Gamma',
+    ])
+  })
+
+  describe('once a live Set above its archived Set moves into another Collection', () => {
+    const IN_OTHER: BundleStore = { kind: 'archive', id: OTHER }
+    /** `Notes/Daily/Sub` archived, its `Deep.md` deleted out of it, and `Daily` moved into Other, carrying `Sub`'s bundle into Other's Archive. */
+    const deletedThenMoved = async (): Promise<{ trashed: string; carried: string }> => {
+      await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+      await putJson(at('Notes', 'Daily', 'Sub', '_pageset.json'), { id: SUB })
+      await writeFile(at('Notes', 'Daily', 'Sub', 'Deep.md'), DEEP)
+      await reseed()
+      const archived = await archive('Notes/Daily/Sub', 'set')
+      const trashed = await trash(join(archived, 'Sub', 'Deep.md'))
+      const moved = await mutate({
+        op: 'moveSet',
+        path: 'Notes/Daily',
+        newParentPath: 'Other',
+        order: [DAILY],
+      })
+      expect(moved.ok).toBe(true)
+      const carried = archived.replace(`/${NOTES}/`, `/${OTHER}/`)
+      expect((await listBundles(root, IN_OTHER)).map((b) => b.bundlePath)).toEqual([carried])
+      return { trashed, carried }
+    }
+
+    it('an inner item’s Undo returns it inside its Set’s carried bundle', async () => {
+      const { trashed, carried } = await deletedThenMoved()
+      const before = await bytesUnder(at(carried))
+      expect((await restore(trashed, UNDO)).ok).toBe(true)
+      expect(await bytesUnder(at(carried))).toEqual({
+        ...before,
+        [at(carried, 'Sub', 'Deep.md')]: DEEP,
+      })
+      expect(await listBundles(root, ARCHIVE)).toEqual([])
+      expect((await listBundles(root, IN_OTHER)).map((b) => b.bundlePath)).toEqual([carried])
+    })
+
+    it('an inner item’s Undo after its Set’s restore returns it as its own row in that Collection’s Archive', async () => {
+      const { trashed, carried } = await deletedThenMoved()
+      expect((await restore(carried)).ok).toBe(true)
+      expect((await restore(trashed, UNDO)).ok).toBe(true)
+      expect(await listBundles(root, ARCHIVE)).toEqual([])
+      const [own, ...rest] = await listBundles(root, IN_OTHER)
+      expect(rest).toEqual([])
+      expect(own).toMatchObject({
+        artifactName: 'Deep.md',
+        record: { id: PAGE_D, parent: { kind: 'container', id: SUB } },
+      })
+      expect(await text(own.bundlePath, 'Deep.md')).toBe(DEEP)
+    })
+  })
+
+  it('its Undo files it into the Archive of the Collection its origin sits in now, on its trail now', async () => {
+    await putJson(at('Other', '_pagecollection.json'), { id: OTHER })
+    await reseed()
+    const archived = await archive('Notes/Daily/Beta.md')
+    const trashed = await trash(archived)
+    const moved = await mutate({
+      op: 'moveSet',
+      path: 'Notes/Daily',
+      newParentPath: 'Other',
+      order: [DAILY],
+    })
+    expect(moved.ok).toBe(true)
+    expect((await restore(trashed, UNDO)).ok).toBe(true)
+    const carried = archived.replace(`/${NOTES}/`, `/${OTHER}/`)
+    expect(await readRecord(at(carried))).toEqual({
+      entity: 'page',
+      id: PAGE_B,
+      parent: { kind: 'container', id: DAILY },
+      place: { above: PAGE_G, below: PAGE_A },
+      trail: [OTHER],
+    })
+    expect(await listBundles(root, ARCHIVE)).toEqual([])
+  })
+
   it('its Undo mints a fresh bundle in the same Archive once the name is taken', async () => {
     const archived = await archive('Notes/Daily/Beta.md')
     const trashed = await trash(archived)
@@ -544 +1186 @@ describe('a delete from the Archive', () => {
 
   it('a live page’s delete owes an archived linker whose strip failed, and its record stays whole', async () => {
     const linker = await archive('Notes/Linker.md')
-    const real = atomicWrite.rewritePreservingTimes
-    vi.spyOn(atomicWrite, 'rewritePreservingTimes').mockImplementation((file, data) =>
-      file.startsWith(at(linker)) ? Promise.reject(new Error('refused')) : real(file, data),
-    )
+    refuseWrites('rewritePreservingTimes', (file) => file.startsWith(at(linker)))
     const r = await mutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' })
     expect(r.ok && r.value.cascade).toMatchObject({
       warning: 'Couldn’t update 1 Item.',
```

##### Core/Archive/refile.test.ts

```/Core/Archive/refile.test.ts diff
@@ -14 +14 @@ import { closeSession, openSession } from '../Nexus/session'
 import { settleBatch, settleNow } from '../Nexus/settle'
 import type { MutateReply, RestoreDestination } from '../Nexus/mutateRequest'
 import * as bundles from '../Bundles/bundle'
-import { type BundleStore, listBundles } from '../Bundles/bundle'
+import { listBundles } from '../Bundles/bundle'
+import type { BundleStore } from '../Bundles/layout'
 import { readRecord } from '../Bundles/record'
 import type { TrashDeps } from '../Trash/discard'
 import { settleArchives } from './refile'
```

##### Core/Bundles/BundleTable.test.tsx

```/Core/Bundles/BundleTable.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { renderToStaticMarkup } from 'react-dom/server'
+import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
+import { Icon } from '@pommora/uix/Symbols'
+import { text } from '@pommora/uix/Theme'
+import { size } from '@pommora/uix/Theme/theme-vars.css'
+import { DEFAULT_ENTITY_ICONS } from '../Assets/entityIconPolicy'
+import { propertyTypeIconName } from '../Properties/typeDisplay'
+import { bundleRow } from '../Testing/fixtures'
+import { BundleRows } from './BundleTable'
+import type { TreeRow } from './browser'
+import type { BundleRow } from './rows'
+
+vi.mock('@pommora/uix/Interactions/virtualRows', async () => ({
+  useVirtualRows: vi.fn((await import('../Testing/virtualRows')).useVirtualRows),
+}))
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+const COLLECTION = '.trash/2026-10-20T12-00-00-000Z__Notes.deleted'
+const SET = `${COLLECTION}/Notes/Ideas`
+
+const tree = (row: BundleRow, depth: number, open: boolean | null): TreeRow => ({
+  row,
+  depth,
+  open,
+})
+const nested = (): TreeRow[] => [
+  tree(bundleRow({ title: 'Notes', kind: 'collection', bundlePath: COLLECTION }), 0, true),
+  tree(bundleRow({ title: 'Ideas', kind: 'set', bundlePath: SET }), 1, false),
+  tree(bundleRow({ title: 'P', bundlePath: `${COLLECTION}/Notes/P.md` }), 1, null),
+]
+
+describe('BundleRows', () => {
+  let host: HTMLDivElement
+  let root: Root
+  const toggle = vi.fn()
+  const rowClick = vi.fn()
+  const openMenu = vi.fn(async () => {})
+
+  const render = async (visible: TreeRow[], checked: string[] = []) =>
+    act(async () =>
+      root.render(
+        <BundleRows
+          browser={{
+            visible,
+            checked: new Set(checked),
+            picked: visible.filter((t) => checked.includes(t.row.bundlePath)).map((t) => t.row),
+            date: {
+              when: () => 'Today',
+              onContextMenu: vi.fn(),
+              sample: '',
+              measureRef: vi.fn(),
+              width: null,
+            },
+            toggle,
+            rowClick,
+            openMenu,
+          }}
+          scrollEl={null}
+        />,
+      ),
+    )
+  const rowEls = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>('.data-row')]
+  const rowOf = (title: string): HTMLElement =>
+    rowEls().find((r) => r.querySelector('.cell-title-text')?.textContent === title) as HTMLElement
+  const chevronOf = (title: string): Element | null =>
+    rowOf(title).querySelector('[data-drop-outline]')
+  const boxOf = (title: string): HTMLButtonElement =>
+    rowOf(title).querySelector('[role="checkbox"]') as HTMLButtonElement
+  const key = async (el: HTMLElement, k: string): Promise<void> =>
+    act(async () => {
+      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
+    })
+
+  beforeEach(() => {
+    vi.clearAllMocks()
+    host = document.body.appendChild(document.createElement('div'))
+    root = createRoot(host)
+  })
+  afterEach(async () => {
+    await act(async () => root.unmount())
+    host.remove()
+  })
+
+  it('a top-level container’s chevron follows its title, a nested one’s sits in the rail slot before its icon, and a container’s title is emphasized where a page’s is not', async () => {
+    await render(nested())
+    expect(chevronOf('Notes')?.previousElementSibling?.classList.contains('cell-title')).toBe(true)
+    const slot = chevronOf('Ideas')?.parentElement
+    expect(slot?.classList.contains('row-chevron')).toBe(true)
+    expect(slot?.nextElementSibling?.classList.contains('cell-title')).toBe(true)
+    expect(chevronOf('P')).toBeNull()
+    const emphasized = (title: string): boolean | undefined =>
+      rowOf(title).querySelector('.cell-title-text')?.classList.contains(text.body.emphasized)
+    expect([emphasized('Notes'), emphasized('Ideas'), emphasized('P')]).toEqual([true, true, false])
+  })
+
+  it('draws each row’s icon at TableView’s body size: an item’s own ahead of its kind’s, and a property’s by its type', async () => {
+    await render([
+      tree(bundleRow({ title: 'Own', icon: 'hash', bundlePath: '.trash/own' }), 0, null),
+      tree(bundleRow({ title: 'Plain', bundlePath: '.trash/plain' }), 0, null),
+      tree(
+        bundleRow({
+          title: 'Count',
+          kind: 'property',
+          propertyType: 'checkbox',
+          bundlePath: '.trash/count',
+        }),
+        0,
+        null,
+      ),
+    ])
+    const iconOf = (title: string): SVGElement =>
+      rowOf(title).querySelector('.cell-title > svg') as SVGElement
+    const glyph = (svg: Element): string[] => [svg.getAttribute('class') ?? '', svg.innerHTML]
+    const drawn = (name: string): string[] => {
+      const box = document.createElement('div')
+      box.innerHTML = renderToStaticMarkup(<Icon name={name} />)
+      return glyph(box.firstElementChild as Element)
+    }
+    expect(glyph(iconOf('Own'))).toEqual(drawn('hash'))
+    expect(glyph(iconOf('Plain'))).toEqual(drawn(DEFAULT_ENTITY_ICONS.page))
+    expect(glyph(iconOf('Count'))).toEqual(drawn(propertyTypeIconName('checkbox')))
+    expect(['Own', 'Plain', 'Count'].map((t) => iconOf(t).style.fontSize)).toEqual(
+      Array(3).fill(size.icon.body),
+    )
+  })
+
+  it('a partly recorded row shows its mark, spoken as Recorded Partly, and a whole one shows none', async () => {
+    await render([
+      tree(bundleRow({ title: 'Alpha', partial: true, bundlePath: '.trash/a' }), 0, null),
+      tree(bundleRow({ title: 'Beta', bundlePath: '.trash/b' }), 0, null),
+    ])
+    expect(
+      rowOf('Alpha').querySelector('[role="img"][aria-label="Recorded Partly"]'),
+    ).not.toBeNull()
+    expect(rowOf('Beta').querySelector('[role="img"]')).toBeNull()
+  })
+
+  it('a click anywhere on a row, its chevron included, hands rowClick its row and detail; a ctrl-click hands it nothing; a right-click opens its menu', async () => {
+    const rows = nested()
+    await render(rows)
+    await act(async () => {
+      rowOf('P').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
+      chevronOf('Notes')?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
+    })
+    expect(rowClick.mock.calls).toEqual([
+      [rows[2].row, 2],
+      [rows[0].row, 1],
+    ])
+    rowClick.mockClear()
+    await act(async () => {
+      rowOf('P').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, ctrlKey: true }))
+    })
+    expect(rowClick).not.toHaveBeenCalled()
+    await act(async () => {
+      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(openMenu).toHaveBeenCalledExactlyOnceWith(rows[2].row)
+  })
+
+  it('a container row is a tree item whose aria-expanded follows its disclosure, and a page row is one without it', async () => {
+    await render(nested())
+    expect(rowEls().map((r) => r.getAttribute('role'))).toEqual([
+      'treeitem',
+      'treeitem',
+      'treeitem',
+    ])
+    expect(rowEls().map((r) => r.getAttribute('aria-expanded'))).toEqual(['true', 'false', null])
+  })
+
+  it('the rows are one Tab stop whose arrows step between rows, whose Enter hands rowClick the focused row as a keyboard’s click, and whose Space toggles its check', async () => {
+    const rows = nested()
+    await render(rows)
+    const zone = host.querySelector('.line-zone') as HTMLElement
+    expect(zone.tabIndex).toBe(0)
+    expect(rowEls().map((r) => r.tabIndex)).toEqual([-1, -1, -1])
+    await act(async () => zone.focus())
+    expect(document.activeElement).toBe(rowOf('Notes'))
+    await key(rowOf('Notes'), 'ArrowDown')
+    expect(document.activeElement).toBe(rowOf('Ideas'))
+    await key(rowOf('Ideas'), 'Enter')
+    await key(rowOf('Ideas'), ' ')
+    expect(rowClick.mock.calls).toEqual([[rows[1].row, 0]])
+    expect(toggle).toHaveBeenCalledExactlyOnceWith(rows[1].row.bundlePath)
+  })
+
+  it('a focused row is the one the virtualizer keeps drawn', async () => {
+    await render(nested())
+    const asked = (): unknown => vi.mocked(useVirtualRows).mock.lastCall?.[0].keep
+    expect(asked()).toBeNull()
+    await act(async () => rowOf('P').focus())
+    expect(asked()).toBe(2)
+  })
+
+  it('a row’s box checks it without the row’s click, and stays out of the Tab order', async () => {
+    await render(nested())
+    expect(boxOf('Notes').tabIndex).toBe(-1)
+    await act(async () => boxOf('Notes').click())
+    expect(toggle).toHaveBeenCalledExactlyOnceWith(COLLECTION)
+    expect(rowClick).not.toHaveBeenCalled()
+  })
+
+  it('a row’s lead cell holds the hidden rail, and a click on it reaches neither the row nor its box', async () => {
+    await render(nested())
+    const rail = rowOf('P').querySelector('.cell-lead')?.firstElementChild as HTMLElement
+    expect(rail.getAttribute('aria-hidden')).toBe('true')
+    await act(async () => {
+      rail.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
+    })
+    expect(rowClick).not.toHaveBeenCalled()
+    expect(toggle).not.toHaveBeenCalled()
+  })
+
+  it('every row’s box shows while any row is checked', async () => {
+    await render(nested())
+    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['', '', ''])
+    await render(nested(), [SET])
+    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['on', 'on', 'on'])
+  })
+})
```

##### Core/Bundles/browser.test.ts

```/Core/Bundles/browser.test.ts diff
@@ -1 +1 @@
-import { describe, expect, it } from 'vitest'
-import { filterRows, widestDate } from './browser'
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import { act, createElement } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { filterRows, outermostOf, treeRows, useBundleBrowser, widestDate } from './browser'
+import type { BundleRow } from './rows'
 import { bundleRow as row } from '../Testing/fixtures'
+import { stubDialer } from '../vitest.setup'
+import { storesChanged } from '../Session/nexusSlice'
+import { currentNotification } from '../Interface/Notifications/notifications'
+import type { MutateRequest } from '../Nexus/mutateRequest'
+import { useSession } from '../Session/store'
+import { makeTree } from '../Testing/testTree'
+
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
 describe('filterRows', () => {
   const rows = [
@@ -65 +77 @@ describe('widestDate', () => {
     )
   })
 })
+
+describe('treeRows', () => {
+  const set = row({ title: 'S', kind: 'set', bundlePath: '.trash/S.deleted' })
+  const nested = row({ title: 'T', kind: 'set', bundlePath: '.trash/S.deleted/S/T' })
+  const page = row({ title: 'P', bundlePath: '.trash/S.deleted/S/T/P.md' })
+  const loose = row({ title: 'Q', bundlePath: '.trash/Q.deleted' })
+
+  it('sets each row’s depth, its open state, and null for a page', () => {
+    const open = new Map([
+      [set.bundlePath, [nested]],
+      [nested.bundlePath, [page]],
+    ])
+    expect(treeRows([set, loose], open)).toEqual([
+      { row: set, depth: 0, open: true },
+      { row: nested, depth: 1, open: true },
+      { row: page, depth: 2, open: null },
+      { row: loose, depth: 0, open: null },
+    ])
+  })
+
+  it('lists inner rows beneath an open parent only', () => {
+    const open = new Map([[nested.bundlePath, [page]]])
+    expect(treeRows([set, loose], open)).toEqual([
+      { row: set, depth: 0, open: false },
+      { row: loose, depth: 0, open: null },
+    ])
+  })
+})
+
+describe('outermostOf', () => {
+  it('acts once on a checked Set and its checked page, keeping siblings and look-alike prefixes', () => {
+    const b = row({ title: 'B', kind: 'set', bundlePath: 'A/B' })
+    const inB = row({ title: 'P', bundlePath: 'A/B/P.md' })
+    const bc = row({ title: 'Bc', bundlePath: 'A/Bc' })
+    const sibling = row({ title: 'C', bundlePath: 'A/C' })
+    expect(outermostOf([b, inB, bc, sibling])).toEqual([b, bc, sibling])
+  })
+})
+
+describe('a browser’s remembered checks', () => {
+  const set = row({ title: 'S', kind: 'set', bundlePath: '.trash/S.deleted', homeResolves: false })
+  const page = row({ title: 'P', bundlePath: '.trash/S.deleted/S/P.md', homeResolves: false })
+  const nested = row({ title: 'T', kind: 'set', bundlePath: '.trash/S.deleted/S/T' })
+  const deeper = row({ title: 'U', kind: 'set', bundlePath: '.trash/S.deleted/S/T/U' })
+  let host: HTMLDivElement
+  let root: Root
+  let browser: ReturnType<typeof useBundleBrowser>
+  let replies: ((lists: BundleRow[][]) => void)[]
+  let children: ReturnType<typeof vi.fn>
+  let listed: BundleRow[]
+  let menu: ReturnType<typeof vi.fn>
+  let mutated: ReturnType<typeof vi.fn>
+
+  const Harness = (): null => {
+    browser = useBundleBrowser({ kind: 'trash' }, { query: '', shown: true })
+    return null
+  }
+  const click = (target: BundleRow): Promise<void> => act(async () => browser.rowClick(target, 1))
+  const reply = (...lists: BundleRow[][]): Promise<void> =>
+    act(async () => replies.shift()?.(lists))
+  const relist = (): Promise<void> => act(async () => storesChanged.emit())
+  const shown = (): string[] => browser.visible.map((t) => t.row.title)
+
+  beforeEach(async () => {
+    replies = []
+    listed = [set]
+    menu = vi.fn(async () => ({ ok: true, value: null }))
+    mutated = vi.fn(async () => ({ ok: true, value: {} }))
+    children = vi.fn(
+      () => new Promise((resolve) => replies.push((lists) => resolve({ ok: true, value: lists }))),
+    )
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      menu,
+      mutate: mutated,
+      'bundles:list': vi.fn(async () => ({ ok: true, value: listed })),
+      'bundles:children': children,
+    })
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+    await act(async () => root.render(createElement(Harness)))
+    await click(set)
+    await reply([page])
+    await act(async () => browser.toggle(page.bundlePath))
+  })
+  afterEach(async () => {
+    await act(async () => root.unmount())
+    host.remove()
+    useSession.setState({ tree: null })
+  })
+
+  it('keeps an inner row’s check while its container is collapsed, out of the batch, and shows it again on reopening', async () => {
+    expect(browser.picked).toEqual([page])
+    await click(set)
+    expect(shown()).toEqual(['S'])
+    expect(browser.checked.has(page.bundlePath)).toBe(true)
+    expect(browser.picked).toEqual([])
+    await click(set)
+    await reply([page])
+    expect(shown()).toEqual(['S', 'P'])
+    expect(browser.picked).toEqual([page])
+  })
+
+  it('keeps a check its reopened container no longer lists until the next listing drops it', async () => {
+    await click(set)
+    await click(set)
+    await reply([])
+    expect(browser.checked.has(page.bundlePath)).toBe(true)
+    await relist()
+    await reply([])
+    expect(browser.checked.has(page.bundlePath)).toBe(false)
+  })
+
+  it('a listing asks once for every open container and keeps the checks their replies still list', async () => {
+    await click(set)
+    await click(set)
+    await reply([nested, page])
+    await click(nested)
+    await reply([deeper])
+    children.mockClear()
+    await relist()
+    expect(children.mock.calls).toEqual([[[set.bundlePath, nested.bundlePath]]])
+    await reply([nested, page], [deeper])
+    expect(browser.checked.has(page.bundlePath)).toBe(true)
+    expect(shown()).toEqual(['S', 'T', 'U', 'P'])
+  })
+
+  it('a listing whose reply no longer lists a checked inner row drops its check', async () => {
+    await relist()
+    await reply([])
+    expect(browser.checked.has(page.bundlePath)).toBe(false)
+  })
+
+  it('a container closed while a listing’s reply is in flight stays closed', async () => {
+    await relist()
+    await click(set)
+    await reply([page])
+    expect(browser.visible).toEqual([{ row: set, depth: 0, open: false }])
+  })
+
+  it('closing a container forgets its open descendants two levels deep', async () => {
+    await click(set)
+    await click(set)
+    await reply([nested])
+    await click(nested)
+    await reply([deeper])
+    await click(deeper)
+    await reply([])
+    await click(set)
+    await click(set)
+    await reply([nested])
+    await click(nested)
+    await reply([deeper])
+    expect(browser.visible.map((t) => t.open)).toEqual([true, true, false])
+  })
+
+  it('a keyboard’s click, with no count, discloses a container and toggles a page', async () => {
+    await act(async () => browser.rowClick(set, 0))
+    expect(shown()).toEqual(['S'])
+    await act(async () => browser.rowClick(page, 0))
+    expect(browser.checked.has(page.bundlePath)).toBe(false)
+  })
+
+  it('a page’s double-click leaves it checked, whether or not it started checked', async () => {
+    await act(async () => browser.rowClick(page, 2))
+    expect(browser.checked.has(page.bundlePath)).toBe(true)
+    await act(async () => browser.toggle(page.bundlePath))
+    await act(async () => browser.rowClick(page, 2))
+    expect(browser.checked.has(page.bundlePath)).toBe(true)
+  })
+
+  it('a checked Set and its checked page reach the bar once, as the Set', async () => {
+    await act(async () => browser.toggle(set.bundlePath))
+    expect(browser.picked).toEqual([set])
+  })
+
+  it('a batch of a homeless Space and a homeless page asks once per kind and sends each its own, and a dismissed second ask restores nothing', async () => {
+    useSession.setState({ tree: makeTree() })
+    const space = row({
+      title: 'W',
+      kind: 'space',
+      bundlePath: '.trash/W.deleted',
+      homeResolves: false,
+    })
+    const answer = (value: string | null) => ({ ok: true, value })
+    menu.mockResolvedValueOnce(answer('g1')).mockResolvedValueOnce(answer(null))
+    await act(async () => browser.restore([space, page]))
+    expect(menu).toHaveBeenCalledTimes(2)
+    expect(mutated).not.toHaveBeenCalled()
+    menu.mockResolvedValueOnce(answer('g1')).mockResolvedValueOnce(answer('c1'))
+    await act(async () => browser.restore([space, page]))
+    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
+      { op: 'restore', bundlePath: space.bundlePath, destination: { kind: 'context', id: 'g1' } },
+      { op: 'restore', bundlePath: page.bundlePath, destination: { kind: 'container', id: 'c1' } },
+    ])
+  })
+
+  it('a right-click on a checked inner page under its checked parent offers the parent’s destinations and restores the parent', async () => {
+    useSession.setState({ tree: makeTree() })
+    await act(async () => browser.toggle(set.bundlePath))
+    menu.mockResolvedValueOnce({ ok: true, value: 'restoreTo:c1' })
+    await act(async () => browser.openMenu(page))
+    expect(menu.mock.calls[0][0].items[0]).toMatchObject({
+      label: 'Restore',
+      submenu: [{ label: 'Notes' }],
+    })
+    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
+      { op: 'restore', bundlePath: set.bundlePath, destination: { kind: 'container', id: 'c1' } },
+    ])
+  })
+
+  it('leaves a container closed when its reply lands after it closed', async () => {
+    await click(set)
+    await click(set)
+    await click(set)
+    await reply([page])
+    expect(browser.visible).toEqual([{ row: set, depth: 0, open: false }])
+  })
+})
+
+describe('an Archive restore’s Undo', () => {
+  const ARCHIVED = '.nexus/archive/c1/Notes'
+  const alpha = row({
+    title: 'Alpha',
+    bundlePath: `${ARCHIVED}/2026-10-17T00-00-00-000Z__Alpha.md.archived`,
+    stored: { id: 'p1', path: 'Notes/Alpha.md' },
+  })
+  const beta = row({
+    title: 'Beta',
+    bundlePath: `${ARCHIVED}/Ideas/2026-10-17T00-00-00-000Z__Beta.md.archived`,
+    stored: { id: 'p2', path: 'Notes/Ideas/Beta.md' },
+  })
+  const record = { entity: 'page', parent: { kind: 'container', id: 's1' } }
+  const undoOf = (target: BundleRow): MutateRequest => ({
+    op: 'archive',
+    path: target.stored?.path ?? '',
+    kind: 'page',
+    at: target.bundlePath,
+    name: `${target.title}.md`,
+    record,
+  })
+  let host: HTMLDivElement
+  let root: Root
+  let browser: ReturnType<typeof useBundleBrowser>
+  let mutated: ReturnType<typeof vi.fn>
+
+  const Harness = (): null => {
+    browser = useBundleBrowser({ kind: 'archive', id: 'c1' }, { query: '', shown: true })
+    return null
+  }
+
+  beforeEach(async () => {
+    mutated = vi.fn(async (req: MutateRequest) => {
+      const target =
+        req.op === 'restore' && [alpha, beta].find((r) => r.bundlePath === req.bundlePath)
+      return { ok: true, value: target ? { undo: undoOf(target) } : {} }
+    })
+    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
+      mutate: mutated,
+      'bundles:list': vi.fn(async () => ({ ok: true, value: [alpha, beta] })),
+    })
+    useSession.setState({ tree: makeTree() })
+    host = document.createElement('div')
+    document.body.appendChild(host)
+    root = createRoot(host)
+    await act(async () => root.render(createElement(Harness)))
+  })
+  afterEach(async () => {
+    await act(async () => root.unmount())
+    host.remove()
+    useSession.setState({ tree: null })
+  })
+
+  it('sends each reply’s own request at the item’s path now, under its new name once it’s been renamed since', async () => {
+    await act(async () => browser.restore([alpha, beta]))
+    const renamed = makeTree()
+    renamed.collections[0].pages[0] = {
+      kind: 'page',
+      id: 'p1',
+      title: 'Alpha 2',
+      path: 'Notes/Alpha 2.md',
+    }
+    useSession.setState({ tree: renamed })
+    mutated.mockClear()
+    await act(async () => currentNotification()?.action?.run())
+    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
+      { ...undoOf(alpha), path: 'Notes/Alpha 2.md', name: 'Alpha 2.md' },
+      undoOf(beta),
+    ])
+    await act(async () => browser.restore([beta]))
+    mutated.mockClear()
+    await act(async () => currentNotification()?.action?.run())
+    expect(mutated.mock.calls.map(([req]) => req)).toEqual([undoOf(beta)])
+  })
+})
```

##### Core/Bundles/bundle.test.ts

```/Core/Bundles/bundle.test.ts diff
@@ -1 +1 @@
-import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
+import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { basename, dirname, join } from '../Paths/posix'
-import { tempRoot } from '../Testing/hostFs'
-import { layoutOf, listBundles, mintBundle, originPathOf, storeOf } from './bundle'
-import { writeRecord } from './record'
+import { putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
+import { seedPropertyBundle } from '../Testing/fixtures'
+import { newContentId } from '../Nexus/ids'
+import { OWED_REL } from '../Paths/nexusPaths'
+import { sidecarPath } from '../Paths/paths'
+import type { WatchScope } from '../Paths/exclusion'
+import {
+  fileInto,
+  listBundles,
+  listInner,
+  mintBundle,
+  type OpenBundle,
+  openBundle,
+  spendBundle,
+} from './bundle'
+import { patchRecord, readRawRecord, writeRecord } from './record'
 
 const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
 const TRASH = { kind: 'trash' } as const
@@ -18 +31 @@ afterEach(async () => {
   await rm(root, { recursive: true, force: true })
 })
 
-describe('layoutOf', () => {
-  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
-    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
-    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
-  })
-})
-
-describe('storeOf', () => {
-  it('answers the store a bundle sits in by its root and its suffix', () => {
-    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual(TRASH)
-    expect(storeOf('/n', `/n/.nexus/archive/${ID}/Notes/${STAMPED}__Alpha.md.archived`)).toEqual(
-      ARCHIVE,
-    )
-  })
-
-  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
-    expect(storeOf('/n', '/n/Notes/fake.deleted')).toBeNull()
-    expect(storeOf('/n', '/n/Notes/fake.archived')).toBeNull()
-    expect(storeOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
-    expect(storeOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
-    expect(storeOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
-  })
-})
-
 describe('mintBundle', () => {
   it('creates the bundle under the mirrored chain while the source stays live', async () => {
     await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
@@ -87 +76 @@ describe('mintBundle', () => {
   })
 })
 
-describe('originPathOf', () => {
-  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
-    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
-    expect(originPathOf('/n', TRASH, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
-    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
-    expect(originPathOf('/n', TRASH, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
-  })
-
-  it('reads an archived file under its Archive’s root the same way', () => {
-    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
-    expect(originPathOf('/n', ARCHIVE, `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
-  })
-
-  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
-    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
-    expect(originPathOf('/n', TRASH, `${bundle}/Notes/Old.deleted/X.md`)).toBe(
-      'Archive.deleted/Notes/Old.deleted/X.md',
-    )
-  })
-
-  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
-    expect(originPathOf('/n', TRASH, '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
-      'Notes/Alpha.md.deleted/Alpha.md',
-    )
-  })
-})
-
 describe('listBundles', () => {
   it('lists an Archive’s bundles under its own root and suffix, and none of the Trash’s', async () => {
     const seed = async (store: typeof TRASH | typeof ARCHIVE, name: string): Promise<void> => {
@@ -127 +89 @@ describe('listBundles', () => {
     expect((await listBundles(root, TRASH)).map((b) => b.artifactName)).toEqual(['Beta.md'])
   })
 })
+
+const A = 'colA'
+const S = 'setS'
+const T = 'setT'
+const OUT = newContentId('page')
+const P_ID = newContentId('page')
+const TARGETS = { '[[Q]]': { id: 'q', path: 'A/Q.md' } }
+const P_LINK = { page: OUT, property: 'Rel', value: '[[P]]' }
+const Q_LINK = { page: OUT, property: 'Rel', value: '[[Q]]' }
+const BUNDLE_REL = `.trash/${STAMPED}__A.deleted`
+const inBundle = (...segs: string[]): string => join(root, BUNDLE_REL, ...segs)
+
+/** A trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, with `Q.md` beside `S`, its record taking `record` over the defaults. */
+const seedTrashedCollection = async (record: Record<string, unknown> = {}): Promise<void> => {
+  await putJson(sidecarPath(inBundle('A'), 'collection'), { id: A })
+  await putJson(sidecarPath(inBundle('A', 'S'), 'set'), { id: S })
+  await putJson(sidecarPath(inBundle('A', 'S', 'T'), 'set'), { id: T })
+  await writeFile(inBundle('A', 'S', 'T', 'P.md'), `---\nID: ${P_ID}\n---\nbody\n`)
+  await writeFile(inBundle('A', 'Q.md'), `---\nID: ${newContentId('page')}\n---\nbody\n`)
+  await writeRecord(inBundle(), {
+    entity: 'collection',
+    id: A,
+    parent: { kind: 'root' },
+    targets: TARGETS,
+    links: [P_LINK, Q_LINK],
+    ...record,
+  })
+}
+
+const opened = async (abs: string): Promise<OpenBundle> => {
+  const read = await openBundle(root, abs)
+  if (!read.ok) throw new Error(read.error.message)
+  return read.value
+}
+
+describe('openBundle', () => {
+  it('opens a Set inside a trashed Collection under the Collection, with no trail', async () => {
+    await seedTrashedCollection()
+    const { abs, record, artifact, inner } = await opened(inBundle('A', 'S'))
+    expect({ abs, artifact, inner }).toEqual({
+      abs: inBundle(),
+      artifact: inBundle('A', 'S'),
+      inner: true,
+    })
+    expect(record).toMatchObject({ entity: 'set', id: S, parent: { kind: 'container', id: A } })
+    expect('trail' in record).toBe(false)
+  })
+
+  it('opens a page under its own Set, with the containers above as its trail, its id, the bundle’s targets, and only the kept values naming it', async () => {
+    await seedTrashedCollection()
+    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record).toEqual({
+      entity: 'page',
+      id: P_ID,
+      parent: { kind: 'container', id: T },
+      trail: [A, S],
+      targets: TARGETS,
+      links: [P_LINK],
+    })
+  })
+
+  it('opens an inner item of a trashed Set with the Set’s parent leading its trail', async () => {
+    const bundle = join(root, '.trash', 'A', `${STAMPED}__S.deleted`)
+    await putJson(sidecarPath(join(bundle, 'S', 'T'), 'set'), { id: T })
+    await writeFile(join(bundle, 'S', 'T', 'P.md'), `---\nID: ${P_ID}\n---\nbody\n`)
+    await writeRecord(bundle, { entity: 'set', id: S, parent: { kind: 'container', id: A } })
+    expect((await opened(join(bundle, 'S', 'T', 'P.md'))).record).toMatchObject({
+      parent: { kind: 'container', id: T },
+      trail: [A, S],
+    })
+  })
+
+  it('keeps with the bundle a value whose title two of its pages share', async () => {
+    await seedTrashedCollection()
+    await writeFile(inBundle('A', 'S', 'P.md'), `---\nID: ${newContentId('page')}\n---\nbody\n`)
+    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record).not.toHaveProperty('links')
+  })
+
+  it('leaves an inner item unaddressable when a folder above it has no sidecar id', async () => {
+    await seedTrashedCollection()
+    await rm(sidecarPath(inBundle('A', 'S', 'T'), 'set'))
+    const { record } = await opened(inBundle('A', 'S', 'T', 'P.md'))
+    expect(record.entity === 'page' && record.parent).toEqual({ kind: 'unaddressable' })
+    expect('trail' in record).toBe(false)
+  })
+
+  it('opens an address inside a page bundle as not-found', async () => {
+    const page = join(root, '.trash', `${STAMPED}__P.md.deleted`)
+    await mkdir(page, { recursive: true })
+    await writeFile(join(page, 'P.md'), 'body')
+    await writeRecord(page, { entity: 'page', parent: { kind: 'root' } })
+    const read = await openBundle(root, join(page, 'P.md', 'X.md'))
+    expect(!read.ok && read.error.code).toBe('not-found')
+  })
+
+  it('opens a path inside a Space bundle as not-found', async () => {
+    const space = join(root, '.trash', `${STAMPED}__Work.deleted`)
+    await mkdir(join(space, 'Work'), { recursive: true })
+    await writeFile(join(space, 'Work', 'Notes.md'), 'body')
+    await writeRecord(space, {
+      entity: 'space',
+      id: 'space_work',
+      parent: { kind: 'context', id: 'ctx_areas' },
+      members: [],
+    })
+    const read = await openBundle(root, join(space, 'Work', 'Notes.md'))
+    expect(!read.ok && read.error.code).toBe('not-found')
+  })
+
+  it('marks an inner item of a partly recorded bundle partial, and one of a whole record not', async () => {
+    await seedTrashedCollection({ partial: true })
+    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record.partial).toBe(true)
+    await seedTrashedCollection()
+    expect((await opened(inBundle('A', 'S', 'T', 'P.md'))).record.partial).toBeUndefined()
+  })
+})
+
+describe('listInner', () => {
+  const R = 'setR'
+  const Y_ID = newContentId('page')
+  const Z_ID = newContentId('page')
+  const OPEN: WatchScope = { excluded: [], assetDir: '' }
+  const listed = async (abs: string, scope = OPEN) => {
+    const read = await listInner(root, abs, scope)
+    if (!read.ok) throw new Error(read.error.message)
+    return read.value
+  }
+  const inBundleRel = (...segs: string[]): string => [BUNDLE_REL, ...segs].join('/')
+
+  it('lists one level of a bundled Collection: its Sets, then its pages, each in its sidecar’s order, skipping what the walk skips', async () => {
+    await seedTrashedCollection()
+    await putJson(sidecarPath(inBundle('A', 'R'), 'set'), { id: R })
+    await writeFile(inBundle('A', 'Y.md'), `---\nID: ${Y_ID}\n---\nbody\n`)
+    await writeFile(inBundle('A', 'Z.md'), `---\nID: ${Z_ID}\n---\nbody\n`)
+    await putJson(sidecarPath(inBundle('A'), 'collection'), {
+      id: A,
+      set_order: [S, R],
+      page_order: [Z_ID, Y_ID],
+    })
+    await mkdir(inBundle('A', '_raw'))
+    await mkdir(inBundle('A', 'node_modules'))
+    await writeFile(inBundle('A', '.x.md'), 'x')
+    await writeFile(inBundle('A', 'notes.txt'), 'x')
+    const { bundle, folder, items } = await listed(inBundle())
+    expect({ bundle, folder }).toEqual({ bundle: BUNDLE_REL, folder: inBundleRel('A') })
+    expect(items.map((i) => i.address)).toEqual(
+      ['S', 'R', 'Z.md', 'Y.md', 'Q.md'].map((name) => inBundleRel('A', name)),
+    )
+  })
+
+  it('lists an inner Set’s own level, each item with the record it carries', async () => {
+    await seedTrashedCollection()
+    expect((await listed(inBundle('A', 'S'))).items).toMatchObject([
+      {
+        address: inBundleRel('A', 'S', 'T'),
+        record: { entity: 'set', id: T, parent: { kind: 'container', id: S }, trail: [A] },
+      },
+    ])
+  })
+
+  it('keeps a folder the Nexus excludes out until it’s unexcluded, and the asset folder out', async () => {
+    await seedTrashedCollection()
+    await mkdir(inBundle('A', 'Files'))
+    const names = async (scope: WatchScope): Promise<string[]> =>
+      (await listed(inBundle(), scope)).items.map((i) => basename(i.address))
+    expect(await names({ excluded: ['A/S'], assetDir: '' })).toEqual(['Files', 'Q.md'])
+    expect(await names({ excluded: [], assetDir: 'A/Files' })).toEqual(['S', 'Q.md'])
+    expect(await names(OPEN)).toEqual(['Files', 'S', 'Q.md'])
+  })
+
+  it('orders an inner Set’s Sets by its own sidecar', async () => {
+    await seedTrashedCollection()
+    await putJson(sidecarPath(inBundle('A', 'S', 'R'), 'set'), { id: R })
+    await putJson(sidecarPath(inBundle('A', 'S'), 'set'), { id: S, set_order: [T, R] })
+    expect((await listed(inBundle('A', 'S'))).items.map((i) => i.address)).toEqual([
+      inBundleRel('A', 'S', 'T'),
+      inBundleRel('A', 'S', 'R'),
+    ])
+  })
+
+  describe('a whole Set’s bundle', () => {
+    const SET_BUNDLE_REL = `.trash/A/${STAMPED}__S.deleted`
+    const inSet = (...segs: string[]): string => join(root, SET_BUNDLE_REL, ...segs)
+    const ID_1 = '01J9Z8X7W6V5T4S3R2Q1P0N9A1'
+    const ID_2 = '01J9Z8X7W6V5T4S3R2Q1P0N9A2'
+    const seedTrashedSet = async (order: Record<string, unknown>): Promise<void> => {
+      await putJson(sidecarPath(inSet('S'), 'set'), { id: S, ...order })
+      await putJson(sidecarPath(inSet('S', 'Alpha'), 'set'), { id: 'set2' })
+      await putJson(sidecarPath(inSet('S', 'Beta'), 'set'), { id: 'set1' })
+      await writeFile(inSet('S', 'Alpha.md'), `---\nID: ${ID_2}\n---\nbody\n`)
+      await writeFile(inSet('S', 'Beta.md'), `---\nID: ${ID_1}\n---\nbody\n`)
+      await writeRecord(inSet(), { entity: 'set', id: S, parent: { kind: 'container', id: A } })
+    }
+    const names = async (): Promise<string[]> =>
+      (await listed(inSet())).items.map((i) => basename(i.address))
+
+    it('orders its pages by the Set’s own sidecar', async () => {
+      await seedTrashedSet({ page_order: [ID_2, ID_1] })
+      expect(await names()).toEqual(['Beta', 'Alpha', 'Alpha.md', 'Beta.md'])
+    })
+
+    it('orders each kind by id when the sidecar keeps no order', async () => {
+      await seedTrashedSet({})
+      expect(await names()).toEqual(['Beta', 'Alpha', 'Beta.md', 'Alpha.md'])
+    })
+  })
+
+  it('refuses an address whose bundle holds no container', async () => {
+    const page = join(root, '.trash', `${STAMPED}__P.md.deleted`)
+    await mkdir(page, { recursive: true })
+    await writeFile(join(page, 'P.md'), 'body')
+    await writeRecord(page, { entity: 'page', parent: { kind: 'root' } })
+    const property = await seedPropertyBundle(root, {
+      entity: 'property',
+      id: 'prop_x',
+      def: { id: 'prop_x' },
+      values: {},
+    })
+    for (const abs of [page, property]) {
+      const read = await listInner(root, abs, OPEN)
+      expect(!read.ok && read.error.code).toBe('not-found')
+    }
+  })
+
+  it('lists a folder without a Set sidecar as an id-less Set, its own items unaddressable', async () => {
+    await seedTrashedCollection()
+    await mkdir(inBundle('A', 'Plain'))
+    await writeFile(inBundle('A', 'Plain', 'N.md'), 'body')
+    const plain = (await listed(inBundle())).items.find(
+      (i) => i.address === inBundleRel('A', 'Plain'),
+    )
+    expect(plain?.record).toMatchObject({ entity: 'set', parent: { kind: 'container', id: A } })
+    expect(plain?.record).not.toHaveProperty('id')
+    expect((await listed(inBundle('A', 'Plain'))).items).toMatchObject([
+      {
+        address: inBundleRel('A', 'Plain', 'N.md'),
+        record: { entity: 'page', parent: { kind: 'unaddressable' } },
+      },
+    ])
+  })
+})
+
+describe('spendBundle', () => {
+  const EDIT = { kind: 'property', propertyId: 'x' }
+  const note = (owes: Record<string, unknown>) => ({
+    [A]: { kind: 'container', at: 'A', bundle: BUNDLE_REL, ...owes },
+  })
+  const owing = (owes: Record<string, unknown>) => putJson(join(root, OWED_REL), note(owes))
+  const owed = () => readJsonAt(join(root, OWED_REL)).catch(() => null)
+
+  beforeEach(() =>
+    seedTrashedCollection({ links: [P_LINK, { ...P_LINK, property: 'Other' }, Q_LINK] }),
+  )
+
+  it('strips exactly the inner item’s carried values from the bundle’s record, keeping those a finish appended since the open', async () => {
+    const item = await opened(inBundle('A', 'S', 'T', 'P.md'))
+    const appended = [
+      { ...P_LINK, page: newContentId('page') },
+      { ...P_LINK, property: 'Later' },
+    ]
+    await patchRecord(inBundle(), (raw) => ({ links: [...(raw.links as unknown[]), ...appended] }))
+    await spendBundle(root, item)
+    expect((await readRawRecord(inBundle()))?.links).toEqual([Q_LINK, ...appended])
+  })
+
+  it('takes the inner item’s pages off the strip its bundle’s delete still owes, leaving the rest of the note', async () => {
+    await owing({ strip: ['A/S/T/P.md', 'A/Q.md'], edit: EDIT })
+    await spendBundle(root, await opened(inBundle('A', 'S')))
+    expect(await owed()).toEqual(note({ strip: ['A/Q.md'], edit: EDIT }))
+  })
+
+  it('clears a note the inner item leaves owing nothing', async () => {
+    await owing({ strip: ['A/S/T/P.md'] })
+    await spendBundle(root, await opened(inBundle('A', 'S', 'T', 'P.md')))
+    expect(await owed()).toBeNull()
+  })
+
+  it('removes a whole bundle', async () => {
+    await spendBundle(root, await opened(inBundle()))
+    expect(await stat(inBundle()).catch(() => null)).toBeNull()
+  })
+})
+
+describe('fileInto', () => {
+  const HELD = `${BUNDLE_REL}/A/S/T/P.md`
+  const live = (): string => join(root, 'Live', 'P.md')
+  const file = async (at: string, to: typeof TRASH | typeof ARCHIVE = TRASH) => {
+    await mkdir(join(root, 'Live'), { recursive: true })
+    await writeFile(live(), 'back')
+    return fileInto(root, to, live(), live(), { entity: 'page', parent: { kind: 'root' } }, at)
+  }
+  const minted = async (
+    filed: { address: string; landed: string },
+    dir: string,
+    suffix: string,
+  ): Promise<void> => {
+    expect(filed.address).toMatch(new RegExp(`^${dir}/[^/]+__P\\.md\\${suffix}$`))
+    expect(filed.landed).toBe(join(root, filed.address, 'P.md'))
+    expect(await readFile(filed.landed, 'utf8')).toBe('back')
+    expect(await readRawRecord(join(root, filed.address))).toEqual({
+      entity: 'page',
+      parent: { kind: 'root' },
+    })
+  }
+
+  beforeEach(() => seedTrashedCollection())
+
+  it('re-nests an inner item’s address into its standing folder, leaving its bundle’s record as it was', async () => {
+    await rm(inBundle('A', 'S', 'T', 'P.md'))
+    const record = await readFile(inBundle('_record.json'), 'utf8')
+    expect(await file(HELD)).toEqual({ address: HELD, landed: inBundle('A', 'S', 'T', 'P.md') })
+    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe('back')
+    expect((await readdir(inBundle('A', 'S', 'T'))).sort()).toEqual(['P.md', '_pageset.json'])
+    expect(await stat(live()).catch(() => null)).toBeNull()
+    expect(await readFile(inBundle('_record.json'), 'utf8')).toBe(record)
+  })
+
+  it('mints a fresh bundle for a taken name, leaving the taken one as it was', async () => {
+    await minted(await file(HELD), '\\.trash/Live', '.deleted')
+    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe(
+      `---\nID: ${P_ID}\n---\nbody\n`,
+    )
+  })
+
+  it('mints a fresh bundle for a gone folder', async () => {
+    await rm(inBundle('A', 'S', 'T'), { recursive: true })
+    await minted(await file(HELD), '\\.trash/Live', '.deleted')
+    expect(await stat(inBundle('A', 'S', 'T')).catch(() => null)).toBeNull()
+  })
+
+  it('mints in its own store when the standing folder sits in a store of another kind', async () => {
+    await rm(inBundle('A', 'S', 'T', 'P.md'))
+    await minted(await file(HELD, ARCHIVE), `\\.nexus/archive/${ID}/Live`, '.archived')
+    expect(await stat(inBundle('A', 'S', 'T', 'P.md')).catch(() => null)).toBeNull()
+  })
+
+  it('re-mints a whole bundle’s address under its own name', async () => {
+    const whole = `.trash/Live/${STAMPED}__P.md.deleted`
+    expect(await file(whole)).toEqual({ address: whole, landed: join(root, whole, 'P.md') })
+    expect(await readRawRecord(join(root, whole))).toEqual({
+      entity: 'page',
+      parent: { kind: 'root' },
+    })
+  })
+
+  const fileAs = async (at: string) => {
+    const q = join(root, 'Live', 'Q.md')
+    await mkdir(join(root, 'Live'), { recursive: true })
+    await writeFile(q, 'back')
+    return fileInto(root, TRASH, live(), q, { entity: 'page', parent: { kind: 'root' } }, at)
+  }
+
+  it('files an inner item’s address under its origin’s name', async () => {
+    await rm(inBundle('A', 'S', 'T', 'P.md'))
+    expect(await fileAs(HELD)).toEqual({ address: HELD, landed: inBundle('A', 'S', 'T', 'P.md') })
+    expect(await readFile(inBundle('A', 'S', 'T', 'P.md'), 'utf8')).toBe('back')
+  })
+
+  it('files a whole bundle’s artifact under its origin’s name at the address it names', async () => {
+    const whole = `.trash/Live/${STAMPED}__P.md.deleted`
+    expect(await fileAs(whole)).toEqual({ address: whole, landed: join(root, whole, 'P.md') })
+    expect(await readFile(join(root, whole, 'P.md'), 'utf8')).toBe('back')
+  })
+})
```

##### Core/Bundles/handlers.test.ts

```/Core/Bundles/handlers.test.ts diff
@@ -1 +1 @@
 import { mkdir, writeFile } from 'node:fs/promises'
-import { join } from '../Paths/posix'
+import { join, relative } from '../Paths/posix'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import type { HostContext } from '../Contract/handlers'
 import { fault } from '../Contract/result'
 import { dropLiveTree } from '../Nexus/liveTree'
-import { tempRoot } from '../Testing/hostFs'
+import { putJson, tempRoot } from '../Testing/hostFs'
+import { sidecarPath } from '../Paths/paths'
 import { seedPropertyBundle } from '../Testing/fixtures'
 import { mintBundle } from './bundle'
 import { writeRecord } from './record'
 
 const { sessionRoot } = vi.hoisted(() => ({ sessionRoot: vi.fn() }))
 vi.mock('../Nexus/session', () => ({ sessionRoot, adopting: () => false }))
+vi.mock('../Nexus/heldPages', async (importOriginal) => {
+  const held = await importOriginal<typeof import('../Nexus/heldPages')>()
+  return { ...held, nexusPages: vi.fn(held.nexusPages) }
+})
+const { nexusPages } = await import('../Nexus/heldPages')
 
 const { bundlesHandlers } = await import('./handlers')
 
@@ -112 +118 @@ describe('bundles:list', () => {
       )
   })
 })
+
+describe('bundles:children', () => {
+  const BUNDLE = '.trash/2026-10-17T00-00-00-000Z__A.deleted'
+  const P_ID = '01KVGMT8BFP350FZZXAMG1QDVP'
+  const seedTrashedCollection = async (): Promise<void> => {
+    const at = (...segs: string[]): string => join(root, BUNDLE, ...segs)
+    await putJson(sidecarPath(at('A'), 'collection'), { id: 'colA' })
+    await putJson(sidecarPath(at('A', 'S'), 'set'), { id: 'setS' })
+    await writeFile(at('A', 'S', 'P.md'), `---\nID: ${P_ID}\n---\n# P\n`)
+    await writeFile(at('A', 'Q.md'), '# Q\n')
+    await writeRecord(at(), { entity: 'collection', id: 'colA', parent: { kind: 'root' } })
+  }
+  const titles = (reply: Awaited<ReturnType<(typeof bundlesHandlers)['bundles:children']>>) =>
+    reply.ok && reply.value.map((rows) => rows.map((r) => r.title))
+
+  it('answers each address’s inner items in the addresses’ order, reading the pages once for the call', async () => {
+    await seedTrashedCollection()
+    vi.mocked(nexusPages).mockClear()
+    const reply = await bundlesHandlers['bundles:children'](ctx, [`${BUNDLE}/A/S`, BUNDLE])
+    expect(titles(reply)).toEqual([['P'], ['S', 'Q']])
+    expect(reply.ok && reply.value[0][0].stored).toEqual({ id: P_ID, path: `${BUNDLE}/A/S/P.md` })
+    expect(nexusPages).toHaveBeenCalledTimes(1)
+  })
+
+  it('answers no rows for a gone address, one escaping the root, a page’s or property’s bundle, or an inner page, beside the others it answers', async () => {
+    await seedTrashedCollection()
+    const page = await mintBundle(root, { kind: 'trash' }, join(root, 'Notes', 'Alpha.md'))
+    await writeFile(join(page, 'Alpha.md'), '# Alpha\n')
+    await writeRecord(page, { entity: 'page', parent: { kind: 'unaddressable' } })
+    const property = await seedPropertyBundle(root, {
+      entity: 'property',
+      id: 'prop_x',
+      def: { id: 'prop_x' },
+      values: {},
+    })
+    const reply = await bundlesHandlers['bundles:children'](ctx, [
+      `${BUNDLE}/A/Gone`,
+      '../outside',
+      relative(root, page),
+      relative(root, property),
+      `${BUNDLE}/A/S/P.md`,
+      BUNDLE,
+    ])
+    expect(titles(reply)).toEqual([[], [], [], [], [], ['S', 'Q']])
+  })
+
+  it('refuses addresses that aren’t an array of strings', async () => {
+    for (const raw of [undefined, 'x', [7], [BUNDLE, null]])
+      expect(await bundlesHandlers['bundles:children'](ctx, raw as string[])).toEqual(
+        fault('Addresses are required.'),
+      )
+  })
+})
```

##### Core/Bundles/layout.test.ts

```/Core/Bundles/layout.test.ts diff
@@ -0 +1 @@
+import { describe, expect, it } from 'vitest'
+import { bundleAddressOf, layoutOf, originPathOf } from './layout'
+
+const ID = '01J9Z8X7W6V5T4S3R2Q1P0N9M8'
+const TRASH = { kind: 'trash' } as const
+const ARCHIVE = { kind: 'archive', id: ID } as const
+const STAMPED = '2026-10-17T00-00-00-000Z'
+
+describe('layoutOf', () => {
+  it('files the Trash under .trash and an Archive under its Collection’s id, each wearing its own suffix', () => {
+    expect(layoutOf(TRASH)).toEqual({ dir: '.trash', suffix: '.deleted' })
+    expect(layoutOf(ARCHIVE)).toEqual({ dir: `.nexus/archive/${ID}`, suffix: '.archived' })
+  })
+})
+
+describe('bundleAddressOf', () => {
+  const TRASHED = `/n/.trash/Notes/${STAMPED}__S.deleted`
+  const ARCHIVED = `/n/.nexus/archive/${ID}/Notes/${STAMPED}__S.archived`
+
+  it('answers a bundle folder with its bundle and the store it sits in', () => {
+    expect(bundleAddressOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`)).toEqual({
+      bundle: `/n/.trash/Notes/${STAMPED}__Alpha.md.deleted`,
+      store: TRASH,
+    })
+    expect(bundleAddressOf('/n', ARCHIVED)).toEqual({ bundle: ARCHIVED, store: ARCHIVE })
+  })
+
+  it('answers a page or folder inside the artifact as the item it names', () => {
+    expect(bundleAddressOf('/n', `${TRASHED}/S/T/P.md`)).toEqual({
+      bundle: TRASHED,
+      store: TRASH,
+      item: `${TRASHED}/S/T/P.md`,
+    })
+    expect(bundleAddressOf('/n', `${TRASHED}/S/T`)).toEqual({
+      bundle: TRASHED,
+      store: TRASH,
+      item: `${TRASHED}/S/T`,
+    })
+  })
+
+  it('answers an Archive path with its Collection’s store', () => {
+    expect(bundleAddressOf('/n', `${ARCHIVED}/S/P.md`)).toEqual({
+      bundle: ARCHIVED,
+      store: ARCHIVE,
+      item: `${ARCHIVED}/S/P.md`,
+    })
+  })
+
+  it('answers null for the artifact itself and for a hidden segment inside it', () => {
+    expect(bundleAddressOf('/n', `${TRASHED}/S`)).toBeNull()
+    expect(bundleAddressOf('/n', `${TRASHED}/S/_raw/X.md`)).toBeNull()
+    expect(bundleAddressOf('/n', `${TRASHED}/S/.x`)).toBeNull()
+    expect(bundleAddressOf('/n', `${TRASHED}/_record.json/X.md`)).toBeNull()
+    expect(bundleAddressOf('/n', `${TRASHED}/.hidden/X.md`)).toBeNull()
+  })
+
+  it('answers null for a suffixed folder without a stamp', () => {
+    expect(bundleAddressOf('/n', '/n/.trash/Notes/Alpha.md.deleted')).toBeNull()
+    expect(bundleAddressOf('/n', '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBeNull()
+  })
+
+  it('answers null for a path neither store holds: an in-Nexus `.deleted`, a `.archived` outside `.nexus/archive`, the id folder itself, and either suffix under the other store', () => {
+    expect(bundleAddressOf('/n', '/n/Notes/fake.deleted')).toBeNull()
+    expect(bundleAddressOf('/n', '/n/Notes/fake.archived')).toBeNull()
+    expect(bundleAddressOf('/n', `/n/.nexus/archive/${ID}.archived`)).toBeNull()
+    expect(bundleAddressOf('/n', `/n/.trash/Notes/${STAMPED}__Alpha.md.archived`)).toBeNull()
+    expect(bundleAddressOf('/n', `/n/.nexus/archive/${ID}/${STAMPED}__Alpha.md.deleted`)).toBeNull()
+  })
+})
+
+describe('originPathOf', () => {
+  it('reads a bundled file’s origin from the chain and the artifact’s own tree', () => {
+    const page = `/n/.trash/Studio/Pommora/${STAMPED}__ClaudeMD.md.deleted`
+    expect(originPathOf('/n', TRASH, `${page}/ClaudeMD.md`)).toBe('Studio/Pommora/ClaudeMD.md')
+    const set = `/n/.trash/Coll/${STAMPED}__Set.deleted`
+    expect(originPathOf('/n', TRASH, `${set}/Set/X.md`)).toBe('Coll/Set/X.md')
+  })
+
+  it('reads an archived file under its Archive’s root the same way', () => {
+    const set = `/n/.nexus/archive/${ID}/Coll/${STAMPED}__Set.archived`
+    expect(originPathOf('/n', ARCHIVE, `${set}/Set/Sub/X.md`)).toBe('Coll/Set/Sub/X.md')
+  })
+
+  it('keeps a chain or artifact folder that wears the suffix, finding the bundle by its stamp', () => {
+    const bundle = `/n/.trash/Archive.deleted/${STAMPED}__Notes.deleted`
+    expect(originPathOf('/n', TRASH, `${bundle}/Notes/Old.deleted/X.md`)).toBe(
+      'Archive.deleted/Notes/Old.deleted/X.md',
+    )
+  })
+
+  it('a bundle wearing no stamp keeps its folder in the origin path', () => {
+    expect(originPathOf('/n', TRASH, '/n/.trash/Notes/Alpha.md.deleted/Alpha.md')).toBe(
+      'Notes/Alpha.md.deleted/Alpha.md',
+    )
+  })
+})
```

##### Core/Bundles/rows.test.ts

```/Core/Bundles/rows.test.ts diff
@@ -9 +9 @@ import type { NexusTree } from '../Nexus/tree'
 import type { BundleRow } from './rows'
 import { settledMutate } from '../Testing/settledMutate'
 import { contextsDir, contextsRegistryFile } from '../Paths/paths'
-import { listBundles } from './bundle'
+import { listBundles, listInner } from './bundle'
 import { readNexus } from '../Nexus/readNexus'
 import { nexusPages } from '../Nexus/heldPages'
 import { closeSession, openSession } from '../Nexus/session'
-import { bundleRowOf, bundleRows } from './rows'
+import { bundleRowOf, bundleRows, innerRows } from './rows'
+import { storedAtOf } from './layout'
+import { patchRecord } from './record'
+import { scopeOf } from '../Settings/codec'
 import type { TrashDeps } from '../Trash/discard'
 
 const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
@@ -352 +355 @@ describe('bundleRows — `homeResolves` agrees with the resolver', () => {
     expect(restored.ok).toBe(false)
   })
 })
+
+describe('innerRows — a bundle’s inner items as the browser reads them', () => {
+  const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVC'
+  const trashedNotes = async (): Promise<string> => {
+    await del('Notes', 'collection')
+    const [bundle] = await listBundles(root, { kind: 'trash' })
+    return bundle.bundlePath
+  }
+  const innerOf = async (address: string, tree?: NexusTree): Promise<BundleRow[]> => {
+    const live = tree ?? (await readNexus(root))
+    const listed = await listInner(root, join(root, address), scopeOf(live.config))
+    if (!listed.ok) throw new Error(listed.error.message)
+    return innerRows(listed.value, live, (await nexusPages(root, live)).byId)
+  }
+
+  it('a page row is addressed by its own path, dated by its bundle, trailed through the containers inside it, and homeless', async () => {
+    await mkdir(join(root, 'Notes', 'Daily', 'Week'))
+    await writeFile(
+      join(root, 'Notes', 'Daily', 'Week', '_pageset.json'),
+      JSON.stringify({ id: 'set-week' }),
+    )
+    await writeFile(
+      join(root, 'Notes', 'Daily', 'Week', 'Beta.md'),
+      `---\nID: ${PAGE_B}\n---\nbody`,
+    )
+    const bundlePath = await trashedNotes()
+    const address = `${bundlePath}/Notes/Daily/Week/Beta.md`
+    const tree = await readNexus(root)
+    const [row] = await innerOf(`${bundlePath}/Notes/Daily/Week`, {
+      ...tree,
+      config: { ...tree.config, pageMetadata: { [PAGE_B]: { icon: 'hash' } } },
+    })
+    expect(row).toMatchObject({
+      bundlePath: address,
+      kind: 'page',
+      title: 'Beta',
+      icon: 'hash',
+      stored: { id: PAGE_B, path: address },
+      crumbs: [
+        { kind: 'collection', title: 'Notes' },
+        { kind: 'set', title: 'Daily' },
+        { kind: 'set', title: 'Week' },
+      ],
+      storedAt: storedAtOf(bundlePath),
+      homeResolves: false,
+    })
+    expect(row.storedAt).toEqual(expect.any(Number))
+    expect(row).not.toHaveProperty('historical')
+    expect(row).not.toHaveProperty('partial')
+  })
+
+  it('a Set row carries its sidecar’s icon and its stored id at its own path', async () => {
+    await writeFile(
+      join(root, 'Notes', 'Daily', '_pageset.json'),
+      JSON.stringify({ id: 'set-daily', icon: 'folder-heart' }),
+    )
+    const bundlePath = await trashedNotes()
+    const address = `${bundlePath}/Notes/Daily`
+    expect(await innerOf(bundlePath)).toMatchObject([
+      {
+        bundlePath: address,
+        kind: 'set',
+        title: 'Daily',
+        icon: 'folder-heart',
+        stored: { id: 'set-daily', path: address },
+        crumbs: [{ kind: 'collection', title: 'Notes' }],
+        homeResolves: false,
+      },
+    ])
+  })
+
+  it('a row inside a bundle whose home is gone begins with its frozen trail and carries the mark', async () => {
+    await del('Notes/Daily', 'set')
+    await del('Notes', 'collection')
+    const set = (await listBundles(root, { kind: 'trash' })).find((b) => b.artifactName === 'Daily')
+    const [row] = await innerOf(set?.bundlePath ?? '')
+    expect(row).toMatchObject({
+      title: 'Alpha',
+      historical: true,
+      crumbs: [{ title: 'Notes' }, { kind: 'set', title: 'Daily' }],
+      homeResolves: false,
+    })
+    expect(row.crumbs[0]).not.toHaveProperty('kind')
+  })
+
+  it('an archived Set’s inner page row is homeless, addressed by its own path, and trailed from the Archive', async () => {
+    const archived = await settledMutate(
+      root,
+      { op: 'archive', path: 'Notes/Daily', kind: 'set' },
+      nexusDeps,
+    )
+    const bundlePath = archived.ok ? (archived.value.bundled?.bundlePath ?? '') : ''
+    const address = `${bundlePath}/Daily/Alpha.md`
+    expect(await innerOf(bundlePath)).toMatchObject([
+      {
+        bundlePath: address,
+        stored: { id: PAGE_A, path: address },
+        crumbs: [
+          { kind: 'collection', title: 'Notes' },
+          { kind: 'set', title: 'Daily' },
+        ],
+        homeResolves: false,
+      },
+    ])
+  })
+
+  it('a row inside a partly recorded bundle carries the mark', async () => {
+    const bundlePath = await trashedNotes()
+    await patchRecord(join(root, bundlePath), () => ({ partial: true }))
+    expect(await innerOf(`${bundlePath}/Notes/Daily`)).toMatchObject([{ partial: true }])
+  })
+})
```

##### Core/Nexus/mutate.test.ts

```/Core/Nexus/mutate.test.ts diff
@@ -64 +64 @@ import * as indexSeed from '../Index/indexSeed'
 import * as governedRoot from './governedRoot'
 import * as contextCascade from '../Contexts/contextCascade'
 import * as atomicWrite from '../Files/atomicWrite'
+import * as sidecar from '../Files/sidecar'
 import { seedContentIndex } from '../Index/indexSeed'
 import { createTile, readMarkdownTile, writeMarkdownTile } from '../Tiles/tilesFile'
 import { landedId } from '../Testing/tileLayouts'
@@ -2763 +2764 @@ describe('the Contexts lock', () => {
       { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Atlas' },
       nexusDeps,
     )
-    const rmw = atomicWrite.rmwJsonStrict
+    const patch = sidecar.patchSidecar
     const writeWaits = vi
-      .spyOn(atomicWrite, 'rmwJsonStrict')
-      .mockImplementation(async (path, mutate, seed) => {
+      .spyOn(sidecar, 'patchSidecar')
+      .mockImplementation(async (folder, kind, fn) => {
         pathRead()
         await renaming
-        return rmw(path, mutate, seed)
+        return patch(folder, kind, fn)
       })
     const [colored, valued] = await Promise.all([
       settledMutate(root, { op: 'setSpaceColor', spaceId: 'sp-pom', color: 'cyan' }, nexusDeps),
@@ -2784 +2785 @@ describe('the Contexts lock', () => {
         nexusDeps,
       ),
     ])
+    expect(writeWaits).toHaveBeenCalledOnce()
     renameWaits.mockRestore()
     writeWaits.mockRestore()
     lock.restore()
```

##### Core/Nexus/mutateRequest.test.ts

```/Core/Nexus/mutateRequest.test.ts diff
@@ -16 +16 @@ describe('mutateRequest — what the window sends is held to the shape before an
     expect(read({ op: 'reorderChildren', parentPath: 'A', key: 'id', order: [] })).toBe(false)
     expect(read({ op: 'rename', path: 'A', kind: 'context', newName: 'B' })).toBe(false)
     expect(read({ op: 'archive', path: 'A', kind: 'collection' })).toBe(false)
-    expect(read({ op: 'archive', path: 'A', kind: 'page', leaf: 7 })).toBe(false)
+    expect(read({ op: 'archive', path: 'A', kind: 'page', at: 7 })).toBe(false)
+    expect(read({ op: 'archive', path: 'A', kind: 'page', name: 7 })).toBe(false)
+    expect(read({ op: 'archive', path: 'A', kind: 'page', record: 'x' })).toBe(false)
   })
 
   it('an archive changes what the settle holds and what the stores list', () => {
```

##### Core/Nexus/settle.test.ts

```/Core/Nexus/settle.test.ts diff
@@ -1 +1 @@
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { mkdir, open, readFile, rm, utimes, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
-import { putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
+import { putJson, readJsonAt, refuseWrites, tempRoot } from '../Testing/hostFs'
 import { settledMutate } from '../Testing/settledMutate'
 import type { TrashDeps } from '../Trash/discard'
 import { assignProperty } from '../Properties/assignment'
@@ -20 +20 @@ import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
 import * as readNexusModule from './readNexus'
 import { readNexus } from './readNexus'
 import * as adopt from './adopt'
-import * as atomicWrite from '../Files/atomicWrite'
 import { atomicWriteFile } from '../Files/atomicWrite'
 import { readNotes } from './owed'
 import { updatePageBody } from './page'
@@ -1301 +1300 @@ describe('a re-spell on the notes', () => {
   }
 
   beforeEach(() => {
-    const refusing =
-      (real: (file: string, data: string) => Promise<void>) =>
-      (file: string, data: string): Promise<void> =>
-        failing.some((f) => file.endsWith(f))
-          ? Promise.reject(new Error('refused'))
-          : real(file, data)
-    const { atomicWriteFile: wrote, rewritePreservingTimes: rewrote } = atomicWrite
-    vi.spyOn(atomicWrite, 'atomicWriteFile').mockImplementation(refusing(wrote))
-    vi.spyOn(atomicWrite, 'rewritePreservingTimes').mockImplementation(refusing(rewrote))
+    const refusing = (file: string): boolean => failing.some((f) => file.endsWith(f))
+    refuseWrites('atomicWriteFile', refusing)
+    refuseWrites('rewritePreservingTimes', refusing)
   })
   afterEach(() => {
     failing.length = 0
```

##### Core/Settings/TrashFrame.test.tsx

```/Core/Settings/TrashFrame.test.tsx diff
@@ -18 +18 @@ import {
 import { pushUndo, resetUndo, undoValue } from '../Session/undo'
 import { pageIO, scheduleBodySave } from '../Session/saveScheduler'
 import { storesChanged } from '../Session/nexusSlice'
+import { dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
+
+vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))
 
 ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
 
@@ -37 +41 @@ describe('a Trash row', () => {
     host = null
   })
 
-  it('checks itself through the checkbox in its lead inset', async () => {
+  it('checks itself through the checkbox in its gutter', async () => {
     host = document.createElement('div')
     document.body.appendChild(host)
     root = createRoot(host)
@@ -71 +75 @@ describe('a Trash row', () => {
       )
       search.dispatchEvent(new Event('input', { bubbles: true }))
     })
-    expect(host.querySelectorAll('.trash-row')).toHaveLength(1)
+    expect(host.querySelectorAll('.data-row')).toHaveLength(1)
     expect(host.querySelector('[data-reveal-host="on"]')).toBeNull()
   })
+})
 
-  it('draws its item’s own icon ahead of its kind’s', async () => {
-    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'bundles:list': vi.fn(async () => ({ ok: true, value: [row({ icon: 'hash' })] })),
-    })
-    host = document.createElement('div')
-    document.body.appendChild(host)
-    root = createRoot(host)
-    await act(async () => root?.render(<TrashFrame />))
-    expect(host.querySelector('.lucide-hash')).not.toBeNull()
-  })
+const COLLECTION = '.trash/2026-10-20T12-00-00-000Z__Notes.deleted'
+const SET = `${COLLECTION}/Notes/Ideas`
+const PAGE = `${SET}/P.md`
 
-  it('a partly recorded row shows its mark, spoken as Recorded Partly', async () => {
-    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
-      'bundles:list': vi.fn(async () => ({
-        ok: true,
-        value: [
-          row({ title: 'Alpha', partial: true }),
-          row({ title: 'Beta', bundlePath: '.trash/b' }),
-        ],
-      })),
-    })
-    host = document.createElement('div')
-    document.body.appendChild(host)
-    root = createRoot(host)
-    await act(async () => root?.render(<TrashFrame />))
-    const [alpha, beta] = host.querySelectorAll('.trash-row')
-    expect(alpha.querySelector('[role="img"][aria-label="Recorded Partly"]')).not.toBeNull()
-    expect(beta.querySelector('[role="img"]')).toBeNull()
+const trashedCollection = (): BundleRow =>
+  row({ title: 'Notes', kind: 'collection', bundlePath: COLLECTION, crumbs: [] })
+const innerSet = (): BundleRow =>
+  row({
+    title: 'Ideas',
+    kind: 'set',
+    bundlePath: SET,
+    crumbs: [{ kind: 'collection', title: 'Notes' }],
+  })
+const innerPage = (over: Partial<BundleRow> = {}): BundleRow =>
+  row({
+    title: 'P',
+    bundlePath: PAGE,
+    crumbs: [
+      { kind: 'collection', title: 'Notes' },
+      { kind: 'set', title: 'Ideas' },
+    ],
+    ...over,
   })
-})
 
 describe('the Trash pane', () => {
   let host: HTMLDivElement | null = null
@@ -112 +110 @@ describe('the Trash pane', () => {
   let listed: BundleRow[]
   let list: ReturnType<typeof vi.fn>
   let picked: string | null
+  let menu: ReturnType<typeof vi.fn>
   let mutated: ReturnType<typeof vi.fn>
+  let children: Record<string, BundleRow[]>
 
   const titles = (): string[] =>
     [...(host?.querySelectorAll('[role="checkbox"]') ?? [])].map((n) =>
       (n.getAttribute('aria-label') ?? '').replace('Select ', ''),
     )
+  const rowOf = (title: string): HTMLElement =>
+    host?.querySelector(`[aria-label="Select ${title}"]`)?.closest('.data-row') as HTMLElement
+  const boxOf = (title: string): HTMLElement =>
+    host?.querySelector(`[aria-label="Select ${title}"]`) as HTMLElement
+  const press = async (title: string, detail: number): Promise<void> =>
+    act(async () => {
+      rowOf(title).dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
+    })
+  const indentOf = (title: string): string =>
+    (rowOf(title).querySelector('.bundle-title') as HTMLElement).style.marginLeft
+  const showTree = async (): Promise<void> => {
+    listed = [trashedCollection()]
+    children = { [COLLECTION]: [innerSet()], [SET]: [innerPage()] }
+    await act(async () => storesChanged.emit())
+  }
   const nexus = (id: string): void => {
     const tree = makeTree()
     useSession.setState({ tree: { ...tree, nexus: { ...tree.nexus, id } } })
@@ -126 +141 @@ describe('the Trash pane', () => {
   beforeEach(async () => {
     listed = [row({ title: 'Alpha' })]
     picked = null
+    children = {}
     mutated = vi.fn(async () => ({ ok: true, value: {} }))
     list = vi.fn(async () => ({ ok: true, value: listed }))
+    menu = vi.fn(async () => ({ ok: true, value: picked }))
     ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
       'bundles:list': list,
-      menu: vi.fn(async () => ({ ok: true, value: picked })),
+      'bundles:children': vi.fn(async (addresses: string[]) => ({
+        ok: true,
+        value: addresses.map((address) => children[address] ?? []),
+      })),
+      menu,
       'personalization:set': vi.fn(async () => ({ ok: true, value: null })),
       mutate: mutated,
       'delete:facts': vi.fn(async () => ({
@@ -152 +173 @@ describe('the Trash pane', () => {
     useSession.setState({ tree: null })
   })
 
+  it('Space checks any row, and Enter discloses a container and checks a page', async () => {
+    await showTree()
+    const key = async (title: string, k: string): Promise<void> =>
+      act(async () => {
+        rowOf(title).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
+      })
+    await key('Notes', ' ')
+    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('true')
+    expect(titles()).toEqual(['Notes'])
+    await key('Notes', 'Enter')
+    await key('Ideas', 'Enter')
+    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
+    expect(boxOf('Ideas').getAttribute('aria-checked')).toBe('false')
+    await key('P', 'Enter')
+    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
+    await key('P', ' ')
+    expect(boxOf('P').getAttribute('aria-checked')).toBe('false')
+  })
+
+  it('an empty, unreadable, or unmatched Trash reads its line in the frame, after the table', async () => {
+    const line = (): string | null => {
+      const el = host?.querySelector('.trash-empty')
+      if (el?.parentElement?.classList.contains('trash-frame') !== true) return null
+      return el.previousElementSibling?.classList.contains('trash-table') ? el.textContent : null
+    }
+    listed = []
+    await act(async () => storesChanged.emit())
+    expect(line()).toBe('Trash is empty.')
+    list.mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
+    await act(async () => storesChanged.emit())
+    expect(line()).toBe("The trash couldn't be read.")
+    listed = [row({ title: 'Alpha' })]
+    await act(async () => storesChanged.emit())
+    const search = host?.querySelector('input') as HTMLInputElement
+    await act(async () => {
+      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(search, 'zzz')
+      search.dispatchEvent(new Event('input', { bubbles: true }))
+    })
+    expect(line()).toBe('Nothing matches.')
+  })
+
   it("lists the opened Nexus's trash after a switch", async () => {
     expect(titles()).toEqual(['Alpha'])
     expect(list).toHaveBeenCalledWith({ kind: 'trash' }, undefined)
@@ -195 +257 @@ describe('the Trash pane', () => {
     )
     expect(await pickFromDateMenu('style:time_format:none')).toEqual({ time_format: 'none' })
     expect(await pickFromDateMenu('style:time_format:twentyFourHour')).toBeUndefined()
+    expect(await pickFromDateMenu('style:time_format:none')).toEqual({ time_format: 'none' })
+    expect(await pickFromDateMenu('style:time_format:shown')).toBeUndefined()
   })
 
   it.each([
@@ -209 +273 @@ describe('the Trash pane', () => {
     useSession.setState({ askConfirm: async () => true })
     mutated.mockClear()
     picked = action
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -224 +288 @@ describe('the Trash pane', () => {
     offerUndo([bundlePath], (undo) => notifyDeleted('Alpha', undo))
     mutated.mockResolvedValue({ ok: false, error: { code: 'io', message: 'No.' } })
     picked = 'restore'
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -244 +308 @@ describe('the Trash pane', () => {
     for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
       await act(async () => (box as HTMLButtonElement).click())
     picked = 'restore'
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -262 +326 @@ describe('the Trash pane', () => {
     for (const box of host?.querySelectorAll('[role="checkbox"]') ?? [])
       await act(async () => (box as HTMLButtonElement).click())
     picked = action
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -308 +372 @@ describe('the Trash pane', () => {
     })
   })
 
+  it('counts the rows a Delete All couldn’t empty in its notice', async () => {
+    useSession.setState({ askConfirm: async () => true })
+    mutated
+      .mockResolvedValueOnce({ ok: true, value: {} })
+      .mockResolvedValueOnce({ ok: false, error: { code: 'io', message: 'No.' } })
+    await pickForBoth('delete')
+    expect(currentNotification()).toMatchObject({
+      message: 'Deleted 1 Page. 1 Page couldn’t be deleted.',
+      tone: 'error',
+    })
+  })
+
   it('names the title a restore here stepped to', async () => {
     mutated.mockResolvedValue({ ok: true, value: { landedAs: 'Alpha (2)' } })
     picked = 'restore'
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -321 +397 @@ describe('the Trash pane', () => {
     })
   })
 
+  it.each([
+    ['restore', 'Restored “Alpha”'],
+    ['delete', 'Deleted “Alpha”'],
+  ])('a single %s here posts its title', async (action, message) => {
+    clearNotification()
+    useSession.setState({ askConfirm: async () => true })
+    picked = action
+    const item = host?.querySelector('.data-row') as HTMLElement
+    await act(async () => {
+      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(currentNotification()).toMatchObject({ message, tone: 'normal' })
+    expect(currentNotification()?.action).toBeUndefined()
+  })
+
   const OWED = {
     ok: true,
     value: { cascade: { pages: [], hosts: [], warning: 'Couldn’t update 1 Item.', owed: true } },
@@ -342 +433 @@ describe('the Trash pane', () => {
       value: { ...OWED.value, landedAs: 'Alpha (2)' },
     })
     picked = 'restore'
-    const item = host?.querySelector('.trash-row') as HTMLElement
+    const item = host?.querySelector('.data-row') as HTMLElement
     await act(async () => {
       item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
@@ -379 +470 @@ describe('the Trash pane', () => {
     expect(currentNotification()).toMatchObject({ segment: '2 Renamed' })
   })
 
-  it('a Restore All of rows with nowhere to go restores nothing and says only that', async () => {
-    await pickForBoth('restore', [
+  it('a Restore All asks once where its homeless rows go, sending only them there, and a dismissed ask restores nothing', async () => {
+    const rows = [
       row({ title: 'Alpha', homeResolves: false }),
       row({ title: 'Beta', homeResolves: false }),
-    ])
+      row({ title: 'Gamma' }),
+    ]
+    const answer = (value: string | null) => ({ ok: true, value })
+    menu.mockResolvedValueOnce(answer('restore')).mockResolvedValueOnce(answer(null))
+    await pickForBoth('restore', rows)
+    expect(menu).toHaveBeenCalledTimes(2)
     expect(mutated).not.toHaveBeenCalled()
-    expect(currentNotification()).toMatchObject({
-      message: '2 Pages had nowhere to go — restore those one at a time to choose where.',
-      tone: 'error',
+    menu.mockResolvedValueOnce(answer('restore')).mockResolvedValueOnce(answer('c1'))
+    const item = host?.querySelector('.data-row') as HTMLElement
+    await act(async () => {
+      item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
     })
+    expect(menu).toHaveBeenCalledTimes(4)
+    const to = { kind: 'container', id: 'c1' }
+    expect(mutated.mock.calls.map(([req]) => req)).toEqual([
+      { op: 'restore', bundlePath: rows[0].bundlePath, destination: to },
+      { op: 'restore', bundlePath: rows[1].bundlePath, destination: to },
+      { op: 'restore', bundlePath: rows[2].bundlePath },
+    ])
   })
 
   it('a Nexus switch during a batch stops it, posting no notice and telling the stores once', async () => {
@@ -406 +510 @@ describe('the Trash pane', () => {
     expect(heard).toHaveBeenCalledTimes(1)
   })
 
+  it('a Collection row’s click discloses its Sets and then its pages, indented, and its checkbox still checks it', async () => {
+    await showTree()
+    const chevron = rowOf('Notes').querySelector('[data-drop-outline]')
+    expect(chevron?.classList.contains(dropOutlineOpen)).toBe(false)
+    await press('Notes', 1)
+    expect(titles()).toEqual(['Notes', 'Ideas'])
+    expect(
+      rowOf('Notes').querySelector('[data-drop-outline]')?.classList.contains(dropOutlineOpen),
+    ).toBe(true)
+    await press('Ideas', 1)
+    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
+    expect([indentOf('Notes'), indentOf('Ideas'), indentOf('P')]).toEqual([
+      rowIndent(0),
+      rowIndent(1),
+      rowIndent(2),
+    ])
+    expect(rowOf('P').querySelector('[data-drop-outline]')).toBeNull()
+    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('false')
+    await act(async () => boxOf('Notes').click())
+    expect(boxOf('Notes').getAttribute('aria-checked')).toBe('true')
+    expect(titles()).toEqual(['Notes', 'Ideas', 'P'])
+  })
+
+  it('a page row’s double-click leaves it checked and opens nothing', async () => {
+    for (const detail of [1, 2])
+      await act(async () => {
+        rowOf('Alpha').dispatchEvent(new MouseEvent('click', { bubbles: true, detail }))
+      })
+    await act(async () => {
+      rowOf('Alpha').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
+    })
+    expect(boxOf('Alpha').getAttribute('aria-checked')).toBe('true')
+    expect(useSession.getState().reader).toBeNull()
+  })
+
+  it('an inner row’s right-click Restore lists destinations, and its Delete empties only that item', async () => {
+    await showTree()
+    children[SET] = [innerPage({ homeResolves: false })]
+    await press('Notes', 1)
+    await press('Ideas', 1)
+    picked = 'restoreTo:c1'
+    await act(async () => {
+      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(JSON.stringify(menu.mock.lastCall)).toContain('restoreTo:c1')
+    expect(mutated.mock.calls).toEqual([
+      [{ op: 'restore', bundlePath: PAGE, destination: { kind: 'container', id: 'c1' } }],
+    ])
+    mutated.mockClear()
+    useSession.setState({ askConfirm: async () => true })
+    picked = 'delete'
+    await act(async () => {
+      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
+    })
+    expect(mutated.mock.calls).toEqual([[{ op: 'emptyBundle', bundlePath: PAGE }]])
+  })
+
+  it('a checked inner row stays checked across a refresh, and across its container collapsing and reopening', async () => {
+    await showTree()
+    await press('Notes', 1)
+    await press('Ideas', 1)
+    await press('P', 1)
+    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
+    await act(async () => storesChanged.emit())
+    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
+    await press('Ideas', 1)
+    expect(titles()).toEqual(['Notes', 'Ideas'])
+    await press('Ideas', 1)
+    expect(boxOf('P').getAttribute('aria-checked')).toBe('true')
+  })
+
+  it('an inner row’s trail reads its bundle’s trail, then the containers inside the bundle', async () => {
+    await showTree()
+    await press('Notes', 1)
+    await press('Ideas', 1)
+    expect(rowOf('P').querySelector('.bundle-trail')?.textContent).toBe('Notes›Ideas')
+  })
+
   it('lists a delete made elsewhere while it is open', async () => {
     listed = [row({ title: 'Alpha' }), row({ title: 'Gamma' })]
     await act(async () => {
```

##### Core/Trash/spend.test.ts

```/Core/Trash/spend.test.ts diff
@@ -5 +5 @@ import { handleMutate } from '../Nexus/mutate'
 import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
 import { splitFrontmatter } from '../Files/pageFile'
 import { basename, dirname, join, relative } from '../Paths/posix'
-import { tempRoot, noModeBits, readJsonAt, seedNexus, seedSpaceSidecar } from '../Testing/hostFs'
+import {
+  noModeBits,
+  putJson,
+  readJsonAt,
+  refuseWrites,
+  seedNexus,
+  seedSpaceSidecar,
+  tempRoot,
+} from '../Testing/hostFs'
 import { seedPropertyBundle } from '../Testing/fixtures'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import * as atomicWrite from '../Files/atomicWrite'
@@ -1761 +1769 @@ describe('emptyBundle — giving a bundle up for good', () => {
     expect(await pages()).toEqual({})
   })
 
+  describe('an inner item emptied out of its bundle', () => {
+    const PAGE_D = '01KVGMT8BFP350FZZXAMG1QDVD'
+    const sidecar = (): string => join(root, 'Other', '_pagecollection.json')
+    const located = (values: string[]) => [
+      {
+        id: 'view_1',
+        name: 'V',
+        type: 'table',
+        filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values }] },
+      },
+    ]
+    const owingViews = async (values: string[]): Promise<string> => {
+      await putJson(join(root, 'Notes', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
+      await putJson(join(root, 'Notes', 'Daily', 'Sub', 'Deeper', '_pageset.json'), {
+        id: 'set-deeper',
+      })
+      await putJson(sidecar(), { id: 'col-other', views: located(values) })
+      await refreshTree(root)
+      const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar())
+      await settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, nexusDeps)
+      refusal.mockRestore()
+      expect((await readJsonAt(sidecar())).views).toEqual(located(values))
+      const [listed] = await listBundles(root, { kind: 'trash' })
+      return listed.bundlePath
+    }
+    beforeEach(async () => {
+      await seedNexus(root, {
+        defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
+      })
+      await putJson(join(root, 'Other', '_pagecollection.json'), { id: 'col-other' })
+    })
+
+    it('disposes only that item, drops its pages’ metadata, takes its carried values off the bundle’s record, and leaves its owed note keyed by its own address', async () => {
+      await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
+      await writeFile(
+        join(root, 'Other', 'Linker.md'),
+        `---\nID: ${PAGE_C}\nRelated: "[[Alpha]]"\n---\nlinker`,
+      )
+      await updatePageMetadata(root, PAGE_A, { icon: 'star' })
+      await updatePageMetadata(root, PAGE_B, { locked: true })
+      await refreshTree(root)
+      await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
+      const [listed] = await listBundles(root, { kind: 'trash' })
+      const bundle = join(root, listed.bundlePath)
+      expect(await readRecord(bundle)).toMatchObject({
+        links: [{ page: PAGE_C, property: 'prop_related', value: '[[Alpha]]' }],
+      })
+      const taker = join(root, 'Other', 'Taker.md')
+      await writeFile(taker, `---\nID: ${PAGE_D}\nRelated: "[[Alpha]]"\n---\ntaker`)
+      await refreshTree(root)
+      refuseWrites('rewritePreservingTimes', (file) => file === taker)
+      const handed: string[] = []
+      const item = join(bundle, 'Daily', 'Alpha.md')
+      const r = await settledMutate(
+        root,
+        { op: 'emptyBundle', bundlePath: relative(root, item) },
+        {
+          ...nexusDeps,
+          trashToSystem: async (p) => {
+            handed.push(p)
+            await rm(p, { recursive: true })
+          },
+        },
+      )
+      vi.restoreAllMocks()
+      expect(r.ok).toBe(true)
+      expect(handed).toEqual([item])
+      expect((await readdir(join(bundle, 'Daily'))).sort()).toEqual(['Beta.md', '_pageset.json'])
+      const month = await readShard(root, shardOf(PAGE_A)!)
+      expect(month.kind === 'ok' && month.pages).toEqual({ [PAGE_B]: { locked: true } })
+      expect(await readRecord(bundle)).not.toHaveProperty('links')
+      expect((await readNotes(root))[relative(root, item)]).toMatchObject({
+        kind: 'container',
+        at: relative(root, item),
+        strip: ['Notes/Daily/Alpha.md'],
+      })
+    })
+
+    it('an inner Set emptied while its bundle’s delete still owes its view edit takes the views naming it once the finish runs', async () => {
+      const bundle = await owingViews(['set-sub', 'col-other'])
+      const sub = join(bundle, 'Notes', 'Daily', 'Sub')
+      expect(
+        (await settledMutate(root, { op: 'emptyBundle', bundlePath: sub }, nexusDeps)).ok,
+      ).toBe(true)
+      await finishOwed(root, nexusDeps)
+      expect((await readJsonAt(sidecar())).views).toEqual(located(['col-other']))
+    })
+
+    it('an inner Set emptied before its bundle comes back whole still takes the views naming it and its sub-Set, and keeps those naming what came back', async () => {
+      const bundle = await owingViews(['set-sub', 'set-deeper', 'set-daily', 'col-other'])
+      const sub = join(bundle, 'Notes', 'Daily', 'Sub')
+      const disposing = { ...nexusDeps, trashToSystem: (p: string) => rm(p, { recursive: true }) }
+      expect(
+        (await settledMutate(root, { op: 'emptyBundle', bundlePath: sub }, disposing)).ok,
+      ).toBe(true)
+      expect(await pathExists(join(root, sub))).toBe(false)
+      expect((await settledMutate(root, { op: 'restore', bundlePath: bundle }, nexusDeps)).ok).toBe(
+        true,
+      )
+      await finishOwed(root, nexusDeps)
+      expect((await readJsonAt(sidecar())).views).toEqual(located(['set-daily', 'col-other']))
+    })
+  })
+
   it('a Set deleted to the system trash drops its pages’ entries with the delete, and keeps another page’s', async () => {
     const PAGE_G = '01KVGMT8BFP350FZZXAMG1QDVG'
     await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${PAGE_B}\n---\nbeta`)
@@ -1851 +1963 @@ describe('emptyBundle — giving a bundle up for good', () => {
       )
       await refreshTree(root)
       await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
-      expect((await emptyNotes(nexusDeps)).ok).toBe(true)
+      expect(
+        (await emptyNotes({ ...nexusDeps, trashToSystem: (p) => rm(p, { recursive: true }) })).ok,
+      ).toBe(true)
       expect((await readJsonAt(sidecar)).views).toEqual(located(['col-other']))
     })
   })
```

##### Core/Trash/trashRecovery.test.ts

```/Core/Trash/trashRecovery.test.ts diff
@@ -1 +1 @@
 // Every restoration combination the surface can produce, driven through the same ops the leaf calls, against a real nexus on disk.
-import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
+import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
 import { join } from '../Paths/posix'
-import { tempRoot } from '../Testing/hostFs'
+import { bytesUnder, putJson, readJsonAt, refuseWrites, tempRoot } from '../Testing/hostFs'
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
 import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
 import * as atomicWrite from '../Files/atomicWrite'
@@ -27 +27 @@ import type { Pushes } from '../Contract/bridge'
 import { renameProperty } from '../Properties/registryProperty'
 import { setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
 import type { TrashDeps } from './discard'
+import type { RestoreDestination } from '../Nexus/mutateRequest'
+import { readNotes } from '../Nexus/owed'
 
 let root: string
 const handed: string[] = []
@@ -879 +881 @@ describe('links come back with the page', () => {
     expect(await rows()).toHaveLength(0)
   })
 })
+
+describe('an item pulled out of a trashed bundle', () => {
+  const gamma = join('Plain', 'Gamma.md')
+  const GAMMA_ID = '01KVGMT8BFP350FZZXAMG1QDVD'
+  const INTO_JOURNAL: RestoreDestination = { kind: 'container', id: 'col-journal' }
+  const INTO_PLAIN: RestoreDestination = { kind: 'container', id: 'col-plain' }
+  const pull = (bundlePath: string, destination?: RestoreDestination) =>
+    settledMutate(
+      root,
+      { op: 'restore', bundlePath, ...(destination ? { destination } : {}) },
+      deps,
+    )
+  const bundleOf = async (title: string) => (await find(title)).bundlePath
+  const listed = async (...segs: string[]) => (await readdir(join(root, ...segs))).sort()
+  const owed = async () =>
+    Object.values(await readNotes(root)).find((e) => e.kind === 'container')?.strip ?? []
+  const located = (id: string) => ({
+    id: `view_${id}`,
+    name: id,
+    type: 'table',
+    filter: { match: 'all', rules: [{ property_id: '_location', op: 'is', values: [id] }] },
+  })
+  // Daily holding Sub, deleted while Plain's views naming both refuse their edit, so the delete owes it.
+  const owingSetViews = async () => {
+    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
+    const sidecar = join(root, 'Plain', '_pagecollection.json')
+    const views = ['set-daily', 'set-sub'].map(located)
+    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
+    const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar)
+    await del('Journal/Daily', 'set')
+    refusal.mockRestore()
+    return { sidecar, views, bundle: await bundleOf('Daily') }
+  }
+  const finish = async () =>
+    expect((await settledMutate(root, { op: 'finishOwed' }, deps)).ok).toBe(true)
+
+  it('a page pulled from a trashed Set restores to a given container, and the bundle still holds its sibling', async () => {
+    await del('Journal/Daily', 'set')
+    const bundle = await bundleOf('Daily')
+    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
+    expect((await frontmatter(join('Journal', 'Alpha.md'))).ID).toBe(ALPHA_ID)
+    expect(await listed(bundle, 'Daily')).toEqual(['Beta.md', '_pageset.json'])
+  })
+
+  it('a kept Link value naming that page refills on its restore and leaves the bundle’s record', async () => {
+    await linker(gamma, GAMMA_ID, 'Related: "[[Alpha]]"')
+    await del('Journal/Daily', 'set')
+    const bundle = await bundleOf('Daily')
+    const kept = { page: GAMMA_ID, property: 'prop_related', value: '[[Alpha]]' }
+    expect(await readRecord(join(root, bundle))).toMatchObject({ links: [kept] })
+    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
+    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
+    expect(await readRecord(join(root, bundle))).not.toHaveProperty('links')
+  })
+
+  it('the Set’s own later restore names nothing unrestored and writes nothing twice', async () => {
+    await linker(gamma, GAMMA_ID, 'Related: "[[Alpha]]"')
+    await del('Journal/Daily', 'set')
+    const bundle = await bundleOf('Daily')
+    expect((await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)).ok).toBe(true)
+    const r = await pull(bundle)
+    expect(r.ok).toBe(true)
+    expect(r.ok && r.value).not.toHaveProperty('unrestored')
+    expect((await frontmatter(gamma)).Related).toBe('[[Alpha]]')
+    expect(await listed('Journal', 'Daily')).toEqual(['Beta.md', '_pageset.json'])
+    expect(await rows()).toHaveLength(0)
+  })
+
+  it('an inner item restored with no destination is refused as homeless, and its bundle is left byte-identical', async () => {
+    await del('Journal/Daily', 'set')
+    const bundle = await bundleOf('Daily')
+    const before = await bytesUnder(join(root, bundle))
+    const r = await pull(join(bundle, 'Daily', 'Alpha.md'))
+    expect(r.ok ? '' : r.error.message).toBe('The place this belonged to no longer exists.')
+    expect(await bytesUnder(join(root, bundle))).toEqual(before)
+  })
+
+  it('a nested Set pulled out lands with its pages, and carries what was archived from within it into the landing Collection’s Archive', async () => {
+    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
+    await page(join('Journal', 'Daily', 'Sub', 'Deep.md'), GAMMA_ID)
+    await page(join('Journal', 'Daily', 'Sub', 'Kept.md'), ALEPH_ID)
+    await refreshTree(root)
+    const archived = await settledMutate(
+      root,
+      { op: 'archive', path: 'Journal/Daily/Sub/Kept.md', kind: 'page' },
+      deps,
+    )
+    expect(archived.ok).toBe(true)
+    await del('Journal/Daily', 'set')
+    const bundle = await bundleOf('Daily')
+    expect((await pull(join(bundle, 'Daily', 'Sub'), INTO_PLAIN)).ok).toBe(true)
+    expect(await listed('Plain', 'Sub')).toEqual(['Deep.md', '_pageset.json'])
+    expect(await listed(bundle, 'Daily')).toEqual(['Alpha.md', 'Beta.md', '_pageset.json'])
+    expect(await listBundles(root, { kind: 'archive', id: 'col-journal' })).toEqual([])
+    const [refiled, ...rest] = await listBundles(root, { kind: 'archive', id: 'col-plain' })
+    expect(rest).toEqual([])
+    expect(refiled).toMatchObject({
+      artifactName: 'Kept.md',
+      record: { id: ALEPH_ID, parent: { kind: 'container', id: 'set-sub' }, trail: ['col-plain'] },
+    })
+  })
+
+  it.each([
+    [false, true],
+    [false, false],
+    [true, true],
+    [true, false],
+  ])('a page pulled while its Set’s delete still owes its strip comes off the strip, and Try Again keeps the linker on its landing (stepped aside %s, linker refused at the pull %s)', async (aside, refusedAtPull) => {
+    await linker(gamma, GAMMA_ID, 'Related: "[[Daily/Alpha]]"')
+    const refusal = refuseWrites('rewritePreservingTimes', (file) => file === join(root, gamma))
+    await del('Journal/Daily', 'set')
+    expect(await owed()).toContain('Journal/Daily/Alpha.md')
+    if (aside) await page(join('Journal', 'Alpha.md'), ALEPH_ID)
+    await refreshTree(root)
+    if (!refusedAtPull) refusal.mockRestore()
+    const bundle = await bundleOf('Daily')
+    const r = await pull(join(bundle, 'Daily', 'Alpha.md'), INTO_JOURNAL)
+    expect(r.ok && r.value.landedAs).toBe(aside ? 'Alpha (2)' : undefined)
+    expect(await owed()).not.toContain('Journal/Daily/Alpha.md')
+    refusal.mockRestore()
+    expect((await settledMutate(root, { op: 'finishOwed' }, deps)).ok).toBe(true)
+    expect((await frontmatter(gamma)).Related).toBe(
+      aside ? '[[Journal/Alpha (2)|Alpha (2)]]' : '[[Journal/Alpha|Alpha]]',
+    )
+    expect(await readRecord(join(root, bundle))).not.toHaveProperty('links')
+  })
+
+  it('a Set pulled from a trashed Collection keeps its own and its sub-Set’s views once the Collection’s owed view edit runs, and a filter naming a Set still in the bundle drops', async () => {
+    await putJson(join(root, 'Journal', 'Daily', 'Sub', '_pageset.json'), { id: 'set-sub' })
+    await putJson(join(root, 'Journal', 'Weekly', '_pageset.json'), { id: 'set-weekly' })
+    const sidecar = join(root, 'Plain', '_pagecollection.json')
+    const views = ['set-daily', 'set-sub', 'set-weekly'].map(located)
+    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
+    const refusal = refuseWrites('editJsonStrict', (file) => file === sidecar)
+    await del('Journal', 'collection')
+    refusal.mockRestore()
+    const entry = Object.values(await readNotes(root)).find((e) => e.kind === 'container')
+    expect(entry?.edit).toMatchObject({
+      ids: expect.arrayContaining(['set-daily', 'set-sub', 'set-weekly']),
+    })
+    const bundle = await bundleOf('Journal')
+    expect((await pull(join(bundle, 'Journal', 'Daily'), INTO_PLAIN)).ok).toBe(true)
+    expect((await settledMutate(root, { op: 'finishOwed' }, deps)).ok).toBe(true)
+    const { filter, ...unfiltered } = views[2]
+    expect((await readJsonAt(sidecar)).views).toEqual([views[0], views[1], unfiltered])
+  })
+
+  it('a Set restored whole keeps the views naming a Set inside it archived since, once its delete’s owed view edit runs', async () => {
+    const { sidecar, views, bundle } = await owingSetViews()
+    expect((await pull(bundle)).ok).toBe(true)
+    const archived = { op: 'archive', path: 'Journal/Daily/Sub', kind: 'set' } as const
+    expect((await settledMutate(root, archived, deps)).ok).toBe(true)
+    await finish()
+    expect((await readJsonAt(sidecar)).views).toEqual(views)
+  })
+
+  it('a Set pulled from a trashed Set and archived since keeps its views once the delete’s owed view edit runs, and the Set still in the bundle drops', async () => {
+    const { sidecar, views, bundle } = await owingSetViews()
+    expect((await pull(join(bundle, 'Daily', 'Sub'), INTO_PLAIN)).ok).toBe(true)
+    const archived = { op: 'archive', path: 'Plain/Sub', kind: 'set' } as const
+    expect((await settledMutate(root, archived, deps)).ok).toBe(true)
+    await finish()
+    const { filter, ...unfiltered } = views[0]
+    expect((await readJsonAt(sidecar)).views).toEqual([unfiltered, views[1]])
+  })
+
+  it('a Collection emptied for good whose Archive refuses to go still takes the views naming that Archive’s Sets at its Try Again', async () => {
+    const archived = { op: 'archive', path: 'Journal/Daily', kind: 'set' } as const
+    expect((await settledMutate(root, archived, deps)).ok).toBe(true)
+    await del('Journal', 'collection')
+    const sidecar = join(root, 'Plain', '_pagecollection.json')
+    const views = [located('set-daily')]
+    await writeFile(sidecar, JSON.stringify({ id: 'col-plain', views }))
+    await refreshTree(root)
+    const archive = join(root, '.nexus', 'archive', 'col-journal')
+    const refusing: TrashDeps = {
+      ...deps,
+      trashToSystem: async (p) => {
+        if (p === archive) throw new Error('refused')
+        await rm(p, { recursive: true })
+      },
+    }
+    const emptied = { op: 'emptyBundle', bundlePath: await bundleOf('Journal') } as const
+    expect((await settledMutate(root, emptied, refusing)).ok).toBe(false)
+    await finish()
+    const { filter, ...unfiltered } = views[0]
+    expect((await readJsonAt(sidecar)).views).toEqual([unfiltered])
+  })
+})
```

##### Core/Views/Host/useColumnStyles.test.ts

```/Core/Views/Host/useColumnStyles.test.ts diff
@@ -103 +103 @@ describe('a column follows the Nexus until it picks its own', () => {
     expect(pick('time_format', 'twentyFourHour')).toBe('shown')
     expect(pick('time_format', 'twelveHour')).toBe('twelveHour')
     expect(pick('time_format', 'none')).toBeUndefined()
+    expect(pick('time_format', 'shown')).toBe('shown')
   })
 })
```

##### UIX/Interactions/engine.test.tsx

```/UIX/Interactions/engine.test.tsx diff
@@ -143 +143 @@ const ROWS = ['r1', 'r2', 'r3']
 let lineRows = ROWS
 let commit: Mock<(id: string, slot: string) => void>
 let lineSpec: Partial<LineSpec<string, Row[]>>
-let rowOpts: Record<string, { open?: () => void }>
+let rowOpts: Record<string, { open?: () => void; space?: () => void }>
 let watch: number
 
 function slotAt(id: string, p: { y: number }, rows: Row[]): string | null {
@@ -660 +660 @@ describe('the drag handle keyboard', () => {
     const onOpen = vi.fn()
     const openable = await renderZone(onOpen, { disabled: true })
     await press(openable.handle, ' ')
+    expect(onOpen).toHaveBeenCalledOnce()
     expect(lifted(openable.handle)).toBe(false)
     await press(openable.handle, 'Enter')
-    expect(onOpen).toHaveBeenCalledOnce()
+    expect(onOpen).toHaveBeenCalledTimes(2)
     expect(openable.handle.getAttribute('tabindex')).toBe('0')
     expect(openable.handle.hasAttribute('aria-disabled')).toBe(false)
     openable.done()
@@ -1054 +1055 @@ describe('the line zone', () => {
   })
 
   it('refuses a lift with no snapshot and nothing to carry', async () => {
+    const open = vi.fn()
     lineSpec = { snap: () => null }
+    rowOpts = { r1: { open } }
     await mount()
     await dragHold('r1', 100, 70)
     await release(100, 70)
     await act(async () => item('r1').focus())
     await press(item('r1'), ' ')
+    expect(open).toHaveBeenCalledOnce()
     expect(spoken()).toEqual([])
     expect(item('r1').hasAttribute('data-drag-source')).toBe(false)
     lineSpec = { snap: () => null, carry: [carries(BOARD, (id) => id)] }
@@ -1069 +1073 @@ describe('the line zone', () => {
     pressEscape()
   })
 
+  it('runs a row’s own Space where it can’t lift, and its opener on Enter', async () => {
+    const open = vi.fn()
+    const space = vi.fn()
+    lineSpec = { snap: () => null }
+    rowOpts = { r1: { open, space } }
+    await mount()
+    await act(async () => item('r1').focus())
+    await press(item('r1'), ' ')
+    expect(space).toHaveBeenCalledOnce()
+    expect(open).not.toHaveBeenCalled()
+    await press(item('r1'), 'Enter')
+    expect(open).toHaveBeenCalledOnce()
+    expect(space).toHaveBeenCalledOnce()
+  })
+
+  it('lifts on Space a row that can, its own Space left alone', async () => {
+    const space = vi.fn()
+    rowOpts = { r1: { space } }
+    await mount()
+    await act(async () => item('r1').focus())
+    await press(item('r1'), ' ')
+    expect(item('r1').hasAttribute('data-drag-source')).toBe(true)
+    expect(space).not.toHaveBeenCalled()
+    pressEscape()
+  })
+
   it('steps by keyboard naming the neighbour and commits', async () => {
     await act(async () => item('r1').focus())
     await press(item('r1'), ' ')
```

##### UIX/Interactions/gesture.test.ts

```/UIX/Interactions/gesture.test.ts diff
@@ -255 +255 @@ describe('a release before activation is a tap, and only a release', () => {
     expect(click.defaultPrevented).toBe(true)
   })
 
+  it('a refused activation ends as a tap, so a drifted release still clicks', () => {
+    gesture.beginPointerGesture(spec({ onActivate: () => false }))
+    move(20, 20)
+    firePointer(el, 'pointerup')
+    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
+    el.dispatchEvent(click)
+    expect(click.defaultPrevented).toBe(false)
+  })
+
   it('an activated release drops rather than taps', () => {
     const calls: string[] = []
     gesture.beginPointerGesture(
```

##### UIX/Interactions/virtualRows.test.tsx

```/UIX/Interactions/virtualRows.test.tsx diff
@@ -0 +1 @@
+// @vitest-environment jsdom
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+import { act, useState } from 'react'
+import { createRoot, type Root } from 'react-dom/client'
+import { useVirtualRows } from './virtualRows'
+;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
+
+let host: HTMLDivElement
+let root: Root
+let drawn: number[]
+
+beforeEach(() => {
+  host = document.createElement('div')
+  document.body.appendChild(host)
+  root = createRoot(host)
+})
+afterEach(() => {
+  act(() => root.unmount())
+  host.remove()
+})
+
+function List({ keep }: { keep?: number }): React.JSX.Element {
+  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
+  const [listEl, setListEl] = useState<HTMLElement | null>(null)
+  const { rows } = useVirtualRows({ count: 100, rowHeight: 20, listEl, scrollEl, keep }, [])
+  drawn = rows.map((row) => row.index)
+  return (
+    <div
+      ref={(el) => {
+        if (el) Object.defineProperty(el, 'offsetHeight', { value: 100 })
+        setScrollEl(el)
+      }}
+    >
+      <div ref={setListEl} />
+    </div>
+  )
+}
+
+describe('useVirtualRows', () => {
+  it('draws the kept row wherever it sits, with its neighbours, in order', async () => {
+    await act(async () => root.render(<List />))
+    expect(drawn.length).toBeGreaterThan(0)
+    expect(drawn).not.toContain(50)
+    await act(async () => root.render(<List keep={50} />))
+    expect(drawn).toEqual(expect.arrayContaining([49, 50, 51]))
+    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
+  })
+
+  it('draws a kept row above the window first, clamped to the list', async () => {
+    await act(async () => root.render(<List keep={0} />))
+    const scroller = host.firstElementChild as HTMLElement
+    await act(async () => {
+      scroller.scrollTop = 1000
+      scroller.dispatchEvent(new Event('scroll'))
+    })
+    expect(drawn).not.toContain(2)
+    expect(drawn.slice(0, 2)).toEqual([0, 1])
+    expect(drawn).toEqual([...drawn].sort((a, b) => a - b))
+  })
+})
```

---

##### .claude/IssuesPM.md

```/.claude/IssuesPM.md diff
@@ -4 +4 @@
 
 | Total | Critical | High | Moderate | Low | Minimal |
 |-------|----------|------|----------|-----|---------|
-| 76 | 0 | 3 | 13 | 35 | 25 |
+| 80 | 0 | 3 | 13 | 37 | 27 |
 
 #### A1 • Sync & Devices
 
@@ -69 +69 @@
 | [I-038](#I-038 • An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event.) | An outside edit to a page inside a folder the app just renamed or moved is lost until the page's next event. | Low | Small (=🟢+8=) | Shortcut | `93baa6931` | **Created:** 10-01-2026<br>**Updated:** 10-16-2026 |
 | [I-062](#I-062 • Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure.) | Un-excluding a folder re-spells the links to every page elsewhere that shares a title with one of its pages, with a console line only on failure. | Low | Small (=🟢+8=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
 | [I-063](#I-063 • A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path.) | A heading rename and a move of the same page in one outside batch aim the heading rename's sweep at the page's old path. | Low | Small (=🟢+6=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
+| [I-077](#I-077 • A Set or Collection emptied out of the Trash or the Archive one item at a time stays behind as an empty row.) | A Set or Collection emptied out of the Trash or the Archive one item at a time stays behind as an empty row. | Low | Small (TBD) | Shortcut | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
 | [I-064](#I-064 • A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them.) | A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them. | Minimal | Medium (=🟢+25=) | Parallel Build | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
 | [I-065](#I-065 • A Link value naming a title that two pages of one trashed bundle share is parked with neither.) | A Link value naming a title that two pages of one trashed bundle share is parked with neither. | Minimal | Mini (=🟢+2=) | Shortcut | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
 | [I-069](#I-069 • A Trash bundle whose record holds its link targets as bare IDs fails to decode and drops out of the Trash.) | A Trash bundle whose record holds its link targets as bare IDs fails to decode and drops out of the Trash. | Minimal | Mini (±0) | Residue | `a0441edc9` | **Created:** 10-19-2026<br>**Updated:** 10-19-2026 |
 | [I-070](#I-070 • A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title.) | A restore that lands on a taken name always renames the item coming back, and nothing chooses which side keeps the title. | Minimal | Medium (=🟢+30=) | Shortcut | `213f95a3b` | **Created:** 10-19-2026<br>**Updated:** 10-21-2026 |
 | [I-071](#I-071 • Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included.) | Every write to the exclusion list re-reads the Nexus, restarts the watcher, and has sync re-check, carried entries included. | Minimal | Medium (TBD) | Shortcut | `d0e31804c` | **Created:** 10-20-2026<br>**Updated:** 10-21-2026 |
 | [I-072](#I-072 • An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk.) | An outside unlink within the watcher's write hold of the app's own write leaves a ghost until the next walk. | Minimal | Mini (=🔴−1=) | Shortcut | `d0e31804c` | **Created:** 10-21-2026<br>**Updated:** 10-21-2026 |
+| [I-079](#I-079 • Confirm Before Deletion never spares a delete from the Trash, and its hint doesn't say so.) | Confirm Before Deletion never spares a delete from the Trash, and its hint doesn't say so. | Minimal | Mini (±0) | Drift | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
 
 #### A4 • Architecture
 
@@ -89 +91 @@
 | ----- | ----------------------------------------------- | -------- | -------- | ---------- | --------- | ------------- |
 | [I-030](#I-030 • Buttons never show keyboard focus.) | Buttons never show keyboard focus. | Moderate | Mini (=🟢+4=) | Drift | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-03-2026 |
 | [I-031](#I-031 • Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown.) | Inside a pop-up pane, pressing a second dropdown while one list is open cuts the list's close short and reopens it at the new dropdown. | Low | Small (=🟢+8=) | Shortcut | `e3d5c1a10` | **Created:** 09-24-2026<br>**Updated:** 10-03-2026 |
-| [I-075](#I-075 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.) | Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only. | Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-23-2026 |
+| [I-075](#I-075 • Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only.) | Telling a single click from a double-click on one element is done separately on each surface, in five different ways, with the double-click window written as a number in one place only. | Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-26-2026 |
+| [I-080](#I-080 • A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path.) | A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path. | Low | Small (TBD) | Shortcut | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
 | [I-051](#I-051 • Four waits that let a transition finish each state their own slack.) | Four waits that let a transition finish each state their own slack. | Minimal | Small (=🔴−2=) | Drift | `7933c518d` | **Created:** 10-03-2026<br>**Updated:** 10-03-2026 |
 | [I-050](#I-050 • Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates.) | Where a pop-up appears is worked out inside a 50-line block tangled with its screen updates. | Minimal | Small (=🟢+2=) | Patch-Over | `f6511401d` | **Created:** 09-23-2026<br>**Updated:** 10-16-2026 |
 | [I-061](#I-061 • A row's hint in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none.) | A row's hint in a pane that sizes to its content stays on one line and widens the pane, so the format rows carry none. | Minimal | Mini (TBD) | Drift | `54e93e491` | **Created:** 10-18-2026<br>**Updated:** 10-25-2026 |
 | [I-073](#I-073 • Only the Date & Time editor's settings rows carry icons, and no row says whether it sets a property everywhere or only the current view.) | Only the Date & Time editor's settings rows carry icons, and no row says whether it sets a property everywhere or only the current view. | Minimal | Small (TBD) | Drift | `4f63cba01` | **Created:** 10-21-2026<br>**Updated:** 10-25-2026 |
+| [I-078](#I-078 • Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead.) | Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead. | Minimal | Mini (TBD) | Drift | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
 
 #### A6 • Tiles & Embeds
 
@@ -801 +805 @@ Two of the three hand-authored files, `nexus.json` and `settings.json`, read thr
 
 Route the four readers (the walk's `readConfig`, `readNavigationFile`, `readMatrixFile`, and the file-event arms for `state.json`, `homepage.json`, and `crops.json`) through `readAppFileKnown`. When a file answers `undefined`, the open posts one notice, as the board does: its section shows defaults, and its changes won't save until it reads. `collectRefs` pushes a `skipped` entry for a store that answers `undefined`, so the sweep holds. Leave `persist`'s quiet flag alone, since the notice at open already tells the user. **Your call:** `state.json` alone. Either it holds the open, because it seeds the order every surface reads, or it opens with defaults and the notice. Matrix, Homepage and crops follow the board.
 
+#### I-074 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.
+
+| Concern | Scale | Origin | Base | Date |
+|---------|-------|--------|------|------|
+| Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |
+
+**Description**
+
+Removing a property from a Collection moves its values off the Collection's pages into a stash (`property_stash`) in the Collection's own settings file, where re-adding the property restores them. The stash stays there, and its entries are kept for the History Timeframe (`historyDays`), the setting that sets how long page history snapshots and captures are kept; after that, they're cleaned out. That setting measures the age of saved page text, and a stash entry is a removed property's values waiting to be re-added, so one number sets how long both are recoverable. The Archive already separates these cases: Archive History Timeframe (`archiveHistoryDays`) sets how long archived pages keep their snapshots, follows History Timeframe until it's picked, and never exceeds it. The stash has no such setting, so removed values can't be kept longer than page history, or cleaned out sooner, without changing page history too.[^74]
+
+**Solution** [Deferred]
+
+A stash timeframe set beside the Archive's: a stepped setting over the same day steps, placed after Archive History Timeframe in the History section, that follows History Timeframe until picked and never exceeds it. The cleanup of expired stash entries reads it in place of `historyDays`.
+
 #### I-076 • An action refused for earlier work still owed runs that cleanup unseen, so files it lets go are never named and Try Again leaves the action undone.
 
 | Concern | Scale | Origin | Base | Date |
@@ -877 +895 @@ A page whose heading is renamed and which is moved in one outside batch, such as
 
 The heading arm resolves `seen.path` to the page's live path through `livePathOf` by the page's id, or runs after the move arm so the held tree and the recorded path agree.
 
+#### I-077 • A Set or Collection emptied out of the Trash or the Archive one item at a time stays behind as an empty row.
+
+| Concern | Scale | Origin | Base | Date |
+|---------|-------|--------|------|------|
+| Low | Small (TBD) | Shortcut | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
+
+**Description**
+
+A Set's or Collection's row in the Trash or the Archive opens onto the pages and Sets inside it, and each of those can be restored or deleted on its own. Once every item inside has left that way, the container's row stays in its store with nothing beneath it, and restoring it brings back an empty Set or Collection carrying its own views and settings. Pulling out an inner item spends only that item's share of the bundle: `spendBundle` removes the whole bundle only when the op names the whole bundle, and for an inner item it strips the Link values the item carried away and its pages from the strip the bundle's delete still owes, without asking whether the container holds anything else. The container's folder and sidecar stay in the bundle, so `bundleArtifact` still finds the bundle's one artifact and `listBundles` keeps listing it. A Trash restore (`restoreTrashed`), an Archive restore (`restoreArchived`), emptying from the Trash (`emptyBundle`), and an Archive delete (`deleteOp`) all spend an inner item through this one path. Nathan isn't happy with the empty row and wants it revisited.[^77]
+
+**Solution** [TBD]
+
+`spendBundle`'s inner arm is the one place that knows an item just left its container, so whatever the answer is, it lands there and reaches all four ops at once. **Your call:** whether a container emptied of its items leaves its store with the last one, or stays as a restorable empty Set or Collection that still carries its views and settings, and whether a Trash container emptied that way is deleted for good or offered for deletion.
+
 #### I-064 • A page dragged out of the Trash in Finder is read as an arrival, so its own stale links aren't repaired as a restore repairs them.
 
 | Concern | Scale | Origin | Base | Date |
@@ -961 +993 @@ Chokidar's `awaitWriteFinish` holds a path until it has been quiet for about 200
 
 Drop `awaitWriteFinish`, since the event batch already debounces 200 ms, at the cost of one unreadable read of a half-written outside page; or re-stat a held path once its hold ends.
 
-#### I-074 • A property's stash ages out on the page history timeframe, a setting that governs a different kind of data, so the stash likely needs a timeframe of its own.
+#### I-079 • Confirm Before Deletion never spares a delete from the Trash, and its hint doesn't say so.
 
 | Concern | Scale | Origin | Base | Date |
 |---------|-------|--------|------|------|
-| Low | Medium (TBD) | Shortcut | `57da5c1db` | **Created:** 10-22-2026<br>**Updated:** 10-25-2026 |
+| Minimal | Mini (±0) | Drift | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
 
 **Description**
 
-Removing a property from a Collection moves its values off the Collection's pages into a stash (`property_stash`) in the Collection's own settings file, where re-adding the property restores them. The stash stays there, and its entries are kept for the History Timeframe (`historyDays`), the setting that sets how long page history snapshots and captures are kept; after that, they're cleaned out. That setting measures the age of saved page text, and a stash entry is a removed property's values waiting to be re-added, so one number sets how long both are recoverable. The Archive already separates these cases: Archive History Timeframe (`archiveHistoryDays`) sets how long archived pages keep their snapshots, follows History Timeframe until it's picked, and never exceeds it. The stash has no such setting, so removed values can't be kept longer than page history, or cleaned out sooner, without changing page history too.[^74]
+Turning off Confirm Before Deletion lets a page, a tile, or a folder that carries no schema go without a question, and its hint lists what always asks: Collections, Sets, Contexts, Spaces, views, and properties. A Delete in the Trash empties for good and always asks whatever the setting, since `askEmptyTrash` never reads the waiver, but the hint says nothing of the Trash, so a reader of the setting expects a page emptied from the Trash to go unasked.[^79]
 
-**Solution** [Deferred]
+**Solution** [Proposed]
 
-A stash timeframe set beside the Archive's: a stepped setting over the same day steps, placed after Archive History Timeframe in the History section, that follows History Timeframe until picked and never exceeds it. The cleanup of expired stash entries reads it in place of `historyDays`.
+The hint names the Trash among what always asks, which keeps an empty for good behind its question.
 
 ### A4 • Architecture
 
@@ -1039 +1071 @@ Either every outside-press dismissal calls `suppressReleaseClick()`, so the tile
 
 | Concern | Scale | Origin | Base | Date |
 |---------|-------|--------|------|------|
-| Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-23-2026 |
+| Low | Medium (=🟢≈ +25=) | Parallel Build | `cbacb7ecb` | **Created:** 10-23-2026<br>**Updated:** 10-26-2026 |
 
 **Description**
 
@@ -1052 +1084 @@ Where one element answers both a click and a double-click, the code that tells t
 | Embedded page tile | Seats the caret at the nearer edge | Falls to the editor's word selection | `detail` guard |
 | Link in the editor | Follows the link, on `click` only at `detail === 1` | Falls to the editor's word selection | `detail` guard, at `mousedown` and again at `click` |
 | Table cell | Enters the cell at the point, unless a drag just selected text | Enters the cell, selecting the word | `detail` guard, for the selection case only |
+| Trash or Archive row | Discloses a Set or Collection, or checks a page | Leaves a page checked and opens it, in the Archive | `detail` guard |
 | Tab | Activates the tab | Renames it only if the tab was already active at the first press | First-press-acts, through a ref set at `mousedown` |
 | Page title in the detail header | Opens the search at once | Reverses into a rename | Act-then-take-over, through a `mousedown` listener on `window` |
 | Group band glyph | Toggles the group, on a band that doesn't open | Toggles it twice, or opens the Set on a band that does | None |
 | Tab bar | Nothing | Zooms the window | None |
 | Rename labels | Whatever the surrounding row's click does | Begins the rename | None |
 
-The surfaces differ in observable ways. Only the alias picker delays its single click, and its test restates the 300 ms as `PICK_WAIT`, so the window is a number in two files and no other surface reads it. A Set band that doesn't open lets the glyph's click toggle its group on each press of a double-click, so the group folds and unfolds again under the pointer, where the same double-click opens the Set on a band that does. A double-click on an inactive tab activates it and doesn't rename it, so renaming takes a second one, and the detail header's title shows its search for the length of a double-click before the rename replaces it. `RenamableTitle`'s `doubleClick` flag exists so a band can switch the rename door off, which says each surface that disagrees with it has to opt out. The `detail` thresholds also differ: the editor's link and embed guards pass on `detail > 1`, its link click on `detail !== 1`, and the margin press on `detail > 2`.
-
-`Core/Bundles/browser.ts` doesn't read `detail` yet. The ratified Disclosable Bundles plan adds `rowClick(row, detail)` there, where a container discloses and a page checks on `detail === 1` and a page on `detail === 2` makes sure it is checked, and a single click is never delayed. It is the next surface to write the same decision by hand.[^75]
+The surfaces differ in observable ways. Only the alias picker delays its single click, and its test restates the 300 ms as `PICK_WAIT`, so the window is a number in two files and no other surface reads it. A Set band that doesn't open lets the glyph's click toggle its group on each press of a double-click, so the group folds and unfolds again under the pointer, where the same double-click opens the Set on a band that does. A double-click on an inactive tab activates it and doesn't rename it, so renaming takes a second one, and the detail header's title shows its search for the length of a double-click before the rename replaces it. `RenamableTitle`'s `doubleClick` flag exists so a band can switch the rename door off, which says each surface that disagrees with it has to opt out. The `detail` thresholds also differ: the editor's link and embed guards pass on `detail > 1`, its link click on `detail !== 1`, and the margin press on `detail > 2`, while a Trash or Archive row acts on `detail < 2` and opens on `detail === 2`.[^75]
 
 **Solution** [TBD]
 
-One interaction primitive beside `activate.ts` and `gesture.ts` in `UIX/Interactions/` owns the decision. It holds the double-click window as one value and offers the strategies a surface may choose between: acting at once and ignoring the second press, or waiting out the window. The alias picker's timer and constant, the calendar's guard, the editor's guards, the tab's ref, the header's listener, the group band's toggle, and the Bundles browser's `rowClick` move onto it, and `PICK_DELAY_MS` and the test's `PICK_WAIT` leave. A task would touch the primitive and its test, the ten surfaces above, and the plan's Task 4-1. **Your call:** which strategy is the default, with acting at once keeping every click immediate and waiting making a toggle's double-click quiet at the cost of a delay on every single click, and whether a group band's toggle should wait so the double-click stops flickering. Whether the editor's `mousedown` guards, which pass a second press to word selection rather than choose between two actions, belong on the primitive or beside it is the other open point.
+One interaction primitive beside `activate.ts` and `gesture.ts` in `UIX/Interactions/` owns the decision. It holds the double-click window as one value and offers the strategies a surface may choose between: acting at once and ignoring the second press, or waiting out the window. The alias picker's timer and constant, the calendar's guard, the editor's guards, the tab's ref, the header's listener, the group band's toggle, and the Bundles browser's `rowClick` move onto it, and `PICK_DELAY_MS` and the test's `PICK_WAIT` leave. A task would touch the primitive and its test and the eleven surfaces above. **Your call:** which strategy is the default, with acting at once keeping every click immediate and waiting making a toggle's double-click quiet at the cost of a delay on every single click, and whether a group band's toggle should wait so the double-click stops flickering. Whether the editor's `mousedown` guards, which pass a second press to word selection rather than choose between two actions, belong on the primitive or beside it is the other open point.
+
+#### I-080 • A bundle row's menu opens only by pointer, so the Trash's Restore and Delete have no keyboard path.
+
+| Concern | Scale | Origin | Base | Date |
+|---------|-------|--------|------|------|
+| Low | Small (TBD) | Shortcut | `1028ed405` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
+
+**Description**
+
+The Trash's and the Archive's table rows take the line list's keyboard, Tab, the arrows, Enter, and Space, and reach Restore and Delete only through a row's context menu or, in the Archive, the bar over its checked rows. No key raises a row's menu: a line row answers no menu key, and the Trash has no bar, so a keyboard user can check rows in the Trash but can't restore or delete them.[^80]
+
+**Solution** [Proposed]
+
+A line row answers the platform's menu key by raising its own context menu at the row, in the kit, so every line list gains it at once and the Trash needs no bar.
 
 #### I-051 • Four waits that let a transition finish each state their own slack.
 
@@ -1122 +1167 @@ The Date & Time editor gives each of its three rows (Date, Day, and Time) an ico
 
 Every settings row in the Number, Link, Checkbox, and File editors carries an icon as the Date & Time editor's do. How a row says which layer it sets, and how each type's settings are laid out, wait for a design pass by the owner. Until then, work on Properties moves only a setting that's genuinely misplaced or genuinely confusing, and leaves the rows' wording as it reads.
 
+#### I-078 • Every line row points screen readers at the drag instructions, including rows in a list that can't be dragged, where Space acts on the row instead.
+
+| Concern | Scale | Origin | Base | Date |
+|---------|-------|--------|------|------|
+| Minimal | Mini (TBD) | Drift | `312d63751` | **Created:** 10-26-2026<br>**Updated:** 10-26-2026 |
+
+**Description**
+
+Every row of a line list points screen readers at the drag instructions through `aria-describedby`, whose text says to "press space to pick it up". In a list that can't be dragged, such as the Trash and Archive table, where Space checks the row, and a navigation list with nothing to reorder, where Space opens it, the description names a gesture the row doesn't have. `useLineRow` sets the description on every row, and `useDragItem` does the same for a displace item, including one in a disabled zone that still opens. The two locks don't reach the hooks the same way. A displace zone's `disabled` sits on the zone value both hooks read, but a line list's lock is `lineList`'s `locked`, which only makes its `snap` answer nothing, so the keyboard's lift is refused and nothing the row hook reads says why. Turning `locked` into the zone's `disabled` would also take the list out of the Tab order, which the Trash and Archive table needs.[^78]
+
+**Solution** [Proposed]
+
+The zone value carries whether its rows can lift, with `lineList`'s `locked` set on the spec where the zone can read it, and both hooks describe the instructions only when a row can lift.
+
 ### A6 • Tiles & Embeds
 
 #### I-025 • In a free-text markdown tile, the footnotes divider and the footnote reveal do nothing.
@@ -1349 +1408 @@ Paths are relative to `Core/MarkdownPM/`, and the test's name settles any drift
 [^30]: **I-030:** `UIX/Buttons/button-base.css.ts:68-93` (`button`), `UIX/Buttons/Button.tsx:54-77`, `UIX/Menus/menu-row.css.ts:24-37` (`rowFocus`, `rowShell`), `UIX/Fields/fieldRing.ts:11,19-33` (`fieldRing`)
 [^31]: **I-031:** `UIX/Interactions/dismissalStack.ts:60-75` (`onPointerDown`), `UIX/Interactions/dismissalStack.ts:114` (`shields`), `UIX/Pickers/PickerMenu.tsx:113-121,292,307` (`PickerMenu`), `UIX/Animations/useExitPresence.ts:8-24` (`useExitPresence`), `UIX/Pickers/PickerControl.tsx:91-114,144-148` (`PickerControl`), `Core/Actions/menuActions.ts:20-23` (`popMenu`), `Core/Session/chromeSlice.ts:62-70` (`presentMenu`), `Core/Interface/Menus/MenuPresenter.tsx:84-103` (`MenuPresenter`), `Core/Tiles/Surfaces/ViewTile.tsx:652-660`, `Core/Interface/Toolbar/Toolbar.tsx:29-33`, `Core/Views/Settings/GroupFrame.tsx:235`, `UIX/Interactions/shared.ts:26-34` (`suppressReleaseClick`)
 [^32]: **I-032:** `Core/Contract/bridge.ts:57-215` (`Asks`), `Core/Nexus/mutateRequest.ts:73-152` (`mutateRequest`), `Core/Nexus/mutate.ts:161-195` (`setProfileImage`, `setProfileIcon`, `setDisclosureLock`, `setActiveView`), `Core/Nexus/mutate.ts:229` (`reorderTop`), `Core/Nexus/reorder.ts:26-55`, `Core/Views/handlers.ts:26-64`, `Core/Settings/handlers.ts:20-53`, `Core/Assets/handlers.ts:41` (`assets:setDir`), `Core/Assets/handlers.ts:73` (`assets:adopt`), `Core/Assets/assetMigrate.ts:113`, `Core/Pages/setBanner.ts:49`, `Core/Nexus/configReach.ts:338,340`, `Core/Nexus/cascade.ts:267` (`rewriteTileConnections`), `Core/Navigation/handlers.ts:18` (`nav:write`), `Core/Matrix/handlers.ts:14` (`matrix:write`), `Core/Pages/handlers.ts:26` (`page:updateBody`), `Core/Pages/handlers.ts:45-47` (`history:restore`), `Core/Pages/fileHistory.ts:170-181` (`restoreSnapshot`), `Core/Nexus/handlers.ts:156` (`nexus:rename`), `Core/Nexus/liveTree.ts:80` (`mutableTarget`), `Core/Tiles/handlers.ts:60-113`, `Core/Contract/handlers.ts:99-112` (`withWriteRoot`), `Desktop/FileWatch/watcher.ts:69-92,114-117` (`pushConfig`)
-[^33]: **I-033:** `Core/Bundles/bundle.ts:254` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`), `Core/Trash/spend.ts:59-113` (`emptyBundle`), `Core/Trash/spend.ts:130,170` (a restore's parking), `Core/Bundles/browser.ts:288-329` (`many`, one request per row)
+[^33]: **I-033:** `Core/Bundles/bundle.ts:417` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`), `Core/Trash/spend.ts:60-114` (`emptyBundle`), `Core/Trash/spend.ts:131,171` (a restore's parking), `Core/Bundles/browser.ts:402-443` (`many`, one request per row)
 [^34]: **I-034:** `Desktop/Store/stores.ts:45-47` (`clearPath`), `Desktop/Store/stores.ts:50-77` (`upsertPageIndexes`), `Desktop/Store/stores.ts:78-98` (`removePathIndex`, `renamePathIndex`, `removePathPrefixIndex`, `renamePathPrefixIndex`), `Desktop/Store/driver.ts:16-26` (`inTransaction`), `Desktop/Store/stores.ts:217-259` (`syncStore`), `Core/Sync/handlers.ts:352,365`, `Core/Sync/Client/base.ts:16,21` (`readAllBases`, `deleteBase`)
 [^35]: **I-035:** `Core/Nexus/fileEvents.ts:438-461` (`applySpace`), `Core/Nexus/fileEvents.ts:570-590` (`applyMove`), `Core/Nexus/treePatch.ts:278-304` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:464-485` (`regroup`, `applyContexts`), `Core/Contexts/contextCascade.ts:125,150-156` (`renameContextOp`), `Core/Contexts/contextCascade.ts:167,198` (`renameSpaceOp`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Nexus/readNexus.ts:74-82` (`contextLinker`), `Core/Nexus/fileEvents.ts:361-403` (`applyPage`), `Core/Views/pageRow.ts:11-27` (`pageRowOf`), `Core/Contexts/contextResolve.ts:38` (`resolveContextKeys`)
-[^36]: **I-036:** `Core/Nexus/fileEvents.ts:146-159` (`oweRetry`, `stampable`), `Core/Nexus/fileEvents.ts:333-359` (`applyFolder`), `Core/Nexus/fileEvents.ts:361-403` (`applyPage`), `Core/Nexus/fileEvents.ts:502-518` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:248-253` (`retryUnreadable`), `Core/Nexus/settle.ts:~106-130` (`walkWhileOwed`), `Core/Nexus/settle.ts:~206-216` (`stampListed`), `Core/Nexus/settle.ts:~73-81` (`shown`), `Core/Nexus/settle.ts:~132-181` (`settle`), `Core/Trash/spend.ts:~96-265` (`restoreTrashed`, `relocate` at `:168`)
+[^36]: **I-036:** `Core/Nexus/fileEvents.ts:146-159` (`oweRetry`, `stampable`), `Core/Nexus/fileEvents.ts:333-359` (`applyFolder`), `Core/Nexus/fileEvents.ts:361-403` (`applyPage`), `Core/Nexus/fileEvents.ts:500-516` (`applySettings`, `oweRescope`), `Core/Nexus/mutate.ts:~274-279` (`retryUnreadable`), `Core/Nexus/settle.ts:~115-139` (`walkWhileOwed`), `Core/Nexus/settle.ts:~215-225` (`stampListed`), `Core/Nexus/settle.ts:~82-90` (`shown`), `Core/Nexus/settle.ts:~141-193` (`settle`), `Core/Trash/spend.ts:~120-303` (`restoreTrashed`, `relocate` at `:~201`)
 [^37]: **I-037:** `Core/Nexus/settle.ts:55` (`inTurn`), `Core/Platform/inTurns.ts:2-9` (`inTurns`), `Core/Nexus/settle.ts:203` (`payOwedWalk`), `Core/Nexus/settle.ts:206-214` (`settleNow`), `Core/Nexus/settle.ts:119-154` (`settle`), `Core/Nexus/settle.ts:96-117` (`walkWhileOwed`), `Core/Nexus/settle.ts:34-46` (`applyOwn`)
 [^38]: **I-038:** `Core/Nexus/fileEvents.ts:564-584` (`applyMove`), `Core/Nexus/treePatch.ts:238-264` (`moveNodeInTree`), `Core/Nexus/fileEvents.ts:348-374` (`applyFolder`), `Core/Nexus/fileEvents.ts:376-418` (`applyPage`), `Core/Index/indexSeed.ts:101-120` (`indexWrittenPage`), `Core/Files/atomicWrite.ts:62-75` (`relocate`), `Core/Files/writeEcho.ts:10,74-88` (`PREFIX_WINDOW_MS`, `isRecentWrite`)
 [^39]: **I-039:** `Core/Nexus/adopt.ts:62-82` (`stampPage`), `Core/Nexus/adopt.ts:89-98` (`ensurePageId`), `Core/Nexus/adopt.ts:102-115` (`stampFolder`), `Core/Nexus/adopt.ts:126-143` (`Stamp`, `stampMissing`), `Core/Nexus/adopt.ts:145-191` (`stampTree`, `stampAdopted`), `Core/Nexus/fileEvents.ts:139-143` (`oweRetry`), `Core/Nexus/fileEvents.ts:146-152` (`stampable`), `Core/Nexus/fileEvents.ts:403-404` (`applyPage`), `Core/Nexus/fileEvents.ts:454-463` (`applySpace`), `Core/Nexus/readNexus.ts:105-109,312-317`, `Core/Nexus/mutate.ts:209-213` (`retryUnreadable`), `Core/Nexus/handlers.ts:34-51,79-96` (`prepareOpenedNexus`, `openStores`), `Core/Nexus/heldPages.ts:32` (`idHeld`), `Core/Nexus/identity.ts:17-50` (`ensureIdentity`), `Core/Nexus/remintLedger.ts:88-104` (`runOpenLedger`, `readBaseline`), `Core/Nexus/remintLedger.ts:20-33,65-86` (`projectBaseline`, `pickEldest`), `Core/Nexus/record.ts:18` (`recordsOf`), `Core/Nexus/heldPages.ts:28,43-46` (`writablePathsOf`, `livePathOf`), `Core/Nexus/heldPages.ts:70-82` (`nexusPages`), `Core/Nexus/record.ts:55-56` (`pagesByIdOf`), `Core/Contexts/contextResolve.ts:29-42` (`contextWorldOf`), `Core/Contexts/contexts.ts:12-17,35-43` (`contextEntry`, `seededRegistry`), `Core/Contexts/contextsRegistry.ts:20-25` (`ensureContextsRegistry`), `Core/Trash/restoreScrub.ts:68` (`ensurePageId`)
@@ -1380 +1439 @@ Paths are relative to `Core/MarkdownPM/`, and the test's name settles any drift
 [^61]: **I-061:** `UIX/Menus/MenuRows.tsx:153` (`MenuItem`'s hint), `UIX/Menus/menu-row.css.ts:205` (`subLabel`), `UIX/Menus/FrameSlide.tsx:83` (`slotBox`), `Core/Properties/Schema/PropertyFrame.tsx:399-405` (the editor's `FrameSlide`), `Core/Properties/Schema/formatRows.ts:12-39` (`formatRows`), `Core/Settings/SettingsWindow.tsx:47-52` (`settingsRow`)
 [^62]: **I-062:** `Core/Nexus/settle.ts:~187-197` (`missedEvents`), `Core/Nexus/settle.ts:~212-230` (`settleBatch`), `Core/Nexus/settle.ts:~263-267` (`paid`), `Core/Nexus/settle.ts:~269-304` (`payOutsideMoves`), `Core/Index/indexSeed.ts:~202-259` (`seedContentIndex`, `landed` at `:221`), `Core/Contract/handlers.ts:73` (the restart's catch-up)
 [^63]: **I-063:** `Core/Nexus/settle.ts:~132-142` (the renames loop before `walkWhileOwed`), `Core/Nexus/settle.ts:~269-304` (`payOutsideMoves`), `Core/Nexus/cascade.ts:~207-225` (`renameCascade`), `Core/Connections/pageIndex.ts:111` (`namesOf`), `Core/Nexus/heldPages.ts:~25-28` (`livePathOf`), `Core/Index/indexSeed.ts:~95-99,146` (`HeadingRenameSeen`, `reindex`)
-[^64]: **I-064:** `Core/Nexus/settle.ts:~314-349` (`payOutsideMoves`), `Core/Trash/spend.ts:~96-265` (`restoreTrashed`, `parkLinks` at `:147`), `Core/Nexus/settle.ts:~281-305` (`returningCascade`, `repairLanded` at `:302`)
-[^65]: **I-065:** `Core/Bundles/bundle.ts:254` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`)
+[^64]: **I-064:** `Core/Nexus/settle.ts:~363-397` (`payOutsideMoves`), `Core/Trash/spend.ts:~120-303` (`restoreTrashed`, `parkLinks` at `:~171`), `Core/Nexus/settle.ts:~319-353` (`returningCascade`, `repairLanded` at `:~338`)
+[^65]: **I-065:** `Core/Bundles/bundle.ts:417` (`originPagesIn`), `Core/Trash/trashedCopies.ts:36` (`parkLinks`)
 [^66]: **I-066:** `Core/Tiles/tileHosts.ts:~22-36` (the Space arm's `boards`), `Core/Tiles/tileHosts.ts:~44-54` (`tileHostsOf`), `Core/Nexus/tree.ts:111`, `Core/Nexus/readNexus.ts:~314-325` (the registry's `unreadable` entry), `Core/Nexus/configReach.ts:~330-332` (`reachConfig`), `Core/Tiles/tilesFile.ts:~285-322` (`tilesLink`, `rewriteTileConnections`), `Core/Nexus/cascade.ts:~246-257`
 [^67]: **I-067:** `Core/Connections/rewrite.ts:~76-110` (`follower`), `Core/Connections/connections.ts:~19-22` (`pageLinkPattern`), `Core/Connections/connections.ts:~132-143` (`expressibleInLink`, `spellsAsWiki`), `Core/MarkdownPM/Engine/detect.ts:~406-411` (`loneEmbedRe`, `loneEmbedTitle`)
 [^68]: **I-068:** `Core/MarkdownPM/Links/connectionsApi.ts:~24-33` (`headingMissing`), `Core/MarkdownPM/Autocomplete/useConnectionAutocomplete.ts:~138-151` (`commit`, `keptHeading`)
-[^69]: **I-069:** `Core/Bundles/record.ts:~32-33` (`linkTargets`), `Core/Bundles/record.ts:~108-113` (`readRecord`), `Core/Bundles/bundle.ts:~162-185` (`listBundles`), `Core/Bundles/bundle.ts:~195-201` (`openBundle`)
+[^69]: **I-069:** `Core/Bundles/record.ts:~39-40` (`linkTargets`), `Core/Bundles/record.ts:~127-134` (`decodeRecord`, `readRecord`), `Core/Bundles/bundle.ts:~153-176` (`listBundles`), `Core/Bundles/bundle.ts:~292-307` (`openBundle`)
 [^70]: **I-070:** `Core/Bundles/placement.ts:~41-116` (`resolveRecord`), `Core/Bundles/placement.ts:~159-183` (`freeOnDisk`), `Core/Paths/names.ts:~56-79` (`freeName`, `createDisambiguated`)
 [^71]: **I-071:** `Core/Nexus/fileEvents.ts:502-518` (`applySettings`, `oweRescope`), `Core/Nexus/settle.ts:184-189` (`reseed`), `Core/Settings/settings.ts:107-139` (`carrySetAside`), `Core/Nexus/folderEntity.ts:53-71` (`liftSetAside`), `.claude/Features/DesktopPM.md:22`
 [^72]: **I-072:** `Desktop/FileWatch/watcher.ts:38` (`SETTLE_MS`), `Desktop/FileWatch/watcher.ts:106` (`awaitWriteFinish`)
 [^73]: **I-073:** `Core/Properties/Schema/typeRows.tsx:256` (`rowsFor`), `Core/Properties/Schema/typeRows.tsx:68,159-178` (`DATE_ROW`, `dateRows`, the icon-led rows), `Core/Properties/Schema/typeRows.tsx:87-155` (`numberRows`, the icon-less rows), `Core/Properties/Schema/typeRows.tsx:180-196` (`linkRows`), `Core/Properties/Schema/typeRows.tsx:198-213` (`checkboxRows`), `Core/Properties/Schema/typeRows.tsx:216-237` (`fileRows`), `Core/Properties/Schema/formatRows.ts:12-39` and `Core/Properties/Schema/PropertyFrame.tsx:298-312` (the icon-led rows elsewhere), `Core/Properties/Schema/PropertyFrame.tsx:209-211,275-287` (`configure` writes the property and `saveColumnStyle` the view), `Core/Properties/typeDisplay.ts:12,30` (`styleLabel`, the column menu's "Format")
 [^74]: **I-074:** `Core/Properties/unassignProperty.ts:66-90` (`stashAndStrip`, the stash written on Remove), `Core/Properties/propertyStash.ts:19-45,78-86` (`stashedBlock`, `patchStashBlock`, `sweepStashes`), `Core/Properties/assignment.ts:26-83` (`refillStash`, the stash read and spent on re-adding), `Core/Settings/personalization.ts:42,189-190,261-263` (`HISTORY_DAYS`, `historyDays`, `archiveHistoryDays`, `SETTING_BOUNDS`), `Core/Settings/settings.ts:82-92` (`readFileHistoryConfig`), `Core/Pages/fileHistory.ts:195-206` (`sweepFileHistory`), `Core/Settings/frames.ts:649-663` (the History section's rows)
-[^75]: **I-075:** `Core/MarkdownPM/Autocomplete/AliasList.tsx:~25-26,~60-65,~84,~145-155` (`PICK_DELAY_MS`, `pick`, `unpick`, the row's `onClick`), `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx:~29-30` (`PICK_WAIT`), `UIX/Pickers/CalendarPicker.tsx:~488-501`, `Core/MarkdownPM/Embeds/embedWidget.tsx:~652-654` (`embedClickSeat`), `Core/MarkdownPM/Gestures/pointerPath.ts:~50,~82-85`, `Core/MarkdownPM/decorations.ts:~717-721` (`pressMargin`), `Core/MarkdownPM/Tables/cellStatic.tsx:~558-565`, `Core/Navigation/TabItem.tsx:~63,~89-91,~110` (`pressedActive`), `Core/Interface/Header/DetailTitleHeader.tsx:~94-106,~132-136` (`openSearch`), `Core/Views/Bands/GroupBand.tsx:~141-142,~178-199,~249` (`outsideRename`, the glyph's handlers), `Core/Interface/RenamableTitle.tsx:~17,~26-27,~55` (`doubleClick`), `UIX/Fields/RenamableLabel.tsx:~52-58`, `Core/Navigation/TabBar.tsx:~137-149` (`onBarDoubleClick`), `.claude/Planning/Disclosable Bundles — Implementation Plan.md:~116` (§Constraints › Rulings › Double-Click) and `:~876-879` (Task 4-1's `rowClick`).
-[^76]: **I-076:** `Core/Session/nexusSlice.ts:248-265` (`mutate`, the cleanup's discarded reply at `:256` and the notice's Try Again at `:261`), `Core/Session/nexusSlice.ts:290` (`finishOwed`), `Core/Nexus/owed.ts:63` (`OWED`), `Core/Nexus/owed.ts:255` (`runNoted`'s landing check), `Core/Nexus/finishOwed.ts:62-70` (`add`, the let-go files), `Core/Nexus/finishOwed.ts:72-93` (`finishOwed`), `Core/Contexts/contextWrite.ts:153,174` (`createContextGroup`, `createSpace`), `Core/Trash/spend.ts:184` (the Context and Space restore), `Core/Properties/registryProperty.ts:122`, `Core/Properties/optionOps.ts:99`, `Core/Bundles/browser.ts:288-330` (`many`, its `quiet: true` call at `:314`), `.claude/Planning/Disclosable Bundles — Implementation Plan.md`
+[^75]: **I-075:** `Core/MarkdownPM/Autocomplete/AliasList.tsx:~25-26,~60-65,~84,~145-155` (`PICK_DELAY_MS`, `pick`, `unpick`, the row's `onClick`), `Core/MarkdownPM/Autocomplete/aliasPicker.test.tsx:~29-30` (`PICK_WAIT`), `UIX/Pickers/CalendarPicker.tsx:~488-501`, `Core/MarkdownPM/Embeds/embedWidget.tsx:~652-654` (`embedClickSeat`), `Core/MarkdownPM/Gestures/pointerPath.ts:~50,~82-85`, `Core/MarkdownPM/decorations.ts:~717-721` (`pressMargin`), `Core/MarkdownPM/Tables/cellStatic.tsx:~558-565`, `Core/Navigation/TabItem.tsx:~63,~89-91,~110` (`pressedActive`), `Core/Interface/Header/DetailTitleHeader.tsx:~94-106,~132-136` (`openSearch`), `Core/Views/Bands/GroupBand.tsx:~141-142,~178-199,~249` (`outsideRename`, the glyph's handlers), `Core/Interface/RenamableTitle.tsx:~17,~26-27,~55` (`doubleClick`), `UIX/Fields/RenamableLabel.tsx:~52-58`, `Core/Navigation/TabBar.tsx:~137-149` (`onBarDoubleClick`), `Core/Bundles/browser.ts:~351-361` (`rowClick`).
+[^76]: **I-076:** `Core/Session/nexusSlice.ts:248-265` (`mutate`, the cleanup's discarded reply at `:256` and the notice's Try Again at `:261`), `Core/Session/nexusSlice.ts:290` (`finishOwed`), `Core/Nexus/owed.ts:63` (`OWED`), `Core/Nexus/owed.ts:255` (`runNoted`'s landing check), `Core/Nexus/finishOwed.ts:62-70` (`add`, the let-go files), `Core/Nexus/finishOwed.ts:72-93` (`finishOwed`), `Core/Contexts/contextWrite.ts:153,174` (`createContextGroup`, `createSpace`), `Core/Trash/spend.ts:185` (the Context and Space restore), `Core/Properties/registryProperty.ts:122`, `Core/Properties/optionOps.ts:99`, `Core/Bundles/browser.ts:402-443` (`many`, its `quiet: true` call at `:428`), `.claude/Planning/Disclosable Bundles — Implementation Plan.md`
+[^77]: **I-077:** `Core/Bundles/bundle.ts:~369-393` (`spendBundle`), `Core/Bundles/bundle.ts:~81-84` (`bundleArtifact`), `Core/Bundles/bundle.ts:~153-176` (`listBundles`), `Core/Trash/spend.ts:~110` (`emptyBundle`), `Core/Trash/spend.ts:~133,~295` (`restoreTrashed`), `Core/Archive/archive.ts:~119` (`restoreArchived`), `Core/Trash/delete.ts:~136` (`deleteOp`)
+[^78]: **I-078:** `UIX/Interactions/engine.tsx:~1287-1318` (`useDragItem`), `UIX/Interactions/engine.tsx:~1337-1372` (`useLineRow`), `UIX/Interactions/engine.tsx:~1120,~1174-1180,~1234` (`ZoneValue`, `useZoneSeat`, the zone's Tab stop), `UIX/Interactions/engine.tsx:~682-685` (the line lift refused on a null `snap`), `UIX/Interactions/a11y.ts:~1,~57-60` (`INSTRUCTIONS_ID`), `UIX/Interactions/lineList.ts:~20-35` (`locked`), `Core/Bundles/BundleTable.tsx:~106`, `Core/Navigation/NavList.tsx:~161`
+[^79]: **I-079:** `Core/Settings/frames.ts:~617` (the hint), `Core/Interface/Confirm/confirmations.ts:~41-44` (`waived`), `Core/Interface/Confirm/confirmations.ts:~229-240` (`askEmptyTrash`)
+[^80]: **I-080:** `Core/Bundles/BundleTable.tsx:~177` (`onContextMenu`), `UIX/Interactions/engine.tsx:~1358-1372` (`useLineRow`'s keys), `Core/Settings/TrashFrame.tsx` (no bar)
```

##### .claude/Features/CollectionsPM.md

```/.claude/Features/CollectionsPM.md diff
@@ -48 +48 @@ Collections and Sets share the generic folder-entity CRUD in `Core/Nexus/folderE
 
 Each Collection has its own archive stored within the user's `/.nexus/archive/<collection-id>/`, containing a read-only recoverable store of the pages and sets moved into it. Pages placed in the archive are indexed and receive reach-in changes from external actions such as property mutations and cascading actions to pages an archived page links to in its body text, including renames and moves, and the Link values a deletion strips. Pages can be archived individually, and any set that's archived has its contents archived as well—restoration works with the same framework.
 
-The archive is accessible via the view selection dropdown as a row which opens as an uneditable table listing the archive's contents, title, location, and archival date. Opening pages within the archive opens its read-only preview window; selecting pages and sets activates its restoration and deletion options through both the right-click context menu and an interface-level top-right action label offering "Restore" and "Delete" as clickable buttons. Restoring an archived page or set places it back into its remembered placement and order within its Collection.
+The archive is accessible via the view selection dropdown as a row which opens as an uneditable table listing the archive's contents, title, location, and archival date. Opening pages within the archive opens its read-only preview window; selecting pages and sets activates its restoration and deletion options through both the right-click context menu and an interface-level top-right action label offering "Restore" and "Delete" as clickable buttons. Restoring an archived page or set places it back into its remembered placement and order within its Collection; an item restored from an archived set is given an option for its placement.
 
 Once an item is moved to the archive, it appears as totally removed — it's invisible within any navigation surfaces, pages with any pre-existing links rendered as unresolved, and it isn't counted within any user-facing confirmation or files-affected count — while restoration immediately re-adds the archived item into the nexus with full re-integration.
 
```

##### .claude/Features/ConfigurationPM.md

```/.claude/Features/ConfigurationPM.md diff
@@ -220 +220 @@ The one frame that is a surface of its own, anchored below the rail's separator.
 
 | Setting | Key | Description | Options |
 | --- | --- | --- | --- |
-| Date Column | `trashColumnStyle` | How the browser writes a deletion's date and time. Unset, it follows the Nexus's Date Format and shows the time on its clock, and picking the Nexus's own form or clock returns it to following. | Every date form · Day · 12 Hours · 24 Hours · Hidden |
-| Archive Date Column | `archiveColumnStyle` | How ArchiveView writes an item's archived date and time, picked from its own column heading's menu, following the Nexus's form and clock as the Trash's does. | Every date form · Day · 12 Hours · 24 Hours · Hidden |
+| Date Column | `trashColumnStyle` | How the browser writes a deletion's date and time. Unset, it follows the Nexus's Date Format and shows the time on its clock, and picking the Nexus's own form or clock returns it to following. | Every date form · Day · 12 or 24 Hours · Show/Hide |
+| Archive Date Column | `archiveColumnStyle` | How ArchiveView writes an item's archived date and time, picked from its own column heading's menu, following the Nexus's form and clock as the Trash's does. | Every date form · Day · 12 or 24 Hours · Show/Hide |
 
 ### Collections
 
```

##### .claude/Features/CorePM.md

```/.claude/Features/CorePM.md diff
@@ -89 +89 @@ Lookups on both sides derive from one walk, `recordsOf` in `Core/Nexus/record.ts
 
 #### II. Mutations
 
-Content, Context, and property changes funnel through one dispatcher, `mutate` in `Core/Nexus/mutate.ts`, which routes each operation to its implementation, while views, tiles, settings, and page bodies write through channels of their own. An operation that changes a page's address runs inside the settle's own turn, so no payment of an outside move interleaves with it, and returns the links it re-spelled. A mutation, view edit, or schema edit that names an entity by path acts only on what the live tree holds at that path, as the kind the request names, so the Nexus root, `.nexus`, the trash, and excluded folders fall outside them, save the Archive bundle a delete from the Archive names. Cascade policy is stated beside it once — a page rename stands when its link rewrite can't reach every file, and reports how many kept the old link; a page, Set, or Collection delete strips the Link values naming its pages under the same rule, whether it takes a live item or an Archive bundle; a Context or Space delete records its membership, moves its folder to the trash, and then strips its tags, a member it can't write counted beside the delete with Try Again; once a Space, Context, Set, or Collection has moved to the trash, or a move has taken a Set out of a container, the saved views, View Tiles, and the Matrix filter drop what named it, and a file that can't be edited is reported beside the delete rather than refusing it. Every write notes itself as a file event as it lands, and the arms that apply an outside edit apply it to the live tree and the content index; the write's gate then settles what moved and pushes it before the reply leaves, so the reply finds the window current. The window is sent a versioned difference of the tree and asks for the whole tree when it holds any version but the one before. Every content create the dispatcher takes carries an ID the window minted, so what the window stages for the newborn is keyed before the push lands it.
+Content, Context, and property changes funnel through one dispatcher, `mutate` in `Core/Nexus/mutate.ts`, which routes each operation to its implementation, while views, tiles, settings, and page bodies write through channels of their own. An operation that changes a page's address runs inside the settle's own turn, so no payment of an outside move interleaves with it, and returns the links it re-spelled. A mutation, view edit, or schema edit that names an entity by path acts only on what the live tree holds at that path, as the kind the request names, so the Nexus root, `.nexus`, the trash, and excluded folders fall outside them, save what a delete from the Archive names. Cascade policy is stated beside it once — a page rename stands when its link rewrite can't reach every file, and reports how many kept the old link; a page, Set, or Collection delete strips the Link values naming its pages under the same rule, whether it takes a live item or an archived one; a Context or Space delete records its membership, moves its folder to the trash, and then strips its tags, a member it can't write counted beside the delete with Try Again; once a Space, Context, Set, or Collection has moved to the trash, or a move has taken a Set out of a container, the saved views, View Tiles, and the Matrix filter drop what named it, and a file that can't be edited is reported beside the delete rather than refusing it. Every write notes itself as a file event as it lands, and the arms that apply an outside edit apply it to the live tree and the content index; the write's gate then settles what moved and pushes it before the reply leaves, so the reply finds the window current. The window is sent a versioned difference of the tree and asks for the whole tree when it holds any version but the one before. Every content create the dispatcher takes carries an ID the window minted, so what the window stages for the newborn is keyed before the push lands it.
 
 Several rules hold across every entity and are stated here rather than per feature:
 
```

##### .claude/Features/MarkdownPM.md

```/.claude/Features/MarkdownPM.md diff
@@ -41 +41 @@ A codeblock is a fenced block set in the mono family over a neutral fill, which
 - **Path Icons:** With **Show Path Icons** on, a path with folders is marked by a folder, and a lone filename by its file's icon — the language's own mark, its family's for data, config, and shell files, a diff file's, or a plain code file.
 - **Diffs:** An info word reading `diff` or `patch`, alone or joined to a language by `-`, `/`, `\`, `|`, or a space (`diff-ts`, `ts|diff`, `diff/app.ts`), draws the block as a diff, while a dashed filename such as `patch-notes.md` reads by its extension. These display their deltas through a margin typed with `+`, `-`, or `~`, which highlights the line in green, red, or light blue respectively over the language's existing syntax colors, and their tag becomes a tally of the green and red lines.
 
-| Language | Formatting | Icons |
-| --- | --- | --- |
+| Language   | Formatting                                  | Icons              |
+| ---------- | ------------------------------------------- | ------------------ |
 | JavaScript | `js` • `javascript` • `jsx` • `mjs` • `cjs` | `brand-javascript` |
 | TypeScript | `ts` • `typescript` • `tsx` • `mts` • `cts` | `brand-typescript` |
-| JSON | `json` • `jsonc` | `file-braces` |
-| YAML | `yaml` • `yml` | `file-cog` |
-| CSS | `css` | `brand-css3` |
-| HTML | `html` • `htm` | `brand-html5` |
-| Markdown | `markdown` • `md` | `file-text` |
-| Swift | `swift` | `brand-swift` |
-| Python | `python` • `py` | `brand-python` |
-| Go | `go` • `golang` | `brand-golang` |
-| Rust | `rust` • `rs` | `brand-rust` |
-| Ruby | `ruby` • `rb` | `file-code-corner` |
-| Java | `java` | `file-code-corner` |
-| Kotlin | `kotlin` • `kt` • `kts` | `file-code-corner` |
-| Scala | `scala` | `file-code-corner` |
-| C | `c` • `h` | `file-code-corner` |
-| C++ | `cpp` • `c++` • `cc` • `cxx` • `hpp` • `hh` | `file-code-corner` |
-| C# | `csharp` • `cs` • `c#` | `file-code-corner` |
-| Shell | `shell` • `sh` • `bash` • `zsh` | `terminal` |
-| PowerShell | `powershell` • `ps1` | `terminal` |
-| SQL | `sql` | `database` |
-| XML | `xml` • `svg` | `file-code` |
-| TOML | `toml` | `file-cog` |
-| Dockerfile | `dockerfile` • `docker` | `brand-docker` |
-| Lua | `lua` | `file-code-corner` |
-| Perl | `perl` • `pl` • `pm` | `file-code-corner` |
-| Haskell | `haskell` • `hs` | `file-code-corner` |
-| Clojure | `clojure` • `clj` • `cljs` • `cljc` • `edn` | `file-code-corner` |
-| Erlang | `erlang` • `erl` | `file-code-corner` |
-| Julia | `julia` • `jl` | `file-code-corner` |
-| R | `r` | `file-code-corner` |
-| Groovy | `groovy` • `gradle` | `file-code-corner` |
-| Sass | `sass` • `scss` | `file-code-corner` |
-| Nginx | `nginx` | `file-cog` |
-| Protobuf | `protobuf` • `proto` | `file-braces` |
-| CMake | `cmake` | `file-cog` |
-| Properties | `properties` • `ini` | `file-cog` |
+| JSON       | `json` • `jsonc`                            | `file-braces`      |
+| YAML       | `yaml` • `yml`                              | `file-cog`         |
+| CSS        | `css`                                       | `brand-css3`       |
+| HTML       | `html` • `htm`                              | `brand-html5`      |
+| Markdown   | `markdown` • `md`                           | `file-text`        |
+| Swift      | `swift`                                     | `brand-swift`      |
+| Python     | `python` • `py`                             | `brand-python`     |
+| Go         | `go` • `golang`                             | `brand-golang`     |
+| Rust       | `rust` • `rs`                               | `brand-rust`       |
+| Ruby       | `ruby` • `rb`                               | `file-code-corner` |
+| Java       | `java`                                      | `file-code-corner` |
+| Kotlin     | `kotlin` • `kt` • `kts`                     | `file-code-corner` |
+| Scala      | `scala`                                     | `file-code-corner` |
+| C          | `c` • `h`                                   | `file-code-corner` |
+| C++        | `cpp` • `c++` • `cc` • `cxx` • `hpp` • `hh` | `file-code-corner` |
+| C#         | `csharp` • `cs` • `c#`                      | `file-code-corner` |
+| Shell      | `shell` • `sh` • `bash` • `zsh`             | `terminal`         |
+| PowerShell | `powershell` • `ps1`                        | `terminal`         |
+| SQL        | `sql`                                       | `database`         |
+| XML        | `xml` • `svg`                               | `file-code`        |
+| TOML       | `toml`                                      | `file-cog`         |
+| Dockerfile | `dockerfile` • `docker`                     | `brand-docker`     |
+| Lua        | `lua`                                       | `file-code-corner` |
+| Perl       | `perl` • `pl` • `pm`                        | `file-code-corner` |
+| Haskell    | `haskell` • `hs`                            | `file-code-corner` |
+| Clojure    | `clojure` • `clj` • `cljs` • `cljc` • `edn` | `file-code-corner` |
+| Erlang     | `erlang` • `erl`                            | `file-code-corner` |
+| Julia      | `julia` • `jl`                              | `file-code-corner` |
+| R          | `r`                                         | `file-code-corner` |
+| Groovy     | `groovy` • `gradle`                         | `file-code-corner` |
+| Sass       | `sass` • `scss`                             | `file-code-corner` |
+| Nginx      | `nginx`                                     | `file-cog`         |
+| Protobuf   | `protobuf` • `proto`                        | `file-braces`      |
+| CMake      | `cmake`                                     | `file-cog`         |
+| Properties | `properties` • `ini`                        | `file-cog`         |
 
 #### Typing Transforms
 
```

##### .claude/Features/NexusRecordPM.md

```/.claude/Features/NexusRecordPM.md diff
@@ -7 +7 @@ Pommora answers *where is this now*; the record answers *where was this then*. I
 
 Every delete to the Nexus's own trash and every archive produces a bundle: a folder in `.trash`, or in `.nexus/archive/<Collection ID>` for an archived page or Set, under the folder chain the entity came from and named for a stamped copy of its own leaf, holding the artifact under its original name beside a `_record.json`. The record travels with what it describes, so a hand-move of the bundle moves the two as one unit.
 
-**The Bundle.** Each record carries the entity's parent as one of four references — the Nexus root, a container by sidecar id, a Context by registry id, or `unaddressable` when the parent can't be resolved — and a payload by kind. A Context carries its registry entry and its place in the registry, plus the membership map its stripped key held, per swept root; a Space carries the roots that tagged it; Pages and ordinary containers carry parent and identity and the ids of the containers above the parent (`trail`), plus each Link value their delete stripped from a page or Space outside them, keyed by that holder's id and the property's; every record carries the page each outbound link under its artifact named at the delete, its id and its path then, by the name the link was written with; every record but a Context's or a property's carries the siblings it sat between in its origin's order (`place`); a Trash record of a page or Set deleted from the Archive names the Archive bundle it left (`archive`); a global property delete has no artifact, and its bundle holds the record alone — the definition, the Collections that assigned it, and every value keyed by its holder's id.
+**The Bundle.** Each record carries the entity's parent as one of four references — the Nexus root, a container by sidecar id, a Context by registry id, or `unaddressable` when the parent can't be resolved — and a payload by kind. A Context carries its registry entry and its place in the registry, plus the membership map its stripped key held, per swept root; a Space carries the roots that tagged it; Pages and ordinary containers carry parent and identity and the ids of the containers above the parent (`trail`), plus each Link value their delete stripped from a page or Space outside them, keyed by that holder's id and the property's; every record carries the page each outbound link under its artifact named at the delete, its id and its path then, by the name the link was written with; every record but a Context's or a property's carries the siblings it sat between in its origin's order (`place`); a Trash record of a page or Set deleted from the Archive names where in the Archive it left (`archive`); a global property delete has no artifact, and its bundle holds the record alone — the definition, the Collections that assigned it, and every value keyed by its holder's id.
 
 **Write-Ahead.** The record is written before the destruction it describes. The bundle is minted while the artifact is still live, the record lands inside it before any sweep, and the artifact moves before the configuration pass, so a delete cut short leaves evidence rather than silence: a bundle holding no artifact is a deletion that never finished, skipped by the listing and never removed. A Space or Context delete strips its keys from every member file once its folder has moved; a member it can't write stays owed with Try Again, and the delete stands. A record thinner than the truth, such as one past a member file it couldn't parse, says so with a `partial` flag. A page, Set, or Collection delete strips every Link value naming a page it took, from the tree or an Archive, from the pages and Spaces outside it, the Archive's pages included, unless a page outside it still holds that title, once its artifact has moved, in one sweep over the files the index relates to those titles and the Spaces the tree shows naming them; a file it can't write, or a linker whose ID another file shares, stays owed with Try Again, and the delete stands. A required payload that can't be gathered writes no record at all, degrading that entity to hand-restore. System-trash mode records nothing, since the artifact leaves the Nexus entirely; a property delete records in either mode.
 
 **Restore.** The resolver takes a record and the current tree and returns a placement — directory, final name, and for a Space or Context the final title — or a typed refusal: parent gone, parent can't hold this kind, parent unaddressable, id already live. A live id outranks every other answer. Final titles are the resolver's rather than the recorded ones, since a freed title may have been re-minted while the original sat in trash, so a collision disambiguates for every kind, stepping aside past what the tree or the disk holds there, and a page, Set, Collection, or Space lands back between the siblings it left. An artifact returning from the Trash is reconciled against the world it comes back to: its keys, option words, `<Title>` keys, and the Space titles under them are first matched to what each names now, whatever casing or Label or Value Format spelled it, and rewritten as the current one spells it, a key Pommora manages staying where it is and a key spelling that names more than one property or Context returning as foreign data; a Link naming a gone page then leaves, every other governed value keeps what it can’t read as a live write does, values otherwise come back as the file spelled them, and foreign frontmatter and the body never move. Once it lands, its own links are repaired to the current names of the pages they named, the live world is re-spelled for its arrival and for the names that named only it, and the stripped values come back to the page each named, through the one rule the rename cascade uses. A Link value naming a page the tree doesn't hold and the restore doesn't land leaves the page or Space it returns on; one whose name exactly one trashed page answers joins that page's bundle, so its restore writes the value back, an ID-less page first taking the ID adoption would give it. A Context re-enters the registry at the place it left before its folder moves, so a refused move rolls the entry back, and its Space order, kept in `state.json` while it sits in the Trash, applies again; membership re-applies by id against the as-restored folder names, and the record is removed once every page still present has its tag back, while the restore names any that didn't. While **Restore Links On Deletion** is on, a page, Set, or Collection restore writes each Link value its delete stripped back onto the page or Space it came from, by the property's id and rebuilt under the landed title when the page stepped aside, wherever that holder has none — into its copy in the Trash when it sits there — the restore naming any still present that didn't; a property no longer defined as a Link is left out. A property restores by rebuilding — the definition re-enters the registry, each Collection gets it back, the values a Remove had stashed return to their Collection's stash, and each value is written home where it still validates and its page or Space holds none of its own, the restore naming any that didn't, while a Link value naming a page gone is handled as a returning page's is — and refuses outright if its recorded definition no longer parses; a label or key another property has since taken steps aside as a create's would.
 
-**The Trash Frame.** The record's principal reading half is the Trash frame of the Settings window, listing every bundle `.trash` holds, one row per deleted entity across the five artifact-bearing kinds, and one per deleted property under its definition's label, whichever Trash Mode is set. Main shapes each row — kind and title from the artifact, the deletion time from the bundle's stamp, a breadcrumb resolved live from the recorded parent id, and whether that parent still resolves — since `.trash` is outside the watcher and the list is fetched when the leaf opens, when another Nexus opens, and after every delete, restore, or empty the app makes. A row's right-click restores it or gives it up: **Restore** returns the entity to the tree, or, where its recorded home no longer resolves, opens into the live places that kind may land; **Delete** hands the artifact to the operating system's trash, or erases it when **Permanently Delete Files** is on, and removes the spent bundle, taking a Context's kept Space order with it; a Collection given up takes its Archive with it, as a system-trash delete of one does; a page, Set, or Collection given up strips any Link value still naming its pages unless another page holds that title, and hands the values its record kept to a namesake still in the Trash. Checked rows act together, and a batch names what it couldn't resolve. A deletion's own notification reads the record too: the delete answers with the bundle it minted, and **Undo** restores from that path without the frame being opened. A property delete that couldn't update every file offers **Try Again** there instead, which finishes the update, and leaves Undo to the undo chord. A system-trash delete mints no bundle, so it offers no Undo.
+**The Trash Frame.** The record's principal reading half is the Trash frame of the Settings window, listing every bundle `.trash` holds, one row per deleted entity across the five artifact-bearing kinds, and one per deleted property under its definition's label, whichever Trash Mode is set. A Set's or Collection's row opens onto the pages and Sets inside it, each restored or given up on its own, which leaves the rest of its bundle in place. Main shapes each row — kind and title from the artifact, the deletion time from the bundle's stamp, a breadcrumb resolved live from the recorded parent id, and whether that parent still resolves — since `.trash` is outside the watcher and the list is fetched when the leaf opens, when another Nexus opens, and after every delete, restore, or empty the app makes. A row's right-click restores it or gives it up: **Restore** returns the entity to the tree, or, where its recorded home no longer resolves, opens into the live places that kind may land; **Delete** hands the artifact to the operating system's trash, or erases it when **Permanently Delete Files** is on, and removes the spent bundle, taking a Context's kept Space order with it; a Collection given up takes its Archive with it, as a system-trash delete of one does; a page, Set, or Collection given up strips any Link value still naming its pages unless another page holds that title, and hands the values its record kept to a namesake still in the Trash. Checked rows act together, and a batch names what it couldn't resolve. A deletion's own notification reads the record too: the delete answers with the bundle it minted, and **Undo** restores from that path without the frame being opened. A property delete that couldn't update every file offers **Try Again** there instead, which finishes the update, and leaves Undo to the undo chord. A system-trash delete mints no bundle, so it offers no Undo.
 
 ### Baseline
 
```

##### .claude/Features/PommoraDND.md

```/.claude/Features/PommoraDND.md diff
@@ -57 +57 @@ The tunables are the fields of the one `AUTOSCROLL` constant.
 - **Constraints** — an `axis` lock per zone, released by a 24px cross-axis tug where the item can travel to another zone, an item that can't travel held within its zone's run, and a `resolveIndex` veto on each zone that refuses a landing slot outside the dragged item's run. The gesture owns the press rule: a press in a text field never drags; a press on a control below the item — a button, the collapse chevron included, a link, a select, or a value chip marked `data-drag-slop` — needs 12px of travel to lift, as does a handle that is itself a button (ribbon items, view pills, icon favourites), so a tap-wobble activates the control instead; every other item body lifts at 5px.
 - **Look** — a lifted line row dims in place, and hover reveals hide on its host and every enclosing reveal host while it's held; the gesture owns the grabbing cursor, and chips paint above menus.
 - **Announcements** — an assertive ARIA live region announces every engine drag's pick-up, drop, return, cancel, and tab-bar open, pointer or keyboard, in the `announceDrag` vocabulary over the one `announce` primitive; each keyboard step names its place from `STEP_WORDS` — before, into, or after a named row in a line list, and a position in a displace zone. A drop that changes nothing, or whose write is refused, announces "{name} returned to its place." Tiles, editor tables, and the editor's block and list drags announce nothing, and Table columns announce without a name.
-- **Keyboard** — a line list is one tab stop: the host hands focus to the last-focused or first row, Up and Down move between rows, Space lifts a row, and Enter opens a row that opens. A displace item is its own tab stop with the handle role `button`: Space lifts it, and Enter opens an item that opens, lifting one that doesn't, and a disabled zone keeps only its openable items in the tab order. While an item is held, arrow keys step within its own zone — through a line list's slots, or on a geometric next-slot getter covering list, row, and grid (a fixed zone holds the item in its slot) — Space, Enter, or Tab drops, and Escape, focus leaving the item, or a press outside it cancels; focus returns to the item on drop. A cross-zone move and a carry are pointer-only, and a focusable descendant's keys are its own.
+- **Keyboard** — a line list is one tab stop: the host hands focus to the last-focused or first row, Up and Down move between rows, Space lifts a row, or acts on one where it can't move, and Enter opens a row that opens. A displace item is its own tab stop with the handle role `button`: Space lifts it, or opens it where it can't move, and Enter opens an item that opens, lifting one that doesn't, and a disabled zone keeps only its openable items in the tab order. While an item is held, arrow keys step within its own zone — through a line list's slots, or on a geometric next-slot getter covering list, row, and grid (a fixed zone holds the item in its slot) — Space, Enter, or Tab drops, and Escape, focus leaving the item, or a press outside it cancels; focus returns to the item on drop. A cross-zone move and a carry are pointer-only, and a focusable descendant's keys are its own.
 
 ---
 
```

##### .claude/Features/PommoraUIX.md

```/.claude/Features/PommoraUIX.md diff
@@ -390 +390 @@ The elements that draw and frame a stored image — `AssetImage`, `ImagePicker`,
 
 ### Table
 
-`UIX/Table/` — `table.css` · `table-tokens.css`. The tabular chrome every table surface uses (TableView, ArchiveView, the Trash): the column-header band with `.col-header` segment bars (`.table-divider` puts the bar on any element), row and column hairlines, the column drag and resize strips, `no-borders`, and the cell content types.
+`UIX/Table/` — `table.css` · `table-tokens.css`. The tabular chrome every table surface uses (TableView, ArchiveView, the Trash): the column-header band with `.col-header` segment bars, row and column hairlines, the column drag and resize strips, `no-borders`, and the cell content types.
 
 ### Utilities
 
```

##### .claude/Features/ViewTypesPM.md

```/.claude/Features/ViewTypesPM.md diff
@@ -92 +92 @@ A cell's content is type-aware — a page icon and title, chips, a checkbox or s
 
 #### II. The Table Sheet
 
-The table's design vocabulary is a whole-file token sheet scoped to `.table`, the class every tabular surface wears ([[PommoraUIX]] · Tables). A host rebinds what it needs in its own scope — the heading fill and divider, the cell padding — and states `is-clear` for a heading with no fill and no seam; the body hairline stays one width. TableView adds its own layer over it, `table-view.css`, which ArchiveView wears too. Atlas convention per [[PommoraUIX]].
+The table's design vocabulary is a whole-file token sheet scoped to `.table`, the class every tabular surface wears ([[PommoraUIX]] · Tables). A host rebinds what it needs in its own scope — the heading fill, divider, and padding; the body hairline stays one width. TableView adds its own layer over it, `table-view.css`, which ArchiveView wears too. Atlas convention per [[PommoraUIX]].
 
 **SOURCE:** `UIX/Table/table-tokens.css` · `UIX/Table/table.css` · `Core/Views/Table/table-view.css`
 
```

##### .claude/Planning/Disclosable Bundles — Implementation Plan.md

````/.claude/Planning/Disclosable Bundles — Implementation Plan.md diff
@@ -8 +8 @@
 
 | Head | Tests | Start | End |
 |------|-------|-------|-----|
-| `$BASE` | {count} | {MM-DD-YYYY hh:mm AM/PM} | {MM-DD-YYYY hh:mm AM/PM} |
+| `8148302cf` | 8,814 passed · 2 skipped | 10-26-2026 11:29 AM | {MM-DD-YYYY hh:mm AM/PM} |
 
 ### Context
 
 The Trash and each Collection's Archive keep every departed item as a bundle: a stamped folder holding the item, called its artifact, beside a `_record.json`. A trashed Set or Collection, or an archived Set, therefore reads as one row, and nothing inside it can be reached until the whole thing returns.
 
 The shared parts live in `Core/Bundles/`:
+- `layout.ts`, the stores' layout, the stamp, and the readers of a store path;
 - `bundle.ts`, the bundle;
 - `record.ts`, its record;
 - `placement.ts`, where a restore lands;
@@ -52 +53 @@ The renderer keeps each open container's inner rows in one map:
 - **Clicks:** `rowClick` is the one click intent.
   - A container discloses.
   - A page checks.
-  - A double-click leaves a page checked, and ArchiveView opens it in the reader.
+  - A double-click leaves a page checked and opens it through the skin's `open`, which ArchiveView gives as the reader.
 - **Checks Outlive Collapsing:** collapsing a container keeps its inner rows' checks. They're hidden from a batch until it opens again, as a search's hidden rows are.
 - **Batch Restore:** a batch Restore holding homeless rows (every inner item is one) asks once per kind of destination. Only the homeless rows go where the picker says; every row with a home of its own still returns there.
 
-The chevron sits right of the label in both skins. An inner row carries its trail like any other row: the bundle's own trail, then the containers inside the bundle above it.
+Both skins draw one bundle table's rows, each under its own heading, in TableView's row look and on TableView's list keyboard. The chevron sits right of the label on a top-level row and left of the icon on a nested row, as TableView's bands do. An inner row carries its trail like any other row: the bundle's own trail, then the containers inside the bundle above it.
 
 #### Concepts
 
@@ -64 +65 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 
 | Concept | Description | Location |
 | ------- | ----------- | -------- |
-| `bundleAddressOf` • Function | The one reader of a store path: its bundle, its store, and the inner item it names. | `Core/Bundles/bundle.ts` |
-| `stampedSegment` • Function | The index of a path's stamped bundle segment, shared by `bundleAddressOf` and `originPathOf`. | `Core/Bundles/bundle.ts` |
+| `bundleAddressOf` • Function | The one reader of a store path: its bundle, its store, and the inner item it names. | `Core/Bundles/layout.ts` |
+| `stampedSegment` • Function | The index of a path's stamped bundle segment, shared by `bundleAddressOf` and `originPathOf`. | `Core/Bundles/layout.ts` |
 | `readBundleAt` • Function | An address's bundle, record, artifact, and inner item, read once, for `openBundle` and `listInner`. | `Core/Bundles/bundle.ts` |
 | `ContainerRecord` / `isContainerRecord` • Type, Function | A Set's or Collection's record, the kind that holds inner items. | `Core/Bundles/bundle.ts` |
 | `trailWithin` • Function | The container ids above a folder inside a container's bundle, outermost first. | `Core/Bundles/bundle.ts` |
 | `innerRecord` • Function | The record an inner item carries as its own. | `Core/Bundles/bundle.ts` |
 | `keptLinksUnder` • Function | The bundle's kept Link values, as its record stands at the op, whose page lies at or under an inner item. | `Core/Bundles/bundle.ts` |
+| `linkedPage` • Function | The page a Link value's page link resolves to in a page index, shared by `keptLinksUnder` and `parkLinks`. | `Core/Connections/linkValue.ts` |
 | `spendBundle` • Function | Spends what an op took: the whole bundle, or an inner item's share of it, its carried Link values off the bundle's record and its pages off the strip the bundle's delete still owes. | `Core/Bundles/bundle.ts` |
 | `listInner` • Function | One level of a container address's inner items, in the order the folder's sidecar keeps. | `Core/Bundles/bundle.ts` |
 | `InnerListing` • Type | What `listInner` answers: the bundle, its store and record, the folder, and each inner item with its record. | `Core/Bundles/bundle.ts` |
@@ -83 +85 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 | `TreeRow` • Type | A row as a browser shows it: its depth and whether it's open. | `Core/Bundles/browser.ts` |
 | `treeRows` • Function | Top rows, with each open container's inner rows beneath them. | `Core/Bundles/browser.ts` |
 | `outermostOf` • Function | Drops each row whose ancestor the same batch holds. | `Core/Bundles/browser.ts` |
-| `rowClick` • Function | The browser's one click intent. | `Core/Bundles/browser.ts` |
+| `rowClick` • Function | The browser's one click intent, opening a page through the skin's `open`. | `Core/Bundles/browser.ts` |
+| `rowIndent` • Function | A row's step in from its lead at a depth, by the table's `--row-indent`, shared by TableView and the bundle table. | `UIX/Table/rowIndent.ts` |
 | `DestinationKind` / `destinationKind` / `destinationTargets` / `askDestination` • Type, Functions | A kind of destination, a row's kind, that kind's targets, and the one destination ask that `restoreOne`, the batch, and the menu share. | `Core/Bundles/browser.ts` |
-| `titleAccessory` • Prop | Content set inline right of a MenuItem's title text, outside its ellipsis. | `UIX/Menus/MenuRows.tsx` |
-| `titleLine` • Style | The line that sets the title text and `titleAccessory` side by side. | `UIX/Menus/menu-row.css.ts` |
+| `.row-chevron` • Class | A TableView band's or a nested container's chevron, in the rail slot left of its icon. | `UIX/Table/table.css` |
+| `BundleTable.tsx` • File | The table both skins draw under their own headings: its grid, its date heading, and its rows. It takes in `DateHeading.tsx`. | `Core/Bundles/BundleTable.tsx` |
+| `BundleTable` • Component | The table's grid: its title and date tracks, its body type, and the width under which it scrolls sideways. | `Core/Bundles/BundleTable.tsx` |
+| `BundleRows` • Component | A store's rows, virtualized under its skin's heading: one Tab stop, each row a tree item in TableView's row look. | `Core/Bundles/BundleTable.tsx` |
+| `keep` • Option | An index a virtual list draws wherever it sits, with its neighbours: the row focus last stood on, which outlives scrolling out of view. | `UIX/Interactions/virtualRows.ts` |
+| `space` • Option | What a line row's Space does where the row can't lift, where that differs from its Enter's `open`. | `UIX/Interactions/engine.tsx` |
+| `requestOf` • Function | What a browser op sends for a row: an Archive delete its path and kind, a restore or an empty its bundle. | `Core/Bundles/browser.ts` |
+| `offerDeleted` • Function | A delete's one notice by title, with the Undo for the bundle it minted and the cascade's lines, shared by every single delete. | `Core/Interface/Confirm/confirmations.ts` |
+| `RowRail` • Component | The gutter beside a row's lead cell, carrying the row's hover into its rail slot and keeping presses there off the row; TableView's and the bundle table's rows share it. | `UIX/Table/RowRail.tsx` |
+| `bundle-table.css` • File | The bundle table's own layout: its virtual rows, title line, trail, partial mark, and date cell. | `Core/Bundles/bundle-table.css` |
+| `.trash-table` • Class | The Trash's sideways scroller, holding its heading and rows over the checkboxes' gutter. | `Core/Settings/trash-frame.css` |
+| `tabIndex` • Prop | Takes a checkbox out of the Tab order where its row carries the keyboard. | `UIX/Controls/Checkbox.tsx` |
+| `virtualRows.ts` • File | The virtualizer's stand-in for renderer suites, drawing every row. | `Core/Testing/virtualRows.ts` |
+| `refuseWrites` • Function | Refuses one writer's write to the files a host suite picks, handing every other file to the real write. | `Core/Testing/hostFs.ts` |
+| `bytesUnder` • Function | Each file under a folder with its text, so a refused op shows the folder left byte-identical. | `Core/Testing/hostFs.ts` |
+| `decodeRecord` • Function | A record's one decode, shared by `readRecord` and the record an archive request carries. | `Core/Bundles/record.ts` |
+| `filingOf` • Function | Where an archive files the item: back at the Archive address its Undo request carries, through `archiveFiling`, with that record, else its own Collection's Archive recorded afresh, under the name it asks for when its kind may take it. | `Core/Archive/archive.ts` |
+| `Undone` • Type | A restored row and the archive request its reply says takes the restore back, which an Archive restore's Undo sends. | `Core/Bundles/browser.ts` |
+| `undoneOf` • Function | A reply's archive request with its row, the one narrowing `restoreOne` and the batch share. | `Core/Bundles/browser.ts` |
+| `archivedRecord` • Function | The record an Archive files a page or Set under from a decoded one: where it left from, with its identity read from the file. Shared by `filingOf` and the Undo of a delete from the Archive. | `Core/Bundles/record.ts` |
+| `archiveFiling` • Function | The one choice of the Archive a page or Set files back into at an address it held: the Archive of the Collection its origin sits in now, else the one the address names, while that Collection answers for it, with the address re-rooted and the record on its trail now. Shared by `placeRecord` and `filingOf`. | `Core/Bundles/placement.ts` |
+| `retrailed` • Function | The trail an origin stands on once a container on its chain stands elsewhere, shared by `archiveFiling` and `refileArchived`. | `Core/Bundles/record.ts` |
+| `refileFiled` • Function | The Undo's carry: a Set filed back into the Archive carries what was archived from within it there, along the trail it was filed on, whether that Archive is the one it stood in or another. | `Core/Archive/refile.ts` |
+| `departingCascade` • Function | An archive's re-spell when it files the item under another path than it stood under, its restore's in reverse. | `Core/Nexus/settle.ts` |
 
 **REMOVED**
 
@@ -95 +120 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 | `storeOf` • Function | Replaced by `bundleAddressOf`. | `Core/Bundles/bundle.ts` |
 | `leaf` • Parameter | `fileInto` and the `archive` op take `at`, the address the item held. `moveIntoStore` always asks for its own bundle's name back. | `Core/Bundles/bundle.ts`, `Core/Nexus/mutateRequest.ts` |
 | `placesFor` • Function | Split into `destinationKind`, `destinationTargets`, and `askDestination`. | `Core/Bundles/browser.ts` |
-| Single title-click reader open | Replaced by a page row's double-click. | `Core/Archive/ArchiveView.tsx` |
+| Single title-click reader open | Replaced by a page row's double-click, through `rowClick`. | `Core/Archive/ArchiveView.tsx` |
+| `groupIndent` • Function | Hoisted as `rowIndent`. | `Core/Views/Table/TableView.tsx` |
+| The rail-slot rule, the rail, its reveal fade, and the lead cell's seat in `table-view.css` | Moved to `UIX/Table/table.css`, the vocabulary every table's rows share. | `Core/Views/Table/table-view.css` |
 | The batch's "had nowhere to go" refusal | Replaced by one destination ask per kind. | `Core/Bundles/browser.ts` |
+| `TrashRowView` / `ArchiveRow` • Components | Replaced by the bundle table's row. | `Core/Settings/TrashFrame.tsx`, `Core/Archive/ArchiveView.tsx` |
+| `DateHeading.tsx` • File | Folded into `BundleTable.tsx`. | `Core/Bundles/DateHeading.tsx` |
+| `sampleClass` • Prop | `DateHeading`'s sample takes the table's one body type. | `Core/Bundles/DateHeading.tsx` |
+| `revealed` • Prop | MenuItem's; its only caller, the Trash, left MenuItem. | `UIX/Menus/MenuRows.tsx` |
+| `.table-divider` • Class | Its only wearer, the Trash's row, left. | `UIX/Table/table.css` |
+| `.table.is-clear` • Class | The Trash's heading, its only wearer, takes the table's heading tokens. | `UIX/Table/table.css` |
+| `--trash-date-lane` / `--trash-date-inset` • Tokens | The Trash's date lane, replaced by the table's date track. | `Core/Settings/trash-frame.css` |
+| `.trash-row` / `.trash-lead` / `.trash-trail` / `.trash-date` • Classes | Replaced by the table row's. | `Core/Settings/trash-frame.css` |
+| `.archive-rows` / `.archive-trail` • Classes | Replaced by `.bundle-rows` and `.bundle-trail`. | `Core/Archive/archive-view.css` |
 
 #### Constraints
 
 - **Rulings (settled, don't re-raise):**
-  - **Chevron:** it sits right of the label in both skins.
+  - **Chevron:** right of the label on a top-level row, left of the icon on a nested row, as TableView's bands do.
+  - **Row Look:** both skins draw one table row in TableView's look. Container rows take the Set band's weight and colors and page rows the page row's, with TableView's body-size icon, icon-to-title gap, and row height.
+  - **The Trash's Look:** "Trash gets the full archive look; its heading stays the same." Its rows take the Archive's table look: full-width lines, square hover, the 20px checkbox gutter, and the Archive's date cell. Its heading keeps its names ("File Name", "Time Deleted"), glyphs, type, clear fill, and inset hairline. **Heading Labels:** "Labels stay where they are." File Name keeps its place at the frame's inset, above the checkbox column, and Time Deleted keeps its 8px past the column line; only the column line moves, to meet the rows'.
+  - **Width:** "Trashes window gets the fixed date width like it has now, just enables the sideways scroll." The date column keeps its measured width and the title column TableView's 280px minimum, and a Trash narrower than both scrolls sideways.
+  - **Keyboard:** the rows take TableView's list keyboard. The table is one Tab stop and the arrows step between rows. Space toggles any row's check, a container's included, and Enter acts as a keyboard's click: it discloses a container, opens an Archive page's reader and leaves its row checked, as a double-click does, and checks a Trash page. In every other kit list, line and sortable alike, Space lifts what can move and otherwise acts as Enter, so it acts in any list that can't be dragged, a locked NavList's included. Row checkboxes are out of the Tab order.
   - **Clicks:**
     - A container row's click discloses it, and its checkbox checks it.
     - A page row's click checks it.
-    - An Archive page's double-click opens the reader and leaves the row checked.
+    - An Archive page's double-click opens the reader and leaves the row checked. A double-click on its checkbox opens nothing.
   - **Homeless Items:** an inner item whose folder is gone takes the existing homeless path (`homeResolves: false` → Restore ▸). There's no chain-up placement rule.
   - **Batch Restore:** a batch Restore holding homeless rows asks once per kind of destination. Whole homeless bundles follow the same rule.
   - **Nesting:** nested Sets disclose recursively. Inner items take Restore, Delete, check, and batch, and a checked ancestor covers its checked descendants.
   - **Single Rows:** Contexts, Spaces, and properties stay single rows.
   - **Search:** narrows top rows only.
+  - **Excluded Folders:** a folder the Nexus excludes stays out of an inner listing until it's unexcluded.
   - **Trails:** an inner row shows its trail. It's the bundle's own trail, then each container inside the bundle down to the row's folder, and it carries the bundle's `historical` mark.
   - **Collapsing:** checks are remembered. Collapsing a container never unchecks what it hides, and reopening shows the same checks. A hidden check stays out of the batch and the menu's targets while its container is closed, as a search's hidden checked rows do today.
   - **Batch Destination:** the batch's destination ask applies only to its homeless rows. Every row whose home resolves restores to that home, whatever the picker chose.
   - **Double-Click:** the click intent uses the codebase's `e.detail` pattern (CalendarPicker, MarkdownPM's pointer gestures), and a single click is never delayed.
   - **Undo:** re-nests an inner item through one shared primitive in `Core/Bundles/`.
   - **Names:** as written in *§Concepts*.
-  - **Partial Mark:** an inner item of a partly recorded container is itself partly recorded. `innerRecord` carries the container's `partial`, so its row shows the Trash's partial mark, and the restore's `recordedPartly` warning names that item under its own landed title, never its container's (Task 1-2, folded into the Restructure's `recordedPartly` at re-grounding).
+  - **Partial Mark:** an inner item of a partly recorded container is itself partly recorded. `innerRecord` carries the container's `partial`, so its row shows the partial mark, and the restore's `recordedPartly` warning names that item under its own landed title, never its container's (Task 1-2, folded into the Restructure's `recordedPartly` at re-grounding).
 - **Gates:** `npm run typecheck`, `npm run test`, and `npm run lint` from the repo root, clean at every Review Checkpoint.
 - **One Derivation:** each of these has exactly one reader:
   - a store path: `bundleAddressOf`;
@@ -125 +166 @@ The chevron sits right of the label in both skins. An inner row carries its trai
   - an inner item's record: `trailWithin` + `innerRecord`;
   - an entity's identity: `identityOf`;
   - an artifact's row: `artifactRow`;
-  - a click's intent: `rowClick`.
+  - a click's intent: `rowClick`;
+  - a row's drawing: `BundleRows`;
+  - the table's grid: `BundleTable`.
 - **No Physical Split:** an inner item is never moved into a bundle of its own before its op. A refused op leaves its bundle untouched.
 - **Inner-Item Writes:** listing inner items only reads. Among the inner-item paths, only `spendBundle` and `fileInto` write bundle structure, and only `spendBundle` writes a bundle's owed note.
 - **Never Every-X:** inner items list lazily, never inside `bundles:list`.
   - They're asked for on opening, and once per refresh for every open address in one call.
   - A closed row's loaded subtree is forgotten, while its checks are kept.
 - **Addresses Are Canonical:** a whole bundle's address is its folder, and an inner item's is its own path. `checked`, `spendUndo`'s arming, `outermostOf`, and the open map all key on the address.
-- **Tests:** each new behavior gets a test that fails without its change, and a rewritten case counts as that test. Host suites seed through `seedNexus` (`Core/Testing/hostFs.ts`) and the shared definitions (`Core/Testing/definitions.ts`) and run ops through `settledMutate.ts`; renderer suites build rows with `fixtures.ts`'s `bundleRow` and trees with `testTree.ts`; property bundles come from `fixtures.ts`'s `seedPropertyBundle`; each suite's local seeders carry the rest.
+- **Tests:** each new behavior gets a test that fails without its change, and a rewritten case counts as that test. Host suites seed through `seedNexus` (`Core/Testing/hostFs.ts`) and the shared definitions (`Core/Testing/definitions.ts`) and run ops through `settledMutate.ts`; renderer suites build rows with `fixtures.ts`'s `bundleRow` and trees with `testTree.ts`, and stand in for the virtualizer with `virtualRows.ts`; property bundles come from `fixtures.ts`'s `seedPropertyBundle`; each suite's local seeders carry the rest.
 - **Comments:** docstrings in the house register where a neighbor has one; no other comments.
 - **Imports:** an import that loses its last use leaves in the same task.
-- **Docs:** feature docs only fix what's false, in place, plainly, at its length or shorter. They explain to the user, not the coder: they name no functions, files, channels, or shared vocabularies, and state no cohesion or fixes a reader can infer.
+- **Docs:** feature docs only fix what's false, in place, plainly, at its length or shorter. They explain to the user, not the coder: they name no functions, files, channels, or shared vocabularies, and state no cohesion or fixes a reader can infer. Nathan approves each feature-doc change by what it changes and why; *§Reconciliation* lists the ones he approved, and nothing else in `.claude/Features` changes.
 
 #### Process Overview
 
-- [ ] **Phase 1** — Addressing Inside a Bundle
-  - [ ] Task 1-1
-  - [ ] Task 1-2
-  - [ ] Task 1-3
-  - [ ] Review Checkpoint
-- [ ] **Phase 2** — Filing Back
-  - [ ] Task 2-1
-  - [ ] Task 2-2
-  - [ ] Review Checkpoint
-- [ ] **Phase 3** — Listing Inner Items
-  - [ ] Task 3-1
-  - [ ] Task 3-2
-  - [ ] Compaction Checkpoint
-- [ ] **Phase 4** — The Browser's Tree
-  - [ ] Task 4-1
-  - [ ] Task 4-2
-  - [ ] Review Checkpoint
-- [ ] **Phase 5** — Both Skins
-  - [ ] Task 5-1
-  - [ ] Task 5-2
-  - [ ] Task 5-3
-  - [ ] Review Checkpoint
-- [ ] **Phase 6** — Documents, Drive, and the Live Pass
-  - [ ] Task 6-1
-  - [ ] Task 6-2
-  - [ ] Task 6-3
+- [x] **Phase 1** — Addressing Inside a Bundle
+  - [x] Task 1-1
+  - [x] Task 1-2
+  - [x] Task 1-3
+  - [x] Review Checkpoint
+- [x] **Phase 2** — Filing Back
+  - [x] Task 2-1
+  - [x] Task 2-2
+  - [x] Review Checkpoint
+- [x] **Phase 3** — Listing Inner Items
+  - [x] Task 3-1
+  - [x] Task 3-2
+  - [x] Compaction Checkpoint
+- [x] **Phase 4** — The Browser's Tree
+  - [x] Task 4-1
+  - [x] Task 4-2
+  - [x] Review Checkpoint
+- [x] **Phase 5** — Both Skins
+  - [x] Task 5-1
+  - [x] Task 5-2
+  - [x] Task 5-3
+  - [x] Review Checkpoint
+- [x] **Phase 6** — One Table Row
+  - [x] Task 6-1
+  - [x] Task 6-2
+  - [x] Task 6-3
+  - [x] Task 6-4
+  - [x] Review Checkpoint
+  - [x] Compaction Checkpoint
+- [x] `[Stop: Nathan sees both skins' screenshots before Phase 7]`
+- [x] **Phase 7** — Documents, Drive, and the Live Pass
+  - [x] Task 7-1
+  - [x] Task 7-2
+  - [x] Task 7-3
 
 ---
 
@@ -182 +233 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 
 **CHANGE**
 
-- [ ] Rewrite `bundle.test.ts`'s `storeOf` cases as `bundleAddressOf` cases and add the new ones. Watch them fail.
+- [x] Rewrite `bundle.test.ts`'s `storeOf` cases as `bundleAddressOf` cases and add the new ones. Watch them fail.
   - **Answers a Bundle:** a bundle folder answers `{ bundle, store }`.
   - **Answers an Item:** a page or folder inside the artifact answers `item`.
   - **Answers Null:**
@@ -191 +242 @@ The chevron sits right of the label in both skins. An inner row carries its trai
     - a path outside both stores;
     - a suffixed folder without a stamp.
   - **Archive Paths:** an Archive path answers its Collection's store.
-- [ ] Add `stampedSegment` and `bundleAddressOf`, point `originPathOf` at `stampedSegment`, and move every `storeOf` caller below to `bundleAddressOf`. `openBundle`'s becomes `bundleAddressOf(root, abs)?.store` here, and Task 1-2 rewrites the function.
+- [x] Add `stampedSegment` and `bundleAddressOf`, point `originPathOf` at `stampedSegment`, and move every `storeOf` caller below to `bundleAddressOf`. `openBundle`'s becomes `bundleAddressOf(root, abs)?.store` here, and Task 1-2 rewrites the function.
 
 **AFTER**
 
@@ -218 +269 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 +  if (at === -1) return null
 +  const bundle = join(root, ...segs.slice(0, at + 1))
 +  if (segs.length === at + 1) return { bundle, store }
-+  const inner = segs.slice(at + 2)
-+  return inner.length && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
++  const inner = segs.slice(at + 1)
++  return inner.length > 1 && !inner.some(hiddenName) ? { bundle, store, item: abs } : null
 +}
 +
 +/** The bundle is the folder wearing its mint's stamp, so a chain or artifact folder that only wears the suffix is never taken for it. */
@@ -256 +307 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles/bundle.test.ts` is green, with each new case red before its change.
-- [ ] `rg "storeOf" Core` finds nothing, and `npm run typecheck` is clean.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles/bundle.test.ts` is green, with each new case red before its change.
+- [x] `rg "storeOf" Core` finds nothing, and `npm run typecheck` is clean.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 1-2
 
@@ -271 +322 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 
 **CHANGE**
 
-- [ ] Write these `bundle.test.ts` cases over a seeded trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, and watch them fail:
+- [x] Write these `bundle.test.ts` cases over a seeded trashed Collection `A ⟩ S ⟩ T ⟩ P.md`, and watch them fail:
   - **Opening `S`:** its parent is `A.id`, and it has no trail.
   - **Opening `P.md`:**
     - its parent is `T.id` and its trail `[A.id, S.id]`;
@@ -284 +335 @@ The chevron sits right of the label in both skins. An inner row carries its trai
     - on an inner item, it strips exactly that item's carried values from the bundle's record, matched by `page`, `property`, and `value`;
     - on an inner item whose bundle's delete still owes, it takes the item's page paths off the note's `strip`, leaves the rest of the note as it was, and a note left owing nothing clears (`editNote` drops it through `owesAnything`);
     - on a whole bundle, it removes the bundle.
-- [ ] Add `identityOf` to `record.ts` and route `gatherContentRecord` through it.
-- [ ] Add `readBundleAt`, `ContainerRecord`, `isContainerRecord`, `trailWithin`, `innerRecord`, `keptLinksUnder`, `spendBundle`, and `OpenBundle.inner`, and rewrite `openBundle` over `readBundleAt`.
+- [x] Add `identityOf` to `record.ts` and route `gatherContentRecord` through it.
+- [x] Add `readBundleAt`, `ContainerRecord`, `isContainerRecord`, `trailWithin`, `innerRecord`, `keptLinksUnder`, `spendBundle`, and `OpenBundle.inner`, and rewrite `openBundle` over `readBundleAt`. Add `linkedPage` beside `readLinkText`, and route `keptLinksUnder` and `parkLinks` through it.
   - Only `openBundle`, `spendBundle`, and `listInner` (Task 3-1) are exported.
   - Every existing caller destructures `OpenBundle` unchanged.
 
@@ -307 +358 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 +  const { id, icon } = await identityOf(kind, abs)
 ```
 
+```Core/Connections/linkValue.ts diff
+@@ readLinkText @@
++/** The page a Link value's page link resolves to in `index`; an address, or a title `index` can't settle, names none. */
++export const linkedPage = (value: string, index: PageIndex): ConnPage | undefined => {
++  const link = readLinkText(value)
++  return link?.kind === 'page' ? index.resolve(link.title).page : undefined
++}
+```
+
+```Core/Trash/trashedCopies.ts diff
+@@ parkLinks @@
+-    const page = readLinkText(link.value)
+-    const bundle = page?.kind === 'page' ? index.resolve(page.title).page?.id : undefined
++    const bundle = linkedPage(link.value, index)?.id
+```
+
 ```Core/Bundles/bundle.ts diff
 @@ OpenBundle @@
 -/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. */
+-export interface OpenBundle {
+-  abs: string
+-  store: BundleStore
+-  record: RecordFile
+-  artifact: string | null
+-}
 +/** A bundle as one open reads it: its store, its record, and the one artifact it holds, which a property's record holds none of and a bundle cut short may not. An inner item opens as `inner`: the record the bundle's own derives for it, and the item as the artifact. */
- export interface OpenBundle {
-   abs: string
-   store: BundleStore
-   record: RecordFile
-   artifact: string | null
-+  inner: boolean
- }
++export type OpenBundle = { abs: string; store: BundleStore; record: RecordFile } & (
++  | { inner: true; artifact: string }
++  | { inner: false; artifact: string | null }
++)
 
 +type ContainerRecord = Extract<RecordFile, { entity: 'collection' | 'set' }>
 +
 +const isContainerRecord = (record: RecordFile): record is ContainerRecord =>
 +  isContainerKind(record.entity)
 +
-+/** An address read once: its bundle, store, record, and artifact, and the inner item it names, refused when nothing holds that item any more. */
++/** An address read once: its bundle, store, record, and artifact, and the inner item it names with the container record and artifact holding it, refused when nothing holds that item any more. */
 +async function readBundleAt(root: string, abs: string) {
 +  const at = bundleAddressOf(root, abs)
 +  if (!at) return fault('Only a trash or archive record can be spent.')
 +  const record = await readRecord(at.bundle)
 +  if (!record) return fault('That record is unreadable.')
 +  const artifact = await bundleArtifact(at.bundle)
++  const { bundle, store, item } = at
++  if (!item) return ok({ bundle, store, record, artifact, inner: null })
 +  if (
-+    at.item &&
-+    (!isContainerRecord(record) || !artifact || !isAtOrUnder(at.item, artifact) || !(await pathExists(at.item)))
++    !isContainerRecord(record) ||
++    !artifact ||
++    !isAtOrUnder(item, artifact) ||
++    !(await pathExists(item))
 +  )
 +    return fail('not-found', 'That item is no longer there.')
-+  return ok({ ...at, record, artifact })
++  return ok({ bundle, store, record, artifact, inner: { item, held: record, artifact } })
 +}
 +
-+/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; a folder without an id reads `undefined`. */
++/** The container ids above `folder` inside a container's bundle, outermost first: the bundle's own trail and parent, the bundled container, and each folder down to `folder`; null when one of them has no id. */
 +async function trailWithin(
 +  held: ContainerRecord,
 +  artifact: string,
 +  folder: string,
-+): Promise<(string | undefined)[]> {
++): Promise<string[] | null> {
 +  const steps = relative(artifact, folder).split('/').filter(Boolean)
 +  const inner = await Promise.all(
 +    steps.map((_, i) => sidecarId(join(artifact, ...steps.slice(0, i + 1)), 'set')),
 +  )
-+  return [
++  const ids = [
 +    ...(held.trail ?? []),
 +    ...(held.parent.kind === 'container' ? [held.parent.id] : []),
 +    held.id,
 +    ...inner,
 +  ]
++  return ids.every((id): id is string => id !== undefined) ? ids : null
 +}
 +
-+/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable where an id is missing, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
++/** What an inner item carries as its own record: its identity, the trail above it as its parent and trail, unaddressable without one, the bundle's targets, and its partial mark, since what the bundle recorded partly it recorded partly for each item it holds; no place, since the siblings it left are gone with it. */
 +async function innerRecord(
 +  held: ContainerRecord,
-+  trail: readonly (string | undefined)[],
++  trail: readonly string[] | null,
 +  item: string,
 +): Promise<Extract<RecordFile, { entity: 'page' | 'set' }>> {
 +  const entity = isMarkdownFile(item) ? 'page' : 'set'
 +  const { id, icon } = await identityOf(entity, item)
-+  const ids = trail as string[]
-+  const addressed = !trail.includes(undefined)
 +  return {
 +    entity,
 +    ...(id ? { id } : {}),
 +    ...(icon ? { icon } : {}),
-+    parent: addressed ? { kind: 'container', id: ids[ids.length - 1] } : { kind: 'unaddressable' },
-+    ...(addressed && ids.length > 1 ? { trail: ids.slice(0, -1) } : {}),
++    parent: trail ? { kind: 'container', id: trail[trail.length - 1] } : { kind: 'unaddressable' },
++    ...(trail && trail.length > 1 ? { trail: trail.slice(0, -1) } : {}),
 +    ...(held.targets ? { targets: held.targets } : {}),
 +    ...(held.partial ? { partial: true as const } : {}),
 +  }
@@ -390 +463 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 +  const files = await listMarkdownFiles(artifact)
 +  const index = buildPageIndex(files.map((f) => connPage(f, originPathOf(root, store, f))))
 +  return held.links.filter((link) => {
-+    const target = readLinkText(link.value)
-+    const page = target?.kind === 'page' ? index.resolve(target.title).page : undefined
++    const page = linkedPage(link.value, index)
 +    return page !== undefined && isAtOrUnder(page.id, item)
 +  })
 +}
@@ -404 +476 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 -  return ok({ abs, store, record, artifact: await bundleArtifact(abs) })
 +  const read = await readBundleAt(root, abs)
 +  if (!read.ok) return read
-+  const { bundle, store, record, artifact, item } = read.value
-+  if (!item || !artifact || !isContainerRecord(record))
-+    return ok({ abs: bundle, store, record, artifact, inner: false })
-+  const own = await innerRecord(record, await trailWithin(record, artifact, dirname(item)), item)
-+  const links = await keptLinksUnder(root, store, record, artifact, item)
++  const { bundle, store, record, artifact, inner } = read.value
++  if (!inner) return ok({ abs: bundle, store, record, artifact, inner: false })
++  const { item, held } = inner
++  const own = await innerRecord(held, await trailWithin(held, inner.artifact, dirname(item)), item)
++  const links = await keptLinksUnder(root, store, held, inner.artifact, item)
 +  return ok({ abs: bundle, store, record: links.length ? { ...own, links } : own, artifact: item, inner: true })
  }
 +
 +/** Spends what a restore, an empty, or an Archive delete took: the whole bundle, or from an inner item's bundle only the item's share — the Link values it carried away, and its pages on the strip the bundle's delete still owes — so the bundle's own restore never writes them twice and a later finish never strips a link to what came back. */
 +export async function spendBundle(root: string, opened: OpenBundle): Promise<void> {
 +  const { abs, store, record, artifact, inner } = opened
-+  if (!inner || !artifact) return void (await removeOwn(abs))
++  if (!inner) return void (await removeOwn(abs))
 +  const gone = 'links' in record ? (record.links ?? []) : []
 +  const same = (l: unknown): boolean =>
 +    isPlainObject(l) && gone.some((g) => g.page === l.page && g.property === l.property && g.value === l.value)
 +  if (gone.length)
-+    await patchRecord(abs, (raw) => ({
-+      links: (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l)),
-+    }))
++    await patchRecord(abs, (raw) => {
++      const links = (Array.isArray(raw.links) ? raw.links : []).filter((l) => !same(l))
++      return { links: links.length ? links : undefined }
++    })
 +  const bundle = relative(root, abs)
 +  const owing = Object.entries(await readNotes(root)).find(
 +    ([, e]) => e.kind === 'container' && e.bundle === bundle,
@@ -439 +512 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles` is green, with each new case red before its change.
-- [ ] `npm run typecheck` is clean.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles` is green, with each new case red before its change.
+- [x] `npm run typecheck` is clean.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 1-3
 
@@ -465 +538 @@ The chevron sits right of the label in both skins. An inner row carries its trai
   - An inner page restored alone leaves its container not back, so a finish still owed runs the container's strip over the old paths and appends what it takes to the container's record after the item has left.
   - The pulled page's path keys under the container resolve to nothing once it lands elsewhere. Its title key keeps resolving while it lands under its own title, or while a namesake answers it beside a stepped-aside landing ("Pasta (2)").
   - **Links:** an inner item that left would otherwise stay on that strip, and a later finish would strip a link to an item that's back. `spendBundle` takes the item's page paths off `strip` by its origin path when the item leaves (Task 1-2). The pull's own restore then re-spells live linkers to its landing through `returningCascade`, owing that re-spell through its own `relink` entry where a linker can't be written. This half belongs at spend time: `finishOwed` runs every `container` entry before any `relink` entry (`finishOwed.ts:91-92`), so a linker refused at the pull still reads the old key when the container finish runs.
-  - **Views:** the delete's owed `gone` edit names every Set under the container (`goneEdit`'s `within`, `configReach.ts:258-264`). `finishContainer` decides `back` for the container alone, so a Set pulled back out would lose its saved views at a later finish. `finishContainer` drops from a `gone` edit every id the tree holds again, the rule its own header states for the container, applied per Set. A restored Set, nested or not, is live and keeps its views. A Set emptied out of the bundle, or still in it, isn't, and its views are dropped. A move's entry (`within`) keeps its edit whole, since a moved Set is live by design.
+  - **Views:** the delete's owed `gone` edit names every Set under the container (`goneEdit`'s `within`, `configReach.ts:258-264`). `finishContainer` decides `back` for the container alone, so a Set pulled back out would lose its saved views at a later finish. `finishContainer` drops from a `gone` edit every id the tree holds again or an Archive its Collection still owns holds, applied per Set whether or not the container is back. A restored Set, nested or not, and an archived one keep their views. A Set emptied out of the bundle, or still in it, is held by neither, and the views' filters by it drop, even once the rest of the bundle is restored whole. A move's entry (`within`) keeps its edit whole, since a moved Set is live by design.
 
 **CHANGE**
 
-- [ ] Write these tests and watch them fail.
+- [x] Write these tests and watch them fail.
   - **`trashRecovery.test.ts`:**
     - A page pulled from a trashed Set restores to a given container, and the bundle still holds its sibling.
     - A kept Link value naming that page refills on its restore and leaves the bundle's record.
@@ -477 +550 @@ The chevron sits right of the label in both skins. An inner row carries its trai
     - An inner item restored with no destination is refused as homeless (`parent-gone`), and its bundle is left byte-identical.
     - A nested Set pulled out lands with its pages, and `refileLanded` carries what was archived from within it into the landing Collection's Archive.
     - **Owed Strip:** a page pulled from a trashed Set while the Set's delete still owes its strip, made owed by a linker whose write is refused, as `archive.test.ts:545-559` does. The note no longer lists the page's path. When the linker is writable again and Try Again runs, its `[[S/Pasta]]` link reads the page's landing and nothing is appended to the Set's record, both with the page landed under its own title and stepped aside ("Pasta (2)"), and with the linker still refused at the pull (its re-spell owed) and writable at the pull.
-    - **Owed View Reach:** Set `S`, holding Set `T`, pulled from a trashed Collection while the Collection's delete still owes its `gone` view edit. Once the finish runs, saved views filtering by `S` and by `T` are kept, and a view filtering by a Set still in the bundle is dropped.
+    - **Owed View Reach:** Set `S`, holding Set `T`, pulled from a trashed Collection while the Collection's delete still owes its `gone` view edit. Once the finish runs, saved views' filters by `S` and by `T` are kept, and a filter by a Set still in the bundle drops.
   - **`spend.test.ts`:**
     - Emptying an inner item disposes only that item, drops its pages' metadata, takes its carried values off the bundle's record, and leaves its owed note keyed by the item's own address.
-    - Emptying an inner Set while its bundle's delete still owes its `gone` view edit drops the views filtering by that Set once the finish runs.
+    - Emptying an inner Set while its bundle's delete still owes its `gone` view edit drops the views' filters by that Set once the finish runs.
   - **`archive.test.ts`:**
     - A page pulled from an archived Set restores by a plain move to a given container.
     - An inner item's Archive delete moves it into the Trash, and its Trash record's `archive` names the item's address.
-- [ ] Edit the spends, `fromArchive`, and `finishContainer`'s view drop as below.
+- [x] Edit the spends, `fromArchive`, and `finishContainer`'s view drop as below.
   - `spend.ts` and `archive.ts` lose their `removeOwn` import, and `delete.ts` keeps its own for `:119`.
   - `fromArchive` returns on a refused path before opening, so `resolved.value` names the address the item held.
-- [ ] Update `spendUndo`'s doc (`confirmations.ts:46`) to read "A bundle, or an inner item of one, restored or deleted from anywhere spends…".
 
 **AFTER**
 
@@ -549 +621 @@ The chevron sits right of the label in both skins. An inner row carries its trai
 ```Core/Nexus/finishOwed.ts diff
 @@ finishContainer @@
 -  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
-+  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and a Set pulled back out of it keeps its own views; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
++  // A deleted page, Collection, or Set live again holds its links and views, so its delete owes them nothing, and its `gone` view edit keeps only the Sets neither the tree nor an Archive its Collection still owns holds; a moved Set is live by design, so it's back only while it stands where it left, its move never made or made undone.
    const tree = await liveTreeOf(root)
    const live = findContainerById(tree, id)
    const back = e.within ? live?.path === e.at : pagesByIdOf(tree).has(id) || !!live
-+  const edit =
-+    e.edit?.kind === 'gone' && !e.within
-+      ? { ...e.edit, ids: e.edit.ids.filter((x) => !findContainerById(tree, x)) }
-+      : e.edit
++  const owedEdit = async (): Promise<ContainerEntry['edit']> => {
++    if (e.edit?.kind !== 'gone' || e.within) return back ? undefined : e.edit
++    const unheld = e.edit.ids.filter((x) => !findContainerById(tree, x))
++    if (!unheld.length) return undefined
++    let elsewhere: Promise<Set<string>> | undefined
++    const archived: string[] = []
++    for (const { name, kind } of await listEntries(join(root, ARCHIVE_DIR_REL)))
++      if (
++        kind === 'dir' &&
++        (await archiveOwned(tree, name, () => (elsewhere ??= collectionsElsewhere(root, tree))))
++      )
++        archived.push(...(await archivedSetIds(root, join(root, archiveDirRel(name)))))
++    const ids = unheld.filter((x) => !archived.includes(x))
++    return ids.length ? { ...e.edit, ids } : undefined
++  }
++  const edit = await owedEdit()
  …
    const viewed =
 -    !!e.edit &&
-+    !!edit &&
-+    (edit.kind !== 'gone' || edit.ids.length > 0) &&
-     !back &&
+-    !back &&
 -    add(reach, await reachConfig(root, e.edit, e.within && join(root, e.within)))
-+    add(reach, await reachConfig(root, edit, e.within && join(root, e.within)))
++    !!edit && add(reach, await reachConfig(root, edit, e.within && join(root, e.within)))
 ```
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Trash Core/Archive Core/Bundles` is green, with each new case red before its change.
-- [ ] Every existing whole-bundle case passes untouched.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Trash Core/Archive Core/Bundles` is green, with each new case red before its change.
+- [x] Every existing whole-bundle case passes untouched.
+- [x] Check for unnecessary code or mistakes.
 
 #### Review Checkpoint
 
-- [ ] Gates are clean.
-- [ ] An inner item restored, emptied, or Archive-deleted leaves its bundle holding exactly its siblings, and the bundle record's `links` minus the item's.
-- [ ] A refused inner-item op leaves its bundle byte-identical.
+- [x] Gates are clean.
+- [x] An inner item restored, emptied, or Archive-deleted leaves its bundle holding exactly its siblings, and the bundle record's `links` minus the item's.
+- [x] A refused inner-item op leaves its bundle byte-identical.
 
 ---
 
@@ -602 +684 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Write these tests and watch them fail.
+- [x] Write these tests and watch them fail.
   - **`bundle.test.ts`:** `fileInto` by address:
     - An inner item's address re-nests into its standing folder.
-    - A taken name, a gone folder, or another store's address mints a fresh bundle.
+    - A taken name or a gone folder mints a fresh bundle, and a standing folder takes the item when its store is of `to`'s kind.
     - A whole bundle's address re-mints under its leaf.
   - **`archive.test.ts`:** a page pulled from an archived Set and restored is put back by its Undo inside the Set's bundle, at its folder.
-- [ ] Rewrite the existing tests that pass a `leaf`:
+- [x] Rewrite the existing tests that pass a `leaf`:
   - **`archive.test.ts:219-247`:** the `rearchive` helper passes the full bundle address, and the `../name` case stays.
   - **`ArchiveView.test.tsx:290,298`:** expect `at:` with the full bundle path.
   - **`mutateRequest.test.ts:19`:** use `at: 7`.
-- [ ] Edit the code as below:
+- [x] Edit the code as below:
   - `archiveOp` answers `bundled: { bundlePath: filed.address }`, and `archive.ts` loses its `relative` import.
   - `refile.ts:38` drops its last argument, and with it `refile.ts`'s `basename` import.
   - `rearchive` sends `at`, and `browser.ts` loses its `basename` import.
@@ -623 +705 @@ A whole bundle still re-mints under its own name, as it does today.
 ```Core/Bundles/bundle.ts diff
 @@ fileInto @@
 -/** Files `artifact` into a bundle minted in `to` for `origin`, `leaf` asked back, its record written ahead; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. */
-+/** Files `artifact` into `to` back at `at`, the address it held: into the folder it sat in while that folder still stands inside a bundle of `to` and holds nothing of its name, else into a bundle minted for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle; a failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
++/** Files `artifact` back at `at`, the address it held: into the folder it sat in while that folder still stands, in a store of `to`'s kind, and holds nothing of its name, else into a bundle minted in `to` for `origin`, its record written ahead, asking back the bundle name `at` names when it names a whole bundle. A failed move takes the bundle back, since a ghost bundle would take the name a retry asks for. Answers the address it now holds and where it landed. */
  export async function fileInto(
    root: string,
    to: BundleStore,
@@ -636 +718 @@ A whole bundle still re-mints under its own name, as it does today.
 +  at?: string,
 +): Promise<{ address: string; landed: string }> {
 +  const held = at === undefined ? null : bundleAddressOf(root, join(root, at))
-+  if (held?.item && layoutOf(held.store).dir === layoutOf(to).dir) {
++  if (held?.item && held.store.kind === to.kind) {
 +    const landed = join(dirname(held.item), basename(artifact))
 +    if ((await pathExists(dirname(held.item))) && !(await pathExists(landed))) {
 +      await relocate(artifact, landed)
@@ -689 +771 @@ A whole bundle still re-mints under its own name, as it does today.
 ```Core/Bundles/browser.ts diff
 @@ rearchive @@
 -/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
-+/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, back at the address it left: inside the Set it was pulled from while that Set's bundle stands, else under the bundle name it left, so it keeps its Archived date; one renamed or stepped aside since takes a fresh stamp, since that name no longer fits it. */
++/** A restore from the Archive undoes by archiving each item again, found by id so it follows a rename made since, back at the address it left. */
  …
 -      await mutate({ op: 'archive', path, kind: archivedKind(row), leaf: basename(row.bundlePath) })
 +      await mutate({ op: 'archive', path, kind: archivedKind(row), at: row.bundlePath })
@@ -697 +779 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles Core/Archive Core/Nexus/mutateRequest.test.ts` is green.
-- [ ] `rg -w "leaf" Core/Bundles Core/Archive Core/Nexus/mutateRequest.ts` finds only `mintBundle`'s own parameter, `placement.ts`'s local `leaf` helper (`:166-180`), and `refile.test.ts`'s local variable (`:446-450`).
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles Core/Archive Core/Nexus/mutateRequest.test.ts` is green.
+- [x] `rg -w "leaf" Core/Bundles Core/Archive Core/Nexus/mutateRequest.ts` finds only `mintBundle`'s own parameter, `placement.ts`'s local `leaf` helper (`:166-180`), and `refile.test.ts`'s local variable (`:446-450`).
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 2-2
 
-**TASK:** Make the Archive delete's Undo, a Trash restore to `{ kind: 'archive' }`, file back through `fileInto` at the address the Trash record's `archive` names.
+**TASK:** Make the Archive delete's Undo, a Trash restore to `{ kind: 'archive' }`, file back through `fileInto` at the address the Trash record's `archive` names, rebased onto the Archive its innermost live ancestor's Collection keeps now. Placement's `dir` is the one source of where the Undo files.
 
 **NOW:**
 - **`placeRecord`'s archive branch** (`placement.ts:203-223`) reads `stored.archive` through `bundleAddressOf`, as of Task 1-1, which already admits an inner item's address.
@@ -711 +793 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Write these `archive.test.ts` cases and watch them fail:
+- [x] Write these `archive.test.ts` cases and watch them fail:
   - An inner item Archive-deleted, then Undone, returns inside its Set's bundle, with its Link values refilled as in the whole-bundle case at `:481`.
   - The same case with the Set restored in between returns as its own Archive row.
-- [ ] Edit as below.
+  - With a live Set above the archived one moved into another Collection, the Undo returns it inside its Set's bundle carried into that Collection's Archive, and with that Set restored in between, as its own row there.
+- [x] Edit as below.
   - `spend.ts` loses its `basename` import, whose only use was `:198`.
   - Update the `record.ts` `archive` doc (`:56`) and the `restoreDestination` doc at `mutateRequest.ts:48`.
 
@@ -723 +806 @@ A whole bundle still re-mints under its own name, as it does today.
 ```Core/Trash/spend.ts diff
 @@ restoreTrashed @@
 -    // The Undo of a delete from the Archive lands in a bundle minted under the name its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
-+    // The Undo of a delete from the Archive files back at the address its record keeps, reconciled as any Trash restore, and nothing lands in the tree.
++    // The Undo of a delete from the Archive files back at the address its record keeps, in the Archive that holds it now, reconciled as any Trash restore, and nothing lands in the tree.
      if (into && (record.entity === 'page' || record.entity === 'set')) {
        const origin = join(root, originPathOf(root, store, artifactAbs))
        const { archive, links, targets, partial, ...filed } = record
@@ -731 +814 @@ A whole bundle still re-mints under its own name, as it does today.
 -        await fileInto(root, into, origin, artifactAbs, filed, basename(dir)),
 -        finalName,
 -      )
-+      targetAbs = (await fileInto(root, into, origin, artifactAbs, filed, archive)).landed
++      targetAbs = (await fileInto(root, into, origin, artifactAbs, filed, dir)).landed
+```
+
+```Core/Bundles/placement.ts diff
+@@ placeRecord @@
+     // The address it names may be gone, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
+-    const into = bundleAddressOf(root, join(root, stored.archive))?.store
+-    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
++    const named = bundleAddressOf(root, join(root, stored.archive))?.store
++    if (named?.kind !== 'archive') return fault(NO_DESTINATION)
++    const origin = originOf(stored)
++    const live = origin
++      ? [...origin.trail, origin.parent]
++          .reverse()
++          .map((id) => containerTrailById(tree, id))
++          .find((held) => held !== null)
++      : undefined
++    const into = archiveStoreOf(live?.[0].id) ?? named
+ …
+       placement: {
+-        dir: stored.archive,
++        dir: join(
++          layoutOf(into).dir,
++          relative(join(root, layoutOf(named).dir), join(root, stored.archive)),
++        ),
 ```
 
 ```Core/Bundles/record.ts diff
@@ -741 +848 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Archive Core/Trash Core/Bundles Core/Interface/Confirm` is green, with each new case red before its change.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Archive Core/Trash Core/Bundles Core/Interface/Confirm` is green, with each new case red before its change.
+- [x] Check for unnecessary code or mistakes.
 
 #### Review Checkpoint
 
-- [ ] Gates are clean.
-- [ ] Both Undo paths re-nest an inner item while its folder stands, and fall back to a bundle of its own otherwise.
-- [ ] A whole bundle's Undo keeps its leaf (`archive.test.ts:219-247`, `:481-527`), and refile's moves keep their bundle names.
+- [x] Gates are clean.
+- [x] Both Undo paths re-nest an inner item while its folder stands, and fall back to a bundle of its own otherwise.
+- [x] A whole bundle's Undo keeps its leaf (`archive.test.ts:219-247`, `:481-527`), and refile's moves keep their bundle names.
 
 ---
 
@@ -764 +871 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Write these tests and watch them fail.
+- [x] Write these tests and watch them fail.
   - **`bundle.test.ts`:** `listInner` lists one level of the folder:
     - Sets come first, then pages.
     - Each kind follows the folder sidecar's `set_order` and `page_order` through `resolveOrder` (`Core/Nexus/order.ts`).
-    - Hidden entries are skipped.
+    - Hidden, asset, and excluded entries are skipped.
   - **`rows.test.ts`:** an inner row's fields:
     - `bundlePath` is its address, and `stored` is `{ id, path: address }`.
     - Its icon is the page metadata's, or the Set sidecar's.
@@ -777 +884 @@ A whole bundle still re-mints under its own name, as it does today.
     - `storedAt` is the bundle's stamp.
     - `homeResolves` is false.
     - `partial` follows its bundle record's, hand-seeded as in Task 1-2.
-- [ ] Add `listInner` with its `InnerListing`, `artifactRow`, and `innerRows`.
+- [x] Add `listInner` with its `InnerListing`, `artifactRow`, and `innerRows`.
   - `bundleRowOf`'s artifact branch becomes one `artifactRow` call, and the existing `rows.test.ts` cases pass unchanged, the partial case at `:189-212` among them.
   - `artifactRow` carries `partial` from the record it's given, so an inner row reads the mark `innerRecord` passes down.
   - Lift `bundleRowOf`'s `liveCrumbs(record, tree) ?? frozenCrumbs(store, bundlePath)` into `bundleCrumbs`. `innerRows` reads it once per listing, then appends one crumb per segment of the path from the bundle folder to `folder`. The first crumb takes the bundled record's kind, and the rest are `'set'`.
   - Inside `artifactRow`, `name` is `basename(at.path)` and `restoring` is `at.bundlePath`. For an inner row, that is its own address, which answers `heldElsewhere` as the bundle would: `byId` holds no Set ids and no Trash pages.
-- [ ] Update the `BundleRow` docs:
+- [x] Update the `BundleRow` docs:
   - **`bundlePath`:** add "Its address: a bundle's folder, or the inner item's own path."
   - **`stored`** (`rows.ts:39`): "…by its record's id and its path in its store…"
 
 **AFTER**
 
 ```Core/Bundles/bundle.ts diff
+@@ isContainerRecord @@
++type InnerRecord = Extract<RecordFile, { entity: 'page' | 'set' }>
+ …
 +/** One level of a container address's inner items under the bundle they sit in, its record and store, and the folder they share. */
 +export interface InnerListing {
 +  bundle: string
 +  store: BundleStore
-+  record: RecordFile
-+  folder: string | null
-+  items: { address: string; record: RecordFile }[]
++  record: ContainerRecord
++  folder: string
++  items: { address: string; record: InnerRecord }[]
 +}
 +
 +/** One level of a container address's inner items, its Sets and then its pages, each in the order the folder's sidecar keeps, with the record it carries; the trail above them is read once for the level. */
 +export async function listInner(
 +  root: string,
 +  abs: string,
++  scope: WatchScope,
 +): Promise<Result<InnerListing>> {
 +  const read = await readBundleAt(root, abs)
 +  if (!read.ok) return read
-+  const { bundle, store, record, artifact, item } = read.value
-+  const folder = item ?? artifact
-+  const listed = { bundle: relative(root, bundle), store, record, folder: folder && relative(root, folder), items: [] }
-+  if (!artifact || !folder || !isContainerRecord(record)) return ok(listed)
++  const { bundle, store, record, artifact, inner } = read.value
++  if (!isContainerRecord(record) || !artifact)
++    return fail('not-found', 'That holds no inner items.')
++  const folder = inner?.item ?? artifact
 +  const trail = await trailWithin(record, artifact, folder)
 +  const entries = (await listEntries(folder)).filter(
-+    ({ name, kind }) => !hiddenName(name) && (kind === 'dir' || isMarkdownFile(name)),
++    (e) =>
++      (e.kind === 'dir' || isContentFile(e)) &&
++      !outsideContent(originPathOf(root, store, join(folder, e.name)), scope),
 +  )
 +  const items = await Promise.all(
 +    entries.map(async ({ name }) => {
 +      const at = join(folder, name)
 +      const own = await innerRecord(record, trail, at)
-+      return { address: relative(root, at), record: own, id: ('id' in own && own.id) || at, title: name }
++      return {
++        address: relative(root, at),
++        record: own,
++        id: own.id ?? at,
++        title: titleFromPath(name),
++      }
 +    }),
 +  )
-+  const meta = (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
++  const meta =
++    (await readJsonObject(sidecarPath(folder, folder === artifact ? record.entity : 'set'))) ?? {}
++  const ordered = [
++    ...resolveOrder(
++      items.filter((i) => i.record.entity === 'set'),
++      asStringArray(meta.set_order),
++    ),
++    ...resolveOrder(
++      items.filter((i) => i.record.entity === 'page'),
++      asStringArray(meta.page_order),
++    ),
++  ]
 +  return ok({
-+    ...listed,
-+    items: [
-+      ...resolveOrder(items.filter((i) => i.record.entity === 'set'), asStringArray(meta.set_order)),
-+      ...resolveOrder(items.filter((i) => i.record.entity === 'page'), asStringArray(meta.page_order)),
-+    ],
++    bundle: relative(root, bundle),
++    store,
++    record,
++    folder: relative(root, folder),
++    items: ordered.map(({ address, record }) => ({ address, record })),
 +  })
 +}
 ```
 
 ```Core/Bundles/rows.ts diff
+@@ bundleRowOf @@
+   if (!artifactName) return null
++  return artifactRow(
++    record,
++    { bundlePath, path: relJoin(bundlePath, artifactName), storedAt: storedAtOf(bundlePath) },
++    bundleCrumbs(record, store, bundlePath, tree),
++    tree,
++    byId,
++  )
++}
++
++/** A bundle's trail: live from its recorded parent, else frozen from the chain it was filed under. */
++function bundleCrumbs(
++  record: ArtifactRecord,
++  store: BundleStore,
++  bundlePath: string,
++  tree: NexusTree,
++): { crumbs: BundleCrumb[]; historical: boolean } {
++  const live = liveCrumbs(record, tree)
++  return { crumbs: live ?? frozenCrumbs(store, bundlePath), historical: !live }
++}
++
 +/** The one row an artifact reads as, a bundle's own or an inner item's: the place it shows, the date it entered, and whether its home still answers. */
 +function artifactRow(
 +  record: ArtifactRecord,
@@ -839 +990 @@ A whole bundle still re-mints under its own name, as it does today.
 +  place: { crumbs: BundleCrumb[]; historical: boolean },
 +  tree: NexusTree,
 +  byId: NexusPages['byId'],
-+): BundleRow
- …
-+/** A bundle's trail: live from its recorded parent, else frozen from the chain it was filed under. */
-+function bundleCrumbs(
-+  record: ArtifactRecord,
-+  store: BundleStore,
-+  bundlePath: string,
-+  tree: NexusTree,
-+): { crumbs: BundleCrumb[]; historical: boolean }
- …
++): BundleRow {
++  const name = basename(at.path)
++  const icon =
++    record.entity === 'page'
++      ? record.id
++        ? tree.config.pageMetadata[record.id]?.icon
++        : undefined
++      : record.entity === 'context'
++        ? undefined
++        : record.icon
++  const home = resolveRecord(record, name, tree, byId, at.bundlePath)
++  return matched({
++    bundlePath: at.bundlePath,
++    kind: record.entity,
++    title: record.entity === 'page' ? titleFromPath(name) : name,
++    crumbs: place.crumbs,
++    ...(place.historical ? { historical: true } : {}),
++    storedAt: at.storedAt,
++    ...(icon ? { icon } : {}),
++    ...((record.entity === 'page' || record.entity === 'set') && record.id
++      ? { stored: { id: record.id, path: at.path } }
++      : {}),
++    homeResolves: !('refuse' in home) || home.refuse === 'id-live',
++    ...(record.partial ? { partial: true as const } : {}),
++  })
++}
++
 +/** A bundle's inner items as rows: each addressed by its own path, dated by its bundle's stamp, its trail the bundle's own followed by the containers inside it down to the row's folder. */
 +export function innerRows(
 +  listed: InnerListing,
 +  tree: NexusTree,
 +  byId: NexusPages['byId'],
-+): BundleRow[]
++): BundleRow[] {
++  const { bundle, store, record, folder, items } = listed
++  const { crumbs, historical } = bundleCrumbs(record, store, bundle, tree)
++  const [held, ...sets] = relative(bundle, folder).split('/')
++  const place = {
++    crumbs: [
++      ...crumbs,
++      { kind: record.entity, title: held },
++      ...sets.map((title) => ({ kind: 'set' as const, title })),
++    ],
++    historical,
++  }
++  const storedAt = storedAtOf(bundle)
++  return items.map(({ address, record }) =>
++    artifactRow(record, { bundlePath: address, path: address, storedAt }, place, tree, byId),
++  )
++}
 ```
 
-`asStringArray` comes from `Core/Nexus/coerce`, as `containerFields.ts` takes it, and `sidecarPath` comes from `Core/Paths/paths`.
+`homeResolvesFor` folds into `artifactRow`, its one caller. `asStringArray` comes from `Core/Nexus/coerce`, as `containerFields.ts` takes it; `sidecarPath` comes from `Core/Paths/paths`; and an entry lists when it's a folder or `isContentFile` admits it, and `outsideContent` passes its origin path under the scope the handler reads from the tree, as `nexusPages` reads the Archive.
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles` is green, with each new case red before its change.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles` is green, with each new case red before its change.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 3-2
 
@@ -872 +1056 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Write these `handlers.test.ts` cases and watch them fail:
+- [x] Write these `handlers.test.ts` cases and watch them fail:
   - Each address's inner items answer in the addresses' order.
   - A gone address, or a path escaping the root, answers an empty list, so one refused address never blanks the other open rows.
   - A non-array or non-string argument faults.
-- [ ] Add the channel and its handler.
+- [x] Add the channel and its handler.
   - The handler reads the tree and pages once per call.
   - Only a malformed argument faults; each address answers on its own.
 
@@ -884 +1068 @@ A whole bundle still re-mints under its own name, as it does today.
 
 ```Core/Contract/bridge.ts diff
    'bundles:list': { args: [store: BundleStore, within?: string]; reply: Result<BundleRow[]> }
-+  // The inner items of each row a browser holds open, asked on opening and again with every open row on each refresh, so no listing walks a container's artifact.
++  // One level of inner items per row a browser holds open, asked on opening and again on each refresh, since `bundles:list` walks no artifact.
 +  'bundles:children': { args: [addresses: string[]]; reply: Result<BundleRow[][]> }
 ```
 
@@ -893 +1077 @@ A whole bundle still re-mints under its own name, as it does today.
 +    if (!Array.isArray(raw) || !raw.every(isString)) return fault('Addresses are required.')
 +    const tree = await liveTreeOf(root)
 +    const { byId } = await nexusPages(root, tree)
-+    const out: BundleRow[][] = []
-+    for (const address of raw) {
-+      const resolved = await resolveUnderRoot(root, address)
-+      const listed = resolved.ok ? await listInner(root, resolved.value) : resolved
-+      out.push(listed.ok ? innerRows(listed.value, tree, byId) : [])
-+    }
-+    return ok(out)
++    const scope = scopeOf(tree.config)
++    return ok(
++      await Promise.all(
++        raw.map(async (address) => {
++          const resolved = await resolveUnderRoot(root, address)
++          const listed = resolved.ok ? await listInner(root, resolved.value, scope) : resolved
++          return listed.ok ? innerRows(listed.value, tree, byId) : []
++        }),
++      ),
++    )
 +  }),
 ```
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles Core/Contract` is green, including `Core/Contract/engineGraph.test.ts`.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles Core/Contract` is green, including `Core/Contract/engineGraph.test.ts`.
+- [x] Check for unnecessary code or mistakes.
 
 #### Compaction Checkpoint
 
-- [ ] Tick the host phases in *§Process Overview*, record any *§Deviations*, and prepare the handoff before the renderer phases.
+- [x] Tick the host phases in *§Process Overview*, record any *§Deviations*, and prepare the handoff before the renderer phases.
 
 ---
 
@@ -929 +1116 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Write these `browser.test.ts` cases and watch them fail:
+- [x] Write these `browser.test.ts` cases and watch them fail:
   - **`treeRows`:**
     - It sets each row's `depth`.
     - `open` is null for a page.
@@ -937 +1124 @@ A whole bundle still re-mints under its own name, as it does today.
   - **`outermostOf`:** a checked Set and its checked page act once, while siblings and look-alike prefixes (`A/B` vs `A/Bc`) both stay.
   - **Remembered Checks:**
     - A checked inner row stays checked when its container collapses, shows checked again when it reopens, and is left out of `picked` while hidden.
-    - A check whose row its reopened container no longer lists is dropped once that container's reply lands, and is kept while the reply is still pending.
-- [ ] Hold `open: ReadonlyMap<string, readonly BundleRow[]>` in state, mirrored in a ref for `refresh`. This map is the only record of what's open.
-  - **Opening:** `rowClick` on a closed container sets its entry to `[]` at once, so it reads open with its chevron turned. It then asks `bundles:children([address])` and replaces the entry with the reply, but only while the address is still open.
+    - A check whose row its reopened container no longer lists is kept when that container's reply lands, and dropped at the next listing.
+  - **Listing:** a listing asks once for every open address and keeps the checks its reply still lists; a reply that no longer lists a checked inner row drops its check; a container closed while the reply is in flight stays closed.
+  - **Closing:** a container's close forgets its open descendants two levels deep, and a late reply doesn't reopen it.
+  - **Clicks:** a `detail` of 0, a keyboard's click, discloses a container and toggles a page; a page's `detail === 2` leaves it checked whether or not it started checked.
+  - **Coverage:** a checked Set and its checked page reach `picked` once, as the Set.
+- [x] Hold `open: ReadonlyMap<string, readonly BundleRow[] | null>` in state, mirrored in a ref that holds the open map alone. `null` marks an entry whose reply is pending. This map is the only record of what's open.
+  - **Opening:** `rowClick` on a closed container sets its entry to `null` at once, so it reads open with its chevron turned. It then asks `bundles:children([address])` and sets the entry from the reply only while that entry is still `null`, so a late reply changes nothing, and a failed one leaves it pending for the next listing to ask again.
   - **Closing:** `rowClick` on an open container drops the address and every key `isAtOrUnder` it from `open`. Its rows' checks stay, under the rule below.
-  - **Refreshing:** after the listing lands, `refresh` keeps the open addresses that `treeRows` still reaches over the new top rows. It asks for all of them in one `bundles:children` call and sets the map from the reply, under `refresh`'s own `asks` rule.
-- [ ] Derive the rest:
+  - **Refreshing:** after the listing lands, `refresh` asks for every open address in one `bundles:children` call, under `refresh`'s own `asks` rule. It lays the reply over the open map as it stands then, keeps the entries `treeRows` still reaches over the new top rows, and sets the listing, the map, and the prune together.
+- [x] Derive the rest:
   - **Kept Checks:** `checkSet.ts`'s `retained` takes a predicate in place of a live set, and `PageReaderWindow.tsx:148` passes `(k) => live.has(k)`. The browser's predicate keeps a check in one of two cases:
     - its row is listed (a top row, or one in `open`);
-    - the nearest listed row above its address is a closed container, whose contents aren't loaded to say otherwise.
-  - **When Checks Are Pruned:** `retained` runs only when a listing lands: after `refresh` sets the top rows and its one `bundles:children` reply, and when a single opening's reply lands. A container that's just been opened holds `[]` until its reply arrives, and pruning then would drop the checks the reply is about to show. Collapsing changes no listing, so it prunes nothing.
+    - the nearest listed row above its address is closed or pending, its contents not loaded to say otherwise.
+  - **When Checks Are Pruned:** `retained` runs only where `refresh` lands, over its top rows and its one `bundles:children` reply. Opening and collapsing prune nothing. A stale hidden check is inert until then, since both skins read `checked` only for rows they show and every count comes from `picked`, and every op emits `storesChanged`.
   - **`visible`:** `treeRows(filterRows(rows, query), open)`.
   - **`found`:** the top-level match count, which ArchiveView publishes.
   - **`rowsInView`:** the `BundleRow`s of `visible`, memoized beside it.
   - **`picked`:** `outermostOf(checkedIn(checked, rowsInView, key))`.
   - **The menu's targets:** `outermostOf(actedOn(checked, rowsInView, row, key))`, so the right-click rule stays in `actedOn`, which `PageReaderWindow.tsx` also uses.
-- [ ] Add `rowClick(row, detail)`:
-  - A container discloses on `detail === 1`.
-  - A page toggles its check on `detail === 1`.
-  - A page on `detail === 2` makes sure it's checked.
-- [ ] Keep `toggle` for the checkbox.
-- [ ] Update the hook's docstring (`:189`) to name the tree, its open map, and `rowClick`.
+- [x] Add `rowClick(row, detail)`, under `CalendarPicker.tsx`'s rule, so a keyboard's `el.click()` (`detail === 0`) reads as a single click:
+  - A container discloses on `detail < 2`.
+  - A page toggles its check on `detail < 2`.
+  - A page on `detail === 2` makes sure it's checked and calls the hook's optional `open`, which ArchiveView passes as its reader open.
+- [x] Keep `toggle` for the checkbox.
+- [x] Update the hook's docstring (`:189`) to name the tree, its open map, and `rowClick`.
 
 **AFTER**
 
@@ -969 +1160 @@ A whole bundle still re-mints under its own name, as it does today.
 +  open: boolean | null
 +}
 +
-+const discloses = (row: BundleRow): boolean => row.kind === 'set' || row.kind === 'collection'
++/** Each open container's inner rows, null while its reply is pending. */
++type OpenRows = ReadonlyMap<string, readonly BundleRow[] | null>
 +
 +/** The rows in view: each top row, and beneath each open one the inner rows it lists, in order. */
-+export function treeRows(
-+  rows: readonly BundleRow[],
-+  open: ReadonlyMap<string, readonly BundleRow[]>,
-+): TreeRow[] {
++export function treeRows(rows: readonly BundleRow[], open: OpenRows): TreeRow[] {
 +  const out: TreeRow[] = []
 +  const walk = (row: BundleRow, depth: number): void => {
-+    const inner = discloses(row) ? open.get(row.bundlePath) : undefined
-+    out.push({ row, depth, open: discloses(row) ? inner !== undefined : null })
++    const opens = isContainerKind(row.kind)
++    const inner = opens ? open.get(row.bundlePath) : undefined
++    out.push({ row, depth, open: opens ? inner !== undefined : null })
 +    for (const child of inner ?? []) walk(child, depth + 1)
 +  }
 +  for (const row of rows) walk(row, 0)
@@ -989 +1179 @@ A whole bundle still re-mints under its own name, as it does today.
 +/** A batch acts on each item once: a row inside another the batch holds goes with it. */
 +export const outermostOf = (rows: readonly BundleRow[]): BundleRow[] =>
 +  rows.filter((r) => !rows.some((o) => o !== r && isAtOrUnder(r.bundlePath, o.bundlePath)))
++
++/** The checks a listing keeps: a listed row's, and one inside a closed or pending container, whose contents aren't loaded to say otherwise. */
++function keepsCheck(rows: readonly BundleRow[], open: OpenRows): (address: string) => boolean {
++  const listed = new Set(
++    [...rows, ...[...open.values()].flatMap((v) => v ?? [])].map((r) => r.bundlePath),
++  )
++  return (address) => {
++    if (listed.has(address)) return true
++    for (let at = relDirname(address); at; at = relDirname(at))
++      if (listed.has(at)) return !open.get(at)
++    return false
++  }
++}
 @@ useBundleBrowser @@
+-  { query, shown, within }: { query: string; shown: boolean; within?: string },
++  {
++    query,
++    shown,
++    within,
++    open: openPage,
++  }: { query: string; shown: boolean; within?: string; open?: (row: BundleRow) => void },
+ …
 -  visible: BundleRow[]
 +  visible: TreeRow[]
 +  found: number
 +  rowClick: (row: BundleRow, detail: number) => void
+ …
++  const disclose = async (address: string): Promise<void> => {
++    const was = held.current
++    if (was.has(address))
++      return openTo(new Map([...was].filter(([at]) => !isAtOrUnder(at, address))))
++    openTo(new Map(was).set(address, null))
++    const res = await dialer().ask('bundles:children', [address])
++    if (res.ok && held.current.get(address) === null)
++      openTo(new Map(held.current).set(address, res.value[0]))
++  }
 ```
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles/browser.test.ts` is green, with each new case red before its change.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles/browser.test.ts` is green, with each new case red before its change.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 4-2
 
@@ -1012 +1233 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Rewrite two existing cases to the new rule and watch them fail:
+- [x] Rewrite two existing cases to the new rule and watch them fail:
   - **`TrashFrame.test.tsx:382`:** a Restore All of two homeless rows and one homed row opens one picker. The two homeless rows restore to the picked place, and the homed row restores to its own home, its request sent with no destination. A dismissed picker restores nothing.
-  - **`ArchiveView.test.tsx:359`:** make its homeless row a disclosed inner item, and run its batch half as a mixed batch that asks once.
-- [ ] Replace `placesFor` with `DestinationKind` and three functions, then rewrite `restoreOne`, `openMenu`, and `restoreBatch` over them:
+  - **`ArchiveView.test.tsx:359`:** run its batch half as a mixed batch that asks once.
+- [x] Add `browser.test.ts` cases:
+  - a batch of a homeless Space and a homeless page asks once per kind and sends each its own kind's destination, and a dismissed second ask restores nothing;
+  - a right-click on a checked inner page under its checked, in-view parent Set offers the Set's destinations and restores the Set.
+- [x] Replace `placesFor` with `DestinationKind` and three functions, then rewrite `restoreOne`, `openMenu`, and `restoreBatch` over them:
+  - **`DestinationKind`:** `Extract<RestoreDestination, { id: string }>['kind']`, the request schema's own.
   - **`destinationKind(row)`:** `'context'` for a Space, otherwise `'container'`.
   - **`destinationTargets(kind)`:** that kind's targets, built once.
   - **`askDestination(kind)`:** pops `destinationRows` and answers a `RestoreDestination` or null.
-- [ ] Extend `many` with `destinationOf`, keeping its `owed`, and keep `restoreBatch`'s `owed` and its `finishOwed` argument as they stand. Remove `notifyReport`'s import from `browser.ts`, since its only use was `:335`.
+  - **`openMenu`:** its single-target logic reads `targets[0]`, after `outermostOf`, so the destination submenu and plain Restore act on the same item.
+- [x] Extend `many` with `destinationOf`, keeping its `owed`, and keep `restoreBatch`'s `owed` and its `finishOwed` argument as they stand. Remove `notifyReport`'s import from `browser.ts`, since its only use was `:335`.
 
 **AFTER**
 
@@ -1059 +1285 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Bundles Core/Settings Core/Archive` is green, with each rewritten case red before its change.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Bundles Core/Settings Core/Archive` is green, with each rewritten case red before its change.
+- [x] Check for unnecessary code or mistakes.
 
 #### Review Checkpoint
 
-- [ ] Gates are clean.
-- [ ] A checked inner row survives a refresh while its parent stays open.
-- [ ] Closing a parent forgets its open descendants but keeps their checks, and a late reply doesn't reopen a closed row.
-- [ ] A covered batch acts once per item, and `spendUndo` keys on each row's own address.
+- [x] Gates are clean.
+- [x] A checked inner row survives a refresh while its parent stays open.
+- [x] Closing a parent forgets its open descendants but keeps their checks, and a late reply doesn't reopen a closed row.
+- [x] A covered batch acts once per item, and `spendUndo` keys on each row's own address.
 
 ---
 
 ### Phase 5 — Both Skins
 
-**GOAL:** The Trash frame and ArchiveView draw the tree.
-- **Indent:** inner rows step in from each skin's own lead.
-- **Chevron:** it sits right of the label.
-- **Clicks:** every click goes through `rowClick`.
-- **Reader:** an Archive page's double-click opens it.
+**GOAL:** The Trash frame and ArchiveView draw the tree in TableView's row look.
+- **Indent:** each depth steps a row's icon right by `rowIndent`, TableView's own step.
+- **Chevron:** right of the label on a top-level row, left of the icon on a nested row, muted from one table rule.
+- **Row Look:** container rows take the Set band's emphasized title; page rows take TableView's page row.
+- **Clicks:** every click goes through `rowClick`, and Archive rows take the keyboard.
+- **Reader:** an Archive page's double-click opens it through `rowClick`.
 
 #### Task 5-1
 
@@ -1087 +1314 @@ A whole bundle still re-mints under its own name, as it does today.
 
 **CHANGE**
 
-- [ ] Add `UIX/Menus/MenuRows.test.tsx` and watch its case fail: `titleAccessory` renders after the title text on one line, and is absent from the DOM when not given.
-- [ ] Add the prop and `titleLine`, building the title span once.
+- [x] Add `UIX/Menus/MenuRows.test.tsx` and watch its case fail: `titleAccessory` renders after the title text on one line, and is absent from the DOM when not given.
+- [x] Add the prop and `titleLine`, building the title span once. `titleLine` sets its parts a table's icon gap apart, and is the positioned box a nested chevron's rail slot sits against.
 
 **AFTER**
 
@@ -1115 +1342 @@ A whole bundle still re-mints under its own name, as it does today.
 
 ```UIX/Menus/menu-row.css.ts diff
 +export const titleLine = style({
++  position: 'relative',
 +  display: 'flex',
 +  alignItems: 'center',
-+  gap: '4px', // KNOB
++  gap: 'var(--cell-icon-gap, 6px)',
++  minWidth: 0,
 +})
 ```
 
 **VERIFY**
 
-- [ ] `npx vitest run UIX/Menus` is green.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run UIX/Menus` is green.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 5-2
 
 **TASK:** ArchiveView draws the tree:
-- each row is indented by its depth;
-- the chevron follows the title;
-- every click goes through `rowClick`;
-- a page's double-click opens the reader, with a trail through each row above it.
+- each row's title line steps in by `rowIndent(depth)`;
+- a top-level Set's chevron follows its title, and a nested Set's sits in the rail slot left of its icon;
+- a Set's title is emphasized, as a TableView Set band's is;
+- every click goes through `rowClick`, and a row takes the keyboard as a button;
+- a page's double-click opens the reader through `rowClick`, with a trail through each row above it.
 
-**NOW:** The title span's single click opens a page (`ArchiveView.tsx:210-224`), and a row's click checks it (`:190-195`).
+**NOW:** The title span's single click opens a page (`ArchiveView.tsx:210-224`), and a row's click checks it (`:190-195`). TableView indents through a local `groupIndent` (`TableView.tsx:263`).
 
 **CHANGE**
 
-- [ ] Rewrite these cases and watch them fail:
+- [x] Rewrite these cases and watch them fail:
+  - **`:359`:** the mixed batch's homeless row is a disclosed inner page.
   - **`:159`:** a page row's click checks it, and its double-click opens the reader with the row checked, whether or not it started checked. The test sends the real click sequence (`detail` 1, then 2, then `dblclick`). For an inner page, the reader's trail is its row's trail, then the page.
   - **`:174`:** a Set row's click discloses its inner rows beneath it, indented, with the chevron open. A second click folds them, and a double-click leaves them open.
-- [ ] Add these cases:
+  - **`:470`:** a batch restore closes a reader opened by a page's double-click.
+- [x] Add these cases:
+  - an Enter on a focused Set row discloses it, and its box checks it without disclosing;
+  - a double-click on a page's box opens nothing;
+  - a top-level Set's chevron follows its title, a nested Set's comes before its icon, and a Set's title carries `text.body.emphasized` where a page's doesn't;
+  - a click on a Set's chevron discloses it, as a click on its row does;
   - a checked Set and its checked page restore once, as the Set;
   - an inner row shows its trail: its bundle's trail, then the containers inside the bundle;
-  - the published count stays the count of top rows.
-- [ ] Edit `ArchiveRow` and `archive-view.css` as below.
+  - the published count stays the count of top rows;
+  - a batch restore closes a reader open on an inner page.
+- [x] Give `useBundleBrowser` an optional `open`, which `rowClick` calls on a page's `detail === 2` (Task 4-1). ArchiveView passes its reader open there.
+- [x] Hoist TableView's `groupIndent` to `UIX/Table/rowIndent.ts` as `rowIndent`, and import it in TableView and both skins.
+- [x] Add to `UIX/Table/table.css`, beside `.cell-title`, the one muted color for a table's chevron. GroupBand's own `.group-band-drop-outline` color stays, since CardsView's bands sit outside `.table`.
+- [x] Move TableView's rail-slot rule from `table-view.css` into `UIX/Table/table.css` as `.row-grip, .row-check, .table .row-chevron`, with GroupBand's chevron wearing `row-chevron`, so a nested container's chevron takes the slot a band's chevron, a grip, and a check take.
+- [x] Edit `ArchiveRow` and `archive-view.css` as below.
   - **`ArchiveRow`:** it keeps `memo` by taking `depth` and `open` as primitives.
-  - **`api.open(row)`:** stays as it is at HEAD. An inner row's `crumbs` already hold the bundle's trail and the containers inside it, so `crumbSegments(row.crumbs)` plus the page itself is the reader's trail for every row.
+  - **The Reader:** `open` keeps HEAD's body. An inner row's `crumbs` already hold the bundle's trail and the containers inside it, so `crumbSegments(row.crumbs)` plus the page itself is the reader's trail for every row.
   - **The Chevron:** it is `DropOutline` without `onToggle`, since the row's click is the toggle, as GroupBand's is.
+  - **The Title Line:** `titleLine` holds the title and its chevron a table's icon gap apart, and is the box a nested chevron's rail slot sits against.
 
 **AFTER**
 
 ```Core/Archive/ArchiveView.tsx diff
+@@ ArchiveView @@
++  const open = (row: BundleRow): void => {
++    const stored = row.stored
++    if (!stored) return
++    openReader({ … })
++  }
+   const browser = useBundleBrowser(
+     { kind: 'archive', id: archiveId },
+-    { query, shown, within: owner.kind === 'set' ? owner.id : undefined },
++    { query, shown, within: owner.kind === 'set' ? owner.id : undefined, open },
+   )
 @@ ArchiveRow @@
++  const chevron = open === null ? null : <DropOutline open={open} />
+   return (
 -    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click anywhere on a row checks it, as a Trash row does; the box in its gutter is the keyboard's door
-+    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a Set's click discloses it and a page's checks it, as a Trash row's do, and a page's double-click opens it; the box in its gutter is the keyboard's door
++    // biome-ignore lint/a11y/useSemanticElements: a real <button> can't host a .data-row, nor the checkbox's own button inside it
      <div
        className={cx('data-row', lead && 'row-lead')}
        data-reveal-host={revealed ? 'on' : ''}
--      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
+       style={{ height: ROW_H, transform: `translateY(${start}px)` }}
 -      onClick={() => api.toggle(row)}
-+      style={{ height: ROW_H, transform: `translateY(${start}px)`, '--depth': depth } as React.CSSProperties}
++      role="button"
++      tabIndex={0}
 +      onClick={(e) => api.rowClick(row, e.detail)}
-+      onDoubleClick={row.kind === 'page' ? () => api.open(row) : undefined}
++      onKeyDown={onActivateClick}
  …
 -        {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a page's title is the pointer's door to the reader; a Set's opens nothing and its click checks the row */}
 -        <span
 -          className={cx(overScrollLabel, 'cell-title')}
--          onClick={
--            row.kind === 'page'
--              ? (e) => {
--                  e.stopPropagation()
--                  api.open(row)
--                }
--              : undefined
--          }
+-          onClick={…}
 -        >
-+        <span className={cx(overScrollLabel, 'cell-title')}>
-           <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
-           <span className="cell-title-text">{row.title}</span>
+-          <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
+-          <span className="cell-title-text">{row.title}</span>
++        <span className={titleLine} style={{ marginLeft: rowIndent(depth) }}>
++          {depth > 0 && chevron && <span className="row-chevron">{chevron}</span>}
++          <span className={cx(overScrollLabel, 'cell-title')}>
++            <Icon name={entityIcon(archivedKind(row), row.icon, icons)} size="body" />
++            <span className={cx('cell-title-text', open !== null && text.body.emphasized)}>
++              {row.title}
++            </span>
++          </span>
++          {depth === 0 && chevron}
          </span>
-+        {open !== null && <DropOutline open={open} />}
 ```
 
 ```Core/Archive/archive-view.css diff
--/* ArchiveView on TableView's sheet: the virtual list, each title with the trail it left at its right, as the Trash's rows carry theirs, and the Archived column. */
-+/* ArchiveView on TableView's sheet: the virtual list, each title indented by its depth with its chevron after it and the trail it left at its right, as the Trash's rows carry theirs, and the Archived column. */
- .archive-rows .cell-title {
+-.archive-rows .cell-title {
 -  flex: 1 1 auto;
 -  min-width: 0;
-+  margin-left: calc(var(--row-indent) * var(--depth, 0));
- }
-+.archive-rows [data-drop-outline] {
-+  color: var(--label-tertiary);
-+}
+-}
  .archive-rows .archive-trail {
    flex: 0 1 auto;
    min-width: 0;
@@ -1203 +1453 @@ A whole bundle still re-mints under its own name, as it does today.
  }
 ```
 
+```UIX/Table/rowIndent.ts
+/** How far a row at `depth` steps in from its lead, by the table's `--row-indent`. */
+export const rowIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`
+```
+
+```UIX/Table/table.css diff
++/* A disclosure chevron in a table is muted. */
++.table [data-drop-outline] {
++  color: var(--label-tertiary);
++}
++/* The rail slot directly left of a row's icon, centering its grip, its check, or a band's or nested row's chevron. */
++.row-grip,
++.row-check,
++.table .row-chevron {
++  position: absolute;
++  left: calc(-1 * var(--rail-inset));
++  width: var(--rail-inset);
++  top: 50%;
++  transform: translateY(-50%);
++  display: inline-flex;
++  align-items: center;
++  justify-content: center;
++}
+```
+
+```Core/Views/Table/table-view.css diff
+-.row-grip,
+-.row-check,
+-.table-view .group-band-drop-outline {
+-  position: absolute;
+-  left: calc(-1 * var(--rail-inset));
+-  width: var(--rail-inset);
+-  top: 50%;
+-  transform: translateY(-50%);
+-  justify-content: center;
+-}
+-.row-grip,
+-.row-check {
+-  display: inline-flex;
+-  align-items: center;
+-}
+```
+
+```Core/Views/Bands/GroupBand.tsx diff
+-            className="group-band-drop-outline"
++            className="group-band-drop-outline row-chevron"
+```
+
 The header docstring at `:41` reads: "A Set discloses what it holds, and a page opens in the reader on a double-click."
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Archive/ArchiveView.test.tsx` is green, with each new or rewritten case red before its change.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Archive/ArchiveView.test.tsx` is green, with each new or rewritten case red before its change.
+- [x] Check for unnecessary code or mistakes.
 
 #### Task 5-3
 
 **TASK:** The Trash frame draws the tree:
-- each inner row is indented from the row's own lead;
-- the chevron sits in `titleAccessory`;
+- each row's lead steps in by `rowIndent(depth)`;
+- a top-level container's chevron sits in `titleAccessory`, and a nested one's sits in the rail slot left of its icon;
+- a container's title is emphasized, as a TableView Set band's is;
 - every click goes through `rowClick`.
 
 **NOW:**
 - **Clicks:** every Trash row's click checks it (`TrashFrame.tsx:171`).
 - **Indent:** MenuItem's `indent` measures from an 8px base, while Trash rows lead by `--row-pad-lead` (24px). Using it would step a depth-1 row left of its parent.
+- **Row Look:** MenuItem's title already draws in `--label-primary` and its leading icon in `--label-secondary`, at the standard weight, as TableView's page row does. Its icon is `headline`-sized where TableView's is `body`, and MenuItem's 8px row gap sets it off its title where TableView uses `--cell-icon-gap`.
 - **Partial Mark:** `trailing` draws the `triangle-alert` "Recorded Partly" icon ahead of the date for a `partial` row (`:154-161`).
 
 **CHANGE**
 
-- [ ] Write these `TrashFrame.test.tsx` cases and watch them fail:
+- [x] Write these `TrashFrame.test.tsx` cases and watch them fail:
   - A Collection row's click discloses its Sets and then its pages, indented, and its checkbox still checks it.
+  - An Enter on a Collection row discloses it.
+  - A top-level Collection's chevron follows its title, a nested Set's comes before its icon, and a container's title carries `text.body.emphasized` where a page's doesn't.
+  - A click on a Collection's chevron discloses it, as a click on its row does.
+  - A page row's double-click leaves it checked and opens nothing.
+  - A row draws its icon at TableView's body size.
   - An inner row's right-click Restore ▸ lists destinations, and its Delete empties only that item.
   - A checked inner row stays checked across a refresh, and across its container collapsing and reopening.
   - An inner row's trail reads its bundle's trail, then the containers inside the bundle.
-- [ ] Have `TrashRowView` take its `TreeRow` whole, and wire it as follows:
-  - `onClick={(e) => rowClick(row, e.detail)}`;
-  - `titleAccessory={open !== null ? <DropOutline open={open} /> : undefined}`;
+- [x] Have `TrashRowView` take its `TreeRow` whole, and wire it as follows:
+  - `onClick={(e) => onClick(e.detail)}`, which calls `rowClick(tree.row, detail)`;
+  - `titleAccessory={depth === 0 ? chevron : null}`;
+  - the title is wrapped in `text.body.emphasized` for a container;
   - `trailing` keeps the partial icon and the date as they stand;
-  - wrap the leading icon in `<span className="trash-lead" style={{ '--depth': depth }}>`.
-- [ ] Add to `trash-frame.css`:
-  - `.trash-lead { display: flex; margin-left: calc(var(--disclosure-indent) * var(--depth, 0)); }`
-  - `.trash-row [data-drop-outline] { color: var(--label-tertiary); }`
-- [ ] The overlay checkbox stays in the row's gutter, as ArchiveView's `.row-check` does in its own.
+  - the leading icon sits in `<span className="trash-lead" style={{ marginLeft: rowIndent(depth) }}>`, with a nested container's chevron before it in a `.row-chevron` slot;
+  - the icon is computed in the row, from the `row` and `defaultIcons` it already takes, and drawn at `size="body"`, as TableView's is.
+- [x] Add to `trash-frame.css`:
+  - `.trash-lead { position: relative; display: flex; }`, the box a nested chevron's rail slot sits against;
+  - `gap: var(--cell-icon-gap)` on `.trash-frame .trash-row`, TableView's icon-to-title gap.
+- [x] The overlay checkbox stays in the row's gutter, as ArchiveView's `.row-check` does in its own.
 
 **VERIFY**
 
-- [ ] `npx vitest run Core/Settings/TrashFrame.test.tsx` is green, and gates are clean.
-- [ ] Check for unnecessary code or mistakes.
+- [x] `npx vitest run Core/Settings/TrashFrame.test.tsx` is green, and gates are clean.
+- [x] Check for unnecessary code or mistakes.
 
 #### Review Checkpoint
 
-- [ ] Gates are clean.
-- [ ] Both skins take every behavior from `browser.ts`, and neither re-implements disclosure, coverage, or click intent.
-- [ ] In both skins, the chevron sits right of the label, an inner row's checkbox stays in its skin's gutter column, and each depth steps right by `--disclosure-indent`.
+- [x] Gates are clean.
+- [x] Both skins take every behavior from `browser.ts`, and neither re-implements disclosure, coverage, click intent, or the reader's open.
+- [x] In both skins, the chevron sits right of the label on a top-level row and left of the icon on a nested row, in the table's one muted color; an inner row's checkbox stays in its skin's gutter column; each depth steps right by `rowIndent`; and container and page rows take TableView's weight and colors.
 
 ---
 
-### Phase 6 — Documents, Drive, and the Live Pass
+### Phase 6 — One Table Row
 
-**GOAL:** The living documents describe what now exists, the Archive Drive covers disclosure and re-nesting, and the feature is driven end to end over CDP.
+**GOAL:** Both skins draw one bundle table, under each skin's own heading.
+- **Rows:** in TableView's look, on TableView's list keyboard.
+- **The Trash:** its rows leave MenuItem for the Archive's table row, with its checkbox gutter, full-width lines, square hover, and date cell. Its heading keeps its look, and a narrow window scrolls it sideways.
+- **The Kit:** Space acts as Enter in every list that can't be dragged, and what only the Trash's MenuItem rows needed leaves it.
+
+It's a phase of its own because it reshapes the kit's list keyboard and both skins' shells, apart from the tree the earlier phases built.
 
 #### Task 6-1
 
+**TASK:** In every kit list, Space lifts what can move and otherwise acts as Enter, and a press that can't become a drag stays a click; a virtual list keeps the row focus last stood on drawn, with its neighbours; and a checkbox can leave the Tab order.
+
+**NOW:**
+- **Space in a Line List:** `useLineRow`'s Space always calls `api.liftKeyboard` (`UIX/Interactions/engine.tsx:1367`), which answers nothing. `lift` refuses a keyboard lift where the list's snap is null (`:684`), so Space does nothing there. These lists' Space now opens instead:
+  - a NavList that can't reorder;
+  - TableView's rows under a sort (`Core/Views/Host/useViewInteractions.tsx:342`, `locked: dragDisabled`);
+  - GroupBand heads in a locked band zone;
+  - `MatrixLabel`, whose zone only carries;
+  - ViewFrame's and PropertyFrame's rows while locked;
+  - the bundle table.
+- **Space in a Sortable List:** `useDragItem`'s Space lifts unless its zone is `disabled` (`:1300-1306`), where it does nothing, as on a frozen NavGallery (`Core/Navigation/NavGallery.tsx:45`).
+- **Callers:** both reach `liftKeyboard` only while no session holds (`heldWhileBusy`), and `lift` reads before it refuses, setting nothing.
+- **Focus in a Virtual List:** `useVirtualRows` (`UIX/Interactions/virtualRows.ts`) draws only the window in view and its overscan. A removed element takes its focus with it and fires no blur, as Chromium does (checked live). So a line list whose focused row scrolls out of the window drops focus to the page and keeps its host out of the Tab order: a row's focus sets the host aside (`engine.tsx:1244`), and only a blur gives it back (`:1258-1261`). No line list virtualizes yet; the bundle table is the first.
+- **A Refused Drag:** `beginPointerGesture` marks a press active before asking `onActivate` (`UIX/Interactions/gesture.ts:152`), so a refusal cancels it as a drag and swallows the release's click. A press that drifts 5px in a locked list loses its click, as on a sorted TableView title today; the bundle rows carry the same gesture.
+- **Checkbox:** `Checkbox` (`UIX/Controls/Checkbox.tsx`) draws a `<button>`, always a Tab stop.
+
+**CHANGE**
+
+- [x] In `engine.test.tsx`, make these case changes and watch each fail:
+  - Extend "refuses a lift with no snapshot and nothing to carry" (`:1056`) with `rowOpts = { r1: { open } }`: Space on `r1` runs `open` once and lifts nothing.
+  - Rewrite "never lifts in a disabled zone, and leaves the tab order only with nothing to open" (`:648`): the openable item's Space runs `onOpen` once and lifts nothing, and its Enter runs it again.
+- [x] Add `UIX/Interactions/virtualRows.test.tsx` and watch it fail: with `keep` at an index past the drawn window, that index is among `rows`, in order, and without `keep` it isn't.
+- [x] `liftKeyboard` answers whether it lifted. In `useLineRow` and `useDragItem`, Space acts as Enter where it didn't.
+- [x] `useVirtualRows` takes `keep`, an index drawn wherever it sits with its neighbours, so the arrows step from it after scrolling away. `virtualRows.test.tsx` asserts the neighbours, and the order with a kept row above the window.
+- [x] A refused activation ends the gesture as a tap: a `gesture.test.ts` case, red first, has a refused, drifting press still click.
+- [x] `Checkbox` takes `tabIndex` onto its button.
+
+**AFTER**
+
+```UIX/Interactions/engine.tsx diff
+@@ Api @@
+-  liftKeyboard: (zoneId: string, id: string) => void
++  liftKeyboard: (zoneId: string, id: string) => boolean
+@@ liftKeyboard @@
+-  const liftKeyboard = (zoneId: string, id: string): void => {
+-    if (session?.phase === 'live') return
++  const liftKeyboard = (zoneId: string, id: string): boolean => {
++    if (session?.phase === 'live') return false
+     pending?.()
+     const s = lift(zoneId, id, 'keyboard')
+-    if (!s) return
++    if (!s) return false
+ …
+       outside.release()
+     }
++    return true
+   }
+@@ useDragItem @@
+       onKeyDown: (e: ReactKeyboardEvent) => {
+         if (e.target !== e.currentTarget || e.repeat || heldWhileBusy(api, e)) return
+-        if (e.key === 'Enter' && opens) {
+-          e.preventDefault()
+-          run.current?.()
+-        } else if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
+-          e.preventDefault()
+-          api.liftKeyboard(zoneId, id)
+-        }
++        if (e.key !== ' ' && e.key !== 'Enter') return
++        e.preventDefault()
++        if ((e.key === 'Enter' && opens) || !api.liftKeyboard(zoneId, id)) run.current?.()
+       },
+@@ LineRowOptions @@
+-type LineRowOptions = { spring?: (dragged: string) => void; open?: () => void }
++type LineRowOptions = {
++  spring?: (dragged: string) => void
++  open?: () => void
++  /** Space where the row can't lift, in place of `open`. */
++  space?: () => void
++}
+@@ useLineRow @@
+~  { spring, open, space }: LineRowOptions = {},
+ …
+   const run = useLatest(open)
++  const runSpace = useLatest(space)
+ …
+         if (opening) run.current?.()
+         else if (step !== 0) api.focusRow(zoneId, row, step)
+-        else if (!e.repeat) api.liftKeyboard(zoneId, id)
++        else if (!e.repeat && !api.liftKeyboard(zoneId, id)) (runSpace.current ?? run.current)?.()
+@@ LineRow @@
+~  space,
+ …
+~  const { ref, handle } = useLineRow(id, { spring, open, space })
+```
+
+```UIX/Interactions/virtualRows.ts diff
+-import { useVirtualizer } from '@tanstack/react-virtual'
++import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
+
+-/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top. `deps` re-measure where the list sits whenever what lies above it changes. */
++/** The one seam over the virtualizer: fixed-height rows of a list inside a scroll root, each `start` measured from the list's own top, and the row at `keep` drawn wherever it sits, with its neighbours, so the row focus last stood on outlives scrolling out of view and the arrows still step from it, since a removed element takes its focus with it. `deps` re-measure where the list sits whenever what lies above it changes. */
+ export function useVirtualRows(
+   {
+     count,
+     rowHeight,
+     listEl,
+     scrollEl,
+-  }: { count: number; rowHeight: number; listEl: HTMLElement | null; scrollEl: HTMLElement | null },
++    keep = null,
++  }: {
++    count: number
++    rowHeight: number
++    listEl: HTMLElement | null
++    scrollEl: HTMLElement | null
++    keep?: number | null
++  },
+ …
+     overscan: 6,
+     scrollMargin: margin,
++    rangeExtractor: (range) => {
++      const drawn = defaultRangeExtractor(range)
++      if (keep === null) return drawn
++      const kept = [keep - 1, keep, keep + 1].filter((i) => i >= 0 && i < count)
++      if (kept.every((i) => drawn.includes(i))) return drawn
++      return [...new Set([...drawn, ...kept])].sort((a, b) => a - b)
++    },
+   })
+```
+
+```UIX/Interactions/gesture.ts diff
+@@ move @@
+           if (ok === false) {
++            g.active = false
+             g.handlers.cancel()
+             return
+           }
+```
+
+```UIX/Controls/Checkbox.tsx diff
+   readOnly,
++  tabIndex,
+ }: {
+ …
+   readOnly?: boolean
++  tabIndex?: number
+ }): React.JSX.Element {
+ …
+       className={cls}
+       style={style}
++      tabIndex={tabIndex}
+```
+
+**VERIFY**
+
+- [x] `npx vitest run UIX/Interactions UIX/Controls` is green, with each changed case red before its change.
+- [x] Check for unnecessary code or mistakes.
+
+#### Task 6-2
+
+**TASK:** `DateHeading.tsx` becomes `BundleTable.tsx`, the table both skins draw: its grid, its date heading, and its rows. ArchiveView draws on it.
+
+**NOW:**
+- **ArchiveView:** draws its own memoized `ArchiveRow` (`ArchiveView.tsx:177-244`).
+  - It's a `role="button"` row under a `useSemanticElements` suppression, and Enter or Space clicks it through `onActivateClick`.
+  - A ctrl-click both opens its menu and runs its click, where TableView's cells bail on `isSecondaryClick` (`TableView.tsx:104`).
+  - It virtualizes with `useVirtualRows` and a 30px `ROW_H` (`:37`), where TableView's row measures about 29.75px live.
+  - Its grid is written inline (`:70-74`, `:125-128`) with no minimum width, so in a pane narrower than its tracks the rows' lines and hover stop short of the date cell.
+- **The Trash:** `TrashRowView` derives its own icon, and it alone covers property rows (`TrashFrame.tsx:136-141`). Its partial mark is the Trash's alone, though an archived item's record can be partial too (`Core/Bundles/record.ts:61-96`).
+- **DateHeading:** takes the rows' type as `sampleClass`.
+- **The Lead Cell:** its seat for the rail slot, `.data-cell.cell-lead`, lives in TableView's own layer (`table-view.css:39-42`). Every table row with a rail slot needs it, while the rail slot itself already sits in `table.css`.
+- **Tests:** `ArchiveView.test.tsx:22-31` stands in for the virtualizer inline.
+
+**CHANGE**
+
+- [x] Move `Core/Bundles/DateHeading.tsx` to `Core/Bundles/BundleTable.tsx` with `git mv`.
+- [x] Move ArchiveView.test's stand-in into `Core/Testing/virtualRows.ts`, mocked with `vi.mock('@pommora/uix/Interactions/virtualRows', () => import('../Testing/virtualRows'))`. Prove it on `ArchiveView.test.tsx` first.
+- [x] Write `Core/Bundles/BundleTable.test.tsx` and watch it fail. It renders `BundleRows` over a browser of `vi.fn()`s and `bundleRow` rows, and wraps the stand-in in `vi.fn` to read what the virtualizer is asked. Its cases:
+  - a top-level container's chevron follows its title, a nested one's sits in the `.row-chevron` slot before its icon, and a container's title carries `text.body.emphasized` where a page's doesn't;
+  - each row's icon draws at TableView's body size: an item's own ahead of its kind's, and a property's by its type;
+  - a partly recorded row shows its mark, spoken as Recorded Partly, and a whole one shows none;
+  - a click anywhere on a row, its chevron included, hands `rowClick` its row and `detail`; a ctrl-click hands it nothing; a right-click opens the row's menu;
+  - a container row is a `treeitem` whose `aria-expanded` follows its disclosure, and a page row is one without it;
+  - the rows are one Tab stop: focusing the zone focuses the first row, ArrowDown the next, and Enter, then Space, each hand `rowClick` the focused row with `detail` 1;
+  - a focused row is the one the virtualizer keeps drawn;
+  - a row's box checks it without the row's click, and takes `tabIndex` -1;
+  - every row's box shows while any row is checked (`data-reveal-host="on"`).
+- [x] Write `BundleTable.tsx` and `bundle-table.css` as below.
+- [x] Move `.data-cell.cell-lead`, `.row-rail`, and the grip's reveal fade from `table-view.css` into `table.css`, the fade now the check's too. TableView's inline rail becomes `RowRail`, which the bundle row draws too, so a hidden box reveals as the pointer reaches it from outside the row.
+- [x] ArchiveView draws on the table, its rows only while it has some, as the Trash's do, so an empty Archive keeps no empty Tab stop. `ArchiveRow`, `RowApi`, `ROW_H`, its grid's derivation, its virtual list, and the imports only they used leave; `archivedKind` keeps no outside caller and loses its export. TrashFrame takes `DateHeading` from `BundleTable` and drops `sampleClass`.
+- [x] In `ArchiveView.test.tsx`:
+  - Mock through `virtualRows.ts`.
+  - Drop the cases `BundleTable.test.tsx` now holds: `:256` (an Enter on a Set row, and its box), `:285` (the chevrons and the emphasized title), and `:300` (a click on the chevron).
+  - Rewrite `.archive-rows` to `.bundle-rows` and `.data-cell.archive-date` (`:193`) to `.bundle-date`.
+
+**AFTER**
+
+```Core/Bundles/BundleTable.tsx
+import { memo, type ReactNode, useMemo, useState } from 'react'
+import { Checkbox } from '@pommora/uix/Controls/Checkbox'
+import { NavTrail } from '@pommora/uix/Elements/NavTrail'
+import { historical } from '@pommora/uix/Elements/nav-trail.css'
+import { isSecondaryClick } from '@pommora/uix/Interactions/chords'
+import { LineRow, LineZone, lineList } from '@pommora/uix/Interactions/drag'
+import { revealTarget } from '@pommora/uix/Interactions/hover-reveal.css'
+import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
+import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
+import { DropOutline } from '@pommora/uix/Menus'
+import { Icon } from '@pommora/uix/Symbols'
+import { RowRail } from '@pommora/uix/Table/RowRail'
+import { rowIndent } from '@pommora/uix/Table/rowIndent'
+import { text } from '@pommora/uix/Theme'
+import { cx } from '@pommora/uix/Utilities/cx'
+import { useStableApi } from '@pommora/uix/Utilities/stableApi'
+import { entityIcon } from '../Assets/entityIconPolicy'
+import { propertyTypeIconName } from '../Properties/typeDisplay'
+import { personalizationOf } from '../Session/configSlice'
+import { useSession } from '../Session/store'
+import type { Personalization } from '../Settings/personalization'
+import { COLUMN_LAYOUT } from '../Views/Table/useColumns'
+import { crumbSegments, type useBundleBrowser } from './browser'
+import type { BundleRow } from './rows'
+import './bundle-table.css'
+
+type Browser = ReturnType<typeof useBundleBrowser>
+
+/** TableView's row as it draws, measured live: the cell's padding around a body line its inline title stands a little taller than, and the hairline between rows. */
+const ROW_H = 29.75
+
+/** The table's grid in its body type, each skin setting its own heading and rows in it: the title track, at least TableView's title width, and the date track, the date column's measured width inside the cell's padding; narrower than both, it scrolls sideways. */
+export function BundleTable({
+  date: { width },
+  children,
+}: {
+  date: Browser['date']
+  children: ReactNode
+}): React.JSX.Element {
+  const track =
+    width === null
+      ? `${COLUMN_LAYOUT.dateTime.width}px`
+      : `calc(${width}px + 2 * var(--cell-padding-x))`
+  const style = {
+    '--cols': `minmax(${COLUMN_LAYOUT.title.width}px, 1fr) ${track}`,
+    minWidth: `calc(${COLUMN_LAYOUT.title.width}px + ${track})`,
+  } as React.CSSProperties
+  return (
+    <div className={cx('table-grid', text.body.standard)} style={style}>
+      {children}
+    </div>
+  )
+}
+
+/** A store's date heading: `label` over the column's widest date, drawn unseen in the rows' type, so the column measures whichever is wider; a right-click picks the date's style. */
+export function DateHeading({
+  date,
+  label,
+  className,
+}: {
+  date: Browser['date']
+  label: ReactNode
+  className: string
+}): React.JSX.Element {
+  return (
+    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a column label, as TableView's headings are
+    <div className={cx('col-header', className)} onContextMenu={date.onContextMenu}>
+      <span ref={date.measureRef} className="col-measure">
+        {label}
+        <span className={text.body.standard} aria-hidden>
+          {date.sample}
+        </span>
+      </span>
+    </div>
+  )
+}
+
+type RowApi = Pick<Browser, 'toggle' | 'rowClick' | 'openMenu'> & {
+  focus: (address: string) => void
+}
+
+/** A store's rows under its skin's heading, drawn in a window of `scrollEl` that keeps the row focus last stood on: one Tab stop whose arrows step between rows, whose Space toggles a row's check and whose Enter acts as a keyboard's click, each row a tree item that discloses, checks, and opens through the browser. */
+export function BundleRows({
+  browser: { visible, checked, picked, date, toggle, rowClick, openMenu },
+  scrollEl,
+}: {
+  browser: Pick<
+    Browser,
+    'visible' | 'checked' | 'picked' | 'date' | 'toggle' | 'rowClick' | 'openMenu'
+  >
+  scrollEl: HTMLElement | null
+}): React.JSX.Element {
+  const icons = useSession((s) => personalizationOf(s).defaultIcons)
+  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
+  const [focused, setFocused] = useState<string | null>(null)
+  const keep = useMemo(() => {
+    const at = visible.findIndex((t) => t.row.bundlePath === focused)
+    return at < 0 ? null : at
+  }, [visible, focused])
+  const { rows: slots, height } = useVirtualRows(
+    { count: visible.length, rowHeight: ROW_H, listEl, scrollEl, keep },
+    [],
+  )
+  const api = useStableApi({ toggle, rowClick, openMenu, focus: setFocused })
+  return (
+    <LineZone {...lineList({ locked: true, commit: () => {}, label: () => '', watch: [] })}>
+      <div ref={setListEl} className="bundle-rows" style={{ height }}>
+        {slots.map(({ index, start }) => {
+          const { row, depth, open } = visible[index]
+          return (
+            <BundleRowView
+              key={row.bundlePath}
+              row={row}
+              depth={depth}
+              open={open}
+              start={start}
+              lead={index === 0}
+              checked={checked.has(row.bundlePath)}
+              revealed={picked.length > 0}
+              when={date.when(row.storedAt)}
+              icons={icons}
+              api={api}
+            />
+          )
+        })}
+      </div>
+    </LineZone>
+  )
+}
+
+/** A row's glyph: a property's by its type, any other item's own ahead of its kind's. */
+const rowIcon = (row: BundleRow, icons: Personalization['defaultIcons']): string =>
+  row.kind === 'property'
+    ? row.propertyType
+      ? propertyTypeIconName(row.propertyType)
+      : 'tag'
+    : entityIcon(row.kind, row.icon, icons)
+
+const BundleRowView = memo(function BundleRowView({
+  row,
+  depth,
+  open,
+  start,
+  lead,
+  checked,
+  revealed,
+  when,
+  icons,
+  api,
+}: {
+  row: BundleRow
+  depth: number
+  open: boolean | null
+  start: number
+  lead: boolean
+  checked: boolean
+  revealed: boolean
+  when: string
+  icons: Personalization['defaultIcons']
+  api: RowApi
+}): React.JSX.Element {
+  const chevron = open === null ? null : <DropOutline open={open} />
+  return (
+    <LineRow
+      id={row.bundlePath}
+      open={() => api.rowClick(row, 0)}
+      space={() => api.toggle(row.bundlePath)}
+      className={cx('data-row', lead && 'row-lead')}
+      data-reveal-host={revealed ? 'on' : ''}
+      style={{ height: ROW_H, transform: `translateY(${start}px)` }}
+      role="treeitem"
+      aria-expanded={open ?? undefined}
+      onFocus={() => api.focus(row.bundlePath)}
+      onClick={(e) => {
+        if (!isSecondaryClick(e)) api.rowClick(row, e.detail)
+      }}
+      onContextMenu={(e) => {
+        e.preventDefault()
+        void api.openMenu(row)
+      }}
+    >
+      <div className="data-cell cell-lead">
+        <RowRail />
+        <span className={cx('row-check', revealTarget)}>
+          <Checkbox
+            size="compact"
+            state={checked}
+            tabIndex={-1}
+            onChange={() => api.toggle(row.bundlePath)}
+            ariaLabel={`Select ${row.title}`}
+          />
+        </span>
+        <span className="bundle-title" style={{ marginLeft: rowIndent(depth) }}>
+          {depth > 0 && chevron && <span className="row-chevron">{chevron}</span>}
+          <span className={cx(overScrollLabel, 'cell-title')}>
+            <Icon name={rowIcon(row, icons)} size="body" />
+            <span className={cx('cell-title-text', open !== null && text.body.emphasized)}>
+              {row.title}
+            </span>
+          </span>
+          {depth === 0 && chevron}
+        </span>
+        <NavTrail
+          segments={crumbSegments(row.crumbs, icons)}
+          iconSize="control"
+          className={cx('bundle-trail', row.historical && historical)}
+        />
+        {row.partial && (
+          <Icon
+            name="triangle-alert"
+            size="body"
+            role="img"
+            aria-label="Recorded Partly"
+            className="bundle-partial"
+          />
+        )}
+      </div>
+      <div className="data-cell bundle-date">{when}</div>
+    </LineRow>
+  )
+})
+```
+
+```Core/Bundles/bundle-table.css
+/* The bundle table's own layout over the table vocabulary: its rows in a virtual window, each title line with its chevron, the trail it left at its right, its partial mark, and its date centered in its column. */
+.bundle-rows {
+  position: relative;
+}
+.bundle-rows > .data-row {
+  position: absolute;
+  inset-inline: 0;
+}
+.bundle-rows .data-cell {
+  display: flex;
+  align-items: center;
+  gap: 8px; /* KNOB — the title from its trail */
+}
+/* The box a nested row's chevron takes its rail slot against; it pushes the trail and the partial mark to the cell's end. */
+.bundle-title {
+  position: relative;
+  display: flex;
+  align-items: center;
+  gap: var(--cell-icon-gap);
+  min-width: 0;
+  margin-right: auto;
+}
+.bundle-trail {
+  flex: 0 1 auto;
+  min-width: 0;
+  max-width: 55%;
+}
+.bundle-partial {
+  flex: none;
+  color: var(--label-secondary);
+}
+.bundle-date {
+  justify-content: center;
+}
+```
+
+```UIX/Table/table.css diff
+ .data-cell {
+   …
+ }
++/* The lead cell seats its row's rail slot in the gutter beside it. */
++.data-cell.cell-lead {
++  position: relative;
++  overflow: visible;
++}
+ …
++.row-rail {
++  position: absolute;
++  top: 0;
++  bottom: 0;
++  left: calc(-1 * var(--rail-inset));
++  width: var(--rail-inset);
++}
++.row-grip,
++.row-check {
++  transition: opacity var(--reveal-fade) var(--ease-base);
++}
+```
+
+```UIX/Table/RowRail.tsx
+/** The gutter beside a row's lead cell, drawn as part of the row so a hover arriving straight at its rail slot reveals what sits there; a press, click, or right-click on it reaches nothing. */
+export function RowRail(): React.JSX.Element {
+  return (
+    <span
+      className="row-rail"
+      aria-hidden="true"
+      onPointerDown={(e) => e.stopPropagation()}
+      onClick={(e) => e.stopPropagation()}
+      onContextMenu={(e) => e.stopPropagation()}
+    />
+  )
+}
+```
+
+TableView's `DataRow` renders `<RowRail />` in place of its inline span.
+
+```Core/Views/Table/table-view.css diff
+-/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip and check, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
++/* The layer TableView and ArchiveView wear over the Tables chrome: shell width, grid density, hide/slide beat, the rail gutter's grip, and group-band rhythm. Values live in UIX/Table/table-tokens.css. */
+ …
+-.data-cell.cell-lead {
+-  position: relative;
+-  overflow: visible;
+-}
+ …
+-  transition: opacity var(--reveal-fade) var(--ease-base);
+ …
+-.row-rail {
+-  position: absolute;
+-  top: 0;
+-  bottom: 0;
+-  left: calc(-1 * var(--rail-inset));
+-  width: var(--rail-inset);
+-}
+```
+
+```Core/Archive/ArchiveView.tsx diff
+@@ ArchiveView @@
+   const { listing, visible } = browser
+-  const dateTrack = …
+-  const cols = `minmax(${COLUMN_LAYOUT.title.width}px, 1fr) ${dateTrack}`
+-
+-  const [listEl, setListEl] = useState<HTMLDivElement | null>(null)
+   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
+-  const { rows: slots, height } = useVirtualRows(…)
+-
+   const api = useStableApi({
+-    toggle: (row: BundleRow) => browser.toggle(row.bundlePath),
+-    rowClick: browser.rowClick,
+-    menu: (row: BundleRow) => void browser.openMenu(row),
+     restore: () => void browser.restore(browser.picked),
+     remove: () => void browser.remove(browser.picked),
+   })
+ …
+       <div className="table table-view">
+-        <div
+-          className={cx('table-grid', text.body.standard)}
+-          style={{ '--cols': cols } as React.CSSProperties}
+-        >
++        <BundleTable date={browser.date}>
+           <div className="table-head">
+ …
+             <DateHeading
+               date={browser.date}
+               className="archive-date"
+-              sampleClass={text.body.standard}
+               label={…}
+             />
+           </div>
+-          <div ref={setListEl} className="archive-rows" style={{ height }}>
+-            {slots.map(…)}
+-          </div>
+-        </div>
++          {visible.length > 0 && <BundleRows browser={browser} scrollEl={scrollEl} />}
++        </BundleTable>
+         {footing()}
+       </div>
+@@ ArchiveRow @@
+-const ArchiveRow = memo(function ArchiveRow(…) { … })
+```
+
+```Core/Archive/archive-view.css
+/* ArchiveView's own heading over the bundle table, its Archived label centered over its column, and its empty line. */
+.col-header.archive-date {
+  text-align: center;
+}
+.archive-empty {
+  padding: var(--cell-padding-y) var(--cell-padding-x);
+  color: var(--label-tertiary);
+}
+```
+
+**VERIFY**
+
+- [x] `npx vitest run Core/Bundles Core/Archive Core/Settings` is green, with each new case red before its change.
+- [x] `npm run typecheck` and `npm run lint` are clean, with no new suppression.
+- [x] Check for unnecessary code or mistakes.
+
+#### Task 6-3
+
+**TASK:** The Trash draws `BundleRows` under its own heading, in a sideways scroller over the checkboxes' gutter, and what only its MenuItem rows used leaves the kit.
+
+**NOW:**
+- **Rows:** `TrashRowView` (`TrashFrame.tsx:117-187`) draws each row as a `MenuItem` with `titleAccessory`, `revealed`, an `overlay` checkbox, and a `.table-divider` bar. Rows don't virtualize.
+- **The Date Lane:** each row's date is caption-sized, in a lane `trash-frame.css` sizes with `--trash-date-lane` and `--trash-date-inset`. The flex heading is sized by the same lane.
+- **The Frame's Tokens:** the frame sets `--cell-padding-x` to `--surface-inset`. It wears `.table.is-clear` (`UIX/Table/table.css:11-15`), the class's only wearer, and draws its own hairline as the heading's `::after`.
+- **Measured Live** at the default 850px window:
+  - the frame is 661px wide;
+  - the heading's File Name glyph sits at 10px, and its hairline runs from 10px to 651px;
+  - row icons sit at 24px, and rows are 28px tall with an 8px radius;
+  - dates are 11px in `--label-secondary`, left-aligned 8px inside a 178px lane.
+
+  At the 620px minimum, the frame is 431px.
+- **The Kit:** `titleAccessory`, MenuItem's title line, `titleLine`, and `revealed` have no caller but the Trash, nor has `.table-divider` (`UIX/Table/table.css:110-124`).
+
+**CHANGE**
+
+- [x] In `TrashFrame.test.tsx`, make these changes and watch the rewritten cases fail:
+  - Mock through `virtualRows.ts`.
+  - Rename `:43` "checks itself through the checkbox in its gutter".
+  - Drop the cases `BundleTable.test.tsx` now holds:
+    - `:81` (body-size icon), `:90` (its own icon), and `:101` (the partial mark);
+    - `:506` (the chevrons and the emphasized title), `:522` (a click on the chevron), and `:544` (an Enter on a Collection row).
+  - Rewrite `.trash-row` to `.data-row`, `.trash-lead` (`indentOf`, `:168`) to `.bundle-title`, and `.trash-trail` (`:593`) to `.bundle-trail`.
+- [x] TrashFrame and `trash-frame.css` as below.
+  - **The Heading:** it takes the table's own heading tokens, an inset divider, and no fill, in place of `is-clear` and its hand-drawn hairline. Its box reaches back over half the gutter to the frame's inset, where the divider and File Name begin as they do today; its first track takes up the extra width, so its column line still meets the rows'. Time Deleted keeps its 8px past that line.
+  - **The Gutter:** the rows' vertical scroller reaches back across the gutter, so the checkboxes aren't clipped.
+  - **The Empty Lines:** they sit below the table, outside its sideways scroller, as ArchiveView's footing does, so they center in the frame.
+  - **What Leaves:** `TrashRowView`, the `.nav-list` wrapper, and the imports only they used. `nav-list.css` stays for `.nav-search-row`.
+- [x] Remove from the kit:
+  - MenuItem's `titleAccessory`, its title line, and `revealed`;
+  - `menu-row.css.ts`'s `titleLine`;
+  - `UIX/Menus/MenuRows.test.tsx`;
+  - `table.css`'s `.table-divider` and `.table.is-clear`.
+
+**AFTER**
+
+```Core/Settings/TrashFrame.tsx
+function TrashBody(): React.JSX.Element {
+  const [query, setQuery] = useState('')
+  const browser = useBundleBrowser({ kind: 'trash' }, { query, shown: true })
+  const { listing, visible, date } = browser
+  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
+
+  const footing = (): React.JSX.Element | null => {
+    switch (listing.status) {
+      case 'loading':
+        return null
+      case 'failed':
+        return (
+          <div className={cx('trash-empty', text.body.standard)}>The trash couldn't be read.</div>
+        )
+      case 'ready':
+        if (visible.length > 0) return null
+        return (
+          <div className={cx('trash-empty', text.body.standard)}>
+            {listing.rows.length === 0 ? 'Trash is empty.' : 'Nothing matches.'}
+          </div>
+        )
+    }
+  }
+
+  return (
+    <div className="trash-frame table">
+      <div className="nav-search-row">
+        <SearchField className={text.body.standard} value={query} onValueChange={setQuery} />
+      </div>
+      <div className="trash-table">
+        <BundleTable date={date}>
+          <div className="trash-head table-head">
+            <span className="trash-head-name col-header">
+              <span className="trash-head-glyph">
+                <Icon name={propertyTypeIconName('title')} size="body" />
+              </span>
+              File Name
+            </span>
+            <DateHeading
+              date={date}
+              className="trash-head-date"
+              label={
+                <span className="trash-head-label">
+                  <Icon name="clock-fading" size="body" />
+                  Time Deleted
+                </span>
+              }
+            />
+          </div>
+          {visible.length > 0 && (
+            <div ref={setScrollEl} className="trash-scroll scroll-fade">
+              <BundleRows browser={browser} scrollEl={scrollEl} />
+            </div>
+          )}
+        </BundleTable>
+      </div>
+      {footing()}
+      <Scrollbar of={scrollEl} />
+    </div>
+  )
+}
+```
+
+```Core/Settings/trash-frame.css
+.trash-frame.table {
+  --heading-fill: none;
+  --heading-divider: var(--width-150) solid var(--border-base);
+  --heading-padding-y: 6px; /* KNOB */
+  flex: 1;
+  min-width: 0;
+  min-height: 0;
+  display: flex;
+  flex-direction: column;
+  padding-top: var(--app-inset);
+}
+
+/* Sideways when the window is narrower than the table's columns, the heading riding with the rows; the leading inset is the checkboxes' gutter. */
+.trash-table {
+  flex: 0 1 auto;
+  min-height: 0;
+  display: flex;
+  flex-direction: column;
+  overflow-x: auto;
+  overflow-y: hidden;
+  padding: 0 var(--surface-inset) 0 var(--rail-inset);
+}
+.trash-table > .table-grid {
+  flex: 0 1 auto;
+  min-height: 0;
+  display: flex;
+  flex-direction: column;
+}
+
+/* The heading keeps its own place: reaching back over the gutter to the frame's inset, where its divider and File Name begin, its first track taking up the width so its column line meets the rows'. */
+.trash-frame .trash-head {
+  flex-shrink: 0;
+  margin-left: calc(var(--surface-inset) - var(--rail-inset));
+}
+.trash-frame .trash-head-name {
+  padding-left: 0;
+}
+.trash-frame .trash-head-date {
+  padding-left: 8px; /* KNOB — clears the column line */
+}
+/* The heading keeps its plain lead, without the bar a table's first heading draws at its gutter. */
+.trash-head .col-header:first-child::before {
+  content: none;
+}
+.trash-frame .trash-head-name,
+.trash-frame .trash-head-date {
+  display: flex;
+  align-items: center;
+}
+.trash-head-glyph {
+  display: flex;
+  margin-right: 8px;
+}
+.trash-frame .trash-head svg {
+  color: var(--label-secondary);
+}
+.trash-head-label {
+  display: flex;
+  align-items: center;
+  gap: 6px;
+}
+
+/* Reaching back across the gutter, so the rows' checkboxes sit inside the scroller that clips them. */
+.trash-scroll {
+  flex: 1;
+  min-height: 0;
+  overflow-y: auto;
+  scrollbar-width: none;
+  margin-left: calc(-1 * var(--rail-inset));
+  padding-left: var(--rail-inset);
+  padding-bottom: 6px;
+}
+
+.trash-empty {
+  flex: 1;
+  display: flex;
+  align-items: center;
+  justify-content: center;
+  color: var(--label-tertiary);
+}
+```
+
+```UIX/Menus/MenuRows.tsx diff
+ type MenuItemProps = {
+   leading?: ReactNode
+-  /** Sits right of the title text on its line, outside the text's ellipsis, as a disclosure's chevron does. */
+-  titleAccessory?: ReactNode
+   subLabel?: ReactNode
+ …
+-  /** Shows every reveal target in the row, as while any row of its list is checked. */
+-  revealed?: boolean
+   indent?: number
+ …
+-  const title = <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
+ …
+-      data-reveal-host={inert ? undefined : revealed ? 'on' : ''}
++      data-reveal-host={inert ? undefined : ''}
+ …
+       <span className={cx(s.titleWrap, centered && s.titleCentered)}>
+-        {titleAccessory == null ? (
+-          title
+-        ) : (
+-          <span className={s.titleLine}>
+-            {title}
+-            {titleAccessory}
+-          </span>
+-        )}
++        <span className={cx(s.titleText, overScrollEllipsis)}>{children}</span>
+```
+
+```UIX/Menus/menu-row.css.ts diff
+-export const titleLine = style({
+-  position: 'relative',
+-  display: 'flex',
+-  alignItems: 'center',
+-  gap: 'var(--cell-icon-gap, 6px)',
+-  minWidth: 0,
+-})
+```
+
+```UIX/Table/table.css diff
+-/* For a heading that already sits under chrome of its own, such as the Trash's inset hairline. */
+-.table.is-clear {
+-  --heading-fill: none;
+-  --heading-divider: none;
+-}
+ …
+ .col-header:not(:last-child)::after,
+-.col-header:first-child::before,
+-.table-divider::after {
++.col-header:first-child::before {
+ …
+-.table-divider {
+-  position: relative;
+-}
+```
+
+**VERIFY**
+
+- [x] `npx vitest run Core/Settings UIX/Menus` is green, with each rewritten case red before its change, and gates are clean.
+- [x] `rg -n "titleAccessory|titleLine|table-divider|is-clear|trash-row|trash-lead|trash-date|trash-trail" Core UIX` finds nothing, and `UIX/Menus/MenuRows.tsx` holds no `revealed`.
+- [x] Check for unnecessary code or mistakes.
+
+#### Task 6-4
+
+**TASK:** The drives, and the Archive Drive's matrix, select the table rows.
+
+**NOW:** These select the rows the phase replaces:
+- `drive-harness.mjs:619` (`trashRowEl`);
+- `reveal-parity/run.mjs:347-356`;
+- `Archive Drive/live-drive.mjs`:
+  - `:291`, `:561`, `:563`, `:597`, and `:645`;
+  - `:1005-1006` and `:1009` (`checkArc`'s `.data-cell.archive-date`);
+  - `:1100`, `:1221`, `:1232`, and `:1271`;
+  - `:1275`, whose virtual-row check counts 30px rows;
+- `Metadata Drive/live-drive.mjs:1499`;
+- `Properties Drive/live-drive.mjs:626`.
+
+`Archive Drive/MATRIX.md:72`, `:79`, `:124`, `:135`, and `:140` describe them. The Trash now draws only the rows in its window, so a lookup by title finds a row only while it's drawn.
+
+**CHANGE**
+
+- [x] `.trash-row` becomes `.trash-frame .data-row`; `.archive-rows` becomes `.bundle-rows`; a row's `.trash-date` or `.data-cell.archive-date` becomes `.bundle-date`; `:1275` counts `29.75 * bulkCount`, rounded.
+- [x] `:597`'s look check reads the new frame:
+  - `.nav-search-row`, then `.trash-table`;
+  - its `.table-grid` holds `.trash-head.table-head` (with `.trash-head-name` and `.trash-head-date`), then `.trash-scroll`'s `.data-row`s.
+- [x] Rewrite the five MATRIX rows to match, in place.
+- [x] If a group's lookup misses a row only because it sits outside the drawn window, that step first steps `.trash-scroll`'s `scrollTop` by its own height until the title is drawn, then looks it up. No other step changes.
+
+**VERIFY**
+
+- [x] `rg -n "trash-row|trash-date\b|archive-rows|archive-trail|data-cell\.archive-date|table-divider" .claude/scripts` finds nothing.
+- [x] The Metadata Drive's group `9` and the Properties Drive's groups `6` and `10` run green against `~/Test`, rebuilt before and after. The Archive Drive runs whole in Task 7-2.
+- [x] Reveal Parity's `trashChecks` records against the new rows:
+  - after `npm run build`, launch from `reveal-parity/` as `record.sh` does: `../editor-parity/launch.sh phase6 <repo> 9446 $PWD/fixtures.mjs`;
+  - its fixtures seed no Trash, so trash one page over CDP first (`window.nexus.ask('mutate', { op: 'delete', path, kind: 'page' })`);
+  - run `node run.mjs phase6 9446 trashChecks`, then stop it with `../editor-parity/stop.sh 9446`.
+
+  Then `reveal-parity/results/phase6.json` and `editor-parity/run/phase6` are deleted.
+
+#### Review Checkpoint
+
+- [x] Gates are clean.
+- [x] Neither skin keeps a row, a grid, or a virtual list of its own; both draw through `BundleTable` and `BundleRows`.
+- [x] **Live, Against TableView:** measured with `tableview.mjs` beside `geom.mjs`, which a fresh session rebuilds in its own scratchpad from this session's `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/ead81f97-58c6-423f-8ef7-94ae95dab7f2/scratchpad/`.
+  - In both skins, rows measure TableView's height, 13px icon, 6px icon-to-title gap, 14px step per depth, chevron in the 20px rail slot, and its weights and colors. The lead row stands about a pixel taller than TableView's, which has no line above it.
+  - The Trash's rows draw the Archive's full-width lines, square hover, 20px gutter, and centered body-size date.
+  - The Trash's heading keeps its names, glyphs, type, and clear fill, and its divider still runs from 10px to the frame's inset. Its File Name glyph still sits at 10px, and Time Deleted 8px past the column line, which meets the rows' column line.
+- [x] **Live, the Keyboard,** in both skins:
+  - one Tab lands in the rows with the focus wash;
+  - the arrows step between rows;
+  - Enter and Space disclose a container and check a page;
+  - Tab leaves without stopping on a checkbox;
+  - a focused row scrolled far out of view keeps focus, and Tab from the search field returns to it.
+- [x] **Live, the Pointer:** with the rows now carrying the engine's pointer gesture, a real double-click on an Archive page opens the reader and leaves the row checked, a press-and-drag on a row moves nothing and still clicks it, and a click on a box, the pointer arriving straight at it, checks without disclosing.
+- [x] **Live, the Width:** at the Settings window's 620px minimum, the Trash scrolls sideways, its heading riding with its rows, its checkboxes whole, and its scrollbar at the frame's edge. An empty Trash centers its line in the window.
+- [x] Screenshots of both skins, at the default and the minimum width, are sent to Nathan.
+
+#### Compaction Checkpoint
+
+---
+
+### Phase 7 — Documents, Drive, and the Live Pass
+
+**GOAL:** The living documents describe what now exists, the Archive Drive covers disclosure and re-nesting, and the feature is driven end to end over CDP.
+
+#### Task 7-1
+
 **TASK:** Rewrite each *§Reconciliation* entry in place, under *§Constraints › Docs*.
 
 **CHANGE**
 
-- [ ] Walk *§Reconciliation*. Each feature-doc entry fixes only the sentence it names, in place and plainly, at its length or shorter, as the user reads it, with no correction language.
-- [ ] Rewrite `IssuesPM.md` I-075 to the shipped `rowClick`:
+- [x] Walk *§Reconciliation*. Each feature-doc entry fixes only the sentence it names, in place and plainly, at its length or shorter, as the user reads it, with no correction language.
+- [x] Rewrite `IssuesPM.md` I-075 to the shipped `rowClick`:
   - `browser.ts` reads `detail`, so its row joins the surface table as a `detail` guard, and the paragraph naming this plan leaves;
   - the Solution counts eleven surfaces with the plan's Task 4-1 dropped, and the footnote's two plan cites give way to `browser.ts`'s `rowClick`.
-- [ ] Add an `IssuesPM.md` entry: a container bundle emptied by pulling out every inner item stays in its store as an empty row. Nathan has said he's unhappy with this and wants it revisited. Run `~/The Studio/.claude/scripts/index-issues/index-issues.py .claude/IssuesPM.md` afterward, which gives the entry its number and recomputes the totals.
+- [x] Add these `IssuesPM.md` entries:
+  - **Emptied Containers:** a container bundle emptied by pulling out every inner item stays in its store as an empty row. Nathan has said he's unhappy with this and wants it revisited.
+  - **Drag Instructions on Rows That Can't Move:** every line row points screen readers at the drag instructions ("press space to pick it up"), though in a list that can't be dragged Space now opens the row. Describing only rows that can lift needs the zone's lock to reach the row.
+- [x] Find why `Core/Nexus/mutate.test.ts`'s "a color queued behind a Space rename…" fails under load, reproducing it at the baseline `8148302cf` in a worktree and at HEAD, and fix it at its origin where the cause is clear; otherwise add its `IssuesPM.md` entry with the evidence.
+- [x] Run `~/The Studio/.claude/scripts/index-issues/index-issues.py .claude/IssuesPM.md`, which numbers the entries and recomputes the totals.
 
 **VERIFY**
 
-- [ ] `rg -n "one row per deleted|is one row|title opens the reader|nowhere to go" .claude/Features Core` finds nothing stale.
-- [ ] The index script reports no dangling citation.
+- [x] `rg -n "table-divider|is-clear" .claude/Features` finds nothing, and `git diff --stat .claude/Features` touches only the five files *§Reconciliation* names.
+- [x] The index script reports no dangling citation.
 
-#### Task 6-2
+#### Task 7-2
 
 **TASK:** Add a disclosure group to the Archive Drive.
 
 **CHANGE**
 
-- [ ] Add MATRIX rows to `.claude/scripts/Archive Drive/MATRIX.md`, with matching steps in `live-drive.mjs`, for:
+- [x] Rewrite group 6B's steps that still open the reader with a single title click (`live-drive.mjs:1188`, `:1201-1205`) to a double-click that leaves the row checked, and its Set step (`:1213-1217`) to a click that discloses the Set and opens nothing, with their MATRIX rows rewritten in place.
+- [x] Add MATRIX rows to `.claude/scripts/Archive Drive/MATRIX.md`, with matching steps in `live-drive.mjs`, for:
   - a trashed Collection disclosing a Set and pages;
   - an inner page restored through Restore ▸;
   - a Restore All of two inner items asking once;
@@ -1288 +2486 @@ The header docstring at `:41` reads: "A Set discloses what it holds, and a page
 
 **VERIFY**
 
-- [ ] The drive runs green against `~/Test`, rebuilt with `node .claude/scripts/make-benchmark-nexus.mjs test` before and after.
+- [x] The drive runs green against `~/Test`, rebuilt with `node .claude/scripts/make-benchmark-nexus.mjs test` before and after.
 
-#### Task 6-3
+#### Task 7-3
 
 **TASK:** A live CDP pass with screenshots of both skins. Every fixture is removed afterward.
 
 **CHANGE**
 
-- [ ] Launch per `.claude/Guidelines/Development-Environment.md`.
-- [ ] In both skins, screenshot a container disclosed to depth 2 with a long title and a checked inner row.
-- [ ] Double-click an Archive page, and screenshot the reader's trail.
+- [x] Launch per `.claude/Guidelines/Development-Environment.md`.
+- [x] In both skins, screenshot a container disclosed to depth 2 with a long title and a checked inner row.
+- [x] Double-click an Archive page, and screenshot the reader's trail.
 
 **VERIFY**
 
-- [ ] The screenshots are read and sent to Nathan.
-- [ ] The app process is stopped and `~/Test` is rebuilt.
+- [x] The screenshots are read and sent to Nathan.
+- [x] The app process is stopped and `~/Test` is rebuilt.
 
 ---
 
 ### Completion Criteria
 
-- **Conformance:** The work follows *§Constraints*, `.claude/CLAUDE.md`, and the Studio conventions. No second reader exists for a store path, an inner record, an identity, an artifact row, or a click.
+- **Conformance:** The work follows *§Constraints*, `.claude/CLAUDE.md`, and the Studio conventions. No second reader exists for a store path, an inner record, an identity, an artifact row, or a click, and no second drawing of a store's row.
 - **Correctness:**
   - Each kind of inner item (page, nested Set) restores, deletes, and Undoes in both stores.
   - A refused inner-item op leaves its bundle untouched.
   - A homeless batch Restore asks once per kind of destination.
-  - The gestures match the rulings in both skins, live.
-- **Completeness:** Every task is ticked. No `storeOf`, `leaf` request, title-click open, or "nowhere to go" path remains.
+  - The gestures and the keyboard match the rulings in both skins, live, and both skins' rows measure TableView's.
+- **Completeness:** Every task is ticked. No `storeOf`, `leaf` request, title-click open, "nowhere to go" path, MenuItem Trash row, or `titleAccessory` remains.
 - **Confirmation:** Every new or rewritten test goes red without its change, and the live pass's screenshots are delivered.
 - **Continuity:** *§Reconciliation* is walked, and the Archive Drive matrix is current.
 - **Confidence:** Gates are green from a clean state over `$BASE..HEAD`, and the delta is reported.
@@ -1324 +2522 @@ The header docstring at `:41` reads: "A Set discloses what it holds, and a page
 
 **THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run.
 
-- [ ] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5
-- [ ] Simplification lens → adversarial lens (opus-high) over `$BASE..HEAD`
-- [ ] Neutral verification (opus-high) over `$BASE..HEAD`
-- [ ] Own pass: gates · diff · deviations · criteria
+The post-plan reviews follow the standard multi-wave procedure (Nathan, 10-26-2026), each wave closed before the next opens. Every reviewer brief carries the Approach, Principles, and Docs Constraint verbatim and *§Constraints* whole, except the neutral gate's, which carries none of them.
+
+- [x] Phase review (opus-high): Phase 1 · Phase 2 · Phase 3 · Phase 4 · Phase 5 · Phase 6
+- [ ] **Wave One:** two read-only `opus-xhigh` reviewers over `$BASE..HEAD`, briefed with `code-simplification`. One reads inward, at the diff itself; one reads outward, at the diff against the rest of Core, UIX, and Desktop. One fix agent folds what holds as numbered fixes beside a Not Taken list with reasons, and the fold commits.
+- [ ] **Wave Two:** two fresh `opus-xhigh` reviewers, inward and outward, under Wave One's brief over the folded range, given the Not Taken list so a fold left out returns only on new evidence; folded and committed the same way.
+- [ ] **Neutral Gate:** one `fable-high` agent given only the baseline head, the final head, and the intention statement; a yes-or-no verdict, its corrections, and the strengths to keep, re-run after each fold until it answers yes.
+- [ ] **Spotcheck:** any fold after the gate gets one `opus-high` spotcheck against the principles alone.
+- [ ] **Closeout:** the Archive Drive whole on the final head, and the own pass: gates · diff · deviations · criteria
 - [ ] Reconciliation walked
-- [ ] Report delivered
+- [ ] `save-session`, `save-delta`, and the report; no history entry
 
 #### Reconciliation
 
-- `.claude/Features/NexusRecordPM.md:10` — "a Trash record of a page or Set deleted from the Archive names the Archive bundle it left" reads false for an item taken out of an archived Set, whose record names where inside the bundle it sat — Task 6-1
-- `.claude/Features/NexusRecordPM.md:16` — "one row per deleted entity" reads false once a Set's or Collection's row opens onto a row per item inside it; "removes the spent bundle" reads false for an item deleted out of one, which leaves the rest behind; "a batch names what it couldn't resolve" reads false once a batch asks where its homeless rows go — Task 6-1
-- `.claude/Features/CollectionsPM.md:51` — "Restoring an archived page or set places it back into its remembered placement" reads false for an item restored out of an archived Set, which asks where it goes — Task 6-1
-- `.claude/Features/CorePM.md:92` — "save the Archive bundle a delete from the Archive names" and "an Archive bundle" in the cascade rule read false once a delete from the Archive can name an item inside one — Task 6-1
-- `.claude/Features/PommoraUIX.md:361` — "`MenuItem` carries `leading` · title · `subLabel` · `detail` · `trailing` · `overlay`" omits `titleAccessory` from the kit's slot ledger — Task 6-1
-- `.claude/IssuesPM.md` I-075 — "`Core/Bundles/browser.ts` doesn't read `detail` yet", the Solution's surface count, and the footnote's plan cites read false once `rowClick` ships — Task 6-1
-- `.claude/IssuesPM.md` — new entry: an emptied container bundle stays behind — Task 6-1
+- `.claude/Features/NexusRecordPM.md:16` — the Trash frame's paragraph gains one sentence, at Nathan's word: a Set's or Collection's row opens onto the pages and Sets inside it, each restored or given up on its own, which leaves the rest of its bundle in place — Task 7-1
+- `.claude/Features/CollectionsPM.md:51` — "Restoring an archived page or set places it back into its remembered placement" reads false for an item restored out of an archived Set; Nathan's wording follows it: "an item restored from an archived set is given an option for its placement" — Task 7-1
+- `.claude/Features/PommoraUIX.md:393` — "(`.table-divider` puts the bar on any element)" reads false once the class leaves — Task 7-1
+- `.claude/Features/PommoraDND.md:60` — "Space lifts a row" and a displace item's "Space lifts it" read false where nothing can be lifted, which Space opens — Task 7-1
+- `.claude/Features/ViewTypesPM.md:95` — "and states `is-clear` for a heading with no fill and no seam" reads false once the class leaves — Task 7-1
+- `.claude/scripts/Archive Drive/MATRIX.md:72`, `:79`, `:124`, `:135`, `:140` — the Trash's `.trash-row.table-divider` rows and `.trash-date`, `.archive-rows`, and "30 px" rows — Task 6-4
+- `Core/Views/Table/table-view.css:1` — "the rail gutter's grip and check" reads false; the check and the lead cell's seat live in `table.css` — Task 6-2
+- `Core/Archive/archive-view.css:1` — the virtual list, the trail, and the Archived column move to the bundle table — Task 6-2
+- `Core/Settings/trash-frame.css:2`, `:27`, `:86` — the date lane, "this strip has no gutter column", and the trail's mirrored inset — Task 6-3
+- `.claude/IssuesPM.md` I-075 — "`Core/Bundles/browser.ts` doesn't read `detail` yet", the Solution's surface count, and the footnote's plan cites read false once `rowClick` ships — Task 7-1
+- `.claude/IssuesPM.md` — new entry: an emptied container bundle stays behind — Task 7-1
 - `Core/Bundles/browser.ts:189` — the hook's doc gains the tree and `rowClick` — Task 4-1
-- `Core/Interface/Confirm/confirmations.ts:46` — the `spendUndo` doc reads "A bundle, or an inner item of one, …" — Task 1-3
 
 #### Open Items
 
-- **Emptied Containers (Nathan's Note):** pulling every inner item out of a container bundle leaves the container in its store as an empty row. That holds for now, and Nathan isn't happy with it. Task 6-1 records it in `IssuesPM.md` for a later decision.
+- **Emptied Containers (Nathan's Note):** pulling every inner item out of a container bundle leaves the container in its store as an empty row. That holds for now, and Nathan isn't happy with it. Task 7-1 records it in `IssuesPM.md` for a later decision.
+- **Logged Along the Way:** `IssuesPM.md` holds the drag instructions every line row names, rows that can't be dragged included (I-078), Confirm Before Deletion's hint, which doesn't say the Trash always asks (I-079), and the Trash's keyboard path to Restore and Delete (I-080).
 
 
 #### Deviations
 
-- None yet.
+- **The Layout Leaf (Task 1-2):** `spendBundle`'s owed-note edit put `owed.ts` and `configReach.ts` on the live tree's load path, because `heldPages.ts` reached `bundle.ts` for `originPathOf` alone. The cycle left `configReach.test.ts`'s `liveTree` mock depending on import order. The stores' layout, the stamp, `stampedSegment`, `bundleAddressOf`, and `originPathOf` moved into a pure `Core/Bundles/layout.ts`, so loading the tree reaches nothing else in `Core/Bundles/`, and the baseline cycle through `record.ts` closed with it.
+- **The Flake (Task 7-1):** "a color queued behind a Space rename…" failed 32 of 60 loaded runs at the baseline and at HEAD alike: its hold spied `rmwJsonStrict`, which the color's write stopped calling when `patchSidecar` moved onto the machine lock (`e739189d7`, before this plan), so the hold never engaged. Its cause was clear, so the test now holds on `patchSidecar` and asserts the hold engaged, 0 of 60 failing, where the plan first logged a pre-existing flake in `IssuesPM.md` instead.
+- **One Table Row (Phase 6, Nathan's Ruling):** Phase 5 drew the Trash on MenuItem rows and gave MenuItem `titleAccessory` and `titleLine` for its chevron. Seeing both skins live, Nathan ruled the Trash onto the Archive's table row, planned as a phase of its own. Phase 6 draws both skins from one bundle table, and `titleAccessory`, `titleLine`, MenuItem's `revealed`, `.table-divider`, and `.table.is-clear` leave with the Trash's MenuItem rows.
+- **Enter Opens (Final Verification, Nathan's Ruling):** the neutral gate found an Archive page's reader reachable only by a pointer's double-click, since Enter acted as a click and checked the row. Nathan ruled Enter opens and Space checks, every row's Space included: a line row takes a `space` beside its `open`, `BundleRowView`'s toggling its row's check, and `rowClick` reads a click with no count as a double-click where pages open.
+- **The Inventory's Rulings (Final Verification, Nathan's Rulings):** the drive's coverage inventory found four behaviors Nathan ruled on: a single Trash Restore or Delete now posts `Restored “Title”` / `Deleted “Title”` as every other notice does, through one `deleteOne` both stores share; the date menu's two `Hidden` rows became `Show/Hide Day` and `Show/Hide Time`, in every date column, Show Time following the Nexus clock; every title-bar search keeps its text on the first Escape, which the tree already did; and an Archive restore's Undo puts the item back exactly as it was archived, through the request the restore's reply carries. Two more went to `IssuesPM.md`: Confirm Before Deletion's hint and the Trash's keyboard path to Restore and Delete.
````

##### .claude/scripts/README.md

```/.claude/scripts/README.md diff
@@ -76 +76 @@ Collection, and times the Link column's open, the decoration build on caret move
 native caret move. It seeds `Collection A/Set Alpha` and its neighbors with real duplicates and
 `PL …` pages on debug port 9383, and exits non-zero on any failed check a landed phase owns.
 
-`Archive Drive/live-drive.mjs` drives the Archive end to end against the real app, in seven groups
-that follow the plan's phases, 1 to 6B: the lift and the carry of excluded folders and the asset
+`Archive Drive/live-drive.mjs` drives the Archive end to end against the real app, in eleven groups
+that follow the plans' phases, 1 to 7: the lift and the carry of excluded folders and the asset
 directory; the bundle format both stores share, the exact place a restore returns to, and its
 step-aside past the disk; the Archive's reach into the content index and every cascade while the
 tree, search, and the Matrix leave it out; the archive, restore, and delete ops, the open pass, and a
 Set's carry across Collections; the chrome the Trash and the Archive share; archiving from the menus
-and its settings; and ArchiveView, the reader window, and the action label's bar. `MATRIX.md` beside
-it holds each group's cases and the decision each proves. It takes the groups to run as arguments —
+and its settings; ArchiveView, the reader window, and the action label's bar; a Set's or
+Collection's bundle disclosing in both stores; and, as 7B to 7D, every other option the two stores
+offer: the shared table's keyboard, search, date styles, and width, the delete questions and their
+settings, and single, homeless, partly recorded, and refused rows. `MATRIX.md` beside it holds each group's cases and
+the decision each proves. It takes the groups to run as arguments —
 `node live-drive.mjs 1 6B` — seeds each group's own Sets, pages, and settings in `~/Test`'s
 `Collection A` and puts the settings back, on debug port 9393, and exits non-zero on any failed check.
 
```

##### .claude/scripts/Archive Drive/MATRIX.md

```/.claude/scripts/Archive Drive/MATRIX.md diff
@@ -69 +69 @@ Seeds through `mutate` on `~/Test`: `G5 One`, `G5 Two`, `G5 Note`, `G5 Note Long
 
 | Check | Decision | Asserts |
 | --- | --- | --- |
-| the Trash keeps its look and lists newest first | G-1 | DOM: Settings › Trash's `.trash-frame.table` holds `.nav-search-row`, then `.trash-head.table-head` with `.trash-head-name` and `.trash-head-date`, then `.trash-row.table-divider` rows; the rows' `Select …` labels begin `G5 Note Long, G5 Note, G5 Two, G5 One`; `shot` beside it |
+| the Trash keeps its look and lists newest first | G-1 | DOM: Settings › Trash's `.trash-frame.table` holds `.nav-search-row`, then `.trash-table`, whose `.table-grid` holds `.trash-head.table-head` with `.trash-head-name` and `.trash-head-date`, then `.trash-scroll` with its `.data-row`s; the rows' `Select …` labels begin `G5 Note Long, G5 Note, G5 Two, G5 One`; `shot` beside it |
 | typed search narrows in place, keeping newest first | G-1 | DOM: typing `g5 note` in the Trash's search field leaves exactly `['G5 Note Long', 'G5 Note']` (ranking would put `G5 Note` first); clearing the field restores the four |
 | one row's menu reads Restore and Delete | K-4 | native rows: `chooseNative` on the unchecked `G5 One` row, path `[]`, reads `['Restore', 'Delete']` |
 | a checked row's menu names the batch; an unchecked one acts alone | K-4 | native rows: with `G5 One` and `G5 Two` checked, `['Restore All', 'Delete All']` on `G5 Two` and `['Restore', 'Delete']` on the unchecked `G5 Note` |
 | Restore All restores the checked rows | K-4 | disk and DOM: `Restore All` on `G5 Two` leaves both `.md` files under `Collection A/Set Alpha` and their bundles gone from `.trash`; the list holds neither; the label's text starts `Restored 2 Pages` |
 | a notice posted under the pointer drains | K-3 | DOM: right after it posts, `mouseMoved` to the label's centre and 10 px across it, never leaving, and the label's host gains `inert` within 4500 ms |
 | the date column's right-click picks a style and returns to the Nexus's own | G-1 | native rows and disk: `Short Date` on `.trash-head-date` writes `trashColumnStyle: { date_format: 'short' }` to `.nexus/settings.json`; the Nexus's own form (`Full Date` on `~/Test`) takes the key out |
-| under its widest style no Trash date and not its heading is cut | G-1 | DOM and disk: with `Full Date` and the weekday's `Full` on `.trash-head-date`, every `.trash-date` reads its weekday and has `scrollWidth <= clientWidth`, as does `.trash-head-date`; the weekday's `Hidden` takes `trashColumnStyle` out again |
+| under its widest style no Trash date and not its heading is cut | G-1 | DOM and disk: with `Full Date` and the weekday's `Full` on `.trash-head-date`, every `.bundle-date` reads its weekday and has `scrollWidth <= clientWidth`, as does `.trash-head-date`; the weekday's `Hide Day` takes `trashColumnStyle` out again |
 | Delete All empties the checked rows | K-4 | DOM and disk: with `G5 Note` and `G5 Note Long` checked, `Delete All` on one asks `Delete these 2 Pages?`; after Delete both bundles are gone from `.trash` and the label's text starts `Deleted 2 Pages` |
 | once the pointer has left its band, returning stalls the drain and leaving drains it | K-3 | DOM: right after that notice posts, two frames, `mouseMoved` far from it (the window's bottom-left), two frames, then `mouseMoved` into its band: no `inert` after 5000 ms; `mouseMoved` far again: `inert` within 4500 ms |
 | the icon picker's rows sit where its list starts and virtualize while scrolled | 4.7 | DOM: with `iconFavorites: ['alarm-clock']` seeded (so the favorites strip sits above the list and its offset isn't 0), `G5 One` opened from Collection A's table and `Edit Icon` chosen on `.detail-title-text`, the list's top lies below the strip and the first rendered row's top equals it; after setting the grid's `scrollTop` to 600 and a frame, fewer rows render than the icon set holds and one row spans the grid's top edge; Escape closes |
@@ -121 +121 @@ Seeds through `mutate` on `~/Test`, each archived through `mutate`'s `archive` a
 | Archive shows the archive place in the same tab, pressed | G-4, G-5 | DOM: after the press, the `[role=tab]` count is unchanged, the Archive row wears the picked ring, and the shown `.detail-title` ends in `.detail-title-trailing` reading `Archive` right after `.detail-title-clear` |
 | the header keeps the owner's title with no banner | G-3 | DOM and native rows: `.detail-title-text` reads `Collection A`; no `.banner` and no `[aria-label="Add banner"]` is drawn while `.banner-empty` seats the title; the title's native menu holds `Rename` |
 | the tab reads the owner's title with the archive glyph | G-3 ruling 9 | DOM: `activeTab` is `Collection A`, the selected tab holding `svg.lucide-archive` |
-| rows list each archived item with its trail and time, newest first | G-1, G-2 | DOM: `.archive-rows .data-row .cell-title-text` read `Drive Arc Set`, `Drive Arc Root`, `Drive Arc 2`, `Drive Arc 1`; `Drive Arc 1`'s trail reads `Collection A`, `Set Alpha`; no `.archive-date` cell is empty; `[title="Results"]` reads `4`; `shot` beside it |
+| rows list each archived item with its trail and time, newest first | G-1, G-2 | DOM: `.bundle-rows .data-row .cell-title-text` read `Drive Arc Set`, `Drive Arc Root`, `Drive Arc 2`, `Drive Arc 1`; `Drive Arc 1`'s trail reads `Collection A`, `Set Alpha`; no `.bundle-date` cell is empty; `[title="Results"]` reads `4`; `shot` beside it |
 | two checks declare the bar | G-6 | DOM: after presses on `Drive Arc 1`'s and `Drive Arc 2`'s Archived cells, the label's shown face reads `Restore2 Pages` and holds `button[title="Delete"]` |
 | Restore cross-fades to Restored 2 Pages, and its Undo archives them again | G-6 | DOM and disk: the bar's Restore shows `Restored 2 PagesUndo`, both rows leave, both pages sit in Set Alpha with `page_order` as seeded; after Undo, `bundles:list` names both under `.nexus/archive/<A id>/Collection A/Set Alpha/` at their pre-Restore bundle paths, which exist, and the rows return |
 | Delete from the bar moves one row into the Trash, and its Undo returns it to the Archive | E-3 | DOM and disk: with `Drive Arc 1` checked alone, the bar's Delete asks `Delete “Drive Arc 1”?`; after Delete, its Trash bundle is `.trash/Collection A/Set Alpha/<stamp>__Drive Arc 1.md.deleted`, its record's `archive` naming the Archive bundle, which is gone; the notice reads `Deleted “Drive Arc 1”Undo`; after Undo the Archive bundle is back and the Trash bundle gone |
 | a batch Delete asks once and offers one Undo | G-6 | DOM and disk: with both `Drive Arc` pages checked, the bar's Delete asks `Delete these 2 Pages?` and nothing else for 1500 ms after; two Trash bundles; `Deleted 2 PagesUndo`; after Undo both Archive bundles are back and both Trash bundles gone |
 | the right-click menu acts on the checked rows | G-6 | native rows and DOM: with both `Drive Arc` pages checked, `Restore All` and `Delete All` on one; `Restore` and `Delete` on the unchecked `Drive Arc Root`; after both uncheck, the label's host turns `inert` |
 | search narrows in place, keeping archived order | G-1 ruling 15 | DOM: a click on `.detail-title-text` and `Arc` typed leave the `Arc` titles in `bundles:list({ kind: 'archive', id: <A id> })`'s order, read rather than assumed since the reader check re-stamped `Drive Arc Root`; ` 2` typed leaves `Drive Arc 2` alone; the clear button brings every row back |
-| a page row's title opens the read-only reader | H-1 | DOM: a click on `Drive Arc Root`'s title opens `[aria-label="Archived Page"]` holding `.reader-lock[title="Read Only"]`, a trail reading `Collection A`, `Drive Arc Root`, no `input` after a double-click on it, no `Restore` button, and a doc holding `Root body.`; `button[title="Close"]` closes it; `shot` beside it |
-| the reader closes once its item leaves the Archive | H-1 Cautionary 32 | DOM: `Drive Arc Root`'s row checked, then its title clicked, keeps the row checked and the face reading `Restore1 Page`; a pointer press on the bar's Restore leaves no `[aria-label="Archived Page"]`; the page is archived again after |
-| a Set row's title opens nothing and checks its row | G-2 ruling 11 | DOM: a click on `Drive Arc Set`'s title opens no reader and checks its box; a press on its row unchecks it |
+| a page row's double-click opens the read-only reader and leaves the row checked | H-1 | DOM: a double-click on `Drive Arc Root`'s title opens `[aria-label="Archived Page"]` holding `.reader-lock[title="Read Only"]`, a trail reading `Collection A`, `Drive Arc Root`, no `input` after a double-click on it, no `Restore` button, and a doc holding `Root body.`; `button[title="Close"]` closes it, leaving the row checked and the face reading `Restore1 Page`; `shot` beside it |
+| the reader closes once its item leaves the Archive | H-1 Cautionary 32 | DOM: a second double-click on `Drive Arc Root`'s title opens the reader with the face still reading `Restore1 Page`; a pointer press on the bar's Restore leaves no `[aria-label="Archived Page"]`; the page is archived again after |
+| a Set row's click discloses its rows and opens nothing | Clicks | DOM: a click on `Drive Arc Set`'s title sets its `aria-expanded` to `true` and draws `Drive Arc Inside` right after it, its trail reading `Collection A`, `Drive Arc Set`, with no reader and the Set's box unchecked; a second click collapses it |
 | the Archived heading's right-click picks its date style | G-1 | native rows, disk, and DOM: `Short Date` on the `Archived` heading writes `archiveColumnStyle: { date_format: 'short' }` and changes the first cell; `Full Date`, the Nexus's own form on `~/Test`, takes the key out |
-| under its widest style no Archived date and not its heading is cut | G-1 | DOM and disk: with `Full Date` and the weekday's `Full` on the `Archived` heading, every shown `.archive-rows .data-cell.archive-date` reads its weekday and has `scrollWidth <= clientWidth`, as does the heading; the weekday's `Hidden` takes `archiveColumnStyle` out again |
+| under its widest style no Archived date and not its heading is cut | G-1 | DOM and disk: with `Full Date` and the weekday's `Full` on the `Archived` heading, every shown `.bundle-rows .bundle-date` reads its weekday and has `scrollWidth <= clientWidth`, as does the heading; the weekday's `Hide Day` takes `archiveColumnStyle` out again |
 | the toolbar's settings pane is the empty one | G-3 ruling 12 | DOM: `SETTINGS_BUTTON` opens the 24px spacer and no `[aria-label="Add Property"]`; a second press closes it |
 | Back returns to the view and Forward to the archive | G-5 | DOM: `button[title="Back"]` shows Collection A's table rows and no `.detail-title-trailing`; `button[title="Forward"]` shows the archive |
 | relaunch reopens the archive tab | G-5 | DOM: after `relaunch`, the active tab reads `Collection A` holding `svg.lucide-archive`, and `.detail-title-trailing` is up |
 | a top-level Set's archive lists only what left from within it | G-4 | DOM and channel: Archive in Set Alpha's views dropdown draws `bundles:list({ kind: 'archive', id: <A id> }, <Set Alpha id>)`'s titles in order, which are `Drive Arc 1` and `Drive Arc 2` alone |
-| virtual rows render a window of a long archive | 4.7 | DOM and channel: in Collection B's archive, `.archive-rows` is 30 px times the sixty rows `bundles:list` answers tall and holds fewer `.data-row`s; with `.detail-scroll` scrolled to its bottom, `Drive Bulk 01`'s row is drawn |
+| virtual rows render a window of a long archive | 4.7 | DOM and channel: in Collection B's archive, `.bundle-rows` is 29.75 px times the sixty rows `bundles:list` answers tall and holds fewer `.data-row`s; with `.detail-scroll` scrolled to its bottom, `Drive Bulk 01`'s row is drawn |
 | the bar withdraws when its tab parks | G-6 | DOM: with a row checked in Collection B's archive, `[aria-label="New Tab"]` leaves the label's host `inert`; back on the archive's tab, the shown face reads `Restore1 Page` |
 
+#### Group 7 — Disclosure (Disclosable Bundles, Phase 7)
+
+Lands with *Disclosable Bundles — Implementation Plan*'s Phase 7, its Decisions the plan's rulings by name. Seeds through `mutate` on `~/Test`: Collection `Nest Coll` holding Set `Nest Set` (holding `Nest Deep`) and pages `Nest One`, `Nest Two`, `Nest Three`, and `Nest Four`, deleted into the Trash; `Nest Loose` in Set Alpha, deleted into the Trash, so its home resolves; Set `Shelf Set` in Collection A holding `Shelf Kept` and `Shelf Gone`, archived; and Set `Lane Set` in Set Alpha holding Set `Lane Sub` (holding `Lane Deep`) and page `Lane Top`, archived, so it lists in Set Alpha's own archive. Confirm Before Deletion is on through `personalization:set`, and `permanentDelete` turns on before the inner Delete. With it on, the group empties `Nest Coll`'s bundle, deletes and empties the pages restored into Collection B and Set Alpha and the archived `Shelf Set` and `Lane Set`, writes `confirmDeletion` and `permanentDelete` back, and removes the empty Archive and Trash chain folders it left; the harness restores `~/Test` when the run ends.
+
+| Check | Decision | Asserts |
+| --- | --- | --- |
+| a trashed Collection discloses its Set and pages, and the Set its own | Clicks, Nesting, Trails | DOM: in Settings › Trash, a click on `Nest Coll`'s title draws `Nest Set`, `Nest One`, `Nest Two` after it; a click on `Nest Set`'s draws `Nest Deep` beneath it; both containers read `aria-expanded="true"`, `Nest Set` carrying `.row-chevron`; `Nest Deep`'s trail reads `Nest Coll`, `Nest Set`; no box is checked; `shot` beside it |
+| a container's box checks it in place, every box shows, a top chevron follows its title, and a double-click opens a container once | Clicks, Chevron, Double-Click | DOM: a pointer press on `Nest Set`'s box sets its `aria-checked="true"`, leaves it `aria-expanded="true"` with `Nest Deep` drawn, and every row reads `data-reveal-host="on"`; `Nest Coll`'s `.bundle-title` ends in its `[data-drop-outline]` right after `.cell-title`; a second press unchecks it, every row reading `data-reveal-host=""`; collapsed by a title click, then a double-click on its title leaves `aria-expanded="true"` and `Nest Deep` drawn after 600 ms |
+| a Trash page's double-click leaves it checked and opens nothing, and a double-click on its box opens nothing | Clicks, Double-Click | DOM: a double-click on `Nest One`'s title leaves its box checked, no `[aria-label="Archived Page"]`, the `[role=tab]` count unchanged, and Settings shown; a double-click on its box leaves it checked and opens nothing; a press unchecks it |
+| a folder the Nexus excludes stays out of an inner listing until it's unexcluded | Excluded Folders | DOM and disk: with `Nest Coll/Nest Set` excluded through `exclusions:set`, `Nest Coll` collapsed and reopened draws `Nest One`–`Nest Four` after it and no `Nest Set`, the bundle's `Nest Coll/Nest Set/` still on disk; the start list set back, collapsed and reopened, it draws `Nest Set` first again; `Nest Set` reopened after |
+| a collapsed container keeps its inner check out of the menu, and reopening shows it | Collapsing | native rows and DOM: with `Nest Two` and `Nest Loose` checked and `Nest Coll` collapsed, `Nest Loose`'s menu reads `Restore`, `Delete`; reopened, `Nest Two`'s box reads checked and the same menu reads `Restore All`, `Delete All`; both unchecked after |
+| a checked Set covers its checked page: the menu acts once, on the Set | Nesting | native rows: with `Nest Set`'s box and `Nest Deep`'s row checked, `Nest Deep`'s menu reads `Restore`, `Delete`, its `Restore` a submenu, since the Set's home is gone; both unchecked after |
+| an inner page restores through Restore ▸ into the container picked | Homeless Items | native rows and disk: `Nest One`'s menu reads `Restore`, `Delete`, and its `Restore` › `Collection B` › `Collection B` lands `Collection B/Nest One.md` with its seeded `ID` and takes it out of the bundle; the row leaves while `Nest Set`, `Nest Deep`, and `Nest Two` stay |
+| a Restore All of two inner pages asks once where they go | Batch Restore | native rows, DOM, and disk: with `Nest Two` and `Nest Deep` checked by their row clicks, `Restore All` pops one destination ask; after `Collection B` is picked no other menu pops for 1500 ms, the label reads `Restored 2 Pages`, and both pages sit in Collection B, gone from the bundle |
+| a batch's ask sends only its homeless rows, and a dismissed ask restores nothing | Batch Destination | native rows and disk: with `Nest Three` (inner) and `Nest Loose` (top) checked, `Restore All` pops one destination ask; dismissing it leaves both rows listed and both bundles standing for 1500 ms; a second `Restore All` picking `Collection B` lands `Collection B/Nest Three.md` and `Collection A/Set Alpha/Nest Loose.md`, no `Collection B/Nest Loose.md`, and the label reads `Restored 2 Pages` |
+| an inner page's Delete empties that item alone | Nesting | DOM and disk, `permanentDelete` on: `Nest Four`'s `Delete` asks `Delete “Nest Four”?`, detail `It will be erased from this computer. This cannot be undone.`; after Delete the label reads `Deleted “Nest Four”` with no button, the inner path is gone, and the bundle and `Nest Set` stand, `Nest Set` still drawn |
+| an archived Set's inner page restores, and its Undo files it back inside the Set | Homeless Items, Undo | DOM and disk: in Collection A's archive, `Shelf Set` disclosed, `Shelf Kept`'s `Restore` › `Collection A` › `Collection A` lands `Collection A/Shelf Kept.md` and shows `Restored “Shelf Kept”Undo`; after Undo the page is back at `<bundle>/Shelf Set/Shelf Kept.md`, no bundle of its own exists, and its row is drawn under `Shelf Set` again |
+| an inner page deleted from the Archive goes to the Trash, and its Undo files it back inside the Set | Undo | DOM and disk: `Shelf Gone`'s `Delete` asks `Delete “Shelf Gone”?`; after Delete its Trash bundle holds the page and a record naming its `archive`, the inner path is gone, and the notice reads `Deleted “Shelf Gone”Undo`; after Undo the page is back at `<bundle>/Shelf Set/Shelf Gone.md`, the Trash bundle gone, no bundle of its own exists, and its row is drawn under `Shelf Set` again |
+| a Set archived from inside a Set discloses recursively in that Set's archive, and its inner page opens the reader on its own trail | Nesting, Trails, Chevron, Double-Click | DOM: in Set Alpha's archive, a click on `Lane Set` draws `Lane Sub`, `Lane Top`; a click on `Lane Sub` draws `Lane Deep` after it, `Lane Sub` carrying `.row-chevron`; `Lane Deep`'s trail reads `Collection A`, `Set Alpha`, `Lane Set`, `Lane Sub`; a double-click on `Lane Top`'s box opens nothing; a double-click on `Lane Deep`'s title opens the reader, its trail reading `Collection A`, `Set Alpha`, `Lane Set`, `Lane Sub`, `Lane Deep`; Escape closes it, `Lane Deep` still checked; a row click unchecks it |
+| a checked Set and its checked page reach the bar as the Set, which restores whole and its Undo archives it again | Nesting, Clicks, Undo | DOM and disk: `Lane Set`'s box checked, its `aria-expanded` still `true`, and `Lane Top` by its row; the shown face reads `Restore1 Set`; `Lane Top`'s menu reads `Restore`, `Delete`; the bar's Restore lands `Collection A/Set Alpha/Lane Set/Lane Sub/Lane Deep.md` and shows `Restored “Lane Set”Undo`; after Undo, `bundles:list` names `Lane Set` at its pre-Restore bundle path and the folder is gone from Set Alpha |
+| the group leaves Collections A and B, the Archive, and the Trash as it found them | — | start-of-group values: `state.json`'s `order.collections`, Collection A's `set_order`, Set Alpha's `page_order` and `set_order`, Collection B's `page_order`, `excluded_folders`, the Trash's `bundles:list` length, what `.nexus/archive/<A id>/` holds, `permanentDelete`, and which Trash chain folders exist; no `Nest Coll` folder |
+
+#### Group 7B — The Shared Table (Disclosable Bundles, Phase 7)
+
+Seeds through `mutate` on `~/Test`: `Key Loose A` and `Key Loose B` in Set Alpha and Collection `Key Coll` holding `Key One` and `Key Two`, deleted into the Trash in that order; Collection `Key Shelf` holding forty pages `Key Bulk 01`–`40`, Set `Key Box` (holding `Key Inside`), `Key Back` (its body `Back body.` written from outside), and `Key Spent`, archived a beat apart in that order, so the named rows list first; Collection `Key Bare`, and Set `Key Empty` in Collection A, neither of which archives anything. Confirm Before Deletion is on through `personalization:set`. The group measures the Settings window's width when it first opens and drags it back by its south-east corner after narrowing it; with `permanentDelete` on it empties `Key Coll`, `Key Loose A`, and `Key Loose B`, deletes and empties `Key Shelf` (whose Archive goes with it, F-4), `Key Bare`, and `Key Empty`, writes `confirmDeletion`, `permanentDelete`, and `trashColumnStyle` back, and removes the empty chain folders it left; the harness restores `~/Test` when the run ends.
+
+| Check | Decision | Asserts |
+| --- | --- | --- |
+| the Trash's rows are one Tab stop whose arrows step, whose Enter discloses a container and checks a page, opening nothing, and whose Space checks a page | Keyboard | DOM: from the search field, Tab focuses `Key Coll`'s row; ArrowDown moves the focus to `Key Loose B` and ArrowUp back; Enter sets `Key Coll`'s `aria-expanded="true"` and draws `Key One`, `Key Two`; ArrowDown onto `Key One` and Space check it; ArrowDown onto `Key Two` and Enter check it with no `[aria-label="Archived Page"]` and the `[role=tab]` count unchanged; both unchecked by Space; a second Tab leaves `.bundle-rows` and lands on no `[role=checkbox]` |
+| Left and Right on a row do nothing | — (current behavior) | DOM: with `Key Coll` focused and disclosed, ArrowRight then ArrowLeft leave the focus on `Key Coll`, its `aria-expanded="true"`, and no box checked |
+| the search narrows top rows only, an open container's rows following it | Search | DOM: with `Key Coll` open, `key one` typed leaves neither `Key Coll` nor `Key One` listed; `key coll` lists `Key Coll`, `Key One`, `Key Two` in that order |
+| a search that hides a checked row keeps it out of the menu | Collapsing, Search | native rows: with `Key Loose A` and `Key Loose B` checked and `loose a` typed, `Key Loose A`'s menu reads `Restore`, `Delete`; the field cleared, it reads `Restore All`, `Delete All`; both unchecked after |
+| the date column's other styles write their keys and draw their forms | G-1 | native rows, disk, and DOM, on `.trash-head-date`: `MM/DD/YYYY` writes `date_format: 'monthDayYear'` and the first `.bundle-date` begins `NN/NN/NNNN`; `DD/MM/YYYY` writes `dayMonthYear`; `24 Hours` writes `time_format: 'twentyFourHour'` and no cell holds `AM` or `PM`; `Hide Time` writes `time_format: 'none'`; `Relative` writes `relative`; `Short Date`, then the weekday's `Short`, writes `weekday: 'short'`; `Full Date`, `Show Time` (which follows the Nexus's clock), and `Hide Day` take `trashColumnStyle` out |
+| a narrow Trash scrolls sideways with its heading, its labels where they were | Width, The Trash's Look, Row Look | DOM: before narrowing, `.trash-head-date`'s left meets the first `.bundle-date`'s within 0.5 px, `.trash-head-name`'s glyph starts inside the first row's checkbox column, and every row is 29.75 px tall; with the weekday's `Full` and `.settings-window .resize-edge-se` dragged 400 px left, the window clamps at 620 px; `.trash-table` scrolls (`scrollWidth > clientWidth`), and `scrollLeft = 120` moves `.trash-head` and the first row left by 120 px; every `.bundle-date` fits; the edge is dragged back by the measured difference and `Hide Day` picked; `shot` beside it |
+| a ctrl-press opens a row's menu and checks nothing | Clicks | native rows and DOM: a left press with the ctrl modifier on `Key Loose A` pops `Restore`, `Delete`, and its box stays unchecked |
+| in the Archive, Space checks and unchecks a row, a Set's too, and Enter opens a page's reader leaving it checked and discloses a Set | Keyboard, Clicks | DOM: in `Key Shelf`'s archive, focusing the rows' `.line-zone` focuses `Key Spent`, and ArrowDown steps to `Key Back`; Space checks it, the face reading `Restore1 Page`, no reader after 800 ms; a second Space unchecks it; Enter opens `[aria-label="Archived Page"]` holding `Back body.` and leaves its box checked; Escape closes it, and the zone hands focus back to `Key Back`, which Space unchecks; on `Key Box`, Space checks it with `aria-expanded="false"` and `Key Inside` undrawn, a second Space unchecks it, and Enter discloses `Key Inside` |
+| the focused row stays drawn while the list scrolls past it | 4.7, Keyboard | DOM: with `Key Box` focused, `.detail-scroll` scrolled to its bottom leaves `document.activeElement` connected and still `Key Box`'s row, while fewer rows are drawn than `bundles:list` answers |
+| Escape in either search leaves its field and keeps its query, and a second closes the Archive's | Search | DOM: in the Trash, `key loose` typed and Escape leave the field unfocused with its value `key loose`, Settings open, and `Key Loose B`, `Key Loose A` listed; in `Key Shelf`'s archive, `bulk` typed and Escape leave `.detail-title-search` unfocused with its value `bulk` and `[title="Results"]` reading `40`; a second Escape closes the search, `.detail-title-lead` losing `is-searching`, and the count reads `43` again |
+| ⌘F and the title's Search open the Archive's search, and its Results count only the top rows it leaves | Search, G-1 ruling 15 | DOM and native rows: ⌘F focuses `.detail-title-search`, and Escape in the focused, empty field closes it, `.detail-title-lead` losing `is-searching`; the title's menu › `Search` focuses it again; with `Key Box` open, `[title="Results"]` reads `43`; `key b` typed reads `42`, `Key Inside` still drawn under `Key Box` and not counted |
+| a page's Restore from the Archive offers an Undo that ⌘Z runs | Undo, I-3 | DOM and disk: `Key Back`'s `Restore` lands `Key Shelf/Key Back.md` and shows `Restored “Key Back”Undo`; with the pointer away and nothing focused, ⌘Z returns the bundle to its pre-Restore path, `Key Back.md` gone, and the label's host turns `inert` |
+| a Trash restore of what an Archive delete moved spends that delete's Undo | Undo, E-3 | DOM and disk: `Key Spent`'s `Delete` and the question's Delete show `Deleted “Key Spent”Undo`; the drain stalled as group 5's second drain check stalls it; Settings › Trash opened by `.click()` and `Key Spent`'s menu popped by a dispatched `contextmenu`, neither moving the pointer, its `Restore` chosen; within 1500 ms `Key Shelf/Key Spent.md` stands, no Trash or Archive bundle names it, and the label reads `Restored “Key Spent”`; once it drains, the same still holds |
+| a narrow Archive scrolls sideways, nothing clipped | Width | DOM: the viewport narrowed through `Emulation.setDeviceMetricsOverride` until the content is 120 px narrower than the table's minimum width; an ancestor of the Archive's `.table-grid` scrolls sideways, and `scrollLeft = 60` moves the first row left by 60 px; the grid keeps its minimum width, every `.bundle-date` fits, and scrolled to its end the last date reaches no further than the scroller; `shot` beside it; the override cleared |
+| picking a view, or the owner's crumb, leaves the Archive | G-4, G-5 | DOM: in `Key Shelf`'s archive, `.subfield-crumbs` reads `Key Shelf`, `Archive`; a press on the `Key Shelf` crumb leaves no `.detail-title-trailing`; back in the archive, the views dropdown's view row pressed leaves none, and the reopened dropdown shows that view picked and the Archive row unpicked |
+| an archive or a search with nothing to show reads its line | G-1 | DOM: `Key Bare`'s archive reads `This Collection's archive is empty.` with `[title="Results"]` `0`; `Key Empty`'s reads `This Set's archive is empty.`; `zzz` typed in `Key Shelf`'s archive and in the Trash's field each read `Nothing matches.` with no row |
+| the group leaves Collection A, the Trash, and every Archive it touched as it found them | — | start-of-group values: `state.json`'s `order.collections`, Collection A's `set_order`, Set Alpha's `page_order`, the Trash's `bundles:list` length, `trashColumnStyle`, `permanentDelete`, and which chain folders exist; the Settings window's width within 1 px; no `Key Coll`, `Key Shelf`, or `Key Bare` folder and no `.nexus/archive/<Key Shelf id>/` |
+
+#### Group 7C — Questions and Settings (Disclosable Bundles, Phase 7)
+
+Seeds through `mutate` on `~/Test`: `Ask Page` and `Ask Gone` in Set Alpha and Set `Ask Set` in Collection A, each deleted into the Trash; `Ask Arc` in Set Alpha and Set `Ask Shelf` in Collection A (holding `Ask Inside`), each archived; a Link property `Drive Link` added to Collection A, and `Link Target` and `Link Holder` in Set Alpha, `Link Holder`'s `Drive Link` set to `[[Link Target]]` through `setProperty`. Each setting is pressed through its switch in Settings › Files & Links. The group saves `confirmDeletion`, `permanentDelete`, and `restoreLinksOnDeletion` from `settings.json`'s personalization at its start and writes each back at its end, an absent key as `null`; with `permanentDelete` on it empties what it seeded, deletes `Drive Link` and empties its bundle, and removes the empty chain folders it left; the harness restores `~/Test` when the run ends.
+
+| Check | Decision | Asserts |
+| --- | --- | --- |
+| a Trash Delete's question follows Permanently Delete, and Escape, an outside press, and Cancel each keep the bundle | K-4, K-5 | DOM and disk: a press on `Permanently Delete Files` writes `permanentDelete: true`; `Ask Page`'s `Delete` asks `Delete “Ask Page”?`, detail `It will be erased from this computer. This cannot be undone.`; Escape, a press outside the panel, and Cancel each close the question with the bundle standing; the switch pressed off removes the key, and the question's detail reads `It will move to your system trash, which is where you would get it back from.`; with the switch on again, `Ask Gone`'s `Delete` and the question's Delete remove its bundle, `Ask Page`'s still standing, and the label reads `Deleted “Ask Gone”` with no button |
+| Enter in a Trash Delete's question cancels it, keeping the bundle | — (current behavior) | DOM and disk: Enter in `Ask Page`'s question closes it with the bundle standing |
+| Enter in an Archive Delete's question answers Delete, and its Undo returns the page to the Archive | — (current behavior) | DOM and disk: `Ask Arc`'s `Delete` asks `Delete “Ask Arc”?`; Enter mints a `.trash/Collection A/Set Alpha/<stamp>__Ask Arc.md.deleted` bundle and shows `Deleted “Ask Arc”Undo`; after Undo the Archive bundle is back and the Trash bundle gone |
+| with Confirm Before Deletion off, an Archive page's Delete asks nothing, while an Archive Set's still asks | I-2, K-5 | DOM and disk: a press on `Confirm Before Deletion` writes `confirmDeletion: false`; `Ask Arc`'s `Delete` raises no `alertdialog` for 1500 ms and shows `Deleted “Ask Arc”Undo`, whose Undo returns it to the Archive; `Ask Shelf`'s `Delete` asks `Delete “Ask Shelf”?`, its Delete moves it into the Trash with `Deleted “Ask Shelf”Undo`, and its Undo returns it to the Archive |
+| with Confirm Before Deletion off, the Trash's Delete still asks | — (current behavior) | DOM and disk: in Settings › Trash, `Ask Set`'s `Delete` asks `Delete “Ask Set”?`; Cancel keeps the bundle; the switch pressed on again removes the key |
+| a batch of a page and a Set reads Items in the bar and in both questions | G-6, K-4 | DOM and disk: `Ask Arc` (row) and `Ask Shelf` (box) checked, the face reads `Restore2 Items`; the bar's Delete asks `Delete these 2 Items?`, then Cancel, both bundles standing; in Settings › Trash, `Ask Page` and `Ask Set` checked, `Delete All` asks `Delete these 2 Items?`, then Cancel, both bundles standing |
+| Restore Links On Deletion puts a restored page back into the Link values that named it, and off leaves them removed | F-2 | disk: `Link Target` deleted through `mutate` leaves `Link Holder` without `Drive Link`; its Trash `Restore` returns `Drive Link: [[Link Target]]` to `Link Holder`; a press on `Restore Links On Deletion` writes `restoreLinksOnDeletion: false`; deleted and restored again, `Link Holder` holds no `Drive Link` for 1500 ms; the switch pressed on again removes the key |
+| the group leaves Set Alpha, Collection A, its Archive, and the Trash as it found them | — | start-of-group values: Set Alpha's `page_order`, Collection A's `set_order`, the Trash's `bundles:list` length, what `.nexus/archive/<A id>/` holds, the registry's property ids, the three keys, and which chain folders exist |
+
+#### Group 7D — Single and Homeless Rows (Disclosable Bundles, Phase 7)
+
+Seeds through `mutate` on `~/Test`: Collection `Whole Coll` holding `Whole Page`, deleted; `Live Page` in Set Alpha, deleted; Set `Stray Set` in Collection A holding `Stray Page` and `Stray Two`, both deleted, then the Set, so both pages list homeless; Context `Drive Ctx` holding Spaces `Drive Spc` and `Drive Spc Two`, both deleted, then the Context; a Select property `Drive Prop` added to Collection A and deleted; Collection `Part Coll` holding `Part Page`, deleted, its bundle's `_record.json` then written from outside with `"partial": true`; Set `Arc Gone Set` in Collection A holding `Arc Lost`, the page archived and then the Set deleted; `Squat One`, `Squat Two`, and `Squat Arc` in Set Alpha, the first two deleted and the third archived, each then shadowed by a task-marked squatter at its old path, as group 2 seeds `AR Squat`; and `Dup Page` and `Dup Fine` in Set Alpha, both deleted, then `Dup Twin.md` written from outside beside them carrying `Dup Page`'s `ID`, so its restore is refused as id-live. `permanentDelete` turns on before Settings › Trash opens. The group empties every bundle it made, removes the squatters from outside, deletes and empties `Dup Twin` and what it restored, writes `permanentDelete` back, and removes the empty chain folders it left; the harness restores `~/Test` when the run ends.
+
+| Check | Decision | Asserts |
+| --- | --- | --- |
+| a trashed Collection's Restore returns it whole and posts its title | E-2, A-3 | DOM and disk: `Whole Coll`'s `Restore` lands `Whole Coll/Whole Page.md` with its seeded `ID`, `order.collections` reads as it did before the delete, less `Part Coll`, the row leaves, and the label reads `Restored “Whole Coll”` with no button |
+| a trashed Collection's Delete asks by its title, empties it, and posts its title | K-4 | DOM and disk: `Whole Coll` deleted again through `mutate`; its `Delete` asks `Delete “Whole Coll”?`; after Delete its bundle and its Archive are gone and the label reads `Deleted “Whole Coll”` with no button |
+| a resolving row's trail reads live, a homeless one's reads historical, and the homeless page restores through Restore ▸ | Trails, Homeless Items | native rows, DOM, and disk: `Live Page`'s `.bundle-trail` reads `Collection A`, `Set Alpha` in a `normal` font style; `Stray Two`'s reads `Collection A`, `Stray Set` in `italic`; its menu's `Restore` is a submenu, and `Restore` › `Collection B` lands `Collection B/Stray Two.md` |
+| a Context, a Space, and a property list as single rows that check on a click | Single Rows | DOM: `Drive Ctx`, `Drive Spc`, and `Drive Prop` carry no `aria-expanded`, no `[data-drop-outline]`, and no `.row-chevron`; a row click checks each; a double-click on `Drive Prop`'s title leaves it checked and opens nothing; `Drive Prop`'s glyph is the Select type's `svg.lucide-send`; all unchecked after |
+| a homeless Space restores into the Context picked | Homeless Items | native rows and disk: `Drive Spc Two`'s `Restore` submenu reads the registry's Contexts in order and no Collection; `Restore` › `Areas` lands `.nexus/contexts/Areas/Drive Spc Two/` |
+| a batch of a homeless page and a homeless Space asks once per kind, and dismissing the second restores nothing | Batch Restore | native rows and disk: with `Stray Page` and `Drive Spc` checked, `Restore All` pops a container ask and a Context ask, one each; the first answered and the second dismissed leave both rows listed and nothing landed for 1500 ms; a second `Restore All` answering `Collection B` and `Areas` lands both, and the label reads `Restored 2 Items` |
+| a Context's and a property's Restore return them to the registry and post their titles | Single Rows, E-2 | disk and DOM: `Drive Ctx`'s `Restore` lists it in `contexts.json` and the label reads `Restored “Drive Ctx”`; `Drive Prop`'s `Restore` returns its id to the registry and the label reads `Restored “Drive Prop”`; each row leaves |
+| a property's Delete asks by its name, empties it, and posts its name | K-4 | DOM and disk: `Drive Prop` deleted again through `mutate`; its `Delete` asks `Delete “Drive Prop”?`; after Delete its bundle is gone and the label reads `Deleted “Drive Prop”` |
+| a partly recorded bundle marks its row and its inner rows, and an inner restore warns under the page's own title | Partial Mark | DOM and disk: `Part Coll`'s row holds `[aria-label="Recorded Partly"]`; disclosed, `Part Page`'s row holds one too; its `Restore` › `Collection B` lands `Collection B/Part Page.md` and the alert holds `“Part Page” was recorded partly, so some of what it held may not come back.` |
+| a Restore All counts the row it couldn't restore | E-4 | DOM and disk: with `Dup Page` and `Dup Fine` checked, `Restore All` lands `Dup Fine` and leaves `Dup Page`'s bundle standing and its row listed, and the label reads `Restored 1 Page. 1 Page couldn’t be restored.` |
+| an archived page whose Set is gone restores through Restore ▸, and its Undo puts it back exactly as it was archived | Homeless Items, Trails, Undo | native rows, DOM, and disk: in Collection A's archive, `Arc Lost`'s trail reads `Collection A`, `Arc Gone Set` in `italic`; `Restore` › `Collection A` lands `Collection A/Arc Lost.md` and shows `Restored “Arc Lost”Undo`; after Undo, `bundles:list` names the same bundle address holding `Arc Lost.md`, its `_record.json` byte-equal to before, the file gone from the Collection, and the row homeless again with its italic trail |
+| a restore onto an outside file steps aside, the Archive's with an Undo that puts it back exactly as it was archived, and a Trash batch's counted | E-4 | DOM and disk: in the Trash, `Squat One` and `Squat Two` checked and `Restore All` land both `(2)` copies, the squatters' bytes holding, and the label reads `Restored 2 Pages2 Renamed`; in the Archive, `Squat Arc`'s `Restore` lands `Squat Arc (2).md`, the squatter's bytes holding, and shows `Restored “Squat Arc” as “Squat Arc (2)”Undo`, whose Undo leaves `bundles:list` naming the same bundle leaf and stamp holding `Squat Arc.md`, its `_record.json` byte-equal to before, and no `Squat Arc (2).md` anywhere in the Nexus |
+| the group leaves Collections A and B, the Contexts, the registry, the Archive, and the Trash as they were | — | start-of-group values: `state.json`'s `order.collections`, Collection A's `set_order`, Set Alpha's and Collection B's `page_order`, `contexts.json`, the registry's property ids, the Trash's `bundles:list` length, what `.nexus/archive/<A id>/` holds, `permanentDelete`, and which chain folders exist |
+
 #### Pruned
 
 - **The write order, a case-only rename, the single watcher restart, nesting, an entry naming no folder, and the corrupt-settings refusals:** none is visible, and `mutate.test.ts` and `settings.test.ts` pin each.
@@ -153 +234 @@ Seeds through `mutate` on `~/Test`, each archived through `mutate`'s `archive` a
 - **A delete under the system Trash Mode naming the system trash in group 5:** the Trash Mode is device configuration the harness doesn't write; `confirmations.test.ts` pins the detail.
 - **The archive timeframe's sweep in group 6A:** the snapshot store is device-local and a snapshot's age can't be driven without faking time; `fileHistory.test.ts` and the store contract pin the sweep.
 - **The archive refusal in group 6A:** `Only pages and Sets inside a Collection can be archived.` needs an item no Collection owns, or a Collection whose id is missing or isn't a safe path segment, which no menu offers and nothing in-app writes; `archive.test.ts` pins its copy, and the menu reaches it through `mutate`'s `reportRefusal`.
+- **Emptying with Permanently Delete off in group 7C:** the bundle's artifact leaves for the macOS Trash, which the drive can't put back; 7C drives the question's off-copy and its Cancel, and `spend.test.ts` (`hands the artifact to the system trash and removes the spent bundle behind it`) pins the handoff.
+- **Try Again on an owed restore or empty in groups 7B to 7D:** it needs a host write that fails mid-op; `TrashFrame.test.tsx` pins Try Again on an owed restore, an owed batch restore, and an owed batch empty.
+- **`didn’t get its value back` in a restore's notice:** it needs a value the restore can't re-spell; `spend.test.ts` and `restoreProperty.test.ts` pin the reply's `unrestored` titles, and no test names the line the notice composes from them.
+- **`N couldn’t be deleted.` in group 7D:** an empty refuses only a bundle whose artifact is gone, which the listing already skips, so no listed row refuses; `TrashFrame.test.tsx` (`counts the rows a Delete All couldn’t empty in its notice`) pins the line.
+- **`The trash couldn't be read.` and `The archive couldn't be read.`:** they need `bundles:list` to refuse; `TrashFrame.test.tsx` and `ArchiveView.test.tsx` pin each line.
+- **`Trash is empty.`:** emptying `~/Test`'s whole Trash spends bundles the group can't put back, so its closing check couldn't hold; `TrashFrame.test.tsx` pins the line.
+- **A Nexus switch mid-batch:** the harness opens one Nexus; `TrashFrame.test.tsx` and `ArchiveView.test.tsx` pin the stop.
+- **A hand-made, dateless bundle sorting last with an empty date cell:** a bundle name the app never writes; `rows.test.ts` pins its order.
+- **Two bar presses in one tick act once:** two DevTools presses can't land inside one tick; `ArchiveView.test.tsx` pins the drop.
+- **A bar press after a re-list dropped its rows, and a reply landing after its container closed:** reply-order races the drive can't schedule; `ArchiveView.test.tsx` and `browser.test.ts` pin each.
+- **A remount returning a long archive to its scroll:** the remount waits on the Active Tab Cache evicting the host, which the harness doesn't drive; `ArchiveView.test.tsx` pins it.
+- **The asset folder kept out of an inner listing:** a listing rule beside Excluded Folders, which group 7 drives, and seeding it needs `asset_directory` written inside a bundle's origin; `bundle.test.ts` pins it.
+- **The reader window's resize and move:** `WindowBase`'s shared geometry, with no Archive branch; `useResizable.test.tsx` pins it.
```
