import { useState } from 'react';
import type { FC } from 'react';
import type { BillingTransaction } from '../../types/billing.types';
import {
  FileText,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface BillingDataTableProps {
  transactions: BillingTransaction[];
  isLoading?: boolean;
  onViewInvoice: (tx: BillingTransaction) => void;
  onReconcile: (tx: BillingTransaction) => void;
}

export const BillingDataTable: FC<BillingDataTableProps> = ({
  transactions,
  isLoading = false,
  onViewInvoice,
  onReconcile,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  const formatDate = (isoString: string) => {
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

  const renderTypeBadge = (tx: BillingTransaction) => {
    switch (tx.type) {
      case 'PURCHASE_PLAN':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: '#EAF6F4',
              color: '#0F766E',
            }}
          >
            GÓI SAAS
          </span>
        );
      case 'TOPUP':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: '#ECFDF5',
              color: '#059669',
            }}
          >
            NẠP VÍ
          </span>
        );
      case 'PURCHASE_ADDON':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: '#EEF2FF',
              color: '#4F46E5',
            }}
          >
            TIỆN ÍCH MỞ RỘNG
          </span>
        );
      case 'REFUND':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: '#FEF3C7',
              color: '#D97706',
            }}
          >
            HOÀN TIỀN
          </span>
        );
      default:
        return null;
    }
  };

  const renderPaymentMethod = (tx: BillingTransaction) => {
    if (tx.paymentMethod === 'VietQR') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#0F766E',
            }}
          >
            <QrCode size={13} /> VietQR (Napas/SePay)
          </span>
          {tx.referenceCode && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#64748B',
                background: '#F8FAFC',
                padding: '1px 5px',
                borderRadius: 4,
                width: 'fit-content',
              }}
            >
              <span>{tx.referenceCode}</span>
              <button
                type="button"
                onClick={() => handleCopy(tx.referenceCode!, `ref-${tx.id}`)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: copiedId === `ref-${tx.id}` ? '#10B981' : '#94A3B8',
                  display: 'inline-flex',
                }}
                title="Sao chép mã tham chiếu ngân hàng"
              >
                {copiedId === `ref-${tx.id}` ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (tx.paymentMethod === 'WALLET') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: '#4F46E5',
          }}
        >
          <Wallet size={13} /> Ví gian hàng
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 600,
          color: '#475569',
        }}
      >
        <Building2 size={13} /> Chuyển khoản ngân hàng
      </span>
    );
  };

  const renderStatusBadge = (tx: BillingTransaction) => {
    switch (tx.status) {
      case 'SUCCESS':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
              background: '#EAF6F4',
              color: '#0F766E',
            }}
          >
            <CheckCircle2 size={13} />
            <span>Thành công</span>
          </span>
        );
      case 'PENDING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
              background: '#FEF3C7',
              color: '#D97706',
            }}
          >
            <Clock size={13} className="animate-pulse" />
            <span>Chờ đối soát</span>
          </span>
        );
      case 'FAILED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
              background: '#FEE2E2',
              color: '#DC2626',
            }}
          >
            <XCircle size={13} />
            <span>Thất bại / Hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="plans-table-card">
      <div className="plans-table-summary" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Hiển thị <strong>{transactions.length}</strong> giao dịch thanh toán trên nền tảng
        </span>
        <span style={{ fontSize: 11.5, color: '#64748B' }}>
          Đơn vị tiền tệ: <strong>VND (Việt Nam Đồng)</strong>
        </span>
      </div>

      <div className="plans-table-scroll">
        <table className="plans-table" style={{ width: '100%', minWidth: 1050 }}>
          <thead>
            <tr>
              <th style={{ width: '18%' }}>MÃ GIAO DỊCH / THỜI GIAN</th>
              <th style={{ width: '22%' }}>CỬA HÀNG (TENANT)</th>
              <th style={{ width: '22%' }}>NGHIỆP VỤ CHI TIẾT</th>
              <th style={{ width: '13%', textAlign: 'right' }}>SỐ TIỀN</th>
              <th style={{ width: '15%' }}>KÊNH THANH TOÁN</th>
              <th style={{ width: '10%' }}>TRẠNG THÁI</th>
              <th style={{ width: '10%', textAlign: 'center' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#64748B' }}>
                    <div className="animate-spin" style={{ width: 18, height: 18, border: '2px solid #CBD5E1', borderTopColor: '#0F766E', borderRadius: '50%' }} />
                    <span>Đang tải danh sách giao dịch...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ color: '#94A3B8', fontSize: 13 }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>Không có giao dịch nào phù hợp với bộ lọc hiện tại.</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  {/* Cột 1: Mã GD & Thời gian */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: 700,
                            color: '#0F766E',
                            fontSize: 12.5,
                          }}
                        >
                          {tx.transactionCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(tx.transactionCode, `tx-${tx.id}`)}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: copiedId === `tx-${tx.id}` ? '#10B981' : '#94A3B8',
                            display: 'inline-flex',
                          }}
                          title="Sao chép mã giao dịch"
                        >
                          {copiedId === `tx-${tx.id}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> {formatDate(tx.createdAt)}
                      </span>
                      <small style={{ color: '#94A3B8', fontSize: 10 }}>Hóa đơn: {tx.invoiceCode}</small>
                    </div>
                  </td>

                  {/* Cột 2: Cửa hàng */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 13 }}>
                        {tx.tenantName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#0F766E',
                          fontFamily: 'JetBrains Mono, monospace',
                          background: '#EAF6F4',
                          padding: '1px 6px',
                          borderRadius: 4,
                          width: 'fit-content',
                        }}
                      >
                        {tx.tenantSubdomain}.thviet.vn
                      </span>
                      <small style={{ color: '#64748B', fontSize: 11 }}>
                        {tx.ownerName} • {tx.ownerPhone}
                      </small>
                    </div>
                  </td>

                  {/* Cột 3: Nghiệp vụ */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div>{renderTypeBadge(tx)}</div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', lineHeight: 1.35 }}>
                        {tx.title}
                      </span>
                      <small style={{ fontSize: 11, color: '#64748B', lineHeight: 1.3 }}>
                        {tx.description}
                      </small>
                    </div>
                  </td>

                  {/* Cột 4: Số tiền */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          fontSize: 14,
                          color: tx.type === 'REFUND' ? '#DC2626' : '#0F766E',
                        }}
                      >
                        {tx.type === 'REFUND' ? '-' : '+'}{formatCurrency(tx.totalAmount)}
                      </span>
                      {tx.vatAmount > 0 && (
                        <small style={{ color: '#64748B', fontSize: 10.5 }}>
                          (VAT 10%: {formatCurrency(tx.vatAmount)})
                        </small>
                      )}
                    </div>
                  </td>

                  {/* Cột 5: Kênh thanh toán */}
                  <td>{renderPaymentMethod(tx)}</td>

                  {/* Cột 6: Trạng thái */}
                  <td>{renderStatusBadge(tx)}</td>

                  {/* Cột 7: Thao tác */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      {/* Xem chi tiết hóa đơn */}
                      <button
                        type="button"
                        onClick={() => onViewInvoice(tx)}
                        className="admin-btn admin-btn-secondary"
                        style={{
                          padding: '5px 9px',
                          minHeight: 30,
                          fontSize: 11.5,
                          borderRadius: 9999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Xem hóa đơn điện tử chi tiết"
                      >
                        <FileText size={13} />
                        <span>Hóa đơn</span>
                      </button>

                      {/* Duyệt đối soát nếu PENDING */}
                      {tx.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => onReconcile(tx)}
                          style={{
                            padding: '5px 10px',
                            minHeight: 30,
                            fontSize: 11.5,
                            borderRadius: 9999,
                            background: '#0F766E',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 4px rgba(15,118,110,0.2)',
                          }}
                          title="Duyệt đối soát tiền chuyển khoản thủ công"
                        >
                          <CheckCircle2 size={13} />
                          <span>Duyệt</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
