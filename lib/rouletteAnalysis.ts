import { getColumn } from './constants';
import { PatternAnalysis, Signal, AnalysisResult } from '../types';

export { getColumn };

export function calculateUnitValue(bankroll: number, targetPercentage: number, availableChips: number[]): number {
  const maxLoss = (bankroll * targetPercentage) / 100;
  const rawUnit = maxLoss / 12; 
  
  let closestChip = availableChips[0];
  for (const chip of availableChips) {
    if (chip <= rawUnit) {
      closestChip = chip;
    } else {
      break;
    }
  }
  return closestChip;
}

export function analyzePatterns(numbers: number[]): PatternAnalysis {
  const last15 = numbers.slice(0, 15);
  const columns = last15.map(n => getColumn(n)).filter(c => c > 0);
  const counts = { 1: 0, 2: 0, 3: 0 };
  columns.forEach(c => { if(c > 0) counts[c as 1|2|3]++ });

  let alternatingCount = 0;
  for (let i = 0; i < columns.length - 2; i++) {
    if (columns[i] === columns[i + 2] && columns[i] !== columns[i + 1]) {
      alternatingCount++;
    }
  }
  const hasAlternatingPattern = alternatingCount >= 4;

  let maxRepetition = 1;
  let currentRep = 1;
  for (let i = 1; i < columns.length; i++) {
    if (columns[i] === columns[i - 1]) {
      currentRep++;
      maxRepetition = Math.max(maxRepetition, currentRep);
    } else {
      currentRep = 1;
    }
  }
  const hasRepetitionPattern = maxRepetition >= 3;

  let hotColumn: number | null = null;
  let coldColumn: number | null = null;
  let maxCount = -1;
  let minCount = 99;

  ([1, 2, 3] as const).forEach(col => {
      if (counts[col] > maxCount) { maxCount = counts[col]; hotColumn = col; }
      if (counts[col] < minCount) { minCount = counts[col]; coldColumn = col; }
  });

  let recentTrend: 'up' | 'down' | 'stable' = 'stable';
  if (hotColumn) {
      const recentCount = columns.slice(0, 5).filter(c => c === hotColumn).length;
      if (recentCount >= 3) recentTrend = 'up';
      else if (recentCount <= 1) recentTrend = 'down';
  }

  let patternStrength = 0;
  if (hasAlternatingPattern) patternStrength += 20;
  if (hasRepetitionPattern) patternStrength += 25;
  if (hotColumn) patternStrength += (counts[hotColumn as 1|2|3] / columns.length) * 50;
  if (recentTrend === 'up') patternStrength += 15;

  return {
    hasAlternatingPattern,
    hasRepetitionPattern,
    hotColumn,
    coldColumn,
    recentTrend,
    patternStrength: Math.min(patternStrength, 100)
  };
}

export function performFullAnalysis(numbers: number[], consecutiveLosses: number): AnalysisResult {
  const last20 = numbers.slice(0, 20);
  const valid20 = last20.filter(n => getColumn(n) > 0);
  const totalValid = valid20.length || 1;
  
  // Calculate raw percentages for UI
  const getPct = (col: number) => {
    const count = valid20.filter(n => getColumn(n) === col).length;
    return (count / totalValid) * 100;
  };
  
  const stats = {
      col1: getPct(1),
      col2: getPct(2),
      col3: getPct(3),
      last5Zeros: numbers.slice(0, 5).filter(n => n === 0).length
  };

  // We pass 0 for consecutiveLosses to generateSignal here to match the logic 
  // used in the recalculate loop. We want objective signals.
  const signal = generateSignal(numbers, 0); 
  const patterns = analyzePatterns(numbers);

  // Derive checklist state based on the signal column if active, or hot column
  const targetCol = signal ? signal.column : (patterns.hotColumn || 1);
  const last7 = numbers.slice(0, 7);
  const colCount7 = last7.filter(n => getColumn(n) === targetCol).length;
  
  // Streak
  let streak = 0;
  for (const n of numbers.slice(0, 10)) {
      if (getColumn(n) === targetCol) streak++;
      else if (getColumn(n) !== 0) break;
  }

  // Echo
  const appearances: number[] = [];
  numbers.slice(0, 10).forEach((n, idx) => {
      if (getColumn(n) === targetCol) appearances.push(idx);
  });
  const hasEcho = appearances.length >= 2 && (appearances[1] - appearances[0] >= 2 && appearances[1] - appearances[0] <= 4);
  
  // Continuity: 2+ in last 4
  const last4 = numbers.slice(0, 4);
  const continuity = last4.filter(n => getColumn(n) === targetCol).length >= 2;

  // Momentum: 2+ in last 3
  const last3 = numbers.slice(0, 3);
  const momentum = last3.filter(n => getColumn(n) === targetCol).length >= 2;

  const checks = {
      dominance: stats[`col${targetCol as 1|2|3}`] >= 35,
      pressure: colCount7 >= 4,
      continuity,
      momentum,
      hotZone: patterns.hotColumn === targetCol && patterns.recentTrend === 'up',
      streak: streak >= 2,
      echo: hasEcho,
      pattern: patterns.hasAlternatingPattern || patterns.hasRepetitionPattern,
      noBlocks: (signal?.blocks.length || 0) === 0,
      progressionSafe: consecutiveLosses < 2
  };

  return { stats, checks, signal };
}


