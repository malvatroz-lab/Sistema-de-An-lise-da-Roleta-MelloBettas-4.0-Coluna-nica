import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BankrollConfig, AVAILABLE_CHIPS, RECOVERY_PROGRESSION } from '../types';
import { calculateUnitValue } from '../lib/rouletteAnalysis';
import { Wallet, PlayCircle, ShieldCheck } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

interface Props {
  onComplete: (config: BankrollConfig) => void;
}

export const BankrollSetup: React.FC<Props> = ({ onComplete }) => {
  const [bankroll, setBankroll] = useState<string>('100');
  const [percentage, setPercentage] = useState<number>(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(bankroll);
    if (!isNaN(val) && val >= 30) {
      const minBet = calculateUnitValue(val, percentage, AVAILABLE_CHIPS);
      onComplete({
        initialBankroll: val,
        currentBankroll: val,
        entryPercentage: percentage,
        minBet
      });
    }
  };

  const previewBet = !isNaN(parseFloat(bankroll)) 
    ? calculateUnitValue(parseFloat(bankroll), percentage, AVAILABLE_CHIPS)
    : 0;

  const maxLoss = !isNaN(parseFloat(bankroll)) 
    ? (parseFloat(bankroll) * percentage) / 100
    : 0;

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md bg-[#151F32] border-[#1E293B] shadow-2xl p-6 relative overflow-hidden">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>

        {/* Header Icon */}
        <div className="flex justify-center mb-6 relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-[#112723] flex items-center justify-center border-2 border-primary/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Wallet className="w-10 h-10 text-primary" />
            </div>
        </div>

        {/* Branding Header */}
        <div className="text-center mb-8 space-y-2 relative z-10">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Sistema de Análise da Roleta</h2>
            
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-primary animate-pulse-slow drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] tracking-tighter">
                MelloBettas
            </h1>
            
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-2xl font-bold text-white italic">4.0</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest border border-blue-500/30 px-3 py-1 rounded-full bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    Coluna Única
                </span>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          {/* Bankroll Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Valor da Banca (R$)
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-3.5 text-slate-500 font-bold group-focus-within:text-primary transition-colors">R$</span>
              <input
                type="number"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                className="w-full bg-[#0B1120] border border-[#1E293B] rounded-lg py-3 pl-12 pr-4 text-white font-mono text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="100.00"
                step="0.01"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Meta de Risco (% da Banca)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPercentage(pct)}
                  className={cn(
                      "py-3 rounded-lg text-sm font-bold transition-all border border-transparent",
                      percentage === pct
                      ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105'
                      : 'bg-[#0B1120] text-slate-400 hover:bg-[#1E293B] border-[#1E293B]'
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Perda máxima se errar 5 vezes seguidas</p>
          </div>

          {/* Breakdown Box */}
          <div className="bg-[#0B1120] rounded-xl p-5 border border-[#1E293B] space-y-4">
            <div className="flex justify-between items-center text-sm border-b border-[#1E293B] pb-3">
              <span className="text-slate-400">Banca:</span>
              <span className="font-mono text-white font-bold">R$ {parseFloat(bankroll || '0').toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Valor 1 unidade:</span>
              <span className="font-mono text-primary font-bold">{formatCurrency(previewBet)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Perda máxima (5 derrotas):</span>
              <span className="font-mono text-red-500 font-bold">{formatCurrency(previewBet * 12)}</span>
            </div>

            <div className="pt-2">
                <span className="text-xs text-slate-500 block mb-2">Progressão Recuperação (sempre lucro):</span>
                <div className="grid grid-cols-3 gap-2">
                    {RECOVERY_PROGRESSION.map((mult, i) => (
                        <div key={i} className="bg-[#151F32] border border-[#1E293B] rounded px-2 py-1 text-[10px] text-slate-300 font-mono">
                           N{i+1}: {formatCurrency(previewBet * mult)}
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-[10px] text-green-500 flex items-center gap-1 mt-2">
                <ShieldCheck className="w-3 h-3" /> Vitória em qualquer nível recupera tudo + lucro
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
            <PlayCircle className="w-5 h-5 mr-2" />
            Iniciar Sessão MelloBettas
          </Button>
        </form>
      </Card>
    </div>
  );
};