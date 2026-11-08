import { type RefObject, useEffect, useRef, useState } from 'react'
import type { TitleMenuAction } from '../../Actions/identityMenus'
import { Icon } from '@pommora/uix/Symbols'
import { Button } from '@pommora/uix/Buttons/Button'
import { labelSlot, labelSlotHidden } from '@pommora/uix/Buttons/button-base.css'
import { segment } from '@pommora/uix/Elements/segment.css'
import { titleActionFade, titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { base } from '@pommora/uix/Fields/fields.css'
import { REVEAL_DWELL_MS, useHoverReveal } from '@pommora/uix/Interactions/hoverReveal'
import { useEscape } from '@pommora/uix/Interactions/dismissalStack'
import { useContentHost } from '../contentHost'
import { RenamableName } from '../RenamableTitle'
import type { RenameKind } from '../../Nexus/mutateRequest'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { cx } from '@pommora/uix/Utilities/cx'
import { AssetImage } from '../../Assets/AssetImage'
import './content-title.css'

/** `query` is null while the title rests, and a string — empty or not — while its search is open. */
export interface TitleSearch {
  query: string | null
  summon: number
  start: () => void
  change: (query: string | null) => void
}

interface Props {
  title: string
  path: string
  kind: RenameKind
  icon?: string
  photo?: string | null
  iconRef?: RefObject<Element | null>
  requestMenu: () => Promise<TitleMenuAction | 'search' | null>
  onIconClick: () => void
  onToggleIcon?: () => void
  iconHidden?: boolean
  iconOpen?: boolean
  search?: TitleSearch
  renameSummon?: number
  /** Drawn after the title and its search's clear button, which pads against it. */
  trailing?: React.ReactNode
}

export function DetailTitleHeader({
  title,
  path,
  kind,
  icon,
  photo,
  iconRef,
  requestMenu,
  onIconClick,
  onToggleIcon,
  iconHidden,
  iconOpen,
  search,
  renameSummon,
  trailing,
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const searching = search?.query != null
  const hint = useHoverReveal({
    active: search !== undefined && !searching && !editing,
    dwellMs: REVEAL_DWELL_MS,
  })
  const hintOpen = hint.on || searching
  const field = useRef<HTMLInputElement>(null)
  // Only a search opened from the hint slides the title away; every other door replaces it at once.
  const fromHint = useRef(false)
  if (!searching) fromHint.current = false
  const seenSummon = useRef(search?.summon)
  useEffect(() => {
    if (search?.summon === seenSummon.current) return
    seenSummon.current = search?.summon
    field.current?.focus()
    field.current?.select()
  }, [search?.summon])
  useEffect(() => {
    if (!searching) field.current?.blur()
  }, [searching])
  const parked = useContentHost()?.parked === true
  useEscape(searching && !parked, () => search?.change(null))

  const beginRename = (): void => {
    search?.change(null)
    setEditing(true)
  }
  const seenRename = useRef(renameSummon)
  useEffect(() => {
    if (renameSummon === seenRename.current) return
    seenRename.current = renameSummon
    beginRename()
  }, [renameSummon])
  // The search takes the title's place at once, so a double-click's second press lands wherever the title was.
  const openSearch = (): void => {
    search?.start()
    window.addEventListener(
      'mousedown',
      (e) => {
        if (e.detail !== 2) return
        e.preventDefault()
        beginRename()
      },
      { capture: true, once: true },
    )
  }
  const openMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    const action = await requestMenu()
    if (action === 'rename') beginRename()
    else if (action === 'editIcon') onIconClick()
    else if (action === 'toggleIcon') onToggleIcon?.()
    else if (action === 'search') search?.start()
  }

  const label = (
    <RenamableName
      title={title}
      kind={kind}
      rename={{ path, editing, onBegin: beginRename, onEnd: () => setEditing(false) }}
      className={cx(base, 'detail-title-input')}
      renames="title"
    >
      {(shown) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the title is a right-click affordance and a pointer door to its search — the keyboard reaches the search through the Search command
        <span
          className="detail-title-text"
          onContextMenu={openMenu}
          onClick={search ? openSearch : undefined}
        >
          {shown}
        </span>
      )}
    </RenamableName>
  )

  const glyphClass = cx(
    'detail-title-icon title-icon-reveal',
    iconHidden && !iconOpen && 'is-hidden',
  )
  const glyphMenu = editing ? undefined : openMenu
  const glyphRef = (el: Element | null): void => {
    if (iconRef) iconRef.current = el
  }
  return (
    <div className="detail-title">
      {photo ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance, as on the icon it stands in for
        <span
          ref={glyphRef}
          className={cx(glyphClass, 'detail-title-photo')}
          onContextMenu={glyphMenu}
        >
          <AssetImage value={photo} eager />
        </span>
      ) : (
        icon && <Icon ref={glyphRef} name={icon} className={glyphClass} onContextMenu={glyphMenu} />
      )}
      {search ? (
        <>
          <span
            className={cx(
              'detail-title-lead',
              overScrollLabel,
              searching && 'is-searching',
              searching && !fromHint.current && 'is-instant',
            )}
            onPointerEnter={() => hint.hover(true)}
            onPointerLeave={() => hint.hover(false)}
          >
            <span className={cx(labelSlot, searching && labelSlotHidden, 'detail-title-slot')}>
              <span className="detail-title-slot-run">
                {label}
                <span
                  className={cx(
                    segment,
                    'detail-title-hint-segment',
                    titleActionFade,
                    !hintOpen && titleActionFadeHidden,
                  )}
                  aria-hidden
                />
              </span>
            </span>
            <span className={cx(labelSlot, !hintOpen && labelSlotHidden, 'detail-title-hint')}>
              <SearchField
                inputRef={field}
                tabIndex={-1}
                value={search.query ?? ''}
                onValueChange={search.change}
                className={cx(base, 'detail-title-search')}
                onFocus={
                  searching
                    ? undefined
                    : () => {
                        fromHint.current = true
                        search.start()
                      }
                }
                onBlur={() => {
                  if (!search.query?.trim()) search.change(null)
                }}
                onContextMenu={(e) => e.stopPropagation()}
              />
            </span>
          </span>
          <span
            className={cx(
              'detail-title-clear',
              titleActionFade,
              !search.query?.trim() && titleActionFadeHidden,
            )}
          >
            <Button
              size="button-inline"
              icon="x"
              iconSize="headline"
              onClick={() => search.change(null)}
            />
          </span>
        </>
      ) : (
        label
      )}
      {trailing && <span className="detail-title-trailing">{trailing}</span>}
    </div>
  )
}
