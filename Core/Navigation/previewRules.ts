// The rules judge what the tree already holds, so routing a click costs no read.

import { contextIdsOf } from '../Contexts/contextIdentity'
import { entityMemo, type NexusTree } from '../Nexus/tree'
import { containerAt } from '../Nexus/treePatch'
import { relDirname } from '../Paths/posix'
import { settingOf } from '../Settings/personalization'
import { filtering } from '../Views/filterRules'
import { prepareGroup } from '../Views/Pipeline/filter'
import { toRow } from '../Views/Pipeline/group'
import { pageValuesOf } from '../Views/pageValues'

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
  return test(
    toRow(page, folder.id, { [id]: pageValuesOf(id, {}, null) }, tree.config.pageMetadata),
  )
}
