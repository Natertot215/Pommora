// Per-kind native context menu for a sidebar entity. The renderer captures the right-click
// and hands main a ContextTarget; main pops a native Menu whose items run main-side
// (handleMutate / a native confirm / Finder), then signals the renderer to refetch on change.
// Rename is intentionally absent here — it needs an inline rename in the renderer.

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
import { pageMenuTemplate } from './pageMenu'
import type { ContextTarget, Creator, MutableKind, MutateRequest } from '@shared/mutate'
import { readNexusLabels } from './readNexus'

/** The "New …" creators a container offers; pages + Spaces + the legacy area/topic/project
 *  kinds offer none. Collections and Sets route through the shared rule, so this menu and the
 *  subfield's add button can't come to offer different things inside the same container. A Context
 *  group offers "New <Singular>" — resolved from the registry by the folder's title. */
async function creatorsFor(
  root: string,
  kind: MutableKind,
  parentPath: string,
): Promise<Creator[]> {
  switch (kind) {
    case 'collection':
    case 'set':
      return containerCreators(kind, parentPath, await readNexusLabels(root))
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
 *  fires after any mutation so the renderer refetches its tree. */
export async function showContextMenu(
  win: BrowserWindow,
  target: ContextTarget,
  deps: MutateDeps,
  onChanged: () => void,
): Promise<void> {
  const root = sessionRoot()
  if (root === null) return

  const run = async (req: MutateRequest): Promise<void> => {
    const res = await handleMutate(req, deps)
    if (res.ok) {
      onChanged()
      // A create lands in its rename field — same contract as the renderer's own create menus.
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

  const confirmDelete = async (): Promise<void> => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Delete', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: `Delete “${target.title}”?`,
      detail:
        deps.trashMode === 'system'
          ? 'It will be moved to the system Trash.'
          : 'It will be moved to the nexus’s .trash folder (recoverable).',
    })
    if (response === 0) await run({ op: 'delete', path: target.path, kind: target.kind })
  }
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
      case 'title:preview':
        return push(win, 'open-in-preview', target)
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
      case 'title:reveal':
        return reveal()
      case 'title:delete':
        return confirmDelete()
    }
  }

  // A page's menu is the shared one, whole: `pageMetaMenuItems` is where the page actions and their
  // order live, so this menu and the ones the table, the cards and the row grips pop can't drift.
  // Every other kind builds below — containers offer creators and no page meta, which is a different
  // menu rather than a subset of this one.
  if (target.kind === 'page') {
    items.push(
      ...pageMenuTemplate(
        pageMetaMenuItems(target.alreadyOpen, {
          preview: true,
          newPages: 'pair',
          move: offersMove(target),
          clipboard: true,
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
      label: target.alreadyOpen ? 'Open' : 'Open New Tab',
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

  items.push({ label: 'Delete', click: () => void confirmDelete() })
  items.push({ type: 'separator' })
  items.push({ label: 'Reveal Location', click: () => void reveal() })

  // Resolve on dismissal, not at pop — a fire-and-forget caller ignores it, but a surface
  // holding a hover affordance down (the ghost's suppress) needs the close to release it.
  await new Promise<void>((resolve) => {
    Menu.buildFromTemplate(items).popup({ window: win, callback: resolve })
  })
}
