import { useCallback, useEffect } from 'react'
import type { PageStats } from '@pommora/core/MarkdownPM/Engine/subfieldStats'
import { useSession } from '../../Session/store'

/** The mounted detail publishes its own resolved count, because the Subfield renders beside it and never sees the pipeline that produced the rows. */
export function usePublishCount(count: number | null): void {
  const setDetailCount = useSession((s) => s.setDetailCount)
  useEffect(() => setDetailCount(count), [count, setDetailCount])
  useEffect(() => () => setDetailCount(null), [setDetailCount])
}

/** A page surface publishes its highlight the same way; the path both names the figures and guards the clear that follows a blur. */
export function usePublishSelection(path: string): (stats: PageStats | null) => void {
  const setEditorSelection = useSession((s) => s.setEditorSelection)
  return useCallback((stats) => setEditorSelection(path, stats), [path, setEditorSelection])
}
