import { useState, useEffect, type FC } from "react";
import { X, Plus, Trash2, Tag } from "lucide-react";
import type {
  PromotionItem,
  PromotionType,
  PromotionTier,
} from "../../types/promotion.types";
import { MOCK_BRANCHES } from "../../mock/promotionMockData";
import { ProductUnitPicker } from "./ProductUnitPicker";
import { ProductPicker } from "./ProductPicker";
import { productApi } from "../../../product/api/productApi";

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promo: PromotionItem) => Promise<void> | void;
  editingPromo: PromotionItem | null;
  branches?: string[];
}

export const PromotionModal: FC<PromotionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPromo,
  branches,
}) => {
  const branchOptions = branches && branches.length > 0 ? branches : MOCK_BRANCHES;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<PromotionType>("ORDER_DISCOUNT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(["ALL"]);
  const [description, setDescription] = useState("");
  const [budgetLimit, setBudgetLimit] = useState<number | undefined>(undefined);
  const [tiers, setTiers] = useState<PromotionTier[]>([
    {
      id: "tier-temp-1",
      tierLevel: 1,
      minOrderValue: 200000,
      discountType: "PERCENT",
      discountValue: 10,
      maxDiscount: 50000,
      giftUnit: "Cái",
    },
  ]);

  const [availableProducts, setAvailableProducts] = useState<
    Array<{ id: string; name: string; productCode: string; barcode: string; baseUnit: string }>
  >([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    let active = true;
    setValidationErrors([]);
    if (isOpen) {
      setAvailableProducts([]);
      productApi
        .getAllProducts({ status: "Active" })
        .then((res) => {
          if (active) {
            setAvailableProducts(
              res.map((p) => ({
                id: p.id,
                name: p.name,
                productCode: p.productCode,
                barcode: p.barcode || "",
                baseUnit: p.baseUnit || "Cái",
              }))
            );
          }
        })
        .catch((err) => {
          if (active) setValidationErrors(["Không thể tải danh mục sản phẩm. Vui lòng đóng và mở lại để thử lại."]);
          console.warn("Không thể tải danh mục sản phẩm quà tặng:", err);
        });
    }
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (editingPromo) {
      setCode(editingPromo.code);
      setName(editingPromo.name);
      setType(editingPromo.type);
      setStartDate(editingPromo.startDate);
      setEndDate(editingPromo.endDate);
      setSelectedBranches(editingPromo.branches);
      setDescription(editingPromo.description || "");
      setBudgetLimit(editingPromo.budgetLimit);
      setTiers(
        editingPromo.tiers?.length
          ? editingPromo.tiers.map((t) => ({
              ...t,
              giftUnit: t.giftUnit || "Cái",
            }))
          : [
              {
                id: "tier-1",
                tierLevel: 1,
                minOrderValue: 200000,
                discountType: "PERCENT",
                discountValue: 5,
                maxDiscount: 30000,
                giftUnit: "Cái",
              },
            ]
      );
    } else {
      setCode(
        `KM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
      );
      setName("");
      setType("ORDER_DISCOUNT");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      );
      setSelectedBranches(["ALL"]);
      setDescription("");
      setBudgetLimit(10000000);
      setTiers([
        {
          id: "tier-1",
          tierLevel: 1,
          minOrderValue: 200000,
          discountType: "PERCENT",
          discountValue: 5,
          maxDiscount: 30000,
          giftUnit: "Cái",
        },
      ]);
    }
  }, [editingPromo, isOpen]);

  if (!isOpen) return null;

  const handleAddTier = () => {
    const nextLevel = tiers.length + 1;
    const newTier: PromotionTier = {
      id: `tier-user-${Date.now()}`,
      tierLevel: nextLevel,
      discountType: "PERCENT",
      discountValue: nextLevel * 5,
      maxDiscount: type === "ORDER_DISCOUNT" ? nextLevel * 30000 : undefined,
      minOrderValue: type === "ORDER_DISCOUNT" ? nextLevel * 200000 : undefined,
      buyProductId: undefined,
      buyProductName: undefined,
      requiredQty: type === "BUY_X_GET_Y" ? nextLevel * 2 : undefined,
      giftProductId: undefined,
      giftProductName:
        type === "BUY_X_GET_Y" ? "" : undefined,
      giftUnit: "Cái",
      giftQty: type === "BUY_X_GET_Y" ? 1 : undefined,
    };
    setTiers([...tiers, newTier]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((t, idx) => ({ ...t, tierLevel: idx + 1 }))
    );
  };

  const handleUpdateTier = (
    index: number,
    fieldOrUpdates: keyof PromotionTier | Partial<PromotionTier>,
    value?: unknown,
  ) => {
    setTiers((prev) => {
      const next = [...prev];
      if (typeof fieldOrUpdates === "string") {
        next[index] = { ...next[index], [fieldOrUpdates]: value };
      } else {
        next[index] = { ...next[index], ...fieldOrUpdates };
      }
      return next;
    });
  };

  const handleTypeChange = (newType: PromotionType) => {
    setType(newType);
    setValidationErrors([]);
    if (newType === "BUY_X_GET_Y") {
      setTiers((prev) =>
        prev.map((t, idx) => ({
          ...t,
          minOrderValue: undefined,
          maxDiscount: undefined,
          requiredQty: t.requiredQty || (idx + 1) * 2,
          giftQty: t.giftQty || 1,
          giftUnit: t.giftUnit || "Cái",
          discountType: "PERCENT",
          discountValue: 0,
        }))
      );
    } else if (newType === "PRODUCT_DISCOUNT") {
      setTiers((prev) =>
        prev.map((t) => ({
          ...t,
          minOrderValue: undefined,
          maxDiscount: undefined,
          discountType: t.discountType || "PERCENT",
          discountValue: t.discountValue > 0 ? t.discountValue : 10,
        }))
      );
    } else if (newType === "ORDER_DISCOUNT") {
      setTiers((prev) =>
        prev.map((t, idx) => ({
          ...t,
          minOrderValue: t.minOrderValue && t.minOrderValue > 0 ? t.minOrderValue : (idx + 1) * 200000,
          discountValue: t.discountValue > 0 ? t.discountValue : (idx + 1) * 5,
        }))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!code.trim()) errors.push("Mã chương trình không được để trống");
    if (code.trim().length > 50 || !/^[A-Za-z0-9_-]+$/.test(code.trim())) errors.push("Mã chương trình tối đa 50 ký tự và chỉ gồm chữ, số, _ hoặc -");
    if (!name.trim() || name.trim().length > 150) errors.push("Tên chương trình phải có từ 1 đến 150 ký tự");
    const today = new Date().toLocaleDateString('en-CA');
    if (!editingPromo && startDate < today) errors.push("Ngày bắt đầu không được là ngày trong quá khứ");
    if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) errors.push("Ngày kết thúc phải sau ngày bắt đầu");
    if (budgetLimit !== undefined && budgetLimit <= 0) errors.push("Ngân sách phải lớn hơn 0 hoặc để trống");
    if (description.trim().length > 1000) errors.push("Mô tả không quá 1.000 ký tự");
    tiers.forEach((tier, index) => {
      if (type === "PRODUCT_DISCOUNT" && tier.buyProductId && tiers.some((other, otherIndex) => otherIndex < index && other.buyProductId === tier.buyProductId)) errors.push(`Sản phẩm ${index + 1}: sản phẩm đã được chọn ở dòng trước`);
      if (type === "PRODUCT_DISCOUNT" && !tier.buyProductId) errors.push(`Bậc ${index + 1}: phải chọn sản phẩm giảm giá`);
      if (type === "BUY_X_GET_Y") {
        if (!tier.requiredQty || tier.requiredQty <= 0) errors.push(`Bậc ${index + 1}: số lượng mua phải lớn hơn 0`);
        if (!tier.giftProductId) errors.push(`Bậc ${index + 1}: phải chọn sản phẩm quà tặng từ kho`);
        if (!tier.giftQty || tier.giftQty <= 0) errors.push(`Bậc ${index + 1}: số lượng tặng phải lớn hơn 0`);
      } else {
        if (type === "ORDER_DISCOUNT" && (!tier.minOrderValue || tier.minOrderValue <= 0)) errors.push(`Bậc ${index + 1}: giá trị đơn phải lớn hơn 0`);
        if (!tier.discountValue || tier.discountValue <= 0) errors.push(`Bậc ${index + 1}: mức giảm phải lớn hơn 0`);
        if (tier.discountType === "PERCENT" && tier.discountValue > 100) errors.push(`Bậc ${index + 1}: phần trăm giảm không quá 100%`);
      }
    });
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const payload: PromotionItem = {
      id: editingPromo ? editingPromo.id : `promo-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      type,
      startDate,
      endDate,
      status: editingPromo ? editingPromo.status : "ACTIVE",
      isActive: editingPromo?.isActive ?? true,
      branches: selectedBranches,
      description: description.trim(),
      budgetLimit,
      usageCount: editingPromo ? editingPromo.usageCount : 0,
      totalDiscountGiven: editingPromo ? editingPromo.totalDiscountGiven : 0,
      createdAt: editingPromo
        ? editingPromo.createdAt
        : new Date().toISOString().slice(0, 10),
      tiers,
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        'Không thể lưu chương trình khuyến mãi. Vui lòng kiểm tra lại thông tin.';
      setValidationErrors([apiMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="promo-modal-overlay">
      <div className="promo-modal-dialog promo-modal-dialog-lg">
        <div className="promo-modal-header">
          <h3>
            <Tag className="w-5 h-5 text-teal-700" />
            <span>
              {editingPromo
                ? "Chỉnh sửa chương trình khuyến mãi"
                : "Tạo mới chương trình khuyến mãi"}
            </span>
          </h3>
          <button onClick={onClose} className="promo-modal-close" title="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
          }}
        >
          <div className="promo-modal-body">
            {validationErrors.length > 0 && (
              <div role="alert" className="promo-validation-summary">
                <strong>Vui lòng kiểm tra lại thông tin:</strong>
                <ul>
                  {validationErrors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
            {/* Thông tin chung */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label form-label-required">
                  Mã chương trình
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="form-input font-mono font-bold"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  Tên chương trình khuyến mãi
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Siêu hội tiêu dùng tháng 10..."
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label form-label-required">
                  Hình thức áp dụng
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as PromotionType)}
                  className="form-select-control"
                >
                  <option value="ORDER_DISCOUNT">
                    Chiết khấu theo đơn hàng
                  </option>
                  <option value="BUY_X_GET_Y">Mua X tặng Y</option>
                  <option value="PRODUCT_DISCOUNT">Giảm giá sản phẩm</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">
                  Ngày kết thúc
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phạm vi áp dụng</label>
                <select
                  value={
                    selectedBranches.includes("ALL")
                      ? "ALL"
                      : selectedBranches[0]
                  }
                  onChange={(e) =>
                    setSelectedBranches(
                      e.target.value === "ALL" ? ["ALL"] : [e.target.value],
                    )
                  }
                  className="form-select-control"
                >
                  <option value="ALL">Toàn hệ thống</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngân sách tối đa (VNĐ)</label>
                <input
                  type="number"
                  value={budgetLimit || ""}
                  onChange={(e) =>
                    setBudgetLimit(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  placeholder="Không giới hạn"
                  className="form-input"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Tổng ngân sách chiết khấu toàn chiến dịch (để trống = không giới hạn kinh phí).
                </span>
                {editingPromo && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Đã giải ngân thực tế:</span>
                      <strong style={{ color: '#0f766e' }}>
                        {editingPromo.totalDiscountGiven.toLocaleString('vi-VN')} đ ({editingPromo.usageCount} lượt)
                      </strong>
                    </div>
                    {budgetLimit && budgetLimit > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#475569' }}>
                        <span>Ngân sách còn lại:</span>
                        <strong style={{ color: budgetLimit - editingPromo.totalDiscountGiven <= 0 ? '#dc2626' : '#16a34a' }}>
                          {Math.max(0, budgetLimit - editingPromo.totalDiscountGiven).toLocaleString('vi-VN')} đ
                          {budgetLimit - editingPromo.totalDiscountGiven <= 0 && ' (Hết ngân sách)'}
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả / Thể lệ tóm tắt</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú chi tiết điều kiện áp dụng tại quầy..."
                rows={2}
                className="form-textarea"
              />
            </div>

            {/* Cấu hình các bậc thang điều kiện */}
            <div style={{ marginTop: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-teal-800 m-0">
                  {type === "PRODUCT_DISCOUNT" ? "Danh sách sản phẩm giảm giá" : "Thiết lập bậc thang khuyến mãi & Quà tặng"}
                </h4>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="btn-secondary-pill text-xs py-1 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{type === "PRODUCT_DISCOUNT" ? "Thêm sản phẩm" : "Thêm bậc"}</span>
                </button>
              </div>

              <div className="modal-tiers-list">
                {tiers.map((tier, idx) => (
                  <div key={tier.id} className="modal-tier-row">
                    {type !== "PRODUCT_DISCOUNT" && <span className="modal-tier-badge">
                      Bậc {tier.tierLevel}
                    </span>}

                    {type === "ORDER_DISCOUNT" && (
                      <>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Đơn từ (đ)
                          </label>
                          <input
                            type="number"
                            value={tier.minOrderValue || ""}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "minOrderValue",
                                Number(e.target.value),
                              )
                            }
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                        <div style={{ width: 100 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Loại giảm
                          </label>
                          <select
                            value={tier.discountType}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "discountType",
                                e.target.value,
                              )
                            }
                            className="form-select-control"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          >
                            <option value="PERCENT">%</option>
                            <option value="FIXED_AMOUNT">VNĐ</option>
                          </select>
                        </div>
                        <div style={{ width: 90 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Mức giảm
                          </label>
                          <input
                            type="number"
                            value={tier.discountValue}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "discountValue",
                                Number(e.target.value),
                              )
                            }
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                        {tier.discountType === "PERCENT" && (
                          <div style={{ flex: 1 }}>
                            <label
                              style={{
                                display: "block",
                                color: "#64748b",
                                fontSize: "0.74rem",
                                marginBottom: 2,
                              }}
                            >
                              Giảm tối đa (đ)
                            </label>
                            <input
                              type="number"
                              value={tier.maxDiscount || ""}
                              onChange={(e) =>
                                handleUpdateTier(
                                  idx,
                                  "maxDiscount",
                                  Number(e.target.value),
                                )
                              }
                              className="form-input"
                              style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {type === "BUY_X_GET_Y" && (
                      <div className="promotion-buy-gift-grid">
                        <div style={{ flex: 2, minWidth: 190 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Sản phẩm mua (X)
                          </label>
                          <ProductPicker products={availableProducts} value={tier.buyProductId} selectedName={tier.buyProductName} optional onChange={(p) => handleUpdateTier(idx, { buyProductId: p?.id, buyProductName: p?.name, buyUnit: p?.baseUnit || "Cái" })} />
                        </div>
                        <div style={{ width: 75 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Mua SL (X)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={tier.requiredQty || 2}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "requiredQty",
                                Number(e.target.value),
                              )
                            }
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                        <div style={{ width: 105 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Đơn vị mua (X)
                          </label>
                          <ProductUnitPicker productId={tier.buyProductId} baseUnit={availableProducts.find(p => p.id === tier.buyProductId)?.baseUnit} value={tier.buyUnit} onChange={unit => handleUpdateTier(idx, "buyUnit", unit)} />
                        </div>
                        <div style={{ flex: 2, minWidth: 200 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Sản phẩm quà tặng (Y)
                          </label>
                          <ProductPicker products={availableProducts} value={tier.giftProductId} selectedName={tier.giftProductName}  onChange={(p) => handleUpdateTier(idx, { giftProductId: p?.id, giftProductName: p?.name, giftUnit: p?.baseUnit || "Cái", giftProductSku: p?.productCode })} />
                          {(!tier.giftProductId || !availableProducts.some((p) => p.id === tier.giftProductId)) && (
                            <input
                              type="text"
                              value={tier.giftProductName || ""}
                              onChange={(e) =>
                                handleUpdateTier(
                                  idx,
                                  "giftProductName",
                                  e.target.value,
                                )
                              }
                              placeholder="Hoặc nhập tên quà tặng..."
                              className="form-input"
                              style={{ padding: "4px 8px", fontSize: "0.75rem", marginTop: 4 }}
                            />
                          )}
                        </div>
                        <div style={{ width: 110 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Đơn vị tặng (Y)
                          </label>
                          <ProductUnitPicker productId={tier.giftProductId} baseUnit={availableProducts.find(p => p.id === tier.giftProductId)?.baseUnit} value={tier.giftUnit} onChange={unit => handleUpdateTier(idx, "giftUnit", unit)} />
                        </div>
                        <div style={{ width: 75 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            SL Tặng
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={tier.giftQty || 1}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "giftQty",
                                Number(e.target.value),
                              )
                            }
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                      </div>
                    )}

                    {type === "PRODUCT_DISCOUNT" && (
                      <>
                        <div style={{ flex: 2 }}>
                          <label className="form-label">Sản phẩm áp dụng</label>
                          <ProductPicker products={availableProducts} value={tier.buyProductId} selectedName={tier.buyProductName} onChange={(p) => handleUpdateTier(idx, { buyProductId: p?.id, buyProductName: p?.name })} />
                        </div>
                        <div style={{ width: 100 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Loại giảm
                          </label>
                          <select
                            value={tier.discountType}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "discountType",
                                e.target.value,
                              )
                            }
                            className="form-select-control"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          >
                            <option value="PERCENT">%</option>
                            <option value="FIXED_AMOUNT">VNĐ</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              color: "#64748b",
                              fontSize: "0.74rem",
                              marginBottom: 2,
                            }}
                          >
                            Giá trị giảm
                          </label>
                          <input
                            type="number"
                            value={tier.discountValue}
                            onChange={(e) =>
                              handleUpdateTier(
                                idx,
                                "discountValue",
                                Number(e.target.value),
                              )
                            }
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                        </div>
                      </>
                    )}

                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="btn-table-icon btn-danger-icon"
                        style={{ marginTop: 16 }}
                        title="Xóa bậc này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="promo-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-pill"
            >
              Hủy bỏ
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary-pill">
              {isSubmitting ? "Đang lưu..." : editingPromo ? "Lưu thay đổi" : "Kích hoạt CTKM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
