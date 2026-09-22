import { perText } from './perText'
import { scanDoc } from './docScan'

/** A few texts rather than one, because more than one page can be on screen and a single slot would let their renders evict each other. */
export const TEXT_SLOTS = 4

export const scanOf = perText(scanDoc, TEXT_SLOTS)
