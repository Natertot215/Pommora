import { describe, expect, it } from 'vitest'
import type { HostDevice, TransportReply, TransportRequest } from '../Contract/handlers'
import { machine } from '../Platform/machine'
import { canonicalString } from './authority'
import { call, type SyncHost } from './client'

const DEVICE_ID = 'fe1c'
const PUBLIC_KEY = 'k'.repeat(43)

function recorder(reply: TransportReply | Error): {
  host: SyncHost
  signed: string[]
  sent: TransportRequest[]
} {
  const signed: string[] = []
  const sent: TransportRequest[] = []
  const device: HostDevice = {
    id: DEVICE_ID,
    publicKey: PUBLIC_KEY,
    name: 'Recorder',
    sign: async (canonical) => {
      signed.push(canonical)
      return 'sig'
    },
    rename: async () => {},
  }
  const transport = async (req: TransportRequest): Promise<TransportReply> => {
    sent.push(req)
    if (reply instanceof Error) throw reply
    return reply
  }
  return { host: { device, transport }, signed, sent }
}

const connectBody = { nexusId: 'nx', publicKey: PUBLIC_KEY, name: 'Recorder' }

describe('call', () => {
  it('sends the route under the address and signs the canonical string over the body it sent', async () => {
    const { host, signed, sent } = recorder({ status: 200, body: '{"approved":true}' })

    const outcome = await call(host, 'http://127.0.0.1:7473/', 'connect', connectBody)

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

  it('parses the body only on a 200', async () => {
    const { host } = recorder({ status: 404, body: '{"error":"not-found"}' })
    expect(await call(host, 'http://h', 'devices', { nexusId: 'nx' })).toEqual({
      status: 404,
      reply: null,
    })
  })

  it('answers a transport refusal as a status of 0 carrying its text, and never throws', async () => {
    const { host } = recorder(new Error('Invalid URL'))
    const outcome = await call(host, 'not a url', 'devices', { nexusId: 'nx' })
    expect(outcome.status).toBe(0)
    expect(outcome.reply).toBeNull()
    expect(outcome.error).toContain('Invalid URL')
  })

  it('answers a body that is not JSON as a status of 0 rather than throwing out of the parse', async () => {
    const { host } = recorder({ status: 200, body: '<html>' })
    expect((await call(host, 'http://h', 'devices', { nexusId: 'nx' })).status).toBe(0)
  })
})
