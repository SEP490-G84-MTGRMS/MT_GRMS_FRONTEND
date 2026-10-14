import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const PosLayout: FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F7FAFF] text-[#111827]">
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

