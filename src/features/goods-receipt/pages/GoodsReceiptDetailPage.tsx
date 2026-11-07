import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Loader2,
} from 'lucide-react';
import type {
  GoodsReceiptListItem,
  GrnDetailItem,
  GrnItemDetail,
  GrnPostSettings,
  GrnStatus,
  GrnCostSummary,
  PoStatusPreview,
  UserRole,
} from '../types/grn.types';
import { goodsReceiptApi, type BackendGoodsReceiptDto } from '../api/goodsReceiptApi';
import { GrnDetailHeaderCard } from '../components/detail/GrnDetailHeaderCard';
import { GrnProductEntryTable } from '../components/form/GrnProductEntryTable';
import { GrnCostSummaryCard } from '../components/form/GrnCostSummaryCard';
import { GrnPostSettingsCard } from '../components/detail/GrnPostSettingsCard';
import { GrnDetailActionBar } from '../components/detail/GrnDetailActionBar';
import { GrnDetailSuccessModal } from '../components/detail/GrnDetailSuccessModal';
import { GrnMismatchConfirmModal } from '../components/form/GrnMismatchConfirmModal';
import { GrnPrintPreviewModal } from '../components/form/GrnPrintPreviewModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const mapStatus = (status: string, hasMismatch: boolean): GrnStatus => {
  if (status === 'CANCELLED') return 'CANCELED';
  if (status === 'COMPLETED') return hasMismatch ? 'MISMATCH' : 'CONFIRMED';
  return (status as GrnStatus) || 'DRAFT';
};

const mapDtoToReceipt = (dto: BackendGoodsReceiptDto): GoodsReceiptListItem => ({
  id: dto.id,
  code: dto.code,
  type: 'FROM_PO',
  typeLabel: 'Từ PO',
  receiveDate: new Date(dto.receivedAtUtc).toLocaleString('vi-VN'),
  rawDate: dto.receivedAtUtc.slice(0, 10),
  branchId: dto.branchId,
  branchName: dto.branchName || dto.branchCode,
  supplierId: dto.supplierId,
  supplierName: dto.supplierName,
  supplierCode: dto.supplierCode,
  poReference: dto.purchaseOrderCode || '-',
  lineCount: dto.totalItems,
  totalAmount: dto.grandTotal,
  status: mapStatus(dto.status, !!dto.hasMismatch),
  receiverName: dto.receiverName || dto.receiverUserId || '—',
  hasMismatch: !!dto.hasMismatch,
  notes: dto.note,
  cancelledReason: dto.cancellationReason,
  items: (dto.lines ?? []).map((l) => ({
    id: l.id,
    productId: l.productId,
    purchaseOrderDetailId: l.purchaseOrderDetailId,
    productCode: l.productCode,
    productName: l.productName,
    unit: l.unit,
    orderedQty: l.orderedQty,
    receivedQty: l.deliveredQty,
    acceptedQty: l.acceptedQty,
    rejectedQty: l.rejectedQty,
    shortageQty: l.shortageQty,
    differenceQty: l.differenceQty,
    unitPrice: l.unitPrice,
    lineTotal: l.lineAmount,
    batchCode: l.batchCode,
    manufactureDate: l.manufactureDate,
    expiryDate: l.expiryDate,
    hasBatches: l.hasBatches,
    rejectionReason: l.rejectionReason as any,
    rejectionNote: l.rejectionNote,
    note: l.note,
  })),
});

