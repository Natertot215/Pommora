import { useRef, useState } from 'react'
import { Server } from 'lucide-react'
import { entityIcon, Icon } from '@renderer/design-system/symbols'
import { useSession } from '../../store'
import { flushTrailing } from '../../design-system/components/menu/menu.css'
import { footerLockAction, lockIcon } from '@renderer/design-system/components/menu/menu.css'
import {
  MenuBottomRow,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '../../design-system/components/menu'
import { IconPicker } from '../IconPicker'
import { InlineEditHeader } from './InlineEditHeader'
import { PagePropertiesPane } from './PagePropertiesPane'
import { PaneSlider } from './PaneSlider'
import { ICON } from './settingsPane.css'
import { pageLinkText } from '@shared/pageMenu'

/** What the ellipsis offers today — a named slice of the page menu, so these four read and order
 *  themselves exactly as they do everywhere else a page is right-clicked. */
const FOOTER_ACTIONS = ['title:rename', 'title:reveal', 'title:copylink', 'title:delete'] as const

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
  const [renaming, setRenaming] = useState(false)

  if (!pageDetail) return null
  const page = pageDetail

  const runFooterAction = async (): Promise<void> => {
    const action = await window.nexus.pageActionsMenu({ actions: [...FOOTER_ACTIONS] })
    if (action === 'title:rename') setRenaming(true)
    else if (action === 'title:copylink') await window.nexus.writeClipboard(pageLinkText(page.title))
    else if (action === 'title:reveal') await window.nexus.revealPath(page.path)
    else if (action === 'title:delete')
      await mutate({ op: 'delete', path: page.path, kind: 'page' })
  }
  const ownIcon =
    typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined

  const root = (
    <>
      <InlineEditHeader
        editing={renaming}
        onEditingChange={setRenaming}
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
      <MenuScrollFrame
        footer={
          <MenuBottomRow
            leading={
              // Parked: a page has no board to lock. Inert rather than a live button wired to a
              // no-op, which reads as broken instead of pending.
              <button type="button" aria-label="Lock" className={footerLockAction} disabled>
                <Icon name="lock" size={12} className={lockIcon} />
                Lock
              </button>
            }
            trailing={
              <button
                type="button"
                aria-label="More actions"
                className={footerLockAction}
                onClick={() => void runFooterAction()}
              >
                <Icon name="ellipsis" size={13} />
              </button>
            }
          />
        }
      >
        <PaneSlider
          open={pane !== 'root'}
          root={root}
          detail={<PagePropertiesPane onBack={() => setPane('root')} />}
          minWidth={225}
          minHeight={245}
        />
      </MenuScrollFrame>
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
