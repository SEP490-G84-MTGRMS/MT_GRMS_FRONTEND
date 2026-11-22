import { useState } from 'react';
import type { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAuthStore } from '../../stores/useAuthStore';

export const AdminLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_sidebar_open') ?? localStorage.getItem('admin_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }
  if (!(user.isAdmin || user.role === 'ADMIN')) {
    return <Navigate to="/store-owner/dashboard" replace />;
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ui_sidebar_open', String(next));
        localStorage.removeItem('admin_sidebar_open');
      } catch {
        // ignore
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 230);
      return next;
    });
  };

  return (
    <div className={`admin-shell ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {/* Navbar dọc bên trái (Sidebar) */}
      <AdminSidebar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />

      {/* Vùng nội dung chính (không dùng topbar trên đầu) */}
      <main className="admin-main">
        <div className="admin-content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
