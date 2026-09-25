/** How a stepped value reads: multiplied by `scale`, fixed to `digits` decimals, followed by `suffix`. */
export type NumberUnit = { scale: number; suffix: string; digits: number }

export const FACTOR: NumberUnit = { scale: 1, suffix: 'x', digits: 2 }

export const unitNumber = (value: number, unit: NumberUnit = FACTOR): string =>
  (value * unit.scale).toFixed(unit.digits)

export const unitLabel = (value: number, unit: NumberUnit = FACTOR): string =>
  `${unitNumber(value, unit)}${unit.suffix}`
