import { describe, expect, it } from 'vitest'
import type { HostDevice, TransportReply, TransportRequest } from '../../Contract/handlers'
import { machine } from '../../Platform/machine'
import { memorySecrets, TEST_PUBLIC_KEY } from '../../Testing/syncDevice'
import { replyOf } from '../../Testing/transportReplies'
import { canonicalString } from '../Contract/canonical'
import { blobPath } from '../Contract/canonical'
import { BLOB_TIMEOUT_MS, call, getBlob, JSON_TIMEOUT_MS, putBlob, type SyncHost } from './call'

const DEVICE_ID = 'fe1c'

function recorder(reply: Omit<TransportReply, 'bytes'> | Error): {
  host: SyncHost
  signed: string[]
  sent: TransportRequest[]
} {
  const signed: string[] = []
  const sent: TransportRequest[] = []
  const device: HostDevice = {
    id: DEVICE_ID,
    publicKey: TEST_PUBLIC_KEY,
    name: 'Recorder',
    x25519: 'x'.repeat(43),
    sign: async (canonical) => {
      signed.push(canonical)
      return 'sig'
    },
    agree: async () => new Uint8Array(32),
    rename: async () => {},
  }
  const transport = async (req: TransportRequest): Promise<TransportReply> => {
    sent.push(req)
    if (reply instanceof Error) throw reply
    return replyOf(reply)
  }
  return { host: { device, transport, secrets: memorySecrets(), push: () => {} }, signed, sent }
}

const connectBody = { nexusId: 'nx', publicKey: TEST_PUBLIC_KEY, name: 'Recorder' }

describe('call', () => {
  it('sends the route under the address and signs the canonical string over the body it sent', async () => {
    const { host, signed, sent } = recorder({ status: 200, body: '{"approved":true}' })

    const outcome = await call(host, { address: 'http://127.0.0.1:7473/' }, 'connect', connectBody)

    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe('http://127.0.0.1:7473/connect')
    expect(sent[0].method).toBe('POST')
    expect(sent[0].headers['x-pommora-device']).toBe(DEVICE_ID)
    expect(sent[0].headers['x-pommora-signature']).toBe('sig')
    expect(signed).toEqual([
      canonicalString(
        'POST',
        '/connect',
        machine().sha256Hex(sent[0].body ?? ''),
        Number(sent[0].headers['x-pommora-timestamp']),
      ),
    ])
    expect(outcome).toEqual({ status: 200, reply: { approved: true } })
  })

  it('carries a refusal body to the caller', async () => {
    const { host } = recorder({ status: 409, body: '{"error":"resync","seq":7}' })
    expect(await call(host, { address: 'http://h' }, 'pull', { nexusId: 'nx', cursor: 9 })).toEqual(
      {
        status: 409,
        reply: null,
        refusal: { error: 'resync', seq: 7 },
      },
    )
  })

  it('sends the timeout a caller names', async () => {
    const { host, sent } = recorder({ status: 200, body: '{"devices":[]}' })
    await call(host, { address: 'http://h' }, 'devices', { nexusId: 'nx' })
    await call(host, { address: 'http://h' }, 'devices', { nexusId: 'nx' }, { timeoutMs: 30_000 })
    expect(sent.map((req) => req.timeoutMs)).toEqual([JSON_TIMEOUT_MS, 30_000])
  })

  it('answers a transport refusal as a status of 0 carrying its text, and never throws', async () => {
    const { host } = recorder(new Error('Invalid URL'))
    const outcome = await call(host, { address: 'not a url' }, 'devices', { nexusId: 'nx' })
    expect(outcome.status).toBe(0)
    expect(outcome.reply).toBeNull()
    expect(outcome.error).toContain('Invalid URL')
  })

  it('answers a body that is not JSON as a status of 0 rather than throwing out of the parse', async () => {
    const { host } = recorder({ status: 200, body: '<html>' })
    expect((await call(host, { address: 'http://h' }, 'devices', { nexusId: 'nx' })).status).toBe(0)
  })
})

describe('blobs', () => {
  const NEXUS = 'nx'
  const SHA = 'a'.repeat(64)

  it('sends bytes under the blob path with the pin and the byte timeout', async () => {
    const { host, sent } = recorder({ status: 200, body: '{}' })
    const bytes = new Uint8Array([1, 2, 3])

    const outcome = await putBlob(host, { address: 'http://h/', pin: 'ab:cd' }, NEXUS, 'k1', bytes)

    expect(outcome).toEqual({ status: 200 })
    expect(sent[0].method).toBe('PUT')
    expect(sent[0].url).toBe(`http://h${blobPath(NEXUS, machine().sha256Hex(bytes))}`)
    expect(sent[0].headers['x-pommora-key']).toBe('k1')
    expect(sent[0].pin).toBe('ab:cd')
    expect(sent[0].timeoutMs).toBe(BLOB_TIMEOUT_MS)
    expect(sent[0].body).toBe(bytes)
  })

  it('reads bytes back from the blob path', async () => {
    const { host, sent } = recorder({ status: 200, body: 'not json' })
    expect(await getBlob(host, { address: 'http://h' }, NEXUS, SHA)).toEqual(
      new TextEncoder().encode('not json'),
    )
    expect(sent[0].method).toBe('GET')
    expect(sent[0].url).toBe(`http://h${blobPath(NEXUS, SHA)}`)

    const { host: empty } = recorder({ status: 404, body: '{"error":"not-found"}' })
    expect(await getBlob(empty, { address: 'http://h' }, NEXUS, SHA)).toBeNull()
  })
})
