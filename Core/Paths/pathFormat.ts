export const PATH_FORMATS = ['absolute', 'home', 'relative'] as const
export type PathFormat = (typeof PATH_FORMATS)[number]
