import { useState } from 'react'
import { InputField } from '@pommora/uix/Fields/InputField'
import { SearchField } from '@pommora/uix/Fields/SearchField'
import { base, field, borderedField, input } from '@pommora/uix/Fields/fields.css'
import { FileLabel } from '@pommora/uix/Labels/recipes'
import { Button } from '@pommora/uix/Buttons/Button'
import { NavTrail, pathSegments } from '@pommora/uix/Elements/NavTrail/NavTrail'
import { Icon } from '@pommora/uix/Symbols'
import { errorField, rows } from './fields-leaf.css'

export function FieldsLeaf(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [path, setPath] = useState('Projects/Pommora')
  const [draft, setDraft] = useState('')
  return (
    <section className="ds-section">
      <h2>Fields</h2>
      <div className={rows}>
        <div className={field}>Boxed — the quaternary fill on the ring channel</div>
        <div className={borderedField} style={{ width: 'fit-content' }}>
          Bordered — its own width, the separator stroke
        </div>
        <input className={input} defaultValue="Input — the boxed chrome on a caret" />
        <input className={base} defaultValue="Base — the caret in the text it replaced" />
        <div className={errorField}>ErrorRing — the channel at the error tint</div>
        <SearchField value={search} onValueChange={setSearch} />
        <InputField
          chrome="bordered"
          label="Path"
          edit={{ value: path, onCommit: setPath, renames: 'row', emptyCommits: true }}
          leading={<Icon name="folder-closed" size="body" />}
          trailing={
            <Button
              type="base"
              size="button-inline"
              icon="folder-open"
              aria-label="Choose Folder"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <NavTrail segments={pathSegments(path)} variant="option" />
        </InputField>
        <InputField capped>
          <FileLabel name="Drafts" />
          <FileLabel name="Archive/Old" />
          <input
            className={base}
            value={draft}
            placeholder="Type to add…"
            onChange={(e) => setDraft(e.target.value)}
          />
        </InputField>
      </div>
    </section>
  )
}
