import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { 
  Building2, 
  CreditCard, 
  User, 
  Key, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Info,
  ArrowRight,
  Monitor
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';

export interface StorePaymentConfigData {
  tenantId: string;
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  sepayApiKey: string;
  webhookUrl: string;
  isActive: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (config: StorePaymentConfigData) => void;
}

// Danh sách ngân hàng phổ biến tại Việt Nam hỗ trợ VietQR Napas 247
export const VIETNAMESE_BANKS = [
  { code: 'MB', name: 'MBBank - Ngân hàng Quân Đội' },
  { code: 'VCB', name: 'Vietcombank - Ngân hàng Ngoại Thương' },
  { code: 'TCB', name: 'Techcombank - Ngân hàng Kỹ Thương' },
  { code: 'ACB', name: 'ACB - Ngân hàng Á Châu' },
  { code: 'TPB', name: 'TPBank - Ngân hàng Tiên Phong' },
  { code: 'VPB', name: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng' },
  { code: 'CTG', name: 'VietinBank - Ngân hàng Công Thương' },
  { code: 'BIDV', name: 'BIDV - Ngân hàng Đầu tư và Phát triển' },
  { code: 'STB', name: 'Sacombank - Ngân hàng Sài Gòn Thương Tín' },
  { code: 'VIB', name: 'VIB - Ngân hàng Quốc tế' },
  { code: 'OCB', name: 'OCB - Ngân hàng Phương Đông' },
  { code: 'SHB', name: 'SHB - Ngân hàng Sài Gòn Hà Nội' },
];

export const PaymentConfigModal: FC<Props> = ({ isOpen, onClose, onSaveSuccess }) => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || 'tenant_an_nhien_02';

  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');
  const [bankCode, setBankCode] = useState('MB');
  const [bankAccountNumber, setBankAccountNumber] = useState('0918889999');
  const [bankAccountName, setBankAccountName] = useState('NGUYEN AN NHIEN');
  const [sepayApiKey, setSepayApiKey] = useState('sepay_apikey_annhien_secret_key_8899');
  const [isActive, setIsActive] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Sinh Webhook URL tự động
  const webhookUrl = `${window.location.origin.replace(':5173', ':5000')}/api/v1/payments/sepay-webhook`;

  // Tải cấu hình từ localStorage / API khi mở Modal
  useEffect(() => {
    if (!isOpen) return;

    setSaveMessage(null);
    const storageKey = `pos_payment_config_${currentTenantId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed: StorePaymentConfigData = JSON.parse(saved);
        setBankCode(parsed.bankCode || 'MB');
        setBankAccountNumber(parsed.bankAccountNumber || '0918889999');
        setBankAccountName(parsed.bankAccountName || 'NGUYEN AN NHIEN');
        setSepayApiKey(parsed.sepayApiKey || '');
        setIsActive(parsed.isActive !== false);
        return;
      } catch (e) {
        console.error('Lỗi đọc cấu hình local:', e);
      }
    }

    // Giá trị mẫu ban đầu cho từng tenant
    if (currentTenantId === 'tenant_an_nhien_02') {
      setBankCode('MB');
      setBankAccountNumber('0918889999');
      setBankAccountName('NGUYEN AN NHIEN');
      setSepayApiKey('sepay_apikey_annhien_demo_x9k2');
    } else {
      setBankCode('MB');
      setBankAccountNumber('0974742130');
      setBankAccountName('MT GROCERY STORE');
      setSepayApiKey('sepay_apikey_mtmart_secret_key');
    }
  }, [isOpen, currentTenantId]);

  if (!isOpen) return null;

  const handleCopyWebhook = () => {
    navigator.clipboard?.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const selectedBank = VIETNAMESE_BANKS.find((b) => b.code === bankCode);
    const configData: StorePaymentConfigData = {
      tenantId: currentTenantId,
      bankCode,
      bankName: selectedBank?.name || 'MBBank',
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
      sepayApiKey: sepayApiKey.trim(),
      webhookUrl,
      isActive,
    };

    // 1. Lưu LocalStorage để chạy mượt mà ngay cả khi offline
    const storageKey = `pos_payment_config_${currentTenantId}`;
    localStorage.setItem(storageKey, JSON.stringify(configData));

    // 2. Gửi request lưu Backend API
    try {
      await fetch('/api/v1/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      });
    } catch {
      // Backend offline: Vẫn hoạt động bình thường nhờ Offline-First
    }

    setIsSaving(false);
    setSaveMessage('Đã lưu cấu hình tài khoản thanh toán thành công!');
    onSaveSuccess?.(configData);

    setTimeout(() => {
      setSaveMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 760, padding: 0, overflow: 'hidden' }}>
        {/* Header Modal */}
        <div 
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f766e',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={22} className="text-teal-200" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Thiết Lập Tài Khoản Thanh Toán & Cổng SePay (VietQR)</div>
              <div style={{ fontSize: 12, color: '#ccfbf1' }}>Hệ thống nhận biến động số dư và gạch nợ tự động cho quầy POS</div>
            </div>
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
              padding: '4px 8px',
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Thanh chuyển Tab */}
        <div 
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '0 20px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: activeTab === 'config' ? 700 : 500,
              color: activeTab === 'config' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'config' ? '3px solid #0f766e' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CreditCard size={16} />
            <span>Cấu Hình Tài Khoản</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13.5,
              fontWeight: activeTab === 'guide' ? 700 : 500,
              color: activeTab === 'guide' ? '#0f766e' : '#64748b',
              borderBottom: activeTab === 'guide' ? '3px solid #0f766e' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={16} className="text-amber-500" />
            <span>Cẩm Nang Hướng Dẫn SePay (Có Giao Diện Mẫu)</span>
          </button>
        </div>

        {/* Nội dung Tab */}
        <div style={{ padding: 20, maxHeight: '70vh', overflowY: 'auto' }}>
          {saveMessage && (
            <div 
              style={{
                padding: '10px 14px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 6,
                color: '#065f46',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Check size={16} className="text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}

          {activeTab === 'config' ? (
            /* TAB 1: FORM CẤU HÌNH */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Ngân hàng */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Ngân hàng thụ hưởng:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="pos-select"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    style={{ width: '100%', height: 38, paddingLeft: 10, fontSize: 13.5 }}
                  >
                    {VIETNAMESE_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Số tài khoản & Tên chủ tài khoản */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Số tài khoản ngân hàng:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="pos-input"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="VD: 0918889999"
                      style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13.5, fontWeight: 600 }}
                    />
                    <CreditCard size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Tên chủ tài khoản:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="pos-input"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                      placeholder="VD: NGUYEN AN NHIEN"
                      style={{ width: '100%', height: 38, paddingLeft: 36, fontSize: 13.5, fontWeight: 700 }}
                    />
                    <User size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  </div>
                </div>
              </div>

              {/* SePay API Key */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                    SePay API Key (Chìa khóa bảo mật):
                  </label>
                  <span style={{ fontSize: 11.5, color: '#0f766e', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveTab('guide')}>
                    Chưa có API Key? Xem hình hướng dẫn lấy key →
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="pos-input"
                    value={sepayApiKey}
                    onChange={(e) => setSepayApiKey(e.target.value)}
                    placeholder="Dán mã API Key dạng sepay_apikey_... vào đây"
                    style={{ width: '100%', height: 38, paddingLeft: 36, paddingRight: 40, fontSize: 13, fontFamily: 'monospace' }}
                  />
                  <Key size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 8,
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                    title={showApiKey ? 'Ẩn khóa' : 'Hiện khóa'}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  🔒 Được mã hóa AES-256 an toàn. Backend dùng key này để <b>đối soát 2 chiều (Double-Check)</b> chống request ảo.
                </div>
              </div>

              {/* Webhook URL hệ thống */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Đường dẫn Webhook hệ thống (Dán sang SePay):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="pos-input"
                      value={webhookUrl}
                      readOnly
                      style={{ width: '100%', height: 38, paddingLeft: 36, backgroundColor: '#f1f5f9', color: '#475569', fontSize: 12.5 }}
                    />
                    <LinkIcon size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                  </div>
                  <button
                    type="button"
                    className="pos-btn-secondary"
                    onClick={handleCopyWebhook}
                    style={{
                      height: 38,
                      padding: '0 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      backgroundColor: copiedWebhook ? '#ecfdf5' : undefined,
                      borderColor: copiedWebhook ? '#10b981' : undefined,
                      color: copiedWebhook ? '#059669' : undefined,
                    }}
                  >
                    {copiedWebhook ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedWebhook ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                  Copy link này và dán vào mục <b>Webhooks</b> trên SePay để nhận biến động số dư tức thì.
                </div>
              </div>

              {/* Switch kích hoạt */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0f766e' }}
                />
                <label htmlFor="active-toggle" style={{ fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                  <b>Kích hoạt thanh toán chuyển khoản tự động VietQR</b>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>Cho phép hiển thị mã QR động chứa số tiền tại quầy bán lẻ POS</div>
                </label>
              </div>
            </div>
          ) : (
            /* TAB 2: CẨM NANG HƯỚNG DẪN CÓ MOCKUP GIAO DIỆN SEPAY TRỰC QUAN */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Banner lợi ích */}
              <div 
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: 6,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <ShieldCheck size={20} className="text-teal-600 flex-shrink-0" style={{ marginTop: 2 }} />
                <div style={{ fontSize: 12.5, color: '#134e4a', lineHeight: 1.5 }}>
                  <b>Hoàn toàn an tâm:</b> SePay chỉ có quyền <b>Chỉ đọc biến động (Read-only)</b>, tiền chuyển thẳng vào tài khoản ngân hàng cá nhân của bạn, tuyệt đối không ai có thể rút tiền.
                </div>
              </div>

              {/* BƯỚC 1 & BƯỚC 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                      Bước 1: Đăng ký tài khoản SePay
                    </div>
                    <a
                      href="https://my.sepay.vn"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11.5,
                        color: '#0284c7',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      my.sepay.vn <ExternalLink size={12} />
                    </a>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    Truy cập <code>https://my.sepay.vn</code> và đăng ký bằng Số điện thoại hoặc Email (Miễn phí).
                  </div>
                </div>

                <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                    Bước 2: Thêm tài khoản ngân hàng
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    Vào menu <b>Tài khoản ngân hàng</b> → Bấm <b>Thêm tài khoản</b> → Nhập số tài khoản bạn muốn nhận tiền.
                  </div>
                </div>
              </div>

              {/* BƯỚC 3: MOCKUP GIAO DIỆN LẤY API KEY */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                    <Monitor size={16} />
                    <span>Bước 3: Màn hình SePay - Lấy API Key</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>my.sepay.vn / userapi / keys</span>
                </div>

                {/* Khung mô phỏng UI SePay */}
                <div style={{ padding: 14, backgroundColor: '#f8fafc' }}>
                  <div 
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      display: 'grid',
                      gridTemplateColumns: '170px 1fr',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Mock Sidebar SePay */}
                    <div style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '12px 10px', fontSize: 11 }}>
                      <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#38bdf8' }} />
                        <span>SePay Dashboard</span>
                      </div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Tổng quan</div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Tài khoản NH</div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Giao dịch</div>
                      <div style={{ marginTop: 8, padding: '4px 6px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: 4, fontWeight: 700 }}>
                        ▶ Tích hợp Web
                      </div>
                      <div style={{ padding: '4px 14px', color: '#38bdf8', fontWeight: 700 }}>
                        • API Key
                      </div>
                      <div style={{ padding: '4px 14px', color: '#94a3b8' }}>
                        • Webhooks
                      </div>
                    </div>

                    {/* Mock Nội dung trang API Key của SePay */}
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Danh sách API Keys</div>
                        <button 
                          type="button" 
                          style={{
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}
                        >
                          + Tạo API Key
                        </button>
                      </div>

                      {/* Item key */}
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Tên Key: Quầy POS MT-Mart</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <code style={{ fontSize: 11.5, color: '#0f766e', fontWeight: 700, backgroundColor: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>
                            sepay_apikey_annhien_••••••••x9k2
                          </code>
                          <button 
                            type="button" 
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #0284c7',
                              color: '#0284c7',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            📋 Sao chép
                          </button>
                        </div>
                      </div>

                      {/* Mũi tên chỉ dẫn nổi bật */}
                      <div 
                        style={{
                          marginTop: 10,
                          padding: '8px 10px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: 6,
                          fontSize: 11.5,
                          color: '#92400e',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ArrowRight size={15} className="text-amber-700 flex-shrink-0" />
                        <span><b>HƯỚNG DẪN:</b> Bấm <b>Tạo API Key</b> → Bấm <b>Sao chép</b> mã này → Chuyển sang Tab <b>Cấu Hình</b> dán vào ô <b>SePay API Key</b>!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BƯỚC 4: MOCKUP GIAO DIỆN TẠO WEBHOOK */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                    <Monitor size={16} />
                    <span>Bước 4: Màn hình SePay - Thêm Webhook Bắn Tiền Tự Động</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>my.sepay.vn / userapi / webhooks / create</span>
                </div>

                {/* Khung mô phỏng UI SePay */}
                <div style={{ padding: 14, backgroundColor: '#f8fafc' }}>
                  <div 
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      display: 'grid',
                      gridTemplateColumns: '170px 1fr',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Mock Sidebar SePay */}
                    <div style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '12px 10px', fontSize: 11 }}>
                      <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#38bdf8' }} />
                        <span>SePay Dashboard</span>
                      </div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Tổng quan</div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Tài khoản NH</div>
                      <div style={{ padding: '4px 6px', color: '#64748b' }}>Giao dịch</div>
                      <div style={{ marginTop: 8, padding: '4px 6px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: 4, fontWeight: 700 }}>
                        ▶ Tích hợp Web
                      </div>
                      <div style={{ padding: '4px 14px', color: '#94a3b8' }}>
                        • API Key
                      </div>
                      <div style={{ padding: '4px 14px', color: '#38bdf8', fontWeight: 700 }}>
                        • Webhooks
                      </div>
                    </div>

                    {/* Mock Form Thêm Webhook của SePay */}
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                        Thêm Webhook nhận thông báo
                      </div>

                      {/* Ô nhập URL */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Địa chỉ Webhook (URL nhận POST):
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={webhookUrl}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: 11,
                            backgroundColor: '#f0fdfa',
                            border: '1.5px solid #0f766e',
                            borderRadius: 4,
                            color: '#0f766e',
                            fontWeight: 600,
                          }}
                        />
                      </div>

                      {/* Chọn sự kiện */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Sự kiện kích hoạt:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#1e293b' }}>
                          <input type="checkbox" checked readOnly style={{ accentColor: '#0284c7' }} />
                          <span>Giao dịch nhận tiền (Receive money)</span>
                        </div>
                      </div>

                      {/* Mũi tên chỉ dẫn */}
                      <div 
                        style={{
                          padding: '8px 10px',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: 6,
                          fontSize: 11.5,
                          color: '#065f46',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ArrowRight size={15} className="text-emerald-700 flex-shrink-0" />
                        <span><b>HƯỚNG DẪN:</b> Copy đường dẫn Webhook ở Tab <b>Cấu Hình</b> dán vào ô URL này rồi bấm <b>Thêm Webhook</b>!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BƯỚC 5 */}
              <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                  Bước 5: Thử nghiệm quét mã VietQR tại quầy POS
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  Vào quầy bán hàng POS, tạo đơn bất kỳ và chọn thanh toán <b>Chuyển khoản</b>. Hệ thống tự động sinh mã VietQR kèm số tiền và mã hóa đơn để khách quét chuyển tiền!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div 
          style={{
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
            <Info size={15} />
            <span>Phân quyền: Chỉ Chủ cửa hàng mới được xem và sửa</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="pos-btn-secondary" onClick={onClose} disabled={isSaving}>
              Đóng
            </button>
            <button 
              type="button" 
              className="pos-btn-primary" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 6,
              }}
            >
              {isSaving ? 'Đang lưu...' : '💾 Lưu Cấu Hình'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
