import { EmptyValue } from '../Elements/EmptyValue'
import { useEffect, useRef, useState } from 'react'
import { useSettleFallback } from '../Animations/useExitPresence'
import { Button } from '../Buttons/Button'
import { Icon } from '../Symbols'
import { DualSwitch } from '../Controls/DualSwitch'
import { usePointerGesture } from '../Interactions/gesture'
import { OverScroll } from '../Interactions/OverScroll'
import { PickerMenu } from './PickerMenu'
import { MenuItem } from '../Menus/MenuRows'
import { cx } from '../Utilities/cx'
import { localDayKey, pad } from '../Utilities/pad'
import { rowBox } from '../Menus/menu-row.css'
import { MenuScrollFrame } from '../Menus/MenuRows'
import * as s from './calendar-picker.css'
import { clamp } from '../Utilities/clamp'
import { useLatest } from '../Utilities/stableApi'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const HOURS_24 = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** KNOB — the dropdown list's ceiling. */
const DROPDOWN_MAX_HEIGHT = 136

/** KNOB — the Month/Year buttons' inset; the pair reads as one title. */
const TITLE_PAD_X = '2px'

type Anchor = { x: number; y: number; h: number; el: HTMLElement }
const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top, h: r.height, el }
}

const dataKey = (el: Element | null | undefined): string | null =>
  el?.closest('[data-k]')?.getAttribute('data-k') ?? null

const monthName = (m: number): string =>
  new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'long' })

