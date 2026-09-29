import type { LineSpec } from './engine'

type GroupedSnap<IS, GS> = { item: IS } | { group: GS }

export function groupedLine<I, IS, G, GS>(
  isItem: (id: string) => boolean,
  items: LineSpec<I, IS>,
  groups: LineSpec<G, GS>,
): LineSpec<I | G, GroupedSnap<IS, GS>> {
  return {
    snap: (id, g) => {
      if (isItem(id)) {
        const item = items.disabled ? null : items.snap(id, g)
        return item === null ? null : { item }
      }
      const group = groups.disabled ? null : groups.snap(id, g)
      return group === null ? null : { group }
    },
    resolve: (id, p, s) =>
      'item' in s ? items.resolve(id, p, s.item) : groups.resolve(id, p, s.group),
    commit: (id, slot, s) =>
      'item' in s ? items.commit(id, slot as I, s.item) : groups.commit(id, slot as G, s.group),
    line: (slot, s) =>
      ('item' in s ? items.line?.(slot as I, s.item) : groups.line?.(slot as G, s.group)) ?? null,
    label: (id) => (isItem(id) ? items.label(id) : groups.label(id)),
    glyph: (id) => (isItem(id) ? items.glyph?.(id) : groups.glyph?.(id)),
    chip: (id) => (isItem(id) ? items.chip?.(id) : groups.chip?.(id)),
    carry: items.carry,
    step: (slot, s) =>
      ('item' in s ? items.step?.(slot as I, s.item) : groups.step?.(slot as G, s.group)) ?? null,
    disclose: (id) => {
      const d = isItem(id) ? items.disclose : groups.disclose
      return typeof d === 'function' ? d(id) : d === true
    },
    watch: [...items.watch, ...groups.watch],
  }
}
