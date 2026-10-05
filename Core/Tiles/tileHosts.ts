import { contextWorldOf } from '../Contexts/contextResolve'
import { pathExists } from '../Files/atomicWrite'
import { heldTreeOf } from '../Nexus/liveTree'
import type { NexusTree } from '../Nexus/tree'
import { HOMEPAGE_DIR_REL } from '../Paths/nexusPaths'
import { tileHostDir } from '../Paths/paths'
import { join } from '../Paths/posix'
import { HOMEPAGE_HOST, type TileHostRef } from './tiles'

interface TileHostKind<H extends TileHostRef> {
  dir(root: string, host: H, tree: NexusTree | null): Promise<string | null>
  /** Every board of the kind by its folder from the root, with its host where one can be named. */
  boards(tree: NexusTree): { host?: H; rel: string }[]
}

const TILE_HOSTS: { [K in TileHostRef['kind']]: TileHostKind<Extract<TileHostRef, { kind: K }>> } =
  {
    homepage: {
      dir: async (root) => tileHostDir(root),
      boards: () => [{ host: HOMEPAGE_HOST, rel: HOMEPAGE_DIR_REL }],
    },
    // A Space whose sidecar the walk couldn't read is still reached by its folder, with no host to name; only an unreadable Contexts registry hides the Spaces themselves.
    space: {
      dir: async (root, host, tree) => {
        const space = tree && contextWorldOf(tree.contexts).spaceById.get(host.id)
        const dir = space && join(root, space.path)
        // Mid-cascade the tree still spells the folder a rename just moved.
        return dir && (await pathExists(dir)) ? dir : null
      },
      boards: (tree) => [
        ...tree.contexts.flatMap((g) =>
          g.spaces.map((s) => ({ host: { kind: 'space' as const, id: s.id }, rel: s.path })),
        ),
        ...(tree.unreadable ?? []).filter((u) => u.kind === 'space').map((u) => ({ rel: u.path })),
      ],
    },
  }

const ARMS: TileHostKind<TileHostRef>[] = Object.values(TILE_HOSTS)

export const hostDir = (root: string, host: TileHostRef): Promise<string | null> =>
  (TILE_HOSTS[host.kind] as TileHostKind<TileHostRef>).dir(root, host, heldTreeOf(root))

export const tileHostsOf = (
  root: string,
  tree: NexusTree,
): { hosts: { host?: TileHostRef; dir: string }[]; unreadable: number } => ({
  hosts: ARMS.flatMap((arm) =>
    arm.boards(tree).map((b) => ({ host: b.host, dir: join(root, b.rel) })),
  ),
  unreadable: tree.unreadable?.some((u) => u.kind === 'registry') ? 1 : 0,
})

export function tileHostAt(tree: NexusTree, dirRel: string): TileHostRef | null {
  for (const arm of ARMS) {
    const hit = arm.boards(tree).find((b) => b.rel === dirRel)
    if (hit) return hit.host ?? null
  }
  return null
}
