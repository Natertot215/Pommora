import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Crop } from '@shared/schemas'
import {
  clampZoom,
  coverRect,
  DEFAULT_CROP,
  dragRect,
  MAX_ZOOM,
  MIN_ZOOM,
} from '@shared/cropGeometry'
import { clamp } from '@shared/clamp'
import { HTTP_URL } from '@shared/nexusPaths'
import { resolveAssetUrl, resolveAssetValue } from '@renderer/Assets/assetUrl'
import { useSession } from '@renderer/store'
import { cropFor } from '@renderer/Assets/AssetImage'
import { useImageAspect } from '@renderer/Assets/imageAspect'
import { Button } from '@renderer/DesignSystem/Buttons'
import { Slider } from '@renderer/DesignSystem/Controls/Slider/Slider'
import { AccessoryButton } from '@renderer/DesignSystem/Menus/menu-row'
import { BrowseButton, InputField } from '@renderer/DesignSystem/Fields'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { GlassWindow } from '@renderer/DesignSystem/Glass'
import { usePointerGesture } from '@renderer/DesignSystem/Interactions/gesture'
import * as s from './image-picker.css'

const FRAME_H = 260 // KNOB — every frame's fixed height (the seat sets the width)
const MIN_W = 220 // KNOB — narrowest the frame gets (a tall seat)
const MAX_W = 460 // KNOB — widest the frame gets (a wide seat)
const MARGIN = 28 // KNOB — the dimmed room around the seat, where the overflow shows
const RECT_RADIUS = 12 // KNOB
const SCROLL_RATE = 0.0015 // KNOB
const PINCH_RATE = 0.01 // KNOB

