import { useState, useMemo, useEffect, useRef } from 'react';
import { AN_NHIEN_BRANCHES } from '../mock/posMockData';
import { useAuthStore } from '../../../stores/useAuthStore';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Barcode,
  ShoppingCart,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Store,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { mockProductsStockLookup } from '../mock/inventoryMockData';
import {
  ProductStockLookupDTO,
  BranchStockDTO,
  FefoBatchDTO,
  ProductUnitPricingDTO,
} from '../types/inventory.types';
import { employeeApi } from '../../employee/api/employeeApi';
import { posOrderApi } from '../api/posOrderApi';
import { posInventoryApi, type InventoryBatchDto } from '../api/posInventoryApi';
import '../pos.css';

const isValidGuid = (id?: string): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

const formatDateDdMmYyyy = (iso: string | null | undefined, emptyLabel = '—'): string => {
  if (!iso) return emptyLabel;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return emptyLabel;
  return parsed.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getExpiryRiskLevel = (
  daysLeft: number | null
): 'urgent' | 'near_expiry' | 'clearance_priority' | 'safe' => {
  if (daysLeft === null) return 'safe';
  if (daysLeft <= 7) return 'urgent';
  if (daysLeft <= 14) return 'near_expiry';
  if (daysLeft <= 30) return 'clearance_priority';
  return 'safe';
};

const mapInventoryBatchesToFefo = (
  apiBatches: InventoryBatchDto[],
  product: { productId: string; name: string; baseUnit: string }
): FefoBatchDTO[] => {
  const sorted = [...apiBatches].sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    const aMfg = a.mfgDate ? new Date(a.mfgDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bMfg = b.mfgDate ? new Date(b.mfgDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aMfg - bMfg;
  });

  return sorted.map(
    (b, idx) =>
      new FefoBatchDTO({
        batchId: b.batchId,
        batchCode: b.batchCode || b.batchId,
        productId: product.productId,
        productName: product.name,
        supplierName: '',
        mfgDate: formatDateDdMmYyyy(b.mfgDate),
        expDate: formatDateDdMmYyyy(b.expiryDate, 'Không giới hạn'),
        daysRemaining: b.daysLeft,
        quantityOnHand: b.quantityOnHand,
        reservedQty: b.reservedQty,
        availableQty: b.availableQty,
        unitName: product.baseUnit,
        fefoPriorityRank: idx + 1,
        expiryRiskLevel: getExpiryRiskLevel(b.daysLeft),
      })
  );
};

export const InventoryLookupPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route gốc quay lại POS
  const salesPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/employee')
      ? '/employee/pos'
      : '/pos';

  // State tìm kiếm & Danh mục
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Danh sách chi nhánh từ Backend API
  const [dbBranches, setDbBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    employeeApi
      .getBranches()
      .then((list) => {
        if (mounted && list && list.length > 0) {
          setDbBranches(list);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setBranchesLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Thông tin phân quyền & Chi nhánh tài khoản
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER' || user?.role === 'ADMIN';

  // Danh sách chi nhánh duy nhất (loại bỏ trùng lặp tên)
  const availableBranches = useMemo(() => {
    const seenNames = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];

    const addBranch = (id: string, name: string) => {
      if (!name) return;
      const norm = name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        list.push({ id, name: name.trim() });
      }
    };

    if (dbBranches && dbBranches.length > 0) {
      dbBranches.forEach((b) => addBranch(b.id, b.name));
    } else {
      AN_NHIEN_BRANCHES.forEach((b) => addBranch(b.id, b.name));
    }
    return list;
  }, [dbBranches]);

  // Chi nhánh nhân viên trực thuộc (cố định)
  const employeeBranchId = useMemo(() => {
    if (user?.branchId) return user.branchId;
    if (user?.phone === '0917778888') return dbBranches[0]?.id || 'BR-AN-01'; // Ba Đình
    if (user?.phone === '0916667777') return dbBranches[1]?.id || 'BR-AN-02'; // Cầu Giấy
    return dbBranches[0]?.id || 'BR-AN-01';
  }, [user, dbBranches]);

  // STORE_OWNER có quyền chọn chi nhánh bất kỳ; EMPLOYEE bị khóa cố định theo chi nhánh được gán
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return isStoreOwner ? (dbBranches[0]?.id || 'BR-AN-01') : employeeBranchId;
  });

  // Đồng bộ khi user đổi vai trò hoặc chi nhánh hoặc tải xong dbBranches
  useEffect(() => {
    if (!isStoreOwner) {
      setSelectedBranchId(employeeBranchId);
    } else if (selectedBranchId.startsWith('BR-') && dbBranches.length > 0) {
      // Map mock ID sang DB ID thật nếu có
      if (selectedBranchId === 'BR-AN-01' && dbBranches[0]) setSelectedBranchId(dbBranches[0].id);
      else if (selectedBranchId === 'BR-AN-02' && dbBranches[1]) setSelectedBranchId(dbBranches[1].id);
      else if (selectedBranchId === 'BR-AN-03' && dbBranches[2]) setSelectedBranchId(dbBranches[2].id);
      else setSelectedBranchId(dbBranches[0].id);
    } else if (!isValidGuid(selectedBranchId) && dbBranches.length > 0) {
      setSelectedBranchId(dbBranches[0].id);
    }
  }, [isStoreOwner, employeeBranchId, dbBranches, selectedBranchId]);

  const currentBranch = useMemo(() => {
    return availableBranches.find((b) => b.id === selectedBranchId || b.name.includes(selectedBranchId)) || availableBranches[0] || AN_NHIEN_BRANCHES[0];
  }, [availableBranches, selectedBranchId]);

  // Nạp danh mục sản phẩm và tồn kho thực tế từ Backend API theo chi nhánh đang chọn
  const [backendProducts, setBackendProducts] = useState<ProductStockLookupDTO[]>([]);
  const [hasLoadedBackendProducts, setHasLoadedBackendProducts] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const activeBranchGuid = useMemo(() => {
    if (isValidGuid(selectedBranchId)) return selectedBranchId;
    if (isValidGuid(dbBranches[0]?.id)) return dbBranches[0].id;
    return '';
  }, [selectedBranchId, dbBranches]);

  useEffect(() => {
    if (!activeBranchGuid) {
      return;
    }

    const controller = new AbortController();
    setProductsLoading(true);
    setProductsError(null);

    posOrderApi
      .getAllProducts(activeBranchGuid, controller.signal)
      .then((apiProds) => {
        if (controller.signal.aborted) return;
        const mapped: ProductStockLookupDTO[] = (apiProds || []).map((p) => {
          const qty = p.quantityOnHand || 0;
          const cat = p.category || 'Chung';
          return new ProductStockLookupDTO({
            productId: p.id,
            sku: p.sku || `SP-${p.id.slice(0, 6)}`,
            barcode: p.barcode || '',
            name: p.name,
            categoryName: cat,
            categoryCode: cat,
            totalSystemStock: qty,
            baseUnit: p.baseUnit || 'cái',
            prices:
              p.unitPrices && p.unitPrices.length > 0
                ? p.unitPrices.map(
                    (u) =>
                      new ProductUnitPricingDTO({
                        unitId: u.unitId,
                        unitName: u.unitName,
                        conversionFactor: u.conversionRate,
                        retailPrice: u.price,
                        isBaseUnit: u.isBaseUnit,
                      })
                  )
                : [
                    new ProductUnitPricingDTO({
                      unitId: 'base',
                      unitName: p.baseUnit || 'cái',
                      conversionFactor: 1,
                      retailPrice: p.basePrice || 0,
                      isBaseUnit: true,
                    }),
                  ],
            branchStocks: [
              new BranchStockDTO({
                branchId: activeBranchGuid,
                branchName: currentBranch?.name || 'Chi nhánh hiện tại',
                address: 'Hà Nội',
                physicalStock: qty,
                onHoldStock: 0,
                availableStock: qty,
                minSafetyThreshold: 10,
                unitName: p.baseUnit || 'cái',
                isCurrentBranch: true,
                status: qty <= 5 ? 'low' : 'sufficient',
              }),
            ],
            batches: [],
          });
        });
        setBackendProducts(mapped);
        setHasLoadedBackendProducts(true);
        setProductsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const e = err as { name?: string; code?: string };
        if (e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
          return;
        }
        setProductsError('Không thể tải danh sách sản phẩm theo chi nhánh từ máy chủ.');
        setProductsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [activeBranchGuid, currentBranch?.name]);

  // Chỉ fallback mock khi đã kiểm tra chi nhánh nhưng không có kết nối Backend hợp lệ
  const isMockMode = branchesLoaded && !activeBranchGuid;

  const allStockProducts = useMemo(() => {
    if (hasLoadedBackendProducts || activeBranchGuid) {
      return backendProducts;
    }
    if (isMockMode) {
      return mockProductsStockLookup;
    }
    return [];
  }, [hasLoadedBackendProducts, activeBranchGuid, backendProducts, isMockMode]);

  // Sản phẩm đang được chọn xem chi tiết (chỉ chọn sau khi tìm tên/SKU hoặc quét mã vạch)
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const hasActiveLookup = searchQuery.trim().length > 0 || selectedCategory !== 'ALL';

  const selectedProduct = useMemo(() => {
    if (!selectedProductId || allStockProducts.length === 0) return null;
    return allStockProducts.find((p) => p.productId === selectedProductId) || null;
  }, [allStockProducts, selectedProductId]);

  // Danh sách Lô hàng FEFO và tồn kho đa chi nhánh thực tế của sản phẩm đang chọn
  const [currentBatches, setCurrentBatches] = useState<FefoBatchDTO[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [multiBranchStocks, setMultiBranchStocks] = useState<BranchStockDTO[] | null>(null);

  useEffect(() => {
    if (!selectedProduct) {
      setCurrentBatches([]);
      setMultiBranchStocks(null);
      setBatchesLoading(false);
      setBatchesError(null);
      return;
    }

    if (!activeBranchGuid || !isValidGuid(selectedProduct.productId)) {
      setCurrentBatches(selectedProduct.batches);
      setMultiBranchStocks(null);
      setBatchesLoading(false);
      setBatchesError(null);
      return;
    }

    const controller = new AbortController();
    setBatchesLoading(true);
    setBatchesError(null);
    setCurrentBatches([]);
    setMultiBranchStocks(null);

    const keyword = selectedProduct.sku || selectedProduct.name;

    Promise.allSettled([
      posInventoryApi.getProductBatches(selectedProduct.productId, activeBranchGuid, controller.signal),
      posInventoryApi.getInventorySummary({ keyword, pageSize: 100 }, controller.signal),
    ]).then(([batchesResult, summaryResult]) => {
      if (controller.signal.aborted) return;

      let resolvedBatches: FefoBatchDTO[] = [];
      if (batchesResult.status === 'fulfilled') {
        resolvedBatches = mapInventoryBatchesToFefo(batchesResult.value, {
          productId: selectedProduct.productId,
          name: selectedProduct.name,
          baseUnit: selectedProduct.baseUnit,
        });
        setCurrentBatches(resolvedBatches);
        setBatchesError(null);
      } else {
        const err = batchesResult.reason as { name?: string; code?: string };
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError' && err?.code !== 'ERR_CANCELED') {
          setCurrentBatches([]);
          setBatchesError('Không thể tải danh sách lô FEFO từ máy chủ.');
        }
      }

      if (summaryResult.status === 'fulfilled' && summaryResult.value?.items) {
        const matchedItems = summaryResult.value.items.filter(
          (item) => item.productId === selectedProduct.productId
        );

        const branchList: BranchStockDTO[] = availableBranches.map((br) => {
          const item = matchedItems.find((m) => m.branchId === br.id);
          if (item) {
            const batchReservedSum = Array.isArray(item.batches)
              ? item.batches.reduce((sum, b) => sum + (b.reservedQty || 0), 0)
              : Math.max(0, item.physicalQty - item.availableQty - item.expiredQty);
            const avail = item.availableQty;
            const minThreshold = item.minStock || 10;
            const status: 'low' | 'sufficient' | 'abundant' =
              avail <= minThreshold ? 'low' : avail >= minThreshold * 3 ? 'abundant' : 'sufficient';
            return new BranchStockDTO({
              branchId: br.id,
              branchName: item.branchName || br.name,
              address: 'Hà Nội',
              physicalStock: item.physicalQty,
              onHoldStock: batchReservedSum,
              availableStock: avail,
              minSafetyThreshold: minThreshold,
              unitName: item.unit || selectedProduct.baseUnit,
              isCurrentBranch: br.id === activeBranchGuid,
              status,
            });
          }

          const isCurrent = br.id === activeBranchGuid;
          const batchPhysical = isCurrent
            ? resolvedBatches.reduce((sum, b) => sum + (b.quantityOnHand ?? b.availableQty), 0)
            : 0;
          const batchReserved = isCurrent
            ? resolvedBatches.reduce((sum, b) => sum + (b.reservedQty ?? 0), 0)
            : 0;
          const batchAvail = isCurrent
            ? resolvedBatches.reduce((sum, b) => sum + b.availableQty, 0)
            : 0;
          const avail = isCurrent && resolvedBatches.length > 0 ? batchAvail : isCurrent ? selectedProduct.totalSystemStock : 0;
          const phys = isCurrent && resolvedBatches.length > 0 ? batchPhysical : avail;
          return new BranchStockDTO({
            branchId: br.id,
            branchName: br.name,
            address: 'Hà Nội',
            physicalStock: phys,
            onHoldStock: batchReserved,
            availableStock: avail,
            minSafetyThreshold: 10,
            unitName: selectedProduct.baseUnit,
            isCurrentBranch: isCurrent,
            status: avail <= 10 ? 'low' : 'sufficient',
          });
        });
        setMultiBranchStocks(branchList);
      } else if (batchesResult.status === 'fulfilled') {
        const batchPhysical = resolvedBatches.reduce((sum, b) => sum + (b.quantityOnHand ?? b.availableQty), 0);
        const batchReserved = resolvedBatches.reduce((sum, b) => sum + (b.reservedQty ?? 0), 0);
        const batchAvail = resolvedBatches.reduce((sum, b) => sum + b.availableQty, 0);
        setMultiBranchStocks([
          new BranchStockDTO({
            branchId: activeBranchGuid,
            branchName: currentBranch?.name || 'Chi nhánh hiện tại',
            address: 'Hà Nội',
            physicalStock: batchPhysical,
            onHoldStock: batchReserved,
            availableStock: batchAvail,
            minSafetyThreshold: 10,
            unitName: selectedProduct.baseUnit,
            isCurrentBranch: true,
            status: batchAvail <= 10 ? 'low' : 'sufficient',
          }),
        ]);
      }

      setBatchesLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [selectedProduct?.productId, selectedProduct?.sku, selectedProduct?.name, selectedProduct?.baseUnit, activeBranchGuid, availableBranches, currentBranch?.name]);

  const batchSummary = useMemo(() => {
    return currentBatches.reduce(
      (acc, b) => ({
        physical: acc.physical + (b.quantityOnHand ?? b.availableQty),
        reserved: acc.reserved + (b.reservedQty ?? 0),
        available: acc.available + b.availableQty,
      }),
      { physical: 0, reserved: 0, available: 0 }
    );
  }, [currentBatches]);

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [selectedBatchForClearance, setSelectedBatchForClearance] = useState<FefoBatchDTO | null>(null);

  // Form chuyển kho
  const [transferFromBranch, setTransferFromBranch] = useState('');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [transferNotes, setTransferNotes] = useState('');

  // Ánh xạ danh sách chi nhánh tồn kho theo chuỗi An Nhiên Mart
  const displayedBranchStocks = useMemo(() => {
    if (!selectedProduct) return [];
    if (multiBranchStocks && multiBranchStocks.length > 0) {
      return multiBranchStocks;
    }

    return selectedProduct.branchStocks.map((b) => {
      let branchName = b.branchName;
      let branchId = b.branchId;
      let address = b.address;

      if (b.branchId === 'BR-01') {
        branchId = 'BR-AN-01';
        branchName = 'An Nhiên Mart - Chi nhánh Ba Đình';
        address = '120 Hoàng Hoa Thám, Tây Hồ, Hà Nội';
      } else if (b.branchId === 'BR-02') {
        branchId = 'BR-AN-02';
        branchName = 'An Nhiên Mart - Chi nhánh Cầu Giấy';
        address = '268 Cầu Giấy, Q. Cầu Giấy, Hà Nội';
      } else if (b.branchId === 'BR-03') {
        branchId = 'BR-AN-03';
        branchName = 'An Nhiên Mart - Chi nhánh Đống Đa';
        address = '85 Chùa Bộc, Q. Đống Đa, Hà Nội';
      }

      const isCurrent = branchId === selectedBranchId || branchName === currentBranch.name;
      return {
        ...b,
        branchId,
        branchName,
        address,
        isCurrentBranch: isCurrent,
      };
    });
  }, [selectedProduct, multiBranchStocks, selectedBranchId, currentBranch]);

  const displayedTotalSystemStock = useMemo(() => {
    if (multiBranchStocks && multiBranchStocks.length > 0) {
      return multiBranchStocks.reduce((sum, b) => sum + b.availableStock, 0);
    }
    return selectedProduct?.totalSystemStock ?? 0;
  }, [multiBranchStocks, selectedProduct]);

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ value: string; label: string }> = [];
    allStockProducts.forEach((p) => {
      const val = p.categoryCode || p.categoryName;
      const label = p.categoryName || p.categoryCode;
      if (val && !seen.has(val)) {
        seen.add(val);
        opts.push({ value: val, label });
      }
    });
    return opts;
  }, [allStockProducts]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Lọc kết quả tìm kiếm sản phẩm theo từ khóa / mã vạch / ngành hàng (không hiển thị gợi ý khi chưa nhập)
  const filteredProducts = useMemo(() => {
    if (!hasActiveLookup) return [];
    const q = searchQuery.trim().toLowerCase();
    return allStockProducts.filter((p) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        p.categoryCode === selectedCategory ||
        p.categoryName === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [allStockProducts, searchQuery, selectedCategory, hasActiveLookup]);

  // Tự động khớp sản phẩm khi quét đúng mã Barcode / SKU; xóa chọn nếu người dùng xóa tìm kiếm
  useEffect(() => {
    if (!hasActiveLookup) {
      if (selectedProductId) setSelectedProductId('');
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const exactMatch = filteredProducts.find(
        (p) => (p.barcode && p.barcode.toLowerCase() === q) || p.sku.toLowerCase() === q
      );
      if (exactMatch && exactMatch.productId !== selectedProductId) {
        setSelectedProductId(exactMatch.productId);
        return;
      }
    }

    if (selectedProductId && !filteredProducts.some((p) => p.productId === selectedProductId)) {
      setSelectedProductId('');
    }
  }, [hasActiveLookup, searchQuery, filteredProducts, selectedProductId]);

  const handleBarcodeOrSearchSubmit = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      searchInputRef.current?.focus();
      showToast('Vui lòng nhập tên sản phẩm, mã SKU hoặc quét mã vạch Barcode để tra cứu.');
      return;
    }
    const exactBarcode = filteredProducts.find((p) => (p.barcode || '').toLowerCase() === q);
    const exactSku = filteredProducts.find((p) => p.sku.toLowerCase() === q);
    const target = exactBarcode || exactSku || filteredProducts[0];
    if (target) {
      setSelectedProductId(target.productId);
      showToast(`Đã tìm thấy sản phẩm: ${target.name} (${target.barcode || target.sku})`);
    } else {
      setSelectedProductId('');
      showToast(`Không tìm thấy sản phẩm khớp "${searchQuery.trim()}"`);
    }
  };

  // Đổi sản phẩm được chọn
  const handleSelectProduct = (product: ProductStockLookupDTO) => {
    setSelectedProductId(product.productId);
    showToast(`Đã chọn xem tồn kho & lô của ${product.name}`);
  };

  // Đưa vào giỏ hàng POS
  const handleAddToCartPOS = (product: ProductStockLookupDTO | null, batch?: FefoBatchDTO) => {
    if (!product) return;
    try {
      const chosenBatch = batch || currentBatches[0];
      const batchLabel = chosenBatch?.batchCode || chosenBatch?.batchId;
      const payload = {
        productId: product.productId,
        productName: product.name,
        barcode: product.barcode,
        batchId: chosenBatch?.batchId,
        batchCode: chosenBatch?.batchCode,
        unitPrice: product.prices[0]?.retailPrice || 10000,
        unitName: product.baseUnit,
        quantity: 1,
      };
      sessionStorage.setItem('pos_selected_product_batch', JSON.stringify(payload));
      showToast(
        batchLabel
          ? `Đã chọn ${product.name} (Lô ${batchLabel}) đưa vào quầy POS!`
          : `Đã chọn ${product.name} đưa vào quầy POS!`
      );
      setTimeout(() => {
        navigate(salesPath);
      }, 600);
    } catch {
      navigate(salesPath);
    }
  };

  // Mở modal xả hàng cho lô
  const handleOpenClearance = (batch: FefoBatchDTO) => {
    setSelectedBatchForClearance(batch);
    setIsClearanceModalOpen(true);
  };

  // Xác nhận xả hàng
  const handleConfirmClearance = () => {
    if (!selectedBatchForClearance) return;
    setCurrentBatches((prev) =>
      prev.map((b) =>
        b.batchId === selectedBatchForClearance.batchId
          ? { ...b, isClearanceDiscountApplied: true, clearanceDiscountPercent: 20 }
          : b
      )
    );
    setIsClearanceModalOpen(false);
    showToast(
      `Đã kích hoạt xả hàng -20% cho lô ${selectedBatchForClearance.batchCode || selectedBatchForClearance.batchId}!`
    );
  };

  // Gửi yêu cầu chuyển kho
  const handleSubmitTransfer = () => {
    if (!selectedProduct) return;
    setIsTransferModalOpen(false);
    showToast(`Đã lập yêu cầu chuyển ${transferQty} ${selectedProduct.baseUnit} từ ${transferFromBranch || currentBranch.name}!`);
    setTransferNotes('');
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* 1. UNIFIED SINGLE HEADER - ĐỒNG BỘ 100% VỚI SỔ QUỸ & CA THU NGÂN */}
      <header className="pos-shift-unified-header">
        {/* Khối trái: Nút quay lại bán hàng + Tên màn hình */}
        <div className="unified-header-left">
          <button
            type="button"
            className="pos-back-to-sales-btn"
            onClick={() => navigate(salesPath)}
            title="Quay lại quầy bán hàng POS"
          >
            <ArrowLeft size={15} />
            <span>Bán Hàng</span>
          </button>

          <div className="unified-header-divider" />

          <div className="unified-header-title-box">
            <h1 className="unified-header-title">Tra Cứu Tồn Kho &amp; Lô Hạn Dùng FEFO</h1>
            <div className="unified-header-subtitle">
              {currentBranch?.name || 'Chi nhánh trung tâm'} &bull; Xuất trước hết hạn trước &bull; Đồng bộ thời gian thực
            </div>
          </div>
        </div>


        {/* Khối phải: Thao tác & Thu ngân badge */}
        <div className="unified-header-right">
          <button
            type="button"
            className="pos-btn-secondary-pill"
            disabled={!selectedProduct}
            onClick={() => {
              const firstSource = displayedBranchStocks.find((b) => !b.isCurrentBranch);
              if (firstSource) setTransferFromBranch(firstSource.branchName);
              setIsTransferModalOpen(true);
            }}
            title="Tạo phiếu yêu cầu điều chuyển kho nội bộ"
          >
            <ArrowRightLeft size={14} />
            <span>Yêu Cầu Chuyển Kho</span>
          </button>

          <button
            type="button"
            className="pos-btn-primary-pill"
            disabled={!selectedProduct}
            onClick={() => handleAddToCartPOS(selectedProduct)}
            title="Đưa sản phẩm đang chọn về giỏ hàng POS"
          >
            <ShoppingCart size={14} />
            <span>Bán Hàng [F1]</span>
          </button>

          <div
            className="pos-cashier-badge"
            style={{
              border: isStoreOwner ? '1px solid #10b981' : '1px solid #cbd5e1',
              backgroundColor: isStoreOwner ? '#ecfdf5' : '#f8fafc',
            }}
          >
            {isStoreOwner ? (
              <span style={{ color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} color="#047857" /> {user?.fullName || 'Trần Quốc An'} (Chủ Chuỗi)
              </span>
            ) : (
              <span style={{ color: '#334155' }}>
                NV: <b>{user?.fullName || 'Thu ngân'}</b> ({currentBranch?.name.split(' - ')[1] || 'Ba Đình'})
              </span>
            )}
          </div>
        </div>
      </header>

      {/* TOAST THÔNG BÁO TẠI QUẦY */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 20,
            zIndex: 99999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 9999,
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. BODY CONTAINER CUỘN CHÍNH - ĐỒNG BỘ LAYOUT SHIFT CONTENT */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto">
        <div className="shift-content-layout">
          {/* THANH TRẠNG THÁI (INFO BAR CARD) CHUẨN POS */}
          <div className="shift-info-bar-card">
            <div className="info-bar-item" style={{ minWidth: 260 }}>
              <span className="info-label">Điểm bán quầy:</span>
              {isStoreOwner ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => {
                      setSelectedBranchId(e.target.value);
                      showToast(`Đã chuyển tra cứu tồn kho sang: ${availableBranches.find(b => b.id === e.target.value)?.name || e.target.value}`);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1.5px solid #0f766e',
                      backgroundColor: '#f0fdfa',
                      color: '#0f766e',
                      fontWeight: 700,
                      fontSize: 12.5,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                    title="Chủ cửa hàng đổi chi nhánh tra cứu tồn kho"
                  >
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="info-value font-semibold text-slate-800">
                  {currentBranch?.name}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    Cố định theo tài khoản
                  </span>
                </span>
              )}
            </div>
            <div className="info-bar-item">
              <span className="info-label">Nguyên tắc xuất kho:</span>
              <span className="info-value text-teal-700 font-semibold">FEFO (Hạn gần xuất trước)</span>
            </div>
            <div className="info-bar-item">
              <span className="info-label">Tình trạng đồng bộ:</span>
              <span className="info-value font-semibold">Thời gian thực toàn hệ thống</span>
            </div>
          </div>

          {/* KHUNG TRA CỨU THEO TÊN SẢN PHẨM HOẶC QUÉT MÃ BARCODE */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <h3 className="pos-shift-card-title">
                <Search size={16} className="text-teal-700" />
                <span>Tra cứu sản phẩm &amp; Quét mã Barcode</span>
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px auto', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="filter-select w-full"
                  style={{ paddingLeft: 34, paddingRight: searchQuery ? 32 : 12, height: 36 }}
                  placeholder="Quét mã Barcode hoặc nhập tên sản phẩm / mã SKU để tra cứu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeOrSearchSubmit();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedProductId('');
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                className="filter-select"
                style={{ height: 36 }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Tất cả nhóm ngành hàng</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="pos-btn-secondary-pill"
                  onClick={handleBarcodeOrSearchSubmit}
                  title="Tìm theo mã vừa nhập hoặc đưa con trỏ vào ô quét mã vạch"
                >
                  <Barcode size={14} />
                  <span>Quét Barcode</span>
                </button>
              </div>
            </div>

            {!hasActiveLookup ? (
              <div
                style={{
                  marginTop: 14,
                  padding: '16px 14px',
                  borderRadius: 8,
                  border: '1px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  fontSize: 12.5,
                  textAlign: 'center',
                }}
              >
                {productsError ? (
                  <span role="alert" style={{ color: '#dc2626', fontWeight: 600 }}>
                    {productsError}
                  </span>
                ) : productsLoading ? (
                  <span>Đang đồng bộ danh mục sản phẩm của chi nhánh...</span>
                ) : (
                  <span>
                    Vui lòng quét mã Barcode hoặc nhập tên / mã SKU sản phẩm vào ô tìm kiếm để xem tồn kho &amp; các lô hạn dùng FEFO.
                  </span>
                )}
              </div>
            ) : (
              /* KẾT QUẢ TÌM KIẾM / QUÉT MÃ - CĂN CỘT BẢNG CỐ ĐỊNH */
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Kết quả tìm kiếm ({filteredProducts.length} sản phẩm):
                </div>
                <div className="pos-autocomplete-box">
                  <table className="pos-autocomplete-table">
                    <colgroup>
                      <col style={{ width: '42%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                      <tr className="pos-autocomplete-header-tr">
                        <th style={{ textAlign: 'left', padding: '8px 14px' }}>Sản phẩm &amp; Mã vạch</th>
                        <th style={{ textAlign: 'center', padding: '8px 14px' }}>Đơn giá niêm yết</th>
                        <th style={{ textAlign: 'center', padding: '8px 14px' }}>Tồn quầy hiện tại</th>
                        <th style={{ textAlign: 'center', padding: '8px 14px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsLoading ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '16px 14px', color: '#64748b' }}>
                            Đang tải danh sách sản phẩm...
                          </td>
                        </tr>
                      ) : productsError ? (
                        <tr role="alert">
                          <td colSpan={4} style={{ textAlign: 'center', padding: '16px 14px', color: '#dc2626' }}>
                            {productsError}
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '16px 14px', color: '#64748b' }}>
                            Không tìm thấy sản phẩm khớp mã hoặc tên vừa nhập tại chi nhánh này.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isSelected = selectedProduct?.productId === p.productId;
                          const branchStock = p.branchStocks.find((bs) => bs.branchId === selectedBranchId) || p.branchStocks[0];
                          const avail = branchStock?.availableStock ?? 0;
                          return (
                            <tr
                              key={p.productId}
                              className={`pos-autocomplete-row ${isSelected ? 'active' : ''}`}
                              onClick={() => handleSelectProduct(p)}
                            >
                              <td style={{ padding: '8px 14px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>
                                  {p.sku} - {p.name}
                                </div>
                                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                                  Barcode: {p.barcode || 'Chưa có'} &bull; Quy cách: {p.baseUnit}
                                </div>
                              </td>

                              <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                                <span style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>
                                  {p.prices[0]?.retailPrice.toLocaleString('vi-VN')} đ
                                </span>
                                <span style={{ color: '#64748b', fontSize: 11 }}> / {p.baseUnit}</span>
                              </td>

                              <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <span
                                    className={`shift-status-badge ${avail > 15 ? 'on-duty' : ''}`}
                                    style={{
                                      minWidth: 130,
                                      justifyContent: 'center',
                                      ...(avail <= 15
                                        ? { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }
                                        : {}),
                                    }}
                                  >
                                    Tồn quầy: {avail} {p.baseUnit}
                                  </span>
                                </div>
                              </td>

                              <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                                <button
                                  type="button"
                                  className={isSelected ? 'pos-btn-primary-pill' : 'pos-btn-secondary-pill'}
                                  style={{ height: 28, padding: '0 12px', fontSize: 11, minWidth: 80 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectProduct(p);
                                  }}
                                >
                                  {isSelected ? 'Đang chọn' : 'Chọn xem'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {selectedProduct && (
            <>
          {/* CARD TÓM TẮT SẢN PHẨM ĐANG CHỌN */}
          <div
            className="pos-shift-card"
            style={{
              borderColor: '#99f6e4',
              backgroundColor: '#f0fdfa',
              borderLeft: '4px solid #0f766e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f766e' }}>
                    {selectedProduct.sku} - {selectedProduct.name}
                  </span>
                  <span className="shift-status-badge on-duty">
                    Tổng hệ thống: {displayedTotalSystemStock.toLocaleString('vi-VN')} {selectedProduct.baseUnit}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 6, fontSize: 12, color: '#475569' }}>
                  <div>Mã Barcode: <b style={{ color: '#0f172a' }}>{selectedProduct.barcode || 'Chưa có'}</b></div>
                  <div>Đơn vị tính: <b style={{ color: '#0f172a' }}>{selectedProduct.baseUnit}</b></div>
                  <div>Ngành hàng: <b style={{ color: '#0f172a' }}>{selectedProduct.categoryName}</b></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* GIÁ THEO ĐVT */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {selectedProduct.prices.map((pr) => (
                    <div key={pr.unitId} className="pos-pricing-tier-pill">
                      <span style={{ color: '#64748b' }}>Giá {pr.unitName}</span>
                      <b>{pr.retailPrice.toLocaleString('vi-VN')} đ</b>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="pos-btn-primary-pill"
                  style={{ height: 38, padding: '0 18px', fontSize: 13 }}
                  onClick={() => handleAddToCartPOS(selectedProduct)}
                >
                  <ShoppingCart size={15} />
                  <span>Đưa Vào Giỏ Hàng POS</span>
                </button>
              </div>
            </div>
          </div>

          {/* BẢNG 1: TỒN KHO THỜI GIAN THỰC THEO TỪNG CHI NHÁNH */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <div>
                <h3 className="pos-shift-card-title">
                  <Store size={16} className="text-teal-700" />
                  <span>1. Tồn Kho Thời Gian Thực Theo Từng Chi Nhánh</span>
                </h3>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Dữ liệu phân bổ tồn kho đa điểm bán, cập nhật tự động khi chốt hóa đơn hoặc kiểm kê két.
                </div>
              </div>
            </div>

            <div className="pos-shift-table-responsive">
              <table className="pos-shift-table">
                <thead>
                  <tr>
                    <th>Tên Chi Nhánh / Kho Hàng</th>
                    <th>Địa chỉ kho</th>
                    <th style={{ textAlign: 'right' }}>Tồn kho vật lý</th>
                    <th style={{ textAlign: 'right' }}>Đang giữ đơn</th>
                    <th style={{ textAlign: 'right' }}>Khả dụng bán</th>
                    <th style={{ textAlign: 'center' }}>Định mức min</th>
                    <th style={{ textAlign: 'center' }}>Tình trạng</th>
                    <th style={{ textAlign: 'center' }}>Hành động nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedBranchStocks.map((b) => (
                    <tr
                      key={b.branchId}
                      style={b.isCurrentBranch ? { backgroundColor: '#f0fdfa' } : undefined}
                    >
                      <td>
                        <b style={{ color: '#0f172a' }}>{b.branchName}</b>
                        {b.isCurrentBranch && (
                          <div style={{ color: '#0f766e', fontSize: 11, fontWeight: 600 }}>
                            Quầy thu ngân đang thao tác
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#64748b' }}>{b.address}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {b.physicalStock} {b.unitName}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {b.onHoldStock} {b.unitName}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: b.availableStock < b.minSafetyThreshold ? '#dc2626' : '#0f766e',
                        }}
                      >
                        {b.availableStock} {b.unitName}
                      </td>
                      <td style={{ textAlign: 'center' }}>{b.minSafetyThreshold} {b.unitName}</td>
                      <td style={{ textAlign: 'center' }}>
                        {b.status === 'low' ? (
                          <span className="shift-status-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            <AlertTriangle size={12} /> Dưới định mức
                          </span>
                        ) : b.status === 'abundant' ? (
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Kho dồi dào
                          </span>
                        ) : (
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Đủ tồn kho bán
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {b.isCurrentBranch ? (
                          <span style={{ color: '#0f766e', fontWeight: 600, fontSize: 12 }}>
                            Đang phục vụ tại quầy
                          </span>
                        ) : b.status === 'low' ? (
                          <button
                            type="button"
                            className="pos-btn-secondary-pill"
                            style={{ height: 28, fontSize: 11, color: '#94a3b8' }}
                            onClick={() => showToast('Chi nhánh đang dưới định mức, không thể trích xuất chuyển!')}
                          >
                            Hạn Chế Chuyển
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pos-btn-secondary-pill"
                            style={{ height: 28, fontSize: 11, borderColor: '#0f766e', color: '#0f766e' }}
                            onClick={() => {
                              setTransferFromBranch(b.branchName);
                              setIsTransferModalOpen(true);
                            }}
                          >
                            Yêu Cầu Chuyển Kho
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG 2: CHI TIẾT CÁC LÔ HÀNG THEO NGUYÊN TẮC FEFO */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <div>
                <h3 className="pos-shift-card-title">
                  <Calendar size={16} className="text-teal-700" />
                  <span>2. Quản Lý Lô &amp; Hạn Sử Dụng FEFO</span>
                </h3>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Tự động sắp xếp: Lô có hạn dùng gần nhất được ưu tiên xuất bán trước để tránh hao hụt hủy date.
                </div>
              </div>

              {/* TÓM TẮT SỐ LÔ & HUY HIỆU QUY ƯỚC CẢNH BÁO */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="shift-status-badge on-duty">
                  {currentBatches.length} lô &bull; Tồn: {batchSummary.physical} &bull; Giữ: {batchSummary.reserved} &bull; Khả dụng: {batchSummary.available} {selectedProduct.baseUnit}
                </span>
                <span className="fefo-badge-urgent">&lt; 7 ngày: Khẩn cấp</span>
                <span className="fefo-badge-near">7 - 14 ngày: Cận date cao</span>
                <span className="fefo-badge-clearance">15 - 30 ngày: Ưu tiên xả</span>
                <span className="fefo-badge-safe">&gt; 30 ngày: An toàn</span>
              </div>
            </div>

            <div className="pos-shift-table-responsive">
              <table className="pos-shift-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: 90 }}>Ưu tiên</th>
                    <th>Mã Lô (Batch ID)</th>
                    <th style={{ textAlign: 'center' }}>Ngày Sản Xuất</th>
                    <th style={{ textAlign: 'center' }}>Hạn Dùng </th>
                    <th style={{ textAlign: 'center' }}>Thời gian còn lại</th>
                    <th style={{ textAlign: 'center' }}>Phân loại cảnh báo date</th>
                    <th style={{ textAlign: 'right' }}>Tồn trong lô</th>
                    <th style={{ textAlign: 'right' }}>Đang giữ</th>
                    <th style={{ textAlign: 'right' }}>Tồn khả dụng</th>
                    <th style={{ textAlign: 'center', width: 240 }}>Thao tác quầy thu ngân</th>
                  </tr>
                </thead>
                <tbody>
                  {batchesLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '18px 14px', color: '#64748b' }}>
                        Đang tải danh sách lô FEFO...
                      </td>
                    </tr>
                  ) : batchesError ? (
                    <tr role="alert">
                      <td colSpan={10} style={{ textAlign: 'center', padding: '18px 14px', color: '#dc2626', fontWeight: 600 }}>
                        {batchesError}
                      </td>
                    </tr>
                  ) : currentBatches.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '18px 14px', color: '#64748b' }}>
                        Chưa có lô hàng thực tế nào tại chi nhánh này.
                      </td>
                    </tr>
                  ) : (
                    currentBatches.map((batch) => {
                      const daysLeft = batch.daysRemaining;
                      const isExpired = daysLeft !== null && daysLeft <= 0;
                      const isUrgent = !isExpired && batch.expiryRiskLevel === 'urgent';
                      const isNear = !isExpired && batch.expiryRiskLevel === 'near_expiry';
                      const isClearance = !isExpired && batch.expiryRiskLevel === 'clearance_priority';
                      const onHandQty = batch.quantityOnHand ?? batch.availableQty;
                      const reservedQty = batch.reservedQty ?? 0;

                      return (
                        <tr
                          key={batch.batchId}
                          style={isExpired || isUrgent || isNear ? { backgroundColor: '#fff7ed' } : undefined}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`fefo-rank-tag ${batch.fefoPriorityRank === 1
                                ? 'rank-1'
                                : batch.fefoPriorityRank === 2
                                  ? 'rank-2'
                                  : 'rank-3'
                                }`}
                            >
                              [ #{batch.fefoPriorityRank} ]
                            </span>
                          </td>
                          <td>
                            <b>{batch.batchCode || batch.batchId}</b>
                            {batch.supplierName && (
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                NCC: {batch.supplierName}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>
                            {batch.mfgDate}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            <span
                              style={{
                                color: isExpired || isUrgent ? '#dc2626' : isNear ? '#ea580c' : isClearance ? '#b45309' : '#15803d',
                              }}
                            >
                              {batch.expDate}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontWeight: 600,
                                color: isExpired || isUrgent ? '#dc2626' : isNear ? '#ea580c' : isClearance ? '#b45309' : '#15803d',
                              }}
                            >
                              <Clock size={12} />
                              {daysLeft === null
                                ? 'Không giới hạn'
                                : isExpired
                                  ? daysLeft === 0
                                    ? 'Hết hạn hôm nay'
                                    : `Đã hết hạn (${Math.abs(daysLeft)} ngày)`
                                  : `Còn ${daysLeft} ngày`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isExpired ? (
                              <span className="fefo-badge-urgent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> Đã hết hạn
                              </span>
                            ) : isUrgent ? (
                              <span className="fefo-badge-urgent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> Khẩn cấp (&lt; 7 ngày)
                              </span>
                            ) : isNear ? (
                              <span className="fefo-badge-near" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> Cận Date cao
                              </span>
                            ) : isClearance ? (
                              <span className="fefo-badge-clearance">Ưu tiên xả hàng</span>
                            ) : (
                              <span className="fefo-badge-safe" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Hạn dùng an toàn
                              </span>
                            )}
                            {batch.isClearanceDiscountApplied && (
                              <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <Tag size={11} /> Đã gắn giảm -{batch.clearanceDiscountPercent}%
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {onHandQty} {batch.unitName}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            {reservedQty} {batch.unitName}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {batch.availableQty} {batch.unitName}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="pos-btn-primary-pill"
                                disabled={batch.availableQty <= 0 || isExpired}
                                style={{
                                  height: 28,
                                  padding: '0 12px',
                                  fontSize: 11.5,
                                  opacity: batch.availableQty <= 0 || isExpired ? 0.5 : 1,
                                  cursor: batch.availableQty <= 0 || isExpired ? 'not-allowed' : 'pointer',
                                }}
                                onClick={() => handleAddToCartPOS(selectedProduct, batch)}
                              >
                                <ShoppingCart size={13} />
                                <span>Chọn Lô Bán POS</span>
                              </button>

                              {!isExpired && batch.availableQty > 0 && (isUrgent || isNear || isClearance) && (
                                <button
                                  type="button"
                                  className="pos-btn-secondary-pill"
                                  style={{ height: 28, padding: '0 10px', fontSize: 11, color: '#b45309', borderColor: '#fde68a' }}
                                  onClick={() => handleOpenClearance(batch)}
                                >
                                  <Tag size={12} />
                                  <span>Xả Hàng -20%</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      </main>

      {/* MODAL 1: YÊU CẦU ĐIỀU CHUYỂN KHO NỘI BỘ - CHUẨN POS MODAL */}
      {isTransferModalOpen && selectedProduct && (
        <div className="pos-modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-teal-700" />
                <h2 className="pos-modal-title">Yêu Cầu Chuyển Kho Nội Bộ</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setIsTransferModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Sản phẩm điều chuyển:</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  value={`${selectedProduct.sku} - ${selectedProduct.name}`}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chi nhánh xuất hàng (Nguồn):</label>
                <select
                  className="filter-select w-full"
                  value={transferFromBranch}
                  onChange={(e) => setTransferFromBranch(e.target.value)}
                >
                  {displayedBranchStocks.filter((b) => !b.isCurrentBranch).length > 0 ? (
                    displayedBranchStocks
                      .filter((b) => !b.isCurrentBranch)
                      .map((b) => (
                        <option key={b.branchId} value={b.branchName}>
                          {b.branchName} (Khả dụng: {b.availableStock} {b.unitName})
                        </option>
                      ))
                  ) : (
                    <option value="">Chưa có chi nhánh nguồn khả dụng</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chi nhánh nhận (Đích):</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  value={currentBranch?.name || 'Chi nhánh hiện tại'}
                  readOnly
                  style={{ backgroundColor: '#f8fafc' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số lượng yêu cầu ({selectedProduct.baseUnit}):</label>
                <input
                  type="number"
                  className="filter-select w-full font-mono font-bold"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ghi chú điều chuyển:</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  placeholder="Ví dụ: Bổ sung quầy bán trước ca chiều..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setIsTransferModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                onClick={handleSubmitTransfer}
              >
                Gửi Yêu Cầu Chuyển Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XÁC NHẬN XẢ HÀNG CẬN DATE - CHUẨN POS MODAL */}
      {isClearanceModalOpen && selectedBatchForClearance && (
        <div className="pos-modal-overlay" onClick={() => setIsClearanceModalOpen(false)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-amber-600" />
                <h2 className="pos-modal-title">Xác Nhận Thiết Lập Xả Hàng Cận Date</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setIsClearanceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <p className="text-xs text-slate-600 m-0">
                Bạn đang chuẩn bị kích hoạt chính sách xả hàng cho lô cận date:
              </p>
              <div
                style={{
                  backgroundColor: '#fefce8',
                  border: '1px solid #fde047',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                }}
              >
                <div>Mã Lô: <b>{selectedBatchForClearance.batchCode || selectedBatchForClearance.batchId}</b></div>
                <div>
                  Hạn sử dụng: <b>{selectedBatchForClearance.expDate}</b>
                  {selectedBatchForClearance.daysRemaining !== null ? ` (Còn ${selectedBatchForClearance.daysRemaining} ngày)` : ''}
                </div>
                <div>Số lượng khả dụng áp dụng: <b>{selectedBatchForClearance.availableQty} {selectedBatchForClearance.unitName}</b></div>
                <div style={{ marginTop: 4, color: '#b45309', fontWeight: 700 }}>
                  Mức chiết khấu đề xuất: -20% khi quét bán tại quầy POS
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setIsClearanceModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
                onClick={handleConfirmClearance}
              >
                Xác Nhận Xả Hàng -20%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
