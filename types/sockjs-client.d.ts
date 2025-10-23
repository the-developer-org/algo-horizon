declare module 'sockjs-client' {
  export interface SockJSOptions {
    server?: string;
    transports?: string[];
    sessionId?: number | (() => string);
    debug?: boolean;
    devel?: boolean;
    info?: any;
    protocols_whitelist?: string[];
    rtt?: number;
    rto?: number;
    timeout?: number;
  }

  export default class SockJS {
    constructor(url: string, protocols?: string | string[] | null, options?: SockJSOptions);
    
    readyState: number;
    protocol: string;
    url: string;
    withCredentials: boolean;

    onopen: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;

    send(data: any): void;
    close(code?: number, reason?: string): void;

    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
    dispatchEvent(event: Event): boolean;

    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
  }
}