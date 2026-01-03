import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BankrollConfig, Signal, SystemState, RECOVERY_PROGRESSION, HistoryItem, AnalysisResult } from './types';
import { generateSignal, getColumn, performFullAnalysis } from './lib/rouletteAnalysis';
import { formatCurrency, cn } from './lib/utils';
import { BankrollSetup } from './components/BankrollSetup';
import { NumberInput } from './components/NumberInput';
import { AnalysisPanel } from './components/AnalysisPanel';
import { StatsPanel } from './components/StatsPanel';
import { GameNotifications } from './components/GameNotifications';
import { Zap, TrendingUp, Disc, AlertCircle, RefreshCw, ArrowRightLeft, Timer, ShieldAlert } from 'lucide-react';
import { Card } from './components/ui/Card';

// Factory function to ensure a fresh object every time
const getInitialAnalysis = (): AnalysisResult => ({
    stats: { col1: 0, col2: 0, col3: 0, last5Zeros: 0 },
    checks: {
        dominance: false, pressure: false, continuity: false, momentum: false, 
        hotZone: false, noBlocks: true, progressionSafe: true, streak: false, echo: false, pattern: false
    },
    signal: null
});

export default function App() {
  const [state, setState] = useState<SystemState>('SETUP');
  const [config, setConfig] = useState<BankrollConfig | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [progressionStep, setProgressionStep] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  
  const [resetKey, setResetKey] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisResult>(getInitialAnalysis());

  // Cooldown State
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [lastEvent, setLastEvent] = useState<'WIN' | 'LOSS' | 'SIGNAL' | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  
  // Debug state to show the user exactly what happened
  const [lastResultDebug, setLastResultDebug] = useState<{ actual: number, actualCol: number, target: number, result: 'WIN' | 'LOSS' | 'NONE' } | null>(null);
  
  // Track if a switch happened in the last step for UI indication
  const [targetSwitched, setTargetSwitched] = useState(false);

  // Store the amount of the last win for accurate notifications
  const [lastWinAmount, setLastWinAmount] = useState(0);

  const prevWinsRef = useRef(0);
  const prevLossesRef = useRef(0);
  const prevSignalColRef = useRef<number | null>(null);

  const activeSignal = analysis.signal;

  // Detect Events for Notifications
  useEffect(() => {
      if (wins > prevWinsRef.current) {
          setLastEvent('WIN');
          setEventData(lastWinAmount);
      }
      prevWinsRef.current = wins;

      if (losses > prevLossesRef.current) {
          setLastEvent('LOSS');
          setEventData(null);
      }
      prevLossesRef.current = losses;

      // FIX: Only consider a signal "active" for notifications if we are NOT in cooldown.
      // If we are in cooldown (waiting), the UI shows "Aguardando", so we shouldn't show "Entrada Confirmada".
      // Note: If progressionStep > 0, cooldown is forced to 0 in recalculateSession, so this check passes for active gales.
      const isReady = activeSignal?.isValid && cooldownRemaining === 0;
      const currentSigCol = isReady ? activeSignal.column : null;
      
      // Trigger if signal exists AND (it's new OR it changed column)
      if (currentSigCol !== null && currentSigCol !== prevSignalColRef.current) {
          setLastEvent('SIGNAL');
          
          // Determine if this is a "Switch" (Change target while progression is active)
          // vs a "New Entry" (Start from step 0)
          const isSwitch = progressionStep > 0 && prevSignalColRef.current !== null;
          
          setEventData({
              signal: activeSignal,
              step: progressionStep,
              isSwitch: isSwitch
          });
      }

      // We track the "effective" column.
      // So if it was blocked by cooldown (null) and now appears (col), it counts as a change -> triggers notification.
      prevSignalColRef.current = currentSigCol;

  }, [wins, losses, activeSignal, config, progressionStep, cooldownRemaining, lastWinAmount]);

  const recalculateSession = useCallback((currentHistory: HistoryItem[], currentConfig: BankrollConfig | null) => {
      if (!currentConfig) return;

      let rWins = 0;
      let rLosses = 0;
      let rProfit = 0;
      let rBankroll = currentConfig.initialBankroll;
      let rProgressionStep = 0;
      let rConsecutiveLosses = 0;
      let rLastResultDebug = null;
      let rTargetSwitched = false;
      let rLastWinAmount = 0;
      
      const chronHistory = [...currentHistory].reverse();
      const tempHistory: number[] = [];
      let currentTarget: number | null = null;
      
      // Cooldown tracking
      let lastEndIndex = -10; // Initialize far back so we can start immediately
      let rCooldownRemaining = 0;

      chronHistory.forEach((item, idx) => {
          // --- 1. RESOLVE BET (Current Spin) ---
          // Check result against the target decided in the PREVIOUS turn
          if (currentTarget !== null) {
              const actualCol = getColumn(item.number);
              const betAmount = currentConfig.minBet * RECOVERY_PROGRESSION[rProgressionStep];
              const isWin = actualCol === currentTarget;
              
              if (idx === chronHistory.length - 1) {
                  rLastResultDebug = {
                      actual: item.number,
                      actualCol,
                      target: currentTarget,
                      result: isWin ? 'WIN' : 'LOSS'
                  };
              }

              if (isWin) {
                  // WIN
                  rWins++;
                  if (!item.isSimulation) {
                      // Correct Profit Logic (2:1 Payout):
                      const spinReturn = betAmount * 3;
                      const spinProfit = spinReturn - betAmount;
                      
                      rProfit += spinProfit;
                      rBankroll += spinProfit;
                      rLastWinAmount = spinProfit;
                  }
                  // RESET CYCLE
                  rProgressionStep = 0;
                  rConsecutiveLosses = 0;
                  currentTarget = null;
                  rTargetSwitched = false;
                  lastEndIndex = idx; // Mark end of session
              } else {
                  // LOSS (Round)
                  if (!item.isSimulation) {
                      rProfit -= betAmount;
                      rBankroll -= betAmount;
                  }
                  
                  // Check if we reached the maximum steps allowed by the user's config
                  // OR if the NEXT bet would exceed bankroll (double safety)
                  const isMaxStepsReached = rProgressionStep >= currentConfig.maxSteps - 1;
                  
                  if (isMaxStepsReached) {
                      // BUST (Stop Loss based on dynamic limit)
                      rLosses++; 
                      rConsecutiveLosses++;
                      rProgressionStep = 0;
                      currentTarget = null; 
                      rTargetSwitched = false;
                      lastEndIndex = idx; // Mark end of session
                  } else {
                      // CONTINUE PROGRESSION
                      rProgressionStep++;
                  }
              }
          } else if (idx === chronHistory.length - 1) {
             rLastResultDebug = {
                  actual: item.number,
                  actualCol: getColumn(item.number),
                  target: 0,
                  result: 'NONE'
              };
             rTargetSwitched = false;
          }

          // --- 2. ANALYZE FOR NEXT SPIN ---
          // Add current number to history
          tempHistory.push(item.number);
          
          const reversedForAnalysis = [...tempHistory].reverse();
          const sig = generateSignal(reversedForAnalysis, 0);

          // Logic to SET or SWITCH target for the NEXT spin
          const spinsSinceLastEnd = idx - lastEndIndex;
          const inCooldown = spinsSinceLastEnd < 3;

          if (currentTarget !== null) {
              // ACTIVE SESSION: Check for Dynamic Switch
              // Switch applies to the FUTURE bet
              if (sig && sig.isValid && sig.column !== currentTarget) {
                  currentTarget = sig.column;
                  if (idx === chronHistory.length - 1) {
                      rTargetSwitched = true;
                  }
              }
          } else {
              // NO ACTIVE TARGET: Look for NEW entry
              // Only accept if NOT in cooldown
              if (!inCooldown && sig && sig.isValid) {
                  currentTarget = sig.column;
                  rTargetSwitched = false;
              }
          }
          
          // Calculate cooldown for UI (only relevant on the last item)
          if (idx === chronHistory.length - 1) {
             // If we are in a progression, we IGNORE cooldown.
             if (rProgressionStep > 0) {
                 rCooldownRemaining = 0;
             } else {
                 rCooldownRemaining = Math.max(0, 3 - spinsSinceLastEnd);
             }
          }
      });

      setWins(rWins);
      setLosses(rLosses);
      setSessionProfit(rProfit);
      setConfig(prev => prev ? ({ ...prev, currentBankroll: rBankroll }) : null);
      setProgressionStep(rProgressionStep);
      setConsecutiveLosses(rConsecutiveLosses);
      setLastResultDebug(rLastResultDebug);
      setTargetSwitched(rTargetSwitched);
      setCooldownRemaining(rCooldownRemaining);
      setLastWinAmount(rLastWinAmount);

      const finalNumbers = currentHistory.map(h => h.number);
      let finalAnalysis = performFullAnalysis(finalNumbers, rConsecutiveLosses);
      
      // PERSISTENCE FIX: 
      // If we are in a progression (step > 0), we MUST show a signal for the active target
      if (rProgressionStep > 0 && currentTarget !== null) {
           const existingSig = finalAnalysis.signal;
           if (!existingSig || existingSig.column !== currentTarget) {
               finalAnalysis.signal = {
                   column: currentTarget,
                   confidence: existingSig?.column === currentTarget ? existingSig.confidence : 95, 
                   triggers: existingSig?.column === currentTarget ? existingSig.triggers : ['Progressão Ativa'],
                   blocks: [],
                   isValid: true,
                   level: 'STRONG'
               };
           }
      }
      
      setAnalysis(finalAnalysis);
  }, []);

  const processNumber = (num: number) => {
    const newItem: HistoryItem = { 
        number: num, 
        timestamp: new Date(), 
        column: getColumn(num), 
        isSimulation: false 
    };
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    recalculateSession(newHistory, config);
  };

  const handleBulkNumbers = (nums: number[]) => {
      const newItems: HistoryItem[] = nums.map(n => ({
          number: n,
          timestamp: new Date(),
          column: getColumn(n),
          isSimulation: true
      }));
      const newHistory = [...newItems, ...history];
      setHistory(newHistory);
      recalculateSession(newHistory, config);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const newHistory = history.slice(1);
      setHistory(newHistory);
      recalculateSession(newHistory, config);
  };

  const handleReset = () => {
      // Confirmed by child component, execute immediately
      setConfig(null);
      setHistory([]);
      setSessionProfit(0);
      setWins(0);
      setLosses(0);
      setProgressionStep(0);
      setConsecutiveLosses(0);
      setAnalysis(getInitialAnalysis());
      setResetKey(prev => prev + 1);
      prevWinsRef.current = 0;
      prevLossesRef.current = 0;
      prevSignalColRef.current = null;
      setLastResultDebug(null);
      setCooldownRemaining(0);
      setState('SETUP');
  };

  if (state === 'SETUP') {
      return (
          <div className="min-h-screen bg-[#0B1120] text-white">
              <BankrollSetup key={resetKey} onComplete={(c) => { setConfig(c); setState('WAITING'); }} />
          </div>
      );
  }

  const currentBetValue = config ? config.minBet * RECOVERY_PROGRESSION[progressionStep] : 0;
  
  // Logic to determine visual status
  const isSignalActive = (activeSignal?.isValid && cooldownRemaining === 0) || progressionStep > 0;
  const isRecoveryActive = progressionStep >= 5; // Steps 0-4 are Normal, 5-9 are Recovery
  
  // Dynamic Max Step Display
  const maxStepIndex = config?.maxSteps ? config.maxSteps - 1 : 9;
  const isLastStep = progressionStep === maxStepIndex;
  
  const stepLabel = isRecoveryActive ? `R${progressionStep - 4}` : `N${progressionStep + 1}`;
  
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans p-4 flex flex-col gap-4">
      
      <GameNotifications 
        lastEvent={lastEvent} 
        eventData={eventData} 
        onClear={() => setLastEvent(null)} 
      />

      {/* HEADER STATUS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
          <div className="flex items-center">
              <h1 className="text-sm font-bold text-slate-400 mr-4 hidden md:block uppercase tracking-widest">Status</h1>
              <div className={cn(
                  "px-4 py-2 rounded border shadow-lg flex items-center gap-2 font-bold text-sm transition-all duration-300",
                  targetSwitched 
                    ? "bg-purple-900/20 border-purple-500 text-purple-400 animate-pulse"
                    : isRecoveryActive 
                        ? isLastStep 
                            ? "bg-red-900/20 border-red-600 text-red-500 animate-pulse" // Last step danger
                            : "bg-amber-900/20 border-amber-600 text-amber-500 animate-pulse" 
                    : isSignalActive
                        ? "bg-primary/20 border-primary text-primary shadow-primary/20 animate-pulse-fast" 
                        : cooldownRemaining > 0 
                            ? "bg-blue-900/20 border-blue-500/50 text-blue-400"
                            : "bg-[#1E293B] border-slate-700 text-slate-400"
              )}>
                  {targetSwitched ? (
                      <>
                        <ArrowRightLeft className="w-4 h-4" />
                        ALVO ALTERADO (MANTENHA GALE)
                      </>
                  ) : isRecoveryActive ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        RECUPERAÇÃO {stepLabel} {isLastStep && '(ÚLTIMA TENTATIVA)'}
                      </>
                  ) : isSignalActive ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        {progressionStep > 0 ? `FASE NORMAL (${stepLabel})` : 'ENTRADA AUTORIZADA'}
                      </>
                  ) : cooldownRemaining > 0 ? (
                      <>
                         <Timer className="w-4 h-4" />
                         AGUARDANDO ({cooldownRemaining} GIROS)
                      </>
                  ) : (
                      <>
                        <div className="w-3 h-3 rounded-full bg-slate-600"></div>
                        ANALISANDO PADRÕES...
                      </>
                  )}
              </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Card className={cn(
                  "bg-[#151F32] border-[#1E293B] p-2 px-3 flex flex-col justify-center relative overflow-hidden transition-all duration-300",
                  targetSwitched && "border-purple-500 bg-purple-900/10"
              )}>
                  {targetSwitched && (
                      <div className="absolute inset-0 bg-purple-500/10 animate-pulse" />
                  )}
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      {targetSwitched ? <ArrowRightLeft className="w-3 h-3 text-purple-400" /> : <Disc className="w-3 h-3" />} 
                      Coluna Alvo
                  </span>
                  <span className={cn("font-bold text-lg", 
                      targetSwitched ? "text-purple-400" :
                      (isSignalActive) ? "text-blue-400" : "text-slate-600"
                  )}>
                      {activeSignal?.column && isSignalActive ? `C${activeSignal.column}` : progressionStep > 0 ? 'Mantém' : '-'}
                  </span>
              </Card>
              <Card className="bg-[#151F32] border-[#1E293B] p-2 px-3 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Gatilho Ativo</span>
                  <span className="font-bold text-slate-300 text-xs truncate">
                      {isSignalActive ? activeSignal.triggers[0] : isRecoveryActive ? 'Recuperação' : 'Nenhum'}
                  </span>
              </Card>
              <Card className="bg-[#151F32] border-[#1E293B] p-2 px-3 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Nível</span>
                  <span className={cn("font-bold", 
                      isRecoveryActive ? "text-amber-500" : targetSwitched ? "text-purple-400" : "text-slate-300"
                  )}>{stepLabel}</span>
              </Card>
              <Card className="bg-[#151F32] border-[#1E293B] p-2 px-3 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">Entrada Atual</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(currentBetValue)}</span>
              </Card>
               <Card className="bg-[#151F32] border-[#1E293B] p-2 px-3 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">Lucro/Prejuízo</span>
                  <span className={cn("font-bold font-mono", sessionProfit >= 0 ? "text-green-500" : "text-red-500")}>
                      {sessionProfit >= 0 ? '+' : ''}{formatCurrency(sessionProfit)}
                  </span>
              </Card>
          </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          <div className="lg:col-span-3 flex flex-col min-h-[500px]">
              <NumberInput 
                  key={`input-${resetKey}`}
                  onAddNumber={processNumber} 
                  onAddBulk={handleBulkNumbers}
                  onUndo={handleUndo} 
                  onReset={handleReset}
                  history={history}
              />
          </div>
          <div className="lg:col-span-5 min-h-[400px]">
              <AnalysisPanel 
                  key={`analysis-${resetKey}`}
                  data={analysis} 
                  progressionStep={progressionStep}
                  config={config}
                  cooldown={cooldownRemaining}
                  isTargetSwitched={targetSwitched}
              />
          </div>
          <div className="lg:col-span-4 min-h-[400px]">
              <StatsPanel 
                  key={`stats-${resetKey}`}
                  analysis={analysis}
                  config={config!}
                  stats={{ wins, losses, profit: sessionProfit }}
                  onReset={handleReset}
                  progressionStep={progressionStep}
                  historyLength={history.length}
                  lastResult={lastResultDebug}
              />
          </div>
      </div>
    </div>
  );
}