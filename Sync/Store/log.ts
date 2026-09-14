import type { DatabaseSync } from 'node:sqlite'

export function logStore(db: DatabaseSync) {
  const putStatement = db.prepare(
    `INSERT OR IGNORE INTO blob (nexus_id, sha256, key_id, size, bytes, at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const readStatement = db.prepare('SELECT bytes FROM blob WHERE nexus_id = ? AND sha256 = ?')
  const hasStatement = db.prepare('SELECT 1 FROM blob WHERE nexus_id = ? AND sha256 = ?')

  return {
    putBlob: (
      nexusId: string,
      sha256: string,
      keyId: string,
      bytes: Buffer,
      atMs: number,
    ): void => {
      putStatement.run(nexusId, sha256, keyId, bytes.length, bytes, atMs)
    },

    readBlob: (nexusId: string, sha256: string): Buffer | null => {
      const row = readStatement.get(nexusId, sha256) as { bytes: Uint8Array } | undefined
      return row ? Buffer.from(row.bytes) : null
    },

    hasBlob: (nexusId: string, sha256: string): boolean =>
      hasStatement.get(nexusId, sha256) !== undefined,
  }
}
