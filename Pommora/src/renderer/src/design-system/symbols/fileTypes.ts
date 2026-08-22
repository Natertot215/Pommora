// The per-extension file glyphs — Tabler's `file-type-*` set, adopted at the same TABLER_SCALE the
// curated registry already sits its Tabler glyphs at. Per-extension rather than per-family: a `.ts`
// and a `.tsx` reading as one glyph loses the distinction a file label exists to make.

import type { LucideIcon } from 'lucide-react'
import * as tabler from '@tabler/icons-react'
import { asTablerGlyph } from './customGlyphs'

/** The extensions Tabler draws. An extension outside this set takes the `file-chart-column`
 *  fallback — the File property's own glyph, unchanged. */
export const FILE_TYPE_EXTS = [
  'bmp',
  'css',
  'csv',
  'doc',
  'docx',
  'html',
  'jpg',
  'js',
  'jsx',
  'pdf',
  'php',
  'png',
  'ppt',
  'rs',
  'sql',
  'svg',
  'ts',
  'tsx',
  'txt',
  'vue',
  'xls',
  'xml',
  'zip',
] as const

export type FileTypeExt = (typeof FILE_TYPE_EXTS)[number]

/** Spellings that mean an extension Tabler already draws. */
const ALIASES: Record<string, FileTypeExt> = {
  jpeg: 'jpg',
  htm: 'html',
  xlsx: 'xls',
  pptx: 'ppt',
  mjs: 'js',
  cjs: 'js',
}

export const FILE_TYPE_FALLBACK = 'file-chart-column'

const tablerName = (ext: FileTypeExt): string =>
  `IconFileType${ext.charAt(0).toUpperCase()}${ext.slice(1)}`

/** One factory over the whole set rather than 23 hand-written wrappers — the roster is the list
 *  above, so an added extension is one entry. */
export const fileTypeGlyphs = Object.fromEntries(
  FILE_TYPE_EXTS.map((ext) => [
    `file-type-${ext}`,
    asTablerGlyph((tabler as unknown as Record<string, LucideIcon>)[tablerName(ext)]),
  ]),
) as Record<`file-type-${FileTypeExt}`, LucideIcon>

/** The registry id a filename's glyph comes from, or undefined where the name carries no extension
 *  to read. The two cases are different facts and read differently: an extension Tabler has no
 *  glyph for still names a FILE, so it takes the fallback; a name with none at all (a folder, a
 *  page title, `README`, a dotfile whose whole name is its name) has nothing to say and shows no
 *  glyph rather than claiming to be a spreadsheet. */
export function fileTypeIcon(name: string): string | undefined {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return undefined
  const raw = name.slice(dot + 1).toLowerCase()
  const ext = (ALIASES[raw] ?? raw) as FileTypeExt
  return FILE_TYPE_EXTS.includes(ext) ? `file-type-${ext}` : FILE_TYPE_FALLBACK
}
