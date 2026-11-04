import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary } from '../../types/supplier.types';
import { Copy, Check, QrCode, Edit3, Plus } from 'lucide-react';
import { SupplierVietQrCard } from './SupplierVietQrCard';

interface Props {
  supplier: SupplierSummary;
  canEdit?: boolean;
  onLinkCustomer?: (supplierId: string, customerId: string) => void;
  onEditGeneral?: () => void;
  onEditBank?: () => void;
  // Legacy fallback
  onEdit?: (tab?: 'basic' | 'terms' | 'bank') => void;
}

export const SupplierGeneralProfileTab: FC<Props> = ({
  supplier,
  canEdit = true,
  onEditGeneral,
  onEditBank,
  onEdit,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTriggerEditGeneral = () => {
    if (onEditGeneral) {
      onEditGeneral();
    } else if (onEdit) {
      onEdit('basic');
    }
  };

  const handleTriggerEditBank = () => {
    if (onEditBank) {
      onEditBank();
    } else if (onEdit) {
      onEdit('bank');
    }
  };

  const bankAccount = (supplier.bankAccount || (supplier as any).bankAccountNumber || '').trim();
  const bankAccountHolder = (supplier.accountHolder || (supplier as any).bankAccountHolder || supplier.name || '').trim();
  const bankName = supplier.bankName || '';
  const hasBankData = Boolean(bankAccount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Card 1: Thông tin chung (R1: Renamed from "Thông tin liên hệ") */}
      <div className="supplier-detail-card" data-testid="general-info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="supplier-detail-card-title" data-testid="general-info-card-title" style={{ margin: 0 }}>
            Thông tin chung
          </h2>
          {canEdit && (onEditGeneral || onEdit) && (
            <button
              type="button"
              onClick={handleTriggerEditGeneral}
              className="admin-btn admin-btn-secondary"
              data-testid="btn-edit-general-info"
              style={{ height: 28, fontSize: 11.5, padding: '0 10px', gap: 4 }}
            >
              <Edit3 size={12} />
              <span>Sửa thông tin chung</span>
            </button>
          )}
        </div>

        <div className="supplier-contact-grid">
          {/* Người liên hệ */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Người liên hệ</span>
            <span className="supplier-contact-value" data-testid="field-contact-person">
              {supplier.contactPerson || '—'}
            </span>
          </div>

          {/* Số điện thoại */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Số điện thoại</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="supplier-contact-value" data-testid="field-phone" style={{ fontFamily: 'var(--font-mono)' }}>
                {supplier.phone || '—'}
              </span>
              {supplier.phone && (
                <button
                  type="button"
                  onClick={() => handleCopy(supplier.phone, 'SĐT')}
                  className="supplier-copy-btn"
                  data-testid="btn-copy-phone"
                  title="Sao chép số điện thoại"
                >
                  {copiedField === 'SĐT' ? <Check size={14} color="#00c853" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Email</span>
            <span className="supplier-contact-value" data-testid="field-email" style={{ fontFamily: 'var(--font-mono)' }}>
              {supplier.email || '—'}
            </span>
          </div>

          {/* Trạng thái (R2: Moved from header into General Info card) */}
          <div className="supplier-contact-field" data-testid="field-status-container">
            <span className="supplier-contact-label">Trạng thái</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                data-testid="field-status-badge"
                className={`admin-badge ${supplier.status === 'Active' ? 'admin-badge-active' : 'admin-badge-inactive'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: supplier.status === 'Active' ? '#e6f4ea' : '#fef2f2',
                  color: supplier.status === 'Active' ? '#008800' : '#dc2626',
                  border: `1px solid ${supplier.status === 'Active' ? '#008800' : '#fecaca'}`,
                }}
              >
                {supplier.status === 'Active' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
              </span>
            </div>
          </div>

          {/* Mã số thuế */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Mã số thuế</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="supplier-contact-value" data-testid="field-tax-code" style={{ fontFamily: 'var(--font-mono)' }}>
                {supplier.taxCode || '—'}
              </span>
              {supplier.taxCode && (
                <button
                  type="button"
                  onClick={() => handleCopy(supplier.taxCode!, 'MST')}
                  className="supplier-copy-btn"
                  data-testid="btn-copy-tax-code"
                  title="Sao chép mã số thuế"
                >
                  {copiedField === 'MST' ? <Check size={14} color="#00c853" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Địa chỉ kho/cửa hàng (spans full width on desktop) */}
          <div className="supplier-contact-field supplier-contact-field--full">
            <span className="supplier-contact-label">Địa chỉ kho/cửa hàng</span>
            <span
              className="supplier-contact-value"
              data-testid="field-address"
              style={{ wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.5 }}
            >
              {supplier.address || '—'}
            </span>
          </div>

          {/* Ghi chú nhanh (spans full width on desktop) */}
          <div className="supplier-contact-field supplier-contact-field--full">
            <span className="supplier-contact-label">Ghi chú nhanh</span>
            <span
              className="supplier-contact-value"
              data-testid="field-note"
              style={{
                fontWeight: 400,
                color: supplier.note ? '#111827' : '#9ca3af',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              {supplier.note || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Tài khoản ngân hàng (Đã loại bỏ hoàn toàn phần VAT theo yêu cầu) */}
      <div className="supplier-detail-card" data-testid="bank-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 className="supplier-detail-card-title" data-testid="bank-card-title" style={{ margin: 0 }}>
            Tài khoản ngân hàng
          </h2>
          {canEdit && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleTriggerEditBank}
                className="admin-btn admin-btn-secondary"
                data-testid={hasBankData ? 'btn-edit-bank-header' : 'btn-add-bank-header'}
                style={{ height: 28, fontSize: 11.5, padding: '0 10px', gap: 4 }}
              >
                {hasBankData ? <Edit3 size={12} /> : <Plus size={12} />}
                <span>{hasBankData ? 'Sửa ngân hàng' : '+ Thêm ngân hàng'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Khối Tài khoản ngân hàng */}
        {hasBankData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'stretch' }}>
            <div className="supplier-bank-box" data-testid="supplier-bank-display-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span data-testid="bank-name-display" style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.88rem' }}>
                  {bankName || 'Ngân hàng'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(bankAccount, 'STK')}
                  className="admin-btn admin-btn-secondary"
                  data-testid="btn-copy-bank-account"
                  style={{ height: 28, fontSize: 11, padding: '0 10px', gap: 4 }}
                >
                  {copiedField === 'STK' ? <Check size={12} color="#00c853" /> : <Copy size={12} />}
                  <span>{copiedField === 'STK' ? 'Đã sao chép' : 'Sao chép STK'}</span>
                </button>
              </div>
              <div
                data-testid="bank-account-display"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: 1.5, color: '#111827', marginBottom: 6 }}
              >
                {bankAccount}
              </div>
              <div
                data-testid="bank-holder-display"
                style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: '#4b5563', fontWeight: 600, marginBottom: 12 }}
              >
                {bankAccountHolder.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 500 }}>
                <QrCode size={15} /> Quét mã VietQR chuyển khoản Napas 24/7
              </div>
            </div>

            {/* Khối mã QR VietQR tự động sinh */}
            <SupplierVietQrCard
              bankName={bankName}
              accountNo={bankAccount}
              accountHolder={bankAccountHolder.toUpperCase()}
              description={`TT NCC ${supplier.code}`}
            />
          </div>
        ) : (
          <div
            data-testid="bank-empty-state"
            style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-soft-blue, #f0f7ff)', borderRadius: 16 }}
          >
            <p style={{ margin: '0 0 10px 0', fontSize: 13 }}>Chưa cập nhật thông tin tài khoản ngân hàng.</p>
            {canEdit && (
              <button
                type="button"
                onClick={handleTriggerEditBank}
                className="admin-btn admin-btn-primary"
                data-testid="btn-add-bank-empty"
                style={{ height: 30, fontSize: 12, padding: '0 14px', gap: 6 }}
              >
                <Plus size={13} />
                <span>+ Cập nhật tài khoản ngân hàng</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
