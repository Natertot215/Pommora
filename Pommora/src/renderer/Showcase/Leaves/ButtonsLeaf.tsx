import { Button, type ButtonType, type Segment, Segmented } from '@renderer/DesignSystem/Buttons'
import type { ButtonSize } from '@renderer/DesignSystem/Tokens'

const TYPES: ButtonType[] = ['base', 'filled', 'tinted', 'solid', 'destructive']
const SIZES: ButtonSize[] = ['button-small', 'button-medium', 'button-large']
const RUNS = [2, 3, 4, 5, 6]

const SYMBOL: Segment = { icon: 'square-dashed' }
const LABEL: Segment = { label: 'Label' }
const run = (n: number, seg: Segment): Segment[] => Array.from({ length: n }, () => seg)

function Row({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="ds-chip-row">
      <span className="ds-chip-rowlabel">{title}</span>
      <div className="ds-chip-row-items">{children}</div>
    </div>
  )
}

function SegmentedRows({ size, seg }: { size: ButtonSize; seg: Segment }): React.JSX.Element {
  return (
    <>
      {TYPES.map((type) => (
        <Row key={type} title={type}>
          {RUNS.map((n) => (
            <Segmented key={n} type={type} size={size} segments={run(n, seg)} />
          ))}
        </Row>
      ))}
    </>
  )
}

export function ButtonsLeaf(): React.JSX.Element {
  return (
    <div className="ds-leaf">
      <section className="ds-section">
        <h2>Button</h2>
        {TYPES.map((type) => (
          <Row key={type} title={type}>
            <Button type={type} label="Label" />
            <Button type={type} label="Label" outline />
            <Button type={type} icon="square-dashed" label="Label" />
            <Button type={type} label="Label" disabled />
          </Row>
        ))}
      </section>
      <section className="ds-section">
        <h2>Symbol</h2>
        {SIZES.map((size) => (
          <Row key={size} title={size}>
            {TYPES.map((type) => (
              <Button key={type} type={type} size={size} icon="square-dashed" />
            ))}
            <Button type="base" size={size} icon="square-dashed" outline />
          </Row>
        ))}
      </section>
      <section className="ds-section">
        <h2>Segmented · Button</h2>
        <SegmentedRows size="button-small" seg={LABEL} />
      </section>
      {SIZES.map((size) => (
        <section key={size} className="ds-section">
          <h2>Segmented · Symbol · {size.replace('button-', '')}</h2>
          <SegmentedRows size={size} seg={SYMBOL} />
          <Row title="glass">
            <Segmented glass size={size} segments={run(3, SYMBOL)} />
          </Row>
        </section>
      ))}
    </div>
  )
}
