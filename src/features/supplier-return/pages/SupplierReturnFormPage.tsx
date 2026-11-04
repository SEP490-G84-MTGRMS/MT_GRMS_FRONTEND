import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Send, AlertCircle, FileText } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { EligibleGrnLookup, GrnReturnableLine } from '../types/supplierReturn.types';
import { supplierReturnApi } from '../api/supplierReturnApi';
import '../../purchase-order/purchase-order.css';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const RETURN_REASONS = [
  'Hàng sắp hết hạn (Date cận < 30 ngày)',
  'Hàng hư hỏng / Lỗi chất lượng',
  'Sai quy cách đóng gói',
  'Hàng tồn đọng thỏa thuận thu hồi',
  'Khác',
];

export const SupplierReturnFormPage: FC = () => {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const userBranchId = useAuthStore((s) => s.user?.branchId);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;
  const lockedBranch = !isStoreOwner && userBranchId ? userBranchId : '';

  const [branchId, setBranchId] = useState(lockedBranch || 'BR-01');
  const [selectedGrnId, setSelectedGrnId] = useState('');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [reasonNotes, setReasonNotes] = useState('');
  const [eligibleGrns, setEligibleGrns] = useState<EligibleGrnLookup[]>([]);
  const [grnLines, setGrnLines] = useState<GrnReturnableLine[]>([]);
  const [lineQuantities, setLineQuantities] = useState<Record<string, number>>({});
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({});
  const [isLoadingGrns, setIsLoadingGrns] = useState(false);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch eligible completed GRNs
  useEffect(() => {
    let isMounted = true;
    setIsLoadingGrns(true);
    supplierReturnApi
      .getEligibleGrns(branchId)
      .then((grns) => {
        if (!isMounted) return;
        setEligibleGrns(grns);
        if (grns.length > 0 && !selectedGrnId) {
          setSelectedGrnId(grns[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingGrns(false);
      });

    return () => {
      isMounted = false;
    };
  }, [branchId]);

  // When selected GRN changes, fetch returnable lines
  useEffect(() => {
    if (!selectedGrnId) {
      setGrnLines([]);
      setLineQuantities({});
      return;
    }

    let isMounted = true;
    setIsLoadingLines(true);
    supplierReturnApi
      .getGrnReturnableLines(selectedGrnId)
      .then((lines) => {
        if (!isMounted) return;
        setGrnLines(lines);
        const initQty: Record<string, number> = {};
        lines.forEach((l) => {
          initQty[l.goodsReceiptLineId] = 0;
        });
        setLineQuantities(initQty);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingLines(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGrnId]);

  const activeGrn = useMemo(() => {
    return eligibleGrns.find((g) => g.id === selectedGrnId);
  }, [eligibleGrns, selectedGrnId]);

  // Calculations & Validations
  const totalItemsSelected = useMemo(() => {
    return Object.values(lineQuantities).filter((q) => q > 0).length;
  }, [lineQuantities]);

  const totalRequestedQty = useMemo(() => {
    return Object.values(lineQuantities).reduce((sum, q) => sum + (q || 0), 0);
  }, [lineQuantities]);

  const totalEstimatedAmount = useMemo(() => {
    return grnLines.reduce((sum, line) => {
      const q = lineQuantities[line.goodsReceiptLineId] || 0;
      return sum + q * line.unitCost;
    }, 0);
  }, [grnLines, lineQuantities]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedGrnId) {
      errors.push('Vui lòng chọn phiếu nhập kho gốc đã hoàn tất (COMPLETED).');
    }

    let hasSelected = false;
    grnLines.forEach((line) => {
      const q = lineQuantities[line.goodsReceiptLineId] || 0;
      if (q > 0) {
        hasSelected = true;
        if (q > line.availableReturnQty) {
          errors.push(
            `Số lượng yêu cầu trả (${q}) của sản phẩm '${line.productName}' vượt quá số lượng còn được phép trả (${line.availableReturnQty}).`
          );
        }
      }
    });

    if (!hasSelected && grnLines.length > 0) {
      errors.push('Vui lòng nhập số lượng trả > 0 cho ít nhất 1 dòng sản phẩm.');
    }

    return errors;
  }, [selectedGrnId, grnLines, lineQuantities]);

  const handleSubmit = async (submitImmediately: boolean) => {
    setErrorMsg('');
    if (validationErrors.length > 0) {
      setErrorMsg(validationErrors[0]);
      return;
    }

    const linesPayload = grnLines
      .filter((l) => (lineQuantities[l.goodsReceiptLineId] || 0) > 0)
      .map((l) => ({
        productId: l.productId,
        goodsReceiptLineId: l.goodsReceiptLineId,
        batchCode: l.batchCode,
        expiryDate: l.expiryDate,
        requestedQty: lineQuantities[l.goodsReceiptLineId] || 0,
        unitCost: l.unitCost,
        notes: lineNotes[l.goodsReceiptLineId],
      }));

    try {
      setIsSubmitting(true);
      const created = await supplierReturnApi.create({
        goodsReceiptId: selectedGrnId,
        supplierId: activeGrn?.supplierId || '',
        branchId,
        reason,
        reasonNotes: reasonNotes.trim() || undefined,
        submitImmediately,
        lines: linesPayload,
      });

      navigate(`/store-owner/supplier-returns/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo phiếu trả hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'auto',
        padding: '0 4px 24px',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={() => navigate('/store-owner/supplier-returns')}
            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Lập phiếu trả hàng nhà cung cấp (RTV)
            </h1>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Khởi tạo yêu cầu trả hàng từ phiếu nhập kho gốc đã hoàn tất
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 34, padding: '0 14px' }}
            onClick={() => navigate('/store-owner/supplier-returns')}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            disabled={isSubmitting || validationErrors.length > 0}
            onClick={() => handleSubmit(false)}
          >
            <Save size={14} />
            <span>Lưu nháp (DRAFT)</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{
              height: 34,
              padding: '0 16px',
              backgroundColor: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            disabled={isSubmitting || validationErrors.length > 0}
            onClick={() => handleSubmit(true)}
          >
            <Send size={14} />
            <span>Gửi yêu cầu trả hàng</span>
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {errorMsg && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 14,
        }}
      >
        {/* Branch */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Chi nhánh xuất trả: <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={branchId}
            disabled={Boolean(lockedBranch)}
            onChange={(e) => setBranchId(e.target.value)}
            style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
          >
            <option value="BR-01">BR-01 Main Store</option>
            <option value="BR-02">BR-02 Thu Duc Hub</option>
          </select>
        </div>

        {/* Completed GRN Selection */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Phiếu nhập kho gốc (GRN): <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={selectedGrnId}
            onChange={(e) => setSelectedGrnId(e.target.value)}
            disabled={isLoadingGrns}
            style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #0d9488', padding: '0 10px', fontSize: 13, fontWeight: 600, color: '#0f766e' }}
          >
            {eligibleGrns.length === 0 ? (
              <option value="">{isLoadingGrns ? 'Đang tải...' : 'Không có phiếu nhập hoàn tất'}</option>
            ) : (
              eligibleGrns.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} — {g.supplierName} ({new Date(g.receivedDate).toLocaleDateString('vi-VN')})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Supplier (Auto-populated) */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Nhà cung cấp nhận trả:
          </label>
          <input
            type="text"
            readOnly
            value={activeGrn?.supplierName || '—'}
            style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 12px', background: '#f8fafc', fontSize: 13, color: '#334155', fontWeight: 600 }}
          />
        </div>

        {/* Return Reason */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Lý do trả hàng: <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', fontSize: 13 }}
          >
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Reason Notes */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
            Mô tả chi tiết nguyên nhân &amp; thỏa thuận đổi trả:
          </label>
          <input
            type="text"
            value={reasonNotes}
            onChange={(e) => setReasonNotes(e.target.value)}
            placeholder="Ví dụ: Sản phẩm bị rách bao bì khi kiểm đếm, NCC đồng ý đổi mới hoặc cấn trừ công nợ..."
            style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 12px', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Returnable Items Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 280,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#0f766e" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Danh sách sản phẩm trong phiếu nhập kho
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              ({grnLines.length} dòng sản phẩm)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12.5 }}>
            <div>
              Đã chọn: <strong style={{ color: '#0f766e' }}>{totalItemsSelected} SP</strong> (Tổng SL: <strong>{totalRequestedQty}</strong>)
            </div>
            <div>
              Ước tính giá trị: <strong style={{ color: '#0f766e', fontSize: 14 }}>{fmt(totalEstimatedAmount)} đ</strong>
            </div>
          </div>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>SKU / Tên sản phẩm</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lô / Hạn dùng</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>SL đã nhập</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đã trả trước</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đang chờ trả</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a' }}>Được phép trả</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', width: 130 }}>SL yêu cầu trả</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Đơn giá vốn</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Ghi chú dòng</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingLines ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    Đang tải danh sách mặt hàng...
                  </td>
                </tr>
              ) : grnLines.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    Phiếu nhập không có dòng sản phẩm nào còn số lượng được phép trả.
                  </td>
                </tr>
              ) : (
                grnLines.map((line, idx) => {
                  const reqQty = lineQuantities[line.goodsReceiptLineId] || 0;
                  const isExceeded = reqQty > line.availableReturnQty;
                  const lineTotal = reqQty * line.unitCost;

                  return (
                    <tr
                      key={line.goodsReceiptLineId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isExceeded ? '#fef2f2' : reqQty > 0 ? '#f0fdfa' : '#ffffff',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{line.productName}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#0f766e' }}>{line.sku}</div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {line.batchCode ? (
                          <div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{line.batchCode}</span>
                            {line.expiryDate && (
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                HSD: {new Date(line.expiryDate).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{line.unit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{fmt(line.receivedQty)}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: line.returnedQty > 0 ? '#dc2626' : '#64748b' }}>
                        {fmt(line.returnedQty)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: line.pendingReturnQty > 0 ? '#ea580c' : '#64748b' }}>
                        {fmt(line.pendingReturnQty)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {fmt(line.availableReturnQty)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <input
                            type="number"
                            min={0}
                            max={line.availableReturnQty}
                            value={reqQty === 0 ? '' : reqQty}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setLineQuantities((prev) => ({ ...prev, [line.goodsReceiptLineId]: val }));
                            }}
                            style={{
                              width: 85,
                              height: 30,
                              textAlign: 'right',
                              padding: '0 8px',
                              borderRadius: 4,
                              border: isExceeded ? '2px solid #dc2626' : reqQty > 0 ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                              fontWeight: 700,
                              color: isExceeded ? '#dc2626' : reqQty > 0 ? '#0f766e' : '#334155',
                              outline: 'none',
                            }}
                          />
                          {isExceeded && (
                            <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>
                              Vượt quá {line.availableReturnQty}!
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                        {fmt(line.unitCost)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {fmt(lineTotal)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          placeholder="Lý do riêng..."
                          value={lineNotes[line.goodsReceiptLineId] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineNotes((prev) => ({ ...prev, [line.goodsReceiptLineId]: val }));
                          }}
                          style={{
                            width: 130,
                            height: 28,
                            padding: '0 6px',
                            borderRadius: 4,
                            border: '1px solid #cbd5e1',
                            fontSize: 11.5,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierReturnFormPage;
