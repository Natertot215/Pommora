// Loose ⇒ foreign keys within a def survive a rewrite: what is modeled here is only what the
// write path or a renderer actually reads.

import { z } from 'zod'
import { KIND_ID_KEY, PAGE_MODELED_KEYS } from './identity'

export const propertyType = z.enum([
  'number',
  'checkbox',
  'datetime',
  'select',
  'multi_select',
  'status',
  'url',
  'context', // a registry Context's synthesized relation; minted by the registry, not the schema editor
  'last_edited_time',
  'file',
])
export type PropertyType = z.infer<typeof propertyType>

/** One vocabulary for every link in the app — a URL property's configured look and the form a
 *  pasted link is written in are the same three choices. Order is display order; first is default. */
export const LINK_DISPLAYS = ['link-full', 'link-short', 'link-title'] as const
export type LinkDisplay = (typeof LINK_DISPLAYS)[number]

export const isLinkDisplay = (v: string | undefined): v is LinkDisplay =>
  (LINK_DISPLAYS as readonly (string | undefined)[]).includes(v)

export const DEFAULT_LINK_DISPLAY: LinkDisplay = LINK_DISPLAYS[0]

/** Duplicated rather than imported — main builds a link's Format menu and cannot read a renderer's list. */
export const LINK_DISPLAY_LABELS: Record<LinkDisplay, string> = {
  'link-full': 'Full Link',
  'link-short': 'Short Link',
  'link-title': 'Page Title',
}

/** `percent` stores the literal (30 → "30%"), NOT ×100; `currency` stores an ISO code. */
export const NUMBER_FAMILIES = ['number', 'percent', 'currency'] as const
export type NumberFamily = (typeof NUMBER_FAMILIES)[number]

/** `Intl.NumberFormat` renders any ISO code — this is the curated common set, not a limit. */
export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'] as const

/** How an option's chip paints: filled is the tinted default and is never written; clear drops the
 *  fill and keeps the tinted border and label. */
const optionAppearance = z.enum(['filled', 'clear'])
export type OptionAppearance = z.infer<typeof optionAppearance>

const selectOption = z.looseObject({
  value: z.string(),
  label: z.string(),
  // Absent falls to the type's default (tag / tags).
  icon: z.string().optional().catch(undefined),
  // Lenient: a non-string degrades to undefined rather than failing the whole def parse.
  color: z.string().optional().catch(undefined),
  appearance: optionAppearance.optional().catch(undefined),
})

/** Status-group ids — an OPEN set, seeded with upcoming / in_progress / done. A group is identified
 *  by its id, never by its position, so the count is deliberately uncapped. */
export const statusGroupId = z.string()
export type StatusGroupId = z.infer<typeof statusGroupId>

const statusOption = z.looseObject({
  value: z.string(),
  label: z.string(),
  color: z.string().optional().catch(undefined),
  // Absent falls to the group's glyph.
  icon: z.string().optional().catch(undefined),
  appearance: optionAppearance.optional().catch(undefined),
  group_id: statusGroupId,
})
export type StatusOption = z.infer<typeof statusOption>

const statusGroup = z.looseObject({
  id: statusGroupId,
  label: z.string(),
  // Absent / non-string falls back to the neutral solid rather than dropping the group.
  color: z.string().catch('grey'),
  options: z.array(statusOption),
})
export type StatusGroup = z.infer<typeof statusGroup>

/** Context picker constraint — which registry Context a `context` property draws from. */
const contextTarget = z.looseObject({
  context_id: z.string().optional(),
})

export const propertyDefinition = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: propertyType,
  icon: z.string().optional(),
  select_options: z.array(selectOption).optional(),
  status_groups: z.array(statusGroup).optional(),
  context_target: contextTarget.optional(),
  link_underline: z.boolean().optional().catch(undefined),
  // A per-value alias (`[alias](url)`, set via Rename) overrides link_display — the alias always wins.
  link_display: z.enum(LINK_DISPLAYS).optional().catch(undefined),
  link_color: z.string().optional().catch(undefined),
  // Tints both the checkbox fill and switch on-track; the checkbox/switch LOOK is per-VIEW
  // (column_styles), not here.
  checkbox_color: z.string().optional().catch(undefined),
  // Kept per-def rather than per-view so a format rides as an inert foreign key across rewrites.
  number_family: z.enum(NUMBER_FAMILIES).optional().catch(undefined),
  number_currency: z.string().optional().catch(undefined),
  number_separators: z.boolean().optional().catch(undefined),
  number_decimals: z
    .union([z.literal('hidden'), z.number().int()])
    .optional()
    .catch(undefined),
  // Renders "N out of number_denominator" instead of the formatted number.
  number_fraction: z.boolean().optional().catch(undefined),
  number_denominator: z.number().optional().catch(undefined),
  // Relative to the asset root, so re-pointing the root moves every property's folder with it.
  // Governs new writes only — files already on disk keep resolving where they sit.
  file_directory: z.string().optional().catch(undefined),
})
export type PropertyDefinition = z.infer<typeof propertyDefinition>

