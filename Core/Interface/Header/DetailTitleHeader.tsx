import { type Ref, useEffect, useRef, useState } from 'react'
import type { TitleMenuAction } from '@pommora/core/Actions/identityMenus'
import { Icon } from '@pommora/uix/Symbols'
import { Button } from '@pommora/uix/Buttons/Button'
import { labelSlot, labelSlotHidden } from '@pommora/uix/Buttons/button-base.css'
import { segment } from '@pommora/uix/Elements/segment.css'
import { titleActionFade, titleActionFadeHidden } from '@pommora/uix/Animations/animations.css'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { base } from '@pommora/uix/Fields/fields.css'
import { useHoverDwell } from '@pommora/uix/Interactions/hoverDwell'
import { overScrollLabel } from '@pommora/uix/Interactions/OverScroll'
import { cx } from '@pommora/uix/Utilities/cx'
import './content-title.css'

const HINT_GRACE_MS = 150

/** `query` is null while the title rests, and a string — empty or not — while its search is open. */
export interface TitleSearch {
  query: string | null
  summon: number
  start: () => void
  change: (query: string | null) => void
}

interface Props {
  title: string
  icon?: string
  iconRef?: Ref<SVGSVGElement>
  // biome-ignore lint/suspicious/noConfusingVoidType: the union is deliberate: a caller may hand back nothing or a promise, and `undefined` in place of `void` breaks assignability for the sync handlers.
  onRename: (newName: string) => void | Promise<boolean | void>
  requestMenu: () => Promise<TitleMenuAction | 'search' | null>
  onEditIcon: () => void
  onToggleIcon?: () => void
  iconHidden?: boolean
  search?: TitleSearch
}

export function DetailTitleHeader({
  title,
  icon,
  iconRef,
  onRename,
  requestMenu,
  onEditIcon,
  onToggleIcon,
  iconHidden,
  search,
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const searching = search?.query != null
  const hint = useHoverDwell(search !== undefined && !searching && !editing, false, HINT_GRACE_MS)
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

  const openMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    const action = await requestMenu()
    if (action === 'rename') {
      search?.change(null)
      setEditing(true)
    } else if (action === 'editIcon') onEditIcon()
    else if (action === 'toggleIcon') onToggleIcon?.()
    else if (action === 'search') search?.start()
  }

  const label = (
    // A refused rename needs no revert — the field unmounts on commit and the resting span shows the live title until the tree confirms.
    <RenamableLabel
      renames="title"
      editing={editing}
      value={title}
      className={cx(base, 'detail-title-input')}
      onCommit={(next) => {
        setEditing(false)
        void onRename(next)
      }}
      onCancel={() => setEditing(false)}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the title is a right-click affordance and a pointer door to its search — the keyboard reaches the search through the Search command */}
      <span className="detail-title-text" onContextMenu={openMenu} onClick={search?.start}>
        {title}
      </span>
    </RenamableLabel>
  )

  return (
    <div className="detail-title">
      {icon && (
        <Icon
          ref={iconRef}
          name={icon}
          className={
            iconHidden
              ? 'detail-title-icon title-icon-reveal is-hidden'
              : 'detail-title-icon title-icon-reveal'
          }
          onContextMenu={editing ? undefined : openMenu}
        />
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
                placeholder="Search"
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
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') return
                  e.preventDefault()
                  search.change(null)
                }}
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
    </div>
  )
}
