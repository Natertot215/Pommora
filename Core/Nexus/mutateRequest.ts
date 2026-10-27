import { z } from 'zod'
import { aliasEdit } from '../Connections/aliasMemory'
import { op } from '../Files/decoders'
import { ok, type Result } from '../Contract/result'
import { propertyValue } from '../Properties/propertyValue'
import { propertyConfig, propertyDraft } from '../Properties/properties'
import { optionEdit } from '../Properties/optionModel'
import { formatChange } from '../Properties/keyFormat'
import { crop, type PageMetaPatch } from './schemas'
import type { CascadeReport } from './cascade'
import { CONTAINER_KINDS, HELD_KINDS, type HeldKind, NODE_KINDS } from './entities'
import { newContentId, newId } from './ids'
import { isUlidShaped } from './identityMark'

export interface MutateOutcome {
  /** What a create made: a page's, a container's, or a Space's path, or a property's id. */
  created?: { path: string } | { propertyId: string }
  cascade?: CascadeReport
  adopted?: string
  /** Where a removal filed what it took, in the Trash or an Archive; absent when the system trash took it. */
  bundled?: { bundlePath: string }
  /** The titles of what a restore brought back without all it held. */
  unrestored?: string[]
  /** The title a restore stepped aside to, when it couldn't land under its own. */
  landedAs?: string
  /** The request that takes this write back, which the window's undo sends. */
  undo?: MutateRequest
  /** The entries an undo couldn't put back, which its Try Again sends again alone, so it never overwrites an edit made since. */
  missed?: PutBack[]
}
export type MutateReply = Result<MutateOutcome>

export const done = (r: Result<unknown>): MutateReply => (r.ok ? ok({}) : r)

export const undoOf = (entries: PutBack[], outcome: MutateOutcome = {}): MutateReply =>
  ok({ ...outcome, undo: { op: 'putBack', entries } })

export const DEFAULT_NEW_NAME = 'Untitled'

const heldKind = z.enum(HELD_KINDS)
export type RenameKind = HeldKind | 'homepage'

const bannerOwner = z.enum([...NODE_KINDS, 'homepage', 'navview'])
export type BannerOwnerKind = z.infer<typeof bannerOwner>

const containerKind = z.enum(CONTAINER_KINDS)

/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the address its record names. */
const restoreDestination = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['container', 'context']), id: z.string() }),
  z.object({ kind: z.literal('archive') }),
])
export type RestoreDestination = z.infer<typeof restoreDestination>

const childOrderKey = z.literal('set_order')
export type ChildOrderKey = z.infer<typeof childOrderKey>
const ids = z.array(z.string())
const mintedId = z.string().refine(isUlidShaped)
const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon' | 'aliases'>> = z.object({
  title_icon: z.boolean().nullable().optional(),
  locked: z.literal(true).nullable().optional(),
} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon' | 'aliases'>]: z.ZodType })
/** What one file held under a property's or Context's key before a value write: a page's pair as its frontmatter spelled it, a Space's JSON value, absent when the file held no key; on a page, `above` is the key its line stood above, absent when it stood last. */
const putBack = z.object({
  file: z.string(),
  fieldId: z.string(),
  before: z.unknown().optional(),
  above: z.string().optional(),
})
export type PutBack = z.infer<typeof putBack>

