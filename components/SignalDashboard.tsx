import React from 'react';
import { Card } from './ui/Card';
import { Signal, RECOVERY_PROGRESSION } from '../types';
import { Target, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { getColumnColor } from '../lib/constants';

interface Props {
  signal: Signal | null;
  currentStep: number; // 0 to 4
}

export const SignalDashboard: React.FC<Props> = ({ signal, currentStep }) => {
  if (!signal) {
    return (
      <Card className="mx-4 my-6 p-8 border-dashed border-2 border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500">
        <Target className="w-12 h-12 mb-4 opacity-50" />
        <p className="font-medium">Aguardando padrão estatístico...</p>
        <p className="text-xs mt-2">Insira os números para análise</p>
      </Card>
    );
  }

  const isStrong = signal.level === 'STRONG';
  const isBlocked = signal.blocks.length > 0;

  return (
    <Card className={cn(
      "mx-4 my-6 overflow-hidden border-2 relative transition-all duration-500",
      isBlocked ? "border-red-900 bg-red-950/10" : 
      isStrong ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(34,197,94,0.15)]" : 
      "border-blue-500/50 bg-blue-900/5"
    )}>
      {isStrong && !isBlocked && (
          <div className="absolute top-0 right-0 p-2">
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
      )}

      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
            <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {isBlocked ? 'Entrada Bloqueada' : 'Sinal Identificado'}
                </h3>
                <div className="flex items-center gap-3">
                    <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold text-white shadow-lg", getColumnColor(signal.column))}>
                        C{signal.column}
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{signal.confidence}%</div>
                        <div className="text-xs text-slate-400">Confiança</div>
                    </div>
                </div>
            </div>
            
            {/* Progression Steps */}
            {!isBlocked && (
                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 mb-2">Gale / Nível</span>
                    <div className="flex gap-1">
                        {RECOVERY_PROGRESSION.map((mult, idx) => (
                            <div key={idx} className={cn(
                                "w-6 h-8 rounded flex items-center justify-center text-xs font-bold transition-colors",
                                idx === currentStep ? "bg-primary text-black ring-2 ring-primary/50 ring-offset-2 ring-offset-card" : 
                                idx < currentStep ? "bg-red-900/50 text-red-200 line-through" :
                                "bg-slate-800 text-slate-500"
                            )}>
                                {mult}x
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Triggers & Blocks */}
        <div className="space-y-3">
            {signal.blocks.length > 0 ? (
                <div className="bg-red-950/40 rounded-lg p-3 border border-red-900/50">
                    <div className="flex items-center gap-2 text-red-400 text-sm font-bold mb-2">
                        <Lock className="w-4 h-4" /> Bloqueios Ativos
                    </div>
                    <ul className="space-y-1">
                        {signal.blocks.map((block, i) => (
                            <li key={i} className="text-xs text-red-300 flex items-center gap-2">
                                <span className="w-1 h-1 bg-red-500 rounded-full" /> {block}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {signal.triggers.map((trigger, i) => (
                        <div key={i} className="bg-slate-800/50 rounded px-2 py-1.5 flex items-center gap-2 text-xs border border-slate-700/50">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                            <span className="text-slate-200">{trigger}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {!isBlocked && (
         <div className="bg-slate-900/50 px-6 py-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
             <span>Cubra o Zero se preferir</span>
             <span>Meta: +1 Unidade</span>
         </div>
      )}
    </Card>
  );
};
