import { readFileSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import type { Store } from '../Store/open.ts'
import { refuse, type Reply } from '../wire.ts'

export interface BlobParams {
  nexusId: string
  sha256: string
}

export function blobRoutes(store: Store) {
  return {
    put: (params: BlobParams, keyId: string, spool: { path: string; size: number }): Reply => {
      store.log.putBlob(params.nexusId, params.sha256, keyId, readFileSync(spool.path), Date.now())
      return { status: 200, body: { sha256: params.sha256, size: spool.size } }
    },

    get: (params: BlobParams, res: ServerResponse): Reply | 'streamed' => {
      const bytes = store.log.readBlob(params.nexusId, params.sha256)
      if (bytes === null) return refuse(404, 'not-found')
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': bytes.length,
      })
      res.end(bytes)
      return 'streamed'
    },
  }
}
