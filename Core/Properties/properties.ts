// Loose ⇒ foreign keys within a def survive a rewrite: what is modeled here is only what the write path or a renderer actually reads.

import { z } from 'zod'
import { isKeyOf, isPlainObject } from '../Contract/validators'
import { looseDecoder } from '../Files/decoders'
import { LINK_DISPLAYS } from '../Connections/linkValue'
import { rootSegs } from '../Paths/exclusion'
import type { ValueKind } from './propertyValue'
import { KEY_FORMATS } from './keyFormat'

export const typeIds = z.enum([
  'text',
  'number',
  'checkbox',
  'dateTime',
  'select',
  'multiSelect',
  'status',
  'link',
  'file',
  'context', // the type of a column synthesized from a registry Context; the property list never holds it
])
export type PropertyType = z.infer<typeof typeIds>
type FiledataType = 'title' | 'createdTime' | 'lastEditedTime'
export type ColumnType = PropertyType | FiledataType

// `options` names where a type keeps its options: `select_options`, or `status_groups` for Status.
// `connections` names a type whose values hold connections: Link's whole value, or the links inside Text's prose.
type TypeSpec = Readonly<{
  kind: ValueKind
  origin: 'user' | 'context' | 'filedata'
  groups?: true
  options?: 'select' | 'status'
  connections?: 'value' | 'prose'
  registersMembers?: true
  blankDraws?: true
}>

export const PROPERTY_TYPES: Readonly<Record<ColumnType, TypeSpec>> = {
  text: { kind: 'text', origin: 'user', connections: 'prose' },
  number: { kind: 'number', origin: 'user' },
  checkbox: { kind: 'checkbox', origin: 'user', blankDraws: true },
  dateTime: { kind: 'dateTime', origin: 'user', groups: true },
  select: { kind: 'select', origin: 'user', groups: true, options: 'select' },
  multiSelect: { kind: 'multiSelect', origin: 'user', options: 'select', registersMembers: true },
  status: { kind: 'select', origin: 'user', groups: true, options: 'status' },
  link: { kind: 'link', origin: 'user', connections: 'value' },
  file: { kind: 'file', origin: 'user' },
  context: { kind: 'context', origin: 'context' },
  title: { kind: 'text', origin: 'filedata' },
  createdTime: { kind: 'dateTime', origin: 'filedata' },
  lastEditedTime: { kind: 'dateTime', origin: 'filedata' },
}

export const isUserType = (t: string): t is PropertyType =>
  isKeyOf(PROPERTY_TYPES, t) && PROPERTY_TYPES[t].origin === 'user'

export const CREATABLE_TYPES = Object.keys(PROPERTY_TYPES).filter(isUserType)

export const byKey = <D extends { key: string }>(defs: Iterable<D>): Map<string, D> =>
  new Map(Array.from(defs, (d) => [d.key, d]))

export const specOf = (t: ColumnType | undefined): TypeSpec | undefined =>
  t === undefined ? undefined : PROPERTY_TYPES[t]

export const groupable = (t: ColumnType | undefined): boolean => specOf(t)?.groups === true

export type OptionPickKind = Extract<ValueKind, 'select' | 'multiSelect' | 'context'>

export function pickKindOf(t: ColumnType | undefined): OptionPickKind | null {
  const kind = specOf(t)?.kind
  switch (kind) {
    case 'select':
    case 'multiSelect':
    case 'context':
      return kind
    case 'number':
    case 'checkbox':
    case 'dateTime':
    case 'link':
    case 'file':
    case 'text':
    case undefined:
      return null
  }
}

/** `percent` stores the literal (30 → "30%"), NOT ×100; `currency` stores an ISO code. */
const NUMBER_FAMILIES = ['number', 'percent', 'currency'] as const
export type NumberFamily = (typeof NUMBER_FAMILIES)[number]

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'] as const
export const DEFAULT_CURRENCY: (typeof CURRENCY_CODES)[number] = 'USD'

