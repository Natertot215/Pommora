/** A target carrying a scheme is left as-written and refused as a page title. */
export const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** Written-out rather than inferred: normalization promotes a bare `example.com` to https, so surfaces that must know what the author actually wrote layer this on top of link validity. */
export const WEB_ADDRESS = /^https?:\/\//i
