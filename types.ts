
export interface BankrollConfig {
  initialBankroll: number;
  entryPercentage: number;
  minBet: number;
  currentBankroll: number;
  maxSteps: number; // Index limit for progression based on affordable bankroll
}

export type ChipValue = 0.50 | 2.50 | 10 | 50 | 250 | 1000;

export interface HistoryItem {
  number: number;
  timestamp: Date;
  column: number;
  isSimulation?: boolean; // If true, affects Stats but NOT Bankroll
}

export interface PatternAnalysis {
  hasAlternatingPattern: boolean;
  hasRepetitionPattern: boolean;
  hotColumn: number | null;
  coldColumn: number | null;
  recentTrend: 'up' | 'down' | 'stable';
  patternStrength: number;
}

export interface Signal {
  column: number;
  confidence: number;
  triggers: string[];
  blocks: string[];
  isValid: boolean;
  level: 'WEAK' | 'MEDIUM' | 'GOOD' | 'STRONG';
}

export interface AnalysisResult {
  stats: {
    col1: number;
    col2: number;
    col3: number;
    last5Zeros: number;
  };
  checks: {
    dominance: boolean;
    pressure: boolean;
    continuity: boolean;
    momentum: boolean;
    hotZone: boolean;
    noBlocks: boolean;
    progressionSafe: boolean;
    streak: boolean;
    echo: boolean;
    pattern: boolean;
  };
  signal: Signal | null;
}

export type SystemState = 'SETUP' | 'WAITING' | 'SIGNAL_ACTIVE' | 'RESULT';

// Multipliers based on 0.50 unit
// N1-N5: 0.5, 0.5, 1, 1.5, 2.5 (1x, 1x, 2x, 3x, 5x)
// R1-R5: 4.0, 6.0, 9.0, 13.0, 20.0 (8x, 12x, 18x, 26x, 40x)
export const RECOVERY_PROGRESSION = [1, 1, 2, 3, 5, 8, 12, 18, 26, 40];
export const TOTAL_UNITS = 116; // Total sum of multipliers
export const AVAILABLE_CHIPS: ChipValue[] = [0.50, 2.50, 10, 50, 250, 1000];
