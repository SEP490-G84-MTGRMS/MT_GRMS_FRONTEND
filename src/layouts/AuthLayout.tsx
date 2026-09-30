import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 border border-slate-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">MT-GRMS</h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống Quản lý Bán lẻ Đa Người Thuê</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
