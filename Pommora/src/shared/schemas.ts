// zod schemas for the JSON sidecars. Each schema IS the codec AND the type (`z.infer`) — one
// source of truth. `z.looseObject` ⇒ FOREIGN keys survive a rewrite — outside tools and agents
// can add keys to a sidecar without Pommora erasing them.

import { z } from 'zod'
import { PAGE_ID_KEY } from './identity'
import { savedView } from './views'

const ulidList = z.array(z.string()).optional()

// Each field doubles as the read-side coercer for readNexus.
export const openInField = z.enum(['full-page', 'page-preview']).optional().catch(undefined)
export const viewButtonField = z.enum(['icon', 'labeled']).optional().catch(undefined)
export const viewStyleField = z.enum(['dropdown', 'toolbar']).optional().catch(undefined)

export const coerceOpenIn = (raw: unknown): 'full-page' | 'page-preview' | undefined =>
  openInField.parse(raw)
export const coerceViewButton = (raw: unknown): 'icon' | 'labeled' | undefined =>
  viewButtonField.parse(raw)
export const coerceViewStyle = (raw: unknown): 'dropdown' | 'toolbar' | undefined =>
  viewStyleField.parse(raw)

/** Fields shared by every folder sidecar. Loose ⇒ unknown keys are retained. */
const baseSidecar = z.looseObject({
  id: z.string(),
  icon: z.string().optional(),
  modified_at: z.string().optional(),
})

// `_pagecollection.json` is the schema-bearing TOP level (a top Collection has no parent).
// `properties` is the ASSIGNMENT LIST — the nexus-wide registry prop-ids this Collection
// validates. The defs themselves live in `.nexus/properties.json`; readNexus joins ids→defs.
export const pageCollectionSidecar = baseSidecar.extend({
  banner: z.string().optional(),
  set_order: ulidList,
  page_order: ulidList,
  properties: z.array(z.string()).optional(),
  default_sort: z.looseObject({}).optional(),
  views: z.array(savedView).optional(),
  open_in: openInField,
  view_button: viewButtonField,
  view_style: viewStyleField,
})

// `_pageset.json` is the RECURSIVE level at any depth. `parent_id` is the immediate parent
// (a Collection at depth-1, a Set deeper). `set_order` orders child Sets; `views`/`banner`
// are read at every depth, not just depth-1.
export const pageSetSidecar = baseSidecar.extend({
  parent_id: z.string().optional(),
  page_order: ulidList,
  set_order: ulidList,
  banner: z.string().optional(),
  views: z.array(savedView).optional(),
  view_button: viewButtonField,
  view_style: viewStyleField,
})

/** `_space.json` — one Space under `.nexus/contexts/<Context>/<Space>/`. Membership comes
 *  from the parent folder, never a field. `color` is an open chip-solid key validated
 *  through the chip map at read (an unknown value degrades to the neutral Default). Loose
 *  ⇒ blocks/layout/blocks_locked and the Space's own parenthesized relation keys ride through. */
export const spaceSidecar = baseSidecar.extend({
  banner: z.string().optional(),
  color: z.string().optional().catch(undefined),
})

/** Page (.md) frontmatter. Context links are parenthesized TITLE keys (`(Projects):`)
 *  riding the loose object as retained raw keys — resolved against the registry at walk
 *  assembly, never modeled here (per-nexus dynamic keys can't be schema fields).
 *  A property value rides the same way, under its own wrapped name key. Loose ⇒ every wrapped
 *  key and every foreign key rides through unmodeled. */
export const pageFrontmatter = z.looseObject({
  [PAGE_ID_KEY]: z.string(),
  icon: z.string().optional(),
  created_at: z.string().optional(),
  modified_at: z.string().optional(),
  cover: z.string().optional(),
})
export type PageFrontmatter = z.infer<typeof pageFrontmatter>

/** The modeled top-level page keys a FULL page rewrite governs (set if present, else
 *  delete). Partial updates pass a narrower key set so they touch nothing else. */
export const PAGE_MODELED_KEYS = [
  PAGE_ID_KEY,
  'icon',
  'created_at',
  'modified_at',
  'cover',
] as const
