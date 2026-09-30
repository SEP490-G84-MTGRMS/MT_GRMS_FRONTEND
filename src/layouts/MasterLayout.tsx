import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const MasterLayout: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
        <div className="font-bold text-lg text-emerald-600">MT-GRMS Store Manager</div>
        <div className="text-sm text-gray-500">Master Layout</div>
      </header>
      <div className="flex-1 flex">
        <aside className="w-64 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-1 text-sm">
            <div className="font-semibold text-gray-400 uppercase text-xs mb-2">Quản trị cửa hàng</div>
            {/* Sidebar menu items will be added here */}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
