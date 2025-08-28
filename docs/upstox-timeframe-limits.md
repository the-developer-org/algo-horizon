# Upstox API Timeframe Duration Limits

This document outlines the maximum duration limits for different timeframes when fetching historical data from the Upstox API.

## Duration Limits by Timeframe

| Timeframe | Unit | Interval | Max Duration | Example Date Range |
|-----------|------|----------|--------------|-------------------|
| 1m | minutes | 1 | 7 days | 2025-08-21 to 2025-08-28 |
| 5m | minutes | 5 | 30 days | 2025-07-29 to 2025-08-28 |
| 15m | minutes | 15 | 60 days | 2025-06-29 to 2025-08-28 |
| 30m | minutes | 30 | 90 days | 2025-05-30 to 2025-08-28 |
| 1h | hours | 1 | 90 days | 2025-05-30 to 2025-08-28 |
| 4h | hours | 4 | 180 days | 2024-02-29 to 2025-08-28 |
| 1d | days | 1 | 365 days | 2024-08-28 to 2025-08-28 |
| 1w | weeks | 1 | 1825 days | 2020-08-28 to 2025-08-28 |

## API URL Format

The Upstox API v3 uses the following URL structure:
```
https://api.upstox.com/v3/historical-candle/{instrument_key}/{unit}/{interval}/{to_date}/{from_date}
```

### Example URLs

**1-hour data (90 days max):**
```
https://api.upstox.com/v3/historical-candle/NSE_EQ%7CINE397D01024/hours/1/2025-08-27/2025-05-28
```

**Daily data (365 days max):**
```
https://api.upstox.com/v3/historical-candle/NSE_EQ%7CINE397D01024/days/1/2025-08-27/2024-08-27
```

**5-minute data (30 days max):**
```
https://api.upstox.com/v3/historical-candle/NSE_EQ%7CINE397D01024/minutes/5/2025-08-27/2025-07-28
```

## Usage with Enhanced Utilities

The updated `upstoxApi.ts` now includes several utilities to handle these limits automatically:

### 1. Automatic Duration Validation
```typescript
import { validateDateRangeForTimeframe } from '@/components/utils/upstoxApi';

const validation = validateDateRangeForTimeframe(
  '1h', 
  '2025-01-01', 
  '2025-08-27'
);

if (!validation.isValid) {
  console.log(validation.errorMessage);
  console.log(`Suggested fromDate: ${validation.suggestedFromDate}`);
}
```

### 2. Optimal Date Range Calculation
```typescript
import { calculateOptimalDateRange } from '@/components/utils/upstoxApi';

const range = calculateOptimalDateRange('1h'); // Gets optimal 60-day range for 1h data
console.log(`Use dates: ${range.fromDate} to ${range.toDate}`);
```

### 3. Automatic Range Adjustment
```typescript
import { fetchPaginatedUpstoxData } from '@/components/utils/upstoxApi';

// This will automatically adjust if the range is too large
const result = await fetchPaginatedUpstoxData({
  instrumentKey: 'NSE_EQ|INE397D01024',
  timeframe: '1h',
  from: '2025-01-01', // Will be auto-adjusted to fit 90-day limit
  to: '2025-08-27',
  apiKey: 'your-api-key'
});
```

## Error Prevention

The enhanced utilities help prevent common API errors:

1. **Duration Exceeded**: Automatically caps requests to maximum allowed duration
2. **Invalid Date Order**: Validates that fromDate is earlier than toDate
3. **Optimal Defaults**: Provides sensible default ranges for each timeframe
4. **Clear Warnings**: Logs detailed information about adjustments and limits

## Best Practices

1. **Use appropriate timeframes**: Don't request 1-minute data for long historical periods
2. **Check limits first**: Use `validateDateRangeForTimeframe()` before making requests
3. **Handle auto-adjustments**: Be aware that date ranges may be automatically adjusted
4. **Monitor console logs**: The utilities provide detailed logging for debugging
