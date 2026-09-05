// The URL string grammar, one spelling for every reader. Connections, Assets, and the pickers all
// ask the same two questions of a raw string, and a second copy would risk disagreeing about what
// a URL even is.

/** A target carrying a scheme is left as-written and refused as a page title. */
export const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/** Written-out rather than inferred: normalization promotes a bare `example.com` to https, so
 *  surfaces that must know what the author actually wrote layer this on top of link validity.
 *  A picker adopting a remote image by reference asks the same question — a `file:`/`data:`
 *  source is not stored raw. */
export const WEB_ADDRESS = /^https?:\/\//i
