import { useRef, useState } from 'react'
import { Icon } from '@pommora/uix/Symbols'
import { entityIcon } from '../Assets/entityIconPolicy'
import { shownDetail, useSession } from '../Session/store'
import { confirmDelete } from '../Interface/Confirm/confirmations'
import {
  FooterIconButton,
  MenuFooting,
  MenuItem,
  MenuScrollFrame,
  MenuSeparator,
} from '@pommora/uix/Menus'
import { IconChoice } from '../Assets/IconChoice'
import { InlineEditHeader } from '@pommora/uix/Menus/InlineEditHeader'
import { PropertyPanel } from '../Properties/PropertyPanel'
import { ICON } from '@pommora/uix/Menus/frames.css'
import { pageLinkText, pageMetaMenuSubset } from '@pommora/core/Actions/pageMenu'
import { host } from '../Platform/dialer'
import { popMenu } from '../Actions/menuActions'
import { EDITOR_SCALE_DEFAULT, coerceScale } from '../Settings/personalization'
import { ScalePicker } from '../Settings/ScalePicker'
import { useExperimental } from '../Settings/experimental'

const FOOTER_ACTIONS = [
  'title:rename',
  'title:copylink',
  'title:history',
  'title:reveal',
  'title:delete',
] as const

export function PageMenu(): React.JSX.Element | null {
  const pageDetail = useSession(shownDetail)
  const defaultIcons = useSession((st) => st.personalization.defaultIcons)
  const submitRename = useSession((st) => st.submitRename)
  const mutate = useSession((st) => st.mutate)
  const openHistory = useSession((st) => st.openHistory)
  const experimental = useExperimental()
  const [iconOpen, setIconOpen] = useState(false)
  const iconRef = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)
  const setPersonalization = useSession((st) => st.setPersonalization)
  const editorScale = coerceScale(
    useSession((st) => st.personalization.editorScale),
    EDITOR_SCALE_DEFAULT,
  )
  const setEditorScale = (f: number): void => {
    const next = coerceScale(f, EDITOR_SCALE_DEFAULT)
    setPersonalization('editorScale', next === EDITOR_SCALE_DEFAULT ? undefined : next)
  }

  if (!pageDetail) return null

  const runFooterAction = async (): Promise<void> => {
    const action = await popMenu(
      pageMetaMenuSubset(FOOTER_ACTIONS).map((r) =>
        r.action === 'title:history' ? { ...r, separatorBefore: undefined } : r,
      ),
    )
    if (action === 'title:rename') setRenaming(true)
    else if (action === 'title:copylink')
      await host().ask('clipboard:write', pageLinkText(pageDetail.title))
    else if (action === 'title:history') openHistory({ id: pageDetail.id, path: pageDetail.path })
    else if (action === 'title:reveal') await host().ask('path:reveal', pageDetail.path)
    else if (action === 'title:delete')
      await confirmDelete({ path: pageDetail.path, kind: 'page', title: pageDetail.title })
  }
  const ownIcon =
    typeof pageDetail.frontmatter.icon === 'string' ? pageDetail.frontmatter.icon : undefined

  return (
    <>
      <MenuScrollFrame
        footer={
          <MenuFooting
            leading={
              <ScalePicker ariaLabel="Page Scale" value={editorScale} onPick={setEditorScale} />
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
