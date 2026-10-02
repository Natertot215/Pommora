import { isPlainObject } from '../Contract/validators'
import { basename, join, relJoin, titleFromPath } from '../Paths/posix'
import { frontmatterWritable, parsePage } from '../Files/pageFile'
import {
  agendaContext,
  adoptsAsCollection,
  resolveFolderKind,
  type FolderKindContext,
} from './folderKind'
import type { ContainerKind } from './entities'
import {
  byPath,
  type CollectionNode,
  type ContextGroup,
  type NexusConfig,
  type NexusOrder,
  type NexusTree,
  type PageNode,
  type SetNode,
  type SpaceNode,
  type Unreadable,
  type UnreadReason,
} from './tree'
import {
  contextsRegistry as contextsRegistrySchema,
  type ContextsRegistry,
} from '../Contexts/contexts'
import { contextWorldOf, resolveContextKeys } from '../Contexts/contextResolve'
import { spaceNodeFrom, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { cropsFile } from './schemas'
import { containerNodeFrom } from './containerFields'
import { readPageMetadata } from './pageMetadata'
import { readSettings, scopeOf } from '../Settings/codec'
import { pathExists, readAppFile, readJsonObject } from '../Files/atomicWrite'
import { readIdentity } from './identity'
import { isContentFile, listEntries } from '../Files/walk'
import { machine } from '../Platform/machine'
import {
  orderedDefs,
  readKeptRegistry,
  type PropertyRegistry,
} from '../Properties/propertiesRegistry'
import { asString, asStringArray } from './coerce'
import { outsideContent, type WatchScope } from '../Paths/exclusion'
import { resolveOrder } from './order'
import { beginWalk, cachedParse, endWalk } from '../Files/walkCache'
import { contextsDir, contextsRegistryFile, nexusConfig } from '../Paths/paths'
import {
  CONTEXTS_REGISTRY_REL,
  spaceDirRel,
  NEXUS_CONFIG_FILES,
  SIDECAR_FILENAME,
} from '../Paths/nexusPaths'
import type { Json } from '../Files/stableJson'

export function readHomepageLeaves(config: Json): NexusConfig['homepage'] {
  return {
    banner: asString(config.banner),
    headingIconHidden: config.heading_icon_hidden === true,
  }
}

export function readCropLeaves(config: Json): NexusConfig['crops'] {
  return cropsFile.parse(config).byImage ?? {}
}

export function readOrder(state: Json): NexusOrder {
  const order = isPlainObject(state.order) ? state.order : {}
  return {
    collections: asStringArray(order.collections),
    contexts: asStringArray(order.contexts),
    spaces: isPlainObject(order.spaces) ? order.spaces : {},
  }
}

export function contextLinker(
  groups: ContextGroup[],
): <N extends PageNode | SpaceNode>(node: N, raw: Json) => N {
  const world = contextWorldOf(groups)
  return (node, raw) => {
    const links = resolveContextKeys(raw, world)
    return links.size ? { ...node, contextValues: Object.fromEntries(links) } : node
  }
}

const readSidecar = (absPath: string): Promise<Json | null> =>
  cachedParse(absPath, () => readJsonObject(absPath))

interface Walk {
  kindCtx: FolderKindContext
  scope: WatchScope
  registry: PropertyRegistry
  unreadable: Unreadable[]
  link: ReturnType<typeof contextLinker>
}

async function readOwnSidecar(
  absSidecar: string,
  relOwner: string,
  unreadable: Unreadable[],
  kind: ContainerKind | 'space',
): Promise<Json | null> {
  const meta = await readSidecar(absSidecar)
  if (asString(meta?.id)) return meta
  const unparsed = meta === null && (await pathExists(absSidecar))
  if (meta !== null || unparsed || kind !== 'space')
    unreadable.push({ path: relOwner, kind, reason: unparsed ? 'unparsed' : 'missing' })
  return null
}

const readConfig = (absPath: string): Promise<Record<string, unknown>> =>
  readAppFile(absPath).then((v) => v ?? {})

interface PageRecord {
  node: PageNode
  fm: Json
  mtimeMs: number | null
}

interface Unread {
  unread: UnreadReason
}

export function pageRecordOf(
  content: string,
  relFile: string,
  mtimeMs: number | null,
): PageRecord | Unread {
  const { frontmatter: fm, admission } = parsePage(content)
  if (admission.state === 'missing')
    return { unread: frontmatterWritable(content) ? 'missing' : 'unparsed' }
  if (admission.state === 'unknown') return { unread: admission.reason }
  const node: PageNode = {
    kind: 'page',
    id: admission.id,
    title: titleFromPath(relFile),
    path: relFile,
  }
  return { node, fm, mtimeMs }
}

export async function readPageRecord(
  absFile: string,
  relFile: string,
): Promise<PageRecord | Unread> {
  return cachedParse(absFile, async (stat): Promise<PageRecord | Unread> => {
    const content = await machine().readText(absFile)
    if (content === null) throw new Error(`Page not found: ${relFile}`)
    return pageRecordOf(content, relFile, stat?.mtimeMs ?? null)
  })
}

async function readDirectPages(absDir: string, relDir: string, walk: Walk): Promise<PageNode[]> {
  const files = (await listEntries(absDir)).filter(isContentFile)
  const out = await Promise.all(
    files.map(async (e) => {
      const rel = relJoin(relDir, e.name)
      const read = await readPageRecord(join(absDir, e.name), rel).catch(
        (): Unread => ({ unread: 'unparsed' }),
      )
      if ('node' in read) return walk.link(read.node, read.fm)
      walk.unreadable.push({ path: rel, kind: 'page', reason: read.unread })
      return null
    }),
  )
  return out.filter((n): n is PageNode => n !== null)
}

async function readChildSets(absDir: string, relDir: string, walk: Walk): Promise<SetNode[]> {
  const dirs = (await listEntries(absDir)).filter(
    (e) => e.kind === 'dir' && !outsideContent(`${relDir}/${e.name}`, walk.scope),
  )
  const kinds = await Promise.all(
    dirs.map((e) => resolveFolderKind(join(absDir, e.name), 'nested', walk.kindCtx)),
  )
  const read = await Promise.all(
    dirs
      .filter((_, i) => kinds[i] === 'set')
      .map((e) => readContainer('set', join(absDir, e.name), `${relDir}/${e.name}`, e.name, walk)),
  )
  return read.filter((n): n is SetNode => n?.kind === 'set')
}

async function readContainer(
  kind: ContainerKind,
  absDir: string,
  relDir: string,
  name: string,
  walk: Walk,
): Promise<CollectionNode | SetNode | null> {
  const meta = await readOwnSidecar(
    join(absDir, SIDECAR_FILENAME[kind]),
    relDir,
    walk.unreadable,
    kind,
  )
  if (!meta) return null
  const [sets, pages] = await Promise.all([
    readChildSets(absDir, relDir, walk),
    readDirectPages(absDir, relDir, walk),
  ])
  return containerNodeFrom(kind, { title: name, path: relDir }, meta, sets, pages, walk.registry)
}

async function readRootFolder(
  abs: string,
  name: string,
  walk: Walk,
): Promise<CollectionNode | SetNode | null> {
  if ((await resolveFolderKind(abs, 'root', walk.kindCtx)) === 'collection')
    return readContainer('collection', abs, name, name, walk)
  const adoptable = await resolveFolderKind(abs, 'root', { ...walk.kindCtx, adopting: true })
  if (adoptable === 'collection' && (await adoptsAsCollection(abs, name, walk.scope)))
    walk.unreadable.push({ path: name, kind: 'collection', reason: 'missing' })
  return null
}

interface SpaceRead {
  node: SpaceNode
  sc: Json
}

async function readSpace(
  sidecar: string,
  relDir: string,
  name: string,
  contextId: string,
  unreadable: Unreadable[],
): Promise<SpaceRead | null> {
  const sc = await readOwnSidecar(sidecar, relDir, unreadable, 'space')
  const node = sc && spaceNodeFrom(sc, { title: name, path: relDir, contextId })
  return node ? { node, sc } : null
}

export async function readFolder(
  root: string,
  rel: string,
  tree: NexusTree,
): Promise<{ node: CollectionNode | SetNode | null; unreadable: Unreadable[] }> {
  const abs = join(root, rel)
  const name = basename(rel)
  const walk: Walk = {
    // An Agenda folder is no Collection or Set whether or not its slot is registered, so the registration isn't read.
    kindCtx: { agenda: {}, homed: new Set(), root },
    scope: scopeOf(tree.config),
    registry: Object.fromEntries(tree.config.registry.map((d) => [d.id, d])),
    unreadable: [],
    link: contextLinker(tree.contexts),
  }
  const node = !rel.includes('/')
    ? await readRootFolder(abs, name, walk)
    : (await resolveFolderKind(abs, 'nested', walk.kindCtx)) === 'set'
      ? await readContainer('set', abs, rel, name, walk)
      : null
  return { node, unreadable: walk.unreadable }
}

async function readContextGroups(
  root: string,
  registry: ContextsRegistry,
  spaceOrders: Json,
  unreadable: Unreadable[],
): Promise<ContextGroup[]> {
  const groups = await Promise.all(
    registry.contexts.map(async (def) => {
      const dir = join(contextsDir(root), def.title)
      const read = await Promise.all(
        (await spaceSidecarsIn(dir)).map(({ name, file }) =>
          readSpace(file, spaceDirRel(def.title, name), name, def.id, unreadable),
        ),
      )
      return { def, read: read.filter((r): r is SpaceRead => r !== null) }
    }),
  )
  const link = contextLinker(
    groups.map(({ def, read }) => ({ def, spaces: read.map((r) => r.node) })),
  )
  return groups.map(({ def, read }) => ({
    def,
    spaces: resolveOrder(
      read.map((r) => link(r.node, r.sc)),
      asStringArray(spaceOrders[def.id]),
    ),
  }))
}

export async function readNexus(root: string): Promise<NexusTree> {
  if (!(await pathExists(root))) throw new Error(`Nexus root not found: ${root}`)
  beginWalk(root)
  try {
    return await walkNexus(root)
  } finally {
    endWalk()
  }
}

/** The three hand-authored files every read of the Nexus rests on. */
export const readNexusConfig = (root: string) =>
  Promise.all([readIdentity(root), readSettings(root), readKeptRegistry(root)])

async function walkNexus(root: string): Promise<NexusTree> {
  const [
    [identity, leaves, registry],
    state,
    homepageConfig,
    cropsConfig,
    pageMetadata,
    ctxRegistryRaw,
  ] = await Promise.all([
    readNexusConfig(root),
    readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.state)),
    readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.homepage)),
    readConfig(nexusConfig(root, NEXUS_CONFIG_FILES.crops)),
    readPageMetadata(root),
    readSidecar(contextsRegistryFile(root)),
  ])
  // An identity the open couldn't write (a read-only folder) or one deleted while the Nexus is open reads as no id, so the tree takes one derived from its root.
  const id = asString(identity?.id) ?? `unidentified-${machine().sha256Hex(root).slice(0, 16)}`
  const kindCtx = await agendaContext(root, identity)

  const scope = scopeOf(leaves)
  const ctxParsed = ctxRegistryRaw ? contextsRegistrySchema.safeParse(ctxRegistryRaw) : null
  const ctxRegistry = ctxParsed?.success ? ctxParsed.data : null
  const order = readOrder(state)
  const unreadable: Unreadable[] = []
  // An unusable registry blanks the whole Contexts layer for the session. Absent stays silent; present names the registry so the record reads the blank layer as unreadable, never as mass deletion.
  if (!ctxRegistry && (await pathExists(contextsRegistryFile(root))))
    unreadable.push({ path: CONTEXTS_REGISTRY_REL, kind: 'registry', reason: 'unparsed' })
  const contexts = ctxRegistry
    ? await readContextGroups(root, ctxRegistry, order.spaces, unreadable)
    : []

  const rootDirs = (await listEntries(root)).filter(
    (e) => e.kind === 'dir' && !outsideContent(e.name, scope),
  )
  const walk: Walk = {
    kindCtx,
    scope,
    registry: registry.defs,
    unreadable,
    link: contextLinker(contexts),
  }
  const maybeCollections = await Promise.all(
    rootDirs.map((e) => readRootFolder(join(root, e.name), e.name, walk)),
  )
  const allCollections = maybeCollections.filter(
    (c): c is CollectionNode => c?.kind === 'collection',
  )
  const collections = resolveOrder(allCollections, order.collections)

  return {
    nexus: { id, rootPath: root, name: basename(root) },
    collections,
    contexts,
    config: {
      ...leaves,
      homepage: readHomepageLeaves(homepageConfig),
      crops: readCropLeaves(cropsConfig),
      pageMetadata,
      order,
      registry: orderedDefs(registry),
    },
    ...(unreadable.length ? { unreadable: unreadable.sort(byPath) } : {}),
  }
}
