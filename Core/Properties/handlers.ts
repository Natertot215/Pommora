import { validPropertyDir } from '../Assets/assetRoots'
import type { Handlers, HostContext } from '../Contract/handlers'
import { fail, NO_NEXUS, ok, type Result } from '../Contract/result'
import {
  isOptionArray,
  narrowFileConfig,
  narrowLinkConfig,
  narrowNumberFormat,
  NEEDS_CONFIG_PATCH,
  NOT_A_PROPERTY_DIR,
} from '../Contract/validators'
import { resolveUnderRoot } from '../Locations/pathSafety'
import { confirmRegistryWrite } from '../Nexus/confirm'
import { sessionRoot } from '../Nexus/session'
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

// containerPath is the schema-owning Collection's folder — a Set inherits the schema, so the
// renderer passes the ancestor's path.
async function resolveSchemaFolder(
  containerPath: unknown,
): Promise<Result<{ root: string; folder: string; rel: string }>> {
  const root = sessionRoot()
  if (root === null) return NO_NEXUS
  if (typeof containerPath !== 'string')
    return fail('operation-failed', 'A container path is required.')
  const resolved = await resolveUnderRoot(root, containerPath)
  return resolved.ok ? ok({ root, folder: resolved.value, rel: containerPath }) : resolved
}

const optionValueOp =
  (write: (root: string, propertyId: string, value: string) => Promise<Result<null>>) =>
  async (ctx: HostContext, propertyId: unknown, value: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string' || typeof value !== 'string') return NEEDS_ID_AND_VALUE
    const r = await write(root, propertyId, value)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r
  }

const optionRenameOp =
  (
    write: (
      root: string,
      propertyId: string,
      oldValue: string,
      newTitle: string,
    ) => Promise<Result<null>>,
  ) =>
  async (ctx: HostContext, propertyId: unknown, oldValue: unknown, newTitle: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (
      typeof propertyId !== 'string' ||
      typeof oldValue !== 'string' ||
      typeof newTitle !== 'string'
    )
      return fail('operation-failed', 'propertyId, oldValue, and newTitle are required.')
    const r = await write(root, propertyId, oldValue, newTitle)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r
  }

type DefChanges = Parameters<typeof editProperty>[2]

/** The narrower keeps a display-config write from patching arbitrary def fields (type, options,
 *  id) through this door; `null` from it refuses the payload. */
const defEditOp =
  (
    narrow: (payload: unknown) => DefChanges | null,
    check?: (root: string, changes: DefChanges) => Promise<Result<null>>,
  ) =>
  async (ctx: HostContext, propertyId: unknown, payload: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const changes = narrow(payload)
    if (changes === null) return NEEDS_CONFIG_PATCH
    if (check) {
      const verdict = await check(root, changes)
      if (!verdict.ok) return verdict
    }
    const r = await editProperty(root, propertyId, changes)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r
  }

export const propertiesHandlers = {
  'schema:add': async (ctx, containerPath: unknown, def: unknown) => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    const parsed = propertyDefinition.safeParse(def)
    if (!parsed.success) return fail('operation-failed', 'Invalid property definition.')
    const created = await createProperty(c.value.root, parsed.data)
    if (!created.ok) return created
    const assigned = await assignProperty(c.value.root, c.value.folder, created.value.id)
    if (!assigned.ok) {
      await removeFromRegistry(c.value.root, created.value.id)
      return assigned
    }
    await confirmRegistryWrite(ctx, c.value.rel)
    return ok({ id: created.value.id })
  },

  'schema:rename': async (ctx, containerPath: unknown, propertyId: unknown, newName: unknown) => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string' || typeof newName !== 'string')
      return fail('operation-failed', 'propertyId and newName must be strings.')
    const r = await editProperty(c.value.root, propertyId, { name: newName })
    if (r.ok) await confirmRegistryWrite(ctx)
    return r.ok ? ok(null) : r
  },

  'schema:reorder': async (ctx, containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string' || typeof toIndex !== 'number')
      return fail('operation-failed', 'propertyId (string) and toIndex (number) are required.')
    const r = await reorderAssignment(c.value.folder, propertyId, toIndex)
    if (r.ok) await confirmRegistryWrite(ctx, c.value.rel)
    return r.ok ? ok(null) : r
  },

  'schema:delete': async (ctx, containerPath: unknown, propertyId: unknown) => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const r = await removeProperty(c.value.root, c.value.folder, propertyId)
    if (r.ok) await confirmRegistryWrite(ctx, c.value.rel)
    return r.ok ? ok(null) : r
  },

  'schema:assign': async (ctx, containerPath: unknown, propertyId: unknown, toIndex: unknown) => {
    const c = await resolveSchemaFolder(containerPath)
    if (!c.ok) return c
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const r = await assignPropertyAt(
      c.value.root,
      c.value.folder,
      propertyId,
      typeof toIndex === 'number' ? toIndex : undefined,
    )
    if (r.ok) await confirmRegistryWrite(ctx, c.value.rel)
    return r.ok ? ok(null) : r
  },

  'registry:reorder': async (ctx, propertyId: unknown, toIndex: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string' || typeof toIndex !== 'number')
      return fail('operation-failed', 'propertyId (string) and toIndex (number) are required.')
    const r = await reorderRegistry(root, propertyId, toIndex)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r.ok ? ok(null) : r
  },

  'property:delete': async (ctx, propertyId: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    const r = await deleteProperty(root, propertyId)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r.ok ? ok(null) : r
  },

  'property:setOptions': async (ctx, propertyId: unknown, options: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    if (!isOptionArray(options))
      return fail('operation-failed', 'Options must be an array of { value, label }.')
    const r = await setOptions(root, propertyId, options)
    if (r.ok) await confirmRegistryWrite(ctx)
    return r.ok ? ok(null) : r
  },

  'property:setStatusGroups': async (ctx, propertyId: unknown, groups: unknown) => {
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (typeof propertyId !== 'string') return NEEDS_PROPERTY_ID
    if (!Array.isArray(groups)) return fail('operation-failed', 'Status groups must be an array.')
    const r = await setStatusGroups(root, propertyId, groups as StatusGroup[])
    if (r.ok) await confirmRegistryWrite(ctx)
    return r.ok ? ok(null) : r
  },

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
  'property:renameOption': optionRenameOp(renameOption),
  'property:removeOption': optionValueOp(removeOption),
  'property:clearOption': optionValueOp(clearOption),
  'property:renameStatusOption': optionRenameOp(renameStatusOption),
  'property:removeStatusOption': optionValueOp(removeStatusOption),
  'property:clearStatusOption': optionValueOp(clearStatusOption),
} satisfies Partial<Handlers>
