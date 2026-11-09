import type { FC } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';
import { useAuthStore } from '../../stores/useAuthStore';

export const StoreOwnerLayout: FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  const role = (user.role || '').toUpperCase();
  const isEmployee = role === 'EMPLOYEE' || role === 'CASHIER' || role === 'STAFF';

  // Route Guard: Nếu Employee cố tình truy cập vào các màn hình quản trị / tài chính / thuế của Chủ hộ -> Chuyển về POS
  if (isEmployee) {
    const restrictedPrefixes = [
      '/store-owner/tax',
      '/store-owner/accounting-books',
      '/store-owner/tax-snapshots',
      '/store-owner/reports/pnl',
      '/store-owner/pnl',
      '/store-owner/cashbook',
      '/store-owner/finance',
      '/store-owner/expenses',
      '/store-owner/employees',
      '/store-owner/subscriptions',
      '/store-owner/settings',
      '/store-owner/dashboard',
      '/tax-snapshots',
      '/cashbook',
      '/expenses',
      '/employees',
    ];

    const isRestricted = restrictedPrefixes.some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
    );

    if (isRestricted || location.pathname === '/store-owner' || location.pathname === '/store-owner/') {
      return <Navigate to="/employee/pos" replace />;
    }
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
        <Outlet />
      </main>
    </div>
  );
};

export default StoreOwnerLayout;
