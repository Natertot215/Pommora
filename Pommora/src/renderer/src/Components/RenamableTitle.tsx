import type { MutableKind } from '@shared/mutate'
import { useSession } from '../store'
import { RenamableLabel } from './RenamableLabel'

/** `renamingPath` is set by the native context menu's Rename via `begin-rename`. */
export function RenamableTitle({
  path,
  kind,
  title,
  className,
}: {
  path: string
  kind: MutableKind
  title: string
  className: string
}): React.JSX.Element {
  const renamingPath = useSession((s) => s.renamingPath)
  const cancelRename = useSession((s) => s.cancelRename)
  const submitRename = useSession((s) => s.submitRename)
  return (
    <RenamableLabel
      renames="row"
      editing={renamingPath === path}
      value={title}
      className={className}
      onCommit={(next) => void submitRename(path, kind, next)}
      onCancel={cancelRename}
    />
  )
}
