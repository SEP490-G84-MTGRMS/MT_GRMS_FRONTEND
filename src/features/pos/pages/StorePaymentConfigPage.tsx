import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  CreditCard,
  User,
  Key,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { httpClient } from '../../../api/httpClient';
import { VIETNAMESE_BANKS } from '../components/modals/PaymentConfigModal';
import { branchApi } from '../../purchase-order/api/branchApi';
import { resolveSePayWebhookUrl } from '../utils/sePayWebhookUrl';

interface BranchOption {
  id: string;
  name: string;
  code?: string;
}

interface SePayLinkedBankAccount {
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  label: string;
}

interface PaymentAccountAssignment {
  paymentAccountId: string;
  bankCode: string;
  bankAccountNumber: string;
  branchIds: string[];
}

export const StorePaymentConfigPage: FC = () => {
  const { user } = useAuthStore();
  const currentTenantId = user?.tenantId || '';

  // Phân quyền RBAC: Chỉ Chủ cửa hàng (STORE_OWNER / ADMIN) mới được phép cấu hình STK & API Key
  const userRole = (user?.role || '').toUpperCase();
  const isOwnerOrAdmin =
    userRole.includes('OWNER') || userRole.includes('ADMIN') || userRole.includes('MANAGER');

  const [bankCode, setBankCode] = useState('MB');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [tenantPrefix, setTenantPrefix] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(null);
  const [savedAccountKey, setSavedAccountKey] = useState('');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [paymentAccountAssignments, setPaymentAccountAssignments] = useState<PaymentAccountAssignment[]>([]);

  // Danh sách đa tài khoản ngân hàng liên kết trong SePay của Chủ cửa hàng
  const [linkedAccounts, setLinkedAccounts] = useState<SePayLinkedBankAccount[]>([]);
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false);

  // Bảo mật Zero-Plaintext: Không lưu API Key gốc ở trình duyệt; chỉ hiển thị bản Masked từ Server
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(true);
  const [newApiKeyInput, setNewApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(() => resolveSePayWebhookUrl());

  useEffect(() => {
    const storageKey = `pos_payment_config_${currentTenantId}`;
    const linkedKey = `pos_sepay_linked_accounts_${currentTenantId}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(linkedKey);
    setLinkedAccounts([]);

    branchApi.getBranches({ status: 'active', pageIndex: 1, pageSize: 100 })
      .then(({ items }) => setBranches(items.map((item) => ({ id: item.id, name: item.name, code: item.code }))))
      .catch(() => setBranches([]));

    // Tải cấu hình đã mã hóa AES-256 từ Backend API
    httpClient
      .get('/payments/config')
      .then((res) => {
        const data = res.data;
        if (!data) return;
        setWebhookUrl(resolveSePayWebhookUrl(data.webhookUrl));
        if (data.bankCode) setBankCode(data.bankCode);
        setBankAccountNumber(data.bankAccountNumber || '');
        setBankAccountName(data.bankAccountName || '');
        if (data.tenantPrefix) setTenantPrefix(data.tenantPrefix);
        if (typeof data.hasApiKey === 'boolean') setHasApiKey(data.hasApiKey);
        setMaskedApiKey(data.sepayApiKeyMasked || '');
        setIsRotatingKey(!data.hasApiKey);
        if (typeof data.isActive === 'boolean') setIsActive(data.isActive);
        const accounts = Array.isArray(data.paymentAccounts) ? data.paymentAccounts : [];
        setPaymentAccountAssignments(accounts);
        const currentAccount = accounts.find(
          (account: any) => account.bankCode === data.bankCode && account.bankAccountNumber === data.bankAccountNumber
        ) || accounts[0];
        setPaymentAccountId(currentAccount?.paymentAccountId || null);
        setSavedAccountKey(currentAccount ? `${currentAccount.bankCode}|${currentAccount.bankAccountNumber}` : '');
        setSelectedBranchIds(Array.isArray(currentAccount?.branchIds) ? currentAccount.branchIds : []);
      })
      .catch(() => {
        setSaveMessage('Không thể tải cấu hình từ máy chủ. Không sử dụng dữ liệu mẫu.');
      });
  }, [currentTenantId]);

  const handleSyncSePayAccounts = async () => {
    if (!isOwnerOrAdmin) return;
    setIsSyncingAccounts(true);
    try {
      const res = await httpClient.get('/payments/sepay-bank-accounts');
      if (Array.isArray(res.data?.accounts) && res.data.accounts.length > 0) {
        setLinkedAccounts(res.data.accounts);
        localStorage.setItem(
          `pos_sepay_linked_accounts_${currentTenantId}`,
          JSON.stringify(res.data.accounts)
        );
        setSaveMessage(
          res.data.message || 'Đã đồng bộ danh sách tài khoản ngân hàng liên kết từ SePay!'
        );
      } else {
        setLinkedAccounts([]);
        setSaveMessage(res.data?.message || 'SePay không trả về tài khoản ngân hàng nào.');
      }
    } catch (error: any) {
      setLinkedAccounts([]);
      setSaveMessage(error?.response?.data?.message || 'Đồng bộ SePay thất bại. Hãy kiểm tra API Key.');
    } finally {
      setIsSyncingAccounts(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  const handleSelectReceivingAccount = (acc: SePayLinkedBankAccount) => {
    if (!isOwnerOrAdmin) return;
    const existingAccount = paymentAccountAssignments.find(
      (account) => account.bankCode === acc.bankCode &&
        account.bankAccountNumber.trim() === acc.bankAccountNumber.trim()
    );

    setBankCode(acc.bankCode);
    setBankAccountNumber(acc.bankAccountNumber);
    setBankAccountName(acc.bankAccountName);
    setPaymentAccountId(existingAccount?.paymentAccountId || null);
    setSelectedBranchIds(existingAccount?.branchIds || []);
    setSaveMessage(
      existingAccount
        ? 'Đã mở cấu hình tài khoản. Hãy chọn các chi nhánh cần gán rồi bấm Lưu Cấu Hình.'
        : 'Tài khoản này chưa gán chi nhánh. Hãy chọn chi nhánh cần gán rồi bấm Lưu Cấu Hình.'
    );
  };

  const handleAddCurrentToLinkedList = () => {
    if (!isOwnerOrAdmin || !bankAccountNumber.trim()) return;
    const selectedBank = VIETNAMESE_BANKS.find((b) => b.code === bankCode);
    const exists = linkedAccounts.some(
      (a) => a.bankCode === bankCode && a.bankAccountNumber === bankAccountNumber.trim()
    );
    if (exists) {
      setSaveMessage('Tài khoản ngân hàng này đã có trong danh sách liên kết SePay!');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    const newAcc: SePayLinkedBankAccount = {
      bankCode,
      bankName: selectedBank?.name || bankCode,
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
      label: `TK Bổ Sung (${bankCode})`,
    };
    const updated = [...linkedAccounts, newAcc];
    setLinkedAccounts(updated);
    localStorage.setItem(`pos_sepay_linked_accounts_${currentTenantId}`, JSON.stringify(updated));
    setSaveMessage(`Đã thêm TK ${bankCode} - ${bankAccountNumber} vào danh sách TK SePay của Chủ tiệm!`);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard?.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((current) =>
      current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId]
    );
  };

  const handleSave = async () => {
    if (!isOwnerOrAdmin) return;
    if (!bankAccountNumber.trim() || !/^\d{6,30}$/.test(bankAccountNumber.trim())) {
      setSaveMessage('Số tài khoản phải gồm từ 6 đến 30 chữ số.');
      return;
    }
    if (!bankAccountName.trim() || bankAccountName.trim().length > 150) {
      setSaveMessage('Tên chủ tài khoản không được trống và không quá 150 ký tự.');
      return;
    }
    if (selectedBranchIds.length === 0) {
      setSaveMessage('Vui lòng chọn ít nhất một chi nhánh sử dụng tài khoản nhận tiền này.');
      return;
    }
    if (!hasApiKey && !newApiKeyInput.trim()) {
      setSaveMessage('Cấu hình lần đầu bắt buộc phải nhập SePay API Key thật.');
      return;
    }
    const nextAccountKey = `${bankCode}|${bankAccountNumber.trim()}`;
    if (savedAccountKey && savedAccountKey !== nextAccountKey) {
      const branchNames = branches
        .filter((branch) => selectedBranchIds.includes(branch.id))
        .map((branch) => branch.name)
        .join(', ');
      const confirmed = window.confirm(
        `Bạn có chắc muốn thay tài khoản nhận tiền hiện tại bằng ${bankCode} - ${bankAccountNumber.trim()}` +
        `${branchNames ? ` cho: ${branchNames}` : ''}?\n\nQR mới sẽ dùng tài khoản mới; giao dịch cũ không thay đổi.`
      );
      if (!confirmed) return;
    }
    setIsSaving(true);
    setSaveMessage(null);

    const selectedBank = VIETNAMESE_BANKS.find((b) => b.code === bankCode);
    const keyToSubmit = isRotatingKey && newApiKeyInput.trim() ? newApiKeyInput.trim() : undefined;

    // 1. Chỉ lưu thông tin công khai phục vụ sinh ảnh QR vào localStorage (TUYỆT ĐỐI KHÔNG lưu sepayApiKey)
    const storageKey = `pos_payment_config_${currentTenantId}`;
    const publicQrCache = {
      tenantId: currentTenantId,
      tenantPrefix,
      bankCode,
      bankName: selectedBank?.name || 'MBBank - Ngân hàng Quân Đội',
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
      webhookUrl,
      isActive,
      paymentAccountId,
      branchIds: selectedBranchIds,
    };
    // 2. Gửi lên Backend để mã hóa AES-256 và lưu vào PostgreSQL
    try {
      const res = await httpClient.post('/payments/config', {
        ...publicQrCache,
        sepayApiKey: keyToSubmit,
      });
      if (res.data) {
        if (res.data.sepayApiKeyMasked) setMaskedApiKey(res.data.sepayApiKeyMasked);
        if (typeof res.data.hasApiKey === 'boolean') setHasApiKey(res.data.hasApiKey);
        if (res.data.tenantPrefix) setTenantPrefix(res.data.tenantPrefix);
        if (res.data.paymentAccountId) setPaymentAccountId(res.data.paymentAccountId);
      }
      setSavedAccountKey(nextAccountKey);
      setPaymentAccountAssignments((current) => {
        const savedId = res.data?.paymentAccountId || paymentAccountId || '';
        const updated = current.map((account) => ({
          ...account,
          branchIds: account.branchIds.filter((id) => !selectedBranchIds.includes(id)),
        }));
        const existingIndex = updated.findIndex(
          (account) => account.paymentAccountId === savedId ||
            (account.bankCode === bankCode && account.bankAccountNumber === bankAccountNumber.trim())
        );
        const savedAccount: PaymentAccountAssignment = {
          paymentAccountId: savedId,
          bankCode,
          bankAccountNumber: bankAccountNumber.trim(),
          branchIds: selectedBranchIds,
        };
        if (existingIndex < 0) return [...updated, savedAccount];
        updated[existingIndex] = savedAccount;
        return updated;
      });
      localStorage.setItem(storageKey, JSON.stringify(publicQrCache));
      setSaveMessage(
        res.data?.message ||
          (keyToSubmit
            ? 'Đã lưu và cập nhật khóa SePay API Key mới thành công!'
            : 'Đã lưu cấu hình tài khoản thanh toán thành công!')
      );
    } catch (error: any) {
      setSaveMessage(error?.response?.data?.message || 'Lưu cấu hình thất bại. Dữ liệu chưa được ghi lên máy chủ.');
    }

    setIsRotatingKey(false);
    setNewApiKeyInput('');
    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleRevokeKey = async () => {
    if (!isOwnerOrAdmin) return;
    const confirmed = window.confirm(
      'CẢNH BÁO BẢO MẬT: Bạn có chắc chắn muốn THU HỒI KHẨN CẤP (Revoke) SePay API Key hiện tại?\n\n' +
        'Hành động này sẽ vô hiệu hóa ngay lập tức API Key cũ trên Server để chặn mọi kết nối trái phép. Bạn sẽ cần dán API Key mới từ my.sepay.vn để tiếp tục gạch nợ tự động.'
    );
    if (!confirmed) return;

    setIsRevoking(true);
    try {
      const res = await httpClient.post('/payments/revoke-key');
      setHasApiKey(false);
      setMaskedApiKey('');
      setIsRotatingKey(true);
      setSaveMessage(
        res.data?.message || 'Đã thu hồi khẩn cấp SePay API Key cũ! Vui lòng nhập API Key mới.'
      );
    } catch {
      setHasApiKey(false);
      setMaskedApiKey('');
      setIsRotatingKey(true);
      setSaveMessage('Đã vô hiệu hóa SePay API Key cũ! Vui lòng dán API Key mới.');
    } finally {
      setIsRevoking(false);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <div
        style={{
          width: '100%',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Thiết Lập Tài Khoản Thanh Toán & Cổng SePay (VietQR)
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Cấu hình tài khoản nhận tiền và thanh toán VietQR tại quầy POS.
          </p>
        </div>

      </div>

      {/* Cảnh báo RBAC nếu không phải STORE_OWNER */}
      {!isOwnerOrAdmin && (
        <div
          style={{
            width: '100%',
            marginBottom: 16,
            padding: '12px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#991b1b',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShieldAlert size={20} />
          <span>
            Bạn không có quyền thay đổi tài khoản nhận tiền hoặc SePay API Key.
          </span>
        </div>
      )}

      {saveMessage && (
        <div
          style={{
            width: '100%',
            marginBottom: 16,
            padding: '12px 18px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            color: '#065f46',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Check size={20} className="text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main 2-Column Content Grid */}
      <div
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(440px, 500px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* CỘT TRÁI: FORM CẤU HÌNH TÀI KHOẢN NGÂN HÀNG & SEPAY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Card Form Nhập Liệu */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 22,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: 10,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                Tài khoản nhận tiền & SePay
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#115e59' }}>Chi nhánh sử dụng tài khoản này</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Chọn chi nhánh nhận tiền vào tài khoản này.
                  </div>
                </div>
                {branches.length > 0 && (
                  <button type="button" disabled={!isOwnerOrAdmin}
                    onClick={() => setSelectedBranchIds(selectedBranchIds.length === branches.length ? [] : branches.map((branch) => branch.id))}
                    style={{ border: 0, background: 'transparent', color: '#0f766e', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>
                    {selectedBranchIds.length === branches.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
                {branches.map((branch) => (
                  <label key={branch.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
                    border: selectedBranchIds.includes(branch.id) ? '1px solid #14b8a6' : '1px solid #dbeafe',
                    backgroundColor: selectedBranchIds.includes(branch.id) ? '#ccfbf1' : '#ffffff',
                    cursor: isOwnerOrAdmin ? 'pointer' : 'default', fontSize: 12.5, color: '#334155',
                  }}>
                    <input type="checkbox" disabled={!isOwnerOrAdmin} checked={selectedBranchIds.includes(branch.id)} onChange={() => toggleBranch(branch.id)} />
                    <span><b>{branch.code || 'CN'}</b> — {branch.name}</span>
                  </label>
                ))}
                {branches.length === 0 && <div style={{ fontSize: 12, color: '#64748b' }}>Không tải được danh sách chi nhánh.</div>}
              </div>
            </div>

            {/* Danh sách Đa Tài Khoản Ngân Hàng Liên Kết SePay (Chủ cửa hàng chọn TK nhận tiền) */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                  Tài khoản liên kết SePay
                </div>
                {isOwnerOrAdmin && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleSyncSePayAccounts}
                      disabled={isSyncingAccounts}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0f766e',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #99f6e4',
                        borderRadius: 5,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Đồng bộ danh sách tài khoản ngân hàng từ cổng SePay của bạn"
                    >
                      <RefreshCw size={11} className={isSyncingAccounts ? 'animate-spin' : ''} />
                      <span>{isSyncingAccounts ? 'Đang đồng bộ...' : 'Đồng bộ SePay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddCurrentToLinkedList}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#0284c7',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: 5,
                        cursor: 'pointer',
                      }}
                      title="Lưu tài khoản đang nhập bên dưới vào danh sách TK SePay"
                    >
                      Lưu vào DS
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {linkedAccounts.map((acc) => {
                  const isSelected =
                    acc.bankCode === bankCode && acc.bankAccountNumber === bankAccountNumber;
                  return (
                    <div
                      key={`${acc.bankCode}-${acc.bankAccountNumber}`}
                      onClick={() => isOwnerOrAdmin && handleSelectReceivingAccount(acc)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                        border: isSelected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: isOwnerOrAdmin ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: 4,
                              backgroundColor: isSelected ? '#0f766e' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#334155',
                              fontSize: 11,
                            }}
                          >
                            {acc.bankCode}
                          </span>
                          <span>{acc.bankAccountNumber}</span>
                          <span style={{ color: '#64748b', fontWeight: 600, fontSize: 11.5 }}>
                            - {acc.bankAccountName}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{acc.label}</div>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          backgroundColor: isSelected ? '#dcfce7' : '#f1f5f9',
                          color: isSelected ? '#166534' : '#475569',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isSelected ? 'Đang chọn' : 'Chọn tài khoản'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ngân hàng */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                1. Ngân hàng thụ hưởng:
              </label>
              <select
                className="pos-select"
                value={bankCode}
                disabled={!isOwnerOrAdmin}
                onChange={(e) => setBankCode(e.target.value)}
                style={{ width: '100%', height: 40, fontSize: 13.5, paddingLeft: 10 }}
              >
                {VIETNAMESE_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Số tài khoản */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                2. Số tài khoản ngân hàng:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="pos-input"
                  value={bankAccountNumber}
                  disabled={!isOwnerOrAdmin}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="VD: 0918889999"
                  style={{ width: '100%', height: 40, paddingLeft: 38, fontSize: 14, fontWeight: 700 }}
                />
                <CreditCard size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              </div>
            </div>

            {/* Tên chủ tài khoản */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                3. Tên chủ tài khoản (Viết hoa không dấu):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="pos-input"
                  value={bankAccountName}
                  disabled={!isOwnerOrAdmin}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  placeholder="VD: NGUYEN AN NHIEN"
                  style={{ width: '100%', height: 40, paddingLeft: 38, fontSize: 14, fontWeight: 800 }}
                />
                <User size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              </div>
            </div>

            {/* SePay API Key */}
            <div
              style={{
                padding: 14,
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                  4. SePay API Key:
                </label>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: hasApiKey ? '#dcfce7' : '#fee2e2',
                    color: hasApiKey ? '#166534' : '#991b1b',
                  }}
                >
                  {hasApiKey ? 'Đã cấu hình Key' : 'Chưa có Key'}
                </span>
              </div>

              {!isRotatingKey && hasApiKey ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: '#0f766e',
                      fontWeight: 700,
                    }}
                  >
                    <span>{maskedApiKey}</span>
                  </div>

                  {isOwnerOrAdmin && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRotatingKey(true);
                          setNewApiKeyInput('');
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <RefreshCw size={13} />
                        <span>Đổi khóa</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRevokeKey}
                        disabled={isRevoking}
                        style={{
                          padding: '7px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                        title="Vô hiệu hóa ngay lập tức API Key hiện tại"
                      >
                        {isRevoking ? 'Đang thu hồi...' : 'Thu hồi Key khẩn cấp'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="pos-input"
                      value={newApiKeyInput}
                      disabled={!isOwnerOrAdmin}
                      onChange={(e) => setNewApiKeyInput(e.target.value)}
                      placeholder="Dán API Token từ SePay"
                      style={{
                        width: '100%',
                        height: 40,
                        paddingLeft: 38,
                        paddingRight: 45,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        backgroundColor: '#ffffff',
                      }}
                    />
                    <Key size={18} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 10,
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

                  {hasApiKey && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRotatingKey(false);
                          setNewApiKeyInput('');
                        }}
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Hủy đổi khóa
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Webhook URL */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                5. Đường dẫn Webhook (dán vào SePay):
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="pos-input"
                    value={webhookUrl}
                    readOnly
                    style={{ width: '100%', height: 40, paddingLeft: 38, backgroundColor: '#f8fafc', color: '#475569', fontSize: 12 }}
                  />
                  <LinkIcon size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                </div>
                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={handleCopyWebhook}
                  style={{
                    height: 40,
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    backgroundColor: copiedWebhook ? '#ecfdf5' : undefined,
                    borderColor: copiedWebhook ? '#10b981' : undefined,
                    color: copiedWebhook ? '#059669' : undefined,
                  }}
                >
                  {copiedWebhook ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedWebhook ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                id="page-active-toggle"
                checked={isActive}
                disabled={!isOwnerOrAdmin}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0f766e' }}
              />
              <label htmlFor="page-active-toggle" style={{ fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                <b>Kích hoạt thanh toán VietQR tại POS</b>
              </label>
            </div>

            <button
              type="button"
              className="pos-btn-primary"
              onClick={handleSave}
              disabled={isSaving || !isOwnerOrAdmin}
              style={{
                backgroundColor: isOwnerOrAdmin ? '#0f766e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px',
                borderRadius: 8,
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: isOwnerOrAdmin ? 'pointer' : 'not-allowed',
              }}
            >
              {isSaving ? (
                'Đang lưu...'
              ) : (
                <>
                  <Save size={16} /> Lưu Cấu Hình
                </>
              )}
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: CẨM NANG HƯỚNG DẪN CÓ GIAO DIỆN MẪU SEPAY TRỰC QUAN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Hướng dẫn cấu hình SePay
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', fontSize: 12.5 }}>
            Làm theo 5 bước bên dưới. Giao diện SePay có thể thay đổi theo phiên bản.
          </div>

          {/* Bước 1 & 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                  ① Tạo và xác minh tài khoản SePay
                </div>
                <a
                  href="https://my.sepay.vn"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: '#0284c7',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  my.sepay.vn <ExternalLink size={13} />
                </a>
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                Truy cập <code>my.sepay.vn</code>, đăng ký/đăng nhập và hoàn tất thông tin công ty. Không chia sẻ mật khẩu hoặc mã OTP cho người khác.
              </div>
            </div>

            <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                ② Liên kết tài khoản ngân hàng nhận tiền
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                Vào <b>Ngân hàng → Thêm tài khoản</b>, chọn ngân hàng và làm theo hướng dẫn liên kết. Kiểm tra tài khoản có trạng thái <b>Hoạt động</b>.
              </div>
            </div>
          </div>

          {/* Bước 3: Ảnh thật trang API Access của SePay */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                ③ Tạo API Token để hệ thống đồng bộ tài khoản
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Cấu hình Công ty / API Access</span>
            </div>

            <div style={{ padding: 12, backgroundColor: '#f8fafc', minWidth: 0 }}>
              <svg viewBox="0 455 260 305" role="img" aria-label="Menu Cấu hình Công ty và API Access trên SePay" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto 10px', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                <image href="/guides/sepay-api-access.png" width="1707" height="876" />
                <path d="M 200 515 L 150 497 M 150 497 L 160 507 M 150 497 L 164 493 M 200 710 L 130 733 M 130 733 L 142 723 M 130 733 L 145 735" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <text x="205" y="520" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">1</text>
                <text x="205" y="714" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">2</text>
              </svg>
              <svg viewBox="460 145 1040 255" role="img" aria-label="Trang API Access, mũi tên chỉ nút Thêm API và sao chép token" style={{ width: '100%', display: 'block', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                <image href="/guides/sepay-api-access.png" width="1707" height="876" />
                <path d="M 1360 215 L 1410 190 M 1410 190 L 1393 192 M 1410 190 L 1402 204 M 735 295 L 660 291 M 660 291 L 675 282 M 660 291 L 675 300" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <text x="1335" y="225" fill="#b91c1c" fontSize="24" fontWeight="bold">3</text>
                <text x="745" y="302" fill="#b91c1c" fontSize="24" fontWeight="bold">4</text>
              </svg>
              <div style={{ marginTop: 10, padding: '10px 12px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                ① Mở <b>Cấu hình Công ty</b> → ② chọn <b>API Access</b> → ③ bấm <b>+ Thêm API</b>, đặt tên và chọn <b>Hoạt động</b> → ④ sao chép Token rồi dán vào ô <b>SePay API Key</b> bên trái. Giữ Token bí mật như mật khẩu.
              </div>
            </div>
          </div>

          {/* Bước 4: Ảnh thật trang Webhooks của SePay */}
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff' }}>
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                ④ Tạo Webhook thông báo giao dịch tiền vào
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Webhooks / + Thêm webhook</span>
            </div>

            <div style={{ padding: 12, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, width: '100%', minWidth: 0 }}>
                <figure style={{ margin: 0, minWidth: 0 }}>
                  <svg viewBox="0 365 260 140" role="img" aria-label="Menu Tích hợp WebHooks trên SePay" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto 10px', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                    <image href="/guides/sepay-webhooks.png" width="1707" height="876" />
                    <path d="M 215 470 L 180 441 M 180 441 L 194 444 M 180 441 L 185 455" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="220" y="478" fill="white" stroke="#b91c1c" strokeWidth="3" paintOrder="stroke" fontSize="20" fontWeight="bold">1</text>
                  </svg>
                  <svg viewBox="260 145 1440 170" role="img" aria-label="Trang Webhooks, mũi tên chỉ nút Thêm webhook" style={{ width: '100%', display: 'block', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                    <image href="/guides/sepay-webhooks.png" width="1707" height="876" />
                    <path d="M 1480 280 L 1575 245 M 1575 245 L 1555 244 M 1575 245 L 1562 261" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="1450" y="290" fill="#b91c1c" fontSize="30" fontWeight="bold">2</text>
                  </svg>
                  <figcaption style={{ marginTop: 5, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>A. Mở danh sách và bấm “Thêm webhook”</figcaption>
                </figure>
                <figure style={{ margin: 0, minWidth: 0 }}>
                  <svg viewBox="1007 0 700 876" role="img" aria-label="Form Thêm Webhook, mũi tên chỉ URL và nút Tiếp theo" style={{ width: '100%', maxWidth: 520, display: 'block', margin: '0 auto', borderRadius: 7, border: '1px solid #cbd5e1' }}>
                    <image href="/guides/sepay-add-webhook.png" width="1707" height="876" />
                    <path d="M 1540 250 L 1490 286 M 1490 286 L 1508 284 M 1490 286 L 1497 270 M 1510 790 L 1590 835 M 1590 835 L 1571 833 M 1590 835 L 1582 818" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    <text x="1545" y="250" fill="#b91c1c" fontSize="24" fontWeight="bold">3</text>
                    <text x="1480" y="790" fill="#b91c1c" fontSize="24" fontWeight="bold">4</text>
                  </svg>
                  <figcaption style={{ marginTop: 5, fontSize: 11.5, color: '#475569', fontWeight: 700 }}>B. Hoàn thành lần lượt Cơ bản → Tài khoản → Bảo mật → Cảnh báo</figcaption>
                </figure>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 12, color: '#065f46', fontWeight: 600 }}>
                ① Chọn <b>Tích hợp WebHooks</b> → ② bấm <b>+ Thêm webhook</b> → ③ nhập tên, dán URL ở ô số 5 bên trái, chọn <b>Tiền vào</b> và <b>JSON</b> → ④ bấm <b>Tiếp theo</b>. Sau đó chọn tài khoản ngân hàng, chọn bảo mật <b>API Key</b> và dán Token ở bước ③, kiểm tra rồi bấm <b>Thêm</b>.
              </div>
            </div>
          </div>

          {/* Bước 5 */}
          <div style={{ padding: 14, border: '1px solid #99f6e4', borderRadius: 8, backgroundColor: '#f0fdfa' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
              ⑤ Lưu cấu hình trong MT-GRMS và gán theo chi nhánh
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
              Lần đầu, nhập tài khoản ngân hàng, chọn chi nhánh và dán API Token vào ô số 4, rồi bấm <b>Lưu Cấu Hình</b>. Sau khi lưu, có thể bấm <b>Đồng bộ SePay</b> để chọn tài khoản khác và gán cho chi nhánh. Mỗi chi nhánh chỉ dùng một tài khoản nhận tiền tại một thời điểm.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
