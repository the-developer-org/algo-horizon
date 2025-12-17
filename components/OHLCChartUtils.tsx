import axios from "axios";
import { SwingPoints, SwingPointsApiResponse, SwingStatsRequest } from "./types/OHLCChartTypes";

// Helper function for 4-point analysis
function analyzeFourPoints(fourth: string, third: string, second: string, first: string) {
  // Strong Bullish Patterns (4 points)
  // Pattern: Uptrend establishment and continuation
  if (fourth === 'LL' && third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Classic uptrend: LL->HL->HH->HL (pullback in uptrend)
  }
  if (fourth === 'LL' && third === 'LH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Recovery: LL->LH->HL->HH (reversal from downtrend)
  }
  if (fourth === 'LH' && third === 'LL' && second === 'HL' && first === 'HH') {
    return 'bullish'; // V-shaped recovery: LH->LL->HL->HH
  }
  if (fourth === 'HL' && third === 'HH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Strong uptrend: HL->HH->HL->HH (healthy pullbacks)
  }

  // Strong Bearish Patterns (4 points)
  // Pattern: Downtrend establishment and continuation
  if (fourth === 'HH' && third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Classic downtrend: HH->LH->LL->LH (pullback in downtrend)
  }
  if (fourth === 'HH' && third === 'HL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Breakdown: HH->HL->LH->LL (reversal from uptrend)
  }
  if (fourth === 'HL' && third === 'HH' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Inverted V breakdown: HL->HH->LH->LL
  }
  if (fourth === 'LH' && third === 'LL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Strong downtrend: LH->LL->LH->LL (weak rallies)
  }

  // Additional 4-point patterns for completeness
  if (fourth === 'HH' && third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Continued uptrend with healthy pullbacks
  }
  if (fourth === 'LL' && third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Continued downtrend with weak rallies
  }

  // Fall back to 3-point analysis if no 4-point pattern matches
  return analyzeThreePoints(third, second, first);
}

// Helper function for 3-point analysis
function analyzeThreePoints(third: string, second: string, first: string) {
  // Strong Bullish 3-point patterns
  if (third === 'LL' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Clear uptrend: LL->HL->HH
  }
  if (third === 'LH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Reversal to uptrend: LH->HL->HH
  }
  if (third === 'HL' && second === 'HH' && first === 'HL') {
    return 'bullish'; // Uptrend with pullback: HL->HH->HL
  }
  if (third === 'LL' && second === 'LH' && first === 'HL') {
    return 'bullish'; // Early reversal signs: LL->LH->HL
  }

  // Strong Bearish 3-point patterns
  if (third === 'HH' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Clear downtrend: HH->LH->LL
  }
  if (third === 'HL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Reversal to downtrend: HL->LH->LL
  }
  if (third === 'LH' && second === 'LL' && first === 'LH') {
    return 'bearish'; // Downtrend with pullback: LH->LL->LH
  }
  if (third === 'HH' && second === 'HL' && first === 'LH') {
    return 'bearish'; // Early breakdown signs: HH->HL->LH
  }

  // Consolidation/Mixed patterns (neutral bias but lean toward recent action)
  if (third === 'HH' && second === 'HL' && first === 'HH') {
    return 'bullish'; // Consolidation in uptrend, likely to continue up
  }
  if (third === 'LL' && second === 'LH' && first === 'LL') {
    return 'bearish'; // Consolidation in downtrend, likely to continue down
  }
  if (third === 'HL' && second === 'LH' && first === 'HL') {
    return 'neutral'; // True consolidation - mixed signals
  }
  if (third === 'LH' && second === 'HL' && first === 'LH') {
    return 'neutral'; // True consolidation - mixed signals
  }

  // Fall back to 2-point analysis
  return analyzeTwoPoints(second, first);
}