export const GoodsReceiptDetailPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || '';

  const [receipt, setReceipt] = useState<GoodsReceiptListItem | null>(null);
  const [discount, setDiscount] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<GrnStatus>('DRAFT');
  const [items, setItems] = useState<GrnDetailItem[]>([]);

  // Nhận diện chế độ xác nhận nếu vào URL :id/confirm hoặc param ?mode=confirm hoặc phiếu đang DRAFT
  const isConfirmRoute = location.pathname.endsWith('/confirm') || searchParams.get('mode') === 'confirm';
  const isConfirmationMode = isConfirmRoute || status === 'DRAFT';

  const [postSettings, setPostSettings] = useState<GrnPostSettings>({
    createApInvoice: true,
    printShelfLabels: true,
    attachmentName: undefined,
    attachmentSize: undefined,
  });

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPrintLabelsModalOpen, setIsPrintLabelsModalOpen] = useState(false);
  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadReceipt = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const dto = await goodsReceiptApi.getGoodsReceiptById(id);
      if (!dto) {
        showToast('Không tìm thấy phiếu nhập kho.', 'error');
        navigate(
          role === 'employee'
            ? `/employee/goods-receipts?branch=${employeeBranchId}&role=employee`
            : '/store-owner/goods-receipts'
        );
        return;
      }
      const mapped = mapDtoToReceipt(dto);
      setReceipt(mapped);
      setStatus(mapped.status);
      setDiscount(dto.discountAmount || 0);
      setVatPercent(dto.vatPercent || 0);
      setNotes(dto.note || '');
      setItems(
        mapped.items.map((it) => {
          const retail = it.unitPrice > 0 ? it.unitPrice * 1.35 : 10000;
          return {
            ...it,
            retailPrice: retail,
            isCatchWeight: false,
            isGift: it.unitPrice === 0,
          };
        })
      );
    } catch (err: any) {
      showToast(err.message || 'Không thể tải chi tiết phiếu nhập kho.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, role, employeeBranchId]);

  useEffect(() => {
    void loadReceipt();
  }, [loadReceipt]);

  // Cập nhật số lượng và tính toán từng dòng hàng tương tự trang Create
  const handleItemChange = (itemId: string, field: keyof GrnItemDetail, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = { ...it, [field]: value };
        if (field === 'receivedQty') {
          const received = Number(value) || 0;
          updated.receivedQty = received;
          updated.acceptedQty = received;
          updated.rejectedQty = 0;
          updated.differenceQty = received - updated.orderedQty;
          updated.lineTotal = received * updated.unitPrice;
        }
        if (field === 'acceptedQty') {
          const accepted = Number(value) || 0;
          updated.acceptedQty = accepted;
          updated.rejectedQty = Math.max(0, (updated.receivedQty || 0) - accepted);
          updated.differenceQty = accepted - updated.orderedQty;
          updated.lineTotal = accepted * updated.unitPrice;
        }
        if (field === 'unitPrice') {
          updated.lineTotal = (updated.acceptedQty ?? updated.receivedQty) * Number(value);
        }
        return updated;
      })
    );
  };

  const costs: GrnCostSummary = useMemo(() => {
    const goodsTotal = items.reduce(
      (sum, it) => sum + (it.acceptedQty !== undefined ? it.acceptedQty : it.receivedQty || 0) * (it.unitPrice || 0),
      0
    );
    const subtotalAfterDiscount = Math.max(0, goodsTotal - discount);
    const vatAmount = Math.round(subtotalAfterDiscount * (vatPercent / 100));
    const grandTotal = subtotalAfterDiscount + vatAmount;
    return { goodsTotal, landedCost: 0, discountAmount: discount, vatPercent, vatAmount, grandTotal };
  }, [items, discount, vatPercent]);

  const totalLabels = useMemo(
    () => items.reduce((sum, it) => sum + Math.ceil(it.acceptedQty ?? it.receivedQty ?? 0), 0),
    [items]
  );

  const mismatchedItems = useMemo(
    () => items.filter((it) => it.differenceQty !== 0 || (it.rejectedQty || 0) > 0),
    [items]
  );

  const poStatusPreview: PoStatusPreview = 'COMPLETED';

  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);
    if (newRole === 'employee') {
      if (employeeBranchId) newParams.set('branch', employeeBranchId);
    } else {
      newParams.delete('branch');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handlePostSettingChange = (key: keyof GrnPostSettings, value: boolean) => {
    setPostSettings((prev) => ({ ...prev, [key]: value }));
  };

    const proceedCompleteGrn = async () => {
      if (!receipt) return;
      setIsSubmitting(true);
      try {
        await goodsReceiptApi.completeGoodsReceipt(receipt.id, notes);
        setStatus('CONFIRMED');
        setIsSuccessModalOpen(true);
        showToast(`Đã duyệt hoàn tất phiếu ${receipt.code}. Tồn kho chi nhánh đã được cập nhật!`, 'success');
      } catch (err: any) {
        showToast(err.response?.data?.message || err.message || 'Hoàn tất phiếu thất bại.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleConfirmClick = () => {
      // Nếu có hàng lệch hoặc hàng bị từ chối, bật modal xác nhận xử lý chênh lệch
      if (mismatchedItems.length > 0) {
        setIsMismatchModalOpen(true);
        return;
      }
      void proceedCompleteGrn();
    };

    const handleBackToEdit = () => {
      if (!receipt) return;
      const editUrl =
        role === 'employee'
          ? `/employee/goods-receipts/${receipt.id}?branch=${employeeBranchId}&role=employee`
          : `/store-owner/goods-receipts/${receipt.id}`;
      navigate(editUrl);
    };

    const handleBackToList = () => {
      navigate(
        role === 'employee'
          ? `/employee/goods-receipts?branch=${employeeBranchId}&role=employee`
          : '/store-owner/goods-receipts'
      );
    };

    const handlePrintGrn = () => {
      window.print();
    };

    if (isLoading || !receipt) {
      return (
        <div style={{ padding: 48, display: 'flex', justifyContent: 'center', gap: 8, color: '#64748b' }}>
          <Loader2 size={18} className="animate-spin" />
          Đang tải chi tiết phiếu nhập kho...
        </div>
      );
    }

    const isReadOnly = !isConfirmationMode && (status === 'CONFIRMED' || status === 'COMPLETED');

    return (
      <div
        style={{
          padding: '16px 24px 32px 24px',
          backgroundColor: '#f8fafc',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <AdminToast toast={toast} onClose={() => setToast(null)} />

        {/* ── TOP TITLE & ROLE SWITCHER BAR ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleBackToList}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Quay lại danh sách phiếu nhập kho"
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <h1
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <PackageCheck size={20} color="#0d9488" />
                <span>
                  {isConfirmationMode
                    ? 'Xác nhận tổng quan phiếu nhập kho (Confirm GRN Summary)'
                    : `Chi tiết phiếu nhập kho ${receipt.code}`}
                </span>
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
                {isConfirmationMode
                    ? 'Đối soát số lượng thực nhận, kiểm tra tình trạng hàng hóa và xác nhận cập nhật kho chi nhánh'
                    : 'Lịch sử nhập kho, thông tin lô FEFO và chứng từ công nợ liên kết'}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: 2,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleRole('store_owner')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'store_owner' ? 700 : 500,
                backgroundColor: role === 'store_owner' ? '#ffffff' : 'transparent',
                color: role === 'store_owner' ? '#0f766e' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'store_owner' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ShieldCheck size={14} />
              <span>Chủ cửa hàng</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleRole('employee')}
              style={{
                height: 28,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: role === 'employee' ? 700 : 500,
                backgroundColor: role === 'employee' ? '#ffffff' : 'transparent',
                color: role === 'employee' ? '#059669' : '#475569',
                borderRadius: 6,
                border: 'none',
                boxShadow: role === 'employee' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <UserCheck size={14} />
              <span>Thủ kho</span>
            </button>
          </div>
        </div>

        {/* ── 1. HEADER CARD (Thông tin chung & Đối soát Đơn PO gốc) ── */}
        <GrnDetailHeaderCard
          grnNo={receipt.code}
          branchName={receipt.branchName}
          branchCode={receipt.branchId}
          supplierName={receipt.supplierName}
          supplierCode={receipt.supplierCode}
          poReference={receipt.poReference}
          receiverName={receipt.receiverName}
          status={status}
          goodsTotal={costs.goodsTotal}
          discount={costs.discountAmount}
          vatPercent={costs.vatPercent}
          grandTotal={costs.grandTotal}
          paymentTerm="CREDIT_30"
          receiptTime={receipt.receiveDate}
          isConfirmationMode={isConfirmationMode}
        />

          {/* ── 2. UNIFIED PRODUCT ENTRY & RECONCILIATION TABLE (Chuẩn UI của Create) ── */}
      <GrnProductEntryTable
          items={items}
          readOnly={isReadOnly}
          onItemChange={handleItemChange}
        />

        {/* ── 3. COST SUMMARY & POST SETTINGS (2 Columns) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 14,
          }}
        >
          <GrnCostSummaryCard
            notes={notes}
            costs={costs}
            readOnly={isReadOnly}
            onNotesChange={setNotes}
            onDiscountChange={setDiscount}
            onVatPercentChange={setVatPercent}
          />

          <GrnPostSettingsCard
            settings={postSettings}
            grandTotal={costs.grandTotal}
            totalLabels={totalLabels}
            onSettingChange={handlePostSettingChange}
            readOnly={isReadOnly}
          />
        </div>

        {/* ── 4. STICKY ACTION BAR ── */}
        <GrnDetailActionBar
          status={status}
          isConfirmationMode={isConfirmationMode}
          isSubmitting={isSubmitting}
          onBackToEdit={handleBackToEdit}
          onBackToList={handleBackToList}
          onConfirmGrn={handleConfirmClick}
          onPrintGrn={handlePrintGrn}
          onPrintLabels={() => setIsPrintLabelsModalOpen(true)}
        />

        {/* ── 5. MISMATCH CONFIRMATION MODAL ── */}
        <GrnMismatchConfirmModal
          isOpen={isMismatchModalOpen}
          mismatchedItems={mismatchedItems}
          onClose={() => setIsMismatchModalOpen(false)}
          onConfirm={() => {
            setIsMismatchModalOpen(false);
            void proceedCompleteGrn();
          }}
        />

        {/* ── 6. SUCCESS RESULT MODAL ── */}
        <GrnDetailSuccessModal
          isOpen={isSuccessModalOpen}
          grnNo={receipt.code}
          poReference={receipt.poReference}
          supplierName={receipt.supplierName}
          grandTotal={costs.grandTotal}
          totalLabels={totalLabels}
          poStatusPreview={poStatusPreview}
          onClose={() => setIsSuccessModalOpen(false)}
          onGoToList={handleBackToList}
          onPrintGrn={handlePrintGrn}
          onPrintLabels={() => {
            setIsSuccessModalOpen(false);
            setIsPrintLabelsModalOpen(true);
          }}
        />

        {/* ── 7. PRINT LABELS PREVIEW MODAL ── */}
        <GrnPrintPreviewModal
          isOpen={isPrintLabelsModalOpen}
          grnNo={receipt.code}
          items={items}
          onClose={() => setIsPrintLabelsModalOpen(false)}
          onPrint={() => {
            setIsPrintLabelsModalOpen(false);
            showToast(`Đã gửi lệnh in ${totalLabels} tem dán kệ thành công!`, 'success');
          }}
        />
      </div>
    );
  };

  export default GoodsReceiptDetailPage;
