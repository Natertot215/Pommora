// Preferences that belong to the MACHINE rather than to the Nexus. A Nexus opened on a laptop and
// on a desktop should look like the Nexus on both; how its menus are drawn is a property of the
// operating system in front of the user, so it stays with the device and travels nowhere.

export interface DevicePrefs {
  nativeMenus?: boolean
}

/** Every key resting at its default drops out, so an untouched machine keeps an empty row. Keyed on
 *  the VALUE rather than a list of names, which would fall behind when a preference is added. */
export function packDevicePrefs(raw: unknown): DevicePrefs {
  if (typeof raw !== 'object' || raw === null) return {}
  const kept = Object.entries(raw).filter(([, v]) => v !== undefined && v !== null && v !== false)
  return Object.fromEntries(kept) as DevicePrefs
}
