import { Button, type ButtonType, Segmented } from '../../Components/Controls/Button'
import type { ButtonSize } from '../../Tokens'

const TYPES: ButtonType[] = ['base', 'filled', 'tinted', 'solid', 'destructive']
const SIZES: ButtonSize[] = ['button-small', 'button-medium', 'button-large']
const RUNS = [2, 3, 4, 5, 6]

const symbols = (n: number) => Array.from({ length: n }, () => ({ icon: 'square-dashed' }))
const labels = (n: number) => Array.from({ length: n }, () => ({ label: 'Label' }))

function Row({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="ds-chip-row">
      <span className="ds-chip-rowlabel">{title}</span>
      <div className="ds-chip-row-items">{children}</div>
    </div>
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
        {TYPES.map((type) => (
          <Row key={type} title={type}>
            {RUNS.map((n) => (
              <Segmented key={n} type={type} size="button-small" segments={labels(n)} />
            ))}
          </Row>
        ))}
      </section>
      {SIZES.map((size) => (
        <section key={size} className="ds-section">
          <h2>Segmented · Symbol · {size.replace('button-', '')}</h2>
          {TYPES.map((type) => (
            <Row key={type} title={type}>
              {RUNS.map((n) => (
                <Segmented key={n} type={type} size={size} segments={symbols(n)} />
              ))}
            </Row>
          ))}
          <Row title="glass">
            <Segmented glass size={size} segments={symbols(3)} />
          </Row>
        </section>
      ))}
    </div>
  )
}
