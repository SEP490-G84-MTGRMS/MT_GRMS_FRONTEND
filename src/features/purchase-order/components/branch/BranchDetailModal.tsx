import type { FC } from 'react';
import type { BranchListItem } from '../../types/po.types';
import {
  X,
  Store,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Clock,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react';

interface BranchDetailModalProps {
  branch: BranchListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOrder: (branchId: string) => void;
}

export const BranchDetailModal: FC<BranchDetailModalProps> = ({
  branch,
  isOpen,
  onClose,
  onOrder,
}) => {
  if (!isOpen || !branch) return null;

  const isInactive = branch.status === 'inactive';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          maxWidth: 600,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(15, 118, 110, 0.1)',
                color: 'var(--blue-primary, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-main, #0f172a)',
                  }}
                >
                  {branch.name}
                </h2>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: '#e2e8f0',
                    color: '#334155',
                  }}
                >
                  {branch.code}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-muted, #64748b)',
                  marginTop: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MapPin size={12} />
                <span>{branch.address}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Thông tin trạng thái */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Trạng thái hoạt động</div>
              <div>
                {branch.status === 'active' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Đang hoạt động
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    Ngừng hoạt động
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tồn kho thực tế</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                {new Intl.NumberFormat('vi-VN').format(branch.stockQty)}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>sản phẩm</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Số lượng đặt hàng hiện tại</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue-primary)', fontFamily: 'monospace' }}>
                {new Intl.NumberFormat('vi-VN').format(branch.orderQty)}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>sản phẩm</span>
              </div>
            </div>
          </div>

          {/* Ghi chú tồn kho */}
          {branch.inventoryNote && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                borderLeft: '3px solid var(--blue-primary, #0f766e)',
                fontSize: 12.5,
                color: '#334155',
              }}
            >
              <b>Ghi chú hàng hóa:</b> {branch.inventoryNote}
            </div>
          )}

          {/* Người phụ trách */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={15} style={{ color: 'var(--blue-primary, #0f766e)' }} />
              Người phụ trách chi nhánh
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ color: '#64748b' }}>Họ tên:</span>{' '}
                <b style={{ color: '#0f172a' }}>{branch.managerName}</b>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} style={{ color: '#64748b' }} />
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{branch.managerPhone}</span>
              </div>
              {branch.managerEmail && (
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} style={{ color: '#64748b' }} />
                  <span style={{ color: '#334155' }}>{branch.managerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tình hình đơn mua hàng */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={15} style={{ color: 'var(--blue-primary, #0f766e)' }} />
              Tình hình đơn mua hàng
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#475569' }}>Tổng quan PO: <b>{branch.orderSummary}</b></span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12 }}>
                <Clock size={12} />
                <span>Cập nhật: {branch.lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-light, #e2e8f0)',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="po-btn po-btn-outline"
            style={{ height: 36, padding: '0 16px' }}
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isInactive}
            onClick={() => {
              onClose();
              onOrder(branch.id);
            }}
            className="po-btn po-btn-primary"
            style={{
              height: 36,
              padding: '0 18px',
              opacity: isInactive ? 0.5 : 1,
              cursor: isInactive ? 'not-allowed' : 'pointer',
            }}
            title={isInactive ? 'Chi nhánh ngừng hoạt động không thể đặt hàng' : 'Tạo đơn đặt hàng ma trận'}
          >
            <ShoppingCart size={15} />
            <span>Đặt hàng chi nhánh này</span>
          </button>
        </div>
      </div>
    </div>
  );
};
