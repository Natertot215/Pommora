/** The one session every guest webview lives on — a sign-in anywhere authenticates every embed surface, per machine, surviving restarts. */
export const WEB_PARTITION = 'persist:pommora-web'
/** The class every rendered guest carries, whatever element renders it. */
export const WEB_GUEST_CLASS = 'web-guest'
