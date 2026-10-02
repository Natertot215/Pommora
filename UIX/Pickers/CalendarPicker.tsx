import { EmptyValue } from '../Elements/EmptyValue'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Reveal } from '../Animations/Reveal'
import { useSettleFallback } from '../Animations/useExitPresence'
import { Button } from '../Buttons/Button'
import { Icon } from '../Symbols'
import { DualSwitch } from '../Controls/DualSwitch'
import { usePointerGesture } from '../Interactions/gesture'
import { OverScroll } from '../Interactions/OverScroll'
import { PickerMenu } from './PickerMenu'
import { optionRing } from './picker-base.css'
import { MenuItem } from '../Menus/MenuRows'
import { cx } from '../Utilities/cx'
import { localDayKey, pad } from '../Utilities/pad'
import { rowBox } from '../Menus/menu-row.css'
import { MenuScrollFrame } from '../Menus/MenuRows'
import * as s from './calendar-picker.css'
import { clamp } from '../Utilities/clamp'
import { useLatest } from '../Utilities/stableApi'
import { EditableInput } from '../Fields/EditableInput'
import { numberFrom } from './numberUnit'

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

const minutesOf = (d: Date): number => d.getHours() * 60 + d.getMinutes()

/** KNOB — the clock Use Time opens on. */
const DEFAULT_START_MINUTES = 9 * 60
const hourAfter = (minutes: number): number => Math.min(minutes + 60, 23 * 60 + 55)

export function CalendarPicker({
  formatDateValue,
  timeFormat,
  value = null,
  onChange,
  span = false,
}: {
  formatDateValue: (isoDate: string) => string
  timeFormat: 'twelveHour' | 'twentyFourHour'
  value?: { at: Date; timed: boolean; end?: Date } | null
  onChange?: (iso: string | null) => void
  /** Offers the End Date switch, and saves a picked span as an ISO interval `start/end`. */
  span?: boolean
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
  const [end, setEnd] = useState<string | null>(span && value?.end ? localDayKey(value.end) : null)
  const [endOn, setEndOn] = useState(end !== null)
  const [timeOn, setTimeOn] = useState(value?.timed ?? false)
  const [minutes, setMinutes] = useState(value?.timed ? minutesOf(value.at) : DEFAULT_START_MINUTES)
  const [endMinutes, setEndMinutes] = useState(
    value?.timed && value.end ? minutesOf(value.end) : hourAfter(minutes),
  )
  const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)

  const begin = usePointerGesture()
  const swipe = useRef(0)
  const swipeCooldown = useRef(false)
  const swipeIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onChangeRef = useLatest(onChange)
  const emitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingEmit = useRef<string | null | undefined>(undefined)
  const point = (k: string, mins: number): string =>
    timeOn ? `${k}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00` : k
  // A day's span with no clock is just that day, and its end never runs before its start.
  const spanned = end !== null && (end !== day || timeOn)
  const endClock = end === day ? Math.max(endMinutes, minutes) : endMinutes
  const iso = day
    ? spanned
      ? `${point(day, minutes)}/${point(end, endClock)}`
      : point(day, minutes)
    : null
  const initial = useRef(iso)
  const armed = useRef(false)

  const year = cursor.getFullYear()

  useEffect(() => {
    if (!onChangeRef.current) return
    if (!armed.current && iso === initial.current) return
    armed.current = true
    pendingEmit.current = iso
    clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(() => {
      pendingEmit.current = undefined
      onChangeRef.current?.(iso)
    }, 150)
  }, [iso])
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

  const nav = (dir: 1 | -1): void => {
    if (slide) return
    setSlide({ dir, from: cursor })
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
  }
  const jump = (y: number, m: number): void => {
    setCursor(new Date(y, m, 1))
    setMenu(null)
  }

  // With End Date on, a pick outside the span stretches the end on its side, one inside pulls in the nearer end, an endpoint pick folds the span onto that day, and the folded day's own pick clears it.
  const pick = (k: string): void => {
    if (!endOn) setDay(k === day ? null : k)
    else if (k === day && k === end) {
      setDay(null)
      setEnd(null)
    } else if (!day || !end || k === day || k === end) {
      setDay(k)
      setEnd(k)
    } else if (k < day) setDay(k)
    else if (k > end) setEnd(k)
    else if (Date.parse(k) - Date.parse(day) < Date.parse(end) - Date.parse(k)) setDay(k)
    else setEnd(k)
  }

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
    if (!k || (k !== day && k !== end)) return
    const from = { day, end, minutes, endMinutes }
    const fixed = k === day ? end : day
    const [dragged, held] = k === day ? [minutes, endClock] : [endClock, minutes]
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
        if (fixed === null) {
          setDay(at)
          return
        }
        const ahead = at < fixed
        setDay(ahead ? at : fixed)
        setEnd(ahead ? fixed : at)
        setMinutes(ahead ? dragged : held)
        setEndMinutes(ahead ? held : dragged)
      },
      // The engine swallows the click after an activated release, so a wobble still has to pick here.
      onDrop: () => {
        if (!moved) pick(k)
      },
      onAbort: () => {
        setDay(from.day)
        setEnd(from.end)
        setMinutes(from.minutes)
        setEndMinutes(from.endMinutes)
      },
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
          const sel = k === day || k === end
          const col = i % 7
          const banded = day !== null && end !== null && day !== end && k >= day && k <= end
          return (
            <button
              type="button"
              key={k}
              data-k={k}
              className={cx(s.day, d.getMonth() !== m && s.dayOut, sel && s.daySelected)}
              onClick={() => pick(k)}
            >
              {banded && (
                <span
                  className={cx(
                    s.band,
                    k === day && s.bandFromCenter,
                    k === end && s.bandToCenter,
                    col === 0 && k !== day && s.bandHead,
                    col === 6 && k !== end && s.bandTail,
                  )}
                />
              )}
              <span
                className={cx(s.pill, k === todayKey && !sel && optionRing, sel && s.pillSelected)}
              />
              {d.getDate()}
            </button>
          )
        })}
      </div>
    )
  }

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
  const dateField = (k: string | null): React.JSX.Element =>
    valueField('calendar', k && formatDateValue(k))

  const prevMonth = slide?.from ?? cursor

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
      <div
        className={s.viewport}
        style={{ '--grid-rows': rowsFor(cursor) } as CSSProperties}
        onWheel={onGridWheel}
      >
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
        <div className={s.fieldRow}>
          {dateField(day)}
          {timeOn && (
            <ClockField twelve={twelve} minutes={day ? minutes : null} onChange={setMinutes} />
          )}
        </div>
        {span && (
          <Reveal open={endOn} fill>
            <div className={cx(s.fieldRow, s.fieldRowEnd)}>
              {dateField(end)}
              {timeOn && (
                <ClockField
                  twelve={twelve}
                  minutes={end ? endClock : null}
                  onChange={setEndMinutes}
                />
              )}
            </div>
          </Reveal>
        )}
      </div>
      <div className={rowBox}>
        <span className={s.switchLabel}>Use Time</span>
        <DualSwitch checked={timeOn} ariaLabel="Use Time" onChange={setTimeOn} />
      </div>
      {span && (
        <div className={rowBox}>
          <span className={s.switchLabel}>End Date</span>
          <DualSwitch
            checked={endOn}
            ariaLabel="End Date"
            onChange={(v) => {
              setEndOn(v)
              setEnd(v ? day : null)
              if (v) setEndMinutes(hourAfter(minutes))
            }}
          />
        </div>
      )}
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
    </div>
  )
}

