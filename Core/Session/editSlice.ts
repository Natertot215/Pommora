import { reportRefusal } from '@pommora/core/Interface/Notifications/notifications'
import type { MutateRequest, RenameKind } from '@pommora/core/Nexus/mutateRequest'
import { contextAt, spaceAt } from '@pommora/core/Nexus/treePatch'
import type { Slice } from './sessionState'
import { dialer } from '../Platform/dialer'
import { flushAllSaves } from './nexusSlice'

export type RenameHost = 'detail' | 'sidebar' | 'matrix'

interface RenameClaim {
  token: number
  path: string
  host: RenameHost
}
interface RenameFence {
  renamingPath: string | null
  renamingHost: RenameHost | null
}

export interface EditSlice {
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
  renamingProperty: { collectionPath: string; propertyId: string } | null
  beginPropertyRename: (target: { collectionPath: string; propertyId: string }) => void
  cancelPropertyRename: () => void
  resetEdit: () => void
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
} satisfies Partial<EditSlice>
const PER_NEXUS = {
  ...RENAME_CLEARED,
  renameClaims: [],
  iconPath: null,
  iconHost: null,
  colorPath: null,
  colorHost: null,
  renamingProperty: null,
} satisfies Partial<EditSlice>

function resolveRenameWinner(claims: RenameClaim[], fence: RenameFence): number | null {
  const live = claims.filter((c) => c.path === fence.renamingPath)
  if (live.length === 0) return null
  const declared = live.find((c) => c.host === fence.renamingHost)
  if (declared) return declared.token
  let winner = live[0]
  for (const c of live) if (RENAME_RANK[c.host] > RENAME_RANK[winner.host]) winner = c
  return winner.token
}

export const createEditSlice: Slice<EditSlice> = (set, get) => ({
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
      const renamed = reportRefusal(await dialer().ask('nexus:rename', newName))
      if (renamed) await get().load()
      return renamed
    }
    const landed = async (req: MutateRequest): Promise<boolean> =>
      (await get().mutate(req)) !== null
    // Registry entities rename by id: a bare folder rename strands every member's title key.
    if (kind === 'space' || kind === 'context') {
      const tree = get().tree
      if (!tree) return false
      if (kind === 'space') {
        const sp = spaceAt(tree, path)
        return sp ? landed({ op: 'renameSpace', spaceId: sp.id, newName }) : false
      }
      const group = contextAt(tree, path)
      return group ? landed({ op: 'renameContext', contextId: group.def.id, newName }) : false
    }
    return landed({
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

  beginPropertyRename: (target) => set({ renamingProperty: target }),
  cancelPropertyRename: () => set({ renamingProperty: null }),
  resetEdit: () => set(PER_NEXUS),
})
