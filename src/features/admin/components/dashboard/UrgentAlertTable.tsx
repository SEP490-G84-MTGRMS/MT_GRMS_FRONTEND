import type { FC } from 'react';
import type { UrgentAlertTenant } from '../../types/admin.types';

interface UrgentAlertTableProps {
  tenants: UrgentAlertTenant[];
  onViewAll?: () => void;
  onExtendGrace?: (subdomain: string) => void;
  onDetail?: (subdomain: string) => void;
  onLock?: (subdomain: string) => void;
}

export const UrgentAlertTable: FC<UrgentAlertTableProps> = ({
  tenants,
  onViewAll,
  onExtendGrace,
  onDetail,
  onLock,
}) => {
  return (
    <div className="admin-table-card">
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Danh sách Khách hàng Cần Can Thiệp Khẩn Cấp (&le; 7 ngày)
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Các tenant sắp hết hợp đồng hoặc đang trong thời gian ân hạn cần liên hệ gia hạn
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-secondary"
          onClick={onViewAll}
        >
          Xem toàn bộ danh sách &rarr;
        </button>
      </div>

      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Subdomain</th>
            <th>Tên Chuỗi / Cửa Hàng</th>
            <th>Chủ Sở Hữu & Hotline</th>
            <th>Gói Dịch Vụ</th>
            <th>Hạn Hợp Đồng</th>
            <th>Trạng Thái</th>
            <th style={{ textAlign: 'right' }}>Tác Vụ Nhanh</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.subdomain}>
              <td>
                <span className="admin-subdomain-tag">{t.subdomain}</span>
              </td>
              <td>
                <span style={{ fontWeight: 600, color: '#111827' }}>{t.name}</span>
              </td>
              <td style={{ color: '#4b5563' }}>
                {t.ownerName} &bull; {t.hotline}
              </td>
              <td>
                <span className="admin-table-neutral-tag">{t.planText}</span>
              </td>
              <td style={{ color: '#374151', fontWeight: 500 }}>
                {t.expiryNotice}
              </td>
              <td>
                <span className="admin-table-status-tag">
                  {t.statusText}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  {t.statusType === 'grace' ? (
                    <button
                      type="button"
                      className="admin-table-btn"
                      onClick={() => onLock?.(t.subdomain)}
                    >
                      Khóa mềm
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="admin-table-btn"
                      onClick={() => onExtendGrace?.(t.subdomain)}
                    >
                      Gia hạn ân hạn
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-table-btn admin-table-btn-primary"
                    onClick={() => onDetail?.(t.subdomain)}
                  >
                    Chi tiết
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
