import type { GovernedWorld } from '../Contexts/contextResolve'
import type { Result } from '../Contract/result'
import { valueToWrite } from '../Nexus/page'
import type { PropertyDefinition } from '../Properties/properties'
import type { PropertyValue } from '../Properties/propertyValue'
import { landPageValue, landSpaceValue } from '../Properties/setProperty'

export async function updatePageProperty(
  absFile: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
  world?: GovernedWorld,
): Promise<Result<null>> {
  const encoded = valueToWrite(def, value)
  return encoded.ok ? landPageValue(absFile, def.name, encoded.value, world) : encoded
}

export async function setSpaceProperty(
  root: string,
  absSpaceDir: string,
  def: PropertyDefinition,
  value: PropertyValue | null,
): Promise<Result<null>> {
  const encoded = valueToWrite(def, value)
  return encoded.ok ? landSpaceValue(root, absSpaceDir, def.name, encoded.value) : encoded
}
