import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const PosLayout: FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F7FAFF] text-[#111827]">
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ProtectedRoute>
          <Outlet />
        </ProtectedRoute>
      </main>
    </div>
  );
};
