import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { CashAccount, CreatePaymentDTO, CounterpartyType } from '../types/cashbook.types';

interface CreatePaymentModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: CreatePaymentDTO) => Promise<void>;
  initialCategory?: string;
}

export const CreatePaymentModal: FC<CreatePaymentModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  initialCategory,
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Rút vốn chủ (Owner Draw)');
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>('OTHER');
  const [counterpartyName, setCounterpartyName] = useState('Chủ hộ kinh doanh');
  const [description, setDescription] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('Quý 3/2026');
  const [taxReferenceDocId, setTaxReferenceDocId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      if (initialCategory === 'Rút vốn chủ (Owner Draw)') {
        setCounterpartyType('OTHER');
        setCounterpartyName('Chủ hộ kinh doanh');
        setDescription('Chủ shop rút tiền chi tiêu cá nhân (Không tính P&L)');
        const safeOrBank = accounts.find((a) => a.isSafeDeposit || a.accountType === 'BANK') || accounts[0];
        if (safeOrBank) setAccountId(safeOrBank.id);
      } else if (initialCategory === 'Nộp thuế nhà nước (Tax Payment)') {
        setCounterpartyType('TAX_AUTHORITY');
        setCounterpartyName('Kho bạc Nhà nước / Cơ quan Thuế');
        setDescription('Nộp thuế GTGT & TNCN Quý 3/2026');
        const bankAcc = accounts.find((a) => a.accountType === 'BANK') || accounts[0];
        if (bankAcc) setAccountId(bankAcc.id);
      }
    }
  }, [initialCategory, isOpen, accounts]);

  if (!isOpen) return null;

  const categories = [
    'Rút vốn chủ (Owner Draw)',
    'Nộp thuế nhà nước (Tax Payment)',
    'Mua sắm trang thiết bị / Tài sản',
    'Chi khác ngoài hóa đơn',
  ];

  // Tính trực tiếp, loại bỏ hook useMemo sau early return
  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const parsedAmount = Number(amountStr.replace(/\D/g, '')) || 0;

  // Kiểm tra vi phạm Rule GBR-CSH-03 (Chống âm két tiền mặt)
  const isOverdraftViolation =
    selectedAccount?.accountType === 'CASH' && parsedAmount > selectedAccount.currentBalance;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi lớn hơn 0');
      return;
    }

    if (isOverdraftViolation) {
      setErrorMsg('Không thể chi vượt quá số dư hiện tại của két tiền mặt');
      return;
    }

    if (!counterpartyName.trim()) {
      setErrorMsg('Vui lòng nhập tên người nhận tiền');
      return;
    }

    try {
      setIsSubmitting(true);
      const isTax = category.includes('Nộp thuế');
      const finalDesc = isTax
        ? (description.trim() || `Nộp thuế ${taxPeriod}${taxReferenceDocId ? ` (GNT: ${taxReferenceDocId})` : ''}`)
        : (description.trim() || 'Chi tiền từ quỹ');

      await onSubmit({
        accountId,
        amount: parsedAmount,
        category,
        counterpartyType,
        counterpartyName: counterpartyName.trim(),
        description: finalDesc,
        referenceDocId: isTax && taxReferenceDocId.trim() ? taxReferenceDocId.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu phiếu chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header">
          <h2 className="cb-modal-title">
            <span>🔴</span> Lập Phiếu Chi Tiền
          </h2>
          <button type="button" className="cb-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-modal-body">
            {errorMsg && (
              <div className="cb-overdraft-alert">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            {isOverdraftViolation && (
              <div className="cb-overdraft-alert">
                <span>🚫</span>
                <div>
                  <strong>Cảnh báo Rule GBR-CSH-03:</strong> Số tiền chi (
                  {parsedAmount.toLocaleString('vi-VN')} đ) vượt quá số dư két hiện có (
                  {selectedAccount.currentBalance.toLocaleString('vi-VN')} đ). Nút xác nhận chi đã bị vô hiệu hóa!
                </div>
              </div>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Tài khoản xuất tiền *</label>
              <select
                className="cb-form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} (Hiện có: {acc.currentBalance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền chi (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Ví dụ: 500,000"
                value={amountStr ? Number(amountStr.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Danh mục chi *</label>
              <select
                className="cb-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {category.includes('Rút vốn') && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: '12px', color: '#92400E' }}>
                  💡 <strong>Rút vốn chủ:</strong> Bút toán giảm quỹ tiêu dùng cá nhân của Chủ hộ, được cách ly 100% khỏi chi phí kinh doanh P&L.
                </div>
              )}
              {category.includes('Nộp thuế') && (
                <div style={{ marginTop: 6, padding: '10px 12px', background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 8, fontSize: '12px', color: '#1E40AF' }}>
                  💡 <strong>Quyền nộp thuế của Chủ hộ:</strong> Số liệu trên Sổ thuế là tính toán tham khảo theo doanh thu POS. Chủ tiệm toàn quyền điều chỉnh số tiền thực nộp (thêm/bớt) theo số thực nộp tại Kho bạc. Bút toán này trích giảm tiền quỹ và không tính vào P&L.
                </div>
              )}
            </div>

            {/* Specialized fields when paying Taxes */}
            {category.includes('Nộp thuế') && (
              <>
                <div className="cb-form-group">
                  <label className="cb-form-label">Kỳ tính thuế nộp *</label>
                  <select
                    className="cb-form-select"
                    value={taxPeriod}
                    onChange={(e) => setTaxPeriod(e.target.value)}
                  >
                    <option value="Quý 3/2026">Thuế Quý 3/2026 (Kê khai theo quý)</option>
                    <option value="Quý 4/2026">Thuế Quý 4/2026 (Kê khai theo quý)</option>
                    <option value="Quý 1/2026">Thuế Quý 1/2026 (Kê khai theo quý)</option>
                    <option value="Quý 2/2026">Thuế Quý 2/2026 (Kê khai theo quý)</option>
                    <option value="Năm 2026">Lệ phí Môn bài năm 2026</option>
                    <option value="Thuế khoán / Khác">Thuế khoán / Truy thu khác</option>
                  </select>
                </div>

                <div className="cb-form-group">
                  <label className="cb-form-label">
                    Số Giấy nộp tiền NSNN / Mã GD Bank (Bằng chứng sao kê)
                  </label>
                  <input
                    type="text"
                    className="cb-form-input"
                    placeholder="Ví dụ: GNT-2026-998811 hoặc mã tham chiếu ủy nhiệm chi..."
                    value={taxReferenceDocId}
                    onChange={(e) => setTaxReferenceDocId(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: 4, display: 'block' }}>
                    Mã này được lưu vào Sổ cái làm chứng từ đối soát khi cơ quan thuế kiểm tra.
                  </span>
                </div>
              </>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Người nhận tiền *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="cb-form-select"
                  style={{ width: '140px' }}
                  value={counterpartyType}
                  onChange={(e) => setCounterpartyType(e.target.value as CounterpartyType)}
                >
                  <option value="SUPPLIER">Nhà cung cấp</option>
                  <option value="TAX_AUTHORITY">Cơ quan thuế</option>
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="CUSTOMER">Khách hàng</option>
                  <option value="OTHER">Chủ tiệm / Khác</option>
                </select>
                <input
                  type="text"
                  className="cb-form-input"
                  placeholder="Nhập họ tên / đơn vị thụ hưởng..."
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Diễn giải lý do chi</label>
              <textarea
                className="cb-form-textarea"
                rows={2}
                placeholder="Ghi chú mục đích xuất chi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Smart Navigation Link to Service Expenses */}
            <div style={{ marginTop: '8px', padding: '10px 14px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 8, fontSize: '11px', color: '#475569' }}>
              📌 <strong>Bạn muốn trả tiền điện, nước, internet, mặt bằng định kỳ?</strong>
              <div style={{ marginTop: 2, color: '#64748B' }}>
                Các khoản này có hóa đơn công nợ nên được quản lý và thanh toán tại <a href="/store-owner/expenses" style={{ color: '#0F766E', fontWeight: 700, textDecoration: 'underline' }}>Trang Hóa Đơn Phải Trả (Expenses)</a> để theo dõi hạn nộp và tự động ghi sổ quỹ, tránh bị trùng lặp chi phí!
              </div>
            </div>
          </div>

          <div className="cb-modal-footer">
            <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-payment"
              disabled={isSubmitting || isOverdraftViolation || parsedAmount <= 0}
            >
              {isSubmitting ? 'Đang lưu...' : '✕ Xác Nhận Chi Tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
