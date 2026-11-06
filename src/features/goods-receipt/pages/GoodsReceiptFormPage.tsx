import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Loader2,
} from 'lucide-react';
import type {
  GrnCostSummary,
  GrnItemDetail,
  GrnStatus,
  PaymentMethod,
  PaymentTerm,
  PoLookupOption,
  UserRole,
} from '../types/grn.types';
import { goodsReceiptApi, type BackendGoodsReceiptDto } from '../api/goodsReceiptApi';
import { branchApi } from '../../purchase-order/api/branchApi';
import { GrnFormHeaderCard, type GrnBranchOption } from '../components/form/GrnFormHeaderCard';
import { GrnProductEntryTable } from '../components/form/GrnProductEntryTable';
import { GrnCostSummaryCard } from '../components/form/GrnCostSummaryCard';
import { GrnFormActionBar } from '../components/form/GrnFormActionBar';
import { GrnMismatchConfirmModal } from '../components/form/GrnMismatchConfirmModal';
import { GrnPrintPreviewModal } from '../components/form/GrnPrintPreviewModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';

const mapPaymentMethod = (method: PaymentMethod): string => {
  if (method === 'Cash') return 'CASH';
  if (method === 'Bank') return 'BANK';
  return 'AP';
};

const mapDtoToItems = (dto: BackendGoodsReceiptDto): GrnItemDetail[] =>
  (dto.lines ?? []).map((l) => ({
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
  }));

