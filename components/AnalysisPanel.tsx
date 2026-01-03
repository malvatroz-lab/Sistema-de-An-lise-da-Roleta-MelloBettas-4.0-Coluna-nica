import React from 'react';
import { Card } from './ui/Card';
import { AnalysisResult, BankrollConfig, RECOVERY_PROGRESSION } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { BarChart3, TrendingUp, Timer, ArrowRightLeft, CheckCircle, Zap } from 'lucide-react';

interface Props {
  data: AnalysisResult;
  progressionStep: number;
  config?: BankrollConfig | null;
  cooldown?: number;
  isTargetSwitched?: boolean;
}

export const AnalysisPanel: React.FC<Props> = ({ data, progressionStep, config, cooldown = 0, isTargetSwitched = false }) => {
  const { stats, signal, checks } = data;
  
  const getBarColor = (colId: number) => {
      if (signal?.column === colId && (cooldown === 0 || progressionStep > 0)) return 'bg-primary';
      if (checks.dominance && stats[`col${colId}` as keyof typeof stats] >= 35) return 'bg-primary/60';
      return 'bg-blue-500';
  }

  const currentBetAmount = config ? config.minBet * RECOVERY_PROGRESSION[progressionStep] : 0;
  
  const showSignal = (signal && signal.isValid && cooldown === 0) || progressionStep > 0;
  const activeCol = signal ? signal.column : null;

  // Consistency Logic: Match the header labels exactly
  const isRecovery = progressionStep >= 5;
  const stepLabel = isRecovery ? `R${progressionStep - 4}` : `N${progressionStep + 1}`;

  return (
    <div className="flex flex-col gap-2 h-full">
        {/* Column Bars */}
        <Card className="p-3 bg-[#151F32] border-[#1E293B]">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BarChart3 className="w-3 h-3" /> Análise de Colunas
            </h3>
            <div className="space-y-2">
                {[1, 2, 3].map(col => {
                    const pct = stats[`col${col}` as keyof typeof stats];
                    const isTarget = activeCol === col && showSignal;
                    return (
                        <div key={col} className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className={cn("font-medium", isTarget ? "text-primary" : "text-white")}>
                                    Coluna {col} {isTarget && <span className="ml-1 text-[9px] bg-primary/20 text-primary px-1 rounded">ALVO</span>}
                                </span>
                                <span className="text-slate-400">{pct.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-[#0B1120] rounded-full overflow-hidden">
                                <div 
                                    className={cn("h-full rounded-full transition-all duration-500", getBarColor(col))} 
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>

        {/* MAIN DASHBOARD AREA - FIXED HEIGHT (h-32) */}
        <div className="h-32 shrink-0"> 
            {cooldown > 0 ? (
                <Card className="bg-blue-950/20 border-blue-900/50 h-full flex flex-col items-center justify-center p-2 relative overflow-hidden">
                     <div className="absolute inset-0 bg-blue-500/5 animate-pulse-slow"></div>
                     <Timer className="w-6 h-6 text-blue-500 mb-1" />
                     <h2 className="text-sm font-bold text-blue-400 mb-0">AGUARDANDO</h2>
                     <p className="text-[10px] text-slate-400 mb-1">Analisando mesa...</p>
                     <div className="bg-[#0B1120] px-2 py-0.5 rounded text-blue-200 font-mono font-bold text-[10px] border border-blue-900/50">
                         {cooldown} giros
                     </div>
                </Card>
            ) : showSignal && activeCol ? (
                <Card className={cn(
                    "h-full flex flex-col items-center justify-center p-1 relative overflow-hidden border-2",
                    isTargetSwitched ? "bg-purple-950/10 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.2)]" 
                                     : isRecovery ? "bg-amber-950/10 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
                                     : "bg-green-950/10 border-primary shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                )}>
                    <div className={cn("absolute inset-0 opacity-10 animate-pulse", 
                        isTargetSwitched ? "bg-purple-500" : isRecovery ? "bg-amber-500" : "bg-primary"
                    )}></div>
                    
                    <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                        
                        {/* Top Badge - Enhanced */}
                        <div className={cn(
                            "px-3 py-0.5 rounded-full border backdrop-blur-md flex items-center gap-1.5 mb-0.5 shadow-sm",
                            isTargetSwitched ? "bg-purple-500/20 border-purple-500/50 text-purple-200" : 
                            isRecovery ? "bg-amber-500/20 border-amber-500/50 text-amber-200" :
                            "bg-green-500/20 border-green-500/50 text-green-100"
                        )}>
                            {isTargetSwitched ? <ArrowRightLeft className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            <span className="text-[11px] font-black uppercase tracking-wider">
                                {isTargetSwitched ? "ALVO ALTERADO" : progressionStep > 0 ? `NÍVEL ${stepLabel}` : "ENTRADA CONFIRMADA"}
                            </span>
                        </div>

                        {/* Main Title - MAXIMIZED */}
                        <h2 className={cn(
                            "text-5xl font-black leading-[0.85] tracking-tighter my-1 drop-shadow-lg", 
                            isTargetSwitched ? "text-purple-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)]" : 
                            isRecovery ? "text-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]" :
                            "text-white drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]"
                        )}>
                            COLUNA {activeCol}
                        </h2>
                        
                        {/* Bottom Bar - Enhanced Size */}
                        <div className="bg-[#0B1120]/80 backdrop-blur rounded px-4 py-1 border border-white/10 flex items-center gap-3 mt-1 shadow-lg">
                             <span className={cn("text-sm font-mono font-bold tracking-tight", 
                                 isTargetSwitched ? "text-purple-300" : isRecovery ? "text-amber-500" : "text-primary"
                             )}>
                                 {formatCurrency(currentBetAmount)}
                             </span>
                             <span className="w-px h-3 bg-white/20"></span>
                             <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                                 <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                 {signal?.confidence || 100}%
                             </span>
                        </div>
                    </div>
                </Card>
            ) : (
                 <Card className="bg-[#151F32] border-[#1E293B] border-dashed h-full flex flex-col items-center justify-center text-slate-600 p-2">
                     <div className="bg-[#0B1120] p-2 rounded-full mb-1 border border-[#1E293B]">
                        <Timer className="w-5 h-5 opacity-50" />
                     </div>
                     <span className="text-xs font-medium text-slate-400">Aguardando...</span>
                 </Card>
            )}
        </div>

        {/* Triggers Display - Fills remaining space */}
        <Card className="p-3 bg-[#151F32] border-[#1E293B] flex-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gatilhos</h3>
            <div className="space-y-1">
                <div className={cn("px-2 py-1 rounded border flex justify-between items-center", checks.continuity ? "bg-green-900/20 border-green-900/50" : "bg-[#0B1120] border-[#1E293B]")}>
                    <span className={cn("text-[10px]", checks.continuity ? "text-green-400" : "text-slate-500")}>Continuidade</span>
                    {checks.continuity && <CheckCircle className="w-2.5 h-2.5 text-primary" />}
                </div>
                <div className={cn("px-2 py-1 rounded border flex justify-between items-center", checks.echo ? "bg-green-900/20 border-green-900/50" : "bg-[#0B1120] border-[#1E293B]")}>
                    <span className={cn("text-[10px]", checks.echo ? "text-green-400" : "text-slate-500")}>Eco</span>
                    {checks.echo && <CheckCircle className="w-2.5 h-2.5 text-primary" />}
                </div>
                <div className={cn("px-2 py-1 rounded border flex justify-between items-center", checks.pressure ? "bg-green-900/20 border-green-900/50" : "bg-[#0B1120] border-[#1E293B]")}>
                    <span className={cn("text-[10px]", checks.pressure ? "text-green-400" : "text-slate-500")}>Pressão</span>
                    {checks.pressure && <CheckCircle className="w-2.5 h-2.5 text-primary" />}
                </div>
            </div>
            
            <div className="mt-2 pt-1 border-t border-[#1E293B] flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Zeros (5):</span>
                <span className={cn("text-[10px] font-bold", stats.last5Zeros > 0 ? "text-red-500" : "text-white")}>{stats.last5Zeros}</span>
            </div>
        </Card>
    </div>
  );
};