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

/** The registry id a filename's glyph comes from. Case-insensitive, and a name with no extension
 *  or a leading dot (`README`, `.gitignore`) takes the fallback rather than reading its whole name
 *  as one. */
export function fileTypeIcon(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return FILE_TYPE_FALLBACK
  const raw = name.slice(dot + 1).toLowerCase()
  const ext = (ALIASES[raw] ?? raw) as FileTypeExt
  return FILE_TYPE_EXTS.includes(ext) ? `file-type-${ext}` : FILE_TYPE_FALLBACK
}
