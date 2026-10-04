import { describe, it, expect } from 'vitest'
import { CONTEXTS_REGISTRY_REL, NEXUS_CONFIG_FILES } from './nexusPaths'
import { nexusConfig } from './paths'

describe('the .nexus layout', () => {
  it('resolves each config file into its domain folder under a single .nexus', () => {
    expect(nexusConfig('/n', NEXUS_CONFIG_FILES.crops)).toBe('/n/.nexus/assets/crops.json')
    expect(nexusConfig('/n', NEXUS_CONFIG_FILES.homepage)).toBe(
      '/n/.nexus/interface/homepage/homepage.json',
    )
    expect(nexusConfig('/n', NEXUS_CONFIG_FILES.matrix)).toBe('/n/.nexus/interface/matrix.json')
    expect(CONTEXTS_REGISTRY_REL).toBe('.nexus/contexts/contexts.json')
  })
})
