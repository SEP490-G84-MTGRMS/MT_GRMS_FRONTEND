import type { FC } from 'react';
import type { BillingTransaction } from '../../types/billing.types';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  transaction: BillingTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onReconcile: (tx: BillingTransaction) => void;
}

export const InvoiceDetailModal: FC<InvoiceDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onReconcile,
}) => {
  if (!isOpen || !transaction) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="invoice-modal-card"
        style={{
          width: '100%',
          maxWidth: 820,
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Modal Top Bar (Sticky) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 22px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: '#0F766E',
                background: '#EAF6F4',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              HÓA ĐƠN ĐIỆN TỬ SAAS
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
              Mã: {transaction.invoiceCode}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                background: '#fff',
                border: '1px solid #CBD5E1',
                color: '#334155',
                cursor: 'pointer',
              }}
              title="In hóa đơn điện tử"
            >
              <Printer size={14} />
              <span>In hóa đơn</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748B',
                cursor: 'pointer',
                padding: 4,
                borderRadius: '50%',
                display: 'flex',
              }}
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet Body */}
        <div
          id="printableInvoice"
          style={{
            padding: '28px 36px',
            overflowY: 'auto',
            flex: 1,
            color: '#1E293B',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0F766E',
              paddingBottom: 18,
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#0F766E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  TH
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#0F766E', letterSpacing: '-0.02em' }}>
                    THViet SaaS
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Hệ thống Quản lý Tạp hóa Đa Chi nhánh</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                <strong>Đơn vị cung cấp:</strong> CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁN LẺ THVIET<br />
                <strong>Mã số thuế:</strong> 0108999999 • <strong>Hotline:</strong> 1900 6522<br />
                <strong>Địa chỉ:</strong> Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0F766E', marginBottom: 4 }}>
                HÓA ĐƠN DỊCH VỤ
              </div>
              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                <strong>Số:</strong> {transaction.invoiceCode}<br />
                <strong>Ký hiệu:</strong> THV/26E<br />
                <strong>Mã GD:</strong> {transaction.transactionCode}<br />
                <strong>Ngày lập:</strong> {formatDate(transaction.createdAt)}
              </div>

              {/* Status Stamp */}
              <div style={{ marginTop: 8 }}>
                {transaction.status === 'SUCCESS' ? (
                  <span
                    style={{
                      display: 'inline-block',
                      border: '2px solid #0F766E',
                      color: '#0F766E',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      transform: 'rotate(-4deg)',
                    }}
                  >
                    ✓ ĐÃ THANH TOÁN
                  </span>
                ) : transaction.status === 'PENDING' ? (
                  <span
                    style={{
                      display: 'inline-block',
                      border: '2px solid #D97706',
                      color: '#D97706',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      transform: 'rotate(-4deg)',
                    }}
                  >
                    ⏳ CHỜ ĐỐI SOÁT
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      border: '2px solid #DC2626',
                      color: '#DC2626',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    ✕ HỦY / THẤT BẠI
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer / Tenant Info Box */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 800, color: '#0F766E', marginBottom: 6, fontSize: 13 }}>
              THÔNG TIN ĐƠN VỊ THUÊ DỊCH VỤ (KHÁCH HÀNG)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 20px' }}>
              <div>
                <strong>Tên cửa hàng / Chuỗi:</strong> {transaction.tenantName}
              </div>
              <div>
                <strong>Mã số thuế:</strong> {transaction.taxCode || 'Hộ kinh doanh cá thể'}
              </div>
              <div>
                <strong>Đại diện pháp luật:</strong> {transaction.ownerName} ({transaction.ownerPhone})
              </div>
              <div>
                <strong>Email nhận hóa đơn:</strong> {transaction.ownerEmail}
              </div>
              <div>
                <strong>Subdomain hệ thống:</strong> {transaction.tenantSubdomain}.thviet.vn
              </div>
              <div>
                <strong>Địa chỉ:</strong> {transaction.address || 'Việt Nam'}
              </div>
            </div>
          </div>

          {/* Service Line Items Table */}
          <div style={{ marginBottom: 20 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr style={{ background: '#0F766E', color: '#fff' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '6%' }}>STT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', width: '48%' }}>
                    TÊN DỊCH VỤ / HẠNG MỤC
                  </th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '12%' }}>ĐVT</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '8%' }}>SL</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '26%' }}>THÀNH TIỀN</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ fontWeight: 700, color: '#1E293B' }}>{transaction.title}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{transaction.description}</div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>Gói/Dịch vụ</td>
                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>1</td>
                  <td
                    style={{
                      padding: '12px 12px',
                      textAlign: 'right',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(transaction.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 24,
            }}
          >
            <div style={{ width: 340, fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#64748B' }}>Cộng tiền dịch vụ:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#64748B' }}>Thuế suất GTGT (VAT):</span>
                <span>{transaction.vatAmount > 0 ? '10%' : '0% (Phần mềm)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#64748B' }}>Tiền thuế GTGT:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                  {formatCurrency(transaction.vatAmount)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderTop: '2px solid #0F766E',
                  marginTop: 4,
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#0F766E',
                }}
              >
                <span>TỔNG TIỀN THANH TOÁN:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatCurrency(transaction.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details & Security Signature Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: 20,
              padding: '14px 18px',
              border: '1px dashed #CBD5E1',
              borderRadius: 12,
              fontSize: 12,
              background: '#FAFAFA',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: '#334155', marginBottom: 4 }}>
                THÔNG TIN KÊNH THANH TOÁN
              </div>
              <div>Phương thức: <strong>{transaction.paymentMethod}</strong></div>
              {transaction.bankName && <div>Ngân hàng: <strong>{transaction.bankName}</strong></div>}
              {transaction.referenceCode && (
                <div>
                  Mã tham chiếu: <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{transaction.referenceCode}</strong>
                </div>
              )}
              {transaction.completedAt && <div>Thời gian khớp lệnh: <strong>{formatDate(transaction.completedAt)}</strong></div>}
              {transaction.note && <div style={{ color: '#64748B', marginTop: 4 }}>Ghi chú: {transaction.note}</div>}
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', color: '#0F766E', fontWeight: 800 }}>
                <ShieldCheck size={16} /> KÝ ĐIỆN TỬ BỞI THVIET SAAS
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                Chứng thư số hợp lệ • Cấp bởi Viettel CA
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>
                Hóa đơn điện tử khởi tạo từ máy chủ MT-GRMS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748B' }}>
            ID hệ thống: <code style={{ fontSize: 11 }}>{transaction.id}</code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {transaction.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReconcile(transaction);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 9999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#0F766E',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(15,118,110,0.25)',
                }}
              >
                <CheckCircle2 size={14} />
                <span>Duyệt đối soát ngay</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="admin-btn admin-btn-secondary"
              style={{
                padding: '7px 16px',
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: 600,
                minHeight: 34,
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
