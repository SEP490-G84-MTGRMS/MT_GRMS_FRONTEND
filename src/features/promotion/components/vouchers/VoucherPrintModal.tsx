import { useState, useMemo, type FC } from 'react';
import {
  Printer,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { VoucherBatchItem, VoucherCodeItem } from '../../types/promotion.types';
import { promotionApi } from '../../api/promotionApi';
import { useAuthStore } from '../../../../stores/useAuthStore';

interface VoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: VoucherBatchItem;
  initialCode?: VoucherCodeItem | null;
  availableCodes?: VoucherCodeItem[];
}

export const VoucherPrintModal: FC<VoucherPrintModalProps> = ({
  isOpen,
  onClose,
  batch,
  initialCode,
  availableCodes = [],
}) => {
  const { user } = useAuthStore();

  // Lấy tên Tenant từ tài khoản / Auth store (ưu tiên user.tenantName, auth_user)
  const tenantName = useMemo(() => {
    if (user?.tenantName && user.tenantName.trim()) {
      return user.tenantName.trim();
    }
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.tenantName && parsed.tenantName.trim()) {
          return parsed.tenantName.trim();
        }
      }
    } catch {}
    return 'CỬA HÀNG BÁN LẺ';
  }, [user]);

  const storeDisplayName = tenantName.toUpperCase();

  // Lấy thông tin chi nhánh hiện tại đang chọn làm việc (nếu có)
  const activeBranch = useMemo(() => {
    try {
      const stored = localStorage.getItem('mtgrms_active_branch');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.id !== 'ALL') {
          return parsed;
        }
      }
    } catch {}
    return null;
  }, []);

  // Xác định phạm vi chi nhánh áp dụng của đợt voucher:
  // - Nếu batch.targetBranches hoặc batch.branches là ALL, rỗng hoặc chứa ALL -> Áp dụng Toàn hệ thống chi nhánh
  // - Nếu gán chi nhánh cụ thể -> Áp dụng tại chi nhánh đó
  const branchScope = useMemo(() => {
    const rawTarget = (batch as any)?.targetBranches || (batch as any)?.branches;
    if (
      !rawTarget ||
      rawTarget === 'ALL' ||
      (Array.isArray(rawTarget) && (rawTarget.length === 0 || rawTarget.includes('ALL')))
    ) {
      return {
        isAllBranches: true,
        displayName: 'Toàn hệ thống chi nhánh',
        rawText: 'Toan bo chi nhanh',
      };
    }

    if (typeof rawTarget === 'string') {
      return {
        isAllBranches: false,
        displayName: `Chi nhánh ${rawTarget}`,
        rawText: `Chi nhanh ${rawTarget}`,
      };
    }

    if (Array.isArray(rawTarget) && rawTarget.length > 0) {
      return {
        isAllBranches: false,
        displayName: `Chi nhánh: ${rawTarget.join(', ')}`,
        rawText: `Chi nhanh: ${rawTarget.join(', ')}`,
      };
    }

    return {
      isAllBranches: true,
      displayName: 'Toàn hệ thống chi nhánh',
      rawText: 'Toan bo chi nhanh',
    };
  }, [batch]);

  // Thông tin địa chỉ & số điện thoại hiển thị trên phiếu in
  const storeDisplayAddress =
    activeBranch?.address ||
    (user as any)?.storeAddress ||
    (user as any)?.address ||
    'Áp dụng trên toàn bộ chuỗi chi nhánh';
  const storeDisplayPhone = user?.phone || (user as any)?.tenantHotline || '1900 xxxx';

  // Chế độ in: 'SINGLE' (in 1 mã cụ thể) hoặc 'BATCH' (in hàng loạt mã chưa dùng)
  const [printMode, setPrintMode] = useState<'SINGLE' | 'BATCH'>(initialCode ? 'SINGLE' : 'BATCH');
  const [selectedCode, setSelectedCode] = useState<VoucherCodeItem | null>(initialCode || null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Danh sách mã UNUSED khả dụng cho in hàng loạt
  const unusedCodes = useMemo(() => {
    return availableCodes.filter((c) => c.status === 'UNUSED');
  }, [availableCodes]);

  const [batchPrintQty, setBatchPrintQty] = useState<number>(() => {
    const count = availableCodes.filter((c) => c.status === 'UNUSED').length;
    return count > 0 ? count : 10;
  });

  if (!isOpen || !batch) return null;

  // Lấy danh sách mã sẽ in dựa theo chế độ
  const codesToPrint: VoucherCodeItem[] = useMemo(() => {
    if (printMode === 'SINGLE') {
      return selectedCode ? [selectedCode] : [];
    }
    // Chế độ in hàng loạt: lấy N mã UNUSED đầu tiên theo số lượng người dùng chỉ định (tối đa bằng tổng số mã chưa dùng)
    const maxQty = Math.max(1, unusedCodes.length);
    const targetQty = Math.max(1, Math.min(batchPrintQty, maxQty));
    return unusedCodes.slice(0, targetQty);
  }, [printMode, selectedCode, batchPrintQty, unusedCodes]);

  // Cảnh báo Validation
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (batch.status === 'PAUSED') {
      warnings.push('Đợt voucher này đang TẠM DỪNG lưu hành. Phiếu in ra sẽ không thể áp dụng tại quầy POS cho đến khi đợt được kích hoạt lại!');
    }

    if (batch.status === 'EXPIRED' || (batch.endDate && new Date(batch.endDate) < new Date())) {
      warnings.push('Đợt voucher này ĐÃ HẾT HẠN sử dụng. Khách hàng sẽ không thể dùng mã này khi thanh toán!');
    }

    if (printMode === 'SINGLE' && selectedCode) {
      if (selectedCode.status === 'USED') {
        warnings.push(`Mã [${selectedCode.code}] ĐÃ ĐƯỢC SỬ DỤNG${selectedCode.orderCode ? ` trên hóa đơn ${selectedCode.orderCode}` : ''}${selectedCode.usedAt ? ` lúc ${selectedCode.usedAt}` : ''}. Phiếu in ra sẽ được đóng dấu [ĐÃ SỬ DỤNG - VÔ HIỆU HÓA] để tránh lạm dụng!`);
      } else if (selectedCode.status === 'EXPIRED') {
        warnings.push(`Mã [${selectedCode.code}] ĐÃ HẾT HẠN sử dụng.`);
      } else if (selectedCode.status === 'LOCKED') {
        warnings.push(`Mã [${selectedCode.code}] đang ở trạng thái KHÓA.`);
      }
    }

    if (printMode === 'BATCH') {
      if (unusedCodes.length === 0) {
        warnings.push('Đợt này hiện không còn mã nào ở trạng thái "Chưa dùng" để in hàng loạt!');
      } else if (batchPrintQty > unusedCodes.length) {
        warnings.push(`Số lượng yêu cầu in (${batchPrintQty}) nhiều hơn số mã chưa dùng còn lại trong đợt (${unusedCodes.length}). Hệ thống sẽ in tối đa ${unusedCodes.length} mã.`);
      }
    }

    return warnings;
  }, [batch, printMode, selectedCode, unusedCodes, batchPrintQty]);

  // Xử lý gửi lệnh in trực tiếp 1-Click ra máy in POS-58
  const handleDirectPrintPos58 = async () => {
    if (codesToPrint.length === 0) {
      setPrintStatus({
        type: 'warning',
        message: 'Không có mã voucher nào hợp lệ để in!',
      });
      return;
    }

    try {
      setIsPrinting(true);
      setPrintStatus(null);

      let successCount = 0;
      let lastMessage = '';

      for (const c of codesToPrint) {
        const res = await promotionApi.printVoucherDirect({
          storeName: storeDisplayName,
          branchName: activeBranch ? activeBranch.name : 'Toàn hệ thống',
          appliedBranches: branchScope.isAllBranches ? 'Toàn hệ thống chi nhánh' : branchScope.displayName,
          storeAddress: storeDisplayAddress,
          storePhone: storeDisplayPhone,
          voucherCode: c.code,
          batchName: batch.name,
          discountType: batch.discountType,
          discountValue: batch.discountValue,
          minOrderValue: batch.minOrderValue,
          maxDiscountAmount: batch.maxDiscount,
          startDate: batch.startDate,
          endDate: batch.endDate,
          status: c.status,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          orderCode: c.orderCode,
          usedAt: c.usedAt,
          printerName: 'POS-58',
        });

        if (res.success) {
          successCount++;
        }
        lastMessage = res.message;
      }

      if (successCount === codesToPrint.length) {
        setPrintStatus({
          type: 'success',
          message: `Đã gửi lệnh in thành công ${successCount} phiếu voucher ra máy in nhiệt POS-58!`,
        });
      } else if (successCount > 0) {
        setPrintStatus({
          type: 'warning',
          message: `Đã in thành công ${successCount}/${codesToPrint.length} phiếu voucher. (Thông báo: ${lastMessage})`,
        });
      } else {
        setPrintStatus({
          type: 'error',
          message: lastMessage || 'Máy in POS-58 chưa sẵn sàng. Vui lòng kiểm tra nguồn và cáp USB máy in!',
        });
      }
    } catch (err: any) {
      setPrintStatus({
        type: 'error',
        message: `Lỗi kết nối máy in POS-58: ${err?.message || 'Không thể gửi lệnh in'}. Vui lòng kiểm tra start.bat (port 3300) hoặc driver máy in.`,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="promo-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="promo-modal-dialog"
        style={{ maxWidth: 540, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="promo-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, background: '#f0fdfa', borderRadius: 8, color: '#0f766e' }}>
              <Printer size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                In phiếu Voucher (Khổ nhiệt POS-58)
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Đợt: <strong style={{ color: '#0f766e' }}>{batch.name}</strong> ({batch.batchCode})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="promo-modal-close" title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Chế độ in Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
          <button
            type="button"
            onClick={() => setPrintMode('SINGLE')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: printMode === 'SINGLE' ? '#0f766e' : '#64748b',
              borderBottom: printMode === 'SINGLE' ? '2px solid #0f766e' : '2px solid transparent',
            }}
          >
            In từng mã {selectedCode ? `[${selectedCode.code}]` : ''}
          </button>
          <button
            type="button"
            onClick={() => setPrintMode('BATCH')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: printMode === 'BATCH' ? '#0f766e' : '#64748b',
              borderBottom: printMode === 'BATCH' ? '2px solid #0f766e' : '2px solid transparent',
            }}
          >
            In hàng loạt mã chưa dùng ({unusedCodes.length} mã khả dụng)
          </button>
        </div>

        {/* Status notification */}
        {printStatus && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid',
              backgroundColor:
                printStatus.type === 'success'
                  ? '#ecfdf5'
                  : printStatus.type === 'warning'
                    ? '#fffbeb'
                    : '#fef2f2',
              color:
                printStatus.type === 'success'
                  ? '#065f46'
                  : printStatus.type === 'warning'
                    ? '#92400e'
                    : '#991b1b',
              borderColor:
                printStatus.type === 'success'
                  ? '#a7f3d0'
                  : printStatus.type === 'warning'
                    ? '#fde68a'
                    : '#fecaca',
            }}
          >
            {printStatus.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
            )}
            <span>{printStatus.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, backgroundColor: '#f1f5f9' }}>
          {/* Cảnh báo Validation */}
          {validationWarnings.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {validationWarnings.map((warn, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Thiết lập số lượng in hàng loạt */}
          {printMode === 'BATCH' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block' }}>
                  Số lượng phiếu muốn in ra máy POS-58:
                </label>
                <span style={{ fontSize: 11.5, color: '#0f766e', fontWeight: 600 }}>
                  Đang có {unusedCodes.length} mã voucher chưa sử dụng sẵn sàng để in
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {[10, 20, 50].filter((n) => n < unusedCodes.length).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBatchPrintQty(num)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid',
                      borderColor: batchPrintQty === num ? '#0f766e' : '#cbd5e1',
                      backgroundColor: batchPrintQty === num ? '#f0fdfa' : '#f8fafc',
                      color: batchPrintQty === num ? '#0f766e' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
                {unusedCodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchPrintQty(unusedCodes.length)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: batchPrintQty === unusedCodes.length ? '#0f766e' : '#cbd5e1',
                      backgroundColor: batchPrintQty === unusedCodes.length ? '#0f766e' : '#f8fafc',
                      color: batchPrintQty === unusedCodes.length ? '#ffffff' : '#0f766e',
                      cursor: 'pointer',
                    }}
                    title="In toàn bộ các mã chưa sử dụng trong đợt này"
                  >
                    Tất cả ({unusedCodes.length})
                  </button>
                )}
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, unusedCodes.length)}
                  value={batchPrintQty}
                  onChange={(e) => setBatchPrintQty(Math.max(1, Math.min(Math.max(1, unusedCodes.length), Number(e.target.value))))}
                  style={{
                    width: 65,
                    padding: '4px 6px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
          )}

          {/* Chọn mã khi ở chế độ Single */}
          {printMode === 'SINGLE' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4, display: 'block' }}>
                Chọn mã voucher cần in:
              </label>
              <select
                value={selectedCode?.id || ''}
                onChange={(e) => {
                  const found = availableCodes.find((c) => c.id === e.target.value);
                  setSelectedCode(found || null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                }}
              >
                {availableCodes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — [{c.status === 'UNUSED' ? 'Chưa dùng' : c.status === 'USED' ? 'ĐÃ DÙNG' : c.status}]
                    {c.customerName ? ` (${c.customerName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Khung mô phỏng cuộn giấy in nhiệt POS-58 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
              XEM TRƯỚC PHIẾU IN NHIỆT (KHỔ GIẤY 58MM / POS-58):
            </div>

            {codesToPrint.length === 0 ? (
              <div
                style={{
                  padding: '30px 20px',
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 13,
                  width: '100%',
                }}
              >
                Không có mã nào phù hợp để in.
              </div>
            ) : (
              codesToPrint.slice(0, 3).map((codeItem, index) => {
                const isUsed = codeItem.status === 'USED';
                const isExpired = codeItem.status === 'EXPIRED';

                return (
                  <div
                    key={codeItem.id || index}
                    className="pos-58-voucher-paper printable-receipt"
                    style={{
                      width: 290,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
                      border: '1px solid #e2e8f0',
                      padding: '14px 12px',
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '11px',
                      lineHeight: 1.45,
                      color: '#0f172a',
                      position: 'relative',
                    }}
                  >
                    {/* Watermark cảnh báo nếu mã đã dùng hoặc hết hạn */}
                    {isUsed && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%) rotate(-25deg)',
                          border: '2px solid #ef4444',
                          color: '#ef4444',
                          padding: '4px 12px',
                          fontWeight: 900,
                          fontSize: 12,
                          letterSpacing: '0.05em',
                          opacity: 0.85,
                          pointerEvents: 'none',
                          textAlign: 'center',
                          backgroundColor: 'rgba(254, 242, 242, 0.9)',
                        }}
                      >
                        ĐÃ SỬ DỤNG<br />VÔ HIỆU HÓA
                      </div>
                    )}

                    {isExpired && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          transform: 'translate(-50%, -50%) rotate(-25deg)',
                          border: '2px solid #94a3b8',
                          color: '#64748b',
                          padding: '4px 12px',
                          fontWeight: 900,
                          fontSize: 12,
                          letterSpacing: '0.05em',
                          opacity: 0.85,
                          pointerEvents: 'none',
                          textAlign: 'center',
                          backgroundColor: 'rgba(241, 245, 249, 0.9)',
                        }}
                      >
                        HẾT HẠN
                      </div>
                    )}

                    {/* Header cửa hàng */}
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: 6, marginBottom: 6 }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', color: '#0f172a' }}>
                        {storeDisplayName}
                      </div>
                      {activeBranch?.name && (
                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#334155' }}>
                          Cơ sở: {activeBranch.name}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: '#475569' }}>
                        {storeDisplayAddress}
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569' }}>
                        Hotline: {storeDisplayPhone}
                      </div>
                    </div>

                    {/* Tiêu đề Voucher */}
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                        *** PHIẾU VOUCHER ***
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#334155', fontWeight: 600 }}>
                        Đợt: {batch.name}
                      </div>
                    </div>

                    {/* Khối Mã Voucher Nổi Bật */}
                    <div
                      style={{
                        border: '1.5px dashed #0f766e',
                        borderRadius: 4,
                        padding: '6px 4px',
                        textAlign: 'center',
                        backgroundColor: '#f0fdfa',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>
                        MÃ VOUCHER
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f766e', letterSpacing: '0.05em' }}>
                        {codeItem.code}
                      </div>
                      <div style={{ fontSize: '9.5px', marginTop: 2, color: isUsed ? '#b91c1c' : '#047857', fontWeight: 700 }}>
                        [{isUsed ? 'ĐÃ SỬ DỤNG' : isExpired ? 'HẾT HẠN' : 'CHƯA DÙNG - CÒN HIỆU LỰC'}]
                      </div>
                    </div>

                    {/* Chi tiết ưu đãi */}
                    <div style={{ fontSize: '10.5px', borderBottom: '1px dashed #94a3b8', paddingBottom: 6, marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Ưu đãi:</span>
                        <strong style={{ color: '#b91c1c' }}>
                          {batch.discountType === 'PERCENT'
                            ? `Giảm ${batch.discountValue}%`
                            : `Giảm ${batch.discountValue.toLocaleString('vi-VN')} đ`}
                        </strong>
                      </div>
                      {batch.minOrderValue > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Đơn tối thiểu:</span>
                          <span>{batch.minOrderValue.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      {batch.maxDiscount && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Giảm tối đa:</span>
                          <span>{batch.maxDiscount.toLocaleString('vi-VN')} đ</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Phạm vi:</span>
                        <strong style={{ color: '#0f766e' }}>
                          {branchScope.isAllBranches ? 'Toàn hệ thống chi nhánh' : branchScope.displayName}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Hạn dùng đến:</span>
                        <span>{batch.endDate}</span>
                      </div>
                      {codeItem.customerName && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e' }}>
                          <span>Cấp riêng cho:</span>
                          <span>{codeItem.customerName}</span>
                        </div>
                      )}
                      {isUsed && (
                        <div style={{ marginTop: 4, padding: 4, backgroundColor: '#fef2f2', borderRadius: 4, color: '#991b1b', fontSize: '9.5px' }}>
                          <div>Đã dùng trên HĐ: <strong>{codeItem.orderCode || 'HD-POS'}</strong></div>
                          {codeItem.usedAt && <div>Thời điểm: {codeItem.usedAt}</div>}
                        </div>
                      )}
                    </div>

                    {/* Điều kiện sử dụng */}
                    <div style={{ fontSize: '9.5px', color: '#475569', marginBottom: 6 }}>
                      <div>* Điều kiện sử dụng:</div>
                      <div>- Áp dụng: {branchScope.isAllBranches ? 'Tất cả các chi nhánh trong toàn hệ thống' : branchScope.displayName}.</div>
                      <div>- Xuất trình mã cho thu ngân khi thanh toán tại quầy POS.</div>
                      <div>- Mỗi mã chỉ có giá trị sử dụng 01 lần.</div>
                      <div>- Không có giá trị quy đổi thành tiền mặt.</div>
                    </div>

                    {/* Chân phiếu */}
                    <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#1e293b' }}>
                      CẢM ƠN QUÝ KHÁCH & HẸN GẶP LẠI!
                    </div>
                  </div>
                );
              })
            )}

            {codesToPrint.length > 3 && (
              <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                ... và {codesToPrint.length - 3} phiếu voucher khác sẽ được in liên tục ra cuộn giấy máy POS-58.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Tổng số phiếu sẽ in: <strong style={{ color: '#0f766e' }}>{codesToPrint.length}</strong> phiếu
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="pos-btn-secondary-pill"
              style={{
                padding: '7px 18px',
                borderRadius: 20,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleDirectPrintPos58}
              disabled={isPrinting || codesToPrint.length === 0}
              style={{
                padding: '7px 20px',
                borderRadius: 20,
                border: 'none',
                background: isPrinting || codesToPrint.length === 0 ? '#94a3b8' : '#0f766e',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: isPrinting || codesToPrint.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
              }}
            >
              {isPrinting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang gửi lệnh in tới POS-58...</span>
                </>
              ) : (
                <>
                  <Printer size={16} />
                  <span>In ra máy POS-58 (1-Click)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
