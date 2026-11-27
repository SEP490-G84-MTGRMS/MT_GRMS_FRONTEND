import { isAxiosError } from 'axios';
import { mapProblemDetailsToVietnamese } from '../../../api/problemDetailsMapper';
import { useCashbookSubmissionKey } from '../hooks/useCashbookSubmissionKey';
import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { AlertTriangle, ArrowUpFromLine, Ban, Info, X } from 'lucide-react';
import type { CashAccount, CashbookTaxTreatment, CreatePaymentDTO, CounterpartyType } from '../types/cashbook.types';

interface CreatePaymentModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: CreatePaymentDTO, idempotencyKey: string) => Promise<void>;
  initialCategory?: string;
}

const MAX_DESCRIPTION_LENGTH = 255;
const PAYMENT_CATEGORIES = [
  { code: 'OWNER_DRAW', label: 'Rút vốn chủ', treatment: 'NonDeductibleExpense' as const },
  { code: 'TAX_PAYMENT', label: 'Nộp thuế nhà nước', treatment: 'TaxPayment' as const },
  { code: 'ASSET_PURCHASE', label: 'Mua sắm trang thiết bị / Tài sản', treatment: 'NonDeductibleExpense' as const },
  { code: 'OTHER_PAYMENT', label: 'Chi khác ngoài hóa đơn', treatment: null },
];