export function generateSignal(numbers: number[], consecutiveLosses: number): Signal | null {
  if (numbers.length < 5) return null; // Need minimum history

  const patterns = analyzePatterns(numbers);
  const activeTriggers: string[] = [];
  const activeBlocks: string[] = [];
  
  // CALIBRATION: SNIPER MODE
  // Focus heavily on recent activity (last 5-7) rather than long history (last 20)
  
  let bestColumn = { col: 0, score: -100, stats: {} as any };

  ([1, 2, 3] as const).forEach(col => {
    const last20 = numbers.slice(0, 20);
    const last7 = numbers.slice(0, 7);
    const last5 = numbers.slice(0, 5);
    const last3 = numbers.slice(0, 3);

    const valid20 = last20.filter(n => getColumn(n) > 0);
    
    const count20 = valid20.filter(n => getColumn(n) === col).length;
    const percentage = valid20.length > 0 ? (count20 / valid20.length) * 100 : 0;
    
    // Base Score: Reduced weight of long-term history
    let score = percentage * 0.8; 
    
    const count7 = last7.filter(n => getColumn(n) === col).length;
    const count5 = last5.filter(n => getColumn(n) === col).length;
    const count3 = last3.filter(n => getColumn(n) === col).length;
    
    // Momentum Scoring (Sniper Logic)
    if (count3 >= 2) score += 25; // High priority for immediate momentum
    if (count5 >= 3) score += 20; // Strong short-term trend
    if (count7 >= 4) score += 15; // Sustained pressure

    // Repetition/Streak Scoring
    let streak = 0;
    for (const n of numbers.slice(0, 10)) {
        if (getColumn(n) === col) streak++;
        else if (getColumn(n) !== 0) break;
    }
    if (streak >= 2) score += streak * 15; 

    // Pattern Scoring
    if (patterns.hotColumn === col && patterns.recentTrend === 'up') {
        score += 20;
    }

    // DEAD TREND FILTER:
    // If a column has high percentage but hasn't appeared in the last 5 spins (count5 < 1), 
    // punish it severely. It's likely cooling down.
    if (count5 < 2) {
        score -= 50; 
    }

    if (score > bestColumn.score) {
        bestColumn = { col, score, stats: { percentage, count7, count5, count3 } };
    }
  });

  const targetCol = bestColumn.col;
  if (targetCol === 0) return null;

  // --- REVISED SIGNAL CRITERIA (SNIPER MODE) ---
  
  // 1. Min Percent logic (Lowered slightly because we rely more on momentum now)
  if (bestColumn.stats.percentage < 25) return null;

  // 2. Strict Momentum Check
  // Must have 2 hits in last 4 (Continuity) OR Extreme Pressure (4 in last 7)
  // This prevents entering on a "maybe" signal.
  const last4 = numbers.slice(0, 4);
  const continuity = last4.filter(n => getColumn(n) === targetCol).length >= 2;
  const isExtremePressure = bestColumn.stats.count7 >= 4;
  
  // If no continuity AND no extreme pressure, wait.
  if (!continuity && !isExtremePressure) return null;

  // Add triggers text
  if (isExtremePressure) activeTriggers.push("Pressão Extrema (4+/7)");
  else if (bestColumn.stats.count7 >= 3) activeTriggers.push("Pressão Estável");

  if (continuity) activeTriggers.push("Continuidade (2 em 4)");
  
  if (bestColumn.stats.count3 >= 2) activeTriggers.push("Momentum Imediato");

  if (bestColumn.stats.percentage >= 45) activeTriggers.push("Alta Dominância");
  
  // Calculate Confidence
  let confidence = Math.min(bestColumn.score * 0.9, 65); // Cap base confidence
  
  if (activeTriggers.length >= 2) confidence += 20;
  if (patterns.hasRepetitionPattern) confidence += 10;
  if (isExtremePressure) confidence += 15;
  if (continuity) confidence += 10;

  // Zeros Block
  // Stricter: 2 zeros in 10 is risky, 2 in 5 is a block.
  const last10 = numbers.slice(0, 10);
  const zerosIn5 = numbers.slice(0, 5).filter(n => n === 0).length;
  
  if (zerosIn5 >= 1) {
       // Just one zero in recent history lowers confidence significantly in Sniper Mode
       confidence -= 20;
       if (zerosIn5 >= 2) {
           activeBlocks.push("Instabilidade (Zeros)");
       }
  }

  confidence = Math.min(Math.max(confidence, 0), 100);

  // Filter out low confidence signals entirely in Sniper Mode
  if (confidence < 60) return null; 

  let level: Signal['level'] = 'WEAK';
  if (confidence >= 90) level = 'STRONG';
  else if (confidence >= 75) level = 'GOOD';
  else if (confidence >= 60) level = 'MEDIUM';

  const isValid = activeBlocks.length === 0;

  return {
      column: targetCol,
      confidence: Math.round(confidence),
      triggers: activeTriggers,
      blocks: activeBlocks,
      isValid,
      level
  };
}