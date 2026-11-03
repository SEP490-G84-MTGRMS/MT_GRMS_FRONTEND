import { useState } from 'react';
import type { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { useAuthStore } from '../../stores/useAuthStore';

export const AdminLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  // Kiểm tra quyền: nếu chưa đăng nhập -> chuyển về màn hình đăng nhập
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Nếu không phải Admin (isAdmin !== true và role !== 'ADMIN') -> chỉ được truy cập màn hình Chủ cửa hàng
  const isAdmin = Boolean(user.isAdmin || user.role === 'ADMIN');
  if (!isAdmin) {
    return <Navigate to="/store-owner/dashboard" replace />;
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_open', String(next));
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
