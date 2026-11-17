import protobuf from 'protobufjs';

// Upstox MarketDataFeedV3 schema. Decoding lives outside the raw transport.
const PROTO = `
syntax = "proto3";
message DoubleValue { double value = 1; }
message LTPC { double ltp = 1; int64 ltt = 2; int64 ltq = 3; double cp = 4; DoubleValue iep = 5; }
message Quote { int64 bidQ = 1; double bidP = 2; int64 askQ = 3; double askP = 4; }
message MarketLevel { repeated Quote bidAskQuote = 1; }
message OptionGreeks { double delta = 1; double theta = 2; double gamma = 3; double vega = 4; double rho = 5; }
message OHLC { string interval = 1; double open = 2; double high = 3; double low = 4; double close = 5; int64 vol = 6; int64 ts = 7; }
message MarketOHLC { repeated OHLC ohlc = 1; }
message MarketFullFeed {
  LTPC ltpc = 1; MarketLevel marketLevel = 2; OptionGreeks optionGreeks = 3;
  MarketOHLC marketOHLC = 4; double atp = 5; int64 vtt = 6; double oi = 7;
  double iv = 8; double tbq = 9; double tsq = 10; double iep = 11;
  double rp = 12; int64 ieq = 13; int64 iiqTotal = 14; int64 iiqM = 15; bool casEligible = 16;
}
message IndexFullFeed { LTPC ltpc = 1; MarketOHLC marketOHLC = 2; }
message FullFeed { oneof FullFeedUnion { MarketFullFeed marketFF = 1; IndexFullFeed indexFF = 2; } }
message FirstLevelWithGreeks { LTPC ltpc = 1; Quote firstDepth = 2; OptionGreeks optionGreeks = 3; int64 vtt = 4; double oi = 5; double iv = 6; }
message Feed { oneof FeedUnion { LTPC ltpc = 1; FullFeed fullFeed = 2; FirstLevelWithGreeks firstLevelWithGreeks = 3; } int32 requestMode = 4; }
message FeedResponse { int32 type = 1; map<string, Feed> feeds = 2; int64 currentTs = 3; }
`;

let feedResponse: protobuf.Type | null = null;
function getType() {
  if (!feedResponse) feedResponse = protobuf.parse(PROTO).root.lookupType('FeedResponse');
  return feedResponse;
}

export interface LtpcTick { ltp?: number; cp?: number; ltt?: number }

export type FeedRecord = Record<string, unknown>;

function isRecord(value: unknown): value is FeedRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Returns the per-instrument feed without discarding full-market fields. */
export function decodeMarketFeed(raw: string | ArrayBuffer): Record<string, FeedRecord> | null {
  try {
    const message: unknown = typeof raw === 'string'
      ? JSON.parse(raw)
      : getType().toObject(getType().decode(new Uint8Array(raw)), { longs: String, defaults: false });
    if (!isRecord(message) || !isRecord(message.feeds)) return null;
    const feeds: Record<string, FeedRecord> = {};
    for (const [key, feed] of Object.entries(message.feeds)) {
      if (isRecord(feed)) feeds[key] = feed;
    }
    return Object.keys(feeds).length ? feeds : null;
  } catch (error) {
    console.warn('Could not decode market feed:', error);
    return null;
  }
}

/** Merge partial updates without discarding previously received fields. */
export function mergeFeedRecords(previous: FeedRecord, update: FeedRecord): FeedRecord {
  const result = { ...previous };
  for (const [key, value] of Object.entries(update)) {
    const oldValue = result[key];
    result[key] = isRecord(value) && isRecord(oldValue)
      ? mergeFeedRecords(oldValue, value)
      : value;
  }
  return result;
}

export function instrumentFeed(feed: FeedRecord): FeedRecord {
  const full = isRecord(feed.fullFeed) ? feed.fullFeed : {};
  const market = isRecord(full.marketFF) ? full.marketFF : {};
  const index = isRecord(full.indexFF) ? full.indexFF : {};
  const first = isRecord(feed.firstLevelWithGreeks) ? feed.firstLevelWithGreeks : {};
  const ltpc = isRecord(feed.ltpc) ? { ltpc: feed.ltpc } : {};
  return mergeFeedRecords(mergeFeedRecords(mergeFeedRecords(market, index), first), ltpc);
}

/** Decodes a binary FeedResponse into instrumentKey -> LTPC. Returns null if not decodable. */
export function decodeUpstoxFeed(buf: ArrayBuffer): Record<string, LtpcTick> | null {
  try {
    const t = getType();
    const msg: any = t.toObject(t.decode(new Uint8Array(buf)), { longs: Number, defaults: false });
    const feeds = msg.feeds;
    if (!feeds) return null;
    const out: Record<string, LtpcTick> = {};
    for (const key of Object.keys(feeds)) {
      const f = feeds[key];
      const l = f?.ltpc ?? f?.fullFeed?.marketFF?.ltpc ?? f?.fullFeed?.indexFF?.ltpc ?? f?.firstLevelWithGreeks?.ltpc;
      if (l) out[key] = { ltp: l.ltp, cp: l.cp, ltt: l.ltt };
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}
