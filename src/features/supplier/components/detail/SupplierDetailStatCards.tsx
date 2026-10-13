import type { FC } from 'react';
import type { SupplierSummary } from '../../types/supplier.types';

interface Props {
  supplier: SupplierSummary;
}

export const SupplierDetailStatCards: FC<Props> = ({ supplier }) => {
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' đ';

  return (
    <div className="supplier-detail-stat-grid">
      {/* Card 1: Tổng dư nợ */}
      <div className="supplier-detail-stat-card">
        <div className="supplier-stat-card-title">Tổng dư nợ</div>
        <div className="supplier-stat-card-value" style={{ color: 'var(--blue-primary)' }}>
          {fmt(supplier.currentDebt)}
        </div>
        <div className="supplier-stat-card-sub">Số tiền đang phải trả</div>
      </div>

      {/* Card 2: Nợ quá hạn */}
      <div className="supplier-detail-stat-card">
        <div className="supplier-stat-card-title">Nợ quá hạn</div>
        <div
          className="supplier-stat-card-value"
          style={{ color: supplier.overdueDebt > 0 ? 'var(--red-accent)' : 'inherit' }}
        >
          {fmt(supplier.overdueDebt)}
        </div>
        <div className="supplier-stat-card-sub">
          {supplier.overdueDebt > 0
            ? '⚠️ Có khoản nợ quá hạn cần xử lý thanh toán'
            : 'Không có khoản quá hạn'}
        </div>
      </div>

      {/* Card 3: Thời hạn thanh toán */}
      <div className="supplier-detail-stat-card">
        <div className="supplier-stat-card-title">Thời hạn thanh toán</div>
        <div className="supplier-stat-card-value" style={{ fontSize: '1.45rem' }}>
          {supplier.paymentTermDays === 0 ? 'Thanh toán ngay (COD)' : `${supplier.paymentTermDays} ngày`}
        </div>
        <div className="supplier-stat-card-sub">
          Hạn mức nợ tối đa:{' '}
          <b style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {fmt(supplier.creditLimit)}
          </b>
        </div>
      </div>

      {/* Card 4: Trạng thái */}
      <div className="supplier-detail-stat-card">
        <div className="supplier-stat-card-title">Trạng thái</div>
        <div
          className="supplier-stat-card-value"
          style={{
            fontSize: '1rem',
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: supplier.status === 'Active' ? 'var(--green-money)' : '#9ca3af',
              flexShrink: 0,
            }}
          />
          {supplier.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'}
        </div>
        <div className="supplier-stat-card-sub" style={{ marginTop: 8 }}>
          Đánh giá: ⭐ {supplier.rating?.toFixed(1) ?? 'N/A'}
        </div>
      </div>
    </div>
  );
};