// Every structural write enters through this one shape: a key it doesn't name is dropped, and a value off its type is refused before anything is written.
export const mutateRequest = z.discriminatedUnion('op', [
  op('createPage', {
    id: mintedId,
    parentPath: z.string(),
    name: z.string(),
    seeds: z.record(z.string(), propertyValue).optional(),
    order: ids.optional(),
  }),
  op('createContainer', {
    id: mintedId,
    parentPath: z.string(),
    kind: containerKind,
    name: z.string(),
    order: ids.optional(),
  }),
  // Membership is keyed by TITLE, so Spaces and Contexts rename through their own ops. `fromCreate` marks a just-created page's first commit: disambiguates like a create, and arrives without moving, so a stale link to the name it was born with never follows.
  op('rename', {
    path: z.string(),
    kind: heldKind.exclude(['space', 'context']),
    newName: z.string(),
    fromCreate: z.literal(true).optional(),
  }),
  op('renameHeading', { path: z.string(), heading: z.string(), to: z.string() }),
  op('delete', { path: z.string(), kind: heldKind }),
  op('archive', {
    path: z.string(),
    kind: z.enum(['page', 'set']),
    at: z.string().optional(),
    name: z.string().optional(),
    record: z.record(z.string(), z.unknown()).optional(),
  }),
  op('restore', { bundlePath: z.string(), destination: restoreDestination.optional() }),
  op('emptyBundle', { bundlePath: z.string() }),
  op('setProfileImage', { source: z.string().nullable() }),
  op('setProfileIcon', { icon: z.string().nullable() }),
  op('setBanner', { path: z.string(), kind: bannerOwner, source: z.string().nullable() }),
  op('setCrop', { image: z.string(), crop: crop.nullable() }),
  op('setHeadingIconHidden', { path: z.string(), kind: bannerOwner, hidden: z.boolean() }),
  op('setIcon', { path: z.string(), kind: heldKind, icon: z.string().nullable() }),
  op('setDisclosureLock', { path: z.string(), kind: containerKind, locked: z.boolean() }),
  op('setActiveView', { path: z.string(), kind: containerKind, viewId: z.string() }),
  op('setProperty', { path: z.string(), propertyId: z.string(), value: propertyValue.nullable() }),
  op('putBack', { entries: z.array(putBack) }),
  op('setPageMeta', { path: z.string(), patch: pageMetaPatch }),
  op('editAliases', { path: z.string(), edit: aliasEdit }),
  // Absent an order, the destination's order stands, and the page sorts where `resolveOrder` places an id its order doesn't name.
  op('movePage', { path: z.string(), newParentPath: z.string(), order: ids.optional() }),
  op('moveSet', { path: z.string(), newParentPath: z.string(), order: ids }),
  op('reorderChildren', { parentPath: z.string(), key: childOrderKey, order: ids }),
  op('reorderTop', { order: ids }),
  op('createContextGroup', { id: mintedId, name: z.string() }),
  op('createSpace', {
    id: mintedId,
    contextId: z.string(),
    name: z.string(),
    order: ids.optional(),
  }),
  op('renameContext', { contextId: z.string(), newName: z.string() }),
  op('renameSpace', { spaceId: z.string(), newName: z.string() }),
  op('setContext', { path: z.string(), contextId: z.string(), spaceIds: ids }),
  op('setSpaceColor', { spaceId: z.string(), color: z.string().optional() }),
  op('reorderContexts', { ids }),
  op('reorderPanelContexts', { ids }),
  op('reorderSpaces', { contextId: z.string(), ids }),
  op('setSpaceRowOrder', { path: z.string(), ids }),
  op('retryUnreadable', { path: z.string() }),
  op('addProperty', { containerPath: z.string(), draft: propertyDraft }),
  op('assignProperty', {
    containerPath: z.string(),
    propertyId: z.string(),
    toIndex: z.number().optional(),
  }),
  op('unassignProperty', { containerPath: z.string(), propertyId: z.string() }),
  op('reorderAssigned', { containerPath: z.string(), propertyId: z.string(), toIndex: z.number() }),
  op('reorderProperty', { propertyId: z.string(), toIndex: z.number() }),
  op('renameProperty', { propertyId: z.string(), label: z.string() }),
  op('setFormat', { propertyId: z.string(), change: formatChange }),
  op('configureProperty', { propertyId: z.string(), patch: propertyConfig }),
  op('deleteProperty', { propertyId: z.string() }),
  // Finishes every entry the notes file holds; the refusal or report that offers it can't name the entity that owes the work.
  op('finishOwed', {}),
  op('editOption', { propertyId: z.string(), edit: optionEdit }),
  op('renameOption', { propertyId: z.string(), optionId: z.string(), label: z.string() }),
  op('deleteOption', { propertyId: z.string(), optionId: z.string() }),
  op('clearOption', { propertyId: z.string(), optionId: z.string() }),
])
export type MutateRequest = z.infer<typeof mutateRequest>

export type CreateRequest = Extract<
  MutateRequest,
  { op: 'createPage' | 'createContainer' | 'createSpace' | 'createContextGroup' }
>
export type CreatePageRequest = Extract<CreateRequest, { op: 'createPage' }>

export type OrderRequest = Extract<
  MutateRequest,
  { op: 'movePage' | 'moveSet' | 'reorderChildren' }
>

export type UnmintedCreate<R = CreateRequest> = R extends unknown ? Omit<R, 'id'> : never

// A content create carries the ID the window minted, since its ask places the newborn by ID; `addProperty` and a tile's create on its own channel place nothing in their ask and learn the ID from the reply.
export const minted = <R extends UnmintedCreate>(req: R): R & { id: string } => ({
  ...req,
  id: req.op === 'createPage' ? newContentId('page') : newId(),
})

export const contextSeeds = (req: CreatePageRequest): [contextId: string, spaceIds: string[]][] =>
  Object.entries(req.seeds ?? {}).flatMap(([id, v]) =>
    v.kind === 'context' ? [[id, v.value]] : [],
  )

export const seedsContext = (req: CreatePageRequest): boolean => contextSeeds(req).length > 0

/** The operations that change what the settle holds, each moving, adding, rewriting, or removing pages in its turn, so a save queued for a file one touches lands first. */
export const changesSettled = (operation: MutateRequest['op']): boolean =>
  operation === 'createPage' ||
  operation === 'rename' ||
  operation === 'movePage' ||
  operation === 'moveSet' ||
  operation === 'renameHeading' ||
  operation === 'delete' ||
  operation === 'archive' ||
  operation === 'restore' ||
  operation === 'emptyBundle'

/** A moved Set carries what was archived from within it, and a container's or Context's new name, or a Set's new place, re-spells the rows' crumbs, so each re-lists an open browser too. */
export const changesStores = (req: MutateRequest): boolean =>
  req.op === 'delete' ||
  req.op === 'archive' ||
  req.op === 'restore' ||
  req.op === 'emptyBundle' ||
  req.op === 'moveSet' ||
  req.op === 'renameContext' ||
  req.op === 'deleteProperty' ||
  (req.op === 'rename' && req.kind !== 'page')
