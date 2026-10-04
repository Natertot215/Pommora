// Loose ⇒ foreign keys within a def survive a rewrite: what is modeled here is only what the write path or a renderer actually reads.

import { z } from 'zod'
import { isKeyOf, isPlainObject } from '../Contract/validators'
import { looseDecoder } from '../Files/decoders'
import { rootSegs } from '../Paths/exclusion'
import { foldKey, normalizeTitle } from '../Paths/caseFold'
import type { ValueKind } from './propertyValue'

const typeIds = z.enum([
  'number',
  'checkbox',
  'dateTime',
  'select',
  'multiSelect',
  'status',
  'link',
  'context', // the type of a column synthesized from a registry Context; creating a property with it is refused
  'createdTime',
  'lastEditedTime',
  'file',
])
export type PropertyType = z.infer<typeof typeIds>

// `options` names where a type keeps its options: `select_options`, or `status_groups` for Status.
export type TypeSpec = Readonly<{
  kind: ValueKind
  origin: 'user' | 'stamp' | 'context'
  groups?: true
  options?: 'select' | 'status'
}>

export const PROPERTY_TYPES: Readonly<Record<PropertyType, TypeSpec>> = {
  number: { kind: 'number', origin: 'user' },
  checkbox: { kind: 'checkbox', origin: 'user' },
  dateTime: { kind: 'dateTime', origin: 'user', groups: true },
  select: { kind: 'select', origin: 'user', groups: true, options: 'select' },
  multiSelect: { kind: 'multiSelect', origin: 'user', options: 'select' },
  status: { kind: 'select', origin: 'user', groups: true, options: 'status' },
  link: { kind: 'link', origin: 'user' },
  context: { kind: 'context', origin: 'context' },
  createdTime: { kind: 'dateTime', origin: 'stamp' },
  lastEditedTime: { kind: 'dateTime', origin: 'stamp' },
  file: { kind: 'file', origin: 'user' },
}

export const byFoldedName = <D extends { name: string }>(defs: Iterable<D>): Map<string, D> =>
  new Map(Array.from(defs, (d) => [foldKey(d.name), d]))

/** Each item under its folded title, the first of any whose titles fold alike. */
export function firstPerTitle<T>(
  items: Iterable<T>,
  titleOf: (item: T) => unknown = (item) => item,
): Map<string, T> {
  const byTitle = new Map<string, T>()
  for (const item of items) {
    const fold = normalizeTitle(titleOf(item))
    if (!byTitle.has(fold)) byTitle.set(fold, item)
  }
  return byTitle
}

/** Whether two spellings of the property's key join into one list; every other type keeps the value its read key holds. */
export function holdsList(def: Pick<PropertyDefinition, 'type'>): boolean {
  const kind = PROPERTY_TYPES[def.type].kind
  return kind === 'multiSelect' || kind === 'file'
}

export const specOf = (t: PropertyType | 'title' | undefined): TypeSpec | undefined =>
  t === undefined || t === 'title' ? undefined : PROPERTY_TYPES[t]

export const groupable = (t: PropertyType | 'title' | undefined): boolean =>
  specOf(t)?.groups === true

export type OptionPickKind = Extract<ValueKind, 'select' | 'multiSelect' | 'context'>

export function pickKindOf(t: PropertyType | 'title' | undefined): OptionPickKind | null {
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
    case undefined:
      return null
  }
}

// The spellings written to disk before the ids went camelCase; a Trash record and an older build's synced file keep them, so they read forever.
export const LEGACY_TYPE_IDS = {
  multi_select: 'multiSelect',
  url: 'link',
  datetime: 'dateTime',
} as const satisfies Record<string, PropertyType>

export const propertyType = z.preprocess(
  (v) => (isKeyOf(LEGACY_TYPE_IDS, v) ? LEGACY_TYPE_IDS[v] : v),
  typeIds,
)

export const LINK_DISPLAYS = ['link-full', 'link-short', 'link-title'] as const
export type LinkDisplay = (typeof LINK_DISPLAYS)[number]

export const isLinkDisplay = (v: string | undefined): v is LinkDisplay =>
  (LINK_DISPLAYS as readonly (string | undefined)[]).includes(v)

export const DEFAULT_LINK_DISPLAY: LinkDisplay = LINK_DISPLAYS[0]

export const LINK_DISPLAY_LABELS: Record<LinkDisplay, string> = {
  'link-full': 'Full Link',
  'link-short': 'Short Link',
  'link-title': 'Page Title',
}

/** `percent` stores the literal (30 → "30%"), NOT ×100; `currency` stores an ISO code. */
export const NUMBER_FAMILIES = ['number', 'percent', 'currency'] as const
export type NumberFamily = (typeof NUMBER_FAMILIES)[number]

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'] as const
export const DEFAULT_CURRENCY: (typeof CURRENCY_CODES)[number] = 'USD'

