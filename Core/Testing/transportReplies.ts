import type { TransportReply } from '../Contract/handlers'

/** A test answer names a status and a body; the bytes every reply carries are that body's encoding. */
export const replyOf = (reply: Omit<TransportReply, 'bytes'>): TransportReply => ({
  ...reply,
  bytes: new TextEncoder().encode(reply.body),
})
