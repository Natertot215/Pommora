// Read live rather than captured: the paste gate runs on a user gesture and must see the tree as it stands, where a resolver closed over a memoized render context would deny a page created moments ago.

import { isCommittableLink, type ResolveTitle } from '@pommora/core/Connections/linkValue'
import { useSession } from '../../Session/store'
import { resolveConnection } from '../../Session/treeIndex'

export const resolveTitle: ResolveTitle = (rawTitle) =>
  resolveConnection(useSession.getState().tree, rawTitle)?.title ?? null

export const validateLink = (text: string): boolean => isCommittableLink(text, resolveTitle)
