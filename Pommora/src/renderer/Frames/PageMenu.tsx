import { useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Controls/Button'
import { entityIcon, Icon } from '@renderer/DesignSystem/Symbols'
import { shownDetail, useSession } from '../store'
import { footerLockAction, lockIcon } from '@renderer/DesignSystem/Menus/menu-base.css'
import {
  FooterMoreButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@renderer/DesignSystem/Menus'
import { IconPicker } from '@renderer/Settings/IconPicker'
import { InlineEditHeader } from './InlineEditHeader'
import { PageProperties } from '../Properties/PageProperties'
import { FrameSlide } from '@renderer/DesignSystem/Menus/frame-slide'
import { ICON } from './frames.css'
import { pageLinkText } from '@shared/pageMenu'

const FOOTER_ACTIONS = ['title:rename', 'title:reveal', 'title:copylink', 'title:delete'] as const

export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession(shownDetail)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const [iconOpen, setIconOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'properties'>('root')
  const iconRef = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)

  if (!pageDetail) return null

  const runFooterAction = async (): Promise<void> => {
    const action = await window.nexus.pageActionsMenu({ actions: [...FOOTER_ACTIONS] })
    if (action === 'title:rename') setRenaming(true)
    else if (action === 'title:copylink')
      await window.nexus.writeClipboard(pageLinkText(pageDetail.title))
    else if (action === 'title:reveal') await window.nexus.revealPath(pageDetail.path)
    else if (action === 'title:delete')
      await mutate({ op: 'delete', path: pageDetail.path, kind: 'page' })
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
        leading={<Icon name="server" size={ICON.rootEntry} />}
        trailing={<Icon name="chevron-right" />}
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
          <MenuFooting
            leading={
              <Button size="button-inline" aria-label="Lock" className={footerLockAction} disabled>
                <Icon name="lock" size="control" className={lockIcon} />
                Lock
              </Button>
            }
            trailing={<FooterMoreButton onClick={() => void runFooterAction()} />}
          />
        }
      >
        <FrameSlide
          open={pane !== 'root'}
          root={root}
          detail={<PageProperties onBack={() => setPane('root')} />}
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