// Helper function for 2-point analysis
function analyzeTwoPoints(second: string, first: string) {
  // Bullish 2-point combinations
  if (first === 'HH') {
    if (second === 'HL') return 'bullish';  // HL->HH: Perfect uptrend sequence
    if (second === 'HH') return 'neutral';  // HH->HH: Sideways at highs (could go either way)
    if (second === 'LH') return 'bullish';  // LH->HH: Strong reversal upward
    if (second === 'LL') return 'bullish';  // LL->HH: Very strong reversal upward
  }

  if (first === 'HL') {
    if (second === 'HH') return 'bullish';  // HH->HL: Healthy pullback in uptrend
    if (second === 'HL') return 'neutral';  // HL->HL: Sideways at support (consolidation)
    if (second === 'LH') return 'neutral';  // LH->HL: Potential trend change (wait for confirmation)
    if (second === 'LL') return 'bullish';  // LL->HL: Recovery from lows
  }

  // Bearish 2-point combinations
  if (first === 'LH') {
    if (second === 'LL') return 'bearish';  // LL->LH: Perfect downtrend sequence
    if (second === 'LH') return 'neutral';  // LH->LH: Sideways at lows (could go either way)
    if (second === 'HL') return 'bearish';  // HL->LH: Strong reversal downward
    if (second === 'HH') return 'bearish';  // HH->LH: Very strong reversal downward
  }

  if (first === 'LL') {
    if (second === 'LH') return 'bearish';  // LH->LL: Healthy pullback in downtrend
    if (second === 'LL') return 'neutral';  // LL->LL: Sideways at lows (consolidation)
    if (second === 'HL') return 'neutral';  // HL->LL: Potential trend change (wait for confirmation)
    if (second === 'HH') return 'bearish';  // HH->LL: Breakdown from highs
  }

  return 'neutral';
}

// Helper function for single point analysis
function analyzeSinglePoint(singlePoint: string) {
  // Single point analysis - limited information, lean based on point type
  if (singlePoint === 'HH') return 'bullish';    // New high is bullish
  if (singlePoint === 'HL') return 'bullish';    // Higher low is bullish
  if (singlePoint === 'LH') return 'bearish';    // Lower high is bearish
  if (singlePoint === 'LL') return 'bearish';    // New low is bearish
  return 'neutral';
}

function analyzeSwingPointTrend(lastSwingPoints: any[]) {
  if (!lastSwingPoints || lastSwingPoints.length === 0) {
    return 'neutral';
  }

  // 4 Swing Points Analysis - Most Comprehensive
  if (lastSwingPoints.length === 4) {
    const [fourth, third, second, first] = lastSwingPoints.map(sp => sp.label);

    return analyzeFourPoints(fourth, third, second, first);
  }

  // 3 Swing Points Analysis
  else if (lastSwingPoints.length === 3) {
    const [third, second, first] = lastSwingPoints.map(sp => sp.label);
    return analyzeThreePoints(third, second, first);
  }

  // 2 Swing Points Analysis
  else if (lastSwingPoints.length === 2) {
    const [second, first] = lastSwingPoints.map(sp => sp.label);
    return analyzeTwoPoints(second, first);
  }

  // Single Swing Point Analysis
  else if (lastSwingPoints.length === 1) {
    const singlePoint = lastSwingPoints[0].label;
    return analyzeSinglePoint(singlePoint);
  }

  return 'neutral';
}

async function fetchSwingPointsForStock(swingStatsRequest: SwingStatsRequest): Promise<SwingPoints[]> {
  try {

    let baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const response = await axios.post<SwingPointsApiResponse>(
      `${baseUrl}/api/historical-data/get-swing-stats`,
      swingStatsRequest,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("Swing Points API Response:", response.data.swingPoints);
    return response.data.swingPoints;
  } catch (error) {
    console.error("Error fetching swing points:", error);
    return [];
  }
}


export {
  analyzeFourPoints,
  analyzeThreePoints,
  analyzeTwoPoints,
  analyzeSinglePoint,
  analyzeSwingPointTrend,
  fetchSwingPointsForStock
}