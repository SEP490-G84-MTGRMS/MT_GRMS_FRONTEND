import type { FC } from 'react';
import type { SupplierSummary } from '../../types/supplier.types';
import { ArrowLeft, Building2, Edit3 } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onBack: () => void;
  onEdit?: () => void;
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

export const SupplierDetailHeader: FC<Props> = ({ supplier, onBack }) => {
  return (
    <div className="supplier-detail-header-card" data-testid="supplier-detail-header">
      {/* Main Header Row */}
      <div className="supplier-detail-header-main">
        {/* Left: Avatar + Title + Meta */}
        <div className="supplier-detail-profile-info">
          <div className="supplier-detail-avatar" data-testid="supplier-detail-avatar">
            <Building2 size={20} color="var(--blue-primary)" />
          </div>
          <div>
            <h1 className="supplier-detail-title" data-testid="supplier-detail-title">{supplier.name}</h1>
            <div className="supplier-detail-meta" data-testid="supplier-detail-meta">
              <span className="supplier-detail-code" data-testid="supplier-detail-code">{supplier.code}</span>
              <span className="supplier-detail-dot">·</span>
              <span>{TYPE_LABEL[supplier.supplierType] || supplier.supplierType}</span>
              <span className="supplier-detail-dot">·</span>
              <span>{CATEGORY_LABEL[supplier.category] || supplier.category}</span>
            </div>
          </div>
        </div>

        {/* Right: Only Back Button (R2 & R3: Status badge & Edit button removed from shared header) */}
        <div className="supplier-detail-actions">
          <button
            type="button"
            onClick={onBack}
            className="admin-btn admin-btn-secondary"
            title="Quay lại danh sách nhà cung cấp"
            data-testid="supplier-header-back-btn"
            style={{ height: 32, padding: '0 14px', fontSize: 12.5, gap: 6 }}
          >
            <ArrowLeft size={15} />
            <span>Quay lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
