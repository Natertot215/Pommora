import type { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

export function rosterStore(db: DatabaseSync) {
  const listStatement = db.prepare(
    `SELECT d.fingerprint AS id, d.public_key AS publicKey, d.name AS name, m.approved AS approved
     FROM membership m JOIN device d ON d.fingerprint = m.fingerprint
     WHERE m.nexus_id = ? ORDER BY d.name`,
  )
  const approvedStatement = db.prepare(
    'SELECT 1 FROM membership WHERE nexus_id = ? AND fingerprint = ? AND approved = 1',
  )
  const keyStatement = db.prepare('SELECT public_key FROM device WHERE fingerprint = ?')
  const membersStatement = db.prepare('SELECT 1 FROM membership WHERE nexus_id = ?')
  const upsertStatement = db.prepare(
    `INSERT INTO device (fingerprint, public_key, name) VALUES (?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET public_key = excluded.public_key, name = excluded.name`,
  )
  const membershipStatement = db.prepare(
    `INSERT INTO membership (nexus_id, fingerprint, approved) VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`,
  )
  const approveStatement = db.prepare(
    'UPDATE membership SET approved = 1 WHERE nexus_id = ? AND fingerprint = ?',
  )
  const revokeStatement = db.prepare(
    'DELETE FROM membership WHERE nexus_id = ? AND fingerprint = ?',
  )

  return {
    list: (nexusId: string): Wire.DeviceRecord[] => {
      const rows = listStatement.all(nexusId) as {
        id: string
        publicKey: string
        name: string
        approved: number
      }[]
      return rows.map((r) => ({
        id: r.id,
        publicKey: r.publicKey,
        name: r.name,
        approved: r.approved === 1,
      }))
    },

    upsertDevice: (fingerprint: string, publicKey: string, name: string): void => {
      upsertStatement.run(fingerprint, publicKey, name)
    },

    publicKeyOf: (fingerprint: string): string | null => {
      const row = keyStatement.get(fingerprint) as { public_key: string } | undefined
      return row ? row.public_key : null
    },

    hasMembers: (nexusId: string): boolean => membersStatement.get(nexusId) !== undefined,

    addMembership: (nexusId: string, fingerprint: string, approved: number): void => {
      membershipStatement.run(nexusId, fingerprint, approved)
    },

    isApproved: (nexusId: string, fingerprint: string): boolean =>
      approvedStatement.get(nexusId, fingerprint) !== undefined,

    approve: (nexusId: string, fingerprint: string): number =>
      Number(approveStatement.run(nexusId, fingerprint).changes),

    revoke: (nexusId: string, fingerprint: string): void => {
      revokeStatement.run(nexusId, fingerprint)
    },
  }
}
