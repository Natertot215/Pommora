import { reportRefusal } from '@pommora/core/Interface/Notifications/notifications'
import {
  DEFAULT_NEW_NAME,
  type MutateRequest,
  type RenameHost,
  type RenameKind,
} from '@pommora/core/Nexus/mutateRequest'
import { contextDirRel } from '@pommora/core/Paths/nexusPaths'
import { normalizePropertyName } from '@pommora/core/Properties/properties'
import { orderWithSlot, placeNew } from '../Views/creationOrder'
import { createSpaceLabel } from '@pommora/core/Contexts/contexts'
import { findContainerWhere } from '../Nexus/treePatch'
import { relDirname } from '@pommora/core/Paths/posix'
import type { Slice } from './sessionState'
import { host } from '../Platform/dialer'
import { flushAllSaves } from './nexusSlice'

interface RenameClaim {
  token: number
  path: string
  host: RenameHost
}
interface RenameFence {
  renamingPath: string | null
  renamingHost: RenameHost | null
}

export interface RenameSlice {
  renamingPath: string | null
  /** A newborn's naming session: the field opens empty and its first commit rides the create. */
  renamingCreate: boolean
  /** The gesture-declared field host, when the caller knew its surface; null resolves by rank. */
  renamingHost: RenameHost | null
  /** The owner fence: hosts claim on mount, one wins (declared, then rank, then first-come). */
  renameClaims: RenameClaim[]
  renameWinner: number | null
  claimRename: (path: string, host: RenameHost) => number | null
  releaseRename: (token: number) => void
  beginRename: (path: string, create?: boolean, host?: RenameHost) => void
  cancelRename: () => void
  submitRename: (path: string, kind: RenameKind, newName: string) => Promise<boolean>
  iconPath: string | null
  iconHost: RenameHost | null
  beginIcon: (path: string, host?: RenameHost) => void
  endIcon: () => void
  colorPath: string | null
  colorHost: RenameHost | null
  beginColor: (path: string, host: RenameHost) => void
  endColor: () => void
  /** A one-shot landed-here pulse; a disclosure-locked folder briefly reveals only that child. */
  peekSignal: { parentPath: string; childId: string; nonce: number } | null
  signalPeek: (parentPath: string, childId: string) => void
  /** The sidebar's New Page Above/Below — position computed here, where the sibling order lives. */
  newPageAdjacent: (path: string, where: 'above' | 'below', host?: RenameHost) => Promise<void>
  newSpaceAdjacent: (id: string, where: 'above' | 'below', host?: RenameHost) => Promise<void>
  /** An unanchored create, placed by its kind's placement setting and named in place. */
  createNamed: (req: MutateRequest, host?: RenameHost) => Promise<void>
  newPage: () => Promise<void>
  renamingProperty: { collectionPath: string; propertyId: string } | null
  beginPropertyRename: (target: { collectionPath: string; propertyId: string }) => void
  cancelPropertyRename: () => void
  submitPropertyRename: (newName: string) => Promise<boolean>
  resetRename: () => void
}

let nextRenameToken = 1
// The unclaimed-session sweep's beat — long enough for a create's row to arrive and claim.
const RENAME_CLAIM_BEAT_MS = 2000
let renameOrphanTimer: number | undefined
const RENAME_RANK: Record<RenameHost, number> = { detail: 2, sidebar: 1, matrix: 3 }
const RENAME_CLEARED = {
  renamingPath: null,
  renamingCreate: false,
  renamingHost: null,
  renameWinner: null,
} satisfies Partial<RenameSlice>
const PER_NEXUS = {
  ...RENAME_CLEARED,
  renameClaims: [],
  iconPath: null,
  iconHost: null,
  colorPath: null,
  colorHost: null,
  peekSignal: null,
  renamingProperty: null,
} satisfies Partial<RenameSlice>

function resolveRenameWinner(claims: RenameClaim[], fence: RenameFence): number | null {
  const live = claims.filter((c) => c.path === fence.renamingPath)
  if (live.length === 0) return null
  const declared = live.find((c) => c.host === fence.renamingHost)
  if (declared) return declared.token
  let winner = live[0]
  for (const c of live) if (RENAME_RANK[c.host] > RENAME_RANK[winner.host]) winner = c
  return winner.token
}

