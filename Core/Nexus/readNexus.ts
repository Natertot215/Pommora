import { isPlainObject } from '../Contract/validators'
import { basename, join, relJoin, titleFromPath } from '../Paths/posix'
import { parsePage } from '../Files/pageFile'
import { agendaContext, resolveFolderKind, type FolderKindContext } from './folderKind'
import type {
  CollectionNode,
  ContextGroup,
  NexusConfig,
  NexusOrder,
  NexusTree,
  PageNode,
  SetNode,
  SpaceNode,
} from './tree'
import {
  contextsRegistry as contextsRegistrySchema,
  parseContextKey,
  type ContextsRegistry,
} from '../Contexts/contexts'
import { resolveContextKeys } from '../Contexts/contextResolve'
import { spaceFieldsFrom, spaceSidecarsIn } from '../Contexts/spaceSidecar'
import { coerceOpenIn, cropsFile } from './schemas'
import { cachedIds, containerFieldsFrom } from './containerFields'
import type { PropertyDefinition } from '../Properties/properties'
import { makeCollectionNode, makePageNode, makeSetNode, makeSpaceNode } from './treePatch'
import { adoptedId } from './ids'
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

export function resolveEntityContexts(
  raw: Json,
  groups: ContextGroup[],
): Record<string, string[]> | undefined {
  if (!groups.length) return undefined
  const registry: ContextsRegistry = { contexts: groups.map((g) => g.def) }
  const spacesByContext = new Map(groups.map((g) => [g.def.id, g.spaces]))
  const links = resolveContextKeys(raw, registry, spacesByContext)
  return links.size ? Object.fromEntries(links) : undefined
}

const readSidecar = (absPath: string): Promise<Json | null> =>
  cachedParse(absPath, () => readJsonObject(absPath))

async function readSidecarNaming(
  absSidecar: string,
  relOwner: string,
  unreadable: string[],
): Promise<Json | null> {
  const meta = await readSidecar(absSidecar)
  if (meta === null && (await pathExists(absSidecar))) unreadable.push(relOwner)
  return meta
}

const readContainerMeta = (
  absDir: string,
  relDir: string,
  sidecar: string,
  unreadable: string[],
): Promise<Json> =>
  readSidecarNaming(join(absDir, sidecar), relDir, unreadable).then((m) => m ?? {})

const readConfig = (absPath: string): Promise<Record<string, unknown>> =>
  readAppFile(absPath).then((v) => v ?? {})

// Registry-independent, so the parse cache never needs busting for registry changes.
const rawContextByNode = new WeakMap<object, Json>()

function retainContextKeys(node: object, raw: Json): void {
  let kept: Json | null = null
  for (const [k, v] of Object.entries(raw)) {
    if (parseContextKey(k) !== null) {
      kept ??= {}
      kept[k] = v
    }
  }
  if (kept) rawContextByNode.set(node, kept)
}

interface PageRecord {
  node: PageNode
  fm: Json
  mtimeMs: number | null
}

export async function readPageRecord(absFile: string, relFile: string): Promise<PageRecord | null> {
  return cachedParse(absFile, async (stat) => {
    const content = await machine().readText(absFile)
    if (content === null) throw new Error(`Page not found: ${relFile}`)
    const { frontmatter: fm, admission } = parsePage(content)
    if (admission.state === 'unknown') return null
    const node = makePageNode({
      id: admission.state === 'member' ? admission.id : adoptedId(relFile),
      title: titleFromPath(absFile),
      path: relFile,
    })
    retainContextKeys(node, fm)
    return { node, fm, mtimeMs: stat?.mtimeMs ?? null }
  })
}

async function readDirectPages(
  absDir: string,
  relDir: string,
  unreadable: string[],
): Promise<PageNode[]> {
  const files = (await listEntries(absDir)).filter(isContentFile)
  const out = await Promise.all(
    files.map(async (e) => {
      const rel = relJoin(relDir, e.name)
      const node = (await readPageRecord(join(absDir, e.name), rel).catch(() => null))?.node ?? null
      if (node === null) unreadable.push(rel)
      return node
    }),
  )
  return out.filter((n): n is PageNode => n !== null)
}

async function readChildSets(
  absDir: string,
  relDir: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  unreadable: string[],
): Promise<SetNode[]> {
  const dirs = (await listEntries(absDir)).filter(
    (e) => e.kind === 'dir' && !outsideContent(`${relDir}/${e.name}`, scope),
  )
  const kinds = await Promise.all(
    dirs.map((e) => resolveFolderKind(join(absDir, e.name), 'nested', kindCtx)),
  )
  const sets = dirs.filter((_, i) => kinds[i] === 'set')
  return Promise.all(
    sets.map((e) =>
      readSet(join(absDir, e.name), `${relDir}/${e.name}`, e.name, kindCtx, scope, unreadable),
    ),
  )
}

async function readSet(
  absDir: string,
  relDir: string,
  name: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  unreadable: string[],
): Promise<SetNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.set, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, unreadable),
    readDirectPages(absDir, relDir, unreadable),
  ])
  return makeSetNode({
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    path: relDir,
    ...containerFieldsFrom(meta, sets, pages),
  })
}

