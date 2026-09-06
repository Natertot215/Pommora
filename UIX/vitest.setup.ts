// jsdom has no layout, so elementFromPoint — which the drag engines call — is absent.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}

// CodeMirror measures a Range for its default character size on an empty doc; jsdom reports none, throwing out of a rAF after the test has already passed.
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}

// jsdom has no ResizeObserver; a portalled PickerMenu observes its pane, throwing out of a layout effect.
if (typeof globalThis !== 'undefined' && !('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

// jsdom has no scroller, so a list following its selection has nothing to scroll.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
