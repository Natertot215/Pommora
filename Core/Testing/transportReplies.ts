import type { TransportReply } from '../Contract/handlers'

export const replyOf = (reply: Omit<TransportReply, 'bytes'>): TransportReply => ({
  ...reply,
  bytes: new TextEncoder().encode(reply.body),
})
