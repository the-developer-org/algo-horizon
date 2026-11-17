/** STOMP frames expose their bodies as bytes, including UTF-8 JSON messages. */
export function normalizeStompPayload(payload: Uint8Array): string | ArrayBuffer {
  const first = payload.find((byte) => byte !== 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d);
  if (first === 0x7b || first === 0x5b) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(payload);
    } catch (error) {
      console.warn('STOMP JSON payload is not valid UTF-8:', error);
    }
  }
  return new Uint8Array(payload).buffer;
}