export function CalendarPicker({
  formatDateValue,
  timeFormat,
  value = null,
  onChange,
}: {
  formatDateValue: (isoDate: string) => string
  timeFormat: 'twelveHour' | 'twentyFourHour'
  value?: { at: Date; timed: boolean } | null
  onChange?: (iso: string | null) => void
}): React.JSX.Element {
  const twelve = timeFormat === 'twelveHour'
  const now = new Date()
  const todayKey = localDayKey(now)

  const [cursor, setCursor] = useState(() => {
    const seed = value?.at ?? now
    return new Date(seed.getFullYear(), seed.getMonth(), 1)
  })
  const [slide, setSlide] = useState<{ dir: 1 | -1; from: Date } | null>(null)
  const settleSlide = useSettleFallback(slide !== null, 'base', () => setSlide(null))
  const [day, setDay] = useState<string | null>(value ? localDayKey(value.at) : null)
  const [timeOn, setTimeOn] = useState(value?.timed ?? false)
  const [minutes, setMinutes] = useState(
    value?.timed ? value.at.getHours() * 60 + value.at.getMinutes() : 9 * 60,
  )
  const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)
  const [timeMenu, setTimeMenu] = useState<{ part: 'h' | 'm'; at: Anchor } | null>(null)
  const [partEdit, setPartEdit] = useState<{ part: 'h' | 'm'; draft: string } | null>(null)

  const begin = usePointerGesture()
  const swipe = useRef(0)
  const swipeCooldown = useRef(false)
  const swipeIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onChangeRef = useLatest(onChange)
  const emitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingEmit = useRef<string | null | undefined>(undefined)
  const initial = useRef({ day, timeOn, minutes })
  const armed = useRef(false)

  const year = cursor.getFullYear()

  useEffect(() => {
    if (!onChangeRef.current) return
    if (
      !armed.current &&
      day === initial.current.day &&
      timeOn === initial.current.timeOn &&
      minutes === initial.current.minutes
    ) {
      return
    }
    armed.current = true
    const iso = day
      ? timeOn
        ? `${day}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`
        : day
      : null
    pendingEmit.current = iso
    clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(() => {
      pendingEmit.current = undefined
      onChangeRef.current?.(iso)
    }, 150)
  }, [day, timeOn, minutes])
  useEffect(
    () => () => {
      if (pendingEmit.current !== undefined) {
        clearTimeout(emitTimer.current)
        onChangeRef.current?.(pendingEmit.current)
      }
    },
    [],
  )

  const menuTrigger = useLatest(menu?.at.el ?? null)
  const timeMenuTrigger = useLatest(timeMenu?.at.el ?? null)

  const nav = (dir: 1 | -1): void => {
    if (slide) return
    setSlide({ dir, from: cursor })
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
  }
  const jump = (y: number, m: number): void => {
    setCursor(new Date(y, m, 1))
    setMenu(null)
  }

  const pick = (k: string): void => setDay(k === day ? null : k)

  const onGridWheel = (e: React.WheelEvent): void => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    clearTimeout(swipeIdle.current)
    swipeIdle.current = setTimeout(() => {
      swipe.current = 0
      swipeCooldown.current = false
    }, 150)
    if (slide || swipeCooldown.current) return
    if (swipe.current !== 0 && Math.sign(e.deltaX) !== Math.sign(swipe.current)) swipe.current = 0
    swipe.current += e.deltaX
    if (Math.abs(swipe.current) > 60) {
      nav(swipe.current > 0 ? 1 : -1)
      swipe.current = 0
      swipeCooldown.current = true
    }
  }

  // A zero-move press never captures, so the day button's own click carries the pick.
  const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const k = dataKey(e.target as Element)
    if (!k || k !== day) return
    let moved = false
    begin({
      el: e.currentTarget,
      event: e,
      activation: 0,
      capture: true,
      onActivate: () => true,
      onDragMove: (ev) => {
        const at = dataKey(document.elementFromPoint(ev.clientX, ev.clientY))
        if (!at) return
        moved ||= at !== k
        setDay(at)
      },
      // The engine swallows the click after an activated release, so a wobble still has to pick here.
      onDrop: () => {
        if (!moved) pick(k)
      },
      onAbort: () => setDay(k),
    })
  }

  const rowsFor = (month: Date): number => {
    const lead = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    return Math.ceil((lead + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)
  }

  const grid = (month: Date): React.JSX.Element => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const lead = new Date(y, m, 1).getDay()
    const first = new Date(y, m, 1 - lead)
    const cellCount = rowsFor(month) * 7
    return (
      <div className={s.days} key={localDayKey(month)}>
        {Array.from({ length: cellCount }, (_, i) => {
          const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)
          const k = localDayKey(d)
          const sel = k === day
          return (
            <button
              type="button"
              key={k}
              data-k={k}
              className={cx(s.day, d.getMonth() !== m && s.dayOut, sel && s.daySelected)}
              onClick={() => pick(k)}
            >
              <span
                className={cx(s.pill, k === todayKey && !sel && s.pillToday, sel && s.pillSelected)}
              />
              {d.getDate()}
            </button>
          )
        })}
      </div>
    )
  }

  const shownHour = twelve ? ((Math.floor(minutes / 60) + 11) % 12) + 1 : Math.floor(minutes / 60)
  const hourToMins = (v: number): number =>
    (twelve ? (v % 12) + (minutes >= 720 ? 12 : 0) : v) * 60 + (minutes % 60)
  const minuteToMins = (v: number): number => Math.floor(minutes / 60) * 60 + v
  const hourText = (v: number): string => (twelve ? String(v) : pad(v))
  const partText = (part: 'h' | 'm'): string =>
    part === 'h' ? hourText(shownHour) : pad(minutes % 60)

  const partCommit = (): void => {
    if (!partEdit) return
    const v = Number(partEdit.draft)
    if (partEdit.draft !== '' && Number.isFinite(v)) {
      if (partEdit.part === 'h') {
        const clamped = twelve ? clamp(v, 1, 12) : Math.min(v, 23)
        setMinutes(hourToMins(clamped))
      } else setMinutes(minuteToMins(Math.min(v, 59)))
    }
    setPartEdit(null)
  }
  const timePart = (part: 'h' | 'm'): React.JSX.Element =>
    partEdit?.part === part ? (
      <input
        className={s.timePartInput}
        value={partEdit.draft}
        placeholder={partText(part)}
        // biome-ignore lint/a11y/noAutofocus: the surface exists to take focus the moment it opens; that IS the interaction
        autoFocus
        spellCheck={false}
        onChange={(e) => {
          const draft = e.target.value
          if (/^\d{0,2}$/.test(draft)) setPartEdit({ part, draft })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') partCommit()
          else if (e.key === 'Escape') {
            e.preventDefault()
            setPartEdit(null)
          }
        }}
        onBlur={partCommit}
      />
    ) : (
      <button
        type="button"
        className={s.timePart}
        onClick={(e) => {
          if (e.detail > 1) return
          setTimeMenu(timeMenu?.part === part ? null : { part, at: anchorOf(e.currentTarget) })
        }}
        onDoubleClick={() => {
          setTimeMenu(null)
          setPartEdit({ part, draft: '' })
        }}
      >
        {partText(part)}
      </button>
    )
  const toggleTitleMenu =
    (kind: 'month' | 'year') =>
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      setMenu(menu?.kind === kind ? null : { kind, at: anchorOf(e.currentTarget) })
    }
  const monthRows = (): React.JSX.Element[] =>
    Array.from({ length: 12 }, (_, m) => (
      <MenuItem key={monthName(m)} checked={m === cursor.getMonth()} onClick={() => jump(year, m)}>
        {monthName(m)}
      </MenuItem>
    ))
  const yearRows = (): React.JSX.Element[] =>
    Array.from({ length: 21 }, (_, i) => year - 10 + i).map((y) => (
      <MenuItem key={y} checked={y === year} onClick={() => jump(y, cursor.getMonth())}>
        {y}
      </MenuItem>
    ))
  const timeRows = (part: 'h' | 'm'): React.JSX.Element[] => {
    const current = part === 'h' ? shownHour : minutes % 60
    const choose = (v: number): void => {
      setMinutes(part === 'h' ? hourToMins(v) : minuteToMins(v))
      setTimeMenu(null)
    }
    return (part === 'h' ? (twelve ? HOURS_12 : HOURS_24) : MINUTES).map((v) => (
      <MenuItem key={v} checked={v === current} onClick={() => choose(v)}>
        {part === 'h' ? hourText(v) : pad(v)}
      </MenuItem>
    ))
  }

  const prevMonth = slide?.from ?? cursor
  const gridRows = rowsFor(cursor)
  const gridHeight = gridRows * 24 + (gridRows - 1) * 2 + 2

  return (
    <div className={s.root}>
      <div className={s.head}>
        <span className={s.titleGroup}>
          <Button
            size="button-inline"
            paddingX={TITLE_PAD_X}
            className={s.titleBtn}
            onClick={toggleTitleMenu('month')}
          >
            {monthName(cursor.getMonth())}
          </Button>
          <Button
            size="button-inline"
            paddingX={TITLE_PAD_X}
            className={s.titleBtn}
            onClick={toggleTitleMenu('year')}
          >
            {year}
          </Button>
        </span>
        <span className={s.nav}>
          <Button
            size="button-inline"
            paddingX="0"
            icon="chevron-left"
            iconSize="headline"
            className={s.navBtn}
            aria-label="Previous month"
            onClick={() => nav(-1)}
          />
          <span className={s.navSegment} aria-hidden />
          <Button
            size="button-inline"
            paddingX="0"
            icon="chevron-right"
            iconSize="headline"
            className={s.navBtn}
            aria-label="Next month"
            onClick={() => nav(1)}
          />
        </span>
      </div>
      <div className={s.headDivider} />
      <div className={s.weekRow}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={s.weekday}>
            {w}
          </span>
        ))}
      </div>
      <div className={s.viewport} style={{ height: gridHeight }} onWheel={onGridWheel}>
        <div
          className={cx(
            s.track,
            slide ? (slide.dir === 1 ? s.trackLeft : s.trackRight) : undefined,
          )}
          onAnimationEnd={settleSlide}
          onPointerDown={onGridPointerDown}
        >
          {slide ? (
            slide.dir === 1 ? (
              <>
                {grid(prevMonth)}
                {grid(cursor)}
              </>
            ) : (
              <>
                {grid(cursor)}
                {grid(prevMonth)}
              </>
            )
          ) : (
            grid(cursor)
          )}
        </div>
      </div>
      <div className={s.divider} />
      <div className={s.fields}>
        <div className={s.field}>
          <Icon name="calendar" size="body" className={s.fieldIcon} />
          <OverScroll className={s.fieldValue}>
            {day ? formatDateValue(day) : <EmptyValue />}
          </OverScroll>
        </div>
        {timeOn && (
          <div className={cx(s.field, s.fieldTime)}>
            <Icon name="clock" size="body" className={s.fieldIcon} />
            {day ? (
              <span className={s.timeParts}>
                <span className={s.hmGroup}>
                  {timePart('h')}
                  <span className={s.timeColon}>:</span>
                  {timePart('m')}
                </span>
                {twelve && (
                  <button
                    type="button"
                    className={s.timePart}
                    onClick={() => setMinutes(minutes >= 720 ? minutes - 720 : minutes + 720)}
                  >
                    {minutes >= 720 ? 'PM' : 'AM'}
                  </button>
                )}
              </span>
            ) : (
              <EmptyValue className={s.fieldValue} />
            )}
          </div>
        )}
      </div>
      <div className={rowBox}>
        <span className={s.switchLabel}>Use Time</span>
        <DualSwitch
          checked={timeOn}
          ariaLabel="Use Time"
          onChange={(v) => {
            setTimeOn(v)
            setPartEdit(null)
          }}
        />
      </div>
      <PickerMenu
        solid
        open={menu !== null}
        onDismiss={() => setMenu(null)}
        triggerRef={menuTrigger}
        anchorX={menu?.at.x}
        anchorY={menu?.at.y}
        anchorHeight={menu?.at.h}
      >
        <MenuScrollFrame maxHeight={DROPDOWN_MAX_HEIGHT}>
          {menu && (
            <div className={s.menuList}>{menu.kind === 'month' ? monthRows() : yearRows()}</div>
          )}
        </MenuScrollFrame>
      </PickerMenu>
      <PickerMenu
        solid
        direction="up"
        open={timeMenu !== null}
        onDismiss={() => setTimeMenu(null)}
        triggerRef={timeMenuTrigger}
        anchorX={timeMenu?.at.x}
        anchorY={timeMenu?.at.y}
        anchorHeight={timeMenu?.at.h}
      >
        <MenuScrollFrame maxHeight={DROPDOWN_MAX_HEIGHT}>
          {timeMenu && <div className={s.menuList}>{timeRows(timeMenu.part)}</div>}
        </MenuScrollFrame>
      </PickerMenu>
    </div>
  )
}
