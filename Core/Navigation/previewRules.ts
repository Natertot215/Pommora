// The rules judge what the tree already holds, so routing a click costs no read.

import { identityOf } from '../Contexts/contextIdentity'
import { entityMemo, type NexusTree } from '../Nexus/tree'
import { contextPaneTargets, FILEDATA_TARGETS, type PaneTarget } from '../Views/paneTargets'
import { containerAt } from '../Nexus/treePatch'
import { relDirname } from '../Paths/posix'
import { settingOf } from '../Settings/personalization'
import { filtering } from '../Views/filterRules'
import { prepareGroup } from '../Views/Pipeline/filter'
import { toRow } from '../Views/Pipeline/group'
import { pageValuesOf } from '../Views/viewRow'

const previewTestOf = entityMemo(
  [(t) => t.config.personalization.openInPreview, (t) => t.contexts],
  (tree) => {
    const rules = settingOf(tree.config.personalization, 'openInPreview')
    return filtering(rules)
      ? prepareGroup(rules.rules, [], tree.collections, identityOf(tree))
      : undefined
  },
)

/** What the rules can judge from the tree alone, so Last Modified and registry properties stay out. */
export const previewTargets = (tree: NexusTree): PaneTarget[] => [
  FILEDATA_TARGETS.title,
  ...(tree.collections.length > 0 ? [FILEDATA_TARGETS.location] : []),
  FILEDATA_TARGETS.createdAt,
  ...contextPaneTargets(tree),
]

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
