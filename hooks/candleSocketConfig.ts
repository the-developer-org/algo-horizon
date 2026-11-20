export function candlesSocketEnabled(allDay = process.env.NEXT_PUBLIC_CANDLES_ALL_DAY) {
  return allDay === 'true';
}