export const CreatePaymentModal: FC<CreatePaymentModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  initialCategory,
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(initialCategory || PAYMENT_CATEGORIES[0].label);
  const [taxTreatment, setTaxTreatment] = useState<CashbookTaxTreatment>('NonDeductibleExpense');
  const [taxTreatmentReason, setTaxTreatmentReason] = useState('');
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>('OTHER');
  const [counterpartyName, setCounterpartyName] = useState('Chủ hộ kinh doanh');
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const defaultTaxPeriod = `Quý ${currentQuarter}/${currentYear}`;
  const [description, setDescription] = useState('');
  const [taxPeriod, setTaxPeriod] = useState(defaultTaxPeriod);
  const [taxReferenceDocId, setTaxReferenceDocId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getSubmissionKey = useCashbookSubmissionKey(isOpen);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setTaxReferenceDocId('');
      setErrorMsg('');
      const normalizedCategory = PAYMENT_CATEGORIES.find((item) => item.label === initialCategory)?.label
        || (initialCategory?.includes('Nộp thuế') ? 'Nộp thuế nhà nước' : PAYMENT_CATEGORIES[0].label);
      setCategory(normalizedCategory);
      const option = PAYMENT_CATEGORIES.find((item) => item.label === normalizedCategory)!;
      setTaxTreatment(option.treatment || 'ReviewRequired');
      setTaxTreatmentReason('');
      if (option.code === 'OWNER_DRAW') {
        setCounterpartyType('OTHER');
        setCounterpartyName('Chủ hộ kinh doanh');
        setDescription('Chủ shop rút tiền chi tiêu cá nhân (Không tính P&L)');
        const safeOrBank = accounts.find((a) => a.isSafeDeposit || a.accountType === 'BANK') || accounts[0];
        if (safeOrBank) setAccountId(safeOrBank.id);
      } else if (option.code === 'TAX_PAYMENT') {
        setCounterpartyType('TAX_AUTHORITY');
        setCounterpartyName('Kho bạc Nhà nước / Cơ quan Thuế');
        setTaxPeriod(defaultTaxPeriod);
        setDescription(`Nộp thuế GTGT & TNCN ${defaultTaxPeriod}`);
        const bankOrSafe = accounts.find((a) => a.accountType === 'BANK') || accounts.find((a) => a.isSafeDeposit) || accounts[0];
        if (bankOrSafe) setAccountId(bankOrSafe.id);
      } else {
        setCounterpartyType('SUPPLIER');
        setCounterpartyName('');
        setDescription('');
        if (accounts[0]) setAccountId(accounts[0].id);
      }
    }
  }, [initialCategory, isOpen, accounts]);

  if (!isOpen) return null;

  const selectedCategory = PAYMENT_CATEGORIES.find((item) => item.label === category) || PAYMENT_CATEGORIES[0];

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const option = PAYMENT_CATEGORIES.find((item) => item.label === value)!;
    setTaxTreatment(option.treatment || 'ReviewRequired');
    setTaxTreatmentReason('');
    setTaxReferenceDocId('');
    if (option.code === 'OWNER_DRAW') {
      setCounterpartyType('OTHER');
      setCounterpartyName('Chủ hộ kinh doanh');
      setDescription('Chủ hộ rút tiền chi tiêu cá nhân');
    } else if (option.code === 'TAX_PAYMENT') {
      setCounterpartyType('TAX_AUTHORITY');
      setCounterpartyName('Kho bạc Nhà nước / Cơ quan Thuế');
      setDescription(`Nộp thuế GTGT & TNCN ${taxPeriod}`);
      const eligible = accounts.find((a) => a.accountType === 'BANK') || accounts.find((a) => a.isSafeDeposit);
      if (eligible) setAccountId(eligible.id);
    } else {
      setCounterpartyType('SUPPLIER');
      setCounterpartyName('');
      setDescription('');
    }
  };

  // Tính trực tiếp, loại bỏ hook useMemo sau early return
  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const parsedAmount = Number(amountStr.replace(/\D/g, '')) || 0;

  // Kiểm tra vi phạm Rule GBR-CSH-03 (Chống âm két tiền mặt)
  const isOverdraftViolation =
    selectedAccount?.accountType === 'CASH' && parsedAmount > selectedAccount.currentBalance;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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

    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      setErrorMsg(`Diễn giải không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự`);
      return;
    }
    if (selectedCategory.code === 'OTHER_PAYMENT' && taxTreatment === 'ReviewRequired') {
      setErrorMsg('Vui lòng chọn cách xử lý thuế cho khoản chi khác');
      return;
    }
    if (taxTreatment === 'DeductibleExpense' && !taxReferenceDocId.trim()) {
      setErrorMsg('Chi phí được trừ bắt buộc có số hoặc mã chứng từ');
      return;
    }
    if (selectedCategory.code === 'TAX_PAYMENT') {
      if (!taxReferenceDocId.trim()) {
        setErrorMsg('Nộp thuế bắt buộc có số giấy nộp tiền hoặc mã giao dịch ngân hàng');
        return;
      }
      if (selectedAccount && selectedAccount.accountType === 'CASH' && !selectedAccount.isSafeDeposit) {
        setErrorMsg('Chứng từ nộp thuế chỉ được chi từ Tài khoản Ngân hàng hoặc Két sắt chủ, không chi từ két thu ngân.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const isTax = selectedCategory.code === 'TAX_PAYMENT';
      const finalDesc = isTax
        ? (description.trim() || `Nộp thuế ${taxPeriod}${taxReferenceDocId ? ` (GNT: ${taxReferenceDocId})` : ''}`)
        : (description.trim() || 'Chi tiền từ quỹ');

      const dto: CreatePaymentDTO = {
        accountId,
        amount: parsedAmount,
        category,
        counterpartyType,
        counterpartyName: counterpartyName.trim(),
        description: finalDesc,
        referenceDocId: taxReferenceDocId.trim() || undefined,
        categoryCode: selectedCategory.code,
        taxTreatment,
        taxTreatmentReason: taxTreatmentReason.trim() || undefined,
      };
      await onSubmit(dto, getSubmissionKey(dto));
      onClose();
    } catch (err: unknown) {
      setErrorMsg(isAxiosError(err) ? mapProblemDetailsToVietnamese(err) : err instanceof Error ? err.message : 'Lỗi khi lưu phiếu chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header cb-modal-header--payment">
          <div className="cb-modal-heading">
            <span className="cb-modal-icon"><ArrowUpFromLine size={20} /></span>
            <div><h2 className="cb-modal-title">Lập phiếu chi</h2><p className="cb-modal-subtitle">Ghi nhận tiền ra khỏi quỹ hoặc tài khoản</p></div>
          </div>
          <button type="button" className="cb-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-modal-body">
            {errorMsg && (
              <div className="cb-overdraft-alert" role="alert">
                <AlertTriangle size={15} className="shrink-0" /> <span>{errorMsg}</span>
              </div>
            )}

            {isOverdraftViolation && (
              <div className="cb-overdraft-alert">
                <Ban size={15} className="shrink-0" />
                <div>
                  Số tiền chi vượt số dư khả dụng {selectedAccount.currentBalance.toLocaleString('vi-VN')} đ.
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
                {(selectedCategory.code === 'TAX_PAYMENT'
                  ? accounts.filter((a) => a.accountType === 'BANK' || a.isSafeDeposit)
                  : accounts
                ).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName}{acc.branchName ? ` — ${acc.branchName}` : ''} (Hiện có: {acc.currentBalance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền chi (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Ví dụ: 500.000"
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
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {PAYMENT_CATEGORIES.map((item) => (
                  <option key={item.code} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
              {selectedCategory.code === 'OTHER_PAYMENT' ? (
                <div className="cb-tax-choice" role="group" aria-label="Xử lý thuế">
                  <span className="cb-tax-choice__label">Xử lý kế toán và thuế *</span>
                  <label><input type="radio" name="payment-tax" checked={taxTreatment === 'DeductibleExpense'} onChange={() => setTaxTreatment('DeductibleExpense')} /> Chi phí kinh doanh được trừ</label>
                  <label><input type="radio" name="payment-tax" checked={taxTreatment === 'NonDeductibleExpense'} onChange={() => setTaxTreatment('NonDeductibleExpense')} /> Chi phí không được trừ</label>
                </div>
              ) : (
                <p className="cb-field-hint"><Info size={13} /> {selectedCategory.code === 'TAX_PAYMENT' ? 'Thanh toán nghĩa vụ thuế, không tính vào P&L.' : 'Khoản chi không được tính trực tiếp vào chi phí được trừ.'}</p>
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
                    <option value={`Quý 1/${currentYear}`}>Thuế Quý 1/{currentYear} (Kê khai theo quý)</option>
                    <option value={`Quý 2/${currentYear}`}>Thuế Quý 2/{currentYear} (Kê khai theo quý)</option>
                    <option value={`Quý 3/${currentYear}`}>Thuế Quý 3/{currentYear} (Kê khai theo quý)</option>
                    <option value={`Quý 4/${currentYear}`}>Thuế Quý 4/{currentYear} (Kê khai theo quý)</option>
                    <option value={`Quyết toán năm ${currentYear}`}>Quyết toán thuế TNCN năm {currentYear} (Hạn 31/03 năm sau)</option>
                    <option value="Truy thu / Nợ cũ">Truy thu / Nợ thuế các năm trước (≤ 2025)</option>
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

            {taxTreatment === 'DeductibleExpense' && (
              <div className="cb-form-group">
                <label className="cb-form-label">Số hoặc mã chứng từ *</label>
                <input className="cb-form-input" value={taxReferenceDocId} maxLength={100} onChange={(e) => setTaxReferenceDocId(e.target.value)} placeholder="Ví dụ: HD-000123" />
                <p className="cb-field-hint"><Info size={13} /> Bắt buộc để ghi nhận chi phí được trừ theo Điều 6 NĐ 68/2026.</p>
                {parsedAmount >= 5_000_000 && selectedAccount && selectedAccount.accountType !== 'BANK' && (
                  <div className="cb-overdraft-alert" role="alert" style={{ marginTop: 8 }}>
                    <span>⚠️</span>
                    <div>
                      <strong>Cảnh báo Điều 6 NĐ 68/2026:</strong> Khoản chi từ 5.000.000 đ trở lên thanh toán bằng tiền mặt sẽ <strong>KHÔNG được trừ</strong> khi tính thuế TNCN. Vui lòng chuyển sang <strong>Tài khoản Ngân hàng</strong> để đảm bảo chứng từ không dùng tiền mặt.
                    </div>
                  </div>
                )}
              </div>
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
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Ghi chú mục đích xuất chi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="cb-character-count">{description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>

            <a className="cb-context-link" href="/store-owner/expenses">Thanh toán điện, nước, mặt bằng? Mở Hóa đơn phải trả →</a>
          </div>

          <div className="cb-modal-footer">
            <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-payment"
              disabled={isSubmitting || isOverdraftViolation || parsedAmount <= 0}
            >
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận chi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
