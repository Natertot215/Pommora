// Agenda item CRUD — Tasks + Events as pure JSON files (`<title>.task.json` / `.event.json`).
// One factory for both kinds, paralleling page.ts but for JSON (no envelope/body). filename =
// title; every update is a read-merge-write that preserves foreign keys + bumps modified_at.

import { join, dirname } from 'node:path'
import { rename } from 'node:fs/promises'
import { newId } from '../ids'
import { writeJson, trashWithTimestamp, readJsonObject } from '../io/atomicWrite'
import { serializeOnFile } from '../io/fileLock'
import { applyPropertyValue, type PropertyValue } from '@shared/propertyValue'
import { AGENDA_SUFFIX, agendaKindOf, type AgendaKind } from '@shared/agenda'
import { pathExists, invalidName, nowIso } from './util'
import { ok, fail, type Result } from '@shared/result'

type Raw = Record<string, unknown>

/** Create an agenda item with a fresh ULID + the kind's required defaults. An Event
 *  requires `start_at` + `end_at` in `fields`. Optional EventKit fields ride via `fields`. */
export async function createAgendaItem(
  parentDir: string,
  kind: AgendaKind,
  name: string,
  fields: Raw = {},
): Promise<Result<{ id: string; path: string }>> {
  if (invalidName(name)) return fail('invalid-name', `"${name}" is not a valid name.`, kind)
  const file = join(parentDir, name + AGENDA_SUFFIX[kind])
  if (await pathExists(file)) return fail('exists', `"${name}" already exists.`, kind)
  const id = newId()
  const now = nowIso()
  const base: Raw = {
    id,
    description: '',
    properties: {},
    alarm_offsets: [],
    created_at: now,
    modified_at: now,
  }
  const item: Raw =
    kind === 'task'
      ? {
          ...base,
          due_floating: false,
          due_all_day: false,
          completed: false,
          priority: 0,
          ...fields,
        }
      : { ...base, all_day: false, alarm_absolute: [], ...fields }
  if (kind === 'event' && (typeof item.start_at !== 'string' || typeof item.end_at !== 'string')) {
    return fail('invalid-event', 'An event needs start_at and end_at.', kind)
  }
  await writeJson(file, item)
  return ok({ id, path: file })
}

/** Rename an agenda item, preserving its `.task.json` / `.event.json` suffix. */
export async function renameAgendaItem(
  absFile: string,
  newName: string,
): Promise<Result<{ path: string }>> {
  if (invalidName(newName))
    return fail('invalid-name', `"${newName}" is not a valid name.`, 'agenda')
  const kind = agendaKindOf(absFile)
  if (!kind) return fail('not-agenda', 'Not an agenda item file.', 'agenda')
  const target = join(dirname(absFile), newName + AGENDA_SUFFIX[kind])
  if (target === absFile) return ok({ path: absFile })
  if (await pathExists(target)) return fail('exists', `"${newName}" already exists.`, 'agenda')
  await rename(absFile, target)
  // A rename is an edit (filename = title) — bump modified_at, preserving all else.
  await serializeOnFile(target, async () => {
    const raw = await readJsonObject(target)
    if (raw) await writeJson(target, { ...raw, modified_at: nowIso() })
  })
  return ok({ path: target })
}

/** Delete an agenda item by moving it to the nexus-local .trash (recoverable). */
export async function deleteAgendaItem(
  nexusRoot: string,
  absFile: string,
): Promise<Result<{ trashedTo: string }>> {
  if (!(await pathExists(absFile))) return fail('not-found', 'Nothing to delete.', 'agenda')
  return ok({ trashedTo: await trashWithTimestamp(nexusRoot, absFile) })
}

/** Merge `patch` over the item's governed fields, preserving foreign keys + bumping
 *  modified_at. Additive (a patched field is set; it never deletes other fields).
 *  Under the item's file lock, like every agenda RMW — an unlocked JSON writer racing a
 *  cascade rewrite would be a whole-file lost update. */
export async function updateAgendaItem(absFile: string, patch: Raw): Promise<Result<null>> {
  return serializeOnFile(absFile, async () => {
    const raw = await readJsonObject(absFile)
    if (!raw) return fail('not-found', 'Agenda item not found.', 'agenda')
    await writeJson(absFile, { ...raw, ...patch, modified_at: nowIso() })
    return ok(null)
  })
}

/** Set or clear one property value on an agenda item (encoded via the codec). A null
 *  value (or `null` kind) removes the key; siblings + foreign keys are preserved. */
export async function updateAgendaProperty(
  absFile: string,
  propertyId: string,
  value: PropertyValue | null,
): Promise<Result<null>> {
  return serializeOnFile(absFile, async () => {
    const raw = await readJsonObject(absFile)
    if (!raw) return fail('not-found', 'Agenda item not found.', 'agenda')
    const props = applyPropertyValue(raw.properties, propertyId, value)
    await writeJson(absFile, { ...raw, properties: props, modified_at: nowIso() })
    return ok(null)
  })
}
