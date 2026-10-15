import { useRef, useState } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { pageMetaOf, shownDetail, useSession } from '../Session/store'
import { personalizationOf } from '../Session/configSlice'
import {
  FooterIconButton,
  FooterLockButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus'
import { IconChoice } from '../Assets/IconChoice'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { PropertyPanel } from '../Properties/PropertyPanel'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { popPageActions } from '../Interface/Menus/pageMenuActions'
import { lockLabel } from '../Actions/toggleLabels'
import { useExperimental } from '../Settings/experimental'

export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession(shownDetail)
  const ownIcon = useSession(pageMetaOf(pageDetail?.id))?.icon
  const defaultIcons = useSession((st) => personalizationOf(st).defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const experimental = useExperimental()
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)
  // A placeholder for Page Lock, a future feature: the toggle swaps its glyph and locks nothing.
  const [locked, setLocked] = useState(false)

  if (!pageDetail) return null

  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuFooting
            leading={
              <FooterLockButton
                ariaLabel={lockLabel(locked, 'Page')}
                locked={locked}
                onToggle={() => setLocked(!locked)}
              />
            }
            trailing={
              <FooterIconButton
                icon="ellipsis"
                ariaLabel="More actions"
                onClick={() => void popPageActions(pageDetail, () => setRenaming(true))}
              />
            }
          />
        }
      >
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
        <PropertyPanel
          subject={{
            kind: 'page',
            id: pageDetail.id,
            path: pageDetail.path,
            title: pageDetail.title,
          }}
          host="dropdown"
        />
        {experimental && (
          <MenuItem
            leading={<Icon name="link-2" size={ICON.rootEntry} />}
            trailing={<Icon name="chevron-right" />}
          >
            Connections
          </MenuItem>
        )}
      </MenuScrollFrame>
      <IconChoice
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
