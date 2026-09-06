// The per-extension file glyphs — Tabler's `file-type-*` set. Per-extension rather than
// per-family: a `.ts` and a `.tsx` reading as one glyph loses the distinction a file label exists
// to make.

import type { LucideIcon } from 'lucide-react'
import {
  IconFileTypeBmp,
  IconFileTypeCss,
  IconFileTypeCsv,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypeHtml,
  IconFileTypeJpg,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypePdf,
  IconFileTypePhp,
  IconFileTypePng,
  IconFileTypePpt,
  IconFileTypeRs,
  IconFileTypeSql,
  IconFileTypeSvg,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFileTypeTxt,
  IconFileTypeVue,
  IconFileTypeXls,
  IconFileTypeXml,
  IconFileTypeZip,
} from '@tabler/icons-react'
import { asTablerGlyph } from './customGlyphs'

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

const ALIASES: Record<string, FileTypeExt> = {
  jpeg: 'jpg',
  htm: 'html',
  xlsx: 'xls',
  pptx: 'ppt',
  mjs: 'js',
  cjs: 'js',
}

export const FILE_TYPE_FALLBACK = 'file-chart-column'

const TABLER_FILE_TYPES: Record<FileTypeExt, LucideIcon> = {
  bmp: IconFileTypeBmp,
  css: IconFileTypeCss,
  csv: IconFileTypeCsv,
  doc: IconFileTypeDoc,
  docx: IconFileTypeDocx,
  html: IconFileTypeHtml,
  jpg: IconFileTypeJpg,
  js: IconFileTypeJs,
  jsx: IconFileTypeJsx,
  pdf: IconFileTypePdf,
  php: IconFileTypePhp,
  png: IconFileTypePng,
  ppt: IconFileTypePpt,
  rs: IconFileTypeRs,
  sql: IconFileTypeSql,
  svg: IconFileTypeSvg,
  ts: IconFileTypeTs,
  tsx: IconFileTypeTsx,
  txt: IconFileTypeTxt,
  vue: IconFileTypeVue,
  xls: IconFileTypeXls,
  xml: IconFileTypeXml,
  zip: IconFileTypeZip,
}

export const fileTypeGlyphs = Object.fromEntries(
  FILE_TYPE_EXTS.map((ext) => [`file-type-${ext}`, asTablerGlyph(TABLER_FILE_TYPES[ext])]),
) as Record<`file-type-${FileTypeExt}`, LucideIcon>

/** The leading-dot guard is load-bearing: without it a bare `ts` slices to its own name and glyphs
 *  as TypeScript. */
export function fileTypeIcon(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return FILE_TYPE_FALLBACK
  const raw = name.slice(dot + 1).toLowerCase()
  const ext = FILE_TYPE_EXTS.find((x) => x === (ALIASES[raw] ?? raw))
  return ext ? `file-type-${ext}` : FILE_TYPE_FALLBACK
}
