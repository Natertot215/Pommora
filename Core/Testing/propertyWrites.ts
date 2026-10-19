import type { Result } from '../Contract/result'
import type { PropertyDefinition } from '../Properties/properties'
import { type PropertyValue, valueToWrite } from '../Properties/propertyValue'
import { landPageValue, landSpaceValue } from '../Properties/setProperty'

export async function writePageValue(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  const encoded = valueToWrite(def, value)
  return encoded.ok ? landPageValue(absFile, def.key, encoded.value) : encoded
}

export async function writeSpaceValue(
  root: string,
  absSpaceDir: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  const encoded = valueToWrite(def, value)
  return encoded.ok ? landSpaceValue(root, absSpaceDir, def.key, encoded.value) : encoded
}
