import { isAxiosError } from 'axios';
import { mapProblemDetailsToVietnamese } from '../../../api/problemDetailsMapper';
import { useCashbookSubmissionKey } from '../hooks/useCashbookSubmissionKey';
import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, Info, X } from 'lucide-react';
import type { CashAccount, CashbookTaxTreatment, CreateReceiptDTO, CounterpartyType } from '../types/cashbook.types';

interface CreateReceiptModalProps {
  isOpen: boolean;
  accounts: CashAccount[];
  onClose: () => void;
  onSubmit: (dto: CreateReceiptDTO, idempotencyKey: string) => Promise<void>;
  initialCategory?: string;
}

const MAX_DESCRIPTION_LENGTH = 255;
const RECEIPT_CATEGORIES = [
  { code: 'OWNER_DEPOSIT', label: 'Chủ nạp thêm vốn', treatment: 'NonTaxableReceipt' as const },
  { code: 'OFF_POS_SALE', label: 'Thu bán hàng ngoài POS', treatment: 'TaxableRevenue' as const },
  { code: 'INTERNAL_REIMBURSEMENT', label: 'Hoàn ứng nội bộ', treatment: 'NonTaxableReceipt' as const },
  { code: 'BANK_INTEREST', label: 'Thu lãi tiền gửi ngân hàng', treatment: 'TaxableRevenue' as const },
  { code: 'OTHER_INCOME', label: 'Thu nhập khác', treatment: null },
];

