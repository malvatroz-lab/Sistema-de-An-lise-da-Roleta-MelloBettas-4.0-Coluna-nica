export const COLUMN_MAP: Record<number, number> = {
  0: 0,
  1: 1, 4: 1, 7: 1, 10: 1, 13: 1, 16: 1, 19: 1, 22: 1, 25: 1, 28: 1, 31: 1, 34: 1,
  2: 2, 5: 2, 8: 2, 11: 2, 14: 2, 17: 2, 20: 2, 23: 2, 26: 2, 29: 2, 32: 2, 35: 2,
  3: 3, 6: 3, 9: 3, 12: 3, 15: 3, 18: 3, 21: 3, 24: 3, 27: 3, 30: 3, 33: 3, 36: 3,
};

export const getColumn = (n: number): number => {
  // Safe integer conversion just in case string is passed
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  
  if (num === 0) return 0;
  
  switch (num) {
    case 1: case 4: case 7: case 10: case 13: case 16: case 19: case 22: case 25: case 28: case 31: case 34:
      return 1;
    case 2: case 5: case 8: case 11: case 14: case 17: case 20: case 23: case 26: case 29: case 32: case 35:
      return 2;
    case 3: case 6: case 9: case 12: case 15: case 18: case 21: case 24: case 27: case 30: case 33: case 36:
      return 3;
    default:
      return 0;
  }
};

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const getNumberColor = (num: number): string => {
  if (num === 0) return 'text-green-500';
  if (RED_NUMBERS.includes(num)) return 'text-red-500';
  return 'text-white'; // Black numbers
};

export const getNumberBgColor = (num: number): string => {
  if (num === 0) return 'bg-green-600';
  if (RED_NUMBERS.includes(num)) return 'bg-red-600';
  return 'bg-slate-800 border-slate-600'; // Black numbers
};

export const getColumnColor = (col: number): string => {
    switch(col) {
        case 0: return 'bg-green-600';
        case 1: return 'bg-red-600'; // Visual identifier
        case 2: return 'bg-blue-600'; // Black numbers column usually
        case 3: return 'bg-amber-600';
        default: return 'bg-slate-700';
    }
}