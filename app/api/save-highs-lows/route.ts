import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { data, timeframeYears, processedAt } = await request.json();

    // Log the received data for debugging
    console.log(`📥 Received highs/lows data for ${data.length} companies`);
    console.log(`🕐 Processed at: ${processedAt}`);
    console.log(`📅 Timeframe: ${timeframeYears} years`);

    // Here you would typically save to your database
    // For now, we'll just log and return success
    
    // Example of processing the data:
    const summary = {
      totalCompanies: data.length,
      alphabetsProcessed: [...new Set(data.map((item: any) => item.alphabet))],
      averageSwingPoints: data.reduce((sum: number, item: any) => sum + item.swingPoints.length, 0) / data.length,
      dateRange: data[0]?.dateRange,
      processedAt,
      timeframeYears
    };

    // Log sample of the data structure
    console.log('📊 Sample processed company data:', data[0]);
    console.log('📈 Processing summary:', summary);

    // In a real implementation, you would save to your database here
    // Example:
    // await db.collection('highs-lows').insertMany(data);
    // await db.collection('processing-summary').insertOne(summary);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${data.length} companies`,
      summary,
      processedCount: data.length
    });

  } catch (error) {
    console.error('❌ Error saving highs/lows data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save processed data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
