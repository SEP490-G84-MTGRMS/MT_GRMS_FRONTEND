import { create } from 'zustand';

interface ShiftState {
  currentShiftId: string | null;
  cashierName: string | null;
  startTime: string | null;
  startingCash: number;
  isOpen: boolean;
  openShift: (shiftId: string, cashierName: string, startingCash: number) => void;
  closeShift: () => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  currentShiftId: null,
  cashierName: null,
  startTime: null,
  startingCash: 0,
  isOpen: false,
  openShift: (shiftId, cashierName, startingCash) =>
    set({
      currentShiftId: shiftId,
      cashierName,
      startingCash,
      startTime: new Date().toISOString(),
      isOpen: true,
    }),
  closeShift: () =>
    set({
      currentShiftId: null,
      cashierName: null,
      startTime: null,
      startingCash: 0,
      isOpen: false,
    }),
}));
