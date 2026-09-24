import type { ReactNode } from 'react'

// A deliberately small Markdown subset: paragraphs, bullet and numbered lists, pipe tables, and
// inline code, bold, italic and links. Everything renders as React elements, so source text is
// always escaped and no raw HTML reaches the page.

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; rows: string[] }

const BULLET = /^\s*[-*+]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const TABLE_ROW = /^\s*\|/
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  let open: Block | undefined
  for (const line of src.split(/\r?\n/)) {
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const item = bullet ?? numbered
    if (!line.trim()) {
      open = undefined
    } else if (item) {
      const kind = bullet ? 'ul' : 'ol'
      if (open?.kind !== kind) {
        open = { kind, items: [] }
        blocks.push(open)
      }
      open.items.push(item[1])
    } else if (TABLE_ROW.test(line)) {
      if (open?.kind !== 'table') {
        open = { kind: 'table', rows: [] }
        blocks.push(open)
      }
      open.rows.push(line)
    } else if (open?.kind === 'ul' || open?.kind === 'ol') {
      open.items[open.items.length - 1] += ` ${line.trim()}`
    } else if (open?.kind === 'p') {
      open.lines.push(line.trim())
    } else {
      open = { kind: 'p', lines: [line.trim()] }
      blocks.push(open)
    }
  }
  return blocks
}

// Pipes inside backticks or escaped as \| stay in their cell.
function cells(row: string): string[] {
  const out: string[] = []
  let cell = ''
  let code = false
  const body = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\' && body[i + 1] === '|') {
      cell += '|'
      i++
    } else if (ch === '`') {
      code = !code
      cell += ch
    } else if (ch === '|' && !code) {
      out.push(cell.trim())
      cell = ''
    } else {
      cell += ch
    }
  }
  out.push(cell.trim())
  return out
}

function Table({ rows }: { rows: string[] }): React.JSX.Element {
  const hasHead = rows.length > 1 && TABLE_RULE.test(rows[1])
  const head = hasHead ? cells(rows[0]) : []
  const body = (hasHead ? rows.slice(2) : rows).map(cells)
  return (
    <div className="au-table-wrap">
      <table className="au-table">
        {head.length > 0 && (
          <thead>
            <tr>
              {head.map((c, i) => (
                <th key={i}>
                  <Inline text={c} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Markdown({ source }: { source: string }): React.JSX.Element {
  return (
    <div className="au-prose">
      {parseBlocks(source).map((b, i) => {
        switch (b.kind) {
          case 'p':
            return (
              <p key={i}>
                <Inline text={b.lines.join(' ')} />
              </p>
            )
          case 'table':
            return <Table key={i} rows={b.rows} />
          default: {
            const List = b.kind
            return (
              <List key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            )
          }
        }
      })}
    </div>
  )
}

const INLINE =
  /`([^`]+)`|\*\*(.+?)\*\*|(?<![\w*])\*(?![\s*])(.+?)(?<!\s)\*(?!\*)|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)|\[([^\]]+)\]\(([^)\s]+)\)/g
const SAFE_HREF = /^(https?:|mailto:|#)/i

export function Inline({ text }: { text: string }): React.JSX.Element {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = m.index
    const [, code, bold, star, under, linkText, href] = m
    if (code != null) out.push(<code key={key}>{code}</code>)
    else if (bold != null)
      out.push(
        <strong key={key}>
          <Inline text={bold} />
        </strong>,
      )
    else if (star != null || under != null)
      out.push(
        <em key={key}>
          <Inline text={star ?? under} />
        </em>,
      )
    else if (SAFE_HREF.test(href))
      out.push(
        <a
          key={key}
          href={href}
          target={href.startsWith('#') ? undefined : '_blank'}
          rel="noopener noreferrer"
        >
          <Inline text={linkText} />
        </a>,
      )
    else out.push(<Inline key={key} text={linkText} />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}
