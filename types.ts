export interface BankrollConfig {
  initialBankroll: number;
  entryPercentage: number;
  minBet: number;
  currentBankroll: number;
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

export const RECOVERY_PROGRESSION = [1, 1, 2, 3, 5];
export const TOTAL_UNITS = 12;
export const AVAILABLE_CHIPS: ChipValue[] = [0.50, 2.50, 10, 50, 250, 1000];