import { Menu, clipboard, dialog, shell } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { push } from '../Bridge/ipc'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { resolveUnderRoot } from '@pommora/core/Locations/pathSafety'
import { handleMutate, type MutateDeps } from '@pommora/core/Nexus/mutate'
import { readRegistryStrict } from '@pommora/core/Contexts/contextsRegistry'
import { createSpaceLabel } from '@pommora/core/Properties/contexts'
import { containerCreators } from '@pommora/core/Pages/mutateRequest'
import {
  offersMove,
  pageLinkText,
  pageMetaMenuItems,
  pagePathText,
  type PageMetaAction,
  type PageMoveAction,
} from '@pommora/core/Actions/pageMenu'
import { rowTemplate } from './rowMenu'
import type {
  ContextTarget,
  Creator,
  MutableKind,
  MutateRequest,
} from '@pommora/core/Pages/mutateRequest'
import { openLabel } from '@pommora/core/Actions/toggleLabels'

/** Routed through the shared rule so this menu and the subfield's add button can't drift. */
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

/** `onChanged` carries what ran, so the caller confirms the live tree as any mutation is confirmed. */
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

  // Renderer-supplied: an unguarded join would let `..` reveal a file outside the nexus.
  const reveal = async (): Promise<void> => {
    const r = await resolveUnderRoot(root, target.path)
    if (r.ok) shell.showItemInFolder(r.value)
  }

  /** Renderer-side work travels as a push: only the renderer holds the tab set and the sibling order. */
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

  // The shared model, whole, so it can't drift from the ones the table, cards and grips pop.
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

  // Only the renderer knows the tab set; an already-open entity reads "Open" and focuses its tab.
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

  // Native menus can't take text, so this only opens the renderer's inline field.
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

  // Resolve on dismissal, not at pop: a surface holding a hover affordance down needs the close to release it.
  await new Promise<void>((resolve) => {
    Menu.buildFromTemplate(items).popup({ window: win, callback: resolve })
  })
}
