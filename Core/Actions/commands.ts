/** The `commands` object in `.nexus/settings.json`; an absent id falls back to its default here. */
export const DEFAULT_COMMANDS: Record<string, string> = {
  'toggle-ribbon': 'cmd+t',
  'toggle-nav': 'cmd+o',
  // Does the opposite of what the Pages settings say a plain paste does.
  'paste-inverse': 'cmd+shift+v',
}
