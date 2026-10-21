import { z } from 'zod'
import { aliasEdit } from '../Connections/aliasMemory'
import { op } from '../Files/decoders'
import { ok, type Result } from '../Contract/result'
import { propertyValue } from '../Properties/propertyValue'
import { crop, type PageMetaPatch } from './schemas'
import type { CascadeReport } from './cascade'
import { CONTAINER_KINDS, HELD_KINDS, type HeldKind, NODE_KINDS } from './entities'
import { newContentId, newId } from './ids'
import { isUlidShaped } from './identityMark'

export interface MutateOutcome {
  created?: { path: string }
  cascade?: CascadeReport
  adopted?: string
  /** The bundle a removal minted, in the Trash or an Archive; absent when the system trash took it. */
  bundled?: { bundlePath: string }
  /** The titles of what a restore brought back without all it held. */
  unrestored?: string[]
  /** The title a restore stepped aside to, when it couldn't land under its own. */
  landedAs?: string
  retry?: MutateRequest
}
export type MutateReply = Result<MutateOutcome>

export const done = (r: Result<unknown>): MutateReply => (r.ok ? ok({}) : r)

export const DEFAULT_NEW_NAME = 'Untitled'

const heldKind = z.enum(HELD_KINDS)
export type RenameKind = HeldKind | 'homepage'

const bannerOwner = z.enum([...NODE_KINDS, 'homepage', 'navview'])
export type BannerOwnerKind = z.infer<typeof bannerOwner>

const containerKind = z.enum(CONTAINER_KINDS)

/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. `archive` is a delete from the Archive's Undo, returning the item to the bundle its record names. */
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
  op('archive', { path: z.string(), kind: z.enum(['page', 'set']), leaf: z.string().optional() }),
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
  // `held` is what the file held under the property's key, written back as it was; absent, the file held no key.
  op('restoreValue', { path: z.string(), propertyId: z.string(), held: z.unknown().optional() }),
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
  op('renameContext', { contextId: z.string(), newName: z.string(), from: z.string().optional() }),
  op('renameSpace', { spaceId: z.string(), newName: z.string(), from: z.string().optional() }),
  op('setContext', { path: z.string(), contextId: z.string(), spaceIds: ids }),
  op('setSpaceColor', { spaceId: z.string(), color: z.string().optional() }),
  op('reorderContexts', { ids }),
  op('reorderPanelContexts', { ids }),
  op('reorderSpaces', { contextId: z.string(), ids }),
  op('setSpaceRowOrder', { path: z.string(), ids }),
  op('retryUnreadable', { path: z.string() }),
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

// A `mutate` create carries the ID the window minted, since its ask places the newborn by ID; a create on a feature's own channel, a tile's or a property's, places nothing in its ask and learns its ID from the reply.
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
  (req.op === 'rename' && req.kind !== 'page')
