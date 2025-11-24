import { NextRequest, NextResponse } from 'next/server';

interface CommentsDto {
  objectId: string;
  companyName: string;
  analysisType: string;
  diveRatio: number;
  comments: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CommentsDto = await request.json();

    // Validate required fields
    const { objectId, companyName, analysisType, diveRatio, comments } = body;
    if (!objectId || !companyName || !analysisType || typeof diveRatio !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'objectId, companyName, analysisType, and diveRatio are required'
        },
        { status: 400 }
      );
    }

    // Log the update for debugging
    console.log(`📝 Updating comments for ${companyName} (${analysisType}) - ObjectId: ${objectId}`);

    // Here you would typically save to your database
    // For now, we'll simulate the operation and return success
    // Example database operation:
    // await db.collection('analysis-comments').updateOne(
    //   { objectId },
    //   {
    //     $set: {
    //       companyName,
    //       analysisType,
    //       diveRatio,
    //       comments,
    //       updatedAt: new Date()
    //     }
    //   },
    //   { upsert: true }
    // );

    return NextResponse.json({
      success: true,
      message: `Comments updated successfully for ${companyName}`,
      data: {
        objectId,
        companyName,
        analysisType,
        diveRatio,
        comments,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error updating comments:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update comments',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}