let cmdIsCtrl = false

export function setCmdModifier(ctrl: boolean): void {
  cmdIsCtrl = ctrl
}

export const commandIsCtrl = (): boolean => cmdIsCtrl

export function isCmd(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return cmdIsCtrl ? e.ctrlKey : e.metaKey
}

export function isSecondaryClick(e: { ctrlKey: boolean }): boolean {
  return !cmdIsCtrl && e.ctrlKey
}
