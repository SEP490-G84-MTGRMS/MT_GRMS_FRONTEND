import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import { AppTopNav } from './AppTopNav';

export const StoreOwnerLayout: FC = () => {
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
          boxSizing: 'border-box',
          padding: '16px 24px',
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