export const createRenameSlice: Slice<RenameSlice> = (set, get) => ({
  ...PER_NEXUS,
  claimRename: (path, host) => {
    if (path !== get().renamingPath) return null
    const token = nextRenameToken++
    set((s) => {
      const renameClaims = [...s.renameClaims, { token, path, host }]
      return { renameClaims, renameWinner: resolveRenameWinner(renameClaims, s) }
    })
    return token
  },
  releaseRename: (token) => {
    const { renameClaims, renameWinner } = get()
    const released = renameClaims.find((c) => c.token === token)
    const wasWinner = renameWinner === token
    // Claims minted before this release are standing twins; only a later one is a remount.
    const rebirthFence = nextRenameToken
    set((s) => {
      const claims = s.renameClaims.filter((c) => c.token !== token)
      return { renameClaims: claims, renameWinner: resolveRenameWinner(claims, s) }
    })
    // A microtask, because StrictMode's simulated remount releases and re-claims in one act. A rename whose winning surface left is abandoned, never handed to a standing claimant.
    queueMicrotask(() => {
      const s = get()
      if (released === undefined || s.renamingPath !== released.path) return
      const survivor = s.renameClaims.find((c) => c.token === s.renameWinner)
      if (!survivor || (wasWinner && survivor.token < rebirthFence)) s.cancelRename()
    })
  },
  beginRename: (path, create, host) => {
    set((s) => {
      const fence: RenameFence = { renamingPath: path, renamingHost: host ?? null }
      return {
        ...fence,
        renamingCreate: create === true,
        renameWinner: resolveRenameWinner(s.renameClaims, fence),
      }
    })
    // Self-heals when nothing claims: a filtered-away newborn would strand an empty field.
    window.clearTimeout(renameOrphanTimer)
    renameOrphanTimer = window.setTimeout(() => {
      const s = get()
      if (s.renamingPath === path && !s.renameClaims.some((c) => c.path === path)) s.cancelRename()
    }, RENAME_CLAIM_BEAT_MS)
  },
  cancelRename: () => set(RENAME_CLEARED),
  submitRename: async (path, kind, newName) => {
    const fromCreate = get().renamingCreate && kind === 'page'
    set(RENAME_CLEARED)
    // Not a mutate op: the rename re-adopts the root and refuses every write until it lands, so saves flush first.
    if (kind === 'homepage') {
      await flushAllSaves()
      return reportRefusal(await host().ask('nexus:rename', newName))
    }
    // Registry entities rename by id: a bare folder rename strands every member's title key.
    if (kind === 'space' || kind === 'context') {
      const groups = get().tree?.contexts ?? []
      if (kind === 'space') {
        const sp = groups.flatMap((g) => g.spaces).find((s) => s.path === path)
        return sp ? get().mutate({ op: 'renameSpace', spaceId: sp.id, newName }) : false
      }
      const group = groups.find((g) => contextDirRel(g.def.title) === path)
      return group ? get().mutate({ op: 'renameContext', contextId: group.def.id, newName }) : false
    }
    return get().mutate({
      op: 'rename',
      path,
      kind,
      newName,
      ...(fromCreate ? { fromCreate: true as const } : {}),
    })
  },

  beginIcon: (path, host) => set({ iconPath: path, iconHost: host ?? 'sidebar' }),
  endIcon: () => set({ iconPath: null, iconHost: null }),
  beginColor: (path, host) => set({ colorPath: path, colorHost: host }),
  endColor: () => set({ colorPath: null, colorHost: null }),
  signalPeek: (parentPath, childId) =>
    set((s) => ({ peekSignal: { parentPath, childId, nonce: (s.peekSignal?.nonce ?? 0) + 1 } })),

  newPageAdjacent: async (path, where, host) => {
    const tree = get().tree
    if (!tree) return
    const parentPath = relDirname(path)
    const container = findContainerWhere(tree, (n) => n.path === parentPath)
    if (!container) return
    const anchor = container.pages.find((p) => p.path === path)
    if (!anchor) return
    const order = orderWithSlot(
      container.pages.map((p) => p.id),
      anchor.id,
      where,
    )
    await get().mutate({ op: 'createPage', parentPath, name: DEFAULT_NEW_NAME, order }, (created) =>
      get().beginRename(created.path, true, host),
    )
  },

  newSpaceAdjacent: async (id, where, host) => {
    const group = get().tree?.contexts.find((g) => g.spaces.some((s) => s.id === id))
    if (!group) return
    const order = orderWithSlot(
      group.spaces.map((s) => s.id),
      id,
      where,
    )
    await get().mutate(
      { op: 'createSpace', contextId: group.def.id, name: createSpaceLabel(group.def), order },
      (created) => get().beginRename(created.path, true, host),
    )
  },

  createNamed: async (req, host) => {
    const { tree, personalization } = get()
    await get().mutate(tree ? placeNew(tree, req, personalization) : req, (created) =>
      get().beginRename(created.path, true, host),
    )
  },

  newPage: async () => {
    const { tree, selection } = get()
    if (!tree) return
    let parentPath: string | null = null
    if (selection.kind === 'collection' || selection.kind === 'set')
      parentPath = findContainerWhere(tree, (n) => n.id === selection.id)?.path ?? null
    else if (selection.kind === 'page') parentPath = relDirname(selection.path)
    if (parentPath === null) parentPath = tree.collections[0]?.path ?? null
    if (parentPath === null) return
    const req = placeNew(
      tree,
      { op: 'createPage', parentPath, name: DEFAULT_NEW_NAME },
      get().personalization,
    )
    await get().mutate(req, (created) =>
      get().select({ kind: 'page', id: created.id, path: created.path }, { newTab: false }),
    )
  },

  beginPropertyRename: (target) => set({ renamingProperty: target }),
  cancelPropertyRename: () => set({ renamingProperty: null }),
  submitPropertyRename: async (newName) => {
    const target = get().renamingProperty
    set({ renamingProperty: null })
    if (!target) return false
    // Captured BEFORE the ask: the confirming push can rename the registry first.
    const before = get().tree?.registry.find((d) => d.id === target.propertyId)?.name
    const res = await host().ask('schema:rename', target.collectionPath, target.propertyId, newName)
    if (!reportRefusal(res)) return false
    const after = normalizePropertyName(newName)
    if (before !== undefined && before !== after) get().bumpValuesEpoch(before, after)
    return true
  },
  resetRename: () => set(PER_NEXUS),
})
