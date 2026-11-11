import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  PackageCheck,
  ArrowLeft,
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

const toDateInput = (value?: string | null): string => {
  if (!value) return '';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

/** Tự sinh mã lô: BAT-{SKU}-{YYYYMMDD}[-n] */
const generateBatchCode = (productCode: string, lotIndex = 1): string => {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const sku = (productCode || 'SKU').replace(/\s+/g, '').slice(0, 12).toUpperCase() || 'SKU';
  const base = `BAT-${sku}-${ymd}`;
  return lotIndex > 1 ? `${base}-${lotIndex}` : base;
};

const mapDtoToItems = (dto: BackendGoodsReceiptDto): GrnItemDetail[] =>
  (dto.lines ?? []).map((l) => {
    const manageBatch = !!(
      l.hasBatches ||
      l.batchCode ||
      l.manufactureDate ||
      l.expiryDate
    );
    return {
      id: l.id,
      productId: l.productId,
      purchaseOrderDetailId: l.purchaseOrderDetailId,
      productCode: l.productCode,
      productName: l.productName,
      unit: l.unit,
      orderedQty: l.orderedQty,
      receivedQty: l.acceptedQty ?? l.deliveredQty,
      acceptedQty: l.acceptedQty ?? l.deliveredQty,
      rejectedQty: l.rejectedQty ?? 0,
      shortageQty: l.shortageQty,
      differenceQty: l.differenceQty,
      unitPrice: l.unitPrice,
      lineTotal: l.lineAmount,
      batchCode: l.batchCode || (manageBatch ? generateBatchCode(l.productCode) : ''),
      manufactureDate: toDateInput(l.manufactureDate),
      expiryDate: toDateInput(l.expiryDate),
      hasBatches: l.hasBatches,
      manageBatch,
      isSplitLine: false,
      rejectionReason: l.rejectionReason as any,
      rejectionNote: l.rejectionNote,
      note: l.note,
    };
  });

export const GoodsReceiptFormPage: FC<{ defaultRole?: UserRole }> = ({
  defaultRole = 'store_owner',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const role: UserRole = roleParam || defaultRole;
  const employeeBranchId = searchParams.get('branch') || '';

  const isCreateMode = !id || id === 'create';
  const isConfirmMode = location.pathname.endsWith('/confirm');
  const isEditMode = location.pathname.includes('/edit');
  const [receiptStatus, setReceiptStatus] = useState<string>('');

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

  /** Khóa khi lưu, khi xem chi tiết (:id mà không phải confirm/edit), hoặc khi phiếu đã COMPLETED/CANCELLED */
  const isReadOnly =
    isSaving ||
    (!isCreateMode && !isConfirmMode && !isEditMode) ||
    (!isCreateMode && !!receiptStatus && receiptStatus !== 'DRAFT');

  const [grnNo, setGrnNo] = useState<string>('(Tự sinh khi lưu)');
  const [branchId, setBranchId] = useState<string>(employeeBranchId || '');
  const [poReference, setPoReference] = useState<string>(
    () => searchParams.get('poCode') || searchParams.get('po') || ''
  );
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [receiptTime, setReceiptTime] = useState<string>(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  });
  const [invoiceNo, setInvoiceNo] = useState('');
  const [createdBy, setCreatedBy] = useState<string>(
    role === 'employee' ? 'NV. Thủ kho' : 'Quản lý kho'
  );
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('30');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GrnItemDetail[]>([]);
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
      setReceiptStatus(dto.status || '');
      setGrnNo(dto.code);
      setBranchId(dto.branchId);
      setPoReference(dto.purchaseOrderCode || '');
      setSelectedPoId(dto.purchaseOrderId || '');
      setSupplierId(dto.supplierId);
      setSupplierName(dto.supplierName);
      setSupplierCode(dto.supplierCode);
      setInvoiceNo(dto.invoiceNo || '');
      setNotes(dto.note || '');
      setDiscountAmount(dto.discountAmount || 0);
      setVatPercent(dto.vatPercent || 0);
      if (dto.receivedAtUtc) {
        const d = new Date(dto.receivedAtUtc);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setReceiptTime(`${day}/${month}/${year} ${hh}:${mm}`);
      }
      if (dto.receiverName || dto.receiverUserId) {
        setCreatedBy(dto.receiverName || dto.receiverUserId);
      }
      if (dto.paymentMethod) {
        setPaymentMethod(dto.paymentMethod as PaymentMethod);
      }
      setItems(mapDtoToItems(dto));
      if (dto.status && dto.status !== 'DRAFT' && (isConfirmMode || isEditMode)) {
        showToast('Phiếu này không còn ở trạng thái nháp — chuyển sang xem chi tiết.', 'info');
        navigate(
          role === 'employee'
            ? `/employee/goods-receipts/${id}?branch=${encodeURIComponent(employeeBranchId)}&role=employee`
            : `/store-owner/goods-receipts/${id}`
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể tải phiếu nhập kho.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, listPath, navigate, isConfirmMode, isEditMode, role, employeeBranchId]);

  const loadPoLookup = useCallback(async () => {
    if (!isCreateMode) return;

    const paramPoCode = searchParams.get('poCode');
    const paramPoIdRaw = searchParams.get('po');
    // Chỉ nhận GUID đầy đủ — tránh JSON.stringify(order) / id cắt cụt từ link cũ
    const paramPoId =
      paramPoIdRaw &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramPoIdRaw)
        ? paramPoIdRaw
        : null;

    // Gắn mã PO từ URL ngay — tránh select trống trong lúc chờ API / khi PO chưa có trong lookup
    if (paramPoCode) {
      setPoReference(paramPoCode);
    }

    try {
      const branchFilter = role === 'employee' && employeeBranchId ? employeeBranchId : undefined;
      const pos = await goodsReceiptApi.getPoLookup(branchFilter);

      const matched = pos.find(
        (p) =>
          (paramPoId && p.id.toLowerCase() === paramPoId.toLowerCase()) ||
          (paramPoCode != null && paramPoCode !== '' && p.poCode === paramPoCode)
      );

      if (matched) {
        setAvailablePos(pos);
        setPoReference(matched.poCode);
        setSelectedPoId(matched.id);
        return;
      }

      // PO deep-link chưa nằm trong lookup → vẫn hiện mã trên select + load chi tiết theo id
      if (paramPoId) {
        const stubPos =
          paramPoCode && !pos.some((p) => p.poCode === paramPoCode)
            ? [
                {
                  id: paramPoId,
                  poCode: paramPoCode,
                  branchId: '',
                  branchName: '',
                  supplierId: '',
                  supplierName: '',
                  supplierCode: '',
                  orderDate: '',
                  expectedDeliveryDate: '',
                  items: [],
                } as PoLookupOption,
                ...pos,
              ]
            : pos;
        setAvailablePos(stubPos);
        if (paramPoCode) setPoReference(paramPoCode);
        setSelectedPoId(paramPoId);
        return;
      }

      setAvailablePos(pos);
      if (paramPoCode) {
        setPoReference(paramPoCode);
        showToast(
          `Không tìm thấy PO ${paramPoCode} đủ điều kiện nhập kho (đã có phiếu DRAFT/COMPLETED hoặc trạng thái chưa cho phép).`,
          'error'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách PO.', 'error');
    }
  }, [isCreateMode, role, employeeBranchId, searchParams]);

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
    // Phiếu đã tồn tại: không reload từ PO (sẽ lỗi PO_HAS_ACTIVE_RECEIPT)
    if (!selectedPoId || !isCreateMode) return;
    let cancelled = false;

    const loadDetails = async () => {
      try {
        const details = await goodsReceiptApi.getPoReceiptDetails(selectedPoId);
        if (!details || cancelled) return;

        // Deep-link ?po=&poCode= : luôn gắn mã PO gốc (kể cả khi PO chưa nằm trong po-lookup)
        if (details.code) {
          setPoReference(details.code);
          setAvailablePos((prev) => {
            if (prev.some((p) => p.id === details.id || p.poCode === details.code)) return prev;
            return [
              {
                id: details.id,
                poCode: details.code,
                branchId: details.branchId,
                branchName: details.branchName || details.branchCode || '',
                supplierId: details.supplierId,
                supplierName: details.supplierName,
                supplierCode: details.supplierCode,
                orderDate: '',
                expectedDeliveryDate: '',
                items: [],
              },
              ...prev,
            ];
          });
        }

        setSupplierId(details.supplierId);
        setSupplierName(details.supplierName);
        setSupplierCode(details.supplierCode);
        // Chi nhánh nhận lấy từ PO; employee chỉ override khi URL có ?branch=
        setBranchId(
          role === 'employee' && employeeBranchId ? employeeBranchId : details.branchId
        );
        setItems(
          details.items.map((it) => {
            const manageBatch = !!it.hasBatches;
            return {
              id: it.purchaseOrderDetailId,
              productId: it.productId,
              purchaseOrderDetailId: it.purchaseOrderDetailId,
              productCode: it.productCode,
              productName: it.productName,
              unit: it.unit,
              hasBatches: it.hasBatches,
              manageBatch,
              isSplitLine: false,
              orderedQty: it.orderedQty,
              receivedQty: it.orderedQty,
              acceptedQty: it.orderedQty,
              rejectedQty: 0,
              shortageQty: 0,
              differenceQty: 0,
              unitPrice: it.unitPrice,
              lineTotal: it.orderedQty * it.unitPrice,
              batchCode: manageBatch ? generateBatchCode(it.productCode) : '',
              manufactureDate: '',
              expiryDate: '',
            };
          })
        );
      } catch (err: any) {
        showToast(err.response?.data?.message || err.message || 'Không thể tải chi tiết PO.', 'error');
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedPoId, isCreateMode, role, employeeBranchId]);

  const costs: GrnCostSummary = useMemo(() => {
    const goodsTotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
    const subtotalAfterDiscount = Math.max(0, goodsTotal - discountAmount);
    const vatAmount = Math.round(subtotalAfterDiscount * (vatPercent / 100));
    const grandTotal = subtotalAfterDiscount + vatAmount;
    return { goodsTotal, landedCost: 0, discountAmount, vatPercent, vatAmount, grandTotal };
  }, [items, discountAmount, vatPercent]);

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
          updated.shortageQty = Math.max(0, updated.orderedQty - received);
          updated.differenceQty = received - updated.orderedQty;
          updated.lineTotal = received * updated.unitPrice;
        }
        // RULE-02: giá nhận = giá PO — không cho sửa unitPrice trên form
        if (field === 'unitPrice') {
          return it;
        }
        if (field === 'manageBatch') {
          if (value) {
            if (!updated.batchCode?.trim()) {
              const lotIndex =
                prev.filter(
                  (x) =>
                    String(x.purchaseOrderDetailId || x.productId) ===
                      String(updated.purchaseOrderDetailId || updated.productId) &&
                    !!x.manageBatch
                ).length + 1;
              updated.batchCode = generateBatchCode(updated.productCode, lotIndex);
            }
          } else {
            updated.batchCode = '';
            updated.manufactureDate = '';
            updated.expiryDate = '';
          }
        }
        return updated;
      })
    );
  };

  const handleSplitLot = (itemId: string) => {
    setItems((prev) => {
      const src = prev.find((it) => it.id === itemId);
      if (!src) return prev;
      const key = String(src.purchaseOrderDetailId || src.productId);
      const lotIndex = prev.filter((it) => String(it.purchaseOrderDetailId || it.productId) === key).length + 1;
      const isManaged = Boolean(src.hasBatches ?? src.manageBatch);
      const newRow: GrnItemDetail = {
        ...src,
        id: `${src.purchaseOrderDetailId || src.productId}-split-${Date.now()}`,
        isSplitLine: true,
        hasBatches: isManaged,
        manageBatch: isManaged,
        receivedQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        shortageQty: src.orderedQty,
        differenceQty: -src.orderedQty,
        lineTotal: 0,
        batchCode: isManaged ? generateBatchCode(src.productCode, lotIndex) : '',
        manufactureDate: '',
        expiryDate: '',
        rejectionReason: undefined,
      };
      const idx = prev.findIndex((it) => it.id === itemId);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
    showToast('Đã thêm dòng lô cùng SKU. Điều chỉnh SL từng dòng (tổng ≤ SL đặt).', 'success');
  };

  const handleRemoveRow = (itemId: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === itemId);
      if (!target) return prev;
      const key = String(target.purchaseOrderDetailId || target.productId || target.productCode);
      const siblings = prev.filter(
        (it) => String(it.purchaseOrderDetailId || it.productId || it.productCode) === key
      );
      if (siblings.length <= 1) {
        showToast('Không thể xóa dòng gốc từ PO. Chỉ xóa được dòng tách lô.', 'error');
        return prev;
      }
      return prev.filter((it) => it.id !== itemId);
    });
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

    const groups = new Map<string, typeof items>();
    for (const it of items) {
      const key = String(it.purchaseOrderDetailId || it.productId || it.productCode);
      const list = groups.get(key) || [];
      list.push(it);
      groups.set(key, list);
    }

    for (const [, rows] of groups) {
      const ordered = rows[0].orderedQty;
      const sumReceived = rows.reduce((s, r) => s + (r.receivedQty || 0), 0);
      if (sumReceived > ordered) {
        showToast(
          `${rows[0].productCode}: tổng thực nhận các lô (${sumReceived}) vượt SL đặt (${ordered}).`,
          'error'
        );
        return false;
      }
      if (sumReceived < ordered) {
        const hasReason = rows.some((r) => !!r.rejectionReason);
        if (!hasReason) {
          showToast(
            `${rows[0].productCode}: thực nhận (${sumReceived}) < SL đặt (${ordered}) — bắt buộc chọn lý do từ chối/thiếu.`,
            'error'
          );
          return false;
        }
      }
    }

    for (const it of items) {
      const isBatch = Boolean(it.hasBatches ?? it.manageBatch);
      if (isBatch && (it.receivedQty || 0) > 0) {
        if (!it.manufactureDate?.trim()) {
          showToast(`${it.productCode}: đang quản lý batch — bắt buộc Ngày SX (MFG).`, 'error');
          return false;
        }
        if (!it.expiryDate?.trim()) {
          showToast(`${it.productCode}: đang quản lý batch — bắt buộc Hạn SD (EXP).`, 'error');
          return false;
        }
      }
    }

    return true;
  };

  const buildCreateCommand = (autoComplete: boolean) => ({
    purchaseOrderId: selectedPoId,
    supplierId,
    branchId,
    invoiceNo: invoiceNo || undefined,
    freightFee: 0,
    discountAmount,
    vatPercent,
    paymentMethod: mapPaymentMethod(paymentMethod),
    note: notes || undefined,
    autoComplete,
    lines: items.map((it) => {
      const delivered = it.receivedQty || 0;
      const key = String(it.purchaseOrderDetailId || it.productId || it.productCode);
      const siblings = items.filter(
        (x) => String(x.purchaseOrderDetailId || x.productId || x.productCode) === key
      );
      const ordered = siblings[0]?.orderedQty ?? it.orderedQty;
      const sumReceived = siblings.reduce((s, r) => s + (r.receivedQty || 0), 0);
      const isShort = sumReceived < ordered;
      const isFirstInGroup = siblings[0]?.id === it.id;
      const rejected = isFirstInGroup && isShort ? ordered - sumReceived : 0;
      const groupReason =
        siblings.find((r) => r.rejectionReason)?.rejectionReason || it.rejectionReason;
      const isBatch = Boolean(it.hasBatches ?? it.manageBatch);
      return {
        productId: it.productId,
        purchaseOrderDetailId: it.purchaseOrderDetailId,
        orderedQty: it.orderedQty,
        deliveredQty: delivered + rejected,
        acceptedQty: delivered,
        rejectedQty: rejected,
        unitPrice: it.unitPrice,
        manageBatch: isBatch,
        batchCode: isBatch ? it.batchCode || undefined : undefined,
        manufactureDate: isBatch ? it.manufactureDate || undefined : undefined,
        expiryDate: isBatch ? it.expiryDate || undefined : undefined,
        rejectionReason: isShort ? groupReason || 'SHORT_DELIVERY' : undefined,
        rejectionNote: it.rejectionNote,
        note: it.note,
      };
    }),
  });

  const submitReceipt = async (autoComplete: boolean, redirectToReturn = false) => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      // Phiếu DRAFT đã có: hủy rồi tạo lại để lưu đúng kiểm đếm (API chưa có update dòng)
      if (!isCreateMode && id && receiptStatus === 'DRAFT') {
        await goodsReceiptApi.cancelGoodsReceipt(
          id,
          autoComplete
            ? 'Cập nhật kiểm đếm và hoàn tất nhập kho'
            : 'Cập nhật kiểm đếm phiếu nháp'
        );
      }

      const created = await goodsReceiptApi.createGoodsReceipt(buildCreateCommand(autoComplete));
      const hasAutoReturn = autoComplete && !!created.createdReturnCode;
      showToast(
        autoComplete
          ? hasAutoReturn
            ? `Hoàn tất nhập kho ${created.code} & Đã lập Phiếu trả hàng ${created.createdReturnCode} (Từ chối nhận hàng — Tài xế chở về ngay)!`
            : `Hoàn tất nhập kho ${created.code}. Tồn kho đã được cập nhật.`
          : `Đã lưu nháp phiếu ${created.code}.`,
        'success'
      );
      setTimeout(() => {
        if (redirectToReturn && created.createdReturnId) {
          navigate(`/store-owner/supplier-returns/${created.createdReturnId}`);
        } else if (redirectToReturn) {
          navigate('/store-owner/supplier-returns');
        } else {
          navigate(listPath);
        }
      }, 950);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Lưu phiếu nhập kho thất bại.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    void submitReceipt(false);
  };

  const executeCompleteReceipt = (_forcedStatus?: GrnStatus, redirectToReturn = false) => {
    void submitReceipt(true, redirectToReturn);
  };

  const hasGroupMismatch = () => {
    const groups = new Map<string, { ordered: number; accepted: number }>();
    for (const it of items) {
      const key = String(it.purchaseOrderDetailId || it.productId || it.productCode);
      const cur = groups.get(key) || { ordered: it.orderedQty, accepted: 0 };
      cur.accepted += (it.acceptedQty ?? it.receivedQty) || 0;
      groups.set(key, cur);
    }
    return [...groups.values()].some((g) => g.accepted !== g.ordered);
  };

  const handleComplete = () => {
    if (!validateForm()) return;
    if (hasGroupMismatch()) {
      setIsMismatchModalOpen(true);
      return;
    }
    executeCompleteReceipt('CONFIRMED');
  };

  const handleCompleteAndPrint = () => {
    if (!validateForm()) return;
    if (hasGroupMismatch()) {
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
          padding: '10px 14px',
          borderRadius: 8,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          fontSize: 12.5,
          color: '#1e3a8a',
          lineHeight: 1.5,
        }}
      >
        <b>Quy tắc nhập (1 lần / PO):</b> Giá dòng = giá PO (không đổi lúc nhận). Hoàn tất phiếu → PO{' '}
        <b>COMPLETED</b> kể cả giao thiếu; phần thiếu phải <b>đặt bù đơn mới</b>, không tạo GRN thứ 2 trên cùng PO.
      </div>

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
              {isConfirmMode
                ? `Xác nhận nhập kho — ${grnNo}`
                : isEditMode
                  ? `Sửa phiếu nhập kho ${grnNo}`
                  : isCreateMode
                    ? 'Lập phiếu nhập kho từ đơn PO (Goods Receipt Note)'
                    : `Chi tiết phiếu nhập kho ${grnNo}`}
            </span>
            {isSaving && <Loader2 size={16} className="animate-spin" color="#0d9488" />}
          </h1>
          <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
            Đối soát số lượng thực nhận, kiểm tra hạn sử dụng FEFO và tính chi phí nhập kho
          </p>
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
        readOnly={isReadOnly || !isCreateMode}
        onBranchChange={setBranchId}
        onPoChange={handlePoChange}
        onInvoiceNoChange={setInvoiceNo}
        onPaymentTermChange={setPaymentTerm}
        onPaymentMethodChange={setPaymentMethod}
      />

      <GrnProductEntryTable
        items={items}
        readOnly={isReadOnly}
        onItemChange={handleItemChange}
        onRemoveRow={handleRemoveRow}
        onSplitLot={handleSplitLot}
      />

      <GrnCostSummaryCard
        notes={notes}
        costs={costs}
        readOnly={isReadOnly}
        onNotesChange={setNotes}
        onDiscountChange={setDiscountAmount}
        onVatPercentChange={setVatPercent}
      />

      <GrnFormActionBar
        readOnly={isReadOnly}
        onCancel={() => navigate(listPath)}
        onSaveDraft={handleSaveDraft}
        onCompleteAndPrint={handleCompleteAndPrint}
        onComplete={handleComplete}
      />

      <GrnMismatchConfirmModal
        isOpen={isMismatchModalOpen}
        mismatchedItems={items.filter(
          (it) => (it.receivedQty || 0) !== it.orderedQty
        )}
        onClose={() => setIsMismatchModalOpen(false)}
        onConfirm={(redirectToReturn) => {
          setIsMismatchModalOpen(false);
          executeCompleteReceipt('MISMATCH', redirectToReturn);
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
