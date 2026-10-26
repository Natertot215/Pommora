/** How far a row at `depth` steps in from its lead, by the table's `--row-indent`. */
export const rowIndent = (depth: number): string => `calc(var(--row-indent) * ${depth})`
