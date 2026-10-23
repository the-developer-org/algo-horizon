// Shared, ref-counted WebSocket to the backend market-data endpoint.
// Transport only: messages are delivered to listeners exactly as received.

export type MarketDataStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type RawMessage = string | ArrayBuffer;
export type MessageListener = (raw: RawMessage) => void;

export interface ReconnectOptions {
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
}

const DEFAULT_RECONNECT: ReconnectOptions = { initialDelayMs: 1000, maxDelayMs: 30000, factor: 2 };

export class MarketDataSocket {
  private ws: WebSocket | null = null;
  private status: MarketDataStatus = 'disconnected';
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<() => void>();
  private refCount = 0;
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly url: string | undefined,
    private readonly reconnect: ReconnectOptions = DEFAULT_RECONNECT,
  ) {}

  getStatus = () => this.status;
  getError = () => this.lastError;
  getUrl = () => this.url;

  subscribeStatus = (cb: () => void) => {
    this.statusListeners.add(cb);
    return () => { this.statusListeners.delete(cb); };
  };

  /** Registers a raw message listener and keeps the socket open while any consumer exists. */
  subscribe(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    this.acquire();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.messageListeners.delete(listener);
      this.release();
    };
  }

  /** Acquire/release for consumers that only need status. */
  acquire() {
    this.refCount++;
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    if (!this.ws && !this.reconnectTimer) this.open();
  }

  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount > 0) return;
    // Deferred close so React Strict Mode's mount/unmount/mount reuses the socket.
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.refCount === 0) this.close();
    }, 0);
  }

  private setStatus(s: MarketDataStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((cb) => cb());
  }

  private open() {
    if (!this.url) {
      this.lastError = 'NEXT_PUBLIC_BACKEND_URL is not configured';
      this.setStatus('error');
      return;
    }
    this.lastError = null;
    this.setStatus('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : 'Invalid WebSocket URL';
      this.setStatus('error');
      return;
    }
    // Text frames arrive as string; binary frames as ArrayBuffer.
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempts = 0;
      this.setStatus('connected');
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      const data = ev.data as RawMessage;
      this.messageListeners.forEach((l) => {
        try { l(data); } catch (e) { console.error('market-data listener failed', e); }
      });
    };
    ws.onerror = () => {
      if (this.ws !== ws) return;
      this.lastError = 'WebSocket error';
      this.setStatus('error');
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.status !== 'error') this.setStatus('disconnected');
      if (this.refCount > 0) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    const { initialDelayMs, maxDelayMs, factor } = this.reconnect;
    const base = Math.min(maxDelayMs, initialDelayMs * Math.pow(factor, this.attempts++));
    const delay = base / 2 + Math.random() * (base / 2); // jitter
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.refCount > 0 && !this.ws) this.open();
    }, delay);
  }

  private close() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    const ws = this.ws;
    this.ws = null;
    this.attempts = 0;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      ws.close();
    }
    this.setStatus('disconnected');
  }
}

// Derived from the existing NEXT_PUBLIC_BACKEND_URL (http->ws, https->wss).
// The path is overridable via NEXT_PUBLIC_MARKET_DATA_WS_PATH.
function buildUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return undefined;
  const path = process.env.NEXT_PUBLIC_MARKET_DATA_WS_PATH || '/ws/market-data';
  return base.replace(/\/$/, '').replace(/^http/, 'ws') + path;
}

// Single shared instance for the whole app.
export const marketDataSocket = new MarketDataSocket(buildUrl());
