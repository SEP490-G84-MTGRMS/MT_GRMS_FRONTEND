import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const WebStoreLayout: FC = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col max-w-md mx-auto md:max-w-4xl shadow-sm">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
        <div className="font-bold text-emerald-600 text-lg">Tiệm Tạp Hóa Trực Tuyến</div>
        <div className="text-sm text-gray-500">Giỏ hàng</div>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-100 p-4 text-center text-xs text-gray-400">
        Nền tảng MT-GRMS Mini Web Store
      </footer>
    </div>
  );
};
