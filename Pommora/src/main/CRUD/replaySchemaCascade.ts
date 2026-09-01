// The open-time replay behind `.nexus/property-cascade.json` — forward-completes whatever a
// crash interrupted, under one law: act only on a state the record exactly maps, identity-checked
// by id, and clear on every other state. Rides serializeSchemaOp as ONE wrapped entry (everything
// it calls is unwrapped internals), and never throws past itself: a failed heal logs, leaves the
// record, and the next open retries — an open is never blocked. A sweep that could not read every
// holder is an unfinished heal for the same purpose: the record survives it.

import { errText } from '@shared/result'
import { wrapKey } from '@shared/governedKeys'
import { propertyKey } from '@shared/propertyValue'
import { readRegistry } from '../IO/propertiesRegistry'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { removeFromRegistry, renameSweep } from './registryProperty'
import { stripKeyRewrite, unassignAndPurge } from './deleteProperty'
import { cascadePages, dropOptionFromDef } from './optionOps'
import { optionValues } from '@shared/properties'
import { replacePageValue, stripPageValue } from './pageValue'
import { clearSchemaJournal, readSchemaJournal, type SchemaJournal } from './propertyJournal'
import { sweepGovernedRoots } from './governedSweep'
import { serializeSchemaOp } from './schemaChain'

export function replaySchemaCascade(root: string): Promise<void> {
  return serializeSchemaOp(async () => {
    try {
      const journal = await readSchemaJournal(root)
      if (!journal) return
      const unfinished = await replay(root, journal)
      if (!unfinished) await clearSchemaJournal(root, journal)
    } catch (e) {
      // The record stays; the next open retries.
      console.error('schema replay could not finish:', errText(e))
    }
  })
}

/** Runs whatever the record still owes — acting on the exactly-mapped state, doing nothing on
 *  any state the record no longer maps. True = holders stayed unreadable and the record must
 *  survive for the next open; a throw keeps it alive the same way. */
async function replay(root: string, journal: SchemaJournal): Promise<boolean> {
  const defs = (await readRegistry(root)).defs
  switch (journal.op) {
    case 'rename': {
      // Only the journaled def's own name decides: `to` means the commit landed and the sweep
      // is owed; anything else (never landed, deleted, renamed again, the name owned elsewhere)
      // is a state the record no longer maps and must not be swept.
      if (defs[journal.id]?.name !== journal.to) return false
      return (await renameSweep(root, journal.from, journal.to)) > 0
    }
    case 'delete': {
      // The registry commits LAST in a delete, so the def still present under its journaled
      // name is the crash state and forward-completes the tail. The def gone AND the name free
      // is the skipped-holder state — the op finished its registry but held the record for
      // stragglers, and the same tail re-strips them. The id under another name, or the name
      // re-taken by a different def, is alive on purpose (a restore or re-create consumes the
      // record in-app at createProperty; this arm catches what landed while the app was closed).
      const def = defs[journal.id]
      const crashed = def?.name === journal.name
      const freed = !def && !Object.values(defs).some((d) => d.name === journal.name)
      if (!crashed && !freed) return false
      const key = wrapKey('property', journal.name)
      const folders = await collectionFolders(root)
      const files = await keyHolderFiles(root, key, folders)
      const swept = await sweepGovernedRoots(root, { kind: 'files', files }, stripKeyRewrite(key), {
        stamp: true,
      })
      for (const folder of folders) await unassignAndPurge(folder, journal.id)
      await removeFromRegistry(root, journal.id)
      return swept.skipped.length > 0
    }
    case 'option-rename': {
      const def = defs[journal.id]
      if (!def) return false
      const values = optionValues(def)
      // Holds `to` and not `from` = the commit landed cleanly; every other state (still holds
      // `from`, holds both — a refused duplicate's residue — or neither) is not this record's.
      if (!values.includes(journal.to) || values.includes(journal.from)) return false
      const key = propertyKey(def)
      const skipped = await cascadePages(root, key, (content) =>
        replacePageValue(content, key, journal.from, journal.to, def.type),
      )
      return skipped > 0
    }
    case 'option-remove': {
      // Pages-first order holds the value in the def until the strip completes, so the value
      // still listed is the owed state; gone means the op finished and only the clear failed.
      const def = defs[journal.id]
      if (!def || !optionValues(def).includes(journal.value)) return false
      const key = propertyKey(def)
      const skipped = await cascadePages(root, key, (content) =>
        stripPageValue(content, key, journal.value, def.type),
      )
      if (skipped > 0) return true
      await dropOptionFromDef(root, journal.id, journal.value)
      return false
    }
  }
}
