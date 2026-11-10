import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { FC, FormEvent } from "react";
import type {
  SupplierSummary,
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from "../../types/supplier.types";
import {
  supplierProductApi,
  type BatchAssignProductInput,
} from "../../api/supplierProductApi";
import { storeProductApi } from "../../../product/api/storeProductApi";
import { SupplierStatusBadge } from "../SupplierStatusBadge";
import { AssignProductModal } from "../products/AssignProductModal";
import {
  EditSupplierProductModal,
  type SaveSupplierProductScope,
} from "../products/EditSupplierProductModal";
import {
  Package,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Store,
  AlertCircle,
} from "lucide-react";

interface Props {
  supplier?: SupplierSummary;
  products?: SupplierProductItem[];
  canEdit?: boolean;
  onNotify?: (
    message: string,
    type?: "success" | "error" | "info" | "warning",
  ) => void;
}

export interface ActiveBranchInfo {
  id: string; // 'ALL' or Guid
  code?: string;
  name?: string;
  address?: string;
  isHeadquarter?: boolean;
}

const STORAGE_KEY = "mtgrms_active_branch";
const BRANCH_TERMS_STORAGE_KEY = "mtgrms_supplier_product_branch_terms_v1";

interface SupplierProductTermsValue {
  agreedPrice: number;
  moq: number;
  allowedShortageQty: number;
  status: "Active" | "Inactive";
}

interface ProductBranchTermsRecord {
  defaultTerms?: SupplierProductTermsValue;
  byBranchId: Record<string, SupplierProductTermsValue>;
}

const getStoredBranchTermsMap = (): Record<string, ProductBranchTermsRecord> => {
  try {
    const raw = localStorage.getItem(BRANCH_TERMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fallback
  }
  return {};
};

const getStoredActiveBranch = (): ActiveBranchInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
  } catch {
    // fallback
  }
  return { id: "ALL", name: "Toàn hệ thống", code: "ALL" };
};

