import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { X, Inbox, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import type { TriageItem } from '../types/cashbook.types';
import { cashbookService } from '../services/cashbookService';
import { formatMoney } from '../../finance/utils/formatters';

interface TriageInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  onSuccess: (message: string) => void;
}

export const TriageInboxModal: FC<TriageInboxModalProps> = ({
  isOpen,
  onClose,
  branchId,
  onSuccess,
}) => {
  const [items, setItems] = useState<TriageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);

  // Resolution form state (Backend FinancialNature: 1 = OperatingExpense, 5 = OwnerDraw)
  const [nature, setNature] = useState<number>(1);
  const [isTaxDeductible, setIsTaxDeductible] = useState<boolean>(true);
  const [category, setCategory] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTriageItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await cashbookService.getPendingTriage(branchId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load triage inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (isOpen) {
      loadTriageItems();
      setSelectedItem(null);
      setError(null);
    }
  }, [isOpen, loadTriageItems]);

  const handleSelectItem = (item: TriageItem) => {
    setSelectedItem(item);
    setCategory(item.category || 'Chi phí vận hành');
    setNature(1); // Default FinancialNature.OperatingExpense = 1
    setIsTaxDeductible(true);
    setResolutionNote(`Chủ cửa hàng duyệt mục ${item.voucherCode}`);
    setError(null);
  };

  const handleResolve = async () => {
    if (!selectedItem) return;
    if (!resolutionNote.trim()) {
      setError('Bắt buộc phải nhập ghi chú giải trình khi phê duyệt.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await cashbookService.resolveTriage(selectedItem.id, {
        nature,
        isTaxDeductible,
        category: category.trim(),
        resolutionNote: resolutionNote.trim(),
      });

      onSuccess(`Đã xử lý và phân loại thành công mục ${selectedItem.voucherCode}`);
      setSelectedItem(null);
      await loadTriageItems();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi khi xử lý mục trong Triage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatTriageStatus = (status: string): string => {
    switch (status) {
      case 'Unresolved':
        return 'Chờ phân loại';
      case 'PendingApproval':
        return 'Chờ duyệt';
      case 'Approved':
        return 'Đã duyệt';
      default:
        return status;
    }
  };

  return (
    <div className="cb-modal-backdrop" onClick={onClose}>
      <div
        className="cb-modal-container"
        style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="cb-modal-header"
          style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
        >
          <div className="cb-modal-heading">
            <span className="cb-modal-icon" style={{ background: '#F59E0B', color: '#FFFFFF' }}>
              <Inbox size={20} />
            </span>
            <div>
              <h3 className="cb-modal-title">
                Triage Inbox · Xử lý các khoản cần Chủ duyệt
              </h3>
              <p className="cb-modal-subtitle">
                Bao gồm các khoản chi vượt trần ca 500k, chi mục không rõ, chờ phân loại chính thức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cb-modal-close-btn"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="cb-modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading && (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              Đang tải danh sách chờ xử lý...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div style={{ padding: '48px 16px', textAlign: 'center', border: '2px dashed #E2E8F0', borderRadius: 16 }}>
              <ShieldCheck style={{ margin: '0 auto 8px', color: '#10B981' }} size={36} />
              <p style={{ fontWeight: 700, color: '#1E293B', fontSize: 14, margin: '0 0 4px' }}>Triage Inbox trống!</p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                Không có khoản chi nào bị treo hoặc vượt hạn mức cần chủ duyệt.
              </p>
            </div>
          )}

          {/* Selected Item Resolution Box */}
          {selectedItem && (
            <div style={{ padding: 18, borderRadius: 14, border: '2px solid #F59E0B', background: '#FFFBEB', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>
                    Phê duyệt phân loại mục
                  </span>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '6px 0 2px' }}>
                    {selectedItem.voucherCode} · {formatMoney(selectedItem.amount)}
                  </h4>
                  <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                    Người nhận: {selectedItem.beneficiaryName} · Lý do cờ: {selectedItem.suspiciousReason || 'Chờ phân loại'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="cb-btn cb-btn-outline"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  Đóng
                </button>
              </div>

              {error && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#BE123C', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10, borderTop: '1px solid #FDE68A' }}>
                <div>
                  <label className="cb-form-label">1. Chọn bản chất tài chính chính thức *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNature(1);
                        setIsTaxDeductible(true);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: nature === 1 ? '2px solid #0F766E' : '1px solid #E2E8F0',
                        background: nature === 1 ? '#F0FDFA' : '#FFFFFF',
                        color: nature === 1 ? '#134E4A' : '#334155',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: nature === 1 ? 700 : 500,
                        fontSize: 12,
                      }}
                    >
                      Chi phí vận hành (OPEX)
                      <span style={{ display: 'block', fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 400 }}>
                        Tính vào chi phí trừ thuế P&amp;L
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNature(5);
                        setIsTaxDeductible(false);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        border: nature === 5 ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                        background: nature === 5 ? '#EEF2FF' : '#FFFFFF',
                        color: nature === 5 ? '#312E81' : '#334155',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: nature === 5 ? 700 : 500,
                        fontSize: 12,
                      }}
                    >
                      Vốn chủ sở hữu (Rút vốn)
                      <span style={{ display: 'block', fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 400 }}>
                        0% thuế &amp; 0% chi phí P&amp;L
                      </span>
                    </button>
                  </div>
                </div>

                <div className="cb-form-group" style={{ marginBottom: 0 }}>
                  <label className="cb-form-label">2. Hạng mục chi phí *</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="cb-form-input"
                  />
                </div>

                <div className="cb-form-group" style={{ marginBottom: 0 }}>
                  <label className="cb-form-label">3. Ghi chú giải trình của Chủ *</label>
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="VD: Chủ đồng ý duyệt chi khẩn cấp..."
                    className="cb-form-input"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isSubmitting}
                  className="cb-btn cb-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#D97706', borderColor: '#D97706', color: '#FFFFFF' }}
                >
                  <CheckCircle size={16} />
                  <span>{isSubmitting ? 'Đang duyệt...' : 'Phê duyệt & Phân loại chính thức'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of triage items */}
          {!isLoading && items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: selectedItem?.id === item.id ? '1.5px solid #F59E0B' : '1px solid #E2E8F0',
                    background: selectedItem?.id === item.id ? '#FFFBEB' : '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{item.voucherCode}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>
                          {formatTriageStatus(item.status)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#334155', fontWeight: 500, margin: '4px 0 0' }}>
                        Người nhận: {item.beneficiaryName} · Hạng mục tạm: {item.category}
                      </p>
                      {item.suspiciousReason && (
                        <p style={{ fontSize: 12, color: '#E11D48', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                          <AlertTriangle size={14} />
                          <span>{item.suspiciousReason}</span>
                        </p>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', display: 'block' }}>
                        {formatMoney(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className="cb-btn cb-btn-primary"
                        style={{ marginTop: 8, padding: '6px 12px', fontSize: 12, background: '#F59E0B', borderColor: '#F59E0B', color: '#FFFFFF' }}
                      >
                        Xử lý ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
