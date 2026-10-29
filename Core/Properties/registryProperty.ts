import { NOT_A_PROPERTY_DIR, validPropertyDir } from '../Assets/assetRoots'
import { rootSegs } from '../Paths/exclusion'
import { readWatchScope } from '../Settings/settings'
import { done, type MutateReply } from '../Nexus/mutateRequest'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { KEY_REFUSAL, validateDefinition, validateName } from './validation'
import { mintOptionId, mintPropertyId } from '../Nexus/ids'
import { freeName } from '../Paths/names'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { formatKey, type KeyFormat } from './keyFormat'
import { mapOptions } from './optionModel'
import {
  optionGroupsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type PropertyConfig,
  type PropertyDraft,
  type SelectOption,
  type StatusGroup,
  withOptionGroups,
} from './properties'
import { ok, fail, type Result } from '../Contract/result'
import { findHolders } from '../Index/keyHolders'
import {
  outsideArchive,
  rekeySweep,
  sweepCount,
  sweepGovernedRoots,
  type SweepPlan,
} from '../Nexus/governedSweep'
import { type ConfigReach, NO_REACH, sweptReach } from '../Nexus/configReach'
import type { KeyCollision } from '../Files/rootValues'
import {
  OWED,
  owedName,
  owedRename,
  owedSwept,
  propertyNote,
  readNotes,
  runNoted,
} from '../Nexus/owed'

export function defaultStatusSeed(): StatusGroup[] {
  return [
    {
      id: 'upcoming',
      label: 'Open',
      color: 'grey',
      options: [{ id: mintOptionId(), key: 'Open', label: 'Open', color: 'grey' }],
    },
    {
      id: 'in_progress',
      label: 'Active',
      color: 'blue',
      options: [{ id: mintOptionId(), key: 'Active', label: 'Active', color: 'blue' }],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ id: mintOptionId(), key: 'Done', label: 'Done', color: 'green' }],
    },
  ]
}

const defaultSelectSeed = (): SelectOption[] => [
  { id: mintOptionId(), key: 'Option 1', label: 'Option 1' },
]

const withOptionKeys = (def: PropertyDefinition): PropertyDefinition =>
  withOptionGroups(
    def,
    mapOptions(optionGroupsOf(def), (o) => ({ ...o, key: formatKey(o.label, def.value_format) })),
  )

// Seeds only when the field is undefined; an EMPTY array is a deliberate state, or emptying a select's options then making any unrelated edit would resurrect the seed.
function seeded(def: PropertyDefinition): PropertyDefinition {
  switch (PROPERTY_TYPES[def.type].options) {
    case 'status':
      return def.status_groups === undefined
        ? withOptionKeys({ ...def, status_groups: defaultStatusSeed() })
        : def
    case 'select':
      return def.select_options === undefined
        ? withOptionKeys({ ...def, select_options: defaultSelectSeed() })
        : def
    case undefined:
      return def
  }
}

function freeLabel(
  label: string,
  format: KeyFormat | undefined,
  defs: PropertyDefinition[],
): string {
  const labels = defs.map((d) => d.label)
  const keys = new Set(defs.map((d) => normalizeTitle(d.key)))
  let free = freeName(label, labels)
  while (keys.has(normalizeTitle(formatKey(free, format)))) {
    labels.push(free)
    free = freeName(free, labels)
  }
  return free
}

const ID_HELD = fail('exists', 'Something in the nexus already carries this identity.')

export async function createProperty(
  root: string,
  def: PropertyDraft,
): Promise<Result<PropertyDefinition>> {
  const notes = await readNotes(root)
  return mutateRegistry(root, (registry) => {
    if (def.id && registry.defs[def.id]) return { result: ID_HELD }
    const defs = Object.values(registry.defs)
    const label = freeLabel(exactTitle(def.label), def.key_format, defs)
    const key = formatKey(label, def.key_format)
    // A restore carries its own id, whose own owed names never refuse it.
    if (owedName(notes, { owner: { kind: 'property' }, name: key, except: def.id }))
      return { result: OWED }
    const candidate = seeded({ ...def, label, key, id: def.id ?? mintPropertyId() })
    const v = validateDefinition(candidate, defs)
    if (!v.ok) return { result: v }
    return {
      next: {
        order: [...registry.order, candidate.id],
        defs: { ...registry.defs, [candidate.id]: candidate },
      },
      result: ok(candidate),
    }
  })
}

const NEW_KEY_IS_FRESHER: KeyCollision = 'prefer-new'

async function renamePlan(
  root: string,
  from: string,
  to: string,
): Promise<{ files: string[]; plan: SweepPlan }> {
  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
  const { files } = await findHolders(root, { keys: [from], reach: 'governed' })
  return { files, plan: rekeySweep(from, to, NEW_KEY_IS_FRESHER) }
}

export async function renameSweep(root: string, from: string, to: string): Promise<ConfigReach> {
  const { files, plan } = await renamePlan(root, from, to)
  return sweptReach(await sweepGovernedRoots(files, plan))
}