export const SupplierProductsTab: FC<Props> = ({
  supplier,
  products: initialProducts,
  canEdit = true,
  onNotify,
}) => {
  // Products from supplier API
  const [products, setProducts] = useState<SupplierProductItem[]>(
    initialProducts || [],
  );
  const [totalCount, setTotalCount] = useState<number>(
    initialProducts?.length || 0,
  );
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(
    !initialProducts && !!supplier?.id,
  );

  // Active branch from header dropdown (BranchSelectorDropdown)
  const [activeBranch, setActiveBranch] = useState<ActiveBranchInfo>(
    getStoredActiveBranch,
  );
  const [branchProductMap, setBranchProductMap] = useState<Map<string, any>>(
    new Map(),
  );
  const [isLoadingBranchProducts, setIsLoadingBranchProducts] = useState(false);
  const [branchTermsMap, setBranchTermsMap] = useState<
    Record<string, ProductBranchTermsRecord>
  >(getStoredBranchTermsMap);

  const getProductTermsKey = useCallback(
    (item: { supplierId: string; productId: string }) =>
      `${item.supplierId}__${item.productId}`,
    [],
  );

  const getEffectiveTerms = useCallback(
    (
      item: SupplierProductItem,
      targetBranchId?: string,
    ): SupplierProductTermsValue => {
      const bId = targetBranchId ?? (activeBranch.id || "ALL");
      const key = getProductTermsKey(item);
      const record = branchTermsMap[key];

      const basePrice =
        item.effectivePrice ?? item.agreedPrice ?? item.importPrice ?? 0;
      const baseTerms: SupplierProductTermsValue = {
        agreedPrice: basePrice,
        moq: item.moq,
        allowedShortageQty: item.allowedShortageQty ?? 0,
        status: item.status || "Active",
      };

      if (record?.byBranchId?.[bId]) {
        return record.byBranchId[bId];
      }

      if (record?.defaultTerms) {
        if (bId !== "ALL") {
          const branchInfo = branchProductMap.get(item.productId);
          return {
            ...record.defaultTerms,
            status: branchInfo?.status || record.defaultTerms.status,
          };
        }
        return record.defaultTerms;
      }

      if (bId !== "ALL") {
        const branchInfo = branchProductMap.get(item.productId);
        if (branchInfo?.status) {
          return {
            ...baseTerms,
            status: branchInfo.status,
          };
        }
      }

      return baseTerms;
    },
    [activeBranch.id, branchTermsMap, branchProductMap, getProductTermsKey],
  );

  // Filter inputs (draft state)
  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("ALL");
  const [statusInput, setStatusInput] = useState("ALL");

  // Applied filters for API query
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    categoryFilter: "ALL",
    statusFilter: "ALL",
    pageIndex: 1,
    pageSize: 10,
  });

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierProductItem | null>(
    null,
  );

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN").format(Number.isFinite(val) ? val : 0) +
    " đ";

  const notify = useCallback(
    (
      msg: string,
      type: "success" | "error" | "info" | "warning" = "success",
    ) => {
      onNotify?.(msg, type);
    },
    [onNotify],
  );

  // 1. Subscribe to Header Dropdown (BranchSelectorDropdown) changes
  useEffect(() => {
    const handleBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<ActiveBranchInfo>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
      } else {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setActiveBranch(getStoredActiveBranch());
      }
    };

    window.addEventListener("mtgrms:branch-changed", handleBranchChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("mtgrms:branch-changed", handleBranchChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 2. Load Master Products for Assign Modal & category list
  useEffect(() => {
    if (!supplier?.id) return;
    let isMounted = true;
    supplierProductApi
      .getMasterProducts()
      .then((res) => {
        if (isMounted) setMasterProducts(res ?? []);
      })
      .catch(() => {
        // non-blocking
      });
    return () => {
      isMounted = false;
    };
  }, [supplier?.id]);

  // 3. Fetch products of this specific supplier
  const fetchSupplierProducts = useCallback(async () => {
    if (!supplier?.id) {
      if (initialProducts) {
        setProducts(initialProducts);
        setTotalCount(initialProducts.length);
      }
      return;
    }

    setIsLoading(true);
    try {
      const res = await supplierProductApi.getSupplierProducts(supplier.id, {
        searchTerm: appliedFilters.searchTerm,
        productSearch: appliedFilters.searchTerm,
        categoryFilter: appliedFilters.categoryFilter,
        statusFilter: appliedFilters.statusFilter,
        pageIndex: appliedFilters.pageIndex,
        pageSize: 100, // Load full supplier catalog so client can intersect with branch
      });
      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      notify(
        err.message || "Không thể tải danh sách sản phẩm của nhà cung cấp.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [supplier?.id, appliedFilters, initialProducts, notify]);

  useEffect(() => {
    void fetchSupplierProducts();
  }, [fetchSupplierProducts]);

  // 4. Fetch branch-assigned products when a specific branch is selected in Header Dropdown
  const fetchBranchProducts = useCallback(async () => {
    if (!activeBranch.id || activeBranch.id === "ALL") {
      setBranchProductMap(new Map());
      return;
    }

    setIsLoadingBranchProducts(true);
    try {
      const res = await storeProductApi.getStoreProducts({
        storeId: activeBranch.id,
        pageIndex: 1,
        pageSize: 500,
        searchTerm: "",
        skus: [],
        names: [],
        storeCodes: [],
        storeNames: [],
        supplierCodes: supplier?.code ? [supplier.code] : [],
        supplierNames: supplier?.name ? [supplier.name] : [],
        statusFilter: "ALL",
        stockAlertFilter: "ALL",
      });

      const map = new Map<string, any>();
      (res.items || []).forEach((item) => {
        map.set(item.productId, item);
      });
      setBranchProductMap(map);
    } catch (err) {
      console.warn("Không thể tải danh mục sản phẩm của chi nhánh:", err);
      setBranchProductMap(new Map());
    } finally {
      setIsLoadingBranchProducts(false);
    }
  }, [activeBranch.id, supplier?.code, supplier?.name]);

  useEffect(() => {
    void fetchBranchProducts();
  }, [fetchBranchProducts]);

  // Available categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    masterProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products, masterProducts]);

  // 5. Filter products by Active Branch from Header Dropdown + Search + Filters
  const displayedProducts = useMemo(() => {
    let list = products;

    // A. Filter by Active Branch (from Header Dropdown)
    if (activeBranch.id && activeBranch.id !== "ALL") {
      list = list.filter((p) => branchProductMap.has(p.productId));
    }

    // B. Search & Category / Status filters
    if (appliedFilters.searchTerm) {
      const q = appliedFilters.searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    if (appliedFilters.categoryFilter !== "ALL") {
      list = list.filter(
        (p) => p.categoryName === appliedFilters.categoryFilter,
      );
    }
    if (appliedFilters.statusFilter !== "ALL") {
      list = list.filter(
        (p) => getEffectiveTerms(p).status === appliedFilters.statusFilter,
      );
    }

    return list;
  }, [
    products,
    activeBranch.id,
    branchProductMap,
    appliedFilters,
    getEffectiveTerms,
  ]);

  // Pagination for displayed products
  const isBranchFiltered = Boolean(
    activeBranch.id && activeBranch.id !== "ALL",
  );
  const effectiveTotal = isBranchFiltered
    ? displayedProducts.length
    : displayedProducts.length;
  const totalPages = Math.max(
    1,
    Math.ceil(effectiveTotal / appliedFilters.pageSize),
  );
  const startItem =
    effectiveTotal === 0
      ? 0
      : (appliedFilters.pageIndex - 1) * appliedFilters.pageSize + 1;
  const endItem = Math.min(
    appliedFilters.pageIndex * appliedFilters.pageSize,
    effectiveTotal,
  );

  const paginatedItems = useMemo(() => {
    const start = (appliedFilters.pageIndex - 1) * appliedFilters.pageSize;
    return displayedProducts.slice(start, start + appliedFilters.pageSize);
  }, [displayedProducts, appliedFilters.pageIndex, appliedFilters.pageSize]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAppliedFilters((prev) => ({
      ...prev,
      searchTerm: searchInput.trim(),
      categoryFilter: categoryInput,
      statusFilter: statusInput,
      pageIndex: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setCategoryInput("ALL");
    setStatusInput("ALL");
    setAppliedFilters({
      searchTerm: "",
      categoryFilter: "ALL",
      statusFilter: "ALL",
      pageIndex: 1,
      pageSize: appliedFilters.pageSize,
    });
  };

  const handleSwitchToAllBranches = () => {
    const allOption: ActiveBranchInfo = {
      id: "ALL",
      name: "Toàn hệ thống",
      code: "ALL",
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allOption));
      window.dispatchEvent(
        new CustomEvent("mtgrms:branch-changed", { detail: allOption }),
      );
    } catch {
      // ignore
    }
    setActiveBranch(allOption);
  };

  const handleAssignProduct = async (input: AssignProductInput) => {
    try {
      const res = await supplierProductApi.assignProduct(input);
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        notify(
          `Đã gán sản phẩm thành công. Hệ thống đã tự động phân bổ sản phẩm đến ${syncedCount} chi nhánh.`,
          "success",
        );
      } else {
        notify("Đã gán sản phẩm cho nhà cung cấp thành công!", "success");
      }
      setIsAssignModalOpen(false);
      await fetchSupplierProducts();
      await fetchBranchProducts();
      return res;
    } catch (err: any) {
      notify(err.message || "Thao tác gán sản phẩm không thành công.", "error");
      throw err;
    }
  };

  const handleAssignBatchProducts = async (input: BatchAssignProductInput) => {
    try {
      const res = await supplierProductApi.assignBatchProducts(input);
      const assignedCount = res?.assignedCount ?? input.productIds.length;
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        notify(
          `Đã gán thành công ${assignedCount} sản phẩm cho NCC ${supplier?.name || ""}. Tự động phân bổ đến ${syncedCount} chi nhánh.`,
          "success",
        );
      } else {
        notify(
          `Đã gán thành công ${assignedCount} sản phẩm cho NCC ${supplier?.name || ""}!`,
          "success",
        );
      }
      setIsAssignModalOpen(false);
      await fetchSupplierProducts();
      await fetchBranchProducts();
      return res;
    } catch (err: any) {
      notify(err.message || "Thao tác gán sản phẩm không thành công.", "error");
      throw err;
    }
  };

  const handleSaveEdit = async (
    input: EditSupplierProductInput,
    scope: SaveSupplierProductScope = "CURRENT_ONLY",
  ) => {
    if (!editingItem) return;

    const currentBranchKey = activeBranch.id || "ALL";
    const isMainOrTotal =
      currentBranchKey === "ALL" ||
      Boolean(activeBranch.isHeadquarter) ||
      Boolean(activeBranch.name?.toLowerCase().includes("chi nhánh chính"));

    const key = getProductTermsKey(editingItem);
    const basePrice =
      editingItem.effectivePrice ??
      editingItem.agreedPrice ??
      editingItem.importPrice ??
      0;
    const baseTerms: SupplierProductTermsValue = {
      agreedPrice: basePrice,
      moq: editingItem.moq,
      allowedShortageQty: editingItem.allowedShortageQty ?? 0,
      status: editingItem.status || "Active",
    };

    const newTerms: SupplierProductTermsValue = {
      agreedPrice: input.agreedPrice,
      moq: input.moq,
      allowedShortageQty: input.allowedShortageQty,
      status: input.status,
    };

    try {
      if (scope === "ALL_BRANCHES") {
        // 1. Update supplier product on backend
        await supplierProductApi.updateProduct(
          editingItem.supplierId,
          editingItem.productId,
          input,
        );
        if (input.status !== editingItem.status) {
          await supplierProductApi.toggleStatus(
            editingItem.supplierId,
            editingItem.productId,
            input.status,
          );
        }

        // 2. Sync status across all branches on backend (best-effort)
        try {
          const stores = await storeProductApi.getStoreSummaries();
          await Promise.allSettled(
            (stores || []).map((st) =>
              storeProductApi.toggleStatus(
                st.id,
                editingItem.productId,
                input.status,
              ),
            ),
          );
        } catch {
          // non-blocking
        }

        // 3. Apply newTerms as default across all branches & clear per-branch overrides
        setBranchTermsMap((prev) => {
          const next: Record<string, ProductBranchTermsRecord> = {
            ...prev,
            [key]: {
              defaultTerms: newTerms,
              byBranchId: {
                ALL: newTerms,
              },
            },
          };
          try {
            localStorage.setItem(BRANCH_TERMS_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });

        notify(
          "Đã lưu thay đổi và đồng bộ điều khoản cung ứng trên tất cả các chi nhánh!",
          "success",
        );
        setEditingItem(null);
        await fetchSupplierProducts();
        await fetchBranchProducts();
        return;
      }

      // scope === "CURRENT_ONLY"
      // Snapshot baseline into defaultTerms first so other branches retain their old values
      setBranchTermsMap((prev) => {
        const existingRecord = prev[key];
        const preservedDefault = existingRecord?.defaultTerms ?? baseTerms;
        const nextByBranch: Record<string, SupplierProductTermsValue> = {
          ...(existingRecord?.byBranchId || {}),
          [currentBranchKey]: newTerms,
        };

        const next: Record<string, ProductBranchTermsRecord> = {
          ...prev,
          [key]: {
            defaultTerms: preservedDefault,
            byBranchId: nextByBranch,
          },
        };
        try {
          localStorage.setItem(BRANCH_TERMS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      if (isMainOrTotal) {
        await supplierProductApi.updateProduct(
          editingItem.supplierId,
          editingItem.productId,
          input,
        );
        if (input.status !== editingItem.status) {
          await supplierProductApi.toggleStatus(
            editingItem.supplierId,
            editingItem.productId,
            input.status,
          );
        }
        if (currentBranchKey !== "ALL") {
          try {
            await storeProductApi.toggleStatus(
              currentBranchKey,
              editingItem.productId,
              input.status,
            );
          } catch {
            // non-blocking
          }
        }
        notify(
          "Đã lưu thay đổi chỉ trên thông tin chi nhánh chính (giữ nguyên các chi nhánh khác)!",
          "success",
        );
        setEditingItem(null);
        await fetchSupplierProducts();
        await fetchBranchProducts();
      } else {
        // Sub-branch only
        await storeProductApi.toggleStatus(
          currentBranchKey,
          editingItem.productId,
          input.status,
        );
        notify(
          `Đã lưu thay đổi điều khoản cung ứng riêng cho chi nhánh "${activeBranch.name}"!`,
          "success",
        );
        setEditingItem(null);
        await fetchBranchProducts();
      }
    } catch (err: any) {
      notify(err.message || "Không thể cập nhật sản phẩm.", "error");
      throw err;
    }
  };

  const assignedProductIds = useMemo(
    () => products.map((p) => p.productId),
    [products],
  );

  // Synchronize horizontal scrolling between header and body & detect vertical scroll
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(
          bodyRef.current.scrollHeight > bodyRef.current.clientHeight,
        );
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("resize", updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [paginatedItems, appliedFilters.pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: "3.5%" }} />
      <col style={{ width: "4.5%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: canEdit ? "21%" : "27%" }} />
      <col style={{ width: "13%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "9%" }} />
      {canEdit && <col style={{ width: "6%" }} />}
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: "#f8fafc",
    padding: "8px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.25,
    boxSizing: "border-box",
    borderBottom: "1px solid #cbd5e1",
    userSelect: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <div
        className="supplier-detail-card so-list-table-card"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px 10px 20px",
            flexWrap: "wrap",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm, 8px)",
                background: "var(--blue-light, #f0fdfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--blue-primary, #0f766e)",
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  className="supplier-detail-card-title"
                  style={{
                    margin: 0,
                    border: "none",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span>
                    Danh Mục Sản Phẩm Cung Ứng (
                    {isBranchFiltered
                      ? `${effectiveTotal} / ${totalCount}`
                      : totalCount}
                    )
                  </span>
                  {(isLoading || isLoadingBranchProducts) && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                      style={{ color: "var(--blue-primary, #0f766e)" }}
                    />
                  )}
                </h2>

                {/* Active Branch Pill from Header Dropdown */}
                {isBranchFiltered ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      borderRadius: 999,
                      backgroundColor: "#ecfdf5",
                      color: "#065f46",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid #a7f3d0",
                    }}
                    title="Đang lọc danh mục mặt hàng theo chi nhánh được chọn từ dropdown trên thanh Header"
                  >
                    <Store size={13} color="#059669" />
                    <span>Chi nhánh: {activeBranch.name}</span>
                    <button
                      type="button"
                      onClick={handleSwitchToAllBranches}
                      title="Bấm để xem gộp toàn hệ thống"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        marginLeft: 4,
                        color: "#047857",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      (Xem toàn hệ thống)
                    </button>
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 10px",
                      borderRadius: 999,
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid #e2e8f0",
                    }}
                    title="Dữ liệu gộp toàn chuỗi từ dropdown trên thanh Header"
                  >
                    <Store size={13} color="#64748b" />
                    <span>Toàn hệ thống</span>
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted, #64748b)",
                  marginTop: 2,
                }}
              >
                {isBranchFiltered ? (
                  <span>
                    Đang hiển thị các mặt hàng của{" "}
                    {supplier?.name ? <b>{supplier.name}</b> : "nhà cung cấp"}{" "}
                    phân bổ tại chi nhánh <b>{activeBranch.name}</b> .
                  </span>
                ) : (
                  <span>
                    Bảng giá nhập sỉ hiện tại, số lượng đặt hàng tối thiểu (MOQ)
                    và hạn mức giao thiếu của{" "}
                    {supplier?.name ? <b>{supplier.name}</b> : "nhà cung cấp"}{" "}
                    trên toàn chuỗi cửa hàng.
                  </span>
                )}
              </div>
            </div>
          </div>

          {canEdit && supplier && (
            <button
              type="button"
              data-testid="btn-assign-supplier-product"
              className="po-btn po-btn-primary"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <Plus size={14} />
              <span>Gán sản phẩm mới</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            margin: "0 20px 10px 20px",
            padding: "10px 14px",
            backgroundColor: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <input
              type="text"
              placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="admin-search-input"
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#475569",
                whiteSpace: "nowrap",
              }}
            >
              Ngành hàng:
            </span>
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              style={{
                height: 36,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                backgroundColor: "#ffffff",
                color: "#1e293b",
              }}
            >
              <option value="ALL">
                -- Tất cả ngành hàng ({availableCategories.length}) --
              </option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#475569",
                whiteSpace: "nowrap",
              }}
            >
              Trạng thái:
            </span>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              style={{
                height: 36,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                backgroundColor: "#ffffff",
                color: "#1e293b",
              }}
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="Active">Hoạt động</option>
              <option value="Inactive">Ngưng cung ứng</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
            }}
          >
            <button
              type="submit"
              className="po-btn po-btn-primary"
              style={{ height: 36 }}
            >
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="po-btn po-btn-secondary"
              style={{ height: 36 }}
            >
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          </div>
        </form>

        {/* ── Fixed Header Table ── */}
        <div
          ref={headerRef}
          className="so-list-table-head"
          style={{ paddingRight: hasScrollY ? 6 : 0, flexShrink: 0 }}
        >
          <table
            className="so-list-table"
            style={{ minWidth: 1200, tableLayout: "fixed" }}
          >
            {tableColGroup}
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center" }}>#</th>
                <th style={{ ...thStyle, textAlign: "center" }}>ẢNH</th>
                <th style={{ ...thStyle }}>MÃ SKU</th>
                <th style={{ ...thStyle }}>TÊN SẢN PHẨM</th>
                <th style={{ ...thStyle }}>NGÀNH HÀNG</th>
                <th style={{ ...thStyle, textAlign: "center" }}>ĐVT</th>
                <th style={{ ...thStyle, textAlign: "right" }}>GIÁ NHẬP SỈ</th>
                <th style={{ ...thStyle, textAlign: "right" }}>MOQ</th>
                <th style={{ ...thStyle, textAlign: "right" }}>THIẾU CHO PHÉP</th>
                <th style={{ ...thStyle, textAlign: "center" }}>TRẠNG THÁI</th>
                {canEdit && (
                  <th
                    style={{
                      ...thStyle,
                      textAlign: "right",
                      paddingRight: 14,
                    }}
                  >
                    THAO TÁC
                  </th>
                )}
              </tr>
            </thead>
          </table>
        </div>

        {/* ── Scrollable Body Table ── */}
        <div
          ref={bodyRef}
          className="so-list-table-body supplier-table-scroll-container"
          onScroll={handleBodyScroll}
          style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}
        >
          <table
            className="so-list-table"
            style={{ minWidth: 1200, tableLayout: "fixed" }}
          >
            {tableColGroup}
            <tbody>
              {isLoading || isLoadingBranchProducts ? (
                <tr>
                  <td
                    colSpan={canEdit ? 11 : 10}
                    style={{
                      textAlign: "center",
                      padding: "36px 16px",
                      color: "#64748b",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <Loader2 size={18} className="animate-spin" />
                      <span>
                        {isLoadingBranchProducts
                          ? `Đang lọc danh mục sản phẩm theo chi nhánh "${activeBranch.name}"...`
                          : "Đang tải danh mục sản phẩm cung ứng..."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item, idx) => {
                  const rowIndex =
                    (appliedFilters.pageIndex - 1) * appliedFilters.pageSize +
                    idx +
                    1;
                  const uom =
                    item.baseUoM || item.deliveryUoM || item.unit || "Cái";
                  const effective = getEffectiveTerms(item);

                  return (
                    <tr
                      key={item.id}
                      className="so-list-row"
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        opacity: effective.status === "Inactive" ? 0.65 : 1,
                        backgroundColor: "#ffffff",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      {/* 1. STT */}
                      <td
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          fontSize: 12,
                          color: "#94a3b8",
                          verticalAlign: "middle",
                        }}
                      >
                        {rowIndex}
                      </td>

                      {/* 2. Ảnh */}
                      <td
                        style={{
                          padding: "6px 4px",
                          textAlign: "center",
                          verticalAlign: "middle",
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: "cover",
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              display: "block",
                              margin: "0 auto",
                              background: "#f8fafc",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 6,
                              border: "1px dashed #cbd5e1",
                              background: "#f8fafc",
                              margin: "0 auto",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              color: "#94a3b8",
                            }}
                          >
                            N/A
                          </div>
                        )}
                      </td>

                      {/* 3. Mã SKU */}
                      <td
                        style={{
                          padding: "8px 10px",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#0f766e",
                          }}
                        >
                          {item.sku}
                        </span>
                      </td>

                      {/* 4. Tên sản phẩm */}
                      <td
                        className="so-list-td--wrap"
                        style={{ padding: "8px 10px", verticalAlign: "middle" }}
                      >
                        <div
                          className="so-list-name"
                          title={item.name}
                        >
                          {item.name}
                        </div>
                      </td>

                      {/* 5. Ngành hàng */}
                      <td
                        style={{
                          padding: "8px 10px",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#475569",
                            fontWeight: 500,
                          }}
                        >
                          {item.categoryName || "Chung"}
                        </span>
                      </td>

                      {/* 6. ĐVT */}
                      <td
                        style={{
                          padding: "8px 6px",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {uom}
                        </span>
                      </td>

                      {/* 7. Giá */}
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "#0f766e",
                          }}
                        >
                          {fmtCurrency(effective.agreedPrice)}
                        </span>
                      </td>

                      {/* 8. MOQ */}
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {effective.moq} {uom}
                        </span>
                      </td>

                      {/* 9. Thiếu cho phép */}
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {effective.allowedShortageQty} {uom}
                        </span>
                      </td>

                      {/* 10. Trạng thái */}
                      <td
                        style={{
                          padding: "8px 8px",
                          textAlign: "center",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <SupplierStatusBadge status={effective.status} />
                      </td>

                      {/* 11. Thao tác */}
                      {canEdit && (
                        <td
                          style={{
                            padding: "8px 14px 8px 4px",
                            textAlign: "right",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            className="so-list-actions"
                            style={{ justifyContent: "flex-end" }}
                          >
                            <button
                              type="button"
                              className="so-list-action-btn"
                              onClick={() => setEditingItem(item)}
                              title="Sửa điều khoản cung ứng"
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={canEdit ? 11 : 10}
                    style={{
                      textAlign: "center",
                      padding: "36px 16px",
                      color: "#64748b",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <AlertCircle size={28} color="#94a3b8" />
                      {isBranchFiltered ? (
                        <>
                          <span style={{ fontWeight: 600, color: "#334155" }}>
                            Không tìm thấy sản phẩm nào của nhà cung cấp tại chi
                            nhánh "{activeBranch.name}".
                          </span>
                          <span style={{ fontSize: 12.5, color: "#64748b" }}>
                            Sản phẩm của nhà cung cấp này chưa được phân bổ tới
                            chi nhánh đang chọn.
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 4,
                            }}
                          >
                            <button
                              type="button"
                              onClick={handleSwitchToAllBranches}
                              className="po-btn po-btn-secondary"
                            >
                              <Store size={14} />
                              <span>Xem toàn hệ thống</span>
                            </button>
                            {canEdit && supplier && (
                              <button
                                type="button"
                                className="po-btn po-btn-primary"
                                onClick={() => setIsAssignModalOpen(true)}
                              >
                                <Plus size={14} />
                                <span>Gán sản phẩm cho chi nhánh</span>
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <span>
                            Không có sản phẩm nào phù hợp hoặc nhà cung cấp chưa
                            được gán mặt hàng.
                          </span>
                          {canEdit && supplier && (
                            <button
                              type="button"
                              className="po-btn po-btn-primary"
                              onClick={() => setIsAssignModalOpen(true)}
                            >
                              <Plus size={14} />
                              <span>Gán sản phẩm đầu tiên</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {effectiveTotal > 0 && (
          <div
            className="so-list-pager"
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              fontSize: 12.5,
              color: "#475569",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <span>
                Hiển thị <b>{startItem}</b> – <b>{endItem}</b> trên{" "}
                <b>{effectiveTotal}</b> mặt hàng
                {isBranchFiltered && (
                  <span
                    style={{
                      marginLeft: 6,
                      color: "#0369a1",
                      fontWeight: 600,
                    }}
                  >
                    (tại {activeBranch.name} • Tổng chuỗi: {totalCount})
                  </span>
                )}
              </span>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#64748b" }}>Bản ghi/trang:</span>
                <select
                  className="so-list-pager-select"
                  value={appliedFilters.pageSize}
                  onChange={(e) =>
                    setAppliedFilters((prev) => ({
                      ...prev,
                      pageSize: Number(e.target.value),
                      pageIndex: 1,
                    }))
                  }
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="so-list-pager-btn"
                disabled={appliedFilters.pageIndex <= 1}
                onClick={() =>
                  setAppliedFilters((prev) => ({
                    ...prev,
                    pageIndex: Math.max(1, prev.pageIndex - 1),
                  }))
                }
              >
                <ChevronLeft size={13} />
                <span>Trước</span>
              </button>

              <span
                style={{
                  padding: "0 8px",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Trang <b>{appliedFilters.pageIndex}</b> / <b>{totalPages}</b>
              </span>

              <button
                type="button"
                className="so-list-pager-btn"
                disabled={appliedFilters.pageIndex >= totalPages}
                onClick={() =>
                  setAppliedFilters((prev) => ({
                    ...prev,
                    pageIndex: Math.min(totalPages, prev.pageIndex + 1),
                  }))
                }
              >
                <span>Sau</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Assign New Product */}
      {canEdit && supplier && (
        <AssignProductModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          supplier={supplier}
          suppliers={[supplier]}
          masterProducts={masterProducts}
          assignedProductIds={assignedProductIds}
          onAssign={handleAssignProduct}
          onAssignBatch={handleAssignBatchProducts}
        />
      )}

      {/* Modal 2: Edit Product Price & MOQ */}
      {canEdit && (
        <EditSupplierProductModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={
            editingItem
              ? {
                  ...editingItem,
                  agreedPrice: getEffectiveTerms(editingItem).agreedPrice,
                  effectivePrice: getEffectiveTerms(editingItem).agreedPrice,
                  moq: getEffectiveTerms(editingItem).moq,
                  allowedShortageQty:
                    getEffectiveTerms(editingItem).allowedShortageQty,
                  status: getEffectiveTerms(editingItem).status,
                }
              : null
          }
          supplierName={supplier?.name || editingItem?.supplierName || ""}
          branchContext={{
            branchId: activeBranch.id || "ALL",
            branchName: activeBranch.name || "Toàn hệ thống",
            isHeadquarter: activeBranch.isHeadquarter,
            branchInfo: editingItem
              ? branchProductMap.get(editingItem.productId)
              : undefined,
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
