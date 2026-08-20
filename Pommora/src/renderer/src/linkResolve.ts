// The nexus's page index, read live rather than captured. A Link property's paste gate runs on a
// user gesture and must see the tree as it stands — a page created moments ago resolves, where a
// resolver closed over a memoized render context would still deny it.

import { isCommittableLink, type ResolveTitle } from '@shared/linkValue'
import { useSession } from './store'
import { resolveConnection } from './treeIndex'

export const resolveTitle: ResolveTitle = (rawTitle) =>
  resolveConnection(useSession.getState().tree, rawTitle)?.title ?? null

/** The field's live "not a valid value yet" cue, bound to the same resolver the commit uses — a
 *  connection that would commit must not read as invalid while it is being typed. */
export const validateLink = (text: string): boolean => isCommittableLink(text, resolveTitle)
