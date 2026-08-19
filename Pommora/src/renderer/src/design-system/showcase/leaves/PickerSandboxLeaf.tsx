import { useEffect, useRef, useState } from 'react'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import { vars } from '@renderer/design-system/tokens/color.css'
import { cellColor, cellRing, cellTint } from '@renderer/design-system/tokens/ramp'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { formatColor } from './helpers'

// ─── Sandbox: the 8×8 grid picker, rendered from the real ramp tokens. Each row is one
// family running dark → light; the spectrum solids sit as exact anchor cells. ───

const BLACK = vars.color.system.black
const HAIRLINE = vars.color.separator.border

const chipBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 20,
  padding: '0 6px',
  border: '2px solid',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 12,
  whiteSpace: 'nowrap',
}

function HexReadout({ color }: { color: string }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  const [hex, setHex] = useState('')
  useEffect(() => {
    if (ref.current) setHex(formatColor(getComputedStyle(ref.current).backgroundColor))
  }, [])
  return (
    <span>
      <span ref={ref} key={color} style={{ display: 'none', background: color }} />
      {hex}
    </span>
  )
}

export function PickerSandboxLeaf(): React.JSX.Element {
  const [open, setOpen] = useState(true)
  const [cell, setCell] = useState<CellKey | undefined>('blue-5')

  const picked = cell ? cellColor(cell) : undefined

  return (
    <div className="ds-leaf">
      <section className="ds-section">
        <h2>Picker Sandbox</h2>
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="ds-popup">
            <button
              type="button"
              className={`ds-switcher-btn${open ? ' is-active' : ''}`}
              onClick={() => setOpen((o) => !o)}
            >
              Color grid
            </button>
            {open ? (
              <div className="ds-popup-panel">
                <PickerMenu solid>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 4 }}>
                    {RAMP_FAMILIES.map((family) => (
                      <div key={family} style={{ display: 'flex', gap: 3 }}>
                        {RAMP_STEPS.map((step) => {
                          const key = `${family}-${step}` as CellKey
                          const selected = cell === key
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-label={`${family} ${step + 1}`}
                              onClick={() => setCell(selected ? undefined : key)}
                              style={{
                                width: 18,
                                height: 18,
                                padding: 0,
                                borderRadius: 4,
                                cursor: 'default',
                                background: cellColor(key),
                                border: 'none',
                                // Hairline keeps dark cells legible on the pane; the
                                // selected ring gets a dark seam so it reads on white too.
                                boxShadow: selected
                                  ? `0 0 0 1px color-mix(in srgb, ${BLACK} 60%, transparent)`
                                  : `inset 0 0 0 1px ${HAIRLINE}`,
                                outline: selected ? `2px solid ${cellRing(key)}` : 'none',
                                outlineOffset: 1,
                              }}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </PickerMenu>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 260 }}>
            {cell && picked ? (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ ...chipBase, ...cellTint(cell) }}>Chip preview</span>
                  <span style={{ ...chipBase, ...cellTint(cell), borderRadius: 6 }}>Label</span>
                </div>
                <div style={{ background: '#202022', borderRadius: 10, padding: 12 }}>
                  <span style={{ ...chipBase, ...cellTint(cell) }}>On surface</span>
                </div>
                <code style={{ fontSize: 11, opacity: 0.65 }}>
                  {cell} · <HexReadout key={picked} color={picked} />
                </code>
              </>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.5 }}>
                cleared — click-again toggled the selection off
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
