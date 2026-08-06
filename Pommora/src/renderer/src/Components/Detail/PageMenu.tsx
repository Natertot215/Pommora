import { useRef, useState } from 'react'
import { entityIcon } from '@renderer/design-system/symbols'
import { useSession } from '../../store'
import { IconPicker } from '../IconPicker'
import { InlineEditHeader } from './InlineEditHeader'

/** The Settings dropdown's page scope. Reads `pageDetail`, the same source the editor's header
 *  renders from, so the title and glyph here and on the page never disagree. */
export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession((st) => st.pageDetail)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)

  if (!pageDetail) return null
  const ownIcon =
    typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined

  return (
    <>
      <InlineEditHeader
        value={pageDetail.title}
        icon={entityIcon('page', ownIcon, defaultIcons)}
        iconRef={iconRef}
        onIconClick={() => setIconOpen(true)}
        onCommit={(next) => void submitRename(pageDetail.path, 'page', next)}
      />
      <IconPicker
        open={iconOpen}
        onClose={() => setIconOpen(false)}
        triggerRef={iconRef}
        value={ownIcon}
        onSelect={(icon) =>
          void mutate({ op: 'setIcon', path: pageDetail.path, kind: 'page', icon })
        }
      />
    </>
  )
}
