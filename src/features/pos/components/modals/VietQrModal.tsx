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
  AlertTriangle,
  X
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
  expiresAtMs?: number;
  onClose: () => void;
  onCancelOrder?: () => void;
  onConfirmAndPrint: () => void;
}

export const VietQrModal: FC<Props> = ({
  isOpen,
  branchId,
  orderCode,
  amount,
  expiresAtMs,
  onClose,
  onCancelOrder,
  onConfirmAndPrint,
}) => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId;

  const getRemainingSeconds = () => {
    if (!expiresAtMs) return 300;
    return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
  };

  const [countdown, setCountdown] = useState<number>(() => getRemainingSeconds());
  const [isChecking, setIsChecking] = useState(false);
  const [isSuccessPaid, setIsSuccessPaid] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [partialPayment, setPartialPayment] = useState<{
    paidAmount: number;
    remainingAmount: number;
  } | null>(null);
  const [qrTemplate, setQrTemplate] = useState<'qr_only' | 'compact2'>('qr_only');

  // Đọc cấu hình ngân hàng công khai của cửa hàng (Zero-Plaintext: Không chứa API Key)
  const [bankCode, setBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [customTenantPrefix, setCustomTenantPrefix] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setCountdown(expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)) : 300);
    setIsSuccessPaid(false);
    setIsChecking(false);
    setIsConfigLoading(true);
    setConfigError(null);
    setPartialPayment(null);
    setBankCode('');
    setBankAccountNumber('');
    setBankAccountName('');
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
        connection.invoke('JoinOrderGroup', orderCode).catch(() => { });
      })
      .catch(() => { });

    return () => {
      connection.invoke('LeaveOrderGroup', orderCode).catch(() => { });
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

  // Bộ đếm ngược đồng bộ theo mốc hết hạn thực tế (không reset lại 5 phút khi đóng/mở lại hoặc chuyển tab)
  useEffect(() => {
    if (!isOpen || isSuccessPaid) return;
    if (expiresAtMs) {
      const syncRemaining = () => {
        setCountdown(Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)));
      };
      syncRemaining();
      const interval = setInterval(syncRemaining, 1000);
      return () => clearInterval(interval);
    }
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccessPaid, expiresAtMs]);

  if (!isOpen) return null;

  if (configError) {
    return (
      <div className="pos-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="pos-modal-dialog" style={{ maxWidth: 460, padding: 24, textAlign: 'center' }}>
          <ShieldCheck size={38} color="#b86712" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Chưa thể nhận VietQR</h3>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 14px' }}>{configError}</p>
          <button
            type="button"
            onClick={onClose}
            style={{ marginTop: 4, padding: '9px 18px', border: 0, borderRadius: 8, background: '#0f766e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

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
      <div
        className="pos-modal-dialog"
        style={{
          maxWidth: 640,
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 12,
        }}
      >
        {/* Header theo mẫu thiết kế */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} color="#0f766e" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              Thanh toán hóa đơn qua Dynamic VietQR
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: countdown === 0 ? '#fef2f2' : '#f0fdfa',
                border: countdown === 0 ? '1px solid #fecaca' : '1px solid #ccfbf1',
                padding: '3px 9px',
                borderRadius: 6,
                fontSize: 12.5,
                color: countdown === 0 ? '#dc2626' : '#0f766e',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Clock size={13} />
              <span>{timerText}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Đóng tạm thời (giữ đơn chờ chuyển khoản)"
              style={{
                width: 30,
                height: 30,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Thân Modal theo bố cục dọc chuẩn mẫu thiết kế */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {isConfigLoading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#475569' }}>
              <RefreshCw size={28} className="animate-spin text-teal-600" style={{ margin: '0 auto 12px' }} />
              Đang tải tài khoản nhận tiền của chi nhánh...
            </div>
          ) : configError ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#9a3412' }}>Không thể tạo mã QR</div>
              <div style={{ fontSize: 13.5, color: '#7c2d12', marginTop: 8 }}>{configError}</div>
            </div>
          ) : isSuccessPaid ? (
            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: '#ecfdf5',
                borderRadius: 8,
                border: '1px solid #a7f3d0',
              }}
            >
              <CheckCircle2 size={52} className="text-emerald-500" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>
                THANH TOÁN THÀNH CÔNG
              </div>
              <div style={{ fontSize: 13.5, color: '#047857', marginTop: 6 }}>
                Đã ghi nhận chuyển khoản <b>{amount.toLocaleString('vi-VN')} VNĐ</b> cho đơn <b>{orderCode}</b>.
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                Hệ thống đang tiến hành in hóa đơn bán lẻ cho khách...
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
              {/* Cảnh báo khách chuyển thiếu tiền */}
              {partialPayment && partialPayment.remainingAmount > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#fffbeb',
                    borderBottom: '1px solid #fde68a',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 700, fontSize: 12 }}>
                    <AlertTriangle size={14} />
                    <span>Khách chuyển thiếu tiền — Đã nhận: {partialPayment.paidAmount.toLocaleString('vi-VN')} VNĐ · Còn thiếu: {partialPayment.remainingAmount.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                </div>
              )}

              {/* Dòng 1: Tài khoản nhận tiền (gọn) */}
              <div style={{ display: 'grid', gridTemplateColumns: '152px 1fr', borderBottom: '1px solid #cbd5e1', alignItems: 'center' }}>
                <div style={{ padding: '6px 12px', fontSize: 12.5, color: '#475569', fontWeight: 500, borderRight: '1px solid #cbd5e1', backgroundColor: '#f8fafc', height: '100%', display: 'flex', alignItems: 'center' }}>
                  Tài khoản nhận tiền:
                </div>
                <div style={{ padding: '5px 10px' }}>
                  <div style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 5, backgroundColor: '#ffffff', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                    {bankCode} - {bankAccountNumber} - {bankAccountName}
                  </div>
                </div>
              </div>

              {/* Dòng 2: Số tiền thanh toán (gọn) */}
              <div style={{ display: 'grid', gridTemplateColumns: '152px 1fr', borderBottom: '1px solid #cbd5e1', alignItems: 'center' }}>
                <div style={{ padding: '6px 12px', fontSize: 12.5, color: '#475569', fontWeight: 500, borderRight: '1px solid #cbd5e1', backgroundColor: '#f8fafc', height: '100%', display: 'flex', alignItems: 'center' }}>
                  Số tiền thanh toán:
                </div>
                <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {currentPayAmount.toLocaleString('vi-VN')} VNĐ
                  </span>
                  {partialPayment && (
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      (Tổng đơn gốc: {amount.toLocaleString('vi-VN')} VNĐ)
                    </span>
                  )}
                </div>
              </div>

              {/* Dòng 3: Nội dung chuyển khoản (gọn) */}
              <div style={{ display: 'grid', gridTemplateColumns: '152px 1fr', borderBottom: '1px solid #cbd5e1', alignItems: 'center' }}>
                <div style={{ padding: '6px 12px', fontSize: 12.5, color: '#475569', fontWeight: 500, borderRight: '1px solid #cbd5e1', backgroundColor: '#f8fafc', height: '100%', display: 'flex', alignItems: 'center' }}>
                  Nội dung chuyển khoản:
                </div>
                <div style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <b style={{ fontSize: 12.5, color: '#0f766e', letterSpacing: 0.3, fontFamily: 'var(--font-mono, monospace)' }}>
                    {transferContent}
                  </b>
                  <button
                    type="button"
                    onClick={handleCopyContent}
                    style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      border: copiedContent ? '1px solid #86efac' : '1px solid #cbd5e1',
                      backgroundColor: copiedContent ? '#f0fdf4' : '#f8fafc',
                      color: copiedContent ? '#15803d' : '#334155',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedContent ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedContent ? 'Đã copy' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Khung trung tâm hiển thị mã QR to rõ */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    {bankAccountName} &bull; {bankCode} - {bankAccountNumber}
                  </div>
                  <div style={{ display: 'inline-flex', gap: 5 }}>
                    <button
                      type="button"
                      onClick={() => setQrTemplate('qr_only')}
                      style={{
                        padding: '2px 9px',
                        borderRadius: 4,
                        border: qrTemplate === 'qr_only' ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                        backgroundColor: qrTemplate === 'qr_only' ? '#ccfbf1' : '#ffffff',
                        color: qrTemplate === 'qr_only' ? '#0f766e' : '#64748b',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Mã QR To
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrTemplate('compact2')}
                      style={{
                        padding: '2px 9px',
                        borderRadius: 4,
                        border: qrTemplate === 'compact2' ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                        backgroundColor: qrTemplate === 'compact2' ? '#ccfbf1' : '#ffffff',
                        color: qrTemplate === 'compact2' ? '#0f766e' : '#64748b',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Thẻ Đầy Đủ
                    </button>
                  </div>
                </div>

                {/* Khung ảnh QR lớn, nổi bật */}
                <div
                  style={{
                    width: 280,
                    height: 280,
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: 6,
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

                {/* Số tiền đậm bên dưới QR giống mẫu */}
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                  {currentPayAmount.toLocaleString('vi-VN')} VNĐ
                </div>

                {/* Trạng thái chờ & tải ảnh */}
                {countdown === 0 ? (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '5px 10px',
                      borderRadius: 6,
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    Đã hết thời gian chờ 5 phút. Bấm &quot;Kiểm tra tiền về&quot; nếu khách vừa chuyển hoặc &quot;Hủy đơn chờ&quot;.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0f766e', fontSize: 12, fontWeight: 600 }}>
                      <RefreshCw size={12} className="animate-spin text-teal-600" />
                      <span>Đang đợi khách quét mã...</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open(qrUrl, '_blank')}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#475569',
                      }}
                    >
                      <Download size={11} /> Tải ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(qrUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        borderRadius: 4,
                        border: copiedLink ? '1px solid #86efac' : '1px solid #cbd5e1',
                        backgroundColor: copiedLink ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        color: copiedLink ? '#15803d' : '#475569',
                      }}
                    >
                      {copiedLink ? <Check size={11} /> : <Copy size={11} />} {copiedLink ? 'Đã copy link' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>

              {/* Dòng ghi chú chuẩn mẫu thiết kế */}
              <div style={{ padding: '8px 14px', fontSize: 12, fontStyle: 'italic', color: '#475569', backgroundColor: '#ffffff' }}>
                Hệ thống tự động xác nhận khi nhận tiền từ Napas 247.
              </div>
            </div>
          )}
        </div>

        {/* Footer hành động căn lề phải chuẩn mẫu thiết kế */}
        {!isConfigLoading && !configError && !isSuccessPaid && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleCheckPayment}
              disabled={isChecking || isSuccessPaid}
              style={{
                padding: '7px 11px',
                backgroundColor: '#ffffff',
                color: '#0f766e',
                border: '1px solid #0f766e',
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? 'Đang đối soát...' : 'Kiểm tra tiền về'}</span>
            </button>
            {onCancelOrder && (
              <button
                type="button"
                onClick={onCancelOrder}
                style={{
                  padding: '7px 11px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  fontWeight: 600,
                  fontSize: 12.5,
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
                title="Hủy đơn chờ chuyển khoản và hoàn tồn kho"
              >
                Hủy đơn chờ
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 6,
                cursor: 'pointer',
              }}
              title="Đóng tạm thời để bán đơn khác (giữ nguyên đơn chờ chuyển khoản)"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={onConfirmAndPrint}
              style={{
                padding: '7px 14px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Check size={14} />
              <span>Xác Nhận Đã Nhận Tiền &amp; In Bill</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
