import { EmptyValue } from '@renderer/DesignSystem/Elements/EmptyValue/EmptyValue'
import { useEffect, useRef, useState } from 'react'
import { Reveal } from '@renderer/Animation/Reveal'
import { Button } from '@renderer/DesignSystem/Buttons'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { DualSwitch } from '@renderer/DesignSystem/Controls/Switches/DualSwitch'
import { OverScroll } from '@renderer/Interactions/OverScroll'
import { clamp } from '@shared/clamp'
import { PickerMenu, PickerRow } from '../picker-base'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { pad } from '@renderer/DesignSystem/Util/pad'
import { rowBox } from '@renderer/DesignSystem/Menus/menu-base.css'
import * as s from './calendar-picker.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1)
const HOURS_24 = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** KNOB — the dropdown list's ceiling. */
const DROPDOWN_MAX_HEIGHT = 136

/** KNOB — the Month/Year buttons' own inset. The size token's label padding is a pill's; here the two
 *  read as one title, so the pair sits a word-space apart rather than two pills apart. */
const TITLE_PAD_X = '2px'

type Anchor = { x: number; y: number; h: number }
const anchorOf = (el: HTMLElement): Anchor => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top, h: r.height }
}

// Local YYYY-MM-DD key (never toISOString — a UTC key shifts the day west of Greenwich; the
// formatters parse date-only strings as LOCAL midnight, so the key must be minted locally too).
const keyOf = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const dataKey = (el: Element | null | undefined): string | null =>
  el?.closest('[data-k]')?.getAttribute('data-k') ?? null

const monthName = (m: number): string =>
  new Date(2026, m, 1).toLocaleDateString('en-US', { month: 'long' })

const optionRow = (label: string | number): React.JSX.Element => (
  <span className={s.optionRow}>{label}</span>
)

