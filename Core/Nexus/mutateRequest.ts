import { z } from 'zod'
import { ok, type Result } from '../Contract/result'
import { propertyValue } from '../Properties/propertyValue'
import { crop, type PageMetaPatch } from './schemas'
import type { CascadeReport } from './cascade'
import { CONTAINER_KINDS, HELD_KINDS, type HeldKind, NODE_KINDS } from './entities'

/** `renamed` is what actually landed — a from-create rename may disambiguate away from the ask. */
export interface MutateOutcome {
  created?: { id: string; path: string }
  renamed?: { path: string; name: string }
  cascade?: CascadeReport
  adopted?: string
  trashed?: { bundlePath: string }
  /** The titles of what a restore brought back without all it held. */
  unrestored?: string[]
  /** Where a restored page, Collection, Set, Space, or Context landed. */
  landed?: string
}
export type MutateReply = Result<MutateOutcome>

export const done = (r: Result<unknown>): MutateReply => (r.ok ? ok({}) : r)

export const DEFAULT_NEW_NAME = 'Untitled'

export const NEW_SLOT = '$new'

export const fillSlot = (order: string[], id: string): string[] =>
  order.map((x) => (x === NEW_SLOT ? id : x))

const heldKind = z.enum(HELD_KINDS)
export type RenameKind = HeldKind | 'homepage'

const bannerOwner = z.enum([...NODE_KINDS, 'homepage', 'navview'])
export type BannerOwnerKind = z.infer<typeof bannerOwner>

const containerKind = z.enum(CONTAINER_KINDS)

/** Checked against the write path's own destination rules: a contradicting claim is refused as malformed. */
const restoreDestination = z.object({ kind: z.enum(['container', 'context']), id: z.string() })
export type RestoreDestination = z.infer<typeof restoreDestination>

const childOrderKey = z.literal('set_order')
export type ChildOrderKey = z.infer<typeof childOrderKey>
const ids = z.array(z.string())
const pageMetaPatch: z.ZodType<Omit<PageMetaPatch, 'icon'>> = z.object({
  aliases: z.array(z.string()).nullable().optional(),
  title_icon: z.boolean().nullable().optional(),
  locked: z.literal(true).nullable().optional(),
} satisfies { [K in Exclude<keyof PageMetaPatch, 'icon'>]: z.ZodType })

const op = <K extends string, S extends z.ZodRawShape>(literal: K, fields: S) =>
  z.object({ op: z.literal(literal), ...fields })

// Every structural write enters through this one shape: a key it doesn't name is dropped, and a value off its type is refused before anything is written.
export const mutateRequest = z.discriminatedUnion('op', [
  op('createPage', {
    parentPath: z.string(),
    name: z.string(),
    seeds: z.record(z.string(), propertyValue).optional(),
    order: ids.optional(),
  }),
  op('createContainer', {
    parentPath: z.string(),
    kind: containerKind,
    name: z.string(),
    order: ids.optional(),
  }),
  // Membership is keyed by TITLE, so Spaces and Contexts rename through their own ops. `fromCreate` marks a just-created page's first commit: disambiguates like a create, and skips the link cascade a linkless page can't need.
  op('rename', {
    path: z.string(),
    kind: heldKind.exclude(['space', 'context']),
    newName: z.string(),
    fromCreate: z.literal(true).optional(),
  }),
  op('renameHeading', { path: z.string(), heading: z.string(), to: z.string() }),
  op('delete', { path: z.string(), kind: heldKind }),
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
  op('setPageMeta', { path: z.string(), patch: pageMetaPatch }),
  // Absent order = legacy append. Stale ids in a source container self-drop on the next read.
  op('movePage', { path: z.string(), newParentPath: z.string(), order: ids.optional() }),
  op('moveSet', { path: z.string(), newParentPath: z.string(), order: ids }),
  op('reorderChildren', { parentPath: z.string(), key: childOrderKey, order: ids }),
  op('reorderTop', { order: ids }),
  op('createContextGroup', { name: z.string() }),
  op('createSpace', { contextId: z.string(), name: z.string(), order: ids.optional() }),
  op('renameContext', { contextId: z.string(), newName: z.string() }),
  op('renameSpace', { spaceId: z.string(), newName: z.string() }),
  op('setContext', { path: z.string(), contextId: z.string(), spaceIds: ids }),
  op('setSpaceColor', { spaceId: z.string(), color: z.string().optional() }),
  op('reorderContexts', { ids }),
  op('reorderPanelContexts', { ids }),
  op('reorderSpaces', { contextId: z.string(), ids }),
  op('setSpaceRowOrder', { path: z.string(), contexts: ids, properties: ids }),
  op('retryUnreadable', { path: z.string() }),
])
export type MutateRequest = z.infer<typeof mutateRequest>

type CreatePageRequest = Extract<MutateRequest, { op: 'createPage' }>

export const contextSeeds = (req: CreatePageRequest): [contextId: string, spaceIds: string[]][] =>
  Object.entries(req.seeds ?? {}).flatMap(([id, v]) =>
    v.kind === 'context' ? [[id, v.value]] : [],
  )

export const seedsContext = (req: CreatePageRequest): boolean => contextSeeds(req).length > 0
