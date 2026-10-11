import { useState } from 'react';
import type { FC } from 'react';
import type { SupplierSummary, APLedgerEntry } from '../types/supplier.types';
import { SupplierTypeBadge, SupplierCategoryBadge, SupplierStatusBadge } from './SupplierStatusBadge';
import { X, Copy, Check, QrCode, FileSpreadsheet, UserCheck, ShieldAlert } from 'lucide-react';
import '../supplier.css';

interface Props {
  isOpen: boolean;
  supplier: SupplierSummary | null;
  apLedgers: APLedgerEntry[];
  onClose: () => void;
  onLinkCustomer: (supplierId: string, customerId: string) => void;
  onToggleStatus: (supplier: SupplierSummary) => void;
  onDelete: (supplier: SupplierSummary) => void;
}

const DOC_TYPE_CLS: Record<APLedgerEntry['docType'], string> = {
  PurchaseInvoice:  'ledger-doctype ledger-doctype--purchase',
  ServiceInvoice:   'ledger-doctype ledger-doctype--service',
  PaymentVoucher:   'ledger-doctype ledger-doctype--payment',
  ReturnAdjustment:'ledger-doctype ledger-doctype--return',
};
const DOC_TYPE_LABEL: Record<APLedgerEntry['docType'], string> = {
  PurchaseInvoice:  'Nhập kho',
  ServiceInvoice:   'Dịch vụ',
  PaymentVoucher:   'Thanh toán',
  ReturnAdjustment: 'Hoàn trả',
};

