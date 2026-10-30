import type { FC } from 'react';
import type { SupplierSummary } from '../../types/supplier.types';
import { ArrowLeft, Building2, Edit3 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onBack: () => void;
  onEdit: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  FRESH: 'Nông sản',
  AMBIENT: 'Hàng khô / Đồ khô',
  FROZEN: 'Thực phẩm đông lạnh',
  UTILITIES: 'Tiện ích / Điện nước',
  RENT: 'Mặt bằng',
  LOGISTICS: 'Vận chuyển',
};

const TYPE_LABEL: Record<string, string> = {
  Goods: 'Doanh nghiệp Hàng hóa',
  Service: 'Dịch vụ',
  Both: 'Doanh nghiệp Hàng hóa & DV',
};

export const SupplierDetailHeader: FC<Props> = ({ supplier, onBack, onEdit }) => {
  return (
    <div className="supplier-detail-header-card">
      {/* Main Header Row */}
      <div className="supplier-detail-header-main">
        {/* Left: Back button + Avatar + Title + Meta */}
        <div className="supplier-detail-profile-info">
          <button
            type="button"
            onClick={onBack}
            className="admin-btn admin-btn-secondary"
            title="Quay lại danh sách nhà cung cấp"
            style={{ height: 32, padding: '0 10px', fontSize: 12.5 }}
          >
            <ArrowLeft size={15} />
            <span>Quay lại</span>
          </button>

          <div className="supplier-detail-avatar">
            <Building2 size={20} color="var(--blue-primary)" />
          </div>
          <div>
            <h1 className="supplier-detail-title">{supplier.name}</h1>
            <div className="supplier-detail-meta">
              <span className="supplier-detail-code">{supplier.code}</span>
              <span className="supplier-detail-dot">·</span>
              <span>{TYPE_LABEL[supplier.supplierType] || supplier.supplierType}</span>
              <span className="supplier-detail-dot">·</span>
              <span>{CATEGORY_LABEL[supplier.category] || supplier.category}</span>
            </div>
          </div>
        </div>

        {/* Right: Status badge + Action Button */}
        <div className="supplier-detail-actions">
          <span
            className={`admin-badge ${supplier.status === 'Active' ? 'admin-badge-active' : 'admin-badge-inactive'}`}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: supplier.status === 'Active' ? '#e6f4ea' : '#f3f4f6',
              color: supplier.status === 'Active' ? '#008800' : '#6b7280',
              border: `1px solid ${supplier.status === 'Active' ? '#008800' : '#d1d5db'}`,
            }}
          >
            {supplier.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'}
          </span>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={onEdit}
            style={{ height: 32, padding: '0 12px', fontSize: 12.5 }}
          >
            <Edit3 size={14} />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