const valueField = (
  icon: 'calendar' | 'clock',
  value: string | null,
  className?: string,
): React.JSX.Element => (
  <div className={cx(s.field, className)}>
    <Icon name={icon} size="body" className={s.fieldIcon} />
    <OverScroll className={s.fieldValue}>{value ?? <EmptyValue />}</OverScroll>
  </div>
)

function ClockField({
  twelve,
  minutes,
  onChange,
}: {
  twelve: boolean
  minutes: number | null
  onChange: (minutes: number) => void
}): React.JSX.Element {
  const [timeMenu, setTimeMenu] = useState<{ part: 'h' | 'm'; at: Anchor } | null>(null)
  const [partEdit, setPartEdit] = useState<'h' | 'm' | null>(null)
  const timeMenuTrigger = useLatest(timeMenu?.at.el ?? null)

  if (minutes === null) return valueField('clock', null, s.fieldTime)

  const shownHour = twelve ? ((Math.floor(minutes / 60) + 11) % 12) + 1 : Math.floor(minutes / 60)
  const hourToMins = (v: number): number =>
    (twelve ? (v % 12) + (minutes >= 720 ? 12 : 0) : v) * 60 + (minutes % 60)
  const minuteToMins = (v: number): number => Math.floor(minutes / 60) * 60 + v
  const hourText = (v: number): string => (twelve ? String(v) : pad(v))
  const partText = (part: 'h' | 'm'): string =>
    part === 'h' ? hourText(shownHour) : pad(minutes % 60)

  const partCommit = (part: 'h' | 'm', text: string): void => {
    setPartEdit(null)
    const v = numberFrom(text)
    if (v === undefined || !Number.isInteger(v)) return
    if (part === 'h') onChange(hourToMins(twelve ? clamp(v, 1, 12) : clamp(v, 0, 23)))
    else onChange(minuteToMins(clamp(v, 0, 59)))
  }
  const timePart = (part: 'h' | 'm'): React.JSX.Element =>
    partEdit === part ? (
      <EditableInput
        initial=""
        placeholder={partText(part)}
        inputMode="numeric"
        maxLength={2}
        boxed
        className={s.timePartInput}
        onCommit={(text) => partCommit(part, text)}
        onCancel={() => setPartEdit(null)}
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
          setPartEdit(part)
        }}
      >
        {partText(part)}
      </button>
    )
  const timeRows = (part: 'h' | 'm'): React.JSX.Element[] => {
    const current = part === 'h' ? shownHour : minutes % 60
    const choose = (v: number): void => {
      onChange(part === 'h' ? hourToMins(v) : minuteToMins(v))
      setTimeMenu(null)
    }
    return (part === 'h' ? (twelve ? HOURS_12 : HOURS_24) : MINUTES).map((v) => (
      <MenuItem key={v} checked={v === current} onClick={() => choose(v)}>
        {part === 'h' ? hourText(v) : pad(v)}
      </MenuItem>
    ))
  }

  return (
    <div className={cx(s.field, s.fieldTime)}>
      <Icon name="clock" size="body" className={s.fieldIcon} />
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
            onClick={() => onChange(minutes >= 720 ? minutes - 720 : minutes + 720)}
          >
            {minutes >= 720 ? 'PM' : 'AM'}
          </button>
        )}
      </span>
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
