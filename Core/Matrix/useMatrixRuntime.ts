import { useSyncExternalStore } from 'react'
import { matrixRuntime } from './matrixRuntime'

export const useMatrixHover = (): number =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.hoveredIndex())

export const useMatrixCount = (): number =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.graph.nodes.length)