export function CalendarPicker({
  formatDateValue,
  timeFormat = 'twelveHour',
  value = null,
  onChange,
  range = true,
}: {
  formatDateValue: (isoDate: string, condensed?: { withYear: boolean }) => string
  timeFormat?: 'twelveHour' | 'twentyFourHour'
  value?: string | null
  onChange?: (iso: string | null) => void
  range?: boolean
}): React.JSX.Element {
  const twelve = timeFormat === 'twelveHour'
  const now = new Date()
  const todayKey = keyOf(now)
  const init = value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value : null
  const initHasTime = init?.includes('T') ?? false

  const [cursor, setCursor] = useState(() => {
    const seed = init ? new Date(`${init.slice(0, 10)}T00:00:00`) : now
    return new Date(seed.getFullYear(), seed.getMonth(), 1)
  })
  const [slide, setSlide] = useState<{ dir: 1 | -1; from: Date } | null>(null)
  const [start, setStart] = useState<string | null>(init ? init.slice(0, 10) : null)
  const [end, setEnd] = useState<string | null>(null)
  const [endOn, setEndOn] = useState(false)
  const [timeOn, setTimeOn] = useState(initHasTime)
  const [startMin, setStartMin] = useState(
    initHasTime && init ? Number(init.slice(11, 13)) * 60 + Number(init.slice(14, 16)) : 9 * 60,
  )
  const [endMin, setEndMin] = useState(17 * 60)
  const [menu, setMenu] = useState<{ kind: 'month' | 'year'; at: Anchor } | null>(null)
  const [timeMenu, setTimeMenu] = useState<{
    which: 'start' | 'end'
    part: 'h' | 'm'
    at: Anchor
  } | null>(null)
  const [segEdit, setSegEdit] = useState<{
    which: 'start' | 'end'
    part: 'h' | 'm'
    draft: string
  } | null>(null)

  const drag = useRef<{ which: 'start' | 'end'; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const swipe = useRef(0)
  const swipeCooldown = useRef(false)
  const swipeIdle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const emitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingEmit = useRef<string | null | undefined>(undefined)
  const initial = useRef({ start, timeOn, startMin })
  const armed = useRef(false)

  const year = cursor.getFullYear()

  useEffect(() => {
    if (!onChangeRef.current) return
    if (
      !armed.current &&
      start === initial.current.start &&
      timeOn === initial.current.timeOn &&
      startMin === initial.current.startMin
    ) {
      return
    }
    armed.current = true
    const iso = start
      ? timeOn
        ? `${start}T${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}:00`
        : start
      : null
    pendingEmit.current = iso
    clearTimeout(emitTimer.current)
    emitTimer.current = setTimeout(() => {
      pendingEmit.current = undefined
      onChangeRef.current?.(iso)
    }, 150)
  }, [start, timeOn, startMin])
  useEffect(
    () => () => {
      if (pendingEmit.current !== undefined) {
        clearTimeout(emitTimer.current)
        onChangeRef.current?.(pendingEmit.current)
      }
    },
    [],
  )

  const closeMenus = (): void => {
    setMenu(null)
    setTimeMenu(null)
  }
  const minsOf = (which: 'start' | 'end'): number => (which === 'start' ? startMin : endMin)
  const setMinsFor = (which: 'start' | 'end'): typeof setStartMin =>
    which === 'start' ? setStartMin : setEndMin

  const nav = (dir: 1 | -1): void => {
    if (slide) return
    closeMenus()
    setSlide({ dir, from: cursor })
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
  }
  const jump = (y: number, m: number): void => {
    setCursor(new Date(y, m, 1))
    setMenu(null)
  }

  const pick = (k: string): void => {
    if (k === start) {
      setStart(end)
      setEnd(null)
    } else if (k === end) {
      setEnd(null)
    } else if (!start) {
      setStart(k)
    } else if (endOn && !end) {
      if (k < start) {
        setEnd(start)
        setStart(k)
      } else setEnd(k)
    } else {
      setStart(k)
      setEnd(null)
    }
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

  const onGridPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    suppressClick.current = false
    const k = dataKey(e.target as Element)
    if (!k) return
    if (k === start) drag.current = { which: 'start', moved: false }
    else if (k === end) drag.current = { which: 'end', moved: false }
    if (drag.current) e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onGridPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current
    if (!d) return
    const k = dataKey(document.elementFromPoint(e.clientX, e.clientY))
    if (!k || k === (d.which === 'start' ? start : end)) return
    if (k === (d.which === 'start' ? end : start)) return
    d.moved = true
    if (d.which === 'start') {
      if (end !== null && k > end) {
        setStart(end)
        setEnd(k)
        d.which = 'end'
      } else setStart(k)
    } else if (start !== null && k < start) {
      setEnd(start)
      setStart(k)
      d.which = 'start'
    } else setEnd(k)
  }
  const onGridPointerUp = (): void => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.moved) {
      suppressClick.current = true
      return
    }
    const k = d.which === 'start' ? start : end
    if (k) {
      suppressClick.current = true
      pick(k)
    }
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
    const ranged = start !== null && end !== null
    return (
      <div className={s.days} key={keyOf(month)}>
        {Array.from({ length: cellCount }, (_, i) => {
          const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)
          const k = keyOf(d)
          const sel = k === start || k === end
          const mid = ranged && k > start && k < end
          const col = i % 7
          return (
            <button
              type="button"
              key={k}
              data-k={k}
              className={cx(s.day, d.getMonth() !== m && s.dayOut, sel && s.daySelected)}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false
                  return
                }
                pick(k)
              }}
            >
              {sel && ranged && (
                <span className={cx(s.pill, k === start ? s.bandUnderStart : s.bandUnderEnd)} />
              )}
              <span
                className={cx(
                  s.pill,
                  k === todayKey && !sel && !mid && s.pillToday,
                  sel && s.pillSelected,
                  mid && s.pillMid,
                  mid && col === 0 && s.pillRowFirst,
                  mid && col === 6 && s.pillRowLast,
                )}
              />
              {d.getDate()}
            </button>
          )
        })}
      </div>
    )
  }

  const hourShown = (mins: number): number =>
    twelve ? ((Math.floor(mins / 60) + 11) % 12) + 1 : Math.floor(mins / 60)
  const hourToMins = (v: number, mins: number): number =>
    (twelve ? (v % 12) + (mins >= 720 ? 12 : 0) : v) * 60 + (mins % 60)
  const minuteToMins = (v: number, mins: number): number => Math.floor(mins / 60) * 60 + v
  const hourText = (v: number): string => (twelve ? String(v) : pad(v))
  const segText = (part: 'h' | 'm', mins: number): string =>
    part === 'h' ? hourText(hourShown(mins)) : pad(mins % 60)

  const dateField = (
    k: string | null,
    label: string,
    condensed?: { withYear: boolean },
  ): React.JSX.Element => (
    <div className={s.field} key={label}>
      <Icon name="calendar" size="body" className={s.fieldIcon} />
      <OverScroll className={s.fieldValue}>
        {k ? formatDateValue(k, condensed) : <EmptyValue />}
      </OverScroll>
    </div>
  )

  const segCommit = (): void => {
    if (!segEdit) return
    const v = Number(segEdit.draft)
    if (segEdit.draft !== '' && Number.isFinite(v)) {
      const mins = minsOf(segEdit.which)
      const setMins = setMinsFor(segEdit.which)
      if (segEdit.part === 'h') {
        const clamped = twelve ? clamp(v, 1, 12) : Math.min(v, 23)
        setMins(hourToMins(clamped, mins))
      } else setMins(minuteToMins(Math.min(v, 59), mins))
    }
    setSegEdit(null)
  }
  const timeSegment = (which: 'start' | 'end', part: 'h' | 'm', mins: number): React.JSX.Element =>
    segEdit?.which === which && segEdit.part === part ? (
      <input
        key={`${which}-${part}-edit`}
        className={s.timeSegInput}
        value={segEdit.draft}
        placeholder={segText(part, mins)}
        // biome-ignore lint/a11y/noAutofocus: the surface exists to take focus the moment it opens; that IS the interaction
        autoFocus
        spellCheck={false}
        onChange={(e) => {
          const draft = e.target.value
          if (/^\d{0,2}$/.test(draft)) setSegEdit({ which, part, draft })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') segCommit()
          else if (e.key === 'Escape') {
            e.preventDefault()
            setSegEdit(null)
          }
        }}
        onBlur={segCommit}
      />
    ) : (
      <button
        type="button"
        key={`${which}-${part}`}
        className={s.timeSeg}
        onClick={(e) => {
          if (e.detail > 1) return
          setMenu(null)
          setTimeMenu(
            timeMenu?.which === which && timeMenu.part === part
              ? null
              : { which, part, at: anchorOf(e.currentTarget) },
          )
        }}
        onDoubleClick={() => {
          setTimeMenu(null)
          setSegEdit({ which, part, draft: '' })
        }}
      >
        {segText(part, mins)}
      </button>
    )
  const ampmSegment = (which: 'start' | 'end', mins: number): React.JSX.Element => {
    const setMins = setMinsFor(which)
    return (
      <button
        type="button"
        className={s.timeSeg}
        onClick={() => setMins(mins >= 720 ? mins - 720 : mins + 720)}
      >
        {mins >= 720 ? 'PM' : 'AM'}
      </button>
    )
  }
  const timeField = (
    mins: number | null,
    label: string,
    which: 'start' | 'end',
  ): React.JSX.Element => (
    <div className={cx(s.field, s.fieldTime)} key={label}>
      <Icon name="clock" size="body" className={s.fieldIcon} />
      {mins !== null ? (
        <span className={s.timeSegs}>
          <span className={s.hmGroup}>
            {timeSegment(which, 'h', mins)}
            <span className={s.timeColon}>:</span>
            {timeSegment(which, 'm', mins)}
          </span>
          {twelve && ampmSegment(which, mins)}
        </span>
      ) : (
        <EmptyValue className={s.fieldValue} />
      )}
    </div>
  )

  const toggleTitleMenu =
    (kind: 'month' | 'year') =>
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      setTimeMenu(null)
      setMenu(menu?.kind === kind ? null : { kind, at: anchorOf(e.currentTarget) })
    }
  const monthRows = (): React.JSX.Element[] =>
    Array.from({ length: 12 }, (_, m) => (
      <PickerRow
        key={monthName(m)}
        selected={m === cursor.getMonth()}
        onClick={() => jump(year, m)}
      >
        {optionRow(monthName(m))}
      </PickerRow>
    ))
  const yearRows = (): React.JSX.Element[] =>
    Array.from({ length: 21 }, (_, i) => year - 10 + i).map((y) => (
      <PickerRow key={y} selected={y === year} onClick={() => jump(y, cursor.getMonth())}>
        {optionRow(y)}
      </PickerRow>
    ))
  const timeRows = (which: 'start' | 'end', part: 'h' | 'm'): React.JSX.Element[] => {
    const mins = minsOf(which)
    const setMins = setMinsFor(which)
    const current = part === 'h' ? hourShown(mins) : mins % 60
    const choose = (v: number): void => {
      setMins(part === 'h' ? hourToMins(v, mins) : minuteToMins(v, mins))
      setTimeMenu(null)
    }
    return (part === 'h' ? (twelve ? HOURS_12 : HOURS_24) : MINUTES).map((v) => (
      <PickerRow key={v} selected={v === current} onClick={() => choose(v)}>
        {optionRow(part === 'h' ? hourText(v) : pad(v))}
      </PickerRow>
    ))
  }

  const prevMonth = slide?.from ?? cursor
  const gridRows = rowsFor(cursor)
  const gridHeight = gridRows * 24 + (gridRows - 1) * 2 + 2
  const condensed = {
    withYear: start !== null && end !== null && start.slice(0, 4) !== end.slice(0, 4),
  }

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
          onAnimationEnd={() => setSlide(null)}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={onGridPointerUp}
          onPointerCancel={onGridPointerUp}
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
        {endOn ? (
          <div className={s.fieldRow}>
            {dateField(start, 'start', condensed)}
            {dateField(end, 'end', condensed)}
          </div>
        ) : (
          <div className={s.fieldRow}>
            {dateField(start, 'date')}
            {timeOn && timeField(start ? startMin : null, 'time', 'start')}
          </div>
        )}
        <Reveal open={endOn && timeOn} fill>
          <div className={cx(s.fieldRow, s.fieldRowStacked)}>
            {timeField(start ? startMin : null, 'start-t', 'start')}
            {timeField(end ? endMin : null, 'end-t', 'end')}
          </div>
        </Reveal>
      </div>
      {range && (
        <div className={rowBox}>
          <span className={s.switchLabel}>End Date</span>
          <DualSwitch
            checked={endOn}
            ariaLabel="End Date"
            onChange={(v) => {
              setEndOn(v)
              if (!v) setEnd(null)
              setSegEdit(null)
              closeMenus()
            }}
          />
        </div>
      )}
      <div className={rowBox}>
        <span className={s.switchLabel}>Use Time</span>
        <DualSwitch
          checked={timeOn}
          ariaLabel="Use Time"
          onChange={(v) => {
            setTimeOn(v)
            setSegEdit(null)
            closeMenus()
          }}
        />
      </div>
      <PickerMenu
        solid
        open={menu !== null}
        onDismiss={() => setMenu(null)}
        anchorX={menu?.at.x}
        anchorY={menu?.at.y}
        anchorHeight={menu?.at.h}
        maxHeight={DROPDOWN_MAX_HEIGHT}
      >
        {menu && (
          <div className={s.menuList}>{menu.kind === 'month' ? monthRows() : yearRows()}</div>
        )}
      </PickerMenu>
      <PickerMenu
        solid
        direction="up"
        open={timeMenu !== null}
        onDismiss={() => setTimeMenu(null)}
        anchorX={timeMenu?.at.x}
        anchorY={timeMenu?.at.y}
        anchorHeight={timeMenu?.at.h}
        maxHeight={DROPDOWN_MAX_HEIGHT}
      >
        {timeMenu && <div className={s.menuList}>{timeRows(timeMenu.which, timeMenu.part)}</div>}
      </PickerMenu>
    </div>
  )
}
