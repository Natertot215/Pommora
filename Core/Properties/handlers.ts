import { NOT_A_PROPERTY_DIR, validPropertyDir } from '../Assets/assetRoots'
import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { ok, type Result, fault } from '../Contract/result'
import { isFiniteNumber, isPlainObject, NEEDS_CONFIG_PATCH } from '../Contract/validators'
import { mutableTarget } from '../Nexus/liveTree'
import { oweCascade } from '../Nexus/fileEvents'
import { readWatchScope } from '../Settings/settings'
import { assignProperty, reorderAssignment } from './assignment'
import { deleteProperty, propertyHolders } from './deleteProperty'
import { clearOption, editOption, optionHolders, removeOption, renameOption } from './optionOps'
import { optionEdit, type OptionEdit } from './optionModel'
import {
  type FileConfig,
  narrowFileConfig,
  narrowLinkConfig,
  narrowNumberFormat,
  propertyDefinition,
} from './properties'
import {
  createProperty,
  editProperty,
  removeFromRegistry,
  renameProperty,
  reorderRegistry,
} from './registryProperty'
import { removeProperty } from './removeProperty'
import { replaySchemaCascade } from './replaySchemaCascade'
import { unsweptLine } from './governedSweep'
import { decodeSchemaJournal, type SchemaCascade, type SchemaJournal } from './propertyJournal'
import type { TilesChanged } from '../Tiles/tiles'
import { type ConfigReach, NO_REACH } from '../Nexus/configReach'

const NEEDS_PROPERTY_ID = fault('A property id is required.')
const NEEDS_ID_AND_VALUE = fault('A property id and value are required.')
const NEEDS_ID_AND_INDEX = fault('propertyId (string) and toIndex (number) are required.')
const NEEDS_RENAME_ARGS = fault('propertyId, oldValue, and newTitle are required.')
const NEEDS_OPTION_EDIT = fault('An option edit is required.')

// containerPath is the schema-owning Collection's folder — a Set inherits the schema, so the renderer passes the ancestor's path.
const resolveSchemaFolder = async (
  root: string,
  containerPath: unknown,
): Promise<Result<string>> =>
  typeof containerPath === 'string'
    ? mutableTarget(root, containerPath, ['collection'])
    : fault('A container path is required.')

type Reply<R> = { hosts: TilesChanged[]; result: Result<R> }
const asIs = <T>(value: T): Reply<T> => ({ hosts: [], result: ok(value) })
const unsweptReply = ({ hosts, skipped }: ConfigReach): Reply<null> => ({
  hosts,
  result: skipped ? fault(unsweptLine(skipped)) : ok(null),
})
const cascadeReply = <T extends SchemaCascade>(r: T): Reply<T> => ({
  hosts: r.cascade.hosts,
  result: ok(r),
})

function answer<T, R>(root: string, r: Result<T>, reply: (value: T) => Reply<R>): Result<R> {
  if (!r.ok) return r
  const replied = reply(r.value)
  oweCascade(root, [], replied.hosts)
  return replied.result
}

const registryChannel = <A extends unknown[], T, R = T>(
  narrow: (args: unknown[]) => A | Result<never>,
  write: (root: string, ...args: A) => Promise<Result<T>>,
  reply: (value: T) => Reply<R> = asIs as (value: T) => Reply<R>,
) =>
  withWriteRoot(async (root, _ctx, ...args: unknown[]): Promise<Result<R>> => {
    const narrowed = narrow(args)
    if (!Array.isArray(narrowed)) return narrowed
    return answer(root, await write(root, ...narrowed), reply)
  })

const schemaChannel = <A extends unknown[], T = null, R = T>(
  narrow: (args: unknown[]) => A | Result<never>,
  write: (root: string, folder: string, ...args: A) => Promise<Result<T>>,
  reply: (value: T) => Reply<R> = asIs as (value: T) => Reply<R>,
) =>
  withWriteRoot(async (root, _ctx, containerPath: unknown, ...args: unknown[]) => {
    const c = await resolveSchemaFolder(root, containerPath)
    if (!c.ok) return c
    const narrowed = narrow(args)
    if (!Array.isArray(narrowed)) return narrowed
    return answer(root, await write(root, c.value, ...narrowed), reply)
  })

const idOnly = ([id]: unknown[]): [string] | Result<never> =>
  typeof id === 'string' ? [id] : NEEDS_PROPERTY_ID

const journalRecord = ([raw]: unknown[]): [SchemaJournal] | Result<never> => {
  const record = isPlainObject(raw) ? decodeSchemaJournal(raw) : null
  return record ? [record] : fault('A schema record is required.')
}

