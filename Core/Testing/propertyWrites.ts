import type { Result } from '../Contract/result'
import type { PropertyDefinition } from '../Properties/properties'
import { type PropertyValue, valueToWrite } from '../Properties/propertyValue'
import { landPageValue, landSpaceValue } from '../Properties/setProperty'

export async function writePageValue(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  return landPageValue(absFile, def.key, valueToWrite(def, value))
}

export async function writeSpaceValue(
  root: string,
  absSpaceDir: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  return landSpaceValue(root, absSpaceDir, def.key, valueToWrite(def, value))
}
