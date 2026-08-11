import type { MutableKind } from '@shared/mutate'
import { useSession } from '../store'
import { RenamableLabel } from './RenamableLabel'

/** `renamingPath` is set by the native context menu's Rename via `begin-rename`. */
export function RenamableTitle({
  path,
  kind,
  title,
  className,
  boxed,
}: {
  path: string
  kind: MutableKind
  title: string
  className: string
  /** The field carries its own border and fill — see `EditableInput`. */
  boxed?: boolean
}): React.JSX.Element {
  const renamingPath = useSession((s) => s.renamingPath)
  const renamingCreate = useSession((s) => s.renamingCreate)
  const cancelRename = useSession((s) => s.cancelRename)
  const submitRename = useSession((s) => s.submitRename)
  return (
    <RenamableLabel
      renames="row"
      editing={renamingPath === path}
      emptyInitial={renamingPath === path && renamingCreate}
      value={title}
      className={className}
      boxed={boxed}
      onCommit={(next) => void submitRename(path, kind, next)}
      onCancel={cancelRename}
    />
  )
}
