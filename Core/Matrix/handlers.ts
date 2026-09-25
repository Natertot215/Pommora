import { type Handlers, withRoot, withWriteRoot } from '../Contract/handlers'
import { fault, NO_STORE, ok } from '../Contract/result'
import { isPlainObject, isStringArray } from '../Contract/validators'
import { readScope, readValue, writeKeys, writeValue } from '../Platform/localState'
import type { Lens } from './Engine/viewport'
import type { MatrixPatch } from './matrixConfig'
import { readMatrixFile, writeMatrixFile } from './matrixFile'
import { readMatrixGraph } from './matrixGraph'
import { isLayoutPatch, isLens, readPositions, type MatrixLayout } from './matrixLayout'

export const matrixHandlers = {
  'matrix:read': withRoot(async (root) => ok(await readMatrixFile(root))),

  'matrix:write': withWriteRoot(async (root, _ctx, patch: unknown) => {
    if (!isPlainObject(patch)) return fault('Matrix patch must be an object.')
    await writeMatrixFile(root, patch as MatrixPatch)
    return ok(null)
  }),

  'matrix:graph': withRoot((_root, _ctx, paths: unknown) => {
    if (paths !== undefined && !isStringArray(paths)) return fault('Paths must be strings.')
    const reply = readMatrixGraph(paths)
    return reply ? ok(reply) : fault('The index is not ready.')
  }),

  // A layout saved before positions took a row per node is one map under the scope's empty key. Reads merge it under the rows, and the first position save folds it into rows of their own, so the read path never writes.
  'matrixLayout:load': withRoot(() => {
    const lens = readValue<Lens>('matrixFrame')
    const { '': legacy, ...rows } = readScope('matrixLayout')
    return ok({
      positions: readPositions({ ...readPositions(legacy), ...rows }),
      lens: isLens(lens) ? lens : null,
    } satisfies MatrixLayout)
  }),

  'matrixLayout:save': withWriteRoot((_root, _ctx, patch: unknown) => {
    if (!isLayoutPatch(patch))
      return fault('A layout patch needs finite positions or a finite lens.')
    const legacy = patch.positions ? readValue('matrixLayout') : null
    const rows =
      legacy === null ? patch.positions : { ...readPositions(legacy), ...patch.positions, '': null }
    if (rows && !writeKeys('matrixLayout', rows)) return NO_STORE
    if (patch.lens && !writeValue('matrixFrame', patch.lens)) return NO_STORE
    return ok(null)
  }),
} satisfies Partial<Handlers>