export function ImagePicker({
  open,
  value,
  shape,
  boxAspect,
  onCancel,
  onSave,
  onRepick,
}: {
  open: boolean
  value: string
  shape: 'circle' | 'rect'
  boxAspect: number
  onCancel: () => void
  onSave: (crop: Crop) => void | Promise<void>
  /** Re-pick or paste a new image from inside the editor — the seat adopts the source and answers
   *  the value it landed on, so Save is held until the seat's `value` reaches it (a dedup, where the
   *  adopted value is the one already shown, releases at once). */
  onRepick?: (source: string) => Promise<string | undefined>
}): React.JSX.Element | null {
  const map = useSession((st) => st.assetMap)
  const crops = useSession((st) => st.tree?.crops)
  const url = resolveAssetUrl(value, map)
  const aspect = useImageAspect(url ?? undefined)

  const [draft, setDraft] = useState<Crop>(DEFAULT_CROP)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  // A re-pick adopts a new image, but `value` (the old one, now deleted) lags behind main's
  // confirming push — so Save is held until `value` actually changes, or the crop writes to the
  // deleted image and the new one lands uncropped.
  const [repicking, setRepicking] = useState(false)
  const [pendingValue, setPendingValue] = useState<string | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const aspectRef = useRef(aspect)
  aspectRef.current = aspect
  const frameRef = useRef<HTMLDivElement>(null)
  const gesture = usePointerGesture()

  // Reset the draft from the stored crop when the editor opens or its image changes (a re-pick
  // swaps `value` while open, before main's confirming push lands the new reference). Deliberately
  // keyed on open/value only, not on every map/crops push.
  useEffect(() => {
    if (open) setDraft(cropFor(value, map, crops) ?? DEFAULT_CROP)
  }, [open, value])

  // A dedup (or a failed adopt) lands on the value already shown and releases the hold at once.
  const settleRepick = useCallback(
    (source: string): void => {
      if (!onRepick) return
      setRepicking(true)
      void Promise.resolve(onRepick(source)).then((landed) => {
        if (!landed || landed === value) {
          setRepicking(false)
          setPendingValue(null)
        } else setPendingValue(landed)
      })
    },
    [onRepick, value],
  )

  // The re-picked value has landed on the seat (the draft re-seeds on it) — Save is safe again.
  useEffect(() => {
    if (pendingValue !== null && value === pendingValue) {
      setRepicking(false)
      setPendingValue(null)
    }
  }, [value, pendingValue])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  // React registers wheel passively at the root, so the zoom wheel is a native non-passive listener.
  useEffect(() => {
    const el = frameRef.current
    if (!open || !el) return
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault()
      const rate = e.ctrlKey ? PINCH_RATE : SCROLL_RATE
      setDraft((d) => ({ ...d, zoom: clampZoom(d.zoom * Math.exp(-e.deltaY * rate)) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [open])

  useEffect(() => {
    if (!open || !onRepick) return
    const onPaste = (e: ClipboardEvent): void => {
      const text = e.clipboardData?.getData('text').trim()
      if (text && HTTP_URL.test(text)) {
        settleRepick(text)
        return
      }
      void window.nexus.pasteImage().then((p) => {
        if (p) settleRepick(p)
      })
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [open, onRepick, settleRepick])

  if (!open) return null

  const failed = aspect === null
  const isCircle = shape === 'circle'
  // A seat measured before it lays out answers a degenerate aspect — square rather than divide by it.
  const seatAspect = boxAspect > 0 && Number.isFinite(boxAspect) ? boxAspect : 1
  const imgAspect = aspect && aspect > 0 ? aspect : seatAspect
  const boxH = Math.min(FRAME_H - MARGIN * 2, (MAX_W - MARGIN * 2) * seatAspect)
  const boxW = boxH / seatAspect
  const frameW = clamp(Math.round(boxW + MARGIN * 2), MIN_W, MAX_W)
  const boxLeft = (frameW - boxW) / 2
  const boxTop = (FRAME_H - boxH) / 2
  const rect = coverRect(draft, imgAspect, boxW, boxH) ?? { left: 0, top: 0, width: 0, height: 0 }
  const resolved = resolveAssetValue(value, map)
  const echoPath = resolved.kind === 'asset' ? resolved.rel : value
  const fileName = echoPath.split('/').filter(Boolean).pop() ?? echoPath
  const imgProps = { src: url ?? '', draggable: false }
  const imgSize = { width: rect.width, height: rect.height }

  const startPan = (e: React.PointerEvent): void => {
    const el = frameRef.current
    if (!el || failed) return
    const anchor = draftRef.current
    const sx = e.clientX
    const sy = e.clientY
    gesture({
      el,
      event: e,
      activation: 0,
      capture: true,
      swallowActiveEscape: true,
      onActivate: () => {
        setDragging(true)
        return true
      },
      onDragMove: (ev) =>
        setDraft(
          dragRect(anchor, aspectRef.current ?? 0, boxW, boxH, ev.clientX - sx, ev.clientY - sy),
        ),
      onDrop: () => {},
      teardown: () => setDragging(false),
    })
  }

  const save = async (): Promise<void> => {
    if (busy || failed || repicking) return
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }
  const repick = (): void => {
    if (!onRepick) return
    void window.nexus.pickFile().then((p) => {
      if (p) settleRepick(p)
    })
  }
  const pickBackground = (): void => {
    const Eye = (window as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } })
      .EyeDropper
    if (!Eye) return
    void new Eye()
      .open()
      .then((r) => setDraft((d) => ({ ...d, color: r.sRGBHex })))
      .catch(() => {})
  }

  const viewportClass = dragging ? `${s.viewport} ${s.grabbing}` : s.viewport
  const setZoom = (z: number): void => setDraft((d) => ({ ...d, zoom: clampZoom(z) }))

  const glyphs = (
    <>
      <AccessoryButton
        icon="rotate-ccw"
        size="control"
        ariaLabel="Reset"
        className={s.cornerGlyphStart}
        onClick={() => setDraft(DEFAULT_CROP)}
      />
      <AccessoryButton
        icon="pipette"
        size="control"
        ariaLabel="Background"
        className={s.cornerGlyphEnd}
        onClick={pickBackground}
      />
    </>
  )

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a modal scrim, not a control — it swallows the portal's own pointer events (which bubble the React tree into whatever opened the picker: a card's click-to-open, right-click menu, or drag handle) and dismisses on an outside click; Escape is the keyboard dismissal.
    <div
      className={s.backdrop}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <GlassWindow className={s.panel}>
        <div
          ref={frameRef}
          className={viewportClass}
          style={{ width: frameW, height: FRAME_H }}
          onPointerDown={startPan}
        >
          <img
            {...imgProps}
            alt=""
            className={s.dimImage}
            style={{ ...imgSize, left: boxLeft + rect.left, top: boxTop + rect.top }}
          />
          <div
            className={s.seatBox}
            style={{
              left: boxLeft,
              top: boxTop,
              width: boxW,
              height: boxH,
              borderRadius: isCircle ? '50%' : RECT_RADIUS,
              background: draft.color || undefined,
            }}
          >
            <img
              {...imgProps}
              alt=""
              className={s.seatImage}
              style={{ ...imgSize, left: rect.left, top: rect.top }}
            />
          </div>
          {glyphs}
        </div>
        {failed ? (
          <span className={s.message}>Couldn’t load that image.</span>
        ) : (
          <div className={s.sliderRow} style={{ width: frameW }}>
            <Slider
              value={draft.zoom}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              ariaLabel="Zoom"
              onInput={setZoom}
              onCommit={setZoom}
              format={(v) => `${v.toFixed(2)}x`}
              readoutClassName={s.zoomReadout}
            />
          </div>
        )}
        <div className={s.actions} style={{ width: frameW }}>
          <Button type="filled" label="Cancel" onClick={onCancel} disabled={busy} />
          <InputField
            chrome="bordered"
            capped
            className={s.pathField}
            label="Image"
            edit={{
              value: echoPath,
              onCommit: (next) => {
                const v = next.trim()
                if (v && v !== echoPath) settleRepick(v)
              },
              renames: 'row',
            }}
            leading={<Icon name="image" size="body" />}
            trailing={
              onRepick ? <BrowseButton label="Choose Image" onBrowse={repick} /> : undefined
            }
          >
            {fileName}
          </InputField>
          <Button
            type="tinted"
            label="Save"
            onClick={() => void save()}
            disabled={busy || aspect == null || repicking}
          />
        </div>
      </GlassWindow>
    </div>,
    document.body,
  )
}
