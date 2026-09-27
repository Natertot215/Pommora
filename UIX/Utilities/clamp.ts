export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export type NumberRange = { min: number; max: number }
export type SteppedRange = NumberRange & { steps: readonly number[] }

export const steppedRange = (steps: readonly number[]): SteppedRange => ({
  steps,
  min: steps[0],
  max: steps[steps.length - 1],
})
