import type { MutableKind, RenameHost } from '@shared/mutate'
import { useEffect, useState } from 'react'
import { useSession } from '../store'
import { RenamableLabel } from './RenamableLabel'

/** `renamingPath` is set by the native context menu's Rename via `begin-rename`. Every host
 *  surface claims when it becomes the target; the fence resolves one winner, so a path visible
 *  on two surfaces (a set's sidebar row and its table band) mounts exactly one field. */
export function RenamableTitle({
  path,
  kind,
  title,
  className,
  boxed,
  host,
}: {
  path: string
  kind: MutableKind
  title: string
  className: string
  /** The field carries its own border and fill — see `EditableInput`. */
  boxed?: boolean
  host: RenameHost
}): React.JSX.Element {
  const target = useSession((s) => s.renamingPath === path)
  const renamingCreate = useSession((s) => s.renamingCreate)
  const winner = useSession((s) => s.renameWinner)
  const cancelRename = useSession((s) => s.cancelRename)
  const submitRename = useSession((s) => s.submitRename)
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
      renames="row"
      editing={owns}
      emptyInitial={owns && renamingCreate}
      value={title}
      className={className}
      boxed={boxed}
      onCommit={(next) => void submitRename(path, kind, next)}
      onCancel={cancelRename}
    />
  )
}
