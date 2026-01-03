import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, X, ArrowRightLeft } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Signal, RECOVERY_PROGRESSION } from '../types';

interface Props {
  lastEvent: 'WIN' | 'LOSS' | 'SIGNAL' | null;
  eventData: any; // Signal object (with context) or Profit amount
  onClear: () => void;
}

// Function to play system sounds using standard Web Audio API (No external files needed)
const playSystemSound = (type: 'WIN' | 'LOSS' | 'SIGNAL') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'WIN') {
      // Coin / Success sound (High pitch arpeggio)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.linearRampToValueAtTime(1046.50, now + 0.1); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      
      // Secondary "Cling"
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1); 
      gain2.gain.setValueAtTime(0.1, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);

    } else if (type === 'LOSS') {
      // Error sound (Low pitch saw)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);

    } else if (type === 'SIGNAL') {
      // Digital Notification Beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }

  } catch (e) {
    console.error("Audio playback error:", e);
  }
};

export const GameNotifications: React.FC<Props> = ({ lastEvent, eventData, onClear }) => {
  const [visible, setVisible] = useState(false);

  // Play Sound and Show Notification
  useEffect(() => {
    if (lastEvent) {
      // Use internal synthesizer
      playSystemSound(lastEvent);

      setVisible(true);

      // Auto hide wins/losses after 3 seconds, keep signals longer
      const timer = setTimeout(() => {
        setVisible(false);
        onClear();
      }, lastEvent === 'SIGNAL' ? 8000 : 3000);

      return () => clearTimeout(timer);
    }
  }, [lastEvent, eventData, onClear]);

  if (!visible || !lastEvent) return null;

  const content = () => {
    switch (lastEvent) {
      case 'WIN':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#151F32] border-2 border-green-500 rounded-2xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-bounce-short">
              <CheckCircle2 className="w-24 h-24 text-green-500 mb-4 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">Green!</h1>
              <p className="text-xl text-green-400 font-mono font-bold">
                 + {formatCurrency(eventData || 0)}
              </p>
            </div>
            {/* Confetti CSS Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <div className="absolute top-0 left-1/2 w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDuration: '1s'}}></div>
               <div className="absolute top-10 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-ping" style={{animationDuration: '1.2s'}}></div>
               <div className="absolute top-20 left-3/4 w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDuration: '0.8s'}}></div>
            </div>
          </div>
        );
      case 'LOSS':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#151F32] border-2 border-red-500 rounded-2xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-shake">
              <XCircle className="w-24 h-24 text-red-500 mb-4" />
              <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-widest">Stop Loss</h1>
              <p className="text-slate-400">Ciclo encerrado. Recalculando...</p>
            </div>
          </div>
        );
      case 'SIGNAL':
         if (!eventData || typeof eventData !== 'object') return null;
         
         // eventData agora contém { signal, step, isSwitch }
         const { signal, step, isSwitch } = eventData;
         
         return (
          <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
             <div className={cn(
                 "bg-[#151F32] border-l-4 rounded-lg shadow-2xl p-4 w-80 relative overflow-hidden",
                 isSwitch ? "border-purple-500 shadow-purple-500/20" : "border-primary shadow-primary/20"
             )}>
                <div className="absolute top-0 right-0 p-2">
                   <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
                
                <div className="flex items-start gap-3">
                   <div className={cn("p-2 rounded-full animate-pulse", isSwitch ? "bg-purple-900/40" : "bg-primary/20")}>
                      {isSwitch ? <ArrowRightLeft className="w-6 h-6 text-purple-400" /> : <AlertTriangle className="w-6 h-6 text-primary" />}
                   </div>
                   <div>
                      <h3 className="font-bold text-white text-lg leading-none mb-1">
                          {isSwitch ? "MUDANÇA DE ALVO" : "Entrada Confirmada"}
                      </h3>
                      <p className={cn("font-bold text-xl mb-1", isSwitch ? "text-purple-400" : "text-primary")}>
                          Coluna {signal.column}
                      </p>
                      <div className="text-xs text-slate-400 space-y-1">
                          <p>Confiança: <span className={cn(isSwitch ? "text-purple-300" : "text-green-400")}>{signal.confidence}%</span></p>
                          <div className="flex flex-wrap gap-1 mt-1">
                             {signal.triggers.slice(0, 2).map((t: string, i: number) => (
                               <span key={i} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                             ))}
                          </div>
                      </div>
                   </div>
                </div>
                
                <div className={cn(
                    "mt-3 rounded p-2 text-center text-xs font-bold",
                    isSwitch ? "bg-purple-900/30 text-purple-300 border border-purple-500/30" : "bg-primary/10 text-primary"
                )}>
                   {isSwitch 
                      ? `MANTENHA O GALE (NÍVEL ${step + 1})`
                      : "Inicie a progressão agora!"
                   }
                </div>
             </div>
          </div>
         );
      default:
        return null;
    }
  };

  return createPortal(content(), document.body);
};