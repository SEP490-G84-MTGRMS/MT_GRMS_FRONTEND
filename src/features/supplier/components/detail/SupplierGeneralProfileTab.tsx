import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary } from '../../types/supplier.types';
import { Copy, Check, QrCode, UserCheck } from 'lucide-react';

interface Props {
  supplier: SupplierSummary;
  onLinkCustomer: (supplierId: string, customerId: string) => void;
}

export const SupplierGeneralProfileTab: FC<Props> = ({ supplier, onLinkCustomer }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customerIdInput, setCustomerIdInput] = useState('');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Card 1: Thông tin liên hệ (matching screenshot exactly) */}
      <div className="supplier-detail-card">
        <h2 className="supplier-detail-card-title">Thông tin liên hệ</h2>

        <div className="supplier-contact-grid">
          {/* Người liên hệ */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Người liên hệ</span>
            <span className="supplier-contact-value">{supplier.contactPerson || '—'}</span>
          </div>

          {/* Số điện thoại */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Số điện thoại</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="supplier-contact-value" style={{ fontFamily: 'var(--font-mono)' }}>
                {supplier.phone || '—'}
              </span>
              {supplier.phone && (
                <button
                  type="button"
                  onClick={() => handleCopy(supplier.phone, 'SĐT')}
                  className="supplier-copy-btn"
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
            <span className="supplier-contact-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {supplier.email || '—'}
            </span>
          </div>

          {/* Mã số thuế */}
          <div className="supplier-contact-field">
            <span className="supplier-contact-label">Mã số thuế</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="supplier-contact-value" style={{ fontFamily: 'var(--font-mono)' }}>
                {supplier.taxCode || '—'}
              </span>
              {supplier.taxCode && (
                <button
                  type="button"
                  onClick={() => handleCopy(supplier.taxCode!, 'MST')}
                  className="supplier-copy-btn"
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
            <span className="supplier-contact-value">{supplier.address || '—'}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Tài khoản ngân hàng & Hóa đơn GTGT */}
      <div className="supplier-detail-card">
        <h2 className="supplier-detail-card-title">Tài khoản ngân hàng & Hóa đơn</h2>

        {supplier.bankAccount ? (
          <div className="supplier-bank-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.85rem' }}>
                {supplier.bankName || 'Ngân hàng'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(supplier.bankAccount!, 'STK')}
                className="admin-btn admin-btn-secondary"
                style={{ height: 28, fontSize: 11, padding: '0 10px', gap: 4 }}
              >
                {copiedField === 'STK' ? <Check size={12} color="#00c853" /> : <Copy size={12} />}
                <span>{copiedField === 'STK' ? 'Đã sao chép' : 'Sao chép STK'}</span>
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: 1.5, color: '#111827', marginBottom: 4 }}>
              {supplier.bankAccount}
            </div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563', fontWeight: 600, marginBottom: 8 }}>
              {supplier.accountHolder || supplier.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 500 }}>
              <QrCode size={15} /> Gợi ý quét VietQR chuyển khoản chính xác 100%
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-soft-blue)', borderRadius: 16 }}>
            Chưa cập nhật thông tin tài khoản ngân hàng.
          </div>
        )}

        {/* Hóa đơn GTGT */}
        {supplier.companyName && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <div className="supplier-contact-grid">
              <div className="supplier-contact-field">
                <span className="supplier-contact-label">Tên công ty trên hóa đơn</span>
                <span className="supplier-contact-value">{supplier.companyName}</span>
              </div>
              <div className="supplier-contact-field">
                <span className="supplier-contact-label">Địa chỉ xuất hóa đơn VAT</span>
                <span className="supplier-contact-value">{supplier.invoiceAddress || supplier.address || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card 3: Đối tác kép & Ghi chú nghiệp vụ */}
      <div className="supplier-detail-card">
        <h2 className="supplier-detail-card-title">Đối tác kép (Dual-role) & Ghi chú</h2>

        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 16,
          padding: '14px 18px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#78350f', fontSize: '0.85rem', marginBottom: 6 }}>
            <UserCheck size={16} color="#d97706" />
            <span>Quy Tắc Đối Tác Kép (Dual-role Supplier & Customer)</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: 1.6 }}>
            Nhà cung cấp đồng thời có thể là Khách hàng mua sỉ tại siêu thị tạp hóa.
            Công nợ <strong>AP (Phải trả NCC)</strong> và <strong>AR (Phải thu Khách hàng)</strong> luôn được duy trì độc lập hoàn toàn, không cấn trừ tự động.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Nhập Mã Khách Hàng (VD: CUST-2026-009)"
            value={customerIdInput || supplier.linkedCustomerId || ''}
            onChange={(e) => setCustomerIdInput(e.target.value)}
            className="admin-search-input"
            style={{ width: 280, height: 40 }}
          />
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            style={{ height: 40, padding: '0 18px' }}
            onClick={() => {
              if (!customerIdInput) return;
              onLinkCustomer(supplier.id, customerIdInput);
            }}
          >
            Lưu Liên Kết
          </button>
        </div>

        {supplier.linkedCustomerId && (
          <div style={{
            background: '#e8f9ee',
            border: '1px solid #bbf7d0',
            borderRadius: 14,
            padding: '10px 16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#065f46',
            marginBottom: 16,
          }}>
            ✓ Đã liên kết với Khách hàng: <span style={{ fontFamily: 'var(--font-mono)' }}>{supplier.linkedCustomerId}</span>
          </div>
        )}

        {/* Ghi chú */}
        {supplier.note && (
          <div style={{ marginTop: 12 }}>
            <span className="supplier-contact-label">Ghi chú nghiệp vụ</span>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              lineHeight: 1.6,
              background: 'var(--bg-soft-blue)',
              borderRadius: 14,
              padding: '12px 16px',
              border: '1px solid var(--border-light)',
              marginTop: 6,
            }}>
              {supplier.note}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
