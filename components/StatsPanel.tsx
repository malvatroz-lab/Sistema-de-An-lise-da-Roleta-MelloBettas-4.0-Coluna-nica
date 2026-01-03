import React from 'react';
import { Card } from './ui/Card';
import { AnalysisResult, BankrollConfig } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { Check, X, Shield, Activity, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  analysis: AnalysisResult;
  config: BankrollConfig;
  stats: {
    wins: number;
    losses: number;
    profit: number;
  };
  onReset: () => void;
  progressionStep: number;
  historyLength: number;
  lastResult?: { actual: number, actualCol: number, target: number, result: 'WIN' | 'LOSS' | 'NONE' } | null;
}

export const StatsPanel: React.FC<Props> = ({ analysis, config, stats, onReset, progressionStep, historyLength, lastResult }) => {
  const { checks } = analysis;

  const checklistItems = [
    { label: 'Coluna dominante (≥35%)', status: checks.dominance },
    { label: 'Gatilho de continuidade (2+ em 4)', status: checks.continuity },
    { label: 'Gatilho de momentum (2+ em 3)', status: checks.momentum },
    { label: 'Zona quente ativa', status: checks.hotZone },
    { label: 'Gatilho de pressão (4 de 7)', status: checks.pressure },
    { label: 'Padrão detectado', status: checks.pattern },
    { label: 'Gatilho de eco (reaparece)', status: checks.echo },
    { label: 'Sequência ativa (streak)', status: checks.streak },
    { label: 'Sem bloqueios ativos', status: checks.noBlocks },
    { label: 'Progressão permitida (≤5u)', status: checks.progressionSafe },
  ];

  const activeChecks = checklistItems.filter(i => i.status).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* 1. Session Results */}
      <Card className="bg-[#151F32] border-[#1E293B]">
         <div className="p-3 bg-[#1A2740] border-b border-[#1E293B]">
             <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                 <Activity className="w-3.5 h-3.5" /> RESULTADOS DA SESSÃO
             </h3>
         </div>
         <div className="p-4 space-y-3">
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Banca Inicial</span>
                 <span className="text-white font-mono">{formatCurrency(config.initialBankroll)}</span>
             </div>
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Banca Atual</span>
                 <span className="text-blue-400 font-mono font-bold">{formatCurrency(config.currentBankroll)}</span>
             </div>
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Lucro/Prejuízo</span>
                 <span className={cn("font-mono font-bold", stats.profit >= 0 ? "text-green-500" : "text-red-500")}>
                     {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                 </span>
             </div>
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">% do Dia</span>
                 <span className={cn("font-mono", stats.profit >= 0 ? "text-green-500" : "text-red-500")}>
                     {((stats.profit / config.initialBankroll) * 100).toFixed(1)}%
                 </span>
             </div>
             
             <div className="h-px bg-[#1E293B] my-2"></div>

             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Entradas</span>
                 <span className="text-white font-bold">{historyLength}</span>
             </div>
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Vitórias</span>
                 <span className="text-green-500 font-bold">{stats.wins}</span>
             </div>
             <div className="flex justify-between text-xs">
                 <span className="text-slate-400">Derrotas</span>
                 <span className="text-red-500 font-bold">{stats.losses}</span>
             </div>
             
             <div className="h-px bg-[#1E293B] my-2"></div>

             <div className="flex justify-between text-xs items-center">
                 <span className="text-slate-400">Progressão Atual</span>
                 <span className="text-primary font-mono font-bold">{progressionStep + 1}u / 5u</span>
             </div>
         </div>
         
         <div className="p-3 border-t border-[#1E293B]">
             <Button variant="outline" size="sm" onClick={onReset} className="w-full border-[#1E293B] bg-[#0B1120] text-slate-400 hover:text-white hover:bg-[#1E293B]">
                 <RefreshCw className="w-3.5 h-3.5 mr-2" /> Reiniciar Sessão
             </Button>
         </div>
      </Card>

      {/* LAST RESULT DEBUG */}
      {lastResult && lastResult.result !== 'NONE' && (
          <div className={cn("rounded-lg border p-3 text-xs flex justify-between items-center", 
              lastResult.result === 'WIN' ? "bg-green-950/30 border-green-900" : "bg-red-950/30 border-red-900")}>
              <span className="text-slate-400">Último Resultado:</span>
              <div className="flex items-center gap-2">
                   <span className="text-white font-bold">{lastResult.actual} (C{lastResult.actualCol})</span>
                   <span className="text-slate-600">vs</span>
                   <span className="text-blue-400 font-bold">Alvo C{lastResult.target}</span>
                   <span className={cn("ml-2 font-bold uppercase", lastResult.result === 'WIN' ? "text-green-500" : "text-red-500")}>
                       {lastResult.result === 'WIN' ? 'VITÓRIA' : 'DERROTA'}
                   </span>
              </div>
          </div>
      )}

      {/* 2. Advanced Analysis Checklist */}
      <Card className="bg-[#151F32] border-[#1E293B] p-0 overflow-hidden flex flex-col flex-1">
        <div className="p-3 bg-[#1A2740] border-b border-[#1E293B] flex justify-between items-center">
             <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                 <Shield className="w-3.5 h-3.5" /> Análise Avançada
             </h3>
             <span className="text-[10px] bg-[#0B1120] px-2 py-0.5 rounded text-slate-400">{activeChecks}/10</span>
        </div>
        
        <div className="p-3 space-y-2">
            {checklistItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs group">
                    <div className="flex items-center gap-2">
                        {item.status ? <Check className="w-3 h-3 text-primary" /> : <X className="w-3 h-3 text-slate-600" />}
                        <span className={cn("transition-colors", item.status ? "text-green-100" : "text-slate-600")}>{item.label}</span>
                    </div>
                    {item.status && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>}
                </div>
            ))}
        </div>
      </Card>

    </div>
  );
};