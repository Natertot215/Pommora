// probe.js — injected into the page: the oracle every sample reads, and the geometry helpers the recipes share.
window.__rv = {
  // Effective visibility: the element (or its pseudo-element) times every ancestor's opacity, zero when not rendered.
  sample(el, pseudo) {
    if (!el || !el.isConnected) return { missing: true }
    const own = getComputedStyle(el, pseudo ?? null)
    let vis = pseudo ? Number(own.opacity) : 1
    if (!el.checkVisibility({ opacityProperty: false, visibilityProperty: true })) vis = 0
    if (pseudo && (own.content === 'none' || own.display === 'none')) vis = 0
    for (let n = el; n && vis > 0; n = n.parentElement) vis *= Number(getComputedStyle(n).opacity)
    const props = own.transitionProperty.split(',').map((s) => s.trim())
    const durs = own.transitionDuration.split(',').map((s) => s.trim())
    const i = props.findIndex((p) => p === 'opacity' || p === 'all')
    const host = el.closest('[data-reveal-host]')
    return {
      vis: Math.round(vis * 100) / 100,
      pe: getComputedStyle(el).pointerEvents,
      fade: i < 0 ? 'none' : durs[i % durs.length],
      hostState: host ? host.getAttribute('data-reveal-host') : null,
    }
  },
  // Resolves once no transition runs on the element, its pseudo-elements, or an ancestor: a loaded machine paints late, so a fixed wait can land mid-fade.
  still(el) {
    return new Promise((done) => {
      const t0 = performance.now()
      const check = () => {
        const moving = document
          .getAnimations()
          .some((a) => a.playState === 'running' && a.effect?.target instanceof Node && (a.effect.target === el || a.effect.target.contains(el)))
        if (!moving || performance.now() - t0 > 2000) done(true)
        else requestAnimationFrame(check)
      }
      requestAnimationFrame(check)
    })
  },
  box(el) {
    const r = el.getBoundingClientRect()
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
  },
  // The first point inside `host` whose hit target is neither `avoid` nor inside it: somewhere on the host that isn't the control.
  hostPoint(host, avoid) {
    const r = host.getBoundingClientRect()
    for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.5], [0.7, 0.5], [0.2, 0.3], [0.8, 0.7], [0.1, 0.5], [0.9, 0.5], [0.5, 0.2], [0.5, 0.8]]) {
      const x = r.left + r.width * fx
      const y = r.top + r.height * fy
      const hit = document.elementFromPoint(x, y)
      if (hit && host.contains(hit) && !(avoid && (avoid === hit || avoid.contains(hit)))) return { x, y }
    }
    return null
  },
  // Parked tab views stay mounted off screen; every lookup skips them.
  all(sel) {
    return [...document.querySelectorAll(sel)].filter((e) => !e.closest('.is-parked'))
  },
  q(sel) {
    return __rv.all(sel)[0] ?? null
  },
  byText(sel, text) {
    return __rv.all(sel).find((e) => (e.textContent ?? '').trim() === text) ?? null
  },
}
true
