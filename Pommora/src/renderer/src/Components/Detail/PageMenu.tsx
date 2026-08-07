import { useRef, useState } from 'react'
import { Server } from 'lucide-react'
import { entityIcon, Icon } from '@renderer/design-system/symbols'
import { useSession } from '../../store'
import { flushTrailing } from '../../design-system/components/menu/menu.css'
import { MenuItem, MenuSeparator } from '../../design-system/components/menu'
import { IconPicker } from '../IconPicker'
import { InlineEditHeader } from './InlineEditHeader'
import { PagePropertiesPane } from './PagePropertiesPane'
import { PaneSlider } from './PaneSlider'
import { ICON } from './settingsPane.css'

/** The Settings dropdown's page scope — the Page's identity, and the leaves that configure it.
 *  Reads `pageDetail`, the same source the editor's header renders from, so the title and glyph
 *  here and on the page never disagree. */
export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession((st) => st.pageDetail)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [iconOpen, setIconOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'properties'>('root')
  const iconRef = useRef<HTMLButtonElement>(null)

  if (!pageDetail) return null
  const ownIcon =
    typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined

  const root = (
    <>
      <InlineEditHeader
        value={pageDetail.title}
        icon={entityIcon('page', ownIcon, defaultIcons)}
        iconRef={iconRef}
        onIconClick={() => setIconOpen(true)}
        onCommit={(next) => void submitRename(pageDetail.path, 'page', next)}
      />
      <MenuSeparator flush />
      <MenuItem
        className={flushTrailing}
        leading={<Server size={ICON.rootEntry} />}
        trailing={<Icon name="chevron-right" size={ICON.rowChevron} />}
        onClick={() => setPane('properties')}
      >
        Properties
      </MenuItem>
    </>
  )

  return (
    <>
      <PaneSlider
        open={pane !== 'root'}
        root={root}
        detail={<PagePropertiesPane onBack={() => setPane('root')} />}
        minWidth={225}
        minHeight={245}
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
