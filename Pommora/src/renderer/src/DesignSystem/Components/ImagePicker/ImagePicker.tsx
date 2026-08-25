import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Crop } from '@shared/schemas'
import { clampZoom, DEFAULT_CROP, MAX_ZOOM, MIN_ZOOM, panDelta } from '@shared/cropGeometry'
import { resolveAssetUrl, resolveAssetValue } from '@renderer/assetUrl'
import { useSession } from '@renderer/store'
import { AssetImage, cropFor } from '../AssetImage/AssetImage'
import { useImageAspect } from '../AssetImage/imageAspect'
import { Button } from '../Controls/Button'
import { Slider } from '../Controls/Slider/Slider'
import { AccessoryButton } from '../Menu/Menu'
import { InputField } from '../Fields'
import { NavTrail, pathSegments } from '../../Elements/NavTrail'
import { Icon } from '../../Symbols'
import { GlassWindow } from '../../Materials'
import { usePointerGesture } from '../../Interactions/gesture'
import * as s from './imagePicker.css'

const FRAME_W = 280 // KNOB
const CIRCLE = 220 // KNOB — the circle keeps its prior 220-in-280 geometry (the 08-25 ruling)
const RECT_RADIUS = 12 // KNOB
const SCROLL_RATE = 0.0015 // KNOB
const PINCH_RATE = 0.01 // KNOB

const CENTERED: React.CSSProperties = {
  width: CIRCLE,
  height: CIRCLE,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
}

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
  /** Re-pick or paste a new image from inside the editor — the seat adopts the abs path and
   *  answers whether it landed (so the picker can hold Save until the new `value` arrives). */
  onRepick?: (source: string) => boolean | Promise<boolean>
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
  const draftRef = useRef(draft)
  draftRef.current = draft
  const aspectRef = useRef(aspect)
  aspectRef.current = aspect
  const frameRef = useRef<HTMLDivElement>(null)
  const colorInput = useRef<HTMLInputElement>(null)
  const gesture = usePointerGesture()

  // Reset the draft from the stored crop when the editor opens or its image changes (a re-pick
  // swaps `value` while open, before main's confirming push lands the new reference). Deliberately
  // keyed on open/value only, not on every map/crops push.
  useEffect(() => {
    if (open) setDraft(cropFor(value, map, crops) ?? DEFAULT_CROP)
  }, [open, value])

  // Hold Save only while the adopt is in flight — a dedup adopt returns the same value, so waiting
  // on a value change would strand the hold when the re-picked image is the one already set.
  const settleRepick = useCallback(
    (source: string): void => {
      if (!onRepick) return
      setRepicking(true)
      void Promise.resolve(onRepick(source)).then(() => setRepicking(false))
    },
    [onRepick],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
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
    const onPaste = (): void => {
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
  const frameH = isCircle ? FRAME_W : Math.round(FRAME_W * boxAspect)
  const resolved = resolveAssetValue(value, map)
  const echoPath = resolved.kind === 'asset' ? resolved.rel : value

  const startPan = (e: React.PointerEvent): void => {
    const el = frameRef.current
    if (!el || failed) return
    const boxW = el.getBoundingClientRect().width
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
          panDelta(
            anchor,
            draftRef.current.zoom,
            aspectRef.current ?? 0,
            boxAspect,
            boxW,
            ev.clientX - sx,
            ev.clientY - sy,
          ),
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
    try {
      colorInput.current?.showPicker()
    } catch {
      /* off-DOM or outside a gesture */
    }
  }

  const viewportClass = dragging ? `${s.viewport} ${s.grabbing}` : s.viewport
  const setZoom = (z: number): void => setDraft((d) => ({ ...d, zoom: clampZoom(z) }))

  const preview = <AssetImage value={value} preview={draft} />
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
    <div className={s.backdrop} onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <GlassWindow className={s.panel}>
        {isCircle ? (
          <div
            className={viewportClass}
            style={{ width: FRAME_W, height: FRAME_W }}
            onPointerDown={startPan}
          >
            <div className={s.surround}>{preview}</div>
            <div ref={frameRef} className={s.circleFrame} style={CENTERED}>
              {preview}
            </div>
            <div className={s.ring} style={{ ...CENTERED, borderRadius: '50%' }} />
            {glyphs}
          </div>
        ) : (
          <div
            ref={frameRef}
            className={viewportClass}
            style={{ width: FRAME_W, height: frameH, borderRadius: RECT_RADIUS }}
            onPointerDown={startPan}
          >
            {preview}
            <div className={s.ring} style={{ inset: 0, borderRadius: RECT_RADIUS }} />
            {glyphs}
          </div>
        )}
        <input
          ref={colorInput}
          className={s.colorInput}
          type="color"
          value={draft.color ?? '#000000'}
          onInput={(e) => setDraft((d) => ({ ...d, color: (e.target as HTMLInputElement).value }))}
        />
        {failed ? (
          <span className={s.message}>Couldn’t load that image.</span>
        ) : (
          <Slider
            value={draft.zoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            ariaLabel="Zoom"
            onInput={setZoom}
            onCommit={setZoom}
            format={(v) => `${v.toFixed(2)}×`}
          />
        )}
        <div className={s.actions}>
          <Button type="filled" label="Cancel" onClick={onCancel} disabled={busy} />
          <InputField
            chrome="bordered"
            capped
            className={s.pathField}
            label="Image"
            leading={<Icon name="image" size="body" />}
            trailing={
              onRepick ? (
                <Button
                  type="base"
                  size="button-inline"
                  icon="folder-open"
                  aria-label="Choose Image"
                  onClick={(e) => {
                    e.stopPropagation()
                    repick()
                  }}
                />
              ) : undefined
            }
          >
            <NavTrail segments={pathSegments(echoPath)} />
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