export const optionAppearance = z.enum(['filled', 'clear'])
export type OptionAppearance = z.infer<typeof optionAppearance>

/** A word a registry gives no label reads its key as its label. */
export const labelled = <W extends { key: string; label?: string }>(
  w: W,
): W & { label: string } => ({
  ...w,
  label: w.label ?? w.key,
})

const selectOption = looseDecoder(
  z.object({
    key: z.string(),
    label: z.string().optional(),
    icon: z.string().optional().catch(undefined),
    color: z.string().optional().catch(undefined),
    appearance: optionAppearance.optional().catch(undefined),
  }),
).transform(labelled)
export type SelectOption = z.infer<typeof selectOption>
const selectOptions = z.array(selectOption)

/** An OPEN set: a group is identified by its id, never by its position, so the count is deliberately uncapped. */
const statusGroupId = z.string()

const statusOption = looseDecoder(
  z.object({
    key: z.string(),
    label: z.string().optional(),
    color: z.string().optional().catch(undefined),
    icon: z.string().optional().catch(undefined),
    appearance: optionAppearance.optional().catch(undefined),
    group_id: statusGroupId,
  }),
).transform(labelled)
export type StatusOption = z.infer<typeof statusOption>

const statusGroup = looseDecoder(
  z.object({
    id: statusGroupId,
    label: z.string(),
    color: z.string().catch('grey'),
    options: z.array(statusOption),
  }),
)
export type StatusGroup = z.infer<typeof statusGroup>
const statusGroups = z.array(statusGroup)

const propertyDefinitionFields = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string().optional(),
  type: typeIds,
  key_format: z.enum(KEY_FORMATS).optional().catch(undefined),
  value_format: z.enum(KEY_FORMATS).optional().catch(undefined),
  icon: z.string().optional(),
  select_options: selectOptions.optional(),
  status_groups: statusGroups.optional(),
  link_underline: z.boolean().optional().catch(undefined),
  // A per-value alias (`[alias](url)`, set via Rename) overrides link_display — the alias always wins.
  link_display: z.enum(LINK_DISPLAYS).optional().catch(undefined),
  link_color: z.string().optional().catch(undefined),
  // The checkbox/switch LOOK is per-VIEW (column_styles), not here.
  checkbox_color: z.string().optional().catch(undefined),
  // Kept per-def rather than per-view so a format rides as an inert foreign key across rewrites.
  number_family: z.enum(NUMBER_FAMILIES).optional().catch(undefined),
  // Intl throws on a currency that isn't three letters or a digit count outside 0–100; a foreign code it doesn't know still formats.
  number_currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .optional()
    .catch(undefined),
  number_separators: z.boolean().optional().catch(undefined),
  number_decimals: z
    .union([z.literal('hidden'), z.number().int().min(0).max(100)])
    .optional()
    .catch(undefined),
  number_fraction: z.boolean().optional().catch(undefined),
  number_denominator: z.number().optional().catch(undefined),
  // Relative to the asset root, so re-pointing the root moves every property's folder with it. Governs new writes only — files already on disk keep resolving where they sit.
  file_directory: z.string().optional().catch(undefined),
})
export const propertyDefinition = looseDecoder(propertyDefinitionFields).transform(labelled)
export type PropertyDefinition = z.infer<typeof propertyDefinition>

/** What a create is handed: the create writes the key from the label it lands. */
export const propertyDraft = looseDecoder(
  propertyDefinitionFields.omit({ key: true }).extend({ label: z.string() }),
)
export type PropertyDraft = z.infer<typeof propertyDraft>

export type LinkConfig = Pick<PropertyDefinition, 'link_underline' | 'link_display' | 'link_color'>

