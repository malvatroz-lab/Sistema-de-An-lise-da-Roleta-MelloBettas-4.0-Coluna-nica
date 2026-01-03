import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BankrollConfig, AVAILABLE_CHIPS, RECOVERY_PROGRESSION } from '../types';
import { calculateUnitValue } from '../lib/rouletteAnalysis';
import { Wallet, PlayCircle, ShieldCheck, Table as TableIcon } from 'lucide-react';
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

  // Generate Table Data for UI
  const progressionTable = RECOVERY_PROGRESSION.map((mult, index) => {
      const bet = previewBet * mult;
      const totalReturn = bet * 3;
      const profit = totalReturn - bet;
      
      // Calculate accumulated loss previous to this step
      let accumulatedLoss = 0;
      for(let i=0; i<=index; i++) {
          accumulatedLoss += (previewBet * RECOVERY_PROGRESSION[i]);
      }
      
      return {
          level: `N${index + 1}`,
          bet,
          totalReturn,
          profit, // Lucro da rodada
          accLoss: -accumulatedLoss
      };
  });

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-2xl bg-[#151F32] border-[#1E293B] shadow-2xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>

        {/* LEFT COLUMN: Inputs */}
        <div className="flex-1 space-y-6 relative z-10">
            {/* Header */}
            <div className="text-center md:text-left mb-6">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Sistema MelloBettas</h2>
                <h1 className="text-3xl font-black text-white tracking-tighter">
                    Configuração <span className="text-primary">4.0</span>
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Risco Aceitável
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPercentage(pct)}
                      className={cn(
                          "py-2 rounded-lg text-xs font-bold transition-all border border-transparent",
                          percentage === pct
                          ? 'bg-primary text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-[#0B1120] text-slate-400 hover:bg-[#1E293B] border-[#1E293B]'
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0B1120] p-4 rounded-lg border border-[#1E293B]">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-slate-400">Entrada Base (N1):</span>
                    <span className="font-mono text-primary font-bold">{formatCurrency(previewBet)}</span>
                  </div>
                   <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Stop Loss (Ciclo):</span>
                    <span className="font-mono text-red-500 font-bold">{formatCurrency(previewBet * 12)}</span>
                  </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                <PlayCircle className="w-5 h-5 mr-2" />
                Iniciar Sessão
              </Button>
            </form>
        </div>

        {/* RIGHT COLUMN: Table */}
        <div className="flex-1 bg-[#0B1120] rounded-xl border border-[#1E293B] p-4 flex flex-col">
             <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B] pb-2">
                 <TableIcon className="w-4 h-4 text-blue-400" />
                 <h3 className="text-xs font-bold text-slate-300 uppercase">Detalhamento por Nível</h3>
             </div>
             
             <div className="overflow-x-auto">
                 <table className="w-full text-[10px] md:text-xs">
                     <thead>
                         <tr className="text-slate-500 border-b border-[#1E293B]">
                             <th className="pb-2 text-left font-medium">Nível</th>
                             <th className="pb-2 text-right font-medium">Aposta</th>
                             <th className="pb-2 text-right font-medium">Lucro Rod.</th>
                             <th className="pb-2 text-right font-medium text-red-400">Acum. Erro</th>
                         </tr>
                     </thead>
                     <tbody className="font-mono">
                         {progressionTable.map((row, i) => (
                             <tr key={i} className="border-b border-[#1E293B]/50 last:border-0 hover:bg-[#1E293B]/30 transition-colors">
                                 <td className="py-2.5 font-bold text-slate-300">{row.level}</td>
                                 <td className="py-2.5 text-right text-slate-400">{formatCurrency(row.bet)}</td>
                                 <td className="py-2.5 text-right text-green-400 font-bold">+{formatCurrency(row.profit)}</td>
                                 <td className="py-2.5 text-right text-red-500 opacity-80">{formatCurrency(row.accLoss)}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
             
             <div className="mt-auto pt-4 text-[10px] text-slate-500 italic text-center leading-tight">
                 * O "Lucro Rod." é o valor que aparecerá no alerta de vitória (Green). O saldo final do ciclo desconta as perdas anteriores automaticamente.
             </div>
        </div>

      </Card>
    </div>
  );
};