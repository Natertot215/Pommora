import { useState } from 'react'
import {
  bare,
  field,
  hairlineField,
  input,
  InputField,
  PathField,
  SearchField,
} from '@renderer/design-system/fields'
import { FileLabel } from '@renderer/design-system/labels'
import { errorField, rows } from './fieldsLeaf.css'

/** The field family: the three chrome axes, the ring presets, and the caret + labels composition. */
export function FieldsLeaf(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [path, setPath] = useState('Projects/Pommora')
  const [draft, setDraft] = useState('')
  return (
    <section className="ds-section">
      <h2>Fields</h2>
      <div className={rows}>
        <div className={field}>Boxed — the quaternary fill on the ring channel</div>
        <div className={hairlineField} style={{ width: 'fit-content' }}>
          Hairline — its own width, the separator stroke
        </div>
        <input className={input} defaultValue="Input — the boxed chrome on a caret" />
        <input className={bare} defaultValue="Bare — the caret in the text it replaced" />
        <div className={errorField}>ErrorRing — the channel at the error tint</div>
        <SearchField value={search} onValueChange={setSearch} />
        <PathField
          label="Path"
          value={path}
          placeholder="No folder"
          onCommit={setPath}
          onBrowse={() => {}}
        />
        <InputField capped>
          <FileLabel name="Drafts" />
          <FileLabel name="Archive/Old" />
          <input
            className={bare}
            value={draft}
            placeholder="Type to add…"
            onChange={(e) => setDraft(e.target.value)}
          />
        </InputField>
      </div>
    </section>
  )
}
