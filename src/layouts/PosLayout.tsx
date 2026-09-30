import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const PosLayout: FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-900 text-white select-none">
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between text-sm">
        <div className="font-semibold text-emerald-400">MT-GRMS POS Counter</div>
        <div className="text-xs text-slate-400">Phím tắt: F1-F12 | Thu ngân: [Ca trực]</div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
