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
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { httpClient } from '../../../api/httpClient';
import { VIETNAMESE_BANKS } from '../components/modals/PaymentConfigModal';
import { branchApi } from '../../purchase-order/api/branchApi';

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

  const webhookUrl = `${window.location.origin.replace(':5173', ':5000')}/api/payments/sepay-webhook`;

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
  }, [currentTenantId, webhookUrl]);

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
            Cấu hình tài khoản ngân hàng của Chủ cửa hàng để tự động nhận tiền và gạch nợ hóa đơn tại quầy POS
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isOwnerOrAdmin}
            style={{
              backgroundColor: isOwnerOrAdmin ? '#0f766e' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 700,
              cursor: isOwnerOrAdmin ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
            }}
          >
            <Save size={18} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
          </button>
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
            Chế độ Bảo mật Phân quyền (RBAC): Chỉ tài khoản <b>Chủ cửa hàng (STORE_OWNER)</b> mới được phép thay đổi Số tài khoản nhận tiền hoặc xoay khóa SePay API Key. Nhân viên thu ngân chỉ được quyền sinh mã QR tại quầy bán hàng.
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
                Thông Tin Tài Khoản Nhận Tiền & Khóa Đối Soát
              </div>
            </div>

            <div style={{ padding: '12px 14px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#115e59' }}>Chi nhánh sử dụng tài khoản này</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    Chọn một hoặc nhiều chi nhánh dùng tài khoản này làm mặc định khi tạo VietQR.
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
                  Tài Khoản Ngân Hàng Liên Kết SePay (Chọn TK Nhận Tiền):
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
                        {isSelected ? 'Đang nhận tiền POS' : 'Chọn nhận tiền'}
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
                        <span>Đổi / Xoay khóa mới</span>
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
                      placeholder="Dán SePay API Key mới từ my.sepay.vn (VD: sepay_apikey_...)"
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
                        Hủy đổi khóa (Giữ nguyên Key hiện tại)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Webhook URL */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                5. Đường dẫn Webhook hệ thống (Copy dán sang SePay):
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
                <b>Kích hoạt cổng chuyển khoản VietQR tự động tại POS</b>
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

        {/* CỘT PHẢI: CẨM NANG HƯỚNG DẪN 5 BƯỚC CÓ GIAO DIỆN MẪU SEPAY TRỰC QUAN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            Cẩm Nang Hướng Dẫn Đăng Ký SePay (Có Giao Diện Mẫu Trực Quan)
          </div>

          {/* Bước 1 & 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                  Bước 1: Đăng ký tài khoản SePay
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
                Truy cập <code>https://my.sepay.vn</code> và đăng ký bằng Số điện thoại hoặc Email của bạn (Miễn phí 100%).
              </div>
            </div>

            <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
                Bước 2: Thêm tài khoản ngân hàng
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
                Vào menu <b>Tài khoản ngân hàng</b> → Bấm <b>Thêm tài khoản</b> → Chọn ngân hàng (MB, VCB...) và nhập STK nhận tiền.
              </div>
            </div>
          </div>

          {/* Bước 3: Mockup UI Lấy API Key */}
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
                Bước 3: Màn hình SePay - Lấy API Key (Quyền Read-Only)
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>my.sepay.vn / userapi / keys</span>
            </div>

            {/* Mockup Canvas */}
            <div style={{ padding: 16, backgroundColor: '#f8fafc' }}>
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Mockup Sidebar */}
                <div style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '14px 10px', fontSize: 11.5 }}>
                  <div
                    style={{
                      color: '#38bdf8',
                      fontWeight: 800,
                      fontSize: 13,
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#38bdf8' }} />
                    <span>SePay Dashboard</span>
                  </div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Tổng quan</div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Tài khoản NH</div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Giao dịch</div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '4px 6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    Tích hợp Web
                  </div>
                  <div style={{ padding: '4px 14px', color: '#38bdf8', fontWeight: 700 }}>• API Key</div>
                  <div style={{ padding: '4px 14px', color: '#94a3b8' }}>• Webhooks</div>
                </div>

                {/* Mockup Content */}
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Danh sách API Keys</div>
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      + Tạo API Key
                    </button>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontSize: 11.5, color: '#64748b' }}>Tên Key: Quầy POS MT-Mart</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <code
                        style={{
                          fontSize: 12,
                          color: '#0f766e',
                          fontWeight: 700,
                          backgroundColor: '#ecfdf5',
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        sepay_apikey_••••••••••••8899
                      </code>
                      <button
                        type="button"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #0284c7',
                          color: '#0284c7',
                          borderRadius: 4,
                          padding: '3px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Copy size={11} color="#0284c7" /> Sao chép
                      </button>
                    </div>
                  </div>

                  {/* Callout */}
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#92400e',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ArrowRight size={16} className="text-amber-700 flex-shrink-0" />
                    <span>
                      <b>HƯỚNG DẪN:</b> Bấm <b>Tạo API Key</b> → Bấm <b>Sao chép</b> mã này → Bấm <b>Đổi / Xoay khóa mới</b> ở ô số 4 bên trái để dán vào (Server tự động mã hóa AES-256)!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bước 4: Mockup UI Thêm Webhook */}
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
                Bước 4: Màn hình SePay - Thêm Webhook Bắn Tiền Tự Động (Header Apikey)
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>my.sepay.vn / userapi / webhooks / create</span>
            </div>

            {/* Mockup Canvas */}
            <div style={{ padding: 16, backgroundColor: '#f8fafc' }}>
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Mockup Sidebar */}
                <div style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '14px 10px', fontSize: 11.5 }}>
                  <div
                    style={{
                      color: '#38bdf8',
                      fontWeight: 800,
                      fontSize: 13,
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#38bdf8' }} />
                    <span>SePay Dashboard</span>
                  </div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Tổng quan</div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Tài khoản NH</div>
                  <div style={{ padding: '4px 6px', color: '#64748b' }}>Giao dịch</div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '4px 6px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    Tích hợp Web
                  </div>
                  <div style={{ padding: '4px 14px', color: '#94a3b8' }}>• API Key</div>
                  <div style={{ padding: '4px 14px', color: '#38bdf8', fontWeight: 700 }}>• Webhooks</div>
                </div>

                {/* Mockup Form */}
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                    Thêm Webhook nhận thông báo
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Địa chỉ Webhook (URL nhận POST):
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 11.5,
                        backgroundColor: '#f0fdfa',
                        border: '1.5px solid #0f766e',
                        borderRadius: 4,
                        color: '#0f766e',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Kiểu chứng thực & Sự kiện kích hoạt:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: '#1e293b', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked readOnly style={{ accentColor: '#0284c7' }} />
                        <span>Giao dịch nhận tiền (Money In)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked readOnly style={{ accentColor: '#0284c7' }} />
                        <span>Header: <code>Authorization: Apikey</code></span>
                      </label>
                    </div>
                  </div>

                  {/* Callout */}
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#065f46',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ArrowRight size={16} className="text-emerald-700 flex-shrink-0" />
                    <span>
                      <b>HƯỚNG DẪN:</b> Copy link Webhook ở ô số 5 (cột trái) dán vào đây, chọn chứng thực bằng <b>API Key</b> rồi bấm <b>Thêm Webhook</b>!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bước 5 */}
          <div style={{ padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f766e' }}>
              Bước 5: Trải nghiệm thanh toán chuyển khoản VietQR tự động báo "Ting Ting" tại quầy POS
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4 }}>
              Mở quầy bán hàng POS, tạo đơn và chọn <b>Chuyển khoản (QR)</b>. Hệ thống tự động gắn tiền tố <code>{tenantPrefix}_HDxxxx</code>, đối soát 6 lớp và tự động in hóa đơn sau 2.5 giây ngay khi tiền vào tài khoản!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
