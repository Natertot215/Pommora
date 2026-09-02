import { DEFAULT_NEW_NAME, type MutableKind, type RenameHost } from '@shared/mutate'
import { contextDirRel } from '@shared/nexusPaths'
import { normalizePropertyName } from '@shared/properties'
import { orderWithSlot } from '../Views/creationOrder'
import { findContainer, parentPathOf } from '../Interface/scope'
import type { Slice } from './sessionState'
import type { ValueChange, ValuesEpoch } from '@shared/types'

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
  /** A just-created entity's naming session — the field opens empty and its first commit rides
   *  the create (disambiguating, cascade-free). */
  renamingCreate: boolean
  /** The gesture-declared field host, when the caller knew its surface; null resolves by rank. */
  renamingHost: RenameHost | null
  /** The owner fence: field hosts claim on mount; one claim wins (declared host, then rank, then
   *  first-come) and only the winner mounts an input. */
  renameClaims: RenameClaim[]
  renameWinner: number | null
  claimRename: (path: string, host: RenameHost) => number | null
  releaseRename: (token: number) => void
  beginRename: (path: string, create?: boolean, host?: RenameHost) => void
  cancelRename: () => void
  submitRename: (path: string, kind: MutableKind, newName: string) => Promise<boolean>
  /** The page whose icon picker is open, from a menu's Edit Icon. One consumer, so it needs no
   *  owner fence. */
  iconPath: string | null
  beginIcon: (path: string) => void
  endIcon: () => void
  /** A one-shot "an item just landed inside this container" pulse — a disclosure-locked folder
   *  reads it to briefly reveal only that child. */
  peekSignal: { parentPath: string; childId: string; nonce: number } | null
  signalPeek: (parentPath: string, childId: string) => void
  /** The sidebar's New Page Above/Below — position computed here, where the sibling order lives. */
  newPageAdjacent: (path: string, where: 'above' | 'below', host?: RenameHost) => Promise<void>
  renamingProperty: { collectionPath: string; propertyId: string } | null
  /** Set when a property rename lands. A mounted view's values snapshot is fetched once per
   *  container open and never re-reads, so without this the renamed column reads blank. Carries
   *  the key pair because the effect must re-key the optimistic overrides too. */
  valuesEpoch: ValuesEpoch | null
  bumpValuesEpoch: (oldKey: string, newKey: string) => void
  bumpContainerValues: (changes: ValueChange[]) => void
  beginPropertyRename: (target: { collectionPath: string; propertyId: string }) => void
  cancelPropertyRename: () => void
  submitPropertyRename: (newName: string) => Promise<boolean>
}

let nextRenameToken = 1
// The unclaimed-session sweep's beat — long enough for a create's row to arrive and claim.
const RENAME_CLAIM_BEAT_MS = 2000
let renameOrphanTimer: number | undefined
const RENAME_RANK: Record<RenameHost, number> = { detail: 2, sidebar: 1 }
const RENAME_CLEARED = {
  renamingPath: null,
  renamingCreate: false,
  renamingHost: null,
  renameWinner: null,
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
  ...RENAME_CLEARED,
  renameClaims: [],
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
    // Claims minted before this release are standing twins; only one minted AFTER it can be
    // the released field itself remounting.
    const rebirthFence = nextRenameToken
    set((s) => {
      const claims = s.renameClaims.filter((c) => c.token !== token)
      return { renameClaims: claims, renameWinner: resolveRenameWinner(claims, s) }
    })
    // Waits a microtask: StrictMode's simulated remount releases and re-claims in one act, and
    // an immediate cancel would kill every dev rename. A rename whose winning surface left is
    // abandoned rather than handed to a standing claimant.
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
    // Self-heals when no surface ever claims — a newborn a filter hides, or a navigate-away
    // mid-create, would otherwise strand the session with an empty field.
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
    // Registry entities rename by id through their journaled cascade ops — a bare folder
    // rename would strand every member file's title key.
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

  iconPath: null,
  beginIcon: (path) => set({ iconPath: path }),
  endIcon: () => set({ iconPath: null }),
  peekSignal: null,
  signalPeek: (parentPath, childId) =>
    set((s) => ({ peekSignal: { parentPath, childId, nonce: (s.peekSignal?.nonce ?? 0) + 1 } })),

  newPageAdjacent: async (path, where, host) => {
    const tree = get().tree
    if (!tree) return
    const parentPath = parentPathOf(path)
    const container = findContainer(tree, (n) => n.path === parentPath)
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

  renamingProperty: null,
  valuesEpoch: null,
  bumpValuesEpoch: (oldKey, newKey) =>
    set((st) => ({
      valuesEpoch: { n: (st.valuesEpoch?.n ?? 0) + 1, kind: 'rename', oldKey, newKey },
    })),
  bumpContainerValues: (changes) =>
    set((st) => ({
      valuesEpoch: { n: (st.valuesEpoch?.n ?? 0) + 1, kind: 'container', changes },
    })),
  beginPropertyRename: (target) => set({ renamingProperty: target }),
  cancelPropertyRename: () => set({ renamingProperty: null }),
  submitPropertyRename: async (newName) => {
    const target = get().renamingProperty
    set({ renamingProperty: null })
    if (!target) return false
    // Captured BEFORE the ask: main's confirming push can rename the registry in this
    // store before the reply's continuation runs.
    const before = get().tree?.registry.find((d) => d.id === target.propertyId)?.name
    const res = await window.nexus.schema.rename(target.collectionPath, target.propertyId, newName)
    if (!res.ok) {
      await window.nexus.showError(res.error.message)
      return false
    }
    const after = normalizePropertyName(newName)
    if (before !== undefined && before !== after) get().bumpValuesEpoch(before, after)
    return true
  },
})
