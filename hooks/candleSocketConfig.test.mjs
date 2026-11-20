import assert from 'node:assert/strict';
import test from 'node:test';
import { candlesSocketEnabled } from './candleSocketConfig.ts';

test('uses the live-candle socket only when the flag is exactly true', () => {
  assert.equal(candlesSocketEnabled(undefined), false);
  assert.equal(candlesSocketEnabled('false'), false);
  assert.equal(candlesSocketEnabled('TRUE'), false);
  assert.equal(candlesSocketEnabled('true'), true);
});
