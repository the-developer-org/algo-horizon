import { fetchUpstoxHistoricalData } from "@/components/utils/upstoxApi";
import { calculateSwingPointsFromCandles } from "./swingPointCalculator";

export const calculateDateRangeDynamic = (yearsBack : number) => {
    const today = new Date();
    const toDate = today.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

    const fromDateObj = new Date(today);
    fromDateObj.setFullYear(fromDateObj.getFullYear() - yearsBack); // X years back
    const fromDate = fromDateObj.toISOString().split('T')[0];

    return { fromDate, toDate };
};

export const fetchHourlyDataInChunks = async (instrumentKey: string, interval: string, fromDate: string, toDate: string, unit:string) => {
    const chunks = [];
    let currentFromDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
  
    while (currentFromDate < endDate) {
      const chunkToDate = new Date(currentFromDate);
    
      if (unit === "minutes" && interval === "15") {
        chunkToDate.setMonth(chunkToDate.getMonth() + 1);
      } else {
        chunkToDate.setMonth(chunkToDate.getMonth() + 3);
      }

      if (chunkToDate > endDate) {
        chunkToDate.setTime(endDate.getTime());
      }
      
      const chunkFromStr = currentFromDate.toISOString().split('T')[0];
      const chunkToStr = chunkToDate.toISOString().split('T')[0];
      
      try {
        const chunkData = await fetchUpstoxHistoricalData(
          instrumentKey,
          unit,
          interval,
          chunkToStr,
          chunkFromStr
        );
        
        if (chunkData.candles && chunkData.candles.length > 0) {
          chunks.push(...chunkData.candles);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error fetching ${interval}H chunk:`, error);
      }
      
      currentFromDate = new Date(chunkToDate);
      currentFromDate.setDate(currentFromDate.getDate() + 1);
    }
    
    return { candles: chunks };
  };

export const fetchAllTimeframeData = async (
    instrumentKey: string,
    fromDate: string,
    toDate: string,
    timeframes: { "15Min": boolean; "1H": boolean; "4H": boolean; "1D": boolean }
  ) => {
    // Return null for any timeframe not selected. Only fetch data for selected frames.
    let dailyDataReversed: any[] | null = null;
    let hourly4DataReversed: any[] | null = null;
    let hourly1DataReversed: any[] | null = null;
    let fifteenMinuteDataReversed: any[] | null = null;

    if (timeframes["1D"]) {
      const dailyData = await fetchUpstoxHistoricalData(
        instrumentKey,
        'days',
        '1',
        toDate,
        fromDate
      );
      dailyDataReversed = dailyData.candles.reverse();
    }

    if (timeframes["4H"]) {
      const hourly4Data = await fetchHourlyDataInChunks(instrumentKey, '4', fromDate, toDate, "hours");
      hourly4DataReversed = hourly4Data.candles.reverse();
    }

    if (timeframes["1H"]) {
      const hourly1Data = await fetchHourlyDataInChunks(instrumentKey, '1', fromDate, toDate, "hours");
      hourly1DataReversed = hourly1Data.candles.reverse();
    }

    if (timeframes["15Min"]) {
      const fifteenMinuteData = await fetchHourlyDataInChunks(instrumentKey, '15', fromDate, toDate, "minutes");
      fifteenMinuteDataReversed = fifteenMinuteData.candles.reverse();
    }

    return {
      dailyDataReversed,
      hourly4DataReversed,
      hourly1DataReversed,
      fifteenMinuteDataReversed
    };
  };


    // Utility function to calculate swing points for all timeframes
    export const calculateAllSwingPoints = (
      dailyData: any[] | null,
      hourly4Data: any[] | null,
      hourly1Data: any[] | null,
      fifteenMinData: any[] | null,
      timeframes: { "15Min": boolean; "1H": boolean; "4H": boolean; "1D": boolean }
    ) => {
      const swingPointsDay = timeframes["1D"] && dailyData && dailyData.length > 0
        ? calculateSwingPointsFromCandles(dailyData, 5)
        : null;
  
      const swingPoints4H = timeframes["4H"] && hourly4Data && hourly4Data.length > 0
        ? calculateSwingPointsFromCandles(hourly4Data, 5)
        : null;
  
      const swingPoints1H = timeframes["1H"] && hourly1Data && hourly1Data.length > 0
        ? calculateSwingPointsFromCandles(hourly1Data, 5)
        : null;
  
      const swingPoints15Min = timeframes["15Min"] && fifteenMinData && fifteenMinData.length > 0
        ? calculateSwingPointsFromCandles(fifteenMinData, 5)
        : null;
  
      return { swingPointsDay, swingPoints4H, swingPoints1H, swingPoints15Min };
    };
  
    // Utility function to create processed company object
    export const createProcessedCompanyObject = (
      instrumentKey: string,
      companyName: string,
      timeframe: number,
      swingPointsDay: any[] | null,
      swingPoints4H: any[] | null,
      swingPoints1H: any[] | null,
      swingPoints15Min: any[] | null
    ) => {
      return {
        instrumentKey,
        companyName,
        timeframe,
        swingPointsDay: swingPointsDay
          ? swingPointsDay.map((sp: any) => ({ timestamp: sp.timestamp, price: sp.price, label: sp.label, time: sp.time }))
          : null,
        swingPoints4H: swingPoints4H
          ? swingPoints4H.map((sp: any) => ({ timestamp: sp.timestamp, price: sp.price, label: sp.label, time: sp.time }))
          : null,
        swingPoints1H: swingPoints1H
          ? swingPoints1H.map((sp: any) => ({ timestamp: sp.timestamp, price: sp.price, label: sp.label, time: sp.time }))
          : null,
        swingPoints15Min: swingPoints15Min
          ? swingPoints15Min.map((sp: any) => ({ timestamp: sp.timestamp, price: sp.price, label: sp.label, time: sp.time }))
          : null,
      };
    };