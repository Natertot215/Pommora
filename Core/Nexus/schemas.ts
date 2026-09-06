// `z.looseObject` ⇒ FOREIGN keys survive a rewrite — outside tools and agents can add keys to a sidecar without Pommora erasing them.

import { z } from 'zod'
import { OPEN_INS, VIEW_BUTTONS, type OpenIn, type ViewButton } from '../Views/viewRow'
import { savedView } from '../Views/views'
import { ID_KEY } from './identityMark'
import { readSidecar } from '../IO/sidecar'

const ulidList = z.array(z.string()).optional()

const openInField = z.enum(OPEN_INS).optional().catch(undefined)
const viewButtonField = z.enum(VIEW_BUTTONS).optional().catch(undefined)

export const coerceOpenIn = (raw: unknown): OpenIn | undefined => openInField.parse(raw)
export const coerceViewButton = (raw: unknown): ViewButton | undefined => viewButtonField.parse(raw)

export const crop = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
  color: z.string().optional(),
})
export type Crop = z.infer<typeof crop>

export const cropsFile = z.looseObject({
  byImage: z.record(z.string(), crop.optional().catch(undefined)).optional().catch(undefined),
})

/** Deliberately non-discriminating — it validates any sidecar — so it must never stand in for the kind decision itself. */
export const baseSidecar = z.looseObject({
  id: z.string(),
  icon: z.string().optional(),
})

// `properties` is the ASSIGNMENT LIST — the nexus-wide registry prop-ids this Collection validates. The defs themselves live in `.nexus/properties.json`; readNexus joins ids→defs.
export const pageCollectionSidecar = baseSidecar.extend({
  banner: z.string().optional(),
  set_order: ulidList,
  page_order: ulidList,
  properties: z.array(z.string()).optional(),
  views: z.array(savedView).optional(),
  open_in: openInField,
  view_button: viewButtonField,
  disclosure_locked: z.boolean().optional(),
})

// Parentage is the folder nesting itself, never a stored field.
export const pageSetSidecar = baseSidecar.extend({
  page_order: ulidList,
  set_order: ulidList,
  banner: z.string().optional(),
  views: z.array(savedView).optional(),
  view_button: viewButtonField,
  disclosure_locked: z.boolean().optional(),
})

export const pageFrontmatter = z.looseObject({
  [ID_KEY]: z.string(),
  icon: z.string().optional().catch(undefined),
  banner: z.string().optional().catch(undefined),
})
export type PageFrontmatter = z.infer<typeof pageFrontmatter>

/** A container's sidecar is read through this table, never by naming the schema at the call site. */
export type ContainerKind = 'collection' | 'set'
type ContainerSidecar = z.infer<typeof pageCollectionSidecar> | z.infer<typeof pageSetSidecar>
export const readContainerSidecar = (
  absFolder: string,
  kind: ContainerKind,
): Promise<ContainerSidecar | null> =>
  kind === 'collection'
    ? readSidecar(absFolder, 'collection', pageCollectionSidecar)
    : readSidecar(absFolder, 'set', pageSetSidecar)
