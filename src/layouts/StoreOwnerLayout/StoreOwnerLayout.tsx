import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';

export const StoreOwnerLayout: FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-soft-blue)',
        color: 'var(--text-main)',
      }}
    >
      {/* Two-row sticky topbar */}
      <AppTopNav />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          width: '100%',
          boxSizing: 'border-box',
          padding: '28px 32px 48px 32px',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default StoreOwnerLayout;
