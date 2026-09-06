// jsdom has no layout, so hit-testing APIs the drag engines call (elementFromPoint) are absent —
// stub to "nothing there" instead of an uncaught TypeError.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}

// Same gap, one level down: a Range reports no rects. CodeMirror measures a Range to learn its
// default character size when the document is empty — so an editor suite mounting a blank doc
// takes an uncaught TypeError out of a requestAnimationFrame, after its test has already passed.
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}

// jsdom has no ResizeObserver; a portalled PickerMenu observes its pane to keep it positioned, so a
// suite that opens one takes an uncaught ReferenceError out of a layout effect.
if (typeof globalThis !== 'undefined' && !('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

// jsdom has no scroller, so the API a list calls to follow its selection is absent — a no-op is
// the honest stand-in, since there is nothing to scroll.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
