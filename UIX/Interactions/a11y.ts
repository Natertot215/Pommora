export const INSTRUCTIONS_ID = 'dnd-instructions'

const HIDDEN: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  overflow: 'hidden',
  clipPath: 'inset(100%)',
  whiteSpace: 'nowrap',
  border: '0',
}

const DRAG_WORDS = {
  lift: (name: string): string => `Picked up ${name}.`,
  move: (name: string): string => `Moved ${name}.`,
  open: (name: string): string => `Opened ${name} in new tab.`,
  return: (name: string): string => `${name} returned to its place.`,
  cancel: (name: string): string => `Canceled moving ${name}.`,
}

export type DragWord = keyof typeof DRAG_WORDS

export const STEP_WORDS = {
  before: (name: string): string => `Before ${name}.`,
  into: (name: string): string => `Into ${name}.`,
  after: (name: string): string => `After ${name}.`,
  position: (n: number, of: number): string => `Moved to position ${n} of ${of}.`,
}

let region: HTMLElement | null = null
let instructions: HTMLElement | null = null

export function announce(message: string): void {
  if (typeof document === 'undefined') return
  if (!region) {
    region = document.createElement('div')
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', 'assertive')
    region.setAttribute('aria-atomic', 'true')
    Object.assign(region.style, HIDDEN)
    document.body.appendChild(region)
  }
  region.textContent = message
}

export function announceDrag(word: DragWord, name: string): void {
  announce(DRAG_WORDS[word](name))
}

export function ensureInstructions(): void {
  if (typeof document === 'undefined' || instructions) return
  instructions = document.createElement('div')
  instructions.id = INSTRUCTIONS_ID
  Object.assign(instructions.style, HIDDEN)
  instructions.textContent =
    'To pick up a draggable item, press space or enter. In a list, use the up and down arrow keys to reach an item, then press space to pick it up. While dragging, use the arrow keys to move the item. Press space or enter again to drop it, or press escape to cancel.'
  document.body.appendChild(instructions)
}
