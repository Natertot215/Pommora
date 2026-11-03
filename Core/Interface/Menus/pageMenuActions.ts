import { pageLinkText } from '../../Connections/connections'
import type { NexusTree } from '../../Nexus/tree'
import { relDirname, titleFromPath } from '../../Paths/posix'
import { containerTargets } from '../../Actions/destinationTree'
import { useSession } from '../../Session/store'
import { pageIndexOf } from '../../Nexus/record'
import { dialer } from '../../Platform/dialer'
import { confirmArchive, confirmDelete } from '../Confirm/confirmations'
import { popMenu } from '../../Actions/menuActions'
import {
  type NewPageRows,
  PAGE_ACTION_ROWS,
  type PageMoveContext,
  pageMenuItems,
} from '../../Actions/pageMenu'
import { type MetadataTarget, metadataBranches, PREFIX } from '../../Actions/metadataMenu'
import { isOpenInTabs } from '../../Navigation/tabsModel'
import { chooseIcon } from '../../Assets/IdentityChoice'
import { contextIdsOf } from '../../Contexts/contextIdentity'
import { pickKindOf } from '../../Properties/properties'
import { checkboxValue } from '../../Properties/propertyValue'
import { pickedValue } from '../../Properties/Pickers/pickModel'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { resolveColumn } from '../../Views/Pipeline/columns'

export function pageMoveContext(tree: NexusTree | null, path: string): PageMoveContext {
  return {
    moveTargets: containerTargets(tree),
    currentParentPath: relDirname(path),
  }
}

/** The verbs every Nexus file and folder answers by its path alone; returns false for any other. */
export function runPathAction(action: string, path: string): boolean {
  switch (action) {
    case 'title:copypath':
      void dialer().ask('path:copy', path)
      return true
    case 'title:reveal':
      void dialer().ask('path:reveal', path)
      return true
    default:
      return false
  }
}

/** Every page verb no one host owns; returns false for an action the caller keeps. */
export function runPageAction(
  action: string,
  page: { id: string; path: string; title?: string; heading?: string },
): boolean {
  const s = useSession.getState()
  const { id, path, title = titleFromPath(path) } = page
  const ref = { kind: 'page', id, path } as const
  if (action.startsWith('move:')) {
    void s.mutate({ op: 'movePage', path, newParentPath: action.slice(5) })
    return true
  }
  if (runPathAction(action, path)) return true
  switch (action) {
    case 'title:window':
      s.openWindowTab(ref, { heading: page.heading })
      return true
    case 'title:newtab':
      void s.select(ref, { newTab: true, heading: page.heading })
      return true
    case 'title:copylink':
      void dialer().ask(
        'clipboard:write',
        pageLinkText(
          { title: s.tree ? pageIndexOf(s.tree).writtenName(path) : title, heading: page.heading },
          'wiki',
        ),
      )
      return true
    case 'title:history':
      s.openReader({ kind: 'history', page: ref })
      return true
    case 'title:archive':
      void confirmArchive({ path, kind: 'page', title })
      return true
    case 'title:delete':
      void confirmDelete({ path, kind: 'page', title })
      return true
    default:
      return false
  }
}

export function runMetadataAction(
  action: string,
  { row, schema, rowOf, commit, trigger, styleOf }: MetadataTarget,
): boolean {
  if (!action.startsWith(PREFIX)) return false
  const [id, ...rest] = action.slice(PREFIX.length).split(':')
  const value = rest.length > 0 ? rest.join(':') : null
  const s = useSession.getState()
  const column = resolveColumn(id, schema, contextIdsOf(s.tree))
  // The property can leave between the menu opening and the pick; the pick then writes nothing.
  if (!column) return true
  const pick = pickKindOf(column.type)
  if (value === null) s.requestPick({ rowOf, column, trigger, commit, style: styleOf?.(column) })
  else if (column.type === 'checkbox') commit(column, checkboxValue(value === 'true'))
  else if (pick) commit(column, pickedValue(pick, resolveFieldValue(row, column), value))
  return true
}

export async function popPageActions(
  page: { id: string; path: string; title?: string },
  rename: () => void,
): Promise<void> {
  const action = await popMenu(PAGE_ACTION_ROWS)
  if (action === 'title:rename') rename()
  else if (action) runPageAction(action, page)
}

interface PageMenuHost {
  trigger: HTMLElement | null
  rename: () => void
  newPage?: { rows: NewPageRows; create: (where: 'above' | 'below') => void }
  editImage?: () => void
  values: MetadataTarget | null
}

export async function showPageMenu(
  page: { id: string; path: string; title: string },
  { trigger, rename, newPage, editImage, values }: PageMenuHost,
): Promise<void> {
  const { tree, tabs, pinned, mutate } = useSession.getState()
  const action = await popMenu(
    pageMenuItems({
      ...pageMoveContext(tree, page.path),
      alreadyOpen: isOpenInTabs(tabs, pinned, { kind: 'page', id: page.id, path: page.path }),
      newPages: newPage?.rows,
      editImage: editImage !== undefined,
      metadata: values ? metadataBranches(values, tree) : undefined,
    }),
  )
  if (!action || (values && runMetadataAction(action, values)) || runPageAction(action, page))
    return
  switch (action) {
    case 'title:rename':
      return rename()
    case 'title:icon':
      return chooseIcon(
        trigger,
        tree?.config.pageMetadata[page.id]?.icon,
        (icon) => void mutate({ op: 'setIcon', path: page.path, kind: 'page', icon }),
      )
    case 'title:newabove':
      return newPage?.create('above')
    case 'title:newbelow':
      return newPage?.create('below')
    case 'image:edit':
      return editImage?.()
  }
}