export const CreateReceiptModal: FC<CreateReceiptModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  initialCategory,
}) => {
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(initialCategory || RECEIPT_CATEGORIES[0].label);
  const [taxTreatment, setTaxTreatment] = useState<CashbookTaxTreatment>('NonTaxableReceipt');
  const [taxTreatmentReason, setTaxTreatmentReason] = useState('');
  const [counterpartyType, setCounterpartyType] = useState<CounterpartyType>('CUSTOMER');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getSubmissionKey = useCashbookSubmissionKey(isOpen);

  const applyCategoryDefaults = (cat: string) => {
    setCategory(cat);
    const option = RECEIPT_CATEGORIES.find((item) => item.label === cat);
    setTaxTreatment(option?.treatment || 'ReviewRequired');
    setTaxTreatmentReason('');
    if (cat.includes('nạp thêm vốn')) {
      setCounterpartyType('OTHER');
      setCounterpartyName('Chủ hộ kinh doanh');
      setDescription('Bổ sung vốn kinh doanh vào quỹ (Không tính thuế)');
      const safeOrBank = accounts.find((a) => a.isSafeDeposit || a.accountType === 'BANK') || accounts[0];
      if (safeOrBank) setAccountId(safeOrBank.id);
    } else if (cat.includes('bán hàng') || cat.includes('bán lẻ')) {
      setCounterpartyType('CUSTOMER');
      setCounterpartyName('');
      setDescription('Thu tiền bán hàng ngoài POS');
    } else if (cat.includes('Thu lãi')) {
      setCounterpartyType('OTHER');
      setCounterpartyName('Ngân hàng');
      setDescription('Thu lãi tiền gửi không kỳ hạn');
    } else {
      setCounterpartyType('CUSTOMER');
      setCounterpartyName('');
      setDescription('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setErrorMsg('');
      const targetCat = RECEIPT_CATEGORIES.some((item) => item.label === initialCategory)
        ? initialCategory!
        : RECEIPT_CATEGORIES[0].label;
      applyCategoryDefaults(targetCat);
    }
  }, [isOpen, initialCategory, accounts]);

  if (!isOpen) return null;

  // Single-source Debt Collection (FE-08) rule: Excludes "Thu nợ khách hàng" to avoid off-book discrepancy
  const selectedCategory = RECEIPT_CATEGORIES.find((item) => item.label === category)!;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    const parsedAmount = Number(amountStr.replace(/\D/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thu lớn hơn 0');
      return;
    }

    if (!counterpartyName.trim()) {
      setErrorMsg('Vui lòng nhập tên người nộp tiền');
      return;
    }

    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      setErrorMsg(`Diễn giải không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự`);
      return;
    }
    if (selectedCategory.code === 'OTHER_INCOME' && taxTreatment === 'ReviewRequired') {
      setErrorMsg('Vui lòng chọn cách xử lý thuế cho khoản thu nhập khác');
      return;
    }
    if (taxTreatment === 'NonTaxableReceipt' && selectedCategory.code === 'OTHER_INCOME' && !taxTreatmentReason.trim()) {
      setErrorMsg('Khoản thu không tính thuế bắt buộc có lý do');
      return;
    }

    try {
      setIsSubmitting(true);
      const dto: CreateReceiptDTO = {
        accountId,
        amount: parsedAmount,
        category,
        counterpartyType,
        counterpartyName: counterpartyName.trim(),
        description: description.trim() || 'Thu tiền vào quỹ',
        categoryCode: selectedCategory.code,
        taxTreatment,
        taxTreatmentReason: taxTreatmentReason.trim() || undefined,
      };
      await onSubmit(dto, getSubmissionKey(dto));
      onClose();
    } catch (err: unknown) {
      setErrorMsg(isAxiosError(err) ? mapProblemDetailsToVietnamese(err) : err instanceof Error ? err.message : 'Lỗi khi lưu phiếu thu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div className="cb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cb-modal-header cb-modal-header--receipt">
          <div className="cb-modal-heading">
            <span className="cb-modal-icon"><ArrowDownToLine size={20} /></span>
            <div><h2 className="cb-modal-title">Lập phiếu thu</h2><p className="cb-modal-subtitle">Ghi nhận tiền vào quỹ hoặc tài khoản</p></div>
          </div>
          <button type="button" className="cb-modal-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="cb-modal-body">
            {errorMsg && (
              <div className="cb-overdraft-alert" role="alert">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <div className="cb-form-group">
              <label className="cb-form-label">Tài khoản nhận tiền *</label>
              <select
                className="cb-form-select"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.currentBalance.toLocaleString('vi-VN')} đ)
                  </option>
                ))}
              </select>
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Số tiền thu (VNĐ) *</label>
              <input
                type="text"
                className="cb-form-input"
                placeholder="Ví dụ: 1.500.000"
                value={amountStr ? Number(amountStr.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChange={(e) => setAmountStr(e.target.value)}
                required
              />
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Danh mục thu *</label>
              <select
                className="cb-form-select"
                value={category}
                onChange={(e) => applyCategoryDefaults(e.target.value)}
              >
                {RECEIPT_CATEGORIES.map((item) => (
                  <option key={item.code} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
              {selectedCategory.code === 'OTHER_INCOME' ? (
                <div className="cb-tax-choice" role="group" aria-label="Xử lý thuế">
                  <span className="cb-tax-choice__label">Xử lý thuế *</span>
                  <label><input type="radio" name="receipt-tax" checked={taxTreatment === 'TaxableRevenue'} onChange={() => setTaxTreatment('TaxableRevenue')} /> Tính vào doanh thu chịu thuế</label>
                  <label><input type="radio" name="receipt-tax" checked={taxTreatment === 'NonTaxableReceipt'} onChange={() => setTaxTreatment('NonTaxableReceipt')} /> Không tính thuế</label>
                  {taxTreatment === 'NonTaxableReceipt' && <input className="cb-form-input" value={taxTreatmentReason} maxLength={255} onChange={(e) => setTaxTreatmentReason(e.target.value)} placeholder="Lý do: tiền vay, thu hộ, hoàn tiền..." />}
                </div>
              ) : (
                <p className="cb-field-hint"><Info size={13} /> {taxTreatment === 'TaxableRevenue' ? 'Khoản thu được tính vào doanh thu chịu thuế.' : 'Khoản thu không tính vào doanh thu chịu thuế.'}</p>
              )}
            </div>

            <div className="cb-form-group">
              <label className="cb-form-label">Đối tượng nộp tiền *</label>
              <div className="cb-counterparty-fields">
                <select
                  className="cb-form-select"
                  value={counterpartyType}
                  onChange={(e) => setCounterpartyType(e.target.value as CounterpartyType)}
                >
                  <option value="CUSTOMER">Khách hàng</option>
                  <option value="OTHER">Chủ tiệm / Khác</option>
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="SUPPLIER">Nhà cung cấp</option>
                </select>
                <input
                  type="text"
                  className="cb-form-input"
                  placeholder="Nhập họ tên / đơn vị nộp..."
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="button" className="cb-context-link" onClick={() => { onClose(); navigate('/store-owner/customers'); }}>
              Thu nợ khách hàng? Thực hiện tại Sổ công nợ →
            </button>

            <div className="cb-form-group">
              <label className="cb-form-label">Diễn giải lý do thu</label>
              <textarea
                className="cb-form-textarea"
                rows={2}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Ghi chú nội dung nộp tiền..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <span className="cb-character-count">{description.length}/{MAX_DESCRIPTION_LENGTH}</span>
            </div>
          </div>

          <div className="cb-modal-footer">
            <button type="button" className="cb-btn cb-btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="cb-btn cb-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu phiếu thu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
