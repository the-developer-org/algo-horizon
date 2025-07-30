export interface BackTest {
  entryTime: string;
  boomDay: string; // LocalDate comes as string from API
  volumeExceptions: number;
  entryPrice: number;
  exitPrice: number;
  exitTime: string;
  timeTaken: number;
  boomDayVolume: number;
  status: string;
  volumeExceptionsExceeded?: boolean; // Added from Java backend
  isInDownTrend?: boolean; // Added from Java backend
  percCandleMissing?: boolean; // Added from Java backend
  support?: number; // Support level
  resistance?: number; // Resistance level
  multiplier?: number; // Added multiplier value
}
