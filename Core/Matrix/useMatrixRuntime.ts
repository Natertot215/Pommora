import { useSyncExternalStore } from 'react'
import { matrixRuntime, type Surface } from './matrixRuntime'

export const useMatrixHover = (surface: Surface): string | null =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.hoverOf(surface))

export const useMatrixCount = (): number =>
  useSyncExternalStore(matrixRuntime.subscribe, () => matrixRuntime.graph.nodes.length)
