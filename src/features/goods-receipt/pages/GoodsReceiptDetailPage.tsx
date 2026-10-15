import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  GrnDetailItem,
  GrnPostSettings,
  GrnRemainingOption,
  GrnStatus,
  PoStatusPreview,
  UserRole,
} from '../types/grn.types';
import { MOCK_GOODS_RECEIPTS } from '../lib/mockGrnData';
import { GrnDetailHeaderCard } from '../components/detail/GrnDetailHeaderCard';
import { GrnStockFefoTable } from '../components/detail/GrnStockFefoTable';
import { GrnPoRemainingTable } from '../components/detail/GrnPoRemainingTable';
import { GrnPostSettingsCard } from '../components/detail/GrnPostSettingsCard';
import { GrnDetailActionBar } from '../components/detail/GrnDetailActionBar';
import { GrnDetailSuccessModal } from '../components/detail/GrnDetailSuccessModal';
import { GrnPrintPreviewModal } from '../components/form/GrnPrintPreviewModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

export const GoodsReceiptDetailPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role management
  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || 'BR-01';

  // Find receipt
  const existingReceipt = useMemo(() => {
    if (!id) return MOCK_GOODS_RECEIPTS[0];
    return (
      MOCK_GOODS_RECEIPTS.find((r) => r.id === id || r.code === id) ||
      MOCK_GOODS_RECEIPTS[0]
    );
  }, [id]);

  // Mode: confirmation vs view
  const isModeConfirmParam = searchParams.get('mode') === 'confirm';
  const [status, setStatus] = useState<GrnStatus>(existingReceipt.status);
  const isConfirmationMode = isModeConfirmParam || status === 'DRAFT';

  // Items with detail fields
  const [items, setItems] = useState<GrnDetailItem[]>(() => {
    return existingReceipt.items.map((it) => {
      const isCatchWeight = it.productCode === 'FR-THIT-01' || it.productName.toLowerCase().includes('xay') || it.productName.toLowerCase().includes('thịt');
      const isGift = it.productCode === 'BV-PEPSI-01' || it.unitPrice === 0 || it.productName.toLowerCase().includes('tặng');
      const retail = it.unitPrice > 0 ? it.unitPrice * 1.35 : 10000;
      return {
        ...it,
        retailPrice: retail,
        isCatchWeight,
        isGift,
        remainingOption: (it.differenceQty || 0) < 0 ? 'backorder' : undefined,
      };
    });
  });

  // Freight & Financials
  const [landedCost] = useState<number>(50000);
  const [discount] = useState<number>(0);
  const [vatPercent] = useState<number>(0);

  const goodsTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.receivedQty * (it.unitPrice || 0)), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const afterDiscount = Math.max(0, goodsTotal - discount);
    const withFreight = afterDiscount + landedCost;
    const vat = Math.round((withFreight * vatPercent) / 100);
    return withFreight + vat;
  }, [goodsTotal, discount, landedCost, vatPercent]);

  // Total Labels count
  const totalLabels = useMemo(() => {
    return items.reduce((sum, it) => sum + Math.ceil(it.receivedQty || 0), 0);
  }, [items]);

  // PO status calculation
  const calculatedPoStatus = useMemo<PoStatusPreview>(() => {
    const shortages = items.filter((it) => (it.receivedQty || 0) < (it.orderedQty || 0));
    if (shortages.length === 0) return 'COMPLETED';
    const hasBackorder = shortages.some((it) => it.remainingOption === 'backorder');
    return hasBackorder ? 'PARTIALLY_RECEIVED' : 'COMPLETED';
  }, [items]);

  const [poStatusPreview, setPoStatusPreview] = useState<PoStatusPreview>(calculatedPoStatus);

  // Post settings
  const [postSettings, setPostSettings] = useState<GrnPostSettings>({
    createApInvoice: true,
    printShelfLabels: true,
    attachmentName: 'Bill_TuoiSach_2609.jpg',
    attachmentSize: '1.2 MB',
  });

  // Toast & Modals
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isPrintLabelsModalOpen, setIsPrintLabelsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Switch role handler
  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);
    if (newRole === 'employee') {
      newParams.set('branch', employeeBranchId);
    } else {
      newParams.delete('branch');
    }
    setSearchParams(newParams, { replace: true });
    showToast(
      `Đã chuyển sang góc nhìn ${newRole === 'store_owner' ? 'Chủ cửa hàng (Toàn chuỗi)' : 'Nhân viên kho (Chi nhánh ' + employeeBranchId + ')'}`,
      'info'
    );
  };

  // Handling option change
  const handleRemainingOptionChange = (itemId: string, option: GrnRemainingOption) => {
    setItems((prev) => {
      const updated = prev.map((it) => (it.id === itemId ? { ...it, remainingOption: option } : it));
      const shortages = updated.filter((it) => (it.receivedQty || 0) < (it.orderedQty || 0));
      const hasBackorder = shortages.some((it) => it.remainingOption === 'backorder');
      setPoStatusPreview(hasBackorder ? 'PARTIALLY_RECEIVED' : 'COMPLETED');
      return updated;
    });
  };

  const handlePostSettingChange = (key: keyof GrnPostSettings, value: boolean) => {
    setPostSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Confirm GRN Action
  const handleConfirmGrn = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStatus('CONFIRMED');
      setIsSuccessModalOpen(true);
      showToast(`Đã duyệt hoàn tất phiếu ${existingReceipt.code}. Tồn kho và nợ AP đã được cập nhật!`, 'success');
    }, 600);
  };

  // Navigations
  const handleBackToEdit = () => {
    const editUrl =
      role === 'employee'
        ? `/employee/goods-receipts/create?poCode=${existingReceipt.poReference}&branch=${employeeBranchId}&role=employee`
        : `/store-owner/goods-receipts/create?poCode=${existingReceipt.poReference}`;
    navigate(editUrl);
  };

  const handleBackToList = () => {
    const listUrl =
      role === 'employee'
        ? `/employee/goods-receipts?branch=${employeeBranchId}&role=employee`
        : '/store-owner/goods-receipts';
    navigate(listUrl);
  };

  const handlePrintGrn = () => {
    window.print();
  };

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
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Top Header Navigation Bar ── */}
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
            className="po-btn po-btn-outline"
            style={{ height: 32, padding: '0 10px', gap: 4 }}
            title="Quay về danh sách GRN"
          >
            <ArrowLeft size={14} />
            <span>Quay lại</span>
          </button>

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
            <PackageCheck size={22} color="#0f766e" />
            <span>
              {isConfirmationMode
                ? 'XÁC NHẬN TỔNG QUAN PHIẾU NHẬP KHO (CONFIRM GRN SUMMARY)'
                : `CHI TIẾT PHIẾU NHẬP KHO: ${existingReceipt.code}`}
            </span>
          </h1>
        </div>

        {/* Right side: Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: 2,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
            }}
            title="Chuyển đổi góc nhìn vai trò"
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
              <span>Chủ cửa hàng (All)</span>
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
              <span>Nhân viên ({employeeBranchId})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Box 1: General Info & Invoice Total Card ── */}
      <GrnDetailHeaderCard
        grnNo={existingReceipt.code}
        branchName={existingReceipt.branchName}
        branchCode={existingReceipt.branchId}
        supplierName={existingReceipt.supplierName}
        supplierCode={existingReceipt.supplierCode}
        poReference={existingReceipt.poReference}
        receiverName={existingReceipt.receiverName}
        status={status}
        goodsTotal={goodsTotal}
        landedCost={landedCost}
        discount={discount}
        vatPercent={vatPercent}
        grandTotal={grandTotal}
        paymentTerm="CREDIT_30"
        receiptTime={existingReceipt.receiveDate}
        isConfirmationMode={isConfirmationMode}
      />

      {/* ── Box 2: Stock to Add & Batch FEFO Table ── */}
      <GrnStockFefoTable items={items} totalLandedCost={landedCost} />

      {/* ── Box 3: PO Status Update & Remaining Handling Table ── */}
      <GrnPoRemainingTable
        poReference={existingReceipt.poReference}
        items={items}
        poStatusPreview={poStatusPreview}
        onRemainingOptionChange={handleRemainingOptionChange}
        onPoStatusChange={(st) => setPoStatusPreview(st)}
        readOnly={!isConfirmationMode && status === 'CONFIRMED'}
      />

      {/* ── Box 4: Post Settings & Attachments Card ── */}
      <GrnPostSettingsCard
        settings={postSettings}
        grandTotal={grandTotal}
        totalLabels={totalLabels}
        onSettingChange={handlePostSettingChange}
        readOnly={!isConfirmationMode && status === 'CONFIRMED'}
      />

      {/* ── Sticky Bottom Action Bar ── */}
      <GrnDetailActionBar
        status={status}
        isConfirmationMode={isConfirmationMode}
        isSubmitting={isSubmitting}
        onBackToEdit={handleBackToEdit}
        onBackToList={handleBackToList}
        onConfirmGrn={handleConfirmGrn}
        onPrintGrn={handlePrintGrn}
        onPrintLabels={() => setIsPrintLabelsModalOpen(true)}
      />

      {/* ── Modal Result Success ── */}
      <GrnDetailSuccessModal
        isOpen={isSuccessModalOpen}
        grnNo={existingReceipt.code}
        poReference={existingReceipt.poReference}
        supplierName={existingReceipt.supplierName}
        grandTotal={grandTotal}
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

      {/* ── Modal Print Preview Stickers ── */}
      <GrnPrintPreviewModal
        isOpen={isPrintLabelsModalOpen}
        grnNo={existingReceipt.code}
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
