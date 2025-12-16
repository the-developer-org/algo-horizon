import { NextRequest, NextResponse } from 'next/server';
import { Candle } from '../../../components/types/candle';
import { calculateAllSwingPoints, createProcessedCompanyObject, fetchAllTimeframeData } from '@/utils/swingsCalculation';

// Interface for swing point data
export interface SwingPoint {
    time: number;
    price: number;
    label: 'HH' | 'HL' | 'LH' | 'LL';
    timestamp: string;
    candle: Candle;
    index: number;
}

// Function to parse timestamp to Unix format for TradingView
const parseTimestampToUnix = (timestamp: string): number => {
    // Handle multiple timestamp formats
    let date: Date;

    if (!timestamp.includes('T')) {
        // If no 'T', assume it's already a date string, return as-is
        const unixTimestamp = Math.floor(new Date(timestamp).getTime() / 1000);
        return unixTimestamp;
    }   // Treat the stripped timestamp as UTC by adding +00:00
    // This ensures consistent behavior across all timeframes and prevents date shifting

    const utcTimestamp = timestamp + '+00:00';
    const unixTimestamp = Math.floor(new Date(utcTimestamp).getTime() / 1000);


    return unixTimestamp;
};


export async function POST(request: NextRequest) {
    try {
        const {lookback = 5, instrumentKey, companyName, fromDate, timeFrameSelection} = await request.json();

        //console.log('🎯 SWING POINTS API CALLED');
        //console.log('📝 Request params:', { instrumentKey, companyName, fromDate, lookback });

        debugger
        if (!instrumentKey || !companyName) {
            return NextResponse.json(
                { error: 'instrumentKey and companyName are required' },
                { status: 400 }
            );
        }

        const today = new Date();
        const toDate = today.toISOString().split('T')[0];

      const selectedTimeframes = {
            "15Min": timeFrameSelection.min15,
            "1H": timeFrameSelection.hour1,
            "4H": timeFrameSelection.hour4,
            "1D": timeFrameSelection.day1,
        };

        let processedCompany = null;
        const { dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed } =
            await fetchAllTimeframeData(instrumentKey, fromDate, toDate, selectedTimeframes);


        const hasAnyData = [dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed].some(arr => Array.isArray(arr) && arr.length > 0);

        if (hasAnyData) {
            // Calculate swing points only for selected frames
            const { swingPointsDay, swingPoints4H, swingPoints1H, swingPoints15Min } =
                calculateAllSwingPoints(dailyDataReversed, hourly4DataReversed, hourly1DataReversed, fifteenMinuteDataReversed, selectedTimeframes);

            // Create processed company object using utility function
            processedCompany = createProcessedCompanyObject(
                instrumentKey,
                companyName,
                1,
                swingPointsDay,
                swingPoints4H,
                swingPoints1H,
                swingPoints15Min
            );
        }

        return NextResponse.json(processedCompany);

    } catch (error) {
        console.error('Error calculating swing points:', error);
        return NextResponse.json(
            { error: 'Failed to calculate swing points' },
            { status: 500 }
        );
    }
}