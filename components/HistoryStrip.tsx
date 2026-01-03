import React from 'react';
import { getNumberBgColor, getNumberColor } from '../lib/constants';
import { cn } from '../lib/utils';

interface Props {
  numbers: number[];
}

export const HistoryStrip: React.FC<Props> = ({ numbers }) => {
  return (
    <div className="w-full bg-slate-900 border-y border-slate-800 py-3 overflow-hidden">
        <div className="flex items-center gap-2 px-4 overflow-x-auto hide-scrollbar flex-row-reverse">
            {numbers.map((num, idx) => (
                <div
                    key={`${num}-${idx}`}
                    className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all border-2",
                        getNumberBgColor(num),
                        getNumberColor(num),
                        idx === 0 ? "scale-110 border-white ring-2 ring-white/20 z-10" : "border-transparent opacity-80"
                    )}
                >
                    {num}
                </div>
            ))}
            {numbers.length === 0 && (
                <span className="text-slate-600 text-sm mx-auto">Aguardando números...</span>
            )}
        </div>
    </div>
  );
};
