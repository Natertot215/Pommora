/** What the interface's own 1.0 is worth as a host zoom factor. The chrome is drawn a step below
 *  the browser's scale, so every site that sets zoom passes through `interfaceScaleZoom` rather than
 *  the stated multiplier directly. */
const INTERFACE_SCALE_BASE = 0.9

export const interfaceScaleZoom = (scale: number): number => scale * INTERFACE_SCALE_BASE
