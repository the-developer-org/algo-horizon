import assert from 'node:assert/strict';
import test from 'node:test';
import { indexForSector } from '../instrumentCatalog.ts';
import { indexConstituentNames, untrackedConstituents } from './indexConstituents.ts';

test('maps normalized websocket sector names as well as original symbols', () => {
  for (const [symbol, key] of [
    ['NIFTY_BANK', 'NIFTY_BANK'],
    ['BANKNIFTY', 'NIFTY_BANK'],
    ['NIFTYBANK', 'NIFTY_BANK'],
    ['NIFTY_AUTO', 'NIFTY_AUTO'],
    ['NIFTYAUTO', 'NIFTY_AUTO'],
    ['NIFTY', 'NIFTY_50'],
  ]) {
    assert.equal(indexForSector(symbol)?.key, key);
  }
  assert.equal(indexForSector('UNKNOWN_SECTOR'), undefined);
});

test('shows untracked constituents without duplicating tracked stocks or index keys', () => {
  const names = indexConstituentNames([
    'NSE_INDEX|Nifty Auto', 'Ashok Leyland Ltd.', 'Bajaj Auto Ltd.', '  BAJAJ AUTO LTD. ', '',
  ]);
  assert.deepEqual(names, ['Ashok Leyland Ltd.', 'Bajaj Auto Ltd.']);
  assert.deepEqual(untrackedConstituents(names, [' ASHOK LEYLAND LTD. ']), ['Bajaj Auto Ltd.']);
  assert.deepEqual(untrackedConstituents(names, names), []);
});
