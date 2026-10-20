// One law: act only on a state the record exactly maps, identity-checked by id, and clear on every other state. A failed heal logs and leaves the record — an open is never blocked.

import { errText, fault, ok, type Result } from '../Contract/result'
import { type ConfigReach, NO_REACH } from '../Nexus/configReach'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { collectionFolders } from './governedSweep'
import { liveTreeOf } from '../Nexus/liveTree'
import { renameSweep } from './registryProperty'
import { deletePlan, stripAndRemove } from './deleteProperty'
import { dropOptionFromDef, optionCascade } from './optionOps'
import { optionLabels, optionsOf } from './properties'
import { same } from '../Files/stableJson'
import { clearSchemaJournal, readSchemaJournal, type SchemaJournal } from './propertyJournal'

const renamesApplied = (
  pairs: readonly (readonly [string, string])[],
  held: readonly string[],
): boolean => pairs.every(([from, to]) => held.includes(to) && !held.includes(from))

export function replaySchemaCascade(
  root: string,
  record?: SchemaJournal,
): Promise<Result<ConfigReach> | null> {
  return serializeSchemaOp(root, async () => {
    try {
      const journal = record ?? (await readSchemaJournal(root))
      if (!journal) return null
      const owed = await replay(root, journal, record !== undefined)
      if (!owed.skipped) await clearSchemaJournal(root, journal)
      return ok(owed)
    } catch (e) {
      console.error('schema replay could not finish:', errText(e))
      return fault(e)
    }
  })
}

async function replay(
  root: string,
  journal: SchemaJournal,
  answered: boolean,
): Promise<ConfigReach> {
  const defs = (await readRegistry(root)).defs
  switch (journal.op) {
    case 'rename': {
      // The def alive while no definition is keyed `from` means the commit landed and the sweep is owed, to the key the def holds now, however many renames have followed; anything else is a state the record no longer maps.
      const def = defs[journal.id]
      if (!def || Object.values(defs).some((d) => d.key === journal.from)) return NO_REACH
      return { skipped: await renameSweep(root, journal.from, def.key), hosts: [] }
    }
    case 'delete': {
      // The registry commits LAST in a delete, so the def still present under its journaled key is the crash state. The id under another key is alive on purpose — a restore or re-create consumes the record at createProperty; this arm catches what the delete left owed. A record a delete's answer carried exists only once its registry commit landed, so for it a present def is a restore.
      const def = defs[journal.id]
      const crashed = !answered && def !== undefined && def.key === journal.key
      const freed = !def && !Object.values(defs).some((d) => d.key === journal.key)
      if (!crashed && !freed) return NO_REACH
      const folders = collectionFolders(root, await liveTreeOf(root))
      const { skipped, hosts, removed } = await stripAndRemove(
        root,
        journal.id,
        folders,
        await deletePlan(root, journal.id, journal.key),
      )
      return { skipped: skipped + (crashed && !removed.ok ? 1 : 0), hosts }
    }
    case 'option-rename': {
      const def = defs[journal.id]
      if (!def) return NO_REACH
      const keys = optionsOf(def).map((o) => o.key)
      // Every new key and the new label held, and no old one, = the commit landed cleanly; every other state is not this record's.
      if (!renamesApplied(journal.keys, keys)) return NO_REACH
      if (journal.labels && !renamesApplied([journal.labels], optionLabels(def))) return NO_REACH
      return optionCascade(root, def, new Map(journal.keys), journal.labels)
    }
    case 'option-remove': {
      // Pages-first order holds the key in the def until the strip completes, so the key still listed is the owed state; gone means only the clear failed. An option has no identity, so an answer's record is owed only while the slot still holds it: past that, the key listed may have been added again.
      const def = defs[journal.id]
      const held = answered ? await readSchemaJournal(root) : journal
      if (!def || !held || !same(held, journal)) return NO_REACH
      const option = optionsOf(def).find((o) => o.key === journal.key)
      if (!option) return NO_REACH
      const owed = await optionCascade(root, def, new Map([[journal.key, null]]), [
        option.label,
        null,
      ])
      if (owed.skipped) return owed
      return (await dropOptionFromDef(root, journal.id, journal.key)).ok
        ? owed
        : { ...owed, skipped: 1 }
    }
  }
}
