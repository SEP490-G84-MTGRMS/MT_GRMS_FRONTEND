import type { FC } from 'react';
import { Link } from 'react-router-dom';
import type { SupplierSummary } from '../../types/supplier.types';
import { ArrowLeft, Building2, Edit3, Package } from 'lucide-react';

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
      {/* Breadcrumb / Back Navigation */}
      <div className="supplier-detail-breadcrumb">
        <button
          type="button"
          onClick={onBack}
          className="supplier-detail-back-btn"
          title="Quay lại danh sách nhà cung cấp"
        >
          <ArrowLeft size={16} />
          <span>Nhà cung cấp / Chi tiết</span>
        </button>
      </div>

      {/* Main Header Row */}
      <div className="supplier-detail-header-main">
        {/* Left: Avatar + Title + Meta */}
        <div className="supplier-detail-profile-info">
          <div className="supplier-detail-avatar">
            <Building2 size={26} color="var(--blue-primary)" />
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
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: supplier.status === 'Active' ? '#e6f4ea' : '#f3f4f6',
              color: supplier.status === 'Active' ? '#008800' : '#6b7280',
              border: `1px solid ${supplier.status === 'Active' ? '#008800' : '#d1d5db'}`,
            }}
          >
            {supplier.status === 'Active' ? 'Đang hoạt động' : 'Tạm ngưng'}
          </span>

          <Link
            to={`/store-owner/suppliers/${supplier.id}/products`}
            className="admin-btn admin-btn-secondary"
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 600,
              gap: 6,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Quản lý danh mục sản phẩm của nhà cung cấp này"
          >
            <Package size={14} />
            <span>Sản phẩm ({supplier.code})</span>
          </Link>

          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onEdit}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 13,
              fontWeight: 600,
              gap: 6,
            }}
          >
            <Edit3 size={14} />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
