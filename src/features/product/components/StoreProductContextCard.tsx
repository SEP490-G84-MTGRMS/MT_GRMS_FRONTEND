import type { FC } from 'react';
import type { StoreSummary } from '../types/storeProduct.types';

interface StoreProductContextCardProps {
  store: StoreSummary;
  stores: StoreSummary[];
  onSelectStore: (storeId: string) => void;
  productCount: number;
}

export const StoreProductContextCard: FC<StoreProductContextCardProps> = ({
  store,
  stores,
  onSelectStore,
  productCount,
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Left: Store details + quick switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: '#f0fdfa',
            border: '1px solid #ccfbf1',
            color: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          🏪
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              {store.name}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              Mã CH: {store.code || store.id}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 4,
              fontSize: 12.5,
              color: '#64748b',
            }}
          >
            <span>{store.address || 'Hồ Chí Minh'}</span>
            <span>•</span>
            <span>Quản lý: <b>{store.managerName || 'Phụ trách'}</b></span>
            <span>•</span>
            <span>SĐT: <b>{store.phone || '0901 234 567'}</b></span>
          </div>
        </div>
      </div>

      {/* Middle/Right: Quick Switcher & Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Xem Cửa hàng khác:</span>
          <select
            className="po-ctrl-select"
            style={{ width: 190, fontWeight: 600 }}
            value={store.id}
            onChange={(e) => onSelectStore(e.target.value)}
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3 Metric Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>SẢN PHẨM (SKU)</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2563eb' }}>
              {productCount}
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>TỒN KHO THỰC TẾ</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0d9488' }}>
              {fmt(store.totalStock || 0)}
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: store.lowStockCount > 0 ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${store.lowStockCount > 0 ? '#fde68a' : '#e2e8f0'}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10.5, color: store.lowStockCount > 0 ? '#b45309' : '#64748b', fontWeight: 600 }}>
              CẦN NHẬP THÊM
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: store.lowStockCount > 0 ? '#d97706' : '#64748b' }}>
              {store.lowStockCount || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreProductContextCard;
