/** How far a row at `depth` steps in from its lead, by the one `--disclosure-indent` step. */
export const rowIndent = (depth: number): string => `calc(var(--disclosure-indent) * ${depth})`
