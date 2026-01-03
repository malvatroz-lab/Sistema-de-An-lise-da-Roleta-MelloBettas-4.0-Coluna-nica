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
  
  let bestColumn = { col: 0, score: -100, stats: {} as any };

  ([1, 2, 3] as const).forEach(col => {
    const last20 = numbers.slice(0, 20);
    const last7 = numbers.slice(0, 7);
    const last5 = numbers.slice(0, 5);
    const valid20 = last20.filter(n => getColumn(n) > 0);
    
    const count20 = valid20.filter(n => getColumn(n) === col).length;
    const percentage = valid20.length > 0 ? (count20 / valid20.length) * 100 : 0;
    
    // Scoring logic
    let score = percentage * 1.2;
    const count5 = last5.filter(n => getColumn(n) === col).length;
    
    // Recent activity boosts score significantly
    if (count5 >= 2) score += 15;
    if (count5 >= 3) score += 20; // Boosted
    if (count5 >= 4) score += 30; // Strong Boost for strict streak
    
    const appearances: number[] = [];
    numbers.slice(0, 10).forEach((n, idx) => {
        if (getColumn(n) === col) appearances.push(idx);
    });
    if (appearances.length >= 2) {
        const gap = appearances[1] - appearances[0];
        if (gap >= 2 && gap <= 4) score += 12;
    }

    let streak = 0;
    for (const n of numbers.slice(0, 10)) {
        if (getColumn(n) === col) streak++;
        else if (getColumn(n) !== 0) break;
    }
    if (streak >= 2) score += streak * 10; 

    if (patterns.hotColumn === col) {
        score += 15;
        if (patterns.recentTrend === 'up') score += 10;
    }

    if (score > bestColumn.score) {
        bestColumn = { col, score, stats: { percentage, last7Count: last7.filter(n => getColumn(n) === col).length, count5 } };
    }
  });

  const targetCol = bestColumn.col;
  if (targetCol === 0) return null;

  // --- REVISED SIGNAL CRITERIA ---
  
  // 1. Min Percent logic
  const minPercent = bestColumn.stats.count5 >= 4 ? 20 : 30;
  if (bestColumn.stats.percentage < minPercent) return null;

  // 2. Momentum vs Dominance Trade-off
  const isHighPressure = bestColumn.stats.last7Count >= 4;
  const isGoodPressure = bestColumn.stats.last7Count >= 3;
  const isHighDominance = bestColumn.stats.percentage >= 40;
  
  const hasEntryCondition = isHighPressure || (isHighDominance && isGoodPressure) || (bestColumn.stats.count5 >= 3);

  if (!hasEntryCondition) return null;

  // Add triggers text
  if (isHighPressure) activeTriggers.push("Pressão Intensa (4/7)");
  else if (isGoodPressure) activeTriggers.push("Pressão Moderada (3/7)");
  else if (bestColumn.stats.count5 >= 3) activeTriggers.push("Tendência Recente");

  if (bestColumn.stats.percentage >= 45) activeTriggers.push("Alta Dominância");
  
  const last4 = numbers.slice(0, 4);
  if(last4.filter(n => getColumn(n) === targetCol).length >= 2) {
      activeTriggers.push("Continuidade");
  }

  // Calculate Confidence
  let confidence = Math.min(bestColumn.score * 0.8, 60);
  if (activeTriggers.length >= 1) confidence += 15;
  if (activeTriggers.length >= 2) confidence += 10;
  if (patterns.hasRepetitionPattern) confidence += 10;
  if (isHighPressure) confidence += 15;

  // Check Blocks - Simplified to only care about Zeros
  const last5 = numbers.slice(0, 5);
  if (last5.filter(n => n === 0).length >= 2) {
      activeBlocks.push("Excesso de Zeros");
      confidence -= 30;
  }
  
  // REMOVED: The logic that blocked betting based on `consecutiveLosses`.
  // This ensures that if the stats say "Go", we Go, regardless of previous cycle loss.

  confidence = Math.min(Math.max(confidence, 0), 100);

  let level: Signal['level'] = 'WEAK';
  if (confidence >= 85) level = 'STRONG';
  else if (confidence >= 65) level = 'GOOD';
  else if (confidence >= 50) level = 'MEDIUM';

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