import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  QrCode, 
  Check, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { httpClient } from '../../../../api/httpClient';

function resolveHubUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, '')}/hubs/notifications`;
  }
  return '/hubs/notifications';
}

interface Props {
  isOpen: boolean;
  branchId: string;
  orderCode: string;
  amount: number;
  onClose: () => void;
  onConfirmAndPrint: () => void;
}

export const VietQrModal: FC<Props> = ({
  isOpen,
  branchId,
  orderCode,
  amount,
  onClose,
  onConfirmAndPrint,
}) => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId;

  const [countdown, setCountdown] = useState(300);
  const [isChecking, setIsChecking] = useState(false);
  const [isSuccessPaid, setIsSuccessPaid] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [partialPayment, setPartialPayment] = useState<{
    paidAmount: number;
    remainingAmount: number;
  } | null>(null);

  // Đọc cấu hình ngân hàng công khai của cửa hàng (Zero-Plaintext: Không chứa API Key)
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [customTenantPrefix, setCustomTenantPrefix] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(300);
    setIsSuccessPaid(false);
    setIsChecking(false);
    setIsConfigLoading(true);
    setConfigError(null);
    setPartialPayment(null);
    setBankCode('');
    setBankAccountNumber('');
    setBankAccountName('');
    setBankName('');
    setCustomTenantPrefix('');
    let cancelled = false;

    if (!currentTenantId || !branchId) {
      setConfigError('Không xác định được cửa hàng hoặc chi nhánh nhận tiền. Vui lòng đăng nhập lại.');
      setIsConfigLoading(false);
      return;
    }

    // Đồng bộ cấu hình QR công khai từ Backend (An toàn cho mọi nhân viên thu ngân, không lộ API Key)
    httpClient
      .get('/payments/public-qr-config', { params: { tenantId: currentTenantId, branchId, orderCode } })
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (!data?.paymentAccountId || !data.bankCode || !data.bankAccountNumber || data.isActive === false) {
          setConfigError('Chi nhánh chưa có tài khoản nhận chuyển khoản đang hoạt động. Vui lòng liên hệ chủ cửa hàng.');
          return;
        }
        if (data.bankCode) setBankCode(data.bankCode);
        if (data.bankAccountNumber) setBankAccountNumber(data.bankAccountNumber);
        if (data.bankAccountName) setBankAccountName(data.bankAccountName);
        if (data.bankName) setBankName(data.bankName);
        if (data.tenantPrefix) setCustomTenantPrefix(data.tenantPrefix);
      })
      .catch((error) => {
        if (cancelled) return;
        setConfigError(error?.response?.data?.message || 'Không thể tải tài khoản nhận tiền của chi nhánh. Không tạo mã QR để tránh chuyển nhầm tiền.');
      })
      .finally(() => {
        if (!cancelled) setIsConfigLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, currentTenantId, branchId, orderCode]);

  // LẮNG NGHE SIGNALR REALTIME (Tự động đóng popup & in hóa đơn khi SePay bắn Webhook)
  useEffect(() => {
    if (!isOpen || !orderCode) return;

    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('PaymentReceived', (data: {
      orderCode?: string;
      isFullPayment?: boolean;
      amountIn?: number;
      totalPaid?: number;
      remaining?: number;
    }) => {
      if (!data) return;
      const incomingCode = String(data.orderCode || '').toUpperCase();
      const currentCode = String(orderCode || '').toUpperCase();
      if (incomingCode !== currentCode && !incomingCode.includes(currentCode) && !currentCode.includes(incomingCode)) return;

      if (data.isFullPayment) {
        setIsSuccessPaid(true);
        setTimeout(() => {
          onConfirmAndPrint();
        }, 1000);
      } else {
        setPartialPayment({
          paidAmount: data.totalPaid || data.amountIn || 0,
          remainingAmount: data.remaining || 0,
        });
      }
    });

    connection.start()
      .then(() => {
        connection.invoke('JoinOrderGroup', orderCode).catch(() => {});
      })
      .catch(() => {});

    return () => {
      connection.invoke('LeaveOrderGroup', orderCode).catch(() => {});
      void connection.stop();
    };
  }, [isOpen, orderCode, onConfirmAndPrint]);

  // LỚP 6: Tự động Polling kiểm tra trạng thái gạch nợ mỗi 2.5 giây khi đang mở QR (Dự phòng mạng)
  useEffect(() => {
    if (!isOpen || isSuccessPaid || !orderCode || isConfigLoading || configError) return;

    const pollTimer = setInterval(async () => {
      try {
        const res = await httpClient.get(`/payments/check-order/${encodeURIComponent(orderCode)}`);
        if (res.data?.isPaid) {
          setIsSuccessPaid(true);
          setTimeout(() => {
            onConfirmAndPrint();
          }, 1000);
        } else if (res.data?.paymentStatus === 'PARTIALLY_PAID') {
          setPartialPayment({
            paidAmount: res.data.depositAmount || 0,
            remainingAmount: res.data.remainingAmount || 0,
          });
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong khi chờ khách quét QR
      }
    }, 2500);

    return () => clearInterval(pollTimer);
  }, [isOpen, isSuccessPaid, orderCode, onConfirmAndPrint, isConfigLoading, configError]);

  // Bộ đếm ngược 5 phút
  useEffect(() => {
    if (!isOpen || isSuccessPaid) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccessPaid]);

  if (!isOpen) return null;

  if (configError) return <div className="pos-modal-overlay" role="dialog" aria-modal="true"><div className="pos-modal-dialog" style={{ maxWidth: 460, padding: 24, textAlign: 'center' }}><ShieldCheck size={38} color="#b86712"/><h3>Chưa thể nhận VietQR</h3><p style={{ color: '#64748b', fontSize: 13 }}>{configError}</p><button type="button" onClick={onClose} style={{ marginTop: 8, padding: '9px 18px', border: 0, borderRadius: 8, background: '#0f766e', color: '#fff', fontWeight: 700 }}>Đóng</button></div></div>;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const [qrTemplate, setQrTemplate] = useState<'qr_only' | 'compact2'>('qr_only');

  // Tiền tố đơn hàng phân lập theo Tenant viết liền (VD: AN02HD1005) chống app ngân hàng tự động lọc bỏ dấu gạch dưới
  const cleanCode = orderCode.replace(/^HD/i, '');
  const transferContent = `${customTenantPrefix}HD${cleanCode}`;

  const currentPayAmount = partialPayment && partialPayment.remainingAmount > 0
    ? partialPayment.remainingAmount
    : amount;

  // Link mã VietQR động chuẩn Napas 247
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccountNumber}-${qrTemplate}.png?amount=${currentPayAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(bankAccountName)}`;

  // Thao tác kiểm tra thanh toán ngay
  const handleCheckPayment = async () => {
    setIsChecking(true);
    try {
      const res = await httpClient.get(`/payments/check-order/${encodeURIComponent(orderCode)}`);
      if (res.data?.isPaid) {
        setIsSuccessPaid(true);
        setTimeout(() => {
          onConfirmAndPrint();
        }, 1000);
        return;
      }
      if (res.data?.paymentStatus === 'PARTIALLY_PAID') {
        setPartialPayment({
          paidAmount: res.data.depositAmount || 0,
          remainingAmount: res.data.remainingAmount || 0,
        });
      }
    } catch {
      // Backend offline
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard?.writeText(transferContent);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 740, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Header Modal */}
        <div 
          style={{
            padding: '10px 18px',
            backgroundColor: '#0f766e',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={20} className="text-teal-200" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Thanh Toán Chuyển Khoản Dynamic VietQR</div>
              <div style={{ fontSize: 11, color: '#ccfbf1' }}>Hệ thống tự động gạch nợ qua SePay Webhook realtime</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 6, fontSize: 12, color: '#fef08a', fontWeight: 700 }}>
              <Clock size={13} />
              <span>{timerText}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: 18,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân Modal */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {isConfigLoading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#475569' }}>
              <RefreshCw size={28} className="animate-spin text-teal-600" style={{ margin: '0 auto 12px' }} />
              Đang tải tài khoản nhận tiền của chi nhánh...
            </div>
          ) : configError ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#9a3412' }}>Không thể tạo mã QR</div>
              <div style={{ fontSize: 13.5, color: '#7c2d12', marginTop: 8 }}>{configError}</div>
            </div>
          ) : isSuccessPaid ? (
            /* Thông báo thanh toán thành công */
            <div 
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: '#ecfdf5',
                borderRadius: 8,
                border: '1px solid #a7f3d0',
              }}
            >
              <CheckCircle2 size={54} className="text-emerald-500" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>
                TING TING! THANH TOÁN THÀNH CÔNG
              </div>
              <div style={{ fontSize: 13.5, color: '#047857', marginTop: 6 }}>
                Đã ghi nhận chuyển khoản <b>{amount.toLocaleString('vi-VN')} đ</b> cho đơn <b>{orderCode}</b>.
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
                Hệ thống đang tiến hành in hóa đơn bán lẻ cho khách...
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18, alignItems: 'start' }}>
              {/* CỘT TRÁI: MÃ QR TO RÕ */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  padding: 10,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                {/* Toggle chế độ xem QR */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setQrTemplate('qr_only')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 4,
                      border: qrTemplate === 'qr_only' ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: qrTemplate === 'qr_only' ? '#ccfbf1' : '#ffffff',
                      color: qrTemplate === 'qr_only' ? '#0f766e' : '#64748b',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Mã QR To
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrTemplate('compact2')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 4,
                      border: qrTemplate === 'compact2' ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                      backgroundColor: qrTemplate === 'compact2' ? '#ccfbf1' : '#ffffff',
                      color: qrTemplate === 'compact2' ? '#0f766e' : '#64748b',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📋 Thẻ Đầy Đủ
                  </button>
                </div>

                {/* Khung ảnh QR to */}
                <div
                  style={{
                    width: 268,
                    height: 268,
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={qrUrl}
                    alt={`VietQR Napas 247 - ${amount} VND`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Trạng thái SignalR */}
                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#0f766e',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} className="animate-spin text-teal-600" />
                  <span>Đang đợi khách quét mã...</span>
                </div>

                {/* Nút tải / copy link */}
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => window.open(qrUrl, '_blank')}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#475569',
                    }}
                  >
                    <Download size={12} /> Tải ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(qrUrl);
                      alert('Đã sao chép link ảnh QR!');
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#475569',
                    }}
                  >
                    <Copy size={12} /> Copy link
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: THÔNG TIN THANH TOÁN & HÀNH ĐỘNG */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Cảnh báo khách chuyển thiếu tiền */}
                {partialPayment && partialPayment.remainingAmount > 0 && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#fffbeb',
                      border: '1.5px solid #f59e0b',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 800, fontSize: 12.5 }}>
                      <AlertTriangle size={15} />
                      <span>CẢNH BÁO: KHÁCH CHUYỂN THIẾU TIỀN!</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                      Đã nhận: <b>{partialPayment.paidAmount.toLocaleString('vi-VN')} đ</b> · Còn thiếu: <b style={{ color: '#dc2626' }}>{partialPayment.remainingAmount.toLocaleString('vi-VN')} đ</b>
                    </div>
                  </div>
                )}

                {/* Khung số tiền cần thanh toán */}
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #fecaca',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 11.5, color: '#991b1b', fontWeight: 600 }}>Số tiền cần chuyển khoản:</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
                    {currentPayAmount.toLocaleString('vi-VN')} đ
                  </div>
                  {partialPayment && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                      (Tổng đơn gốc: {amount.toLocaleString('vi-VN')} đ)
                    </div>
                  )}
                </div>

                {/* Bảng tóm tắt tài khoản nhận tiền */}
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 12.5,
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Ngân hàng:</span>
                    <b style={{ color: '#0f172a' }}>{bankName} ({bankCode})</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Số tài khoản:</span>
                    <b style={{ color: '#0f766e', fontSize: 13.5 }}>{bankAccountNumber}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Chủ tài khoản:</span>
                    <b style={{ color: '#0f172a' }}>{bankAccountName}</b>
                  </div>
                </div>

                {/* Hộp nội dung chuyển khoản */}
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 3 }}>
                    Nội dung chuyển khoản (Bắt buộc giữ nguyên):
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <b style={{ fontSize: 14, color: '#1d4ed8', letterSpacing: 0.5 }}>{transferContent}</b>
                    <button
                      type="button"
                      onClick={handleCopyContent}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid #93c5fd',
                        backgroundColor: copiedContent ? '#dcfce7' : '#ffffff',
                        color: copiedContent ? '#15803d' : '#1d4ed8',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {copiedContent ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedContent ? 'Đã copy' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Nút hành động */}
                <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    className="pos-btn-primary"
                    onClick={onConfirmAndPrint}
                    disabled={isConfigLoading || !!configError}
                    style={{
                      width: '100%',
                      padding: '9px 16px',
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    ✓ Xác nhận đã nhận tiền & In Bill
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCheckPayment}
                      disabled={isChecking || isSuccessPaid || isConfigLoading || !!configError}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        backgroundColor: '#ffffff',
                        color: '#0f766e',
                        border: '1px solid #0f766e',
                        fontWeight: 600,
                        fontSize: 11.5,
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                      <span>{isChecking ? 'Đang đối soát...' : 'Kiểm tra tiền về'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        fontSize: 11.5,
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>

                {/* Ghi chú bảo mật */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                  <ShieldCheck size={13} color="#0f766e" />
                  <span>Bảo mật SePay: Tự động gạch nợ chính xác, chống Fake Bill 100%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
