import React from "react";
import type { SubscriptionPlan } from "../../types/plan.types";
import { AlertTriangle, ShieldAlert, Trash2 } from "lucide-react";

interface DeletePlanModalProps {
  plan: SubscriptionPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (planId: string) => void;
  onSwitchToInactive?: (planId: string) => void;
}

export const DeletePlanModal: React.FC<DeletePlanModalProps> = ({
  plan,
  isOpen,
  onClose,
  onConfirmDelete,
  onSwitchToInactive,
}) => {
  if (!isOpen || !plan) return null;

  const isBlocked = plan.activeTenantCount > 0;

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="admin-modal-box"
        style={{ maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: isBlocked ? "#fff7ed" : "#fef2f2",
                color: isBlocked ? "#c2410c" : "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isBlocked ? (
                <ShieldAlert size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>
            <div>
              <div className="admin-modal-title">
                Xóa Gói Dịch Vụ (Delete Subscription Plan)
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {plan.name} (
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {plan.code}
                </span>
                )
              </div>
            </div>
          </div>
          <button
            type="button"
            className="admin-modal-close-btn"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="admin-modal-body" style={{ padding: "20px 24px" }}>
          {isBlocked ? (
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "16px",
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#b45309",
                }}
              >
                <ShieldAlert size={16} />
                CHẶN XÓA GÓI ĐANG CÓ TENANT SỬ DỤNG
              </div>
              <p style={{ margin: "6px 0" }}>
                Gói <b>{plan.name}</b> (<code>{plan.code}</code>) hiện đang có{" "}
                <b>{plan.activeTenantCount} khách hàng thuê (Tenants)</b> ký hợp
                đồng đang hiệu lực.
              </p>
              <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                <li>
                  Hệ thống <b>nghiêm cấm xóa vĩnh viễn</b> để bảo toàn tính toàn
                  vẹn dữ liệu hợp đồng và hóa đơn kiểm toán.
                </li>
                <li>
                  Khuyến nghị: Chuyển gói sang trạng thái{" "}
                  <b>Ngừng bán (Inactive)</b> để chặn khách hàng mới đăng ký mà
                  không ảnh hưởng tới các cửa hàng hiện hữu.
                </li>
              </ul>
            </div>
          ) : (
            <div
              style={{
                fontSize: 13.5,
                color: "var(--text-main)",
                lineHeight: 1.5,
              }}
            >
              <p style={{ marginTop: 0 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn gói dịch vụ{" "}
                <b>{plan.name}</b> (<code>{plan.code}</code>) không?
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                Gói này hiện có <b>0 khách hàng thuê</b>. Hành động này không
                thể hoàn tác sau khi xác nhận.
              </p>
            </div>
          )}
        </div>

        <div
          className="admin-modal-footer"
          style={{
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
          }}
        >
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
          >
            {isBlocked ? "Đã hiểu & Đóng" : "Hủy bỏ"}
          </button>
          {isBlocked ? (
            onSwitchToInactive &&
            plan.status === "Active" && (
              <button
                type="button"
                className="admin-btn admin-btn-warning"
                onClick={() => {
                  onSwitchToInactive(plan.id);
                  onClose();
                }}
                style={{
                  backgroundColor: "#f59e0b",
                  color: "#fff",
                  border: "none",
                }}
              >
                Chuyển Sang Ngừng Bán
              </button>
            )
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={() => {
                onConfirmDelete(plan.id);
                onClose();
              }}
              style={{
                backgroundColor: "#dc2626",
                color: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              Xóa Vĩnh Viễn
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
