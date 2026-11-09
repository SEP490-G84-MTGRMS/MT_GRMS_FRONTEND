import { useState, useEffect, type FC } from "react";
import { X, Plus, Trash2, Tag } from "lucide-react";
import type {
  PromotionItem,
  PromotionType,
  PromotionTier,
} from "../../types/promotion.types";
import { MOCK_BRANCHES } from "../../mock/promotionMockData";
import { productApi } from "../../../product/api/productApi";

const COMMON_UNITS = [
  "Hộp",
  "Chai",
  "Vỉ",
  "Gói",
  "Viên",
  "Cái",
  "Túi",
  "Kg",
  "Lọ",
  "Thùng",
  "Tuýp",
  "Bịch",
];

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (promo: PromotionItem) => void;
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
    Array<{ id: string; name: string; productCode: string; baseUnit: string }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      productApi
        .getProductsPaged({ pageSize: 100, status: "Active" })
        .then((res) => {
          if (res?.items) {
            setAvailableProducts(
              res.items.map((p) => ({
                id: p.id,
                name: p.name,
                productCode: p.productCode,
                baseUnit: p.baseUnit || "Cái",
              }))
            );
          }
        })
        .catch((err) => {
          console.warn("Không thể tải danh mục sản phẩm quà tặng:", err);
        });
    }
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
      maxDiscount: type === "BUY_X_GET_Y" ? undefined : nextLevel * 30000,
      minOrderValue: type === "BUY_X_GET_Y" ? undefined : nextLevel * 200000,
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vui lòng nhập tên chương trình khuyến mãi");
      return;
    }

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

    onSave(payload);
    onClose();
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
                  Thiết lập bậc thang khuyến mãi & Quà tặng
                </h4>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="btn-secondary-pill text-xs py-1 px-3"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm bậc</span>
                </button>
              </div>

              <div className="modal-tiers-list">
                {tiers.map((tier, idx) => (
                  <div key={tier.id} className="modal-tier-row">
                    <span className="modal-tier-badge">
                      Bậc {tier.tierLevel}
                    </span>

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
                      <>
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
                          <select
                            value={tier.buyProductId || ""}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const prod = availableProducts.find((p) => p.id === selId);
                              if (prod) {
                                handleUpdateTier(idx, {
                                  buyProductId: prod.id,
                                  buyProductName: prod.name,
                                });
                              } else {
                                handleUpdateTier(idx, {
                                  buyProductId: undefined,
                                  buyProductName: undefined,
                                });
                              }
                            }}
                            className="form-select-control"
                            style={{ padding: "6px 8px", fontSize: "0.8rem", width: "100%" }}
                          >
                            <option value="">-- Bất kỳ sản phẩm trong giỏ --</option>
                            {availableProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.productCode} - {p.name} ({p.baseUnit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ width: 80 }}>
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
                          <select
                            value={tier.giftProductId || ""}
                            onChange={(e) => {
                              const selId = e.target.value;
                              const prod = availableProducts.find((p) => p.id === selId);
                              if (prod) {
                                handleUpdateTier(idx, {
                                  giftProductId: prod.id,
                                  giftProductName: prod.name,
                                  giftProductSku: prod.productCode,
                                  giftUnit: prod.baseUnit || tier.giftUnit || "Cái",
                                });
                              } else {
                                handleUpdateTier(idx, {
                                  giftProductId: "",
                                  giftProductName: "",
                                  giftProductSku: undefined,
                                });
                              }
                            }}
                            className="form-select-control"
                            style={{ padding: "6px 8px", fontSize: "0.8rem", width: "100%" }}
                          >
                            <option value="">-- Chọn sản phẩm từ kho --</option>
                            {availableProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.productCode} - {p.name} ({p.baseUnit})
                              </option>
                            ))}
                          </select>
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
                            Đơn vị tính
                          </label>
                          <input
                            list={`units-list-${idx}`}
                            type="text"
                            value={tier.giftUnit || "Cái"}
                            onChange={(e) =>
                              handleUpdateTier(idx, "giftUnit", e.target.value)
                            }
                            placeholder="ĐVT..."
                            className="form-input"
                            style={{ padding: "6px 8px", fontSize: "0.8rem" }}
                          />
                          <datalist id={`units-list-${idx}`}>
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
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
                      </>
                    )}

                    {type === "PRODUCT_DISCOUNT" && (
                      <>
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
            <button type="submit" className="btn-primary-pill">
              {editingPromo ? "Lưu thay đổi" : "Kích hoạt CTKM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
