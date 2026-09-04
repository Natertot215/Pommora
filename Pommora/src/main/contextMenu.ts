// Per-kind native context menu for a sidebar entity. The renderer captures the right-click and
// hands main a ContextTarget; main pops a native Menu whose items run main-side (handleMutate /
// Finder), then signals the renderer to refetch on change. Rename and Delete are intentionally
// absent from that main-side set — one needs an inline rename in the renderer, the other the
// renderer's confirmation.

import { Menu, clipboard, dialog, shell } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { push } from './ipc'
import { sessionRoot } from './session'
import { resolveUnderRoot } from './pathSafety'
import { handleMutate, type MutateDeps } from './mutate'
import { readRegistryStrict } from './contextsRegistry'
import { createSpaceLabel } from '@shared/contexts'
import { containerCreators } from '@shared/mutate'
import {
  offersMove,
  pageLinkText,
  pageMetaMenuItems,
  pagePathText,
  type PageMetaAction,
  type PageMoveAction,
} from '@shared/pageMenu'
import { rowTemplate } from './rowMenu'
import type { ContextTarget, Creator, MutableKind, MutateRequest } from '@shared/mutate'
import { openLabel } from '@shared/toggleLabels'

/** The "New …" creators a container offers; pages + Spaces + the legacy area/topic/project
 *  kinds offer none. Collections and Sets route through the shared rule so this menu and the
 *  subfield's add button can't drift. A Context group offers "New <Singular>", resolved from
 *  the registry by the folder's title. */
async function creatorsFor(
  root: string,
  kind: MutableKind,
  parentPath: string,
): Promise<Creator[]> {
  switch (kind) {
    case 'collection':
    case 'set':
      return containerCreators(kind, parentPath)
    case 'context': {
      const reg = await readRegistryStrict(root)
      const def = reg.ok
        ? reg.value.contexts.find((c) => c.title === basename(parentPath))
        : undefined
      if (!def) return []
      const label = createSpaceLabel(def)
      return [{ label, req: { op: 'createSpace', contextId: def.id, name: label } }]
    }
    default:
      return [] // page, space, area, topic, project
  }
}

/** Build + pop the native context menu for `target`, applying actions main-side. `onChanged`
 *  fires after any successful mutation, carrying what ran so the caller can confirm the
 *  live tree the way every renderer-driven mutation is confirmed. */
export async function showContextMenu(
  win: BrowserWindow,
  target: ContextTarget,
  deps: MutateDeps,
  onChanged: (req: MutateRequest, reply: { created?: { id: string; path: string } }) => void,
): Promise<void> {
  const root = sessionRoot()
  if (root === null) return

  const run = async (req: MutateRequest): Promise<void> => {
    const res = await handleMutate(req, deps)
    if (res.ok) {
      onChanged(req, res.value)
      // A create lands in its rename field, same as the renderer's own create menus.
      if (res.value.created)
        push(win, 'begin-rename', { path: res.value.created.path, create: true, host: target.host })
    } else
      await dialog.showMessageBox(win, {
        type: 'error',
        message: 'Couldn’t complete that action.',
        detail: res.error.message,
      })
  }

  const items: MenuItemConstructorOptions[] = []

  // target.path is renderer-supplied, so it resolves through the root guard — an unguarded join
  // would let `..` reveal a file outside the nexus.
  const reveal = async (): Promise<void> => {
    const r = await resolveUnderRoot(root, target.path)
    if (r.ok) shell.showItemInFolder(r.value)
  }

  /** One page action → what it does. Renderer-side work (a tab, a naming field, a picker, a
   *  sibling's position) travels as a push, because only the renderer holds the tab set and the
   *  sibling order; the rest lands here. */
  const runPageAction = async (action: PageMetaAction | PageMoveAction): Promise<void> => {
    if (action.startsWith('move:'))
      return run({ op: 'movePage', path: target.path, newParentPath: action.slice(5) })
    switch (action as PageMetaAction) {
      case 'title:window':
        return push(win, 'open-in-window', target)
      case 'title:newtab':
        return push(win, 'open-in-new-tab', target)
      case 'title:rename':
        return push(win, 'begin-rename', { path: target.path, host: target.host })
      case 'title:icon':
        return push(win, 'begin-icon', { path: target.path, host: target.host })
      case 'title:newabove':
        return push(win, 'new-page-adjacent', {
          path: target.path,
          where: 'above',
          host: target.host,
        })
      case 'title:newbelow':
        return push(win, 'new-page-adjacent', {
          path: target.path,
          where: 'below',
          host: target.host,
        })
      case 'title:moveto':
        return
      case 'title:copylink':
        return clipboard.writeText(pageLinkText(target.title))
      case 'title:copypath':
        return clipboard.writeText(pagePathText(target.path))
      case 'title:history':
        return push(win, 'open-history', target)
      case 'title:reveal':
        return reveal()
      case 'title:delete':
        return push(win, 'confirm-delete', target)
    }
  }

  // A page's menu is the shared one, whole: `pageMetaMenuItems` is where the page actions and their
  // order live, so this menu and the ones the table, the cards and the row grips pop can't drift.
  // Every other kind builds below — containers offer creators and no page meta, which is a different
  // menu rather than a subset of this one.
  if (target.kind === 'page') {
    items.push(
      ...rowTemplate(
        pageMetaMenuItems(target.alreadyOpen, {
          window: true,
          newPages: 'pair',
          move: offersMove(target),
          clipboard: true,
          history: true,
          reveal: true,
        }),
        (action) => () => void runPageAction(action),
        target,
      ),
    )
    await new Promise<void>((resolve) => {
      Menu.buildFromTemplate(items).popup({ window: win, callback: resolve })
    })
    return
  }

  // Open New Tab — the action runs renderer-side (only the renderer knows the tab set); an
  // already-open entity reads "Open" and the push-back focuses its tab.
  if (target.id) {
    items.push({
      label: openLabel(target.alreadyOpen),
      click: () => push(win, 'open-in-new-tab', target),
    })
    items.push({ type: 'separator' })
  }

  const creators = await creatorsFor(root, target.kind, target.path)
  for (const c of creators) items.push({ label: c.label, click: () => void run(c.req) })
  if (creators.length) items.push({ type: 'separator' })

  // Rename is inline in the renderer (native menus can't take text), so this only signals
  // the renderer to put the matching row into edit mode; the commit goes through mutate.
  items.push({
    label: 'Rename',
    click: () => push(win, 'begin-rename', { path: target.path, host: target.host }),
  })

  items.push({ label: 'Delete', click: () => push(win, 'confirm-delete', target) })
  items.push({ type: 'separator' })
  if (target.host === 'sidebar' && (target.kind === 'collection' || target.kind === 'set')) {
    items.push({
      label: target.disclosureLocked ? 'Unlock Folder' : 'Lock Folder',
      click: () =>
        void run({
          op: 'setDisclosureLock',
          path: target.path,
          kind: target.kind as 'collection' | 'set',
          locked: !target.disclosureLocked,
        }),
    })
  }
  items.push({ label: 'Reveal Location', click: () => void reveal() })

  // Resolve on dismissal, not at pop — a fire-and-forget caller ignores it, but a surface
  // holding a hover affordance down (the ghost's suppress) needs the close to release it.
  await new Promise<void>((resolve) => {
    Menu.buildFromTemplate(items).popup({ window: win, callback: resolve })
  })
}
