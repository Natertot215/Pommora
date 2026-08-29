import { PageEmbed } from '@renderer/Embeds/PageEmbed'
import type { ConnPage, ConnectionsApi } from '@renderer/MarkdownPM/Connections'

// The page is resolved by the surface's ONE shared id→page map — never a per-embed tree walk.
export function PageEmbedBlock({
  page,
  entryId,
  editing,
  onBeginEdit,
  connections,
  locked = false,
}: {
  page: ConnPage
  entryId: string
  editing: boolean
  onBeginEdit: (tileId: string) => void
  connections?: ConnectionsApi
  locked?: boolean
}): React.JSX.Element {
  return (
    <PageEmbed
      path={page.path}
      editing={editing}
      onBeginEdit={() => onBeginEdit(entryId)}
      connections={connections}
      locked={locked}
    />
  )
}
