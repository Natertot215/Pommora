// jsdom has no layout, so hit-testing APIs the drag engines call (elementFromPoint) are absent —
// stub to "nothing there" instead of an uncaught TypeError.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null
}
