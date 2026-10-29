// report.mjs — folds the harness's results/<Size>-<pct>.jsonl (a run kept under a commit suffix stays out) into Markdown tables: per operation, size, and fill, each build's median settle time (min–max), median reply time, and median machine calls (reads/writes, the Trash's share).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const dir = join(import.meta.dirname, 'results')
const recs = readdirSync(dir).filter((f) => /^[A-Za-z]+-\d+\.jsonl$/.test(f)).flatMap((f) => readFileSync(join(dir, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)))
const SIZES = ['Small', 'Medium', 'Large', 'XLarge']
const med = (xs) => { const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const r0 = (x) => (x === null ? '—' : Math.round(x))
const fmtS = (ms) => (ms === null ? '—' : ms >= 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}`)
const reads = (c = {}) => (c.readText ?? 0) + (c.readBytes ?? 0)
const writes = (c = {}) => c.land ?? 0
const cells = new Map()
for (const r of recs) { const k = `${r.size}|${r.pct}|${r.build}`; cells.set(k, [...(cells.get(k) ?? []), r]) }
const keys = [...new Set(recs.map((r) => `${r.size}|${r.pct}`))].sort((a, b) => { const [sa, pa] = a.split('|'); const [sb, pb] = b.split('|'); return SIZES.indexOf(sa) - SIZES.indexOf(sb) || pa - pb })
const LABELS = { coldOpen: 'Cold Open', warmOpen: 'Warm Open', listTrash: 'List Trash', deletePage: 'Page Delete', deleteSet: 'Set Delete', renameProperty: 'Property Rename', renameOption: 'Option Rename', deleteProperty: 'Property Delete', renamePage: 'Page Rename', renameSpace: 'Space Rename', renameContext: 'Context Rename', restorePage: 'Page Restore', restoreSet: 'Set Restore', emptyBundle: 'Empty One Bundle', listTrashAfter: 'List Trash (After)' }
const OPS = ['coldOpen', 'warmOpen', 'listTrash', 'deletePage', 'deleteSet', 'renameProperty', 'renameOption', 'deleteProperty', 'renamePage', 'renameSpace', 'renameContext', 'restorePage', 'restoreSet', 'emptyBundle', 'listTrashAfter']
const stat = (rs, op) => {
  if (op === 'coldOpen' || op === 'warmOpen') {
    const o = rs.map((r) => r[op === 'coldOpen' ? 'cold' : 'warm'])
    const t = o.map((x) => x.indexAt - x.openStartedAt)
    return { n: t.length, med: med(t), min: Math.min(...t), max: Math.max(...t), reply: med(o.map((x) => x.repairAt - x.openStartedAt)), reads: med(o.map((x) => reads(x.io.calls))), writes: med(o.map((x) => writes(x.io.calls))), tr: med(o.map((x) => reads(x.io.trash))), tw: med(o.map((x) => writes(x.io.trash))), ok: true }
  }
  const v = rs.map((r) => r.ops[op]).filter(Boolean)
  if (!v.length) return null
  const t = v.map((x) => x.settleMs)
  return { n: t.length, med: med(t), min: Math.min(...t), max: Math.max(...t), reply: med(v.map((x) => x.replyMs)), reads: med(v.map((x) => reads(x.calls))), writes: med(v.map((x) => writes(x.calls))), tr: med(v.map((x) => reads(x.trash))), tw: med(v.map((x) => writes(x.trash))), ok: v.every((x) => x.ok) }
}
const out = []
for (const k of keys) {
  const [size, pct] = k.split('|')
  const b = cells.get(`${k}|baseline`) ?? [], p = cells.get(`${k}|reach-in`) ?? []
  out.push(`##### ${size}, ${pct}% Trash (${b[0]?.trashRows ?? '?'} Bundles; ${b.length} Runs per Build)\n`)
  out.push('| Operation | Baseline ms (Min–Max) | Reach-In ms (Min–Max) | Δ | Baseline Reply / To Idle | Reach-In Reply / To Idle | Baseline Reads / Writes (Trash) | Reach-In Reads / Writes (Trash) |')
  out.push('|---|---|---|---|---|---|---|---|')
  for (const op of OPS) {
    const sb = stat(b, op), sp = stat(p, op)
    if (!sb && !sp) continue
    const cell = (s) => (s ? `${fmtS(s.med)} (${fmtS(s.min)}–${fmtS(s.max)})${s.ok ? '' : ' ✗'}` : '—')
    const delta = sb && sp && sb.med ? `${sp.med >= sb.med ? '+' : ''}${Math.round(((sp.med - sb.med) / sb.med) * 100)}%` : '—'
    const io = (s) => (s ? `${r0(s.reads)} / ${r0(s.writes)} (${r0(s.tr)} / ${r0(s.tw)})` : '—')
    const rp = (s) => (s ? `${fmtS(s.reply)} / ${fmtS(s.med)}` : '—')
    out.push(`| ${LABELS[op]} | ${cell(sb)} | ${cell(sp)} | ${delta} | ${rp(sb)} | ${rp(sp)} | ${io(sb)} | ${io(sp)} |`)
  }
  out.push('')
}
console.log(out.join('\n'))
