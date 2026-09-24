import { validPropertyDir } from '../Assets/assetRoots'
import { type Handlers, type HostContext, withWriteRoot } from '../Contract/handlers'
import { fail, ok, type Result } from '../Contract/result'
import {
  isOptionArray,
  narrowFileConfig,
  narrowLinkConfig,
  narrowNumberFormat,
  NEEDS_CONFIG_PATCH,
  NOT_A_PROPERTY_DIR,
} from '../Contract/validators'
import { resolveUnderRoot } from '../Paths/pathSafety'
import { confirmRegistryWrite } from '../Nexus/confirm'
import { readWatchScope } from '../Settings/settings'
import { assignProperty, assignPropertyAt, reorderAssignment } from './assignment'
import { deleteProperty } from './deleteProperty'
import {
  clearOption,
  clearStatusOption,
  removeOption,
  removeStatusOption,
  renameOption,
  renameStatusOption,
  setOptions,
  setStatusGroups,
} from './optionOps'
import type { Option } from './optionModel'
import { type FileConfig, propertyDefinition, type StatusGroup } from './properties'
import {
  createProperty,
  editProperty,
  removeFromRegistry,
  reorderRegistry,
} from './registryProperty'
import { removeProperty } from './removeProperty'

const NEEDS_PROPERTY_ID = fail('operation-failed', 'A property id is required.')
const NEEDS_ID_AND_VALUE = fail('operation-failed', 'A property id and value are required.')
const NEEDS_ID_AND_INDEX = fail(
  'operation-failed',
  'propertyId (string) and toIndex (number) are required.',
)
const NEEDS_RENAME_ARGS = fail(
  'operation-failed',
  'propertyId, oldValue, and newTitle are required.',
)
const NEEDS_OPTION_ARRAY = fail('operation-failed', 'Options must be an array of { value, label }.')
const NEEDS_STATUS_GROUPS = fail('operation-failed', 'Status groups must be an array.')

// containerPath is the schema-owning Collection's folder — a Set inherits the schema, so the renderer passes the ancestor's path.
async function resolveSchemaFolder(
  root: string,
  containerPath: unknown,
): Promise<Result<{ folder: string; rel: string }>> {
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  const resolved = await resolveUnderRoot(root, containerPath)
  return resolved.ok ? ok({ folder: resolved.value, rel: containerPath }) : resolved
}

const registryOp = <A extends unknown[]>(
  narrow: (args: unknown[]) => A | Result<never>,
  write: (root: string, ...args: A) => Promise<Result<null>>,
) =>
  withWriteRoot(async (root, ctx, ...args: unknown[]): Promise<Result<null>> => {
    const narrowed = narrow(args)
    if (!Array.isArray(narrowed)) return narrowed
    const r = await write(root, ...narrowed)
    if (r.ok) await confirmRegistryWrite(ctx, root)
    return r
  })

const idOnly = ([id]: unknown[]): [string] | Result<never> =>
  typeof id === 'string' ? [id] : NEEDS_PROPERTY_ID

const idAndIndex = ([id, at]: unknown[]): [string, number] | Result<never> =>
  typeof id === 'string' && typeof at === 'number' ? [id, at] : NEEDS_ID_AND_INDEX

const idAndOptions = ([id, options]: unknown[]): [string, Option[]] | Result<never> =>
  typeof id !== 'string'
    ? NEEDS_PROPERTY_ID
    : isOptionArray(options)
      ? [id, options]
      : NEEDS_OPTION_ARRAY

const idAndGroups = ([id, groups]: unknown[]): [string, StatusGroup[]] | Result<never> =>
  typeof id !== 'string'
    ? NEEDS_PROPERTY_ID
    : Array.isArray(groups)
      ? [id, groups as StatusGroup[]]
      : NEEDS_STATUS_GROUPS

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
  withWriteRoot(async (root, ctx: HostContext, propertyId: unknown, payload: unknown) => {
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const changes = narrow(payload)
    if (changes === null) return NEEDS_CONFIG_PATCH
    if (check) {
      const verdict = await check(root, changes)
      if (!verdict.ok) return verdict
    }
    const r = await editProperty(root, propertyId, changes)
    if (r.ok) await confirmRegistryWrite(ctx, root)
    return r
  })

export const propertiesHandlers = {
  'schema:add': withWriteRoot(async (root, ctx, containerPath: unknown, def: unknown) => {
    const c = await resolveSchemaFolder(root, containerPath)
    if (!c.ok) return c
    const parsed = propertyDefinition.safeParse(def)
    if (!parsed.success) return fail('operation-failed', 'Invalid property definition.')
    const created = await createProperty(root, parsed.data)
    if (!created.ok) return created
    const assigned = await assignProperty(root, c.value.folder, created.value.id)
    if (!assigned.ok) {
      await removeFromRegistry(root, created.value.id)
      return assigned
    }
    await confirmRegistryWrite(ctx, root, c.value.rel)
    return ok({ id: created.value.id })
  }),

  'schema:rename': withWriteRoot(
    async (root, ctx, containerPath: unknown, propertyId: unknown, newName: unknown) => {
      const c = await resolveSchemaFolder(root, containerPath)
      if (!c.ok) return c
      if (typeof propertyId !== 'string' || typeof newName !== 'string')
        return fail('operation-failed', 'propertyId and newName must be strings.')
      const r = await editProperty(root, propertyId, { name: newName })
      if (r.ok) await confirmRegistryWrite(ctx, root)
      return r
    },
  ),

  'schema:reorder': withWriteRoot(
    async (root, ctx, containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
      const c = await resolveSchemaFolder(root, containerPath)
      if (!c.ok) return c
      if (typeof propertyId !== 'string' || typeof toIndex !== 'number')
        return fail('operation-failed', 'propertyId (string) and toIndex (number) are required.')
      const r = await reorderAssignment(c.value.folder, propertyId, toIndex)
      if (r.ok) await confirmRegistryWrite(ctx, root, c.value.rel)
      return r
    },
  ),

  'schema:delete': withWriteRoot(async (root, ctx, containerPath: unknown, propertyId: unknown) => {
    const c = await resolveSchemaFolder(root, containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const r = await removeProperty(root, c.value.folder, propertyId)
    if (r.ok) await confirmRegistryWrite(ctx, root, c.value.rel)
    return r
  }),

  'schema:assign': withWriteRoot(
    async (root, ctx, containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
      const c = await resolveSchemaFolder(root, containerPath)
      if (!c.ok) return c
      if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
      const r = await assignPropertyAt(
        root,
        c.value.folder,
        propertyId,
        typeof toIndex === 'number' ? toIndex : undefined,
      )
      if (r.ok) await confirmRegistryWrite(ctx, root, c.value.rel)
      return r
    },
  ),

  'registry:reorder': registryOp(idAndIndex, reorderRegistry),
  'property:delete': registryOp(idOnly, deleteProperty),
  'property:setOptions': registryOp(idAndOptions, setOptions),
  'property:setStatusGroups': registryOp(idAndGroups, setStatusGroups),

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
  'property:renameOption': registryOp(idOldNew, renameOption),
  'property:removeOption': registryOp(idAndValue, removeOption),
  'property:clearOption': registryOp(idAndValue, clearOption),
  'property:renameStatusOption': registryOp(idOldNew, renameStatusOption),
  'property:removeStatusOption': registryOp(idAndValue, removeStatusOption),
  'property:clearStatusOption': registryOp(idAndValue, clearStatusOption),
} satisfies Partial<Handlers>