export const GoodsReceiptFormPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(roleParam || defaultRole);
  const employeeBranchId = searchParams.get('branch') || '';

  const isViewMode = Boolean(id && id !== 'create');
  const listPath =
    role === 'employee'
      ? `/employee/goods-receipts?branch=${encodeURIComponent(employeeBranchId)}&role=employee`
      : '/store-owner/goods-receipts';

  const [availablePos, setAvailablePos] = useState<PoLookupOption[]>([]);
  const [branches, setBranches] = useState<GrnBranchOption[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [grnNo, setGrnNo] = useState<string>('(Tự sinh khi lưu)');
  const [branchId, setBranchId] = useState<string>(employeeBranchId || '');
  const [poReference, setPoReference] = useState<string>(
    () => searchParams.get('poCode') || searchParams.get('po') || ''
  );
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [receiptTime] = useState<string>(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  });
  const [invoiceNo, setInvoiceNo] = useState('');
  const [createdBy] = useState(
    role === 'employee' ? 'NV. Thủ kho' : 'Quản lý kho'
  );
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('30');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GrnItemDetail[]>([]);
  const [landedCost, setLandedCost] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [vatPercent, setVatPercent] = useState(0);

  const [isMismatchModalOpen, setIsMismatchModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadExisting = useCallback(async () => {
    if (!id || id === 'create') return;
    setIsLoading(true);
    try {
      const dto = await goodsReceiptApi.getGoodsReceiptById(id);
      if (!dto) {
        showToast('Không tìm thấy phiếu nhập kho.', 'error');
        navigate(listPath);
        return;
      }
      setGrnNo(dto.code);
      setBranchId(dto.branchId);
      setPoReference(dto.purchaseOrderCode || '');
      setSelectedPoId(dto.purchaseOrderId || '');
      setSupplierId(dto.supplierId);
      setSupplierName(dto.supplierName);
      setSupplierCode(dto.supplierCode);
      setInvoiceNo(dto.invoiceNo || '');
      setNotes(dto.note || '');
      setLandedCost(dto.freightFee || 0);
      setDiscountAmount(dto.discountAmount || 0);
      setVatPercent(dto.vatPercent || 0);
      setItems(mapDtoToItems(dto));
    } catch (err: any) {
      showToast(err.message || 'Không thể tải phiếu nhập kho.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, listPath, navigate]);

  const loadPoLookup = useCallback(async () => {
    if (isViewMode) return;
    try {
      const branchFilter = role === 'employee' && employeeBranchId ? employeeBranchId : undefined;
      const pos = await goodsReceiptApi.getPoLookup(branchFilter);
      setAvailablePos(pos);

      const paramPo = searchParams.get('poCode') || searchParams.get('po');
      if (paramPo) {
        const matched = pos.find((p) => p.poCode === paramPo);
        if (matched) {
          setPoReference(matched.poCode);
          setSelectedPoId(matched.id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách PO.', 'error');
    }
  }, [isViewMode, role, employeeBranchId, searchParams]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await branchApi.getBranches({ status: 'active', pageIndex: 1, pageSize: 100 });
        const options = (res.items ?? []).map((b) => ({
          id: b.id,
          label: `${b.code || ''} — ${b.name}`.trim(),
        }));
        setBranches(options);
        if (!branchId && options[0] && role !== 'employee') {
          setBranchId(options[0].id);
        }
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách chi nhánh.', 'error');
      }
    };
    void loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    void loadPoLookup();
  }, [loadPoLookup]);

  useEffect(() => {
    if (!selectedPoId || isViewMode) return;
    let cancelled = false;

    const loadDetails = async () => {
      try {
        const details = await goodsReceiptApi.getPoReceiptDetails(selectedPoId);
        if (!details || cancelled) return;

        setSupplierId(details.supplierId);
        setSupplierName(details.supplierName);
        setSupplierCode(details.supplierCode);
        if (role !== 'employee') {
          setBranchId(details.branchId);
        }
        setItems(
          details.items.map((it) => ({
            id: it.purchaseOrderDetailId,
            productId: it.productId,
            purchaseOrderDetailId: it.purchaseOrderDetailId,
            productCode: it.productCode,
            productName: it.productName,
            unit: it.unit,
            hasBatches: it.hasBatches,
            orderedQty: it.orderedQty,
            receivedQty: it.orderedQty,
            acceptedQty: it.orderedQty,
            rejectedQty: 0,
            shortageQty: 0,
            differenceQty: 0,
            unitPrice: it.unitPrice,
            lineTotal: it.orderedQty * it.unitPrice,
            batchCode: '',
            expiryDate: '',
          }))
        );
      } catch (err: any) {
        showToast(err.response?.data?.message || err.message || 'Không thể tải chi tiết PO.', 'error');
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedPoId, isViewMode, role]);

  const costs: GrnCostSummary = useMemo(() => {
    const goodsTotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
    const subtotalAfterDiscount = Math.max(0, goodsTotal - discountAmount + landedCost);
    const vatAmount = Math.round(subtotalAfterDiscount * (vatPercent / 100));
    const grandTotal = subtotalAfterDiscount + vatAmount;
    return { goodsTotal, landedCost, discountAmount, vatPercent, vatAmount, grandTotal };
  }, [items, landedCost, discountAmount, vatPercent]);

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

  const handleAddNewRow = () => {
    showToast('V1 chỉ hỗ trợ nhập kho theo dòng hàng của đơn PO.', 'info');
  };

  const handleRemoveRow = (itemId: string) => {
    if (items.length <= 1) {
      showToast('Phiếu nhập kho phải có ít nhất 1 mặt hàng!', 'error');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handlePoChange = (poCode: string) => {
    setPoReference(poCode);
    const matched = availablePos.find((p) => p.poCode === poCode);
    setSelectedPoId(matched?.id || '');
    if (!matched) {
      setItems([]);
      setSupplierId('');
      setSupplierName('');
      setSupplierCode('');
    }
  };

  const validateForm = (): boolean => {
    if (!selectedPoId || !poReference) {
      showToast('Vui lòng chọn Đơn đặt hàng PO nguồn trước khi hoàn tất!', 'error');
      return false;
    }
    if (!branchId) {
      showToast('Thiếu chi nhánh nhận hàng.', 'error');
      return false;
    }
    if (items.length === 0) {
      showToast('Danh sách hàng nhập không được để trống!', 'error');
      return false;
    }

    const missingBatch = items.some(
      (it) => it.hasBatches && (it.acceptedQty ?? it.receivedQty) > 0 && !it.batchCode?.trim()
    );
    if (missingBatch) {
      showToast('Sản phẩm quản lý HSD bắt buộc phải nhập Mã Lô!', 'error');
      return false;
    }

    const missingExp = items.some(
      (it) => it.hasBatches && (it.acceptedQty ?? it.receivedQty) > 0 && !it.expiryDate?.trim()
    );
    if (missingExp) {
      showToast('Sản phẩm quản lý HSD bắt buộc phải chọn Hạn sử dụng!', 'error');
      return false;
    }

    return true;
  };

  const buildCreateCommand = (autoComplete: boolean) => ({
    purchaseOrderId: selectedPoId,
    supplierId,
    branchId,
    invoiceNo: invoiceNo || undefined,
    freightFee: landedCost,
    discountAmount,
    vatPercent,
    paymentMethod: mapPaymentMethod(paymentMethod),
    note: notes || undefined,
    autoComplete,
    lines: items.map((it) => {
      const delivered = it.receivedQty || 0;
      const accepted = Math.min(it.acceptedQty ?? delivered, delivered, it.orderedQty);
      const rejected = Math.max(0, delivered - accepted);
      return {
        productId: it.productId,
        purchaseOrderDetailId: it.purchaseOrderDetailId,
        orderedQty: it.orderedQty,
        deliveredQty: delivered,
        acceptedQty: accepted,
        rejectedQty: rejected,
        unitPrice: it.unitPrice,
        batchCode: it.batchCode || undefined,
        manufactureDate: it.manufactureDate || undefined,
        expiryDate: it.expiryDate || undefined,
        rejectionReason: rejected > 0 ? it.rejectionReason || 'OTHER' : undefined,
        rejectionNote: it.rejectionNote,
        note: it.note,
      };
    }),
  });

  const submitReceipt = async (autoComplete: boolean) => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const created = await goodsReceiptApi.createGoodsReceipt(buildCreateCommand(autoComplete));
      showToast(
        autoComplete
          ? `Hoàn tất nhập kho ${created.code}. Tồn kho đã được cập nhật.`
          : `Đã lưu nháp phiếu ${created.code}.`,
        'success'
      );
      setTimeout(() => navigate(listPath), 900);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Lưu phiếu nhập kho thất bại.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    void submitReceipt(false);
  };

  const executeCompleteReceipt = (_forcedStatus?: GrnStatus) => {
    void submitReceipt(true);
  };

  const handleComplete = () => {
    if (!validateForm()) return;
    const hasMismatch = items.some((it) => (it.acceptedQty ?? it.receivedQty) !== it.orderedQty);
    if (hasMismatch) {
      setIsMismatchModalOpen(true);
      return;
    }
    executeCompleteReceipt('CONFIRMED');
  };

  const handleCompleteAndPrint = () => {
    if (!validateForm()) return;
    const hasMismatch = items.some((it) => (it.acceptedQty ?? it.receivedQty) !== it.orderedQty);
    if (hasMismatch) {
      setIsMismatchModalOpen(true);
      return;
    }
    setIsPrintModalOpen(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 48, display: 'flex', justifyContent: 'center', gap: 8, color: '#64748b' }}>
        <Loader2 size={18} className="animate-spin" />
        Đang tải phiếu nhập kho...
      </div>
    );
  }

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
            onClick={() => navigate(listPath)}
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
                {isViewMode
                  ? `Chi tiết phiếu nhập kho ${grnNo}`
                  : 'Lập phiếu nhập kho từ đơn PO (Goods Receipt Note)'}
              </span>
              {isSaving && <Loader2 size={16} className="animate-spin" color="#0d9488" />}
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
              Đối soát số lượng thực nhận, kiểm tra hạn sử dụng FEFO và tính chi phí nhập kho
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
              if (employeeBranchId) params.set('branch', employeeBranchId);
              setSearchParams(params, { replace: true });
              if (employeeBranchId) setBranchId(employeeBranchId);
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
            <span>Thủ kho</span>
          </button>
        </div>
      </div>

      <GrnFormHeaderCard
        grnNo={grnNo}
        branchId={branchId}
        poReference={poReference}
        availablePos={availablePos}
        branches={branches}
        supplierName={supplierName}
        supplierCode={supplierCode}
        receiptTime={receiptTime}
        invoiceNo={invoiceNo}
        createdBy={createdBy}
        paymentTerm={paymentTerm}
        paymentMethod={paymentMethod}
        role={role}
        employeeBranchId={employeeBranchId}
        readOnly={isViewMode || isSaving}
        onBranchChange={setBranchId}
        onPoChange={handlePoChange}
        onInvoiceNoChange={setInvoiceNo}
        onPaymentTermChange={setPaymentTerm}
        onPaymentMethodChange={setPaymentMethod}
      />

      <GrnProductEntryTable
        items={items}
        readOnly={isViewMode || isSaving}
        onItemChange={handleItemChange}
        onAddNewRow={handleAddNewRow}
        onRemoveRow={handleRemoveRow}
      />

      <GrnCostSummaryCard
        notes={notes}
        costs={costs}
        readOnly={isViewMode || isSaving}
        onNotesChange={setNotes}
        onLandedCostChange={setLandedCost}
        onDiscountChange={setDiscountAmount}
        onVatPercentChange={setVatPercent}
      />

      <GrnFormActionBar
        readOnly={isViewMode || isSaving}
        onCancel={() => navigate(listPath)}
        onSaveDraft={handleSaveDraft}
        onCompleteAndPrint={handleCompleteAndPrint}
        onComplete={handleComplete}
      />

      <GrnMismatchConfirmModal
        isOpen={isMismatchModalOpen}
        mismatchedItems={items.filter(
          (it) => (it.acceptedQty ?? it.receivedQty) !== it.orderedQty
        )}
        onClose={() => setIsMismatchModalOpen(false)}
        onConfirm={() => {
          setIsMismatchModalOpen(false);
          executeCompleteReceipt('MISMATCH');
        }}
      />

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
