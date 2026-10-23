import { type Handlers, withRoot } from '../Contract/handlers'
import { fault } from '../Contract/result'
import { propertyHolders } from './deleteProperty'
import { optionHolders, valueFormatHolders } from './optionOps'
import { countedChange } from './properties'
import { rekeyHolders } from './registryProperty'

const NEEDS_ID_AND_VALUE = fault('A property id and value are required.')

// Every property write enters through `mutate`; this read counts what a change would rewrite, by the dry run of the sweep the change runs.
export const propertiesHandlers = {
  'property:holders': withRoot(async (root, _ctx, propertyId: unknown, change: unknown) => {
    const read = countedChange.safeParse(change)
    if (typeof propertyId !== 'string' || !read.success) return NEEDS_ID_AND_VALUE
    const counted = read.data
    switch (counted.of) {
      case 'property':
        return propertyHolders(root, propertyId)
      case 'option':
        return optionHolders(root, propertyId, counted.optionId)
      case 'format':
        return 'key_format' in counted.change
          ? rekeyHolders(root, propertyId, { key_format: counted.change.key_format })
          : valueFormatHolders(root, propertyId, counted.change.value_format)
      case 'rename':
        return counted.optionId === undefined
          ? rekeyHolders(root, propertyId, { label: counted.label })
          : optionHolders(root, propertyId, counted.optionId, counted.label)
    }
  }),
} satisfies Partial<Handlers>
