// fixtures.mjs <nexus> — writes the reveal fixtures into a scratch copy of ~/Test: read-modify-write merges, so every other key survives.
import fs from 'node:fs'
import path from 'node:path'

const nexus = process.argv[2]
const at = (rel) => path.join(nexus, rel)
const merge = (rel, fn) => {
  const file = at(rel)
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  fn(json)
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
}
const body = (rel, text) => {
  const file = at(rel)
  const src = fs.readFileSync(file, 'utf8')
  const end = src.indexOf('\n---', 4)
  fs.writeFileSync(file, `${src.slice(0, end + 4)}\n${text}`)
}

merge('Collection B/_pagecollection.json', (c) => {
  c.disclosure_locked = true
})
merge('Collection C/_pagecollection.json', (c) => {
  c.open_in = 'page-preview'
})
for (const [n, name] of [
  [1, 'One'],
  [2, 'Two'],
])
  fs.writeFileSync(
    at(`Collection C/Window ${name}.md`),
    `---\nID: 01KYJHK6R9PWNDWA000000000${n}\n---\nWindow ${name.toLowerCase()} body.\n\nCite here[^1].\n\n[^1]: A note.\n`,
  )
merge('.nexus/interface/homepage/_tiles.json', (t) => {
  t.tiles.push(
    {
      id: 'hover-probe-view',
      type: 'view',
      active: 0,
      view_band: false,
      views: [
        {
          source_id: '01KSDZP10YXB1RRKCF5YKFTPZE',
          config: {
            id: 'embed:hover-probe-view:0',
            name: 'Peek',
            type: 'table',
            icon: 'table',
            hidden_properties: [],
            property_order: ['_title'],
            group: { kind: 'structural' },
          },
        },
      ],
    },
    { id: 'hover-probe-page', type: 'page', page_id: '01KYJHK6R9PH9HHA9DJR4AY5SH' },
    {
      id: 'hover-probe-untitled',
      type: 'view',
      active: 0,
      title: false,
      views: [
        {
          source_id: '01KSDZP10YXB1RRKCF5YKFTPZE',
          config: {
            id: 'embed:hover-probe-untitled:0',
            name: 'Untitled',
            type: 'table',
            icon: 'table',
            hidden_properties: [],
            property_order: ['_title'],
            group: { kind: 'structural' },
          },
        },
      ],
    },
  )
  t.layout.bands.push(
    { node: { h: 320, id: 'hover-probe-view', kind: 'tile' } },
    { node: { h: 240, id: 'hover-probe-page', kind: 'tile' } },
    { node: { h: 240, id: 'hover-probe-untitled', kind: 'tile' } },
  )
})
merge('.nexus/settings.json', (s) => {
  s.personalization.previewPersistence = 'always'
})
body(
  'Collection A/Set Beta/Sub-Set B/Beta 2.md',
  [
    '## Probe Heading',
    '',
    'A paragraph of prose for the grips and the reach.',
    '',
    '> A quoted line.',
    '',
    '> [!note]',
    '> A callout line.',
    '',
    '```',
    'bare fence',
    '```',
    '',
    '```js',
    'const named = 1',
    '```',
    '',
    '![[Page C]]',
    '',
    '![Example](https://example.com)',
    '',
    '| One | Two |',
    '| --- | --- |',
    '| a | b |',
    '| c | d |',
    '',
    'Cite[^1].',
    '',
    '[^1]: A note.',
    '',
  ].join('\n'),
)
