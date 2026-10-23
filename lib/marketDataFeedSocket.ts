import type { MarketDataStatus, RawMessage } from "@/lib/marketDataSocket";

type MessageListener = (raw: RawMessage) => void;

const DEFAULT_RECONNECT = { initialDelayMs: 1000, maxDelayMs: 30000, factor: 2 };

function buildFeedUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return undefined;
  const path = process.env.NEXT_PUBLIC_MARKET_DATA_WS_PATH || "/ws/market-data";
  const wsBase = base.replace(/\/$/, "").replace(/^http/i, "ws");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return wsBase + suffix;
}

class MarketDataFeedSocket {
  private socket: WebSocket | null = null;
  private status: MarketDataStatus = "disconnected";
  private readonly messageListeners = new Set<MessageListener>();
  private readonly statusListeners = new Set<() => void>();
  private refCount = 0;
  private attempts = 0;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastError: string | null = null;
  private readonly url = buildFeedUrl();

  getStatus = () => this.status;
  getError = () => this.lastError;

  subscribeStatus = (cb: () => void) => {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  };

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

  acquire() {
    this.refCount += 1;
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    if (!this.socket && !this.retryTimer) this.open();
  }

  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount > 0) return;
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.refCount === 0) this.close();
    }, 0);
  }

  private setStatus(status: MarketDataStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((cb) => cb());
  }

  private open() {
    if (typeof window === "undefined") return;
    if (!this.url) {
      this.lastError = "NEXT_PUBLIC_BACKEND_URL is not configured";
      this.setStatus("error");
      return;
    }
    this.lastError = null;
    this.setStatus("connecting");
    const socket = new WebSocket(this.url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.attempts = 0;
      this.lastError = null;
      this.setStatus("connected");
    };
    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      const data = event.data;
      if (!(data instanceof ArrayBuffer) && typeof data !== "string") return;
      this.messageListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error("market-data feed listener failed", error);
        }
      });
    };
    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.lastError = "Live feed connection error";
      this.setStatus("error");
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.refCount === 0) {
        this.setStatus("disconnected");
        return;
      }
      this.attempts += 1;
      this.lastError = "Live feed disconnected – retrying";
      this.setStatus("error");
      const delay = Math.min(
        DEFAULT_RECONNECT.maxDelayMs,
        DEFAULT_RECONNECT.initialDelayMs * DEFAULT_RECONNECT.factor ** Math.min(this.attempts, 5),
      );
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (this.refCount > 0) this.open();
      }, delay);
    };
  }

  private close() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    this.attempts = 0;
    socket?.close();
    this.setStatus("disconnected");
  }
}

export const marketDataFeedSocket = new MarketDataFeedSocket();
