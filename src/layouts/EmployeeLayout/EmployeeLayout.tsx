import type { FC } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuthStore } from '../../stores/useAuthStore';

export const EmployeeLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        width: '100%',
        backgroundColor: '#F8FAFC',
        color: 'var(--text-main)',
        overflow: 'hidden',
      }}
    >
      {/* Top navigation specifically customized for employees */}
      <AppTopNav />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          width: '100%',
          padding: '16px 28px 20px 28px',
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

export default EmployeeLayout;

