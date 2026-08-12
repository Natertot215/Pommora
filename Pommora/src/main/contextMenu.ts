// Per-kind native context menu for a sidebar entity. The renderer captures the right-click
// and hands main a ContextTarget; main pops a native Menu whose items run main-side
// (handleMutate / a native confirm / Finder), then signals the renderer to refetch on change.
// Rename is intentionally absent here — it needs an inline rename in the renderer.

import { Menu, dialog, shell } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { basename } from 'node:path'
import { push } from './ipc'
import { sessionRoot } from './session'
import { resolveUnderRoot } from './pathSafety'
import { handleMutate, type MutateDeps } from './mutate'
import { readRegistryStrict } from './contextsRegistry'
import { createSpaceLabel } from '@shared/contexts'
import { containerCreators } from '@shared/mutate'
import type { ContextTarget, Creator, MutableKind, MutateRequest } from '@shared/mutate'
import { readNexusLabels } from './readNexus'

/** The "New …" creators a container offers; pages + Spaces + the legacy area/topic/project
 *  kinds offer none. Collections and Sets route through the shared rule, so this menu and the
 *  subfield's add button can't come to offer different things inside the same container. A Context
 *  group offers "New <Singular>" — resolved from the registry by the folder's title. */
async function creatorsFor(root: string, kind: MutableKind, parentPath: string): Promise<Creator[]> {
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
        push(win, 'begin-rename', { path: res.value.created.path, create: true })
    } else
      await dialog.showMessageBox(win, {
        type: 'error',
        message: 'Couldn’t complete that action.',
        detail: res.error.message,
      })
  }

  const items: MenuItemConstructorOptions[] = []

  // Open New Tab — the action runs renderer-side (only the renderer knows the tab set); an
  // already-open entity reads "Open" and the push-back focuses its tab.
  if (target.id) {
    items.push({
      label: target.alreadyOpen ? 'Open' : 'Open New Tab',
      click: () => push(win, 'open-in-new-tab', target),
    })
    // Open Preview (page-only) — like Open New Tab, the action runs renderer-side.
    if (target.kind === 'page') {
      items.push({
        label: 'Open Preview',
        click: () => push(win, 'open-in-preview', target),
      })
    }
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

  // New Page Above / Below — the position is computed renderer-side, where the sibling order
  // lives; a partial page_order write would alphabetize the untouched siblings.
  if (target.kind === 'page') {
    items.push(
      { type: 'separator' },
      {
        label: 'New Page Above',
        click: () => push(win, 'new-page-adjacent', { path: target.path, where: 'above' }),
      },
      {
        label: 'New Page Below',
        click: () => push(win, 'new-page-adjacent', { path: target.path, where: 'below' }),
      },
      { type: 'separator' },
    )
  }

  items.push({
    label: 'Delete',
    click: async () => {
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
    },
  })

  items.push({ type: 'separator' })
  items.push({
    label: 'Reveal in Finder',
    // Validate through resolveUnderRoot — target.path is renderer-supplied, and an
    // unguarded join(root, path) would let `..` reveal files outside the nexus.
    click: async () => {
      const r = await resolveUnderRoot(root, target.path)
      if (r.ok) shell.showItemInFolder(r.value)
    },
  })

  Menu.buildFromTemplate(items).popup({ window: win })
}
