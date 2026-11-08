// src/pages/store/components/StoreWalletTopupModal.tsx
import { useState, useEffect, useRef, type FC } from 'react';
import { X, CheckCircle2, Copy, Check, ArrowRight, Loader2, RefreshCw, AlertCircle, QrCode } from 'lucide-react';
import type { StoreInfo } from '../storeData';
import { walletApi, type TopupOrderResponse } from '../api/walletApi';

interface StoreWalletTopupModalProps {
  storeInfo: StoreInfo;
  onClose: () => void;
  onSuccess: (amount: number, newBalance?: number) => void;
}

const PRESET_AMOUNTS = [50000, 100000, 200000];

export const StoreWalletTopupModal: FC<StoreWalletTopupModalProps> = ({
  storeInfo,
  onClose,
  onSuccess,
}) => {
  // Mặc định chọn 50.000 đ, input cũng điền sẵn 50.000
  const [amountInput, setAmountInput] = useState<string>('50.000');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isCopiedContent, setIsCopiedContent] = useState<boolean>(false);
  const [isCopiedAcc, setIsCopiedAcc] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dữ liệu đơn nạp từ API Backend SePay
  const [topupOrder, setTopupOrder] = useState<TopupOrderResponse | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);

  const rawNumericAmount = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;
  const amountToTopup = rawNumericAmount;

  // Xác định trạng thái active của các nút
  const isPresetActive = (amt: number) => !isCustomMode && rawNumericAmount === amt;
  const isCustomActive = isCustomMode || (!PRESET_AMOUNTS.includes(rawNumericAmount) && rawNumericAmount > 0);

  const handleSelectPreset = (amt: number) => {
    setIsCustomMode(false);
    setAmountInput(new Intl.NumberFormat('vi-VN').format(amt));
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAmountInput('');
      setIsCustomMode(true);
      return;
    }
    const num = Number(raw);
    setAmountInput(new Intl.NumberFormat('vi-VN').format(num));
    if (PRESET_AMOUNTS.includes(num)) {
      setIsCustomMode(false);
    } else {
      setIsCustomMode(true);
    }
  };

  // 1. Tạo đơn nạp tiền khi số tiền thay đổi (Debounce 400ms)
  useEffect(() => {
    if (amountToTopup < 50000) {
      setTopupOrder(null);
      return;
    }

    setErrorMessage(null);
    setIsLoadingOrder(true);

    const timer = setTimeout(async () => {
      try {
        const res = await walletApi.createTopupOrder(amountToTopup);
        if (res.success && res.data) {
          setTopupOrder(res.data);
        } else {
          setErrorMessage(res.message || 'Không thể tạo mã VietQR cho số tiền này.');
        }
      } catch (err: unknown) {
        console.warn('Lỗi gọi API tạo đơn nạp ví:', err);
        // Fallback local QR nếu backend offline hoặc chưa có kết nối
        const fallbackCode = `${Math.floor(100000 + Math.random() * 900000)}`;
        const fallbackContent = `WAL ${fallbackCode}`;
        const fallbackQr = `https://qr.sepay.vn/img?acc=190065228888&bank=MBBank&amount=${amountToTopup}&des=${encodeURIComponent(fallbackContent)}`;
        setTopupOrder({
          orderCode: fallbackCode,
          amount: amountToTopup,
          bankCode: 'MBBank',
          bankName: 'MB Bank (Ngân hàng Quân Đội)',
          accountNumber: '1900 6522 8888',
          accountName: 'CONG TY TNHH PHAN MEM MT-GRMS',
          transferContent: fallbackContent,
          qrUrl: fallbackQr,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } finally {
        setIsLoadingOrder(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [amountToTopup]);

  // 2. Polling kiểm tra trạng thái đơn nạp mỗi 3 giây
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!topupOrder?.orderCode || isCompleted) return;

    const checkStatus = async () => {
      try {
        const res = await walletApi.getTopupStatus(topupOrder.orderCode);
        if (res.success && res.data && res.data.status === 'COMPLETED') {
          setIsProcessing(false);
          setIsCompleted(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => {
            onSuccess(amountToTopup, res.data.newBalance);
          }, 1500);
        }
      } catch {
        // Tiếp tục poll ở chu kỳ sau
      }
    };

    pollingRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [topupOrder?.orderCode, isCompleted, amountToTopup, onSuccess]);

  // 3. Sao chép nội dung & số tài khoản
  const handleCopy = (text: string, type: 'content' | 'acc') => {
    navigator.clipboard.writeText(text);
    if (type === 'content') {
      setIsCopiedContent(true);
      setTimeout(() => setIsCopiedContent(false), 2000);
    } else {
      setIsCopiedAcc(true);
      setTimeout(() => setIsCopiedAcc(false), 2000);
    }
  };

  // 4. Người dùng bấm "Xác nhận đã chuyển khoản" để check ngay lập tức
  const handleManualCheck = async () => {
    if (amountToTopup < 50000) {
      alert('Số tiền nạp tối thiểu là 50.000 đ');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (topupOrder?.orderCode) {
        const res = await walletApi.getTopupStatus(topupOrder.orderCode);
        if (res.success && res.data && res.data.status === 'COMPLETED') {
          setIsProcessing(false);
          setIsCompleted(true);
          setTimeout(() => {
            onSuccess(amountToTopup, res.data.newBalance);
          }, 1200);
          return;
        }
      }
    } catch {
      // Giữ fallback check
    }

    // Nếu chưa nhận được tiền từ ngân hàng
    setTimeout(() => {
      setIsProcessing(false);
      setErrorMessage('Hệ thống chưa nhận được thông báo biến động số dư từ ngân hàng. Vui lòng kiểm tra đã chuyển đúng nội dung hoặc chờ 1-2 phút rồi thử lại.');
    }, 1500);
  };

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 780,
          width: '95%',
          fontFamily: 'var(--font-sans)',
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="store-modal-header"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #EDF2F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: 'var(--blue-primary)',
              }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Nạp tiền Ví gian hàng MT-GRMS
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Quét mã VietQR chuyển khoản liên ngân hàng Napas247 tự động
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
              color: '#64748B',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="store-modal-body" style={{ padding: '24px' }}>
          {isCompleted ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  backgroundColor: '#F0FDF4',
                  border: '2px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(22, 101, 52, 0.12)',
                }}
              >
                <CheckCircle2 size={44} color="#15803D" strokeWidth={2.4} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
                Nạp tiền thành công!
              </div>
              <div style={{ fontSize: 14.5, color: '#475569', maxWidth: 420, lineHeight: 1.6 }}>
                Số tiền{' '}
                <strong style={{ color: '#15803D', fontSize: 16, fontFamily: 'var(--font-mono)' }}>
                  +{new Intl.NumberFormat('vi-VN').format(amountToTopup)} đ
                </strong>{' '}
                đã được cộng trực tiếp vào ví gian hàng của bạn qua VietQR Napas247.
              </div>
            </div>
          ) : (
            /* Bố cục 2 cột: Cột trái (Mã QR to từ đỉnh xuống đáy) - Cột phải (Mệnh giá & Thông tin CK) */
            <div className="topup-modal-split">
              {/* ================= CỘT TRÁI: MÃ QR CỰC TO NẰM TỪ ĐỈNH XUỐNG ĐÁY ================= */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 20,
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header QR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--blue-primary)',
                    letterSpacing: '0.04em',
                    backgroundColor: '#FFFFFF',
                    padding: '4px 12px',
                    borderRadius: 20,
                    border: '1px solid #CBD5E1',
                  }}
                >
                  <QrCode size={14} />
                  <span>VIETQR · NAPAS247</span>
                </div>

                {/* Hộp chứa ảnh QR to rõ nét */}
                <div
                  style={{
                    width: 250,
                    height: 250,
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                    margin: '10px 0',
                    position: 'relative',
                  }}
                >
                  {isLoadingOrder ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={36} className="animate-spin text-teal-600" />
                      <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Đang tạo QR...</span>
                    </div>
                  ) : topupOrder?.qrUrl ? (
                    <img
                      src={topupOrder.qrUrl}
                      alt="VietQR SePay Napas247"
                      style={{ width: 230, height: 230, objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: '#DC2626', textAlign: 'center', padding: 12, lineHeight: 1.5 }}>
                      Vui lòng nhập số tiền<br />≥ 50.000 đ
                    </div>
                  )}
                </div>

                {/* Gợi ý quét mã */}
                <div
                  style={{
                    fontSize: 11.5,
                    color: '#64748B',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    padding: '0 4px',
                  }}
                >
                  Quét mã qua App Ngân hàng hoặc Ví MoMo, ZaloPay để thanh toán tự động 24/7.
                </div>
              </div>

              {/* ================= CỘT PHẢI: CHỌN MỆNH GIÁ, NHẬP TIỀN & THÔNG TIN ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Chọn mệnh giá nạp nhanh */}
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: 8,
                      display: 'block',
                    }}
                  >
                    Chọn mệnh giá nạp nhanh
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 8,
                    }}
                  >
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = isPresetActive(amt);
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSelectPreset(amt)}
                          style={{
                            padding: '11px 4px',
                            borderRadius: 12,
                            border: isSelected
                              ? '2px solid var(--blue-primary)'
                              : '1.5px solid #E2E8F0',
                            backgroundColor: isSelected ? 'var(--blue-light)' : '#FFFFFF',
                            color: isSelected ? 'var(--blue-primary)' : '#1E293B',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 2px 10px rgba(15, 118, 110, 0.12)' : 'none',
                          }}
                        >
                          {new Intl.NumberFormat('vi-VN').format(amt)} đ
                        </button>
                      );
                    })}
                    {/* Nút Khác */}
                    <button
                      type="button"
                      onClick={handleSelectCustom}
                      style={{
                        padding: '11px 4px',
                        borderRadius: 12,
                        border: isCustomActive
                          ? '2px solid var(--blue-primary)'
                          : '1.5px solid #E2E8F0',
                        backgroundColor: isCustomActive ? 'var(--blue-light)' : '#FFFFFF',
                        color: isCustomActive ? 'var(--blue-primary)' : '#1E293B',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.15s ease',
                        boxShadow: isCustomActive ? '0 2px 10px rgba(15, 118, 110, 0.12)' : 'none',
                      }}
                    >
                      Khác
                    </button>
                  </div>

                  {/* Ô nhập số tiền */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Nhập số tiền nạp (tối thiểu 50.000 đ)..."
                        value={amountInput}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '10px 44px 10px 14px',
                          borderRadius: 12,
                          border: '1.5px solid #CBD5E1',
                          fontSize: 14.5,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          fontVariantNumeric: 'tabular-nums',
                          boxSizing: 'border-box',
                          outline: 'none',
                          color: '#0F172A',
                          transition: 'border-color 0.15s ease',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--blue-primary)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          right: 14,
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: '#64748B',
                          pointerEvents: 'none',
                        }}
                      >
                        đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Thông tin chuyển khoản */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Ngân hàng thụ hưởng</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {topupOrder?.bankName || 'MB Bank (Ngân hàng Quân Đội)'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Số tài khoản</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 14.5,
                          fontWeight: 800,
                          color: 'var(--blue-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {topupOrder?.accountNumber || '1900 6522 8888'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy((topupOrder?.accountNumber || '190065228888').replace(/\s/g, ''), 'acc')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isCopiedAcc ? '#15803D' : '#64748B',
                          padding: 2,
                        }}
                        title="Sao chép số tài khoản"
                      >
                        {isCopiedAcc ? <Check size={14} color="#15803D" strokeWidth={2.5} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Nội dung chuyển khoản</div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: 10,
                        border: '1.5px solid #CBD5E1',
                        marginTop: 2,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#DC2626',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {topupOrder?.transferContent || `WAL ${storeInfo.code}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(topupOrder?.transferContent || `WAL ${storeInfo.code}`, 'content')}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: isCopiedContent ? '#15803D' : '#64748B',
                          padding: 2,
                        }}
                        title="Sao chép nội dung"
                      >
                        {isCopiedContent ? <Check size={14} color="#15803D" strokeWidth={2.5} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    💡 Hệ thống tự động cộng tiền sau 3-5 giây khi chuyển khoản đúng nội dung.
                  </div>
                </div>

                {/* 3. Lỗi nếu có */}
                {errorMessage && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      borderRadius: 10,
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      fontSize: 12,
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* 4. Số tiền thanh toán */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    backgroundColor: 'var(--blue-light)',
                    borderRadius: 14,
                    border: '1.5px solid var(--blue-border)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue-primary)' }}>
                    Số tiền thanh toán:
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 17,
                      fontWeight: 800,
                      color: 'var(--blue-primary)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {new Intl.NumberFormat('vi-VN').format(amountToTopup)} đ
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCompleted && (
          <div
            className="store-modal-footer"
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #EDF2F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-pill)',
                border: '1.5px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isProcessing || amountToTopup < 50000}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 22px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--blue-primary)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isProcessing || amountToTopup < 50000 ? 'not-allowed' : 'pointer',
                opacity: isProcessing || amountToTopup < 50000 ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && amountToTopup >= 50000) {
                  e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing && amountToTopup >= 50000) {
                  e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
                }
              }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Đang kiểm tra giao dịch...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đã chuyển khoản</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
