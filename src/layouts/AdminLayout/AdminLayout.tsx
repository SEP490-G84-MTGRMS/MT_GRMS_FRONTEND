import { useState } from 'react';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout: FC = () => {
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
      <AdminSidebar isOpen={isSidebarOpen} onToggle={handleToggleSidebar} />
      <main className="admin-main">
        <div className="admin-content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

