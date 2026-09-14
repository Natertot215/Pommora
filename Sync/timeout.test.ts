import { connect } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { boot } from './Testing/hub.ts'
import { JSON_TIMEOUT_MS, LOOPBACK } from './wire.ts'

let hub: Awaited<ReturnType<typeof boot>>

beforeAll(async () => {
  hub = await boot()
})

afterAll(async () => {
  await hub.close()
})

describe('the hub under a stalled body', () => {
  it(
    'answers 408 and closes the socket rather than holding it open',
    async () => {
      const socket = connect(hub.port, LOOPBACK)
      await new Promise<void>((resolve) => socket.once('connect', resolve))
      socket.write(
        [
          'POST /connect HTTP/1.1',
          `host: ${LOOPBACK}`,
          'content-type: application/json',
          'content-length: 64',
          '',
          '{"nexusId":',
        ].join('\r\n'),
      )
      let text = ''
      let answeredAt = 0
      socket.on('data', (chunk: Buffer) => {
        text += chunk.toString('utf8')
        if (answeredAt === 0) answeredAt = Date.now()
      })
      await new Promise<void>((resolve) => socket.once('close', () => resolve()))
      expect(text).toContain('408')
      expect(answeredAt).toBeGreaterThan(0)
      expect(Date.now() - answeredAt).toBeLessThan(1_000)
    },
    JSON_TIMEOUT_MS + 10_000,
  )
})
