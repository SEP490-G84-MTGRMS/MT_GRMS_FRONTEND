import type { FC } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';
import { useAuthStore } from '../../stores/useAuthStore';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';

export const StoreOwnerLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role !== 'STORE_OWNER') {
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
        className="so-layout-main"
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
          boxSizing: 'border-box',
        }}
      >
        <ProtectedRoute allowedRoles={['STORE_OWNER']}>
          <Outlet />
        </ProtectedRoute>
      </main>
    </div>
  );
};

export default StoreOwnerLayout;