export const SupplierDetailDrawer: FC<Props> = ({
  isOpen, supplier, apLedgers,
  onClose, onLinkCustomer, onToggleStatus, onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'ap' | 'link'>('info');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customerIdInput, setCustomerIdInput] = useState('');

  if (!isOpen || !supplier) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fmt = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + ' VNĐ';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">

        {/* Header */}
        <div className="drawer-header" style={{ background: '#f7faff', borderBottom: '1px solid #dbe9fe' }}>
          <div className="drawer-header-info">
            <div className="drawer-supplier-meta">
              <span className="sup-code">{supplier.code}</span>
              <SupplierStatusBadge status={supplier.status} />
            </div>
            <h2 className="drawer-supplier-name" style={{ marginTop: 6 }}>{supplier.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          {([
            { key: 'info', label: '📋 Hồ Sơ & Thanh Toán' },
            { key: 'ap',   label: `💳 Sổ Cái AP (${apLedgers.length})` },
            { key: 'link', label: '🔗 Đối Tác Kép' },
          ] as const).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`drawer-tab${activeTab === t.key ? ' drawer-tab--active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="drawer-body">

          {/* TAB 1: Thông tin chi tiết */}
          {activeTab === 'info' && (
            <>
              {/* Loại hình + Hạn nợ */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#f7faff', border: '1px solid #dbe9fe', borderRadius: 16,
                padding: '12px 16px', marginBottom: 20,
              }}>
                <div>
                  <div className="info-section-title" style={{ marginBottom: 6, border: 'none', padding: 0 }}>Phân Loại Ngành Hàng</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <SupplierTypeBadge type={supplier.supplierType} />
                    <SupplierCategoryBadge category={supplier.category} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <div className="info-section-title" style={{ marginBottom: 4, border: 'none', padding: 0 }}>Hạn Nợ Trả</div>
                  <div style={{ fontWeight: 700, color: '#0066ff', fontSize: '0.9rem' }}>
                    {supplier.paymentTermDays === 0 ? 'Thanh toán ngay' : `${supplier.paymentTermDays} ngày`}
                  </div>
                </div>
              </div>

              {/* Liên hệ */}
              <div className="info-section">
                <div className="info-section-title">📞 Thông Tin Liên Hệ</div>
                <div className="info-row">
                  <span className="info-row-label">Người đại diện Sale:</span>
                  <span className="info-row-value">{supplier.contactPerson}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label">Số điện thoại:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="info-row-value info-row-value--mono">{supplier.phone}</span>
                    <button type="button" onClick={() => handleCopy(supplier.phone, 'SĐT')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                      {copiedField === 'SĐT' ? <Check size={14} style={{ color: '#00c853' }} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                {supplier.email && (
                  <div className="info-row">
                    <span className="info-row-label">Email:</span>
                    <span className="info-row-value info-row-value--mono">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="info-row">
                    <span className="info-row-label">Địa chỉ kho/cửa hàng:</span>
                    <span className="info-row-value">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Ngân hàng */}
              <div className="info-section">
                <div className="info-section-title">🏦 Tài Khoản Ngân Hàng</div>
                {supplier.bankAccount ? (
                  <div style={{
                    background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                    border: '1px solid #bfdbfe', borderRadius: 16, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.8rem' }}>{supplier.bankName}</span>
                      <button type="button"
                        onClick={() => handleCopy(supplier.bankAccount!, 'STK')}
                        className="btn-pay" style={{ color: '#0066ff', background: '#fff', borderColor: '#bfdbfe' }}>
                        {copiedField === 'STK' ? <Check size={12} style={{ color: '#00c853' }} /> : <Copy size={12} />}
                        {copiedField === 'STK' ? 'Đã sao chép' : 'Sao chép STK'}
                      </button>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', letterSpacing: 2, color: '#111827', marginBottom: 4 }}>
                      {supplier.bankAccount}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', color: '#4b5563', fontWeight: 600, marginBottom: 8 }}>
                      {supplier.accountHolder}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#1d4ed8', fontWeight: 500 }}>
                      <QrCode size={14} /> Gợi ý quét VietQR chuyển khoản chính xác 100%
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 12, fontSize: '0.8rem' }}>
                    Chưa cập nhật thông tin tài khoản ngân hàng.
                  </div>
                )}
              </div>

              {/* Hóa đơn VAT */}
              {supplier.taxCode && (
                <div className="info-section">
                  <div className="info-section-title">📄 Thông Tin Xuất Hóa Đơn GTGT</div>
                  <div className="info-row">
                    <span className="info-row-label">Mã số thuế (MST):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="info-row-value info-row-value--mono">{supplier.taxCode}</span>
                      <button type="button" onClick={() => handleCopy(supplier.taxCode!, 'MST')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2 }}>
                        {copiedField === 'MST' ? <Check size={14} style={{ color: '#00c853' }} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {supplier.companyName && (
                    <div className="info-row">
                      <span className="info-row-label">Tên công ty hóa đơn:</span>
                      <span className="info-row-value">{supplier.companyName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Ghi chú */}
              {supplier.note && (
                <div className="info-section">
                  <div className="info-section-title">📝 Ghi Chú Nghiệp Vụ</div>
                  <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.6, background: '#fafafa', borderRadius: 10, padding: '10px 14px', border: '1px solid #f3f4f6' }}>
                    {supplier.note}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: Sổ cái AP */}
          {activeTab === 'ap' && (
            <>
              {/* Dư nợ hiện tại */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: 12,
                padding: '12px 16px', marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    DƯ NỢ HIỆN TẠI (OPEN AP)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: '#0066ff' }}>
                    {fmt(supplier.currentDebt)}
                  </div>
                </div>
                <button type="button"
                  onClick={() => alert(`Xuất Sổ Cái AP của NCC ${supplier.name} ra Excel (.xlsx)`)}
                  className="btn-outline">
                  <FileSpreadsheet size={14} /> Xuất Excel
                </button>
              </div>

              {/* Danh sách giao dịch */}
              {apLedgers.length > 0 ? (
                <div className="supplier-table-scroll" style={{ borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>Loại / Số chứng từ</th>
                        <th>Mô tả</th>
                        <th className="text-right">Biến động</th>
                        <th className="text-right">Dư sau GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apLedgers.map(entry => (
                        <tr key={entry.id}>
                          <td>
                            <span className={DOC_TYPE_CLS[entry.docType]}>{DOC_TYPE_LABEL[entry.docType]}</span>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.72rem', color: '#0066ff', marginTop: 4 }}>
                              {entry.docNo}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 2 }}>
                              {new Date(entry.transactionDate).toLocaleDateString('vi-VN')}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: '#374151' }}>{entry.description}</td>
                          <td className="text-right">
                            <span className={entry.direction === 1 ? 'ledger-amount--credit' : 'ledger-amount--debit'}>
                              {entry.direction === 1 ? '+' : '-'}{fmt(entry.amount)}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className="ledger-balance">{fmt(entry.balanceAfter)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', background: '#f9fafb', borderRadius: 12, fontSize: '0.82rem' }}>
                  Chưa có giao dịch biến động dư nợ AP nào.
                </div>
              )}
            </>
          )}

          {/* TAB 3: Đối tác kép */}
          {activeTab === 'link' && (
            <>
              {/* Hướng dẫn */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16,
                padding: '14px 16px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#78350f', fontSize: '0.8rem', marginBottom: 8 }}>
                  <UserCheck size={16} style={{ color: '#d97706' }} />
                  Quy Tắc Đối Tác Kép (Dual-role Supplier & Customer)
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e', lineHeight: 1.6 }}>
                  Một số nhà cung cấp đồng thời là Khách hàng mua hàng tại siêu thị tạp hóa.
                  Công nợ <strong>AP (Phải trả NCC)</strong> và <strong>AR (Phải thu Khách hàng)</strong> được duy trì độc lập hoàn toàn.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Mã Hồ Sơ Khách Hàng Liên Kết (Customer ID)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="VD: CUST-2026-009"
                    value={customerIdInput || supplier.linkedCustomerId || ''}
                    onChange={e => setCustomerIdInput(e.target.value)}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customerIdInput) return;
                      onLinkCustomer(supplier.id, customerIdInput);
                      alert(`Đã liên kết thành công Hồ sơ Khách hàng ${customerIdInput} cho NCC ${supplier.name}!`);
                    }}
                    className="btn-primary"
                    style={{ whiteSpace: 'nowrap', borderRadius: 12 }}
                  >
                    Lưu Liên Kết
                  </button>
                </div>
              </div>

              {supplier.linkedCustomerId && (
                <div style={{
                  background: '#e8f9ee', border: '1px solid #bbf7d0', borderRadius: 12,
                  padding: '10px 16px', fontSize: '0.8rem', fontWeight: 500, color: '#065f46',
                }}>
                  ✓ Đã liên kết với Khách hàng:{' '}
                  <strong style={{ fontFamily: 'var(--font-mono)', color: '#064e3b' }}>{supplier.linkedCustomerId}</strong>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <button type="button" onClick={() => onToggleStatus(supplier)} className="btn-outline">
            {supplier.status === 'Active' ? '⏸ Tạm Ngưng Giao Dịch' : '▶ Bật Hoạt Động'}
          </button>
          <button type="button" onClick={() => onDelete(supplier)}
            className="btn-outline"
            style={{ color: '#ff3b30', borderColor: '#ffd6d6', background: '#fff0f0' }}>
            <ShieldAlert size={14} /> Xóa An Toàn
          </button>
        </div>

      </div>
    </>
  );
};