/** One shape shared by the editor, the bridge's patch argument, and the whitelist main writes
 *  through — a new link field is declared once. */
export type LinkConfig = Pick<PropertyDefinition, 'link_underline' | 'link_display' | 'link_color'>

export type FileConfig = Pick<PropertyDefinition, 'file_directory'>

export type NumberConfig = Pick<
  PropertyDefinition,
  | 'number_family'
  | 'number_currency'
  | 'number_separators'
  | 'number_decimals'
  | 'number_fraction'
  | 'number_denominator'
>

/** Built-in property IDs use a `_` prefix; user properties use `prop_<ulid>`. */
export const RESERVED_PROPERTY_ID = {
  id: '_id',
  title: '_title',
  createdAt: '_created_at',
  modifiedAt: '_modified_at',
  // Filter-only, never a column — the filter's location branch runs before the declaredType
  // dispatch, so this id deliberately resolves to no type.
  location: '_location',
} as const

const RESERVED_SET = new Set<string>(Object.values(RESERVED_PROPERTY_ID))

export function isReservedPropertyId(id: string): boolean {
  return RESERVED_SET.has(id)
}

/** Reserved for system-assigned roles — a user name may not start with it. */
export const RESERVED_NAME_PREFIX = '$'
const RESERVED_KEY_NAMES: ReadonlySet<string> = new Set([
  ...Object.values(KIND_ID_KEY),
  ...PAGE_MODELED_KEYS,
])

export const KEY_REFUSAL = {
  empty: 'A name cannot be empty.',
  reservedPrefix: `A name cannot start with ${RESERVED_NAME_PREFIX} or <.`,
  reserved: (name: string) => `"${name}" is a key Pommora manages.`,
  duplicate: (name: string) => `A property named "${name}" already exists.`,
  held: (name: string, n: number) =>
    `${n} ${n === 1 ? 'page already uses' : 'pages already use'} "${name}" as a key.`,
} as const

/** Applied once at write, so an untrimmed or denormalized name never reaches disk — the key match
 *  stays an exact string compare with no normalization of its own. */
export function normalizePropertyName(raw: string): string {
  return raw.trim().normalize('NFC')
}

export function isReservedKeyName(name: string): boolean {
  return RESERVED_KEY_NAMES.has(normalizePropertyName(name))
}

export function invalidPropertyName(name: string): boolean {
  const n = normalizePropertyName(name)
  return !n || n.startsWith(RESERVED_NAME_PREFIX) || n.startsWith('<') || RESERVED_KEY_NAMES.has(n)
}

export function isRegisteredPropertyName(key: string, names: ReadonlySet<string>): boolean {
  return names.has(key)
}

export const propertyNames = (defs: Iterable<PropertyDefinition>): ReadonlySet<string> =>
  new Set([...defs].map((d) => d.name))

/** A status def's options flattened for display — an option without its own color wears its
 *  GROUP's (group color is the default, option color the override). THE read for status chips
 *  anywhere the group isn't separately in scope. */
export function statusOptions(
  def: Pick<PropertyDefinition, 'status_groups'> | undefined,
): StatusOption[] {
  return (def?.status_groups ?? []).flatMap((g) =>
    g.options.map((o) => (o.color ? o : { ...o, color: g.color })),
  )
}

/** The types whose options live in `select_options` — the array's validator, seeder, and editor all
 *  answer to this predicate. A Status property's options live in `status_groups` instead, and every
 *  other type has none, so writing `select_options` onto one of those corrupts the definition. */
export const hasSelectOptions = (type: PropertyType): type is 'select' | 'multi_select' =>
  type === 'select' || type === 'multi_select'

/** Every option value a definition offers, whichever list holds them. Keyed on the DECLARED type,
 *  never on which array happens to be present — a type change retains the array it moved away from,
 *  so a Status property can still carry a stale select_options. */
export function optionValues(
  def: Pick<PropertyDefinition, 'type' | 'status_groups' | 'select_options'>,
): string[] {
  return def.type === 'status'
    ? (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
    : (def.select_options ?? []).map((o) => o.value)
}

/** Default 3-group seed written when a Status property is first added. Group IDs are stable — the
 *  identity a rename must not disturb. */
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

/** Written when a Select / Multi-Select property is first added; the user renames or extends it. */
export function defaultSelectSeed(): { value: string; label: string }[] {
  return [{ value: 'Option 1', label: 'Option 1' }]
}
