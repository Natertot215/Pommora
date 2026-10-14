// The rules judge what the tree already holds, so routing a click costs no read; a rule on a page's own properties would load its values first.

import { localIso } from '@pommora/uix/Utilities/pad'
import { contextIdsOf } from '../Contexts/contextIdentity'
import { ID_KEY } from '../Nexus/identityMark'
import { idTime } from '../Nexus/ids'
import { entityMemo, type NexusTree } from '../Nexus/tree'
import { containerAt } from '../Nexus/treePatch'
import { relDirname } from '../Paths/posix'
import { settingOf } from '../Settings/personalization'
import { filtering } from '../Views/filterRules'
import { prepareGroup } from '../Views/Pipeline/filter'
import { toRow } from '../Views/Pipeline/group'

const previewTestOf = entityMemo(
  [(t) => t.config.personalization.openInPreview, (t) => t.contexts],
  (tree) => {
    const rules = settingOf(tree.config.personalization, 'openInPreview')
    return filtering(rules)
      ? prepareGroup(rules.rules, [], tree.collections, contextIdsOf(tree))
      : undefined
  },
)

export function opensInPreview(
  tree: NexusTree,
  { id, path }: { id: string; path: string },
): boolean {
  const test = previewTestOf(tree)
  if (!test) return false
  const folder = containerAt(tree, relDirname(path))
  const page = folder?.pages.find((p) => p.id === id)
  if (!folder || !page) return false
  const created = {
    frontmatter: { [ID_KEY]: id },
    createdAt: localIso(idTime(id)),
    modifiedAt: null,
  }
  return test(toRow(page, folder.id, { [id]: created }, tree.config.pageMetadata))
}