// A display-config write decodes against the definition's own fields, so it can patch nothing else: a key absent from the payload is left, and a present-but-invalid one goes back to its default.
const linkFields = propertyDefinitionFields.pick({
  link_underline: true,
  link_display: true,
  link_color: true,
})
const numberFields = propertyDefinitionFields.pick({
  number_family: true,
  number_currency: true,
  number_separators: true,
  number_decimals: true,
  number_fraction: true,
  number_denominator: true,
})
export const narrowLinkConfig = (payload: unknown): LinkConfig | null =>
  linkFields.safeParse(payload).data ?? null
export const narrowNumberFormat = (payload: unknown): NumberConfig | null =>
  numberFields.safeParse(payload).data ?? null
/** Stored relative to the asset ROOT; an empty result means the root itself — the absence of the field, not a stored empty string. */
export const narrowFileConfig = (payload: unknown): FileConfig | null => {
  if (!isPlainObject(payload) || !('file_directory' in payload)) return null
  const raw = typeof payload.file_directory === 'string' ? payload.file_directory : ''
  const dir = rootSegs(raw.trim()).join('/')
  return { file_directory: dir || undefined }
}

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

// Location is a sort, filter, and preview target rather than a shown column, so it carries no column type. `PROPERTY_TYPES` answers what a Filedata column type does; this answers which reserved id holds it and what it's called.
export const FILEDATA = {
  title: { id: '_title', type: 'title', label: 'Title' },
  createdAt: { id: '_created_at', type: 'createdTime', label: 'Creation Time' },
  modifiedAt: { id: '_modified_at', type: 'lastEditedTime', label: 'Last Modified' },
  location: { id: '_location', label: 'Location' },
} as const satisfies Record<string, Filedata>
export type Filedata = Readonly<{ id: string; type?: FiledataType; label: string }>

export const FILEDATA_BY_ID: ReadonlyMap<string, Filedata> = new Map(
  Object.values(FILEDATA).map((f) => [f.id, f]),
)

export const isReservedPropertyId = (id: string): boolean => FILEDATA_BY_ID.has(id)

export const itemCount = (n: number): string => `${n} ${n === 1 ? 'Item' : 'Items'}`

/** An option without its own color wears its group's. */
export const groupOptions = (g: StatusGroup): StatusOption[] =>
  g.options.map((o) => (o.color ? o : { ...o, color: g.color }))

function statusOptions(def: Pick<PropertyDefinition, 'status_groups'> | undefined): StatusOption[] {
  return (def?.status_groups ?? []).flatMap(groupOptions)
}

export type PickOption = { value: string; label: string; color?: string; icon?: string }

/** Keyed on the DECLARED type, never on which array happens to be present, so a stale `select_options` a hand edit leaves on a Status property is ignored. */
export const optionsOf = (
  def: Pick<PropertyDefinition, 'type' | 'select_options' | 'status_groups'> | undefined,
): (SelectOption | StatusOption)[] =>
  def && PROPERTY_TYPES[def.type].options === 'status'
    ? statusOptions(def)
    : (def?.select_options ?? [])

export const optionLabels = (
  def: Pick<PropertyDefinition, 'type' | 'status_groups' | 'select_options'>,
): string[] => optionsOf(def).map((o) => o.label)

export const SELECT_GROUP = 'select'

export function optionGroupsOf(
  def: Pick<PropertyDefinition, 'type' | 'select_options' | 'status_groups'>,
): StatusGroup[] {
  if (PROPERTY_TYPES[def.type].options === 'status') return def.status_groups ?? []
  const options = (def.select_options ?? []).map((o) => ({ ...o, group_id: SELECT_GROUP }))
  return [{ id: SELECT_GROUP, label: '', color: '', options }]
}

export function withOptionGroups(
  def: PropertyDefinition,
  groups: StatusGroup[],
): PropertyDefinition {
  if (PROPERTY_TYPES[def.type].options === 'status') return { ...def, status_groups: groups }
  const select_options = (groups[0]?.options ?? []).map(({ group_id: _drop, ...o }) => o)
  return { ...def, select_options }
}
