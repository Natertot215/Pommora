// One property schema entry. The zod schema IS the codec AND the type (z.infer). Definitions live
// in the nexus-wide registry; a Collection assigns them by id.
//
// Snake_case keys = the on-disk shape. Loose ⇒ foreign keys within a def survive a rewrite.
// What is modeled here is what the write path or a renderer actually reads — a rider nothing
// consumes rides through as a foreign key and does not earn a field.

import { z } from 'zod'

/** Property type catalog. Raw lowercase / snake_case strings = the on-disk values. */
export const propertyType = z.enum([
  'number',
  'checkbox',
  'datetime',
  'select',
  'multi_select',
  'status',
  'url',
  'context', // a registry Context's synthesized relation (one per entry); minted by the registry, not the schema editor
  'last_edited_time',
  'file',
])
export type PropertyType = z.infer<typeof propertyType>

/** How a link reads: Full Link the whole address, Short Link its bare domain, Page Title the site's
 *  fetched `<title>`. One vocabulary for every link in the app — a URL property's configured look and
 *  the form a pasted link is written in are the same three choices, named the same way, so nothing
 *  downstream can disagree about what any of them means. The order is the order they are offered in,
 *  and the first is the default. */
export const LINK_DISPLAYS = ['link-full', 'link-short', 'link-title'] as const
export type LinkDisplay = (typeof LINK_DISPLAYS)[number]

export const isLinkDisplay = (v: string | undefined): v is LinkDisplay =>
  (LINK_DISPLAYS as readonly (string | undefined)[]).includes(v)

/** The form a link takes where nothing has said otherwise — a property with no Format set, a column
 *  naming none, and the nexus-wide paste default. Read from the vocabulary rather than spelled at
 *  each of those, so "the first is the default" is a fact one place holds. */
export const DEFAULT_LINK_DISPLAY: LinkDisplay = LINK_DISPLAYS[0]

/** What each form is called wherever one is picked — a URL property's Format control, the nexus-wide
 *  default in Settings, and a link's own Format menu, which main builds and so cannot read a
 *  renderer's list. */
export const LINK_DISPLAY_LABELS: Record<LinkDisplay, string> = {
  'link-full': 'Full Link',
  'link-short': 'Short Link',
  'link-title': 'Page Title',
}

/** Number format families. `number` = plain, `percent` = literal + `%` (NOT ×100), `currency` = an ISO code. */
export const NUMBER_FAMILIES = ['number', 'percent', 'currency'] as const
export type NumberFamily = (typeof NUMBER_FAMILIES)[number]

/** The currencies seeded in the Format picker; `Intl.NumberFormat` renders any ISO code, so this is the
 *  curated common set, not a limit. */
export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'] as const

const selectOption = z.looseObject({
  value: z.string(),
  label: z.string(),
  // Open solid-palette key (chipColorFor normalizes on render). Lenient: a non-string degrades to
  // undefined rather than failing the whole def parse.
  color: z.string().optional().catch(undefined),
})

/** Status-group ids — an OPEN set, seeded with upcoming / in_progress / done. The count is
 *  deliberately uncapped: a group is identified by its id, never by its position in a fixed three. */
export const statusGroupId = z.string()
export type StatusGroupId = z.infer<typeof statusGroupId>

const statusOption = z.looseObject({
  value: z.string(),
  label: z.string(),
  color: z.string().optional().catch(undefined),
  group_id: statusGroupId,
})
export type StatusOption = z.infer<typeof statusOption>

const statusGroup = z.looseObject({
  id: statusGroupId,
  label: z.string(),
  // Open solid-palette key, required — an absent / non-string color falls back to the neutral solid
  // rather than dropping the group.
  color: z.string().catch('grey'),
  options: z.array(statusOption),
})
export type StatusGroup = z.infer<typeof statusGroup>

/** Context picker constraint — which registry Context a `context` property draws from. */
const contextTarget = z.looseObject({
  context_id: z.string().optional(),
})

