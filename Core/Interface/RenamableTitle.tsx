import type { HeldKind } from '../Nexus/entities'
import type { RenameHost } from '../Session/editSlice'
import { useEffect, useState } from 'react'
import { useSession } from '../Session/store'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'

/** The fence resolves one winner, so a path visible on two surfaces (a set's sidebar row and its table band) mounts exactly one field. */
export function RenamableTitle({
  path,
  kind,
  title,
  className,
  renames = 'row',
  autoSize,
  host,
  doubleClick = true,
}: {
  path: string
  kind: HeldKind
  title: string
  className: string
  renames?: 'title' | 'row'
  autoSize?: boolean
  host: RenameHost
  /** Off where a double-click already means something else — a Set band opens its Set. */
  doubleClick?: boolean
}): React.JSX.Element {
  const target = useSession((s) => s.renamingPath === path)
  // Guarded through the target check so a create or a claim/release only re-renders the one path's fields, never every mounted title in the app.
  const renamingCreate = useSession((s) => s.renamingPath === path && s.renamingCreate)
  const winner = useSession((s) => (s.renamingPath === path ? s.renameWinner : null))
  const cancelRename = useSession((s) => s.cancelRename)
  const submitRename = useSession((s) => s.submitRename)
  const beginRename = useSession((s) => s.beginRename)
  const [token, setToken] = useState<number | null>(null)
  useEffect(() => {
    if (!target) return
    const claimed = useSession.getState().claimRename(path, host)
    setToken(claimed)
    return () => {
      setToken(null)
      if (claimed !== null) useSession.getState().releaseRename(claimed)
    }
  }, [target, path, host])
  const owns = target && token !== null && winner === token
  return (
    <RenamableLabel
      renames={renames}
      editing={owns}
      emptyInitial={owns && renamingCreate}
      value={title}
      className={className}
      autoSize={autoSize}
      onBegin={doubleClick ? () => beginRename(path, false, host) : undefined}
      onCommit={(next) => void submitRename(path, kind, next)}
      onCancel={cancelRename}
    />
  )
}