const idAndIndex = ([id, at]: unknown[]): [string, number] | Result<never> =>
  typeof id === 'string' && isFiniteNumber(at) ? [id, at] : NEEDS_ID_AND_INDEX

const idAndOptionalIndex = ([id, at]: unknown[]): [string, number | undefined] | Result<never> =>
  typeof id === 'string' ? [id, isFiniteNumber(at) ? at : undefined] : NEEDS_PROPERTY_ID

const idAndEdit = ([id, e]: unknown[]): [string, OptionEdit] | Result<never> => {
  if (typeof id !== 'string') return NEEDS_PROPERTY_ID
  const read = optionEdit.safeParse(e)
  return read.success ? [id, read.data] : NEEDS_OPTION_EDIT
}

const idAndValue = ([id, value]: unknown[]): [string, string] | Result<never> =>
  typeof id === 'string' && typeof value === 'string' ? [id, value] : NEEDS_ID_AND_VALUE

const idOldNew = ([id, oldValue, newTitle]: unknown[]): [string, string, string] | Result<never> =>
  typeof id === 'string' && typeof oldValue === 'string' && typeof newTitle === 'string'
    ? [id, oldValue, newTitle]
    : NEEDS_RENAME_ARGS

type DefChanges = Parameters<typeof editProperty>[2]

/** The narrower keeps a display-config write from patching arbitrary def fields (type, options, id) through this door. */
const defEditOp = (
  narrow: (payload: unknown) => DefChanges | null,
  check?: (root: string, changes: DefChanges) => Promise<Result<null>>,
) =>
  withWriteRoot(async (root, _ctx, propertyId: unknown, payload: unknown) => {
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const changes = narrow(payload)
    if (changes === null) return NEEDS_CONFIG_PATCH
    if (check) {
      const verdict = await check(root, changes)
      if (!verdict.ok) return verdict
    }
    return editProperty(root, propertyId, changes)
  })

export const propertiesHandlers = {
  'schema:add': withWriteRoot(async (root, _ctx, containerPath: unknown, def: unknown) => {
    const c = await resolveSchemaFolder(root, containerPath)
    if (!c.ok) return c
    const parsed = propertyDefinition.safeParse(def)
    if (!parsed.success) return fault('Invalid property definition.')
    const created = await createProperty(root, parsed.data)
    if (!created.ok) return created
    const assigned = await assignProperty(root, c.value, created.value.id)
    if (!assigned.ok) {
      await removeFromRegistry(root, created.value.id)
      return assigned
    }
    return ok({ id: created.value.id })
  }),

  'schema:reorder': schemaChannel(idAndIndex, reorderAssignment),
  'schema:unassign': schemaChannel(idOnly, removeProperty, unsweptReply),
  'schema:assign': schemaChannel(idAndOptionalIndex, assignProperty),

  'registry:reorder': registryChannel(idAndIndex, reorderRegistry),
  'property:rename': registryChannel(idAndValue, renameProperty),
  'property:delete': registryChannel(idOnly, deleteProperty, cascadeReply),
  'property:replay': registryChannel(
    journalRecord,
    async (root, record) => (await replaySchemaCascade(root, record)) ?? ok(NO_REACH),
    unsweptReply,
  ),

  'property:setLinkConfig': defEditOp(narrowLinkConfig),
  'property:setCheckboxColor': defEditOp((color) => ({
    checkbox_color: typeof color === 'string' ? color : undefined,
  })),
  'property:setIcon': defEditOp((icon) => ({ icon: typeof icon === 'string' ? icon : undefined })),
  'property:setNumberFormat': defEditOp(narrowNumberFormat),
  'property:setFileDirectory': defEditOp(narrowFileConfig, async (root, changes) => {
    const dir = (changes as FileConfig).file_directory
    if (dir === undefined) return ok(null)
    const { assetDir } = await readWatchScope(root)
    return validPropertyDir(dir, assetDir) ? ok(null) : NOT_A_PROPERTY_DIR
  }),
  'property:editOption': registryChannel(idAndEdit, editOption),
  'property:renameOption': registryChannel(idOldNew, renameOption, cascadeReply),
  'property:removeOption': registryChannel(idAndValue, removeOption, cascadeReply),
  'property:clearOption': registryChannel(idAndValue, clearOption),
  'property:holders': withRoot(async (root, _ctx, id: unknown, value: unknown) => {
    if (typeof id !== 'string') return NEEDS_PROPERTY_ID
    if (value === undefined) return propertyHolders(root, id)
    return typeof value === 'string' ? optionHolders(root, id, value) : NEEDS_ID_AND_VALUE
  }),
} satisfies Partial<Handlers>
