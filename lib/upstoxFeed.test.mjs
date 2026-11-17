import assert from 'node:assert/strict';
import test from 'node:test';
import protobuf from 'protobufjs';
import { decodeMarketFeed, decodeUpstoxFeed, instrumentFeed, mergeFeedRecords } from './upstoxFeed.ts';
import { normalizeStompPayload } from './stompPayload.ts';

const schema = protobuf.parse(`
  syntax = "proto3";
  message LTPC { double ltp = 1; int64 ltt = 2; int64 ltq = 3; double cp = 4; }
  message Quote { int64 bidQ = 1; double bidP = 2; int64 askQ = 3; double askP = 4; }
  message MarketLevel { repeated Quote bidAskQuote = 1; }
  message OHLC { string interval = 1; double open = 2; double high = 3; double low = 4; double close = 5; int64 vol = 6; int64 ts = 7; }
  message MarketOHLC { repeated OHLC ohlc = 1; }
  message MarketFullFeed { LTPC ltpc = 1; MarketLevel marketLevel = 2; MarketOHLC marketOHLC = 4; double atp = 5; int64 vtt = 6; double oi = 7; }
  message FullFeed { MarketFullFeed marketFF = 1; }
  message Feed { FullFeed fullFeed = 2; }
  message FeedResponse { map<string, Feed> feeds = 2; }
`).root.lookupType('FeedResponse');

test('decodes full protobuf data while preserving the existing LTPC decoder', () => {
  const bytes = schema.encode(schema.create({ feeds: {
    'NSE_EQ|ABC': { fullFeed: { marketFF: {
      ltpc: { ltp: 125.5, cp: 120, ltq: 12, ltt: 1700000000000 },
      marketLevel: { bidAskQuote: [{ bidQ: 10, bidP: 125, askQ: 20, askP: 126 }] },
      marketOHLC: { ohlc: [{ interval: '1d', open: 121, high: 130, low: 119, close: 125, vol: 500 }] },
      atp: 123.5, vtt: 500, oi: 42,
    } } },
  } })).finish();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const feed = instrumentFeed(decodeMarketFeed(buffer)['NSE_EQ|ABC']);
  assert.equal(feed.atp, 123.5);
  assert.equal(feed.vtt, '500');
  assert.equal(feed.ltpc.ltq, '12');
  assert.equal(feed.marketLevel.bidAskQuote[0].askP, 126);
  assert.equal(feed.marketOHLC.ohlc[0].interval, '1d');
  assert.deepEqual(decodeUpstoxFeed(buffer)['NSE_EQ|ABC'], { ltp: 125.5, cp: 120, ltt: 1700000000000 });
});

test('handles JSON LTPC, index and first-level feeds, and merges partial updates', () => {
  const feeds = decodeMarketFeed(JSON.stringify({ feeds: {
    stock: { ltpc: { ltp: 101, cp: 100 } },
    index: { fullFeed: { indexFF: { ltpc: { ltp: 200 }, marketOHLC: { ohlc: [{ interval: '1d', high: 201 }] } } } },
    option: { firstLevelWithGreeks: { ltpc: { ltp: 7 }, firstDepth: { bidP: 6 }, optionGreeks: { delta: 0.5 }, oi: 123 } },
  } }));
  assert.equal(instrumentFeed(feeds.index).marketOHLC.ohlc[0].high, 201);
  assert.equal(instrumentFeed(feeds.option).optionGreeks.delta, 0.5);
  assert.equal(instrumentFeed(feeds.option).firstDepth.bidP, 6);
  const merged = mergeFeedRecords(instrumentFeed(feeds.option), instrumentFeed(feeds.stock));
  assert.deepEqual(merged.ltpc, { ltp: 101, cp: 100 });
  assert.equal(merged.oi, 123);
  assert.equal(decodeMarketFeed(JSON.stringify({ type: 'market_info' })), null);
});

test('normalizes byte-encoded STOMP JSON and preserves binary feed bytes', () => {
  const json = ' \n{"feeds":{"NSE_EQ|ABC":{"ltpc":{"ltp":125.5}}}}';
  const text = normalizeStompPayload(new TextEncoder().encode(json));
  assert.equal(text, json);
  assert.equal(instrumentFeed(decodeMarketFeed(text)['NSE_EQ|ABC']).ltpc.ltp, 125.5);
  const protobuf = Uint8Array.of(0x12, 0x02, 0x01, 0x02);
  assert.deepEqual(new Uint8Array(normalizeStompPayload(protobuf)), protobuf);
});
