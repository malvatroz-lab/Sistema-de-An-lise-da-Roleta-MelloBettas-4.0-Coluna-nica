import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BankrollConfig, AVAILABLE_CHIPS, RECOVERY_PROGRESSION, TOTAL_UNITS } from '../types';
import { calculateUnitValue } from '../lib/rouletteAnalysis';
import { Wallet, PlayCircle, ShieldCheck, Table as TableIcon, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

interface Props {
  onComplete: (config: BankrollConfig) => void;
}

export const BankrollSetup: React.FC<Props> = ({ onComplete }) => {
  const [bankroll, setBankroll] = useState<string>('30');
  const [percentage, setPercentage] = useState<number>(100);

  const parsedBankroll = parseFloat(bankroll) || 0;
  const previewBet = 0.50;

  // Calculate Affordable Steps
  const { tableData, maxAffordableStep, totalCost } = useMemo(() => {
      let cumulativeCost = 0;
      let maxStep = 0;
      
      const data = RECOVERY_PROGRESSION.map((mult, index) => {
          const isRecovery = index >= 5;
          const levelLabel = isRecovery ? `R${index - 4}` : `N${index + 1}`;
          const bet = previewBet * mult;
          
          cumulativeCost += bet;
          const isAffordable = cumulativeCost <= parsedBankroll;
          
          if (isAffordable) {
              maxStep = index + 1;
          }

          const totalReturn = bet * 3;
          const profit = totalReturn - bet;
          
          // Calculate previous losses for Real Profit
          let previousLosses = 0;
          for(let i=0; i < index; i++) {
              previousLosses += (previewBet * RECOVERY_PROGRESSION[i]);
          }
          const realProfit = profit - previousLosses;

          return {
              level: levelLabel,
              bet,
              totalReturn,
              profit,
              realProfit,
              isAffordable,
              cumulativeCost
          };
      });

      return { tableData: data, maxAffordableStep: maxStep, totalCost: cumulativeCost };
  }, [parsedBankroll]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBankroll >= 0.50 && maxAffordableStep > 0) {
      onComplete({
        initialBankroll: parsedBankroll,
        currentBankroll: parsedBankroll,
        entryPercentage: percentage,
        minBet: previewBet,
        maxSteps: maxAffordableStep
      });
    }
  };

  const currentStopLoss = tableData.filter(r => r.isAffordable).reduce((acc, curr) => acc + curr.bet, 0);

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 py-8">
      <Card className="w-full max-w-5xl bg-[#151F32] border-[#1E293B] shadow-2xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
        
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>

        {/* LEFT COLUMN: Inputs */}
        <div className="flex-1 space-y-6 relative z-10 md:max-w-xs">
            {/* Header */}
            <div className="text-center md:text-left mb-6">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Sistema MelloBettas</h2>
                <h1 className="text-3xl font-black text-white tracking-tighter">
                    Coluna Única <span className="text-primary">2:1</span>
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
                    placeholder="30.00"
                    step="0.01"
                  />
                </div>
                
                {maxAffordableStep < RECOVERY_PROGRESSION.length ? (
                    <p className="text-[10px] text-amber-500 flex gap-1 items-center bg-amber-950/20 p-2 rounded border border-amber-900/50">
                        <AlertTriangle className="w-3 h-3"/> 
                        Banca cobre até o nível {tableData[maxAffordableStep - 1]?.level || 'N0'}.
                    </p>
                ) : (
                    <p className="text-[10px] text-green-500 flex gap-1 items-center">
                        <ShieldCheck className="w-3 h-3"/> Banca cobre ciclo completo!
                    </p>
                )}
              </div>

              <div className="bg-[#0B1120] p-4 rounded-lg border border-[#1E293B] space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Entrada Base (N1):</span>
                    <span className="font-mono text-primary font-bold">{formatCurrency(previewBet)}</span>
                  </div>
                   <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Risco Máximo Real:</span>
                    <span className="font-mono text-red-500 font-bold">{formatCurrency(currentStopLoss)}</span>
                  </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed bg-blue-900/10 p-3 rounded border border-blue-900/30">
                  <strong className="text-blue-400">Ajuste Automático:</strong> O sistema ajustou sua estratégia para ir até o nível <strong>{tableData[maxAffordableStep - 1]?.level}</strong> com base no saldo disponível.
              </div>

              <Button 
                type="submit" 
                disabled={maxAffordableStep === 0}
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Iniciar Sessão
              </Button>
            </form>
        </div>

        {/* RIGHT COLUMN: Table */}
        <div className="flex-[2] bg-[#0B1120] rounded-xl border border-[#1E293B] p-4 flex flex-col min-w-0">
             <div className="flex items-center gap-2 mb-4 border-b border-[#1E293B] pb-2">
                 <TableIcon className="w-4 h-4 text-blue-400" />
                 <h3 className="text-xs font-bold text-slate-300 uppercase">Tabela Adaptativa ({maxAffordableStep} Níveis)</h3>
             </div>
             
             <div className="overflow-x-auto">
                 <table className="w-full text-[10px] md:text-xs whitespace-nowrap">
                     <thead>
                         <tr className="text-slate-500 border-b border-[#1E293B]">
                             <th className="pb-2 text-left font-medium">Fase</th>
                             <th className="pb-2 text-right font-medium px-2">Aposta</th>
                             <th className="pb-2 text-right font-medium px-2">Acumulado</th>
                             <th className="pb-2 text-right font-medium px-2">Lucro</th>
                             <th className="pb-2 text-right font-bold text-primary px-2">Res. Real</th>
                         </tr>
                     </thead>
                     <tbody className="font-mono">
                         {tableData.map((row, i) => {
                             const isHeaderN = i === 0;
                             const isHeaderR = i === 5;
                             return (
                                <React.Fragment key={i}>
                                     {isHeaderN && (
                                         <tr><td colSpan={5} className="py-2 text-[10px] font-bold text-slate-500 bg-[#151F32]/50 px-2 uppercase tracking-wider">Fase Normal</td></tr>
                                     )}
                                     {isHeaderR && (
                                         <tr><td colSpan={5} className="py-2 text-[10px] font-bold text-amber-500/80 bg-amber-900/10 px-2 uppercase tracking-wider mt-2">Fase Recuperação</td></tr>
                                     )}
                                     
                                     <tr className={cn(
                                         "border-b border-[#1E293B]/50 transition-colors",
                                         row.isAffordable ? "hover:bg-[#1E293B]/30" : "opacity-30 grayscale bg-red-900/5"
                                     )}>
                                         <td className={cn("py-2 font-bold pl-2", i >= 5 ? "text-amber-500" : "text-slate-300")}>
                                             {row.level}
                                         </td>
                                         <td className="py-2 text-right text-slate-400 px-2">{formatCurrency(row.bet)}</td>
                                         <td className="py-2 text-right text-slate-500 px-2">{formatCurrency(row.cumulativeCost)}</td>
                                         <td className="py-2 text-right text-green-400/70 px-2">+{formatCurrency(row.profit)}</td>
                                         <td className={cn("py-2 text-right font-bold px-2", row.realProfit >= 0 ? "text-primary" : "text-yellow-500")}>
                                             {row.realProfit >= 0 ? '+' : ''}{formatCurrency(row.realProfit)}
                                         </td>
                                     </tr>
                                </React.Fragment>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
        </div>

      </Card>
    </div>
  );
};