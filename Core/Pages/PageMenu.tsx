import { useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { shownDetail, useSession } from '../Session/store'
import { confirmDelete } from '../Interface/confirmations'
import { footerLockAction, lockIcon } from '@pommora/uix/Menus/menu-base.css'
import {
  FooterIconButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus'
import { IconPicker } from '../Assets/IconPicker'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { PageProperties } from '../Properties/Page/PageProperties'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { pageLinkText } from '@pommora/core/Actions/pageMenu'
import { host } from '../Platform/dialer'

const FOOTER_ACTIONS = ['title:rename', 'title:reveal', 'title:copylink', 'title:delete'] as const

export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession(shownDetail)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const openHistory = useSession((st) => st.openHistory)
  const [iconOpen, setIconOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'properties'>('root')
  const iconRef = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)

  if (!pageDetail) return null

  const runFooterAction = async (): Promise<void> => {
    const action = await host().ask('page-actions-menu', { actions: [...FOOTER_ACTIONS] })
    if (action === 'title:rename') setRenaming(true)
    else if (action === 'title:copylink')
      await host().ask('clipboard:write', pageLinkText(pageDetail.title))
    else if (action === 'title:reveal') await host().ask('path:reveal', pageDetail.path)
    else if (action === 'title:delete')
      await confirmDelete({ path: pageDetail.path, kind: 'page', title: pageDetail.title })
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
        iconOpen={iconOpen}
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
      <MenuItem
        leading={<Icon name="history" size={ICON.rootEntry} />}
        onClick={() => openHistory({ id: pageDetail.id, path: pageDetail.path })}
      >
        History
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
                <Icon name="lock-open" size="control" className={lockIcon} />
                Lock
              </Button>
            }
            trailing={
              <FooterIconButton
                icon="ellipsis"
                ariaLabel="More actions"
                onClick={() => void runFooterAction()}
              />
            }
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
