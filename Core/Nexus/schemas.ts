// `z.looseObject` ⇒ FOREIGN keys survive a rewrite — outside tools and agents can add keys to a `.nexus` file or a page’s frontmatter without Pommora erasing them.

import { z } from 'zod'
import { entriesOf, numberCheck } from '../Files/decoders'
import { CROP_POINT, CROP_ZOOM } from '../Assets/cropGeometry'
import { OPEN_INS, VIEW_BUTTONS, type OpenIn, type ViewButton } from '../Views/viewRow'
import { ID_KEY } from './identityMark'

const openInField = z.enum(OPEN_INS).optional().catch(undefined)
const viewButtonField = z.enum(VIEW_BUTTONS).optional().catch(undefined)

export const coerceOpenIn = (raw: unknown): OpenIn | undefined => openInField.parse(raw)
export const coerceViewButton = (raw: unknown): ViewButton | undefined => viewButtonField.parse(raw)

export const crop = z.object({
  x: numberCheck(CROP_POINT),
  y: numberCheck(CROP_POINT),
  zoom: numberCheck(CROP_ZOOM),
  color: z.string().optional(),
})
export type Crop = z.infer<typeof crop>

export const cropsFile = z.looseObject({
  byImage: entriesOf(crop).optional().catch(undefined),
})

export const pageMetaEntry = z.object({
  icon: z.string().optional().catch(undefined),
  aliases: z.array(z.string()).optional().catch(undefined),
  title_icon: z.boolean().optional().catch(undefined),
  locked: z.literal(true).optional().catch(undefined),
})
export type PageMeta = z.infer<typeof pageMetaEntry>
export type PageMetaPatch = { [K in keyof PageMeta]?: PageMeta[K] | null }

export const metadataShardFile = z.looseObject({
  pages: entriesOf(pageMetaEntry).optional().catch(undefined),
})

export const pageFrontmatter = z.looseObject({
  [ID_KEY]: z.string(),
  banner: z.string().optional().catch(undefined),
})
export type PageFrontmatter = z.infer<typeof pageFrontmatter>