export function resolveAssignedSchema(
  ids: unknown,
  registry: PropertyRegistry,
): PropertyDefinition[] | undefined {
  if (!Array.isArray(ids)) return undefined
  const defs = ids
    .filter((id): id is string => typeof id === 'string')
    .map((id) => registry[id])
    .filter((d): d is PropertyDefinition => Boolean(d))
  return defs.length ? defs : undefined
}

async function readPageCollection(
  absDir: string,
  relDir: string,
  name: string,
  kindCtx: FolderKindContext,
  scope: WatchScope,
  registry: PropertyRegistry,
  unreadable: string[],
): Promise<CollectionNode> {
  const [meta, sets, pages] = await Promise.all([
    readContainerMeta(absDir, relDir, SIDECAR_FILENAME.collection, unreadable),
    readChildSets(absDir, relDir, kindCtx, scope, unreadable),
    readDirectPages(absDir, relDir, unreadable),
  ])
  return makeCollectionNode({
    id: asString(meta.id) ?? adoptedId(relDir),
    title: name,
    path: relDir,
    properties: resolveAssignedSchema(meta.properties, registry),
    openIn: coerceOpenIn(meta.open_in),
    cached: cachedIds(meta),
    ...containerFieldsFrom(meta, sets, pages),
  })
}

async function readSpace(
  sidecar: string,
  relDir: string,
  name: string,
  contextId: string,
  unreadable: string[],
): Promise<SpaceNode | null> {
  const sc = await readSidecarNaming(sidecar, relDir, unreadable)
  if (!sc) return null
  const node = makeSpaceNode({
    id: asString(sc.id) ?? adoptedId(relDir),
    title: name,
    path: relDir,
    contextId,
    ...spaceFieldsFrom(sc),
  })
  retainContextKeys(node, sc)
  return node
}

async function readContextGroups(
  root: string,
  registry: ContextsRegistry,
  spaceOrders: Json,
  unreadable: string[],
): Promise<ContextGroup[]> {
  return Promise.all(
    registry.contexts.map(async (def) => {
      const dir = join(contextsDir(root), def.title)
      const read = await Promise.all(
        (await spaceSidecarsIn(dir)).map(({ name, file }) =>
          readSpace(file, spaceDirRel(def.title, name), name, def.id, unreadable),
        ),
      )
      const spaces = read.filter((n): n is SpaceNode => n !== null)
      return { def, spaces: resolveOrder(spaces, asStringArray(spaceOrders[def.id])) }
    }),
  )
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
  const id = asString(identity?.id) ?? adoptedId(root)
  const kindCtx = await agendaContext(root, identity)

  const scope = scopeOf(leaves)
  const ctxParsed = ctxRegistryRaw ? contextsRegistrySchema.safeParse(ctxRegistryRaw) : null
  const ctxRegistry = ctxParsed?.success ? ctxParsed.data : null
  const order = readOrder(state)
  const unreadable: string[] = []
  // An unusable registry blanks the whole Contexts layer for the session. Absent stays silent; present names the registry so the record reads the blank layer as unreadable, never as mass deletion.
  if (!ctxRegistry && (await pathExists(contextsRegistryFile(root))))
    unreadable.push(CONTEXTS_REGISTRY_REL)
  const contexts = ctxRegistry
    ? await readContextGroups(root, ctxRegistry, order.spaces, unreadable)
    : undefined

  const rootDirs = (await listEntries(root)).filter(
    (e) => e.kind === 'dir' && !outsideContent(e.name, scope),
  )
  const maybeCollections = await Promise.all(
    rootDirs.map(async (e) => {
      const abs = join(root, e.name)
      if ((await resolveFolderKind(abs, 'root', kindCtx)) !== 'collection') return null
      return readPageCollection(abs, e.name, e.name, kindCtx, scope, registry.defs, unreadable)
    }),
  )
  const allCollections = maybeCollections.filter((c): c is CollectionNode => c !== null)
  const collections = resolveOrder(allCollections, order.collections)

  if (ctxRegistry && contexts) {
    const spacesByContext = new Map(contexts.map((g) => [g.def.id, g.spaces]))
    const attach = (node: PageNode | SpaceNode): void => {
      const raw = rawContextByNode.get(node)
      const links = raw ? resolveContextKeys(raw, ctxRegistry, spacesByContext) : null
      if (links?.size) node.contextValues = Object.fromEntries(links)
      else delete node.contextValues
    }
    for (const g of contexts) for (const s of g.spaces) attach(s)
    const visitSets = (sets: SetNode[] | undefined): void => {
      for (const s of sets ?? []) {
        s.pages.forEach(attach)
        visitSets(s.sets)
      }
    }
    for (const c of collections) {
      c.pages.forEach(attach)
      visitSets(c.sets)
    }
  }

  return {
    nexus: { id, rootPath: root, name: basename(root) },
    collections,
    contexts: contexts ?? [],
    config: {
      ...leaves,
      homepage: readHomepageLeaves(homepageConfig),
      crops: readCropLeaves(cropsConfig),
      pageMetadata,
      order,
      registry: orderedDefs(registry),
    },
    ...(unreadable.length ? { unreadable: unreadable.map((path) => ({ path })) } : {}),
  }
}
