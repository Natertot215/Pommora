// jsdom has no layout, so hit-testing APIs the drag engines call (elementFromPoint) are absent —
// stub to "nothing there" instead of an uncaught TypeError.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}

// Same gap, one level down: a Range reports no rects. CodeMirror measures a Range to learn its
// default character size, which it only needs to do when the document is empty and holds no text to
// measure from — so an editor suite mounting a blank doc takes an uncaught TypeError out of a
// requestAnimationFrame, after its test has already passed.
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}
