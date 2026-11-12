import type { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export const StoreOwnerLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Role Guard: Nhân viên (STAFF) không được phép truy cập cổng quản trị của Chủ cửa hàng
  if (user.role === 'STAFF') {
    return <Navigate to="/employee/schedule" replace />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        width: '100%',
        backgroundColor: '#ffffff',
        color: 'var(--text-main)',
        overflow: 'hidden',
      }}
    >
      {/* Two-row sticky topbar */}
      <AppTopNav />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          width: '100%',
          padding: '16px 32px 20px 32px',
          maxWidth: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <ProtectedRoute>
          <Outlet />
        </ProtectedRoute>
      </main>
    </div>
  );
};

export default StoreOwnerLayout;
