import type { FC } from 'react';
import type { SupplierStats } from '../types/supplier.types';
import { Wallet, AlertTriangle, Clock, Store } from 'lucide-react';
import '../supplier.css';

interface Props {
  stats: SupplierStats;
}

export const SupplierStatsCards: FC<Props> = ({ stats }) => {
  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ';

  return (
    <div className="stats-grid">
      {/* Card 1: Tổng công nợ AP */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">💰 TỔNG CÔNG NỢ AP</span>
          <div className="stat-card-icon stat-card-icon--blue"><Wallet size={20} /></div>
        </div>
        <div>
          <div className="stat-card-value">{fmt(stats.totalDebt)}</div>
          <div className="stat-card-sub">Tổng tiền phải trả cho tất cả nhà cung cấp</div>
        </div>
      </div>

      {/* Card 2: Nợ quá hạn */}
      <div className="stat-card stat-card--overdue">
        <div className="stat-card-header">
          <span className="stat-card-label stat-card-label--danger">🚨 NỢ QUÁ HẠN (OVERDUE AP)</span>
          <div className="stat-card-icon stat-card-icon--red"><AlertTriangle size={20} /></div>
        </div>
        <div>
          <div className="stat-card-value stat-card-value--danger">{fmt(stats.overdueDebt)}</div>
          <div className="stat-card-sub stat-card-sub--danger">
            {stats.overdueDebt > 0 ? 'Đã quá hạn thanh toán theo Payment Term' : 'Không có công nợ quá hạn'}
          </div>
        </div>
      </div>

      {/* Card 3: Sắp tới hạn 7 ngày */}
      <div className="stat-card stat-card--warning">
        <div className="stat-card-header">
          <span className="stat-card-label stat-card-label--warning">⌛ SẮP TỚI HẠN (7 NGÀY)</span>
          <div className="stat-card-icon stat-card-icon--orange"><Clock size={20} /></div>
        </div>
        <div>
          <div className="stat-card-value">{fmt(stats.dueSoon7Days)}</div>
          <div className="stat-card-sub">Cần chuẩn bị dòng tiền trả nợ trong tuần</div>
        </div>
      </div>

      {/* Card 4: Tổng NCC Active */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-card-label">🏪 TỔNG NCC ACTIVE</span>
          <div className="stat-card-icon stat-card-icon--green"><Store size={20} /></div>
        </div>
        <div>
          <div className="stat-card-value">
            {stats.totalActive} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>Đối tác</span>
          </div>
          <div className="stat-card-sub stat-card-sub--green">Sẵn sàng giao hàng cho tạp hóa</div>
        </div>
      </div>
    </div>
  );
};
