import type { MutableKind } from '@shared/mutate'
import { useSession } from '../store'
import { EditableInput } from './EditableInput'

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
  if (renamingPath !== path) return <>{title}</>
  return (
    <EditableInput
      value={title}
      className={className}
      onCommit={(next) => {
        if (next && next !== title) void submitRename(path, kind, next)
        else cancelRename()
      }}
      onCancel={cancelRename}
    />
  )
}
