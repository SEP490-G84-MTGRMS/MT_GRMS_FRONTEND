import { type FC, useState, useEffect } from 'react';
import {
  Zap,
  Droplets,
  Home,
  Users,
  Package,
  FileText,
  CheckCircle,
  Wrench,
} from 'lucide-react';
import { PlusIcon, CloseIcon, UploadIcon } from '../../admin/components';
import { employeeApi } from '../../employee/api/employeeApi';
import {
  EXPENSE_CATEGORY_LABELS,
  type CreateExpenseRequest,
  type ExpenseCategory,
  createExpenseSchema,
} from '../types/expense.types';
import { MoneyInput } from '../../../components/common/MoneyInput';
import { formatMoney } from '../../finance/utils/formatters';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateExpenseRequest) => Promise<void>;
  isSubmitting?: boolean;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string;
}

interface QuickOption {
  category: ExpenseCategory;
  vendorName: string;
  label: string;
  sub: string;
  icon: any;
  color: string;
  bg: string;
}

const QUICK_OPTIONS: QuickOption[] = [
  {
    category: 'Electricity',
    vendorName: 'Điện lực EVN',
    label: 'Tiền điện kho lạnh',
    sub: 'Điện kho lạnh bảo quản thực phẩm & chiếu sáng',
    icon: Zap,
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    category: 'Rent',
    vendorName: 'Chủ nhà cho thuê mặt bằng',
    label: 'Tiền thuê mặt bằng cửa hàng',
    sub: 'Tiền thuê mặt bằng cửa hàng định kỳ',
    icon: Home,
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    category: 'Maintenance',
    vendorName: 'Đơn vị cơ điện lạnh',
    label: 'Bảo trì tủ đông mát',
    sub: 'Bảo trì tủ đông mát, điều hòa quầy kệ',
    icon: Wrench,
    color: '#0F766E',
    bg: '#CCFBF1',
  },
  {
    category: 'Other',
    vendorName: 'Nhà cung cấp bao bì & ấn phẩm',
    label: 'Bao bì & Cuộn in bill',
    sub: 'Mua bao bì túi ni lông & cuộn in bill',
    icon: Package,
    color: '#475569',
    bg: '#F1F5F9',
  },
  {
    category: 'Water',
    vendorName: 'Công ty Cấp nước Sawaco',
    label: 'Tiền nước',
    sub: 'Nước sơ chế thực phẩm & vệ sinh quầy kệ',
    icon: Droplets,
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    category: 'Internet',
    vendorName: 'Nhà mạng Viettel / VNPT',
    label: 'Internet & Phần mềm',
    sub: 'Cáp quang POS & phần mềm bán lẻ',
    icon: Users,
    color: '#15803D',
    bg: '#DCFCE7',
  },
];

