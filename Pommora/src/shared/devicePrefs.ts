// Preferences that belong to the MACHINE rather than to the Nexus. A Nexus opened on a laptop and
// on a desktop should look like the Nexus on both; how its menus are drawn is a property of the
// operating system in front of the user, so it stays with the device and travels nowhere.

export interface DevicePrefs {
  /** Menus that are plain lists open as system menus instead of in-app panes. A menu that isn't a
   *  list — a grid, a calendar, a field — has no system equivalent and is unaffected. */
  nativeMenus?: boolean
}

/** What actually gets stored: every key resting at its default drops out, so an untouched machine
 *  keeps an empty row rather than a record of every default. Keyed on the VALUE rather than on a
 *  list of names — a list would be a second statement of the shape above, and the one that falls
 *  behind when a preference is added. */
export function packDevicePrefs(raw: unknown): DevicePrefs {
  if (typeof raw !== 'object' || raw === null) return {}
  const kept = Object.entries(raw).filter(([, v]) => v !== undefined && v !== null && v !== false)
  return Object.fromEntries(kept) as DevicePrefs
}
