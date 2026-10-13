import type { FC } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Store } from 'lucide-react';

export const MasterLayout: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7faff]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0066ff]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-lg text-gray-900 tracking-tight leading-none">
              MT-GRMS <span className="text-[#0066ff]">Manager</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium mt-1">
              Hệ thống Quản lý Chuỗi Cửa Hàng Bán Lẻ
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0066ff] text-xs font-semibold">
            Chi nhánh Quận 1 (Trụ sở)
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
            AN
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 p-4 shrink-0 shadow-sm flex flex-col justify-between">
          <nav className="space-y-1.5 text-sm">
            <div className="font-bold text-gray-400 uppercase text-[11px] px-3 py-2 tracking-wider">
              Phân hệ Quản trị
            </div>

            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0066ff] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tổng quan</span>
            </NavLink>

            <NavLink
              to="/dashboard/expenses"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0066ff] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <ReceiptText className="w-4 h-4" />
              <span>Chi phí vận hành (FE-07)</span>
            </NavLink>
          </nav>

          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400 text-center">
            MT-GRMS v1.0 · Design KiotViet
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
