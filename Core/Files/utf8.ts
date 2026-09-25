const ENCODER = new TextEncoder()

export const utf8 = (text: string): Uint8Array<ArrayBuffer> => ENCODER.encode(text)
