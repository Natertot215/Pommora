import type { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

export function rosterStore(db: DatabaseSync) {
  const listStatement = db.prepare(
    `SELECT d.fingerprint AS id, d.public_key AS publicKey, d.name AS name, d.x25519 AS x25519,
            m.approved AS approved, m.role AS role
     FROM membership m JOIN device d ON d.fingerprint = m.fingerprint
     WHERE m.nexus_id = ? ORDER BY d.name`,
  )
  const membershipStatement = db.prepare(
    'SELECT approved, role FROM membership WHERE nexus_id = ? AND fingerprint = ?',
  )
  const keyStatement = db.prepare('SELECT public_key FROM device WHERE fingerprint = ?')
  const membersStatement = db.prepare('SELECT 1 FROM membership WHERE nexus_id = ?')
  const upsertStatement = db.prepare(
    `INSERT INTO device (fingerprint, public_key, name, x25519) VALUES (?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET public_key = excluded.public_key, name = excluded.name,
       x25519 = COALESCE(excluded.x25519, device.x25519)`,
  )
  const addStatement = db.prepare(
    `INSERT INTO membership (nexus_id, fingerprint, approved, role) VALUES (?, ?, ?, ?)
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
        x25519: string | null
        approved: number
        role: Wire.Role
      }[]
      return rows.map((r) => ({
        id: r.id,
        publicKey: r.publicKey,
        name: r.name,
        x25519: r.x25519 ?? undefined,
        approved: r.approved === 1,
        role: r.role,
      }))
    },

    upsertDevice: (
      fingerprint: string,
      publicKey: string,
      name: string,
      x25519: string | null,
    ): void => {
      upsertStatement.run(fingerprint, publicKey, name, x25519)
    },

    publicKeyOf: (fingerprint: string): string | null => {
      const row = keyStatement.get(fingerprint) as { public_key: string } | undefined
      return row ? row.public_key : null
    },

    hasMembers: (nexusId: string): boolean => membersStatement.get(nexusId) !== undefined,

    addMembership: (
      nexusId: string,
      fingerprint: string,
      approved: number,
      role: Wire.Role,
    ): void => {
      addStatement.run(nexusId, fingerprint, approved, role)
    },

    membership: (
      nexusId: string,
      fingerprint: string,
    ): { approved: boolean; role: Wire.Role } | null => {
      const row = membershipStatement.get(nexusId, fingerprint) as
        | { approved: number; role: Wire.Role }
        | undefined
      return row ? { approved: row.approved === 1, role: row.role } : null
    },

    approve: (nexusId: string, fingerprint: string): number =>
      Number(approveStatement.run(nexusId, fingerprint).changes),

    revoke: (nexusId: string, fingerprint: string): void => {
      revokeStatement.run(nexusId, fingerprint)
    },
  }
}
