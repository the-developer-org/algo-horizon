// Shared, ref-counted SockJS/STOMP connection to the backend market-data feed.
// Transport only: STOMP message bodies are delivered to listeners unchanged.

import SockJS from 'sockjs-client';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import { normalizeStompPayload } from './stompPayload';

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
  private client: Client | null = null;
  private status: MarketDataStatus = 'disconnected';
  private messageListeners = new Set<MessageListener>();
  private topicListeners = new Map<string, Set<MessageListener>>();
  private statusListeners = new Set<() => void>();
  private refCount = 0;
  private attempts = 0;
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

  /** Registers a raw message listener on default topic (/topic/data) and keeps socket open. */
  subscribe(listener: MessageListener): () => void {
    return this.subscribeTopic(marketDataTopic(), listener);
  }

  /** Registers a listener on a specific topic (e.g., /topic/candles) and keeps socket open. */
  subscribeTopic(topic: string, listener: MessageListener): () => void {
    if (topic === marketDataTopic()) {
      this.messageListeners.add(listener);
    }
    let listeners = this.topicListeners.get(topic);
    if (!listeners) {
      listeners = new Set();
      this.topicListeners.set(topic, listeners);
    }
    listeners.add(listener);

    // If already connected, dynamically subscribe client if topic is new
    if (this.client?.connected && listeners.size === 1 && topic !== marketDataTopic()) {
      this.bindTopicSubscription(this.client, topic);
    }

    this.acquire();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      if (topic === marketDataTopic()) {
        this.messageListeners.delete(listener);
      }
      const set = this.topicListeners.get(topic);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.topicListeners.delete(topic);
      }
      this.release();
    };
  }

  /** Acquire/release for consumers that only need status. */
  acquire() {
    this.refCount++;
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    if (!this.client) this.open();
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
    try {
      const client = new Client({
        // The backend registers a SockJS endpoint at /ws, not a native WebSocket
        // endpoint. SockJS negotiates the session and WebSocket upgrade for us.
        webSocketFactory: () => new SockJS(this.url!, null, { transports: ['websocket'] }),
        reconnectDelay: this.reconnect.initialDelayMs,
        maxReconnectDelay: this.reconnect.maxDelayMs,
        reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
        onConnect: () => {
          if (this.client !== client) return;
          this.attempts = 0;
          this.lastError = null;
          this.setStatus('connected');

          // Always ensure default topic is registered
          if (!this.topicListeners.has(marketDataTopic())) {
            this.topicListeners.set(marketDataTopic(), this.messageListeners);
          }

          // Subscribe all active topics
          for (const topic of this.topicListeners.keys()) {
            this.bindTopicSubscription(client, topic);
          }
        },
        onWebSocketError: (event) => {
          if (this.client !== client) return;
          this.lastError = 'Market-data connection error';
          this.setStatus('error');
        },
        onStompError: (frame) => {
          if (this.client !== client) return;
          this.lastError = frame.headers.message || 'Market-data broker error';
          this.setStatus('error');
        },
        onWebSocketClose: () => {
          if (this.client !== client) return;
          if (this.status !== 'error') this.setStatus('disconnected');
        },
      });
      this.client = client;
      client.activate();
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : 'Invalid SockJS URL';
      this.setStatus('error');
    }
  }

  private bindTopicSubscription(client: Client, topic: string) {
    client.subscribe(topic, (message) => {
      if (this.client !== client) return;
      const raw: RawMessage = message.isBinaryBody
        ? normalizeStompPayload(message.binaryBody)
        : message.body;
      const listeners = this.topicListeners.get(topic);
      if (listeners) {
        listeners.forEach((listener) => {
          try { listener(raw); } catch (e) { console.error(`listener on ${topic} failed`, e); }
        });
      }
    });
  }

  private close() {
    const client = this.client;
    this.client = null;
    this.attempts = 0;
    if (client) void client.deactivate();
    this.setStatus('disconnected');
  }
}

// SockJS starts from its registered HTTP endpoint; it performs the WebSocket
// upgrade internally. The backend broadcasts market ticks on /topic/data.
function buildUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!base) return undefined;
  const path = process.env.NEXT_PUBLIC_MARKET_DATA_SOCKJS_PATH || process.env.NEXT_PUBLIC_WS_PATH || '/ws';
  return base.replace(/\/$/, '') + path;
}

function marketDataTopic() {
  return process.env.NEXT_PUBLIC_MARKET_DATA_TOPIC || '/topic/data';
}

// Single shared instance for the whole app.
export const marketDataSocket = new MarketDataSocket(buildUrl());
