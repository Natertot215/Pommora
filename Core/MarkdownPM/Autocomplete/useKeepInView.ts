import { useCallback } from 'react'

export function useKeepInView(active: unknown): (el: HTMLElement | null) => void {
  return useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView({ inline: 'nearest', block: 'nearest' }),
    [active],
  )
}