export const optionAppearance = z.enum(['filled', 'clear'])
export type OptionAppearance = z.infer<typeof optionAppearance>

const selectOption = looseDecoder(
  z.object({
    value: z.string(),
    icon: z.string().optional().catch(undefined),
    color: z.string().optional().catch(undefined),
    appearance: optionAppearance.optional().catch(undefined),
  }),
)
export type SelectOption = z.infer<typeof selectOption>
const selectOptions = z.array(selectOption)

/** An OPEN set: a group is identified by its id, never by its position, so the count is deliberately uncapped. */
const statusGroupId = z.string()

const statusOption = looseDecoder(
  z.object({
    value: z.string(),
    color: z.string().optional().catch(undefined),
    icon: z.string().optional().catch(undefined),
    appearance: optionAppearance.optional().catch(undefined),
    group_id: statusGroupId,
  }),
)
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
  name: z.string(),
  type: propertyType,
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
export const propertyDefinition = looseDecoder(propertyDefinitionFields)
export type PropertyDefinition = z.infer<typeof propertyDefinition>

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

export const RESERVED_PROPERTY_ID = {
  title: '_title',
  createdAt: '_created_at',
  modifiedAt: '_modified_at',
  location: '_location',
} as const

export const STAMP_TYPE: Readonly<Partial<Record<string, PropertyType>>> = {
  [RESERVED_PROPERTY_ID.createdAt]: 'createdTime',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'lastEditedTime',
}

const RESERVED_SET = new Set<string>(Object.values(RESERVED_PROPERTY_ID))

export function isReservedPropertyId(id: string): boolean {
  return RESERVED_SET.has(id)
}

export const RESERVED_NAME_PREFIX = '$'

export const KEY_REFUSAL = {
  empty: 'A name cannot be empty.',
  reservedPrefix: `A name cannot start with ${RESERVED_NAME_PREFIX} or <.`,
  reserved: (name: string) => `"${name}" is a key Pommora manages.`,
  duplicate: (name: string) => `A property named "${name}" already exists.`,
  held: (name: string, n: number) =>
    `${n} ${n === 1 ? 'file already uses' : 'files already use'} "${name}" as a key.`,
} as const

export function normalizePropertyName(raw: string): string {
  return raw.trim().normalize('NFC')
}

/** An option without its own color wears its group's. */
export const groupOptions = (g: StatusGroup): StatusOption[] =>
  g.options.map((o) => (o.color ? o : { ...o, color: g.color }))

function statusOptions(def: Pick<PropertyDefinition, 'status_groups'> | undefined): StatusOption[] {
  return (def?.status_groups ?? []).flatMap(groupOptions)
}

export type PickOption = { value: string; label: string; color?: string; icon?: string }

/** Keyed on the DECLARED type, never on which array happens to be present — a type change retains the array it moved away from, so a Status property can still carry a stale select_options. */
export const optionsOf = (
  def: Pick<PropertyDefinition, 'type' | 'select_options' | 'status_groups'> | undefined,
): (SelectOption | StatusOption)[] =>
  def && PROPERTY_TYPES[def.type].options === 'status'
    ? statusOptions(def)
    : (def?.select_options ?? [])

export const optionValues = (
  def: Pick<PropertyDefinition, 'type' | 'status_groups' | 'select_options'>,
): string[] => optionsOf(def).map((o) => o.value)

export const SELECT_GROUP = 'select'

export function optionGroupsOf(
  def: Pick<PropertyDefinition, 'type' | 'select_options' | 'status_groups'>,
): StatusGroup[] {
  if (PROPERTY_TYPES[def.type].options === 'status') return def.status_groups ?? []
  const options = (def.select_options ?? []).map((o) => ({ ...o, group_id: SELECT_GROUP }))
  return [{ id: SELECT_GROUP, label: '', color: '', options }]
}

const stored = <O extends object>({
  label: _stale,
  ...o
}: O & { label?: string }): Omit<O, 'label'> => o

export function withOptionGroups(
  def: PropertyDefinition,
  groups: StatusGroup[],
): PropertyDefinition {
  if (PROPERTY_TYPES[def.type].options === 'status')
    return { ...def, status_groups: groups.map((g) => ({ ...g, options: g.options.map(stored) })) }
  const select_options = (groups[0]?.options ?? []).map(({ group_id: _drop, ...o }) => stored(o))
  return { ...def, select_options }
}

export function defaultStatusSeed(): StatusGroup[] {
  return [
    {
      id: 'upcoming',
      label: 'Open',
      color: 'grey',
      options: [{ value: 'Open', color: 'grey', group_id: 'upcoming' }],
    },
    {
      id: 'in_progress',
      label: 'Active',
      color: 'blue',
      options: [{ value: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'Done', color: 'green', group_id: 'done' }],
    },
  ]
}

export function defaultSelectSeed(): { value: string }[] {
  return [{ value: 'Option 1' }]
}
