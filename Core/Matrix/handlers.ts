import { type Handlers, withRoot } from '../Contract/handlers'
import { BUSY, fail, NO_NEXUS, ok } from '../Contract/result'
import { isStringArray } from '../Contract/validators'
import { adopting } from '../Nexus/handlers'
import { sessionRoot } from '../Nexus/session'
import { readValue, writeValue } from '../Platform/localState'
import { isPlainObject } from '../Properties/propertyValue'
import type { Frame } from './Engine/viewport'
import type { MatrixPatch } from './matrixConfig'
import { readMatrixFile, writeMatrixFile } from './matrixFile'
import { readMatrixGraph } from './matrixGraph'
import {
  isLayoutPatch,
  readPositions,
  isFrame,
  type MatrixLayout,
  type Positions,
} from './matrixLayout'

export const matrixHandlers = {
  'matrix:read': withRoot(async (root) => ok(await readMatrixFile(root))),

  'matrix:write': async (_ctx, patch: unknown) => {
    if (adopting()) return BUSY
    const root = sessionRoot()
    if (root === null) return NO_NEXUS
    if (!isPlainObject(patch)) return fail('operation-failed', 'Matrix patch must be an object.')
    await writeMatrixFile(root, patch as MatrixPatch)
    return ok(null)
  },

  'matrix:graph': withRoot((_root, _ctx, paths: unknown) => {
    if (paths !== undefined && !isStringArray(paths))
      return fail('operation-failed', 'Paths must be strings.')
    const reply = readMatrixGraph(paths)
    return reply ? ok(reply) : fail('operation-failed', 'The index is not ready.')
  }),

  'matrixLayout:load': () => {
    if (sessionRoot() === null) return NO_NEXUS
    const positions = readValue<Positions>('matrixLayout')
    const frame = readValue<Frame>('matrixFrame')
    return ok({
      positions: readPositions(positions),
      frame: isFrame(frame) ? frame : null,
    } satisfies MatrixLayout)
  },

  'matrixLayout:save': (_ctx, patch: unknown) => {
    if (adopting()) return BUSY
    if (!isLayoutPatch(patch))
      return fail('operation-failed', 'A layout patch needs finite positions or a finite frame.')
    if (patch.positions && !writeValue('matrixLayout', patch.positions)) return NO_NEXUS
    if (patch.frame && !writeValue('matrixFrame', patch.frame)) return NO_NEXUS
    return ok(null)
  },
} satisfies Partial<Handlers>
