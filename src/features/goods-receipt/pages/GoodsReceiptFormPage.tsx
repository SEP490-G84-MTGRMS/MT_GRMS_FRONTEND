import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type {
  GrnCostSummary,
  GrnItemDetail,
  GrnStatus,
  PaymentMethod,
  PaymentTerm,
  UserRole,
} from '../types/grn.types';
import { MOCK_AVAILABLE_POS, MOCK_GOODS_RECEIPTS } from '../lib/mockGrnData';
import { GrnFormHeaderCard } from '../components/form/GrnFormHeaderCard';
import { GrnProductEntryTable } from '../components/form/GrnProductEntryTable';
import { GrnCostSummaryCard } from '../components/form/GrnCostSummaryCard';
import { GrnFormActionBar } from '../components/form/GrnFormActionBar';
import { GrnMismatchConfirmModal } from '../components/form/GrnMismatchConfirmModal';
import { GrnPrintPreviewModal } from '../components/form/GrnPrintPreviewModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

export const GoodsReceiptFormPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role management
  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || 'BR-01';

  // Read mode vs Edit/Create mode
  const isViewMode = Boolean(id && id !== 'create');
  const existingReceipt = useMemo(() => {
    if (!id || id === 'create') return null;
    return MOCK_GOODS_RECEIPTS.find((r) => r.id === id || r.code === id) || null;
  }, [id]);

  // Master Form State
  const [grnNo] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.code;
    return `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-009`;
  });

  const [branchId, setBranchId] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.branchId;
    return role === 'employee' ? employeeBranchId : 'BR-01';
  });

  const [poReference, setPoReference] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.poReference;
    return searchParams.get('poCode') || searchParams.get('po') || '';
  });

  const [supplierName, setSupplierName] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.supplierName;
    return '';
  });

  const [supplierCode, setSupplierCode] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.supplierCode;
    return '';
  });

  const [receiptTime] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.receiveDate;
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  });

  const [invoiceNo, setInvoiceNo] = useState<string>('INV-998822');
  const [createdBy] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.receiverName;
    return role === 'employee' ? 'NV. Văn A (Thủ kho)' : 'Đức.DM (Quản lý kho)';
  });

  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('30');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit');
  const [notes, setNotes] = useState<string>(() => {
    if (existingReceipt) return existingReceipt.notes || '';
    return 'Nhập bổ sung đợt hàng cuối tuần theo đơn đặt hàng PO.';
  });

  const [items, setItems] = useState<GrnItemDetail[]>(() => {
    if (existingReceipt) return existingReceipt.items;
    return [];
  });

  // Cost calculation states
  const [landedCost, setLandedCost] = useState<number>(30000);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatPercent, setVatPercent] = useState<number>(0);

  // Modals & Toast State
  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // When PO is chosen or loaded from URL parameter, bind items and supplier
  useEffect(() => {
    if (!poReference || isViewMode) return;

    const matchedPo = MOCK_AVAILABLE_POS.find((p) => p.poCode === poReference);
    if (matchedPo) {
      setSupplierName(matchedPo.supplierName);
      setSupplierCode(matchedPo.supplierCode);
      if (role !== 'employee') {
        setBranchId(matchedPo.branchId);
      }
      setItems(matchedPo.items.map((it) => ({ ...it })));
      if (matchedPo.notes) {
        setNotes((prev) => prev || matchedPo.notes || '');
      }
    }
  }, [poReference, isViewMode, role]);

  // Initial load if query param has poCode
  useEffect(() => {
    const paramPo = searchParams.get('poCode') || searchParams.get('po');
    if (paramPo && !poReference) {
      setPoReference(paramPo);
    }
  }, [searchParams, poReference]);

  // Financial Calculations
  const costs: GrnCostSummary = useMemo(() => {
    const goodsTotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
    const subtotalAfterDiscount = Math.max(0, goodsTotal - discountAmount + landedCost);
    const vatAmount = Math.round(subtotalAfterDiscount * (vatPercent / 100));
    const grandTotal = subtotalAfterDiscount + vatAmount;

    return {
      goodsTotal,
      landedCost,
      discountAmount,
      vatPercent,
      vatAmount,
      grandTotal,
    };
  }, [items, landedCost, discountAmount, vatPercent]);

  // Item field change handler
  const handleItemChange = (itemId: string, field: keyof GrnItemDetail, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        const updated = { ...it, [field]: value };
        if (field === 'receivedQty') {
          updated.differenceQty = updated.receivedQty - updated.orderedQty;
          updated.lineTotal = updated.receivedQty * updated.unitPrice;
        }
        if (field === 'unitPrice') {
          updated.lineTotal = updated.receivedQty * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  // Add a new custom item row
  const handleAddNewRow = () => {
    const newIdx = items.length + 1;
    const newItem: GrnItemDetail = {
      id: `item-custom-${Date.now()}`,
      productCode: `SKU-0099${newIdx}`,
      productName: `Sản phẩm nhập bổ sung ${newIdx}`,
      unit: 'Gói',
      orderedQty: 0,
      receivedQty: 1,
      acceptedQty: 1,
      rejectedQty: 0,
      differenceQty: 1,
      unitPrice: 50000,
      lineTotal: 50000,
      batchCode: `BAT-BS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      expiryDate: '2027-12-31',
    };
    setItems((prev) => [...prev, newItem]);
    showToast('Đã thêm 1 dòng hàng bổ sung vào phiếu nhập kho', 'info');
  };

  // Remove a row
  const handleRemoveRow = (itemId: string) => {
    if (items.length <= 1) {
      showToast('Phiếu nhập kho phải có ít nhất 1 mặt hàng!', 'error');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    showToast('Đã xóa dòng hàng', 'info');
  };

  // Validate items before completing receipt
  const validateForm = (): boolean => {
    if (!poReference) {
      showToast('Vui lòng chọn Đơn đặt hàng PO nguồn trước khi hoàn tất!', 'error');
      return false;
    }
    if (items.length === 0) {
      showToast('Danh sách hàng nhập không được để trống!', 'error');
      return false;
    }

    // Check mandatory batchCode & expiryDate
    const missingBatch = items.some((it) => it.receivedQty > 0 && !it.batchCode?.trim());
    if (missingBatch) {
      showToast('Tất cả mặt hàng có số lượng nhận phải được nhập Mã Lô (Batch No)!', 'error');
      return false;
    }

    const missingExp = items.some((it) => it.receivedQty > 0 && !it.expiryDate?.trim());
    if (missingExp) {
      showToast('Tất cả mặt hàng có số lượng nhận phải được chọn Hạn sử dụng (EXP Date)!', 'error');
      return false;
    }

    return true;
  };

  // Actions
  const handleSaveDraft = () => {
    if (!poReference) {
      showToast('Vui lòng chọn đơn đặt hàng PO trước khi lưu nháp!', 'error');
      return;
    }
    showToast(`Đã lưu nháp phiếu nhập kho ${grnNo} thành công (Draft)!`, 'success');
    setTimeout(() => {
      navigate('/store-owner/goods-receipts');
    }, 1200);
  };

  const executeCompleteReceipt = (forcedStatus?: GrnStatus) => {
    const hasMismatch = items.some((it) => it.differenceQty !== 0);
    const finalStatus: GrnStatus = forcedStatus || (hasMismatch ? 'MISMATCH' : 'CONFIRMED');

    showToast(
      `Hoàn tất nhập kho thành công! Phiếu ${grnNo} đã chuyển sang ${finalStatus}. Tồn kho và lô FEFO đã được cập nhật.`,
      'success'
    );
    setTimeout(() => {
      navigate('/store-owner/goods-receipts');
    }, 1400);
  };

  const handleComplete = () => {
    if (!validateForm()) return;

    const hasMismatch = items.some((it) => it.differenceQty !== 0);
    if (hasMismatch) {
      setIsMismatchModalOpen(true);
      return;
    }

    executeCompleteReceipt('CONFIRMED');
  };

  const handleCompleteAndPrint = () => {
    if (!validateForm()) return;

    const hasMismatch = items.some((it) => it.differenceQty !== 0);
    if (hasMismatch) {
      setIsMismatchModalOpen(true);
      return;
    }

    setIsPrintModalOpen(true);
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
      {/* Toast feedback */}
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
            onClick={() => navigate('/store-owner/goods-receipts')}
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
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
                {isViewMode
                  ? `Chi tiết phiếu nhập kho ${grnNo}`
                  : 'Lập phiếu nhập kho từ đơn PO (Goods Receipt Note)'}
              </span>
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
              Đối soát số lượng thực nhận, kiểm tra hạn sử dụng FEFO và tính chi phí nhập kho
            </p>
          </div>
        </div>

        {/* Role Toggle Pill Switcher */}
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
            onClick={() => {
              setRole('store_owner');
              const params = new URLSearchParams(searchParams);
              params.set('role', 'store_owner');
              params.delete('branch');
              setSearchParams(params, { replace: true });
            }}
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
            onClick={() => {
              setRole('employee');
              const params = new URLSearchParams(searchParams);
              params.set('role', 'employee');
              params.set('branch', employeeBranchId);
              setSearchParams(params, { replace: true });
              setBranchId(employeeBranchId);
            }}
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
            <span>Thủ kho ({employeeBranchId})</span>
          </button>
        </div>
      </div>

      {/* ── Block 1: Header Info Card ── */}
      <GrnFormHeaderCard
        grnNo={grnNo}
        branchId={branchId}
        poReference={poReference}
        availablePos={MOCK_AVAILABLE_POS}
        supplierName={supplierName}
        supplierCode={supplierCode}
        receiptTime={receiptTime}
        invoiceNo={invoiceNo}
        createdBy={createdBy}
        paymentTerm={paymentTerm}
        paymentMethod={paymentMethod}
        role={role}
        employeeBranchId={employeeBranchId}
        readOnly={isViewMode}
        onBranchChange={setBranchId}
        onPoChange={setPoReference}
        onInvoiceNoChange={setInvoiceNo}
        onPaymentTermChange={setPaymentTerm}
        onPaymentMethodChange={setPaymentMethod}
      />

      {/* ── Block 2: Product Entry & FEFO Table ── */}
      <GrnProductEntryTable
        items={items}
        readOnly={isViewMode}
        onItemChange={handleItemChange}
        onAddNewRow={handleAddNewRow}
        onRemoveRow={handleRemoveRow}
      />

      {/* ── Block 3: Cost Summary & Notes ── */}
      <GrnCostSummaryCard
        notes={notes}
        costs={costs}
        readOnly={isViewMode}
        onNotesChange={setNotes}
        onLandedCostChange={setLandedCost}
        onDiscountChange={setDiscountAmount}
        onVatPercentChange={setVatPercent}
      />

      {/* ── Block 4: Fixed Bottom Action Bar ── */}
      <GrnFormActionBar
        readOnly={isViewMode}
        onCancel={() => navigate('/store-owner/goods-receipts')}
        onSaveDraft={handleSaveDraft}
        onCompleteAndPrint={handleCompleteAndPrint}
        onComplete={handleComplete}
      />

      {/* Mismatch Confirmation Modal */}
      <GrnMismatchConfirmModal
        isOpen={isMismatchModalOpen}
        mismatchedItems={items.filter((it) => it.differenceQty !== 0)}
        onClose={() => setIsMismatchModalOpen(false)}
        onConfirm={() => {
          setIsMismatchModalOpen(false);
          executeCompleteReceipt('MISMATCH');
        }}
      />

      {/* Print Preview Modal */}
      <GrnPrintPreviewModal
        isOpen={isPrintModalOpen}
        grnNo={grnNo}
        items={items}
        onClose={() => {
          setIsPrintModalOpen(false);
          executeCompleteReceipt();
        }}
        onPrint={() => {
          showToast(`Đã gửi lệnh in ${items.length} bộ tem nhãn tới máy in mã vạch!`, 'success');
          setIsPrintModalOpen(false);
          executeCompleteReceipt();
        }}
      />
    </div>
  );
};
export default GoodsReceiptFormPage;
