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
}