type Retitle = Pick<PropertyDefinition, 'label'> | Pick<PropertyDefinition, 'key_format'>

const retitled = (def: PropertyDefinition, change: Retitle): PropertyDefinition => {
  const next = { ...def, ...change }
  return { ...next, key: formatKey(next.label, next.key_format) }
}

async function rekeyPlan(
  root: string,
  propertyId: string,
  change: Retitle,
): Promise<Result<{ prior: PropertyDefinition; moved: PropertyDefinition } | null>> {
  const { defs } = await readRegistry(root)
  const prior = defs[propertyId]
  if (!prior) return NO_PROPERTY
  const moved = retitled(prior, change)
  if (moved.label === prior.label && moved.key_format === prior.key_format) return ok(null)
  const named = validateName(moved, Object.values(defs), propertyId)
  if (!named.ok) return named
  // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
  if (moved.key !== prior.key) {
    const { held } = await findHolders(
      root,
      { keys: [prior.key, moved.key], reach: 'governed' },
      'values',
    )
    const clashes = held.filter((h) => h.keys.length === 2 && outsideArchive(root, h.file))
    if (clashes.length)
      return fail('invalid-property', KEY_REFUSAL.held(prior.key, moved.key, clashes.length))
  }
  return ok({ prior, moved })
}

/** What a rename or a Label Format change would rewrite: the holders of the key it moves, or none when the key holds. */
export async function rekeyHolders(
  root: string,
  propertyId: string,
  change: Retitle,
): Promise<Result<number>> {
  const planned = await rekeyPlan(root, propertyId, change)
  if (!planned.ok) return planned
  if (!planned.value || planned.value.moved.key === planned.value.prior.key) return ok(0)
  const { files, plan } = await renamePlan(root, planned.value.prior.key, planned.value.moved.key)
  return ok(await sweepCount(root, files, plan))
}

/** Validated before the note and again on the registry it commits to, since an outside writer can land between the two. The note lands before the commit, since after it the old key survives nowhere else; a change that keeps the key notes nothing. */
function rekeyProperty(root: string, propertyId: string, change: Retitle): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const planned = await rekeyPlan(root, propertyId, change)
    if (!planned.ok) return planned
    if (!planned.value) return ok({})
    const { prior, moved } = planned.value
    const commit = () =>
      mutateRegistry(root, (registry) => {
        const current = registry.defs[propertyId]
        if (!current) return { result: NO_PROPERTY }
        const def = retitled(current, change)
        const v = validateName(def, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        return {
          next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
          result: ok({ from: current.key, def }),
        }
      })
    if (moved.key === prior.key) return done(await commit())
    return runNoted(root, propertyId, {
      lands: [{ owner: { kind: 'property' }, name: moved.key, except: propertyId }],
      note: (e) => owedRename(propertyNote(e), prior.key, moved.key),
      list: commit,
      sweep: async ({ from, def }) =>
        from === def.key ? NO_REACH : renameSweep(root, from, def.key),
      settle: (e, { from }) => owedSwept(e, [from]),
    })
  })
}

export const renameProperty = (
  root: string,
  propertyId: string,
  label: string,
): Promise<MutateReply> => rekeyProperty(root, propertyId, { label: exactTitle(label) })

export const setKeyFormat = (
  root: string,
  propertyId: string,
  key_format: KeyFormat,
): Promise<MutateReply> => rekeyProperty(root, propertyId, { key_format })

/** A definition's display settings; its label, key, formats, type, and options ride their own ops, since each can move what files hold. A file directory is stored relative to the asset root, an empty one being the root itself. */
export async function configureProperty(
  root: string,
  propertyId: string,
  patch: PropertyConfig,
): Promise<Result<null>> {
  const dir = patch.file_directory && rootSegs(patch.file_directory.trim()).join('/')
  if (dir && !validPropertyDir(dir, (await readWatchScope(root)).assetDir))
    return NOT_A_PROPERTY_DIR
  const changes = 'file_directory' in patch ? { ...patch, file_directory: dir || undefined } : patch
  return serializeSchemaOp(root, () =>
    mutateRegistry(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: NO_PROPERTY }
      const next = seeded({ ...current, ...changes, id: propertyId })
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

export function removeFromRegistry(root: string, propertyId: string): Promise<Result<null>> {
  return mutateRegistry(root, (registry) => {
    if (!registry.defs[propertyId]) return { result: NO_PROPERTY }
    const defs = { ...registry.defs }
    delete defs[propertyId]
    return {
      next: { order: registry.order.filter((id) => id !== propertyId), defs },
      result: ok(null),
    }
  })
}

export function reorderRegistry(
  root: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(root, () =>
    mutateRegistry(root, (registry) => {
      if (!(propertyId in registry.defs)) return { result: NO_PROPERTY }
      const order = registry.order.filter((id) => id !== propertyId)
      order.splice(clamp(toIndex, 0, order.length), 0, propertyId)
      return { next: { ...registry, order }, result: ok(null) }
    }),
  )
}
