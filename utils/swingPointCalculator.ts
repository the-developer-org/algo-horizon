import { Candle } from '../components/types/candle';

// Function to parse timestamp to Unix format for TradingView
export const parseTimestampToUnix = (timestamp: string): number => {
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


// Interface for swing point data
export interface SwingPoint {
    time: number;
    price: number;
    label: 'HH' | 'HL' | 'LH' | 'LL';
    timestamp: string;
    candle: Candle;
    index: number;
}

// Function to calculate swing points directly from OHLC data
export const calculateSwingPointsFromCandles = (candles: Candle[], lookback: number = 5): SwingPoint[] => {
    if (candles.length < lookback * 2 + 1) {
        ////console.log('❌ Insufficient candles for swing point calculation');
        return [];
    }

    // First, identify all potential swing highs and lows
    const potentialSwings: any[] = [];
    
    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentCandle = candles[i];
        const currentHigh = currentCandle.high;
        const currentLow = currentCandle.low;
        
        // Check for swing high (current high is higher than lookback candles on both sides)
        let isSwingHigh = true;
        let isSwingLow = true;
        
        for (let j = 1; j <= lookback; j++) {
            // Check left side
            if (candles[i - j].high >= currentHigh) {
                isSwingHigh = false;
            }
            if (candles[i - j].low <= currentLow) {
                isSwingLow = false;
            }
            
            // Check right side
            if (candles[i + j].high >= currentHigh) {
                isSwingHigh = false;
            }
            if (candles[i + j].low <= currentLow) {
                isSwingLow = false;
            }
        }
        
        if (isSwingHigh) {
            potentialSwings.push({
                time: parseTimestampToUnix(currentCandle.timestamp),
                price: currentHigh,
                type: 'high',
                timestamp: currentCandle.timestamp,
                candle: currentCandle,
                index: i
            });
        }
        
        if (isSwingLow) {
            potentialSwings.push({
                time: parseTimestampToUnix(currentCandle.timestamp),
                price: currentLow,
                type: 'low',
                timestamp: currentCandle.timestamp,
                candle: currentCandle,
                index: i
            });
        }
    }
    
    // Sort potential swings chronologically
    potentialSwings.sort((a, b) => a.time - b.time);
    
    // Apply proper swing labeling logic
    const swingPoints: any[] = [];
    
    for (let i = 0; i < potentialSwings.length; i++) {
        const current = potentialSwings[i];
        let label = '';
        
        if (current.type === 'high') {
            // Find the last swing high
            const lastSwingHigh = [...swingPoints].reverse().find(p => p.label === 'HH' || p.label === 'LH');
            
            if (!lastSwingHigh) {
                label = 'HH'; // First high
            } else {
                label = current.price > lastSwingHigh.price ? 'HH' : 'LH';
            }
        } else { // current.type === 'low'
            // Find the last swing low
            const lastSwingLow = [...swingPoints].reverse().find(p => p.label === 'HL' || p.label === 'LL');
            
            if (!lastSwingLow) {
                label = 'HL'; // First low
            } else {
                label = current.price > lastSwingLow.price ? 'HL' : 'LL';
            }
        }
        
        swingPoints.push({
            time: current.time,
            price: current.price,
            label,
            timestamp: current.timestamp,
            candle: current.candle,
            index: current.index
        });
    }
    
    // Now fix missing alternating points
    const finalSwingPoints: any[] = [];
    
    for (let i = 0; i < swingPoints.length; i++) {
        const current = swingPoints[i];
        
        if (finalSwingPoints.length > 0) {
            const last = finalSwingPoints[finalSwingPoints.length - 1];
            
            // Check if we have consecutive points of same type
            const lastIsHigh = last.label === 'HH' || last.label === 'LH';
            const currentIsHigh = current.label === 'HH' || current.label === 'LH';
            
            if (lastIsHigh === currentIsHigh) {
                // Same type consecutive - need to insert missing alternating point
                const startIndex = last.index;
                const endIndex = current.index;
                
                if (lastIsHigh) {
                    // Both are highs, need to find lowest point between them
                    let lowestPrice = Infinity;
                    let lowestCandle = null;
                    let lowestIndex = -1;
                    
                    for (let j = startIndex + 1; j < endIndex; j++) {
                        if (candles[j].low < lowestPrice) {
                            lowestPrice = candles[j].low;
                            lowestCandle = candles[j];
                            lowestIndex = j;
                        }
                    }
                    
                    if (lowestCandle) {
                        // Determine if it's HL or LL
                        const lastSwingLow = [...finalSwingPoints].reverse().find(p => p.label === 'HL' || p.label === 'LL');
                        const lowLabel = !lastSwingLow || lowestPrice > lastSwingLow.price ? 'HL' : 'LL';
                        
                        finalSwingPoints.push({
                            time: parseTimestampToUnix(lowestCandle.timestamp),
                            price: lowestPrice,
                            label: lowLabel,
                            timestamp: lowestCandle.timestamp,
                            candle: lowestCandle,
                            index: lowestIndex
                        });
                    }
                } else {
                    // Both are lows, need to find highest point between them
                    let highestPrice = -Infinity;
                    let highestCandle = null;
                    let highestIndex = -1;
                    
                    for (let j = startIndex + 1; j < endIndex; j++) {
                        if (candles[j].high > highestPrice) {
                            highestPrice = candles[j].high;
                            highestCandle = candles[j];
                            highestIndex = j;
                        }
                    }
                    
                    if (highestCandle) {
                        // Determine if it's HH or LH
                        const lastSwingHigh = [...finalSwingPoints].reverse().find(p => p.label === 'HH' || p.label === 'LH');
                        const highLabel = !lastSwingHigh || highestPrice > lastSwingHigh.price ? 'HH' : 'LH';
                        
                        finalSwingPoints.push({
                            time: parseTimestampToUnix(highestCandle.timestamp),
                            price: highestPrice,
                            label: highLabel,
                            timestamp: highestCandle.timestamp,
                            candle: highestCandle,
                            index: highestIndex
                        });
                    }
                }
            }
        }
        
        finalSwingPoints.push(current);
    }
    
    // Sort final swing points chronologically and re-label them correctly
    finalSwingPoints.sort((a, b) => a.time - b.time);
    
    // Re-label all swing points to ensure correct HH/HL/LH/LL classification
    for (let i = 0; i < finalSwingPoints.length; i++) {
        const current = finalSwingPoints[i];
        const isHigh = current.label === 'HH' || current.label === 'LH';
        
        if (isHigh) {
            // Find the most recent swing high before this one
            let lastSwingHigh = null;
            for (let j = i - 1; j >= 0; j--) {
                if (finalSwingPoints[j].label === 'HH' || finalSwingPoints[j].label === 'LH') {
                    lastSwingHigh = finalSwingPoints[j];
                    break;
                }
            }
            
            if (!lastSwingHigh) {
                current.label = 'HH'; // First high
            } else {
                current.label = current.price > lastSwingHigh.price ? 'HH' : 'LH';
            }
        } else {
            // Find the most recent swing low before this one
            let lastSwingLow = null;
            for (let j = i - 1; j >= 0; j--) {
                if (finalSwingPoints[j].label === 'HL' || finalSwingPoints[j].label === 'LL') {
                    lastSwingLow = finalSwingPoints[j];
                    break;
                }
            }
            
            if (!lastSwingLow) {
                current.label = 'HL'; // First low
            } else {
                current.label = current.price > lastSwingLow.price ? 'HL' : 'LL';
            }
        }
    }

    // //console log all swing points in descending order by price
    if (finalSwingPoints.length > 0) {
        ////console.log('\n🔥 SWING POINTS ANALYSIS (Calculated from OHLC - Descending Order by Price):');
        ////console.log('=' .repeat(70));
        
        const sortedSwingPoints = [...finalSwingPoints].sort((a, b) => b.price - a.price);
        
        sortedSwingPoints.forEach((point, index) => {
            const date = new Date(point.timestamp).toLocaleDateString();
            const time = new Date(point.timestamp).toLocaleTimeString();
            ////console.log(`${index + 1}. ${point.label} - ₹${point.price.toFixed(2)} | ${date} ${time} | Candle #${point.index}`);
        });
        
        // Separate swing points by type
        const hhPoints = finalSwingPoints.filter(p => p.label === 'HH');
        const lhPoints = finalSwingPoints.filter(p => p.label === 'LH');
        const hlPoints = finalSwingPoints.filter(p => p.label === 'HL');
        const llPoints = finalSwingPoints.filter(p => p.label === 'LL');
        
        ////console.log('\n📊 SWING POINTS BY TYPE:');
        ////console.log(`🟢 HH (Higher Highs): ${hhPoints.length} points`);
        ////console.log(`🔴 LH (Lower Highs): ${lhPoints.length} points`);
        ////console.log(`🟡 HL (Higher Lows): ${hlPoints.length} points`);
        ////console.log(`🔵 LL (Lower Lows): ${llPoints.length} points`);
        
        ////console.log('\n📅 SWING POINTS CHRONOLOGICAL ORDER:');
        finalSwingPoints.forEach((point, index) => {
            const date = new Date(point.timestamp).toLocaleDateString();
            const time = new Date(point.timestamp).toLocaleTimeString();
            ////console.log(`${index + 1}. ${point.label} - ₹${point.price.toFixed(2)} | ${date} ${time} | Candle #${point.index}`);
        });
        ////console.log('=' .repeat(70));
    }
    
    return finalSwingPoints;
};
