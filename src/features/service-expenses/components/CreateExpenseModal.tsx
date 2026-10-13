import { type FC, useState } from 'react';
import { PlusIcon, CloseIcon, UploadIcon } from '../../admin/components';
import {
  EXPENSE_CATEGORY_LABELS,
  type CreateExpenseRequest,
  type ExpenseCategory,
  createExpenseSchema,
} from '../types/expense.types';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export const CreateExpenseModal: FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => ({
    branchId: 'BR-01',
    category: 'Electricity' as ExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    vendorName: '',
    attachedBillUrl: '',
    note: '',
  }));

  const [attachMode, setAttachMode] = useState<'upload' | 'url'>('upload');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        attachedBillUrl: 'Kích thước tệp không được vượt quá 10MB',
      }));
      return;
    }

    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, attachedBillUrl: result }));
      setUploadedFile({ name: file.name, size: fileSizeStr });
      if (errors.attachedBillUrl) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.attachedBillUrl;
          return updated;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, attachedBillUrl: '' }));
    setUploadedFile(null);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(formData.amount);
    const result = createExpenseSchema.safeParse({
      ...formData,
      amount: parsedAmount,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit({
        branchId: formData.branchId,
        category: formData.category,
        amount: parsedAmount,
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate,
        vendorName: formData.vendorName.trim(),
        attachedBillUrl: formData.attachedBillUrl.trim() || undefined,
        note: formData.note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Submit expense failed:', err);
    }
  };

  return (
    <div className="expense-modal-backdrop" onClick={onClose}>
      <div className="expense-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="expense-modal-header">
          <div className="expense-modal-title">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--blue-light, #f0f6ff)',
                color: 'var(--blue-primary, #0066ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlusIcon size={16} color="currentColor" />
            </div>
            <h3>Ghi nhận chi phí vận hành mới</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="Đóng cửa sổ"
          >
            <CloseIcon size={16} color="currentColor" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="expense-modal-body">
            {/* Branch & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  Chi nhánh <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => handleChange('branchId', e.target.value)}
                  className={`form-select ${errors.branchId ? 'error' : ''}`}
                >
                  <option value="BR-01">Quận 1 (Trụ sở)</option>
                  <option value="BR-02">Bình Thạnh</option>
                  <option value="BR-03">Thủ Đức</option>
                </select>
                {errors.branchId && <p className="form-error">{errors.branchId}</p>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Danh mục chi phí <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={`form-select ${errors.category ? 'error' : ''}`}
                >
                  {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {EXPENSE_CATEGORY_LABELS[cat]}
                      </option>
                    )
                  )}
                </select>
                {errors.category && <p className="form-error">{errors.category}</p>}
              </div>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">
                Số tiền chi phí (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                placeholder="VD: 1500000"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className={`form-input ${errors.amount ? 'error' : ''}`}
              />
              {errors.amount && <p className="form-error">{errors.amount}</p>}
            </div>

            {/* Expense Date & Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  Ngày hóa đơn <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => handleChange('expenseDate', e.target.value)}
                  className={`form-input ${errors.expenseDate ? 'error' : ''}`}
                />
                {errors.expenseDate && (
                  <p className="form-error">{errors.expenseDate}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Hạn thanh toán <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className={`form-input ${errors.dueDate ? 'error' : ''}`}
                />
                {errors.dueDate && <p className="form-error">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Vendor */}
            <div className="form-group">
              <label className="form-label">
                Nhà cung cấp / Đơn vị thụ hưởng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Điện lực TP.HCM (EVN), SAWACO, VNPT..."
                value={formData.vendorName}
                onChange={(e) => handleChange('vendorName', e.target.value)}
                className={`form-input ${errors.vendorName ? 'error' : ''}`}
              />
              {errors.vendorName && (
                <p className="form-error">{errors.vendorName}</p>
              )}
            </div>

            {/* Bill Attachment / Upload */}
            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}
              >
                <label className="form-label">Chứng từ / Hóa đơn đính kèm</label>
                <div className="expense-attach-tabs">
                  <button
                    type="button"
                    className={`expense-attach-tab-btn ${attachMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setAttachMode('upload')}
                  >
                    Tải tệp lên
                  </button>
                  <button
                    type="button"
                    className={`expense-attach-tab-btn ${attachMode === 'url' ? 'active' : ''}`}
                    onClick={() => setAttachMode('url')}
                  >
                    Nhập link
                  </button>
                </div>
              </div>

              {attachMode === 'upload' ? (
                <>
                  {formData.attachedBillUrl ? (
                    <div className="expense-upload-preview-box">
                      <img
                        src={formData.attachedBillUrl}
                        alt="Hóa đơn"
                        className="expense-upload-preview-img"
                      />
                      <div className="expense-upload-file-meta">
                        <span className="expense-upload-file-name">
                          {uploadedFile?.name || 'chung_tu_hoa_don.png'}
                        </span>
                        <span className="expense-upload-file-size">
                          {uploadedFile?.size || 'Ảnh chứng từ đã tải lên'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="expense-upload-remove-btn"
                        onClick={handleRemoveFile}
                      >
                        Xóa tệp
                      </button>
                    </div>
                  ) : (
                    <label className="expense-upload-dropzone">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <div style={{ color: 'var(--blue-primary, #0066ff)' }}>
                        <UploadIcon size={24} color="currentColor" />
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        Nhấn để tải lên hoặc kéo thả tệp tại đây
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Hỗ trợ JPG, PNG, WEBP, PDF (Tối đa 10MB)
                      </div>
                    </label>
                  )}
                </>
              ) : (
                <div>
                  <input
                    type="url"
                    placeholder="https://example.com/hoa-don.jpg"
                    value={
                      formData.attachedBillUrl.startsWith('data:')
                        ? ''
                        : formData.attachedBillUrl
                    }
                    onChange={(e) => {
                      setUploadedFile(null);
                      handleChange('attachedBillUrl', e.target.value);
                    }}
                    className={`form-input ${errors.attachedBillUrl ? 'error' : ''}`}
                  />
                  {formData.attachedBillUrl &&
                    !formData.attachedBillUrl.startsWith('data:') && (
                      <div
                        style={{
                          marginTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <img
                          src={formData.attachedBillUrl}
                          alt="Preview"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid #e2e8f0',
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Ảnh xem trước từ link
                        </span>
                      </div>
                    )}
                </div>
              )}

              {errors.attachedBillUrl && (
                <p className="form-error">{errors.attachedBillUrl}</p>
              )}
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Ghi chú thêm</label>
              <textarea
                rows={2}
                placeholder="Ghi chú chi tiết cho khoản chi này..."
                value={formData.note}
                onChange={(e) => handleChange('note', e.target.value)}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="expense-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary-pill"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary-pill"
            >
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu chi phí'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