export const CreateExpenseModal: FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  branches,
  defaultBranchId,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'detail'>('quick');
  const [internalBranches, setInternalBranches] = useState<{ id: string; name: string }[]>([]);

  // Tự động tải danh sách chi nhánh nếu component cha không truyền xuống
  useEffect(() => {
    if (!branches || branches.length === 0) {
      let isMounted = true;
      employeeApi.getBranches().then((list) => {
        if (isMounted && list && list.length > 0) {
          setInternalBranches(list);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [branches]);

  const activeBranches = branches && branches.length > 0 ? branches : internalBranches;

  // Poka-yoke: Do NOT pre-select category. User must explicitly choose one.
  const [formData, setFormData] = useState(() => ({
    branchId: defaultBranchId || '',
    category: '' as unknown as ExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    vendorName: '',
    isRecurring: false,
    recurringDayOfMonth: 1,
    isTaxDeductible: true,
    invoiceNumber: '',
    sellerTaxCode: '',
    attachedBillUrl: '',
    note: '',
  }));

  // Cập nhật branchId nếu defaultBranchId hoặc danh sách chi nhánh sẵn sàng
  useEffect(() => {
    if (!formData.branchId && (defaultBranchId || activeBranches[0]?.id)) {
      setFormData((prev) => ({
        ...prev,
        branchId: defaultBranchId || activeBranches[0]?.id || '',
      }));
    }
  }, [defaultBranchId, activeBranches, formData.branchId]);

  const [attachMode, setAttachMode] = useState<'upload' | 'url'>('upload');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSelectQuick = (opt: QuickOption) => {
    setFormData((prev) => ({
      ...prev,
      category: opt.category,
      vendorName: opt.vendorName,
      note: `Thanh toán ${opt.label} (${opt.vendorName})`,
    }));
    if (errors.category) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.category;
        return next;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input target value để có thể chọn lại file cùng tên nếu muốn
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        attachedBillUrl: 'Kích thước tệp không được vượt quá 5MB theo giới hạn Cloudinary',
      }));
      return;
    }

    const fileSizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setIsUploadingImage(true);
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.attachedBillUrl;
      return updated;
    });

    try {
      // Tải hình ảnh hóa đơn lên Cloudinary lưu trữ an toàn, nhận về đường dẫn HTTPS
      const secureUrl = await uploadImageToCloudinary(file, 'mtgrms/expenses');
      setFormData((prev) => ({ ...prev, attachedBillUrl: secureUrl }));
      setUploadedFile({ name: file.name, size: fileSizeStr });
    } catch (uploadErr: unknown) {
      const err = uploadErr as { message?: string };
      setErrors((prev) => ({
        ...prev,
        attachedBillUrl: err?.message || 'Không thể tải ảnh chứng từ lên Cloudinary',
      }));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, attachedBillUrl: '' }));
    setUploadedFile(null);
  };

  const handleChange = (field: string, value: any) => {
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

    if (!formData.category) {
      setErrors((prev) => ({ ...prev, category: 'Vui lòng bấm chọn một danh mục chi phí' }));
      return;
    }

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
        isTaxDeductible: formData.isTaxDeductible,
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        sellerTaxCode: formData.sellerTaxCode.trim() || undefined,
        attachedBillUrl: formData.attachedBillUrl.trim() || undefined,
        note: formData.note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Submit expense failed:', err);
    }
  };

  const parsedAmount = Number(formData.amount) || 0;
  const isFormValid = Boolean(formData.category && parsedAmount > 0 && formData.vendorName);

  return (
    <div className="expense-modal-backdrop" onClick={onClose}>
      <div
        className="expense-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Header - Cleaned of banned strings */}
        <div className="expense-modal-header">
          <div className="expense-modal-title">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--brand-50, #F0FDFA)',
                color: 'var(--brand-700, #115E59)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlusIcon size={18} color="currentColor" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Ghi nhận chi phí vận hành
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                Hạch toán hóa đơn thanh toán cho nhà cung cấp hoặc dịch vụ
              </p>
            </div>
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

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC',
            padding: '0 24px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeTab === 'quick' ? '2px solid #0F766E' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === 'quick' ? 800 : 600,
              color: activeTab === 'quick' ? '#0F766E' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem',
            }}
          >
            <Zap size={16} />
            <span>⚡ Chọn nhanh danh mục (6 ô lớn)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            style={{
              padding: '12px 18px',
              border: 'none',
              borderBottom: activeTab === 'detail' ? '2px solid #0F766E' : '2px solid transparent',
              background: 'none',
              fontWeight: activeTab === 'detail' ? 800 : 600,
              color: activeTab === 'detail' ? '#0F766E' : '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem',
            }}
          >
            <FileText size={16} />
            <span>Kê khai hóa đơn chi tiết</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="expense-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {activeTab === 'quick' ? (
              <div>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748B' }}>
                  Bấm chọn 1 trong 6 danh mục để ghi nhận chi phí (chống nhầm lẫn):
                </p>

                {errors.category && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#B91C1C',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '12px',
                    }}
                  >
                    ⚠️ {errors.category}
                  </div>
                )}

                {/* 6 Big Icons Grid (112x112px equivalent responsive touch targets) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {QUICK_OPTIONS.map((opt) => {
                    const isSelected = formData.category === opt.category;
                    const IconComp = opt.icon;

                    return (
                      <button
                        key={opt.category}
                        type="button"
                        onClick={() => handleSelectQuick(opt)}
                        style={{
                          minHeight: '112px',
                          borderRadius: '16px',
                          border: isSelected ? `2.5px solid ${opt.color}` : '1.5px solid #E2E8F0',
                          background: isSelected ? opt.bg : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px 8px',
                          gap: 6,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          transform: isSelected ? 'scale(1.02)' : 'none',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            background: isSelected ? '#ffffff' : opt.bg,
                            color: opt.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconComp size={24} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E293B' }}>
                          {opt.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#64748B',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Detail Summary */}
                {formData.category ? (
                  <div
                    style={{
                      background: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      borderRadius: 14,
                      padding: '12px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: '#0F766E' }}>Khoản chi đã chọn:</span>
                      <strong style={{ color: '#134E4A' }}>
                        {EXPENSE_CATEGORY_LABELS[formData.category] || formData.category}
                      </strong>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span style={{ color: '#0F766E' }}>Đơn vị thụ hưởng:</span>
                      <strong style={{ color: '#115E59' }}>{formData.vendorName}</strong>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      borderRadius: 14,
                      padding: '12px 16px',
                      marginBottom: 16,
                      textAlign: 'center',
                      color: '#64748B',
                      fontSize: '0.82rem',
                    }}
                  >
                    👉 Hãy bấm chọn một danh mục ở trên để tiếp tục
                  </div>
                )}

                {/* MoneyInput */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Số tiền chi (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <MoneyInput
                    value={parsedAmount}
                    onChange={(val) => handleChange('amount', String(val))}
                    placeholder="Nhập số tiền chi thực tế..."
                  />
                  {errors.amount && <p className="form-error">{errors.amount}</p>}
                </div>

                {/* Note */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ghi chú diễn giải</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => handleChange('note', e.target.value)}
                    placeholder="VD: Tiền điện sinh hoạt tháng 10 cửa hàng..."
                    className="form-input"
                  />
                </div>
              </div>
            ) : (
              <div>
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
                      {activeBranches.length === 0 && (
                        <option value="">-- Đang tải chi nhánh... --</option>
                      )}
                      {activeBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
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
                      <option value="">-- Chọn danh mục --</option>
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
                  <MoneyInput
                    value={parsedAmount}
                    onChange={(val) => handleChange('amount', String(val))}
                    placeholder="VD: 1500000"
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

                {/* Tax Classification & Invoice Info (Một sổ hai góc nhìn - TT152) */}
                <div
                  style={{
                    background: formData.isTaxDeductible ? '#F0FDFA' : '#FFFBEB',
                    border: formData.isTaxDeductible ? '1px solid #CCFBF1' : '1px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: formData.isTaxDeductible ? '#115E59' : '#92400E',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isTaxDeductible}
                      onChange={(e) => handleChange('isTaxDeductible', e.target.checked)}
                    />
                    <span>
                      {formData.isTaxDeductible
                        ? 'Chi phí hợp lệ được trừ thuế (Có hóa đơn/chứng từ SXKD)'
                        : 'Khoản chi nội bộ / Không hợp lệ trừ thuế (Blacklist)'}
                    </span>
                  </label>
                  {formData.isTaxDeductible && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        marginTop: '10px',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Số hóa đơn (VD: HD00123)"
                        value={formData.invoiceNumber}
                        onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                        className="form-input"
                        style={{ height: '36px', fontSize: '0.78rem' }}
                      />
                      <input
                        type="text"
                        placeholder="MST người bán (VD: 0301234567)"
                        value={formData.sellerTaxCode}
                        onChange={(e) => handleChange('sellerTaxCode', e.target.value)}
                        className="form-input"
                        style={{ height: '36px', fontSize: '0.78rem' }}
                      />
                    </div>
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
                              {uploadedFile?.size || 'Ảnh chứng từ Cloudinary'}
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
                      ) : isUploadingImage ? (
                        <div className="expense-upload-dropzone" style={{ cursor: 'wait', padding: '24px 16px' }}>
                          <div className="expense-upload-spinner" />
                          <span className="expense-upload-dropzone-text" style={{ color: '#0F766E', fontWeight: 600 }}>
                            Đang tải ảnh lên Cloudinary... Vui lòng chờ
                          </span>
                        </div>
                      ) : (
                        <label className="expense-upload-dropzone">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                          />
                          <UploadIcon size={24} color="#0F766E" />
                          <span className="expense-upload-dropzone-text">
                            Kéo thả hoặc <strong>chọn ảnh hóa đơn</strong> (Cloudinary)
                          </span>
                        </label>
                      )}
                    </>
                  ) : (
                    <input
                      type="url"
                      placeholder="https://example.com/hoa-don.pdf"
                      value={formData.attachedBillUrl}
                      onChange={(e) => handleChange('attachedBillUrl', e.target.value)}
                      className="form-input"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer - Safe distance >= 24px between Cancel and Confirm */}
          <div
            className="expense-modal-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary-pill"
              style={{
                minWidth: '100px',
                height: '44px',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage || !isFormValid}
              className="btn-primary-pill"
              style={{
                minWidth: '160px',
                height: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: isFormValid && !isUploadingImage ? 'var(--brand-700, #115E59)' : '#CBD5E1',
                cursor: isFormValid && !isUploadingImage ? 'pointer' : 'not-allowed',
                fontWeight: 700,
              }}
            >
              <CheckCircle size={18} />
              <span>
                {isUploadingImage
                  ? 'Đang tải ảnh...'
                  : isSubmitting
                  ? 'Đang lưu...'
                  : parsedAmount > 0
                  ? `Chi ${formatMoney(parsedAmount)}`
                  : 'Ghi nhận chi phí'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
