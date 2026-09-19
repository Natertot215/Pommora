import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { closeSession, openSession } from '../Nexus/session'
import { installStores, NO_STORES } from '../Platform/stores'
import { realpathPosix, tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { matrixHandlers } from './handlers'

let root: string
const ctx = {} as HostContext

beforeEach(async () => {
  root = await realpathPosix(tempRoot('pom-matrix-handlers-'))
  installStores(memoryStores().stores)
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('matrix config channels', () => {
  it('refuses a patch that is not an object', async () => {
    const reply = await matrixHandlers['matrix:write'](ctx, 'forces')
    expect(reply).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'Matrix patch must be an object.' },
    })
  })

  it('round-trips one section', async () => {
    expect(await matrixHandlers['matrix:write'](ctx, { forces: { spread: 0.9 } })).toEqual({
      ok: true,
      value: null,
    })
    const reply = await matrixHandlers['matrix:read'](ctx)
    expect(reply.ok && reply.value.forces.spread).toBe(0.9)
    expect(reply.ok && reply.value.group.mode).toBe('connection')
  })
})

describe('the layout channels', () => {
  it('refuses a non-finite coordinate', () => {
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [0, Number.NaN] } })).toEqual(
      {
        ok: false,
        error: {
          code: 'operation-failed',
          message: 'A layout patch needs finite positions or a finite viewport.',
        },
      },
    )
    expect(matrixHandlers['matrixLayout:save'](ctx, {})).toEqual({
      ok: false,
      error: {
        code: 'operation-failed',
        message: 'A layout patch needs finite positions or a finite viewport.',
      },
    })
  })

  it('admits the held mark and refuses any other third slot', () => {
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2, 1] } }).ok).toBe(true)
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2, 0] } }).ok).toBe(false)
    expect(matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2, 2] } }).ok).toBe(false)
  })

  it('writes either half alone and loads both back', () => {
    matrixHandlers['matrixLayout:save'](ctx, { positions: { a: [1, 2] } })
    matrixHandlers['matrixLayout:save'](ctx, { viewport: { x: 5, y: 6, zoom: 2 } })
    const reply = matrixHandlers['matrixLayout:load']()
    expect(reply).toEqual({
      ok: true,
      value: { positions: { a: [1, 2] }, viewport: { x: 5, y: 6, zoom: 2 } },
    })
  })

  it('loads an unwritten layout as an empty map and no viewport', () => {
    expect(matrixHandlers['matrixLayout:load']()).toEqual({
      ok: true,
      value: { positions: {}, viewport: null },
    })
  })
})

describe('the graph channel', () => {
  it('fails while the index is unready rather than answering an empty graph', () => {
    expect(matrixHandlers['matrix:graph'](ctx, undefined)).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'The index is not ready.' },
    })
  })

  it('refuses paths that are not strings', () => {
    expect(matrixHandlers['matrix:graph'](ctx, [7])).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: 'Paths must be strings.' },
    })
  })
})
