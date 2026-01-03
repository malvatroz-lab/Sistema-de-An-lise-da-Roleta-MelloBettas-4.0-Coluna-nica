import React, { useState, useRef } from 'react';
import { Button } from './ui/Button';
import { Trash2, RotateCcw, Clipboard, Plus, History, Loader2, Upload } from 'lucide-react';
import { getNumberBgColor, getColumn } from '../lib/constants';
import { cn } from '../lib/utils';
import { Card } from './ui/Card';
import { HistoryItem } from '../types';

interface Props {
  onAddNumber: (num: number) => void;
  onAddBulk: (nums: number[]) => void;
  onUndo: () => void;
  onReset: () => void;
  history: HistoryItem[];
}

export const NumberInput: React.FC<Props> = ({ onAddNumber, onAddBulk, onUndo, onReset, history }) => {
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false); // New state for reset confirmation
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(manualInput);
    if (!isNaN(num) && num >= 0 && num <= 36) {
      onAddNumber(num);
      setManualInput('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const numbers = text.match(/\b\d+\b/g);
      if (numbers) {
         const valid = numbers.map(n => parseInt(n)).filter(n => n >= 0 && n <= 36);
         if (valid.length > 0) {
             onAddBulk([...valid]);
         }
      } else {
          alert("Nenhum número encontrado no texto colado.");
      }
    } catch (err) {
      console.error("Paste failed", err);
      alert("Erro ao colar. Permissão negada?");
    }
  }

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        await processImage(file);
    }
    // Clear input to allow re-uploading the same file if needed (reset scenario)
    if (event.target) event.target.value = '';
  };

  const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(img.src);
                return;
            }

            const scale = 2.5;
            const padding = 40; 
            
            canvas.width = (img.width * scale) + (padding * 2);
            canvas.height = (img.height * scale) + (padding * 2);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(img, padding, padding, img.width * scale, img.height * scale);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const maxVal = Math.max(r, g, b);
                const inverted = 255 - maxVal;
                let contrast = (inverted - 30) * 1.5;
                if (contrast < 0) contrast = 0;
                if (contrast > 255) contrast = 255;
                data[i] = contrast;     
                data[i + 1] = contrast; 
                data[i + 2] = contrast; 
                data[i + 3] = 255;      
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
    });
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    try {
        const Tesseract = (window as any).Tesseract;
        if (!Tesseract) {
            alert("Erro: Biblioteca OCR não carregada.");
            return;
        }

        const processedImageUrl = await preprocessImage(file);
        const worker = await Tesseract.createWorker('eng');
        
        await worker.setParameters({
            tessedit_pageseg_mode: '6',
            tessedit_char_whitelist: '0123456789 ', 
        });

        const { data: { text } } = await worker.recognize(processedImageUrl);
        await worker.terminate();
        
        console.log("OCR Raw Text:", text);

        const matches = text
            .replace(/[^0-9\s]/g, '')      
            .split(/\s+/)                  
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 36); 

        if (matches.length === 0) {
            alert("Nenhum número válido identificado. O print está nítido?");
            return;
        }

        if (matches.length < 3) {
            const confirmed = window.confirm(`Encontrei apenas: ${matches.join(', ')}. Estão corretos?`);
            if (!confirmed) return;
        }

        onAddBulk(matches);

    } catch (error) {
        console.error("Erro OCR:", error);
        alert("Erro ao processar imagem.");
    } finally {
        setIsProcessing(false);
    }
  };

  const rows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
  ];

  const handleResetClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (confirmReset) {
          onReset();
          setConfirmReset(false);
      } else {
          setConfirmReset(true);
          // Auto revert after 3 seconds if not confirmed
          setTimeout(() => {
              setConfirmReset(false);
          }, 3000);
      }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <Card className="p-4 bg-[#151F32] border-[#1E293B]">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entrada de Números</h3>
            <div className="flex gap-1 items-center">
                <button 
                    type="button"
                    onClick={onUndo} 
                    className="p-1.5 hover:bg-[#1E293B] rounded text-slate-400 transition-colors cursor-pointer" 
                    title="Desfazer Último"
                >
                    <RotateCcw className="w-3.5 h-3.5 pointer-events-none" />
                </button>
                
                <button 
                    type="button"
                    onClick={handleResetClick} 
                    className={cn(
                        "p-1.5 rounded transition-all duration-200 cursor-pointer flex items-center justify-center",
                        confirmReset 
                            ? "bg-red-600 text-white w-auto px-2 animate-pulse" 
                            : "hover:bg-red-900/30 text-slate-400 hover:text-red-400"
                    )}
                    title="Reiniciar Sessão"
                >
                    {confirmReset ? (
                        <span className="text-[10px] font-bold whitespace-nowrap">CONFIRMAR?</span>
                    ) : (
                        <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                    )}
                </button>
            </div>
        </div>

        <div className="flex gap-2 mb-4">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={triggerFileUpload} 
                disabled={isProcessing} 
                className="flex-1 text-xs border-dashed border-slate-600 text-slate-300 hover:bg-[#1E293B] hover:text-white relative overflow-hidden transition-all"
                title="Melhor resultado: Recorte apenas a linha de números"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Processando...
                    </>
                ) : (
                    <>
                        <Upload className="w-3 h-3 mr-2" /> Enviar Print
                    </>
                )}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handlePaste} className="text-xs border-dashed border-slate-600 text-slate-400 hover:bg-[#1E293B] hover:text-white" title="Colar Texto Copiado">
                <Clipboard className="w-3 h-3" />
            </Button>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2 mb-6">
            <input 
                type="number"
                min="0" max="36"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="0-36"
                className="w-full bg-[#0B1120] border border-[#1E293B] rounded text-center text-sm p-2 focus:ring-1 focus:ring-primary outline-none text-white"
            />
            <Button type="submit" size="sm" className="bg-[#1E293B] hover:bg-[#283547] text-white px-4">
                <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
        </form>

        <div className="space-y-1">
            <p className="text-[10px] text-slate-500 mb-2">Acesso rápido:</p>
            <button
                type="button"
                onClick={() => onAddNumber(0)}
                className="w-full h-8 bg-green-900/40 hover:bg-green-800/60 border border-green-800/50 text-green-400 rounded flex items-center justify-center font-bold text-sm mb-1 transition-colors"
            >
                0
            </button>
            <div className="flex flex-col gap-1">
                {rows.map((row, i) => (
                    <div key={i} className="flex gap-1">
                        {row.map(num => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => onAddNumber(num)}
                                className={cn(
                                    "flex-1 h-8 rounded text-xs font-medium transition-all hover:brightness-110",
                                    getNumberBgColor(num) === 'bg-red-600' ? 'bg-red-900/40 border border-red-900/50 text-red-400' :
                                    getNumberBgColor(num) === 'bg-slate-800 border-slate-600' ? 'bg-[#0B1120] border border-[#1E293B] text-slate-300' : ''
                                )}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </Card>

      <Card className="flex-1 bg-[#151F32] border-[#1E293B] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[#1E293B] flex justify-between items-center bg-[#1A2740]">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <History className="w-3.5 h-3.5" /> HISTÓRICO
              </h3>
              <span className="text-[10px] text-slate-600">{history.length}/1000</span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
             {history.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs p-4 text-center">
                     Nenhum número registrado<br/>
                     <span className="text-[10px] opacity-50 mt-2">Use o botão "Enviar Print" ou digite manualmente</span>
                 </div>
             ) : (
                <div className="w-full text-sm">
                    <div className="flex text-[10px] text-slate-500 px-3 py-1 border-b border-[#1E293B]">
                        <span className="w-8">#</span>
                        <span className="w-8 text-center">Nº</span>
                        <span className="flex-1 text-center">Col</span>
                        <span className="w-16 text-right">Hora</span>
                    </div>
                    {history.map((item, idx) => (
                        <div key={idx} className="flex items-center px-3 py-1.5 border-b border-[#1E293B]/50 hover:bg-[#1E293B]/50">
                             <span className="w-8 text-[10px] text-slate-600">{history.length - idx}</span>
                             <div className="w-8 flex justify-center">
                                 <span className={cn(
                                     "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                                     getNumberBgColor(item.number) === 'bg-green-600' ? 'bg-green-500 text-black' :
                                     getNumberBgColor(item.number) === 'bg-red-600' ? 'bg-red-500 text-white' : 'bg-slate-700 text-white'
                                 )}>
                                     {item.number}
                                 </span>
                             </div>
                             <span className="flex-1 text-center text-xs text-slate-400">C{getColumn(item.number) || '-'}</span>
                             <span className="w-16 text-right text-[10px] text-slate-600">
                                 {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                             </span>
                        </div>
                    ))}
                </div>
             )}
          </div>
      </Card>
    </div>
  );
};