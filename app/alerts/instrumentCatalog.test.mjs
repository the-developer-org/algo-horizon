import assert from 'node:assert/strict';
import test from 'node:test';
import { currentMonthOptionContracts, fetchOptionContracts, nextExpiryContracts, strikesNearPrice } from './instrumentCatalog.ts';

test('fetches contracts for the underlying and selects the nearest expiry', async () => {
  const originalFetch = globalThis.fetch;
  const contracts = [
    { trading_symbol: 'later', instrument_key: 'later', instrument_type: 'CE', expiry: '2999-02-01' },
    { trading_symbol: 'call', instrument_key: 'call', instrument_type: 'CE', expiry: '2999-01-01' },
    { trading_symbol: 'put', instrument_key: 'put', instrument_type: 'PE', expiry: '2999-01-01' },
  ];
  try {
    globalThis.fetch = async (url) => {
      assert.equal(url, '/api/upstox/option-contracts?instrument_key=NSE_EQ%7CABC');
      return Response.json({ data: contracts });
    };
    assert.deepEqual(nextExpiryContracts(await fetchOptionContracts('NSE_EQ|ABC')).map((item) => item.instrument_key), ['call', 'put']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('selects nearest current-month expiry and three distinct strikes on the correct side', () => {
  const make = (strike, type, expiry = '2026-11-19', key = `${type}-${strike}`) =>
    ({ trading_symbol: key, instrument_key: key, strike_price: strike, instrument_type: type, expiry });
  const contracts = [
    make(150, 'CE'), make(142, 'CE'), make(141, 'CE'), make(145, 'CE'),
    make(141, 'CE', '2026-11-19', 'duplicate'), make(140, 'CE'),
    make(139, 'PE'), make(138, 'PE'), make(135, 'PE'), make(130, 'PE'), make(140, 'PE'),
    make(141, 'CE', '2026-11-26', 'later'), make(141, 'CE', '2026-12-01', 'next-month'),
    make(141, 'CE', '2026-11-05', 'expired'),
  ];
  const current = currentMonthOptionContracts(contracts, '2026-11-12');
  assert.ok(current.every((contract) => contract.expiry === '2026-11-19'));
  assert.deepEqual(strikesNearPrice(current, 140, 'CE').map((item) => item.strike_price), [141, 142, 145]);
  assert.deepEqual(strikesNearPrice(current, 140, 'PE').map((item) => item.strike_price), [139, 138, 135]);
  assert.deepEqual(strikesNearPrice(current, 140.5, 'CE').map((item) => item.strike_price), [141, 142, 145]);
  assert.deepEqual(strikesNearPrice(current, 130, 'PE'), []);
  assert.equal(strikesNearPrice(current, 149, 'CE').length, 1);
  assert.deepEqual(strikesNearPrice(current, 0, 'CE'), []);
  assert.deepEqual(currentMonthOptionContracts(contracts, '2026-11-27'), []);
  assert.deepEqual(currentMonthOptionContracts(contracts, '2026-12-01').map((item) => item.instrument_key), ['next-month']);
});

test('distinguishes no contracts from API errors and invalid responses', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ data: [] });
    assert.deepEqual(await fetchOptionContracts('NSE_EQ|ABC'), []);
    globalThis.fetch = async () => Response.json({ statusText: 'Token expired' }, { status: 401 });
    await assert.rejects(fetchOptionContracts('NSE_EQ|ABC'), /Token expired/);
    globalThis.fetch = async () => Response.json({ status: 'ok' });
    await assert.rejects(fetchOptionContracts('NSE_EQ|ABC'), /Invalid option contracts response/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
