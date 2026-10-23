import protobuf from 'protobufjs';

// Upstox MarketDataFeedV3 schema (subset needed for LTPC). Decoding lives outside the raw transport.
const PROTO = `
syntax = "proto3";
message DoubleValue { double value = 1; }
message LTPC { double ltp = 1; int64 ltt = 2; int64 ltq = 3; double cp = 4; DoubleValue iep = 5; }
message MarketFullFeed { LTPC ltpc = 1; }
message IndexFullFeed { LTPC ltpc = 1; }
message FullFeed { oneof FullFeedUnion { MarketFullFeed marketFF = 1; IndexFullFeed indexFF = 2; } }
message FirstLevelWithGreeks { LTPC ltpc = 1; }
message Feed { oneof FeedUnion { LTPC ltpc = 1; FullFeed fullFeed = 2; FirstLevelWithGreeks firstLevelWithGreeks = 3; } int32 requestMode = 4; }
message FeedResponse { int32 type = 1; map<string, Feed> feeds = 2; int64 currentTs = 3; }
`;

let feedResponse: protobuf.Type | null = null;
function getType() {
  if (!feedResponse) feedResponse = protobuf.parse(PROTO).root.lookupType('FeedResponse');
  return feedResponse;
}

export interface LtpcTick { ltp?: number; cp?: number; ltt?: number }

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