/** One property schema entry. Loose ⇒ display config + any foreign keys ride through. */
export const propertyDefinition = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: propertyType,
  icon: z.string().optional(),
  select_options: z.array(selectOption).optional(),
  status_groups: z.array(statusGroup).optional(),
  context_target: contextTarget.optional(),
  // Link display config is def-level per-property: how a URL property's values render.
  // `link_color` is a solid-palette key; absent =
  // Default = the system accent. Lenient .catch so an unknown value degrades to the default look.
  link_underline: z.boolean().optional().catch(undefined),
  // Which of the three link displays this property's values render as; absent = the default. A
  // per-value alias (a `[alias](url)` markdown value, set via Rename) overrides all of them — the
  // alias always wins.
  link_display: z.enum(LINK_DISPLAYS).optional().catch(undefined),
  link_color: z.string().optional().catch(undefined),
  // A checkbox property's def-level color (property-wide, mirroring link_color): a solid-palette key
  // tinting both looks — the box fill (checkbox look) and the on-track (switch look). Absent = Default
  // = the system accent. The checkbox/switch LOOK itself is per-VIEW (column_styles), not here.
  checkbox_color: z.string().optional().catch(undefined),
  // Def-level number format config — kept per-def rather than per-view because a format rode as an
  // inert foreign key. `number_family` picks plain/percent/currency; percent stores the LITERAL
  // (30 → "30%"); fraction renders "N out of number_denominator" (Number/Currency only). Loose
  // .catch ⇒ a bad value drops the field, never the def.
  number_family: z.enum(NUMBER_FAMILIES).optional().catch(undefined),
  number_currency: z.string().optional().catch(undefined),
  number_separators: z.boolean().optional().catch(undefined),
  number_decimals: z
    .union([z.literal('hidden'), z.number().int()])
    .optional()
    .catch(undefined),
  number_fraction: z.boolean().optional().catch(undefined),
  number_denominator: z.number().optional().catch(undefined),
})
export type PropertyDefinition = z.infer<typeof propertyDefinition>

/** The def-level link display config, narrowed for the editor, the bridge's patch argument, and the
 *  whitelist main writes through — one shape, so a new link field is declared once. */
export type LinkConfig = Pick<PropertyDefinition, 'link_underline' | 'link_display' | 'link_color'>

/** The def-level number format config, narrowed for the pure formatter + the editor. */
export type NumberConfig = Pick<
  PropertyDefinition,
  | 'number_family'
  | 'number_currency'
  | 'number_separators'
  | 'number_decimals'
  | 'number_fraction'
  | 'number_denominator'
>

// MARK: - Reserved property IDs

/** Built-in property IDs use a `_` prefix; user properties use `prop_<ulid>` (minted by
 *  `mintPropertyId` in ids.ts). A display name carries its own rules — unique nexus-wide and
 *  no leading `$` — because the name is the key its values write under. */
export const RESERVED_PROPERTY_ID = {
  id: '_id',
  title: '_title',
  createdAt: '_created_at',
  modifiedAt: '_modified_at',
  // Filter-only Location target — never a column; the filter's location branch runs before the
  // declaredType dispatch, so this id deliberately resolves to no type.
  location: '_location',
} as const

const RESERVED_SET = new Set<string>(Object.values(RESERVED_PROPERTY_ID))

/** True iff `id` is in the reserved catalog (the schema editor blocks claiming one). */
export function isReservedPropertyId(id: string): boolean {
  return RESERVED_SET.has(id)
}

/** A status def's options flattened for display — an option without its own color wears its
 *  GROUP's (the on-disk contract: group color is the default, option color the override). THE
 *  read for status chips anywhere the group isn't separately in scope. */
export function statusOptions(
  def: Pick<PropertyDefinition, 'status_groups'> | undefined,
): StatusOption[] {
  return (def?.status_groups ?? []).flatMap((g) =>
    g.options.map((o) => (o.color ? o : { ...o, color: g.color })),
  )
}

/** Every option value a definition offers, whichever list holds them. Keyed on the DECLARED type,
 *  never on which array happens to be present: a type change retains the array it moved away from,
 *  so a Status property can still carry select_options and shape inference would read the stale one. */
export function optionValues(def: Pick<PropertyDefinition, 'type' | 'status_groups' | 'select_options'>): string[] {
  return def.type === 'status'
    ? (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
    : (def.select_options ?? []).map((o) => o.value)
}

/** Default 3-group seed written when a Status property is first added. Group IDs are stable — they
 *  are the identity a rename must not disturb. Labels are Open / Active / Done, and each group
 *  seeds one option whose value=label=its group label, carrying the group color. */
export function defaultStatusSeed(): StatusGroup[] {
  return [
    {
      id: 'upcoming',
      label: 'Open',
      color: 'grey',
      options: [{ value: 'Open', label: 'Open', color: 'grey', group_id: 'upcoming' }],
    },
    {
      id: 'in_progress',
      label: 'Active',
      color: 'blue',
      options: [{ value: 'Active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'Done', label: 'Done', color: 'green', group_id: 'done' }],
    },
  ]
}

/** Default single-option seed written when a Select / Multi-Select property is first added. Creation
 *  seeds one starter option (value=label=title) the user then renames or extends. */
export function defaultSelectSeed(): { value: string; label: string }[] {
  return [{ value: 'Option 1', label: 'Option 1' }]
}
