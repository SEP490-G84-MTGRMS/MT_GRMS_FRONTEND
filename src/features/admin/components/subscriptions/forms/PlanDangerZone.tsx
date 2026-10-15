import React, { useState } from "react";
import type { SubscriptionPlan } from "../../../types/plan.types";
import { DeletePlanModal } from "../DeletePlanModal";

interface PlanDangerZoneProps {
  plan: SubscriptionPlan;
  onDeleted: () => void;
}

export const PlanDangerZone: React.FC<PlanDangerZoneProps> = ({
  plan,
  onDeleted,
}) => {
  const [showModal, setShowModal] = useState(false);
  const isProtected = plan.activeTenantCount > 0;

  return (
    <div
      style={{
        background: "#fffdfd",
        border: "1px solid #fee2e2",
        borderRadius: "12px",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "#fef2f2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <span
            style={{ fontSize: "12.5px", fontWeight: 700, color: "#991b1b" }}
          >
            {isProtected
              ? `Khóa xóa: ${plan.activeTenantCount} cửa hàng đang dùng`
              : "Vùng nguy hiểm: Xóa gói"}
          </span>
          <span
            style={{ fontSize: "11.5px", color: "#b91c1c", marginLeft: "6px" }}
          >
            {isProtected
              ? 'Chỉ có thể chuyển sang "Tạm ngưng mở bán"'
              : "Gói có 0 người dùng, được phép xóa vĩnh viễn"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={{
          padding: "5px 14px",
          borderRadius: "9999px",
          fontSize: "11.5px",
          fontWeight: 600,
          background: isProtected ? "#f1f5f9" : "#dc2626",
          color: isProtected ? "#94a3b8" : "#ffffff",
          border: isProtected ? "1px solid #cbd5e1" : "none",
          cursor: isProtected ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {isProtected ? "🔒 Không Thể Xóa" : "🗑️ Xóa Gói"}
      </button>

      {showModal && (
        <DeletePlanModal
          plan={plan}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirmDelete={(_planId) => {
            setShowModal(false);
            onDeleted();
          }}
          onSwitchToInactive={(_planId) => {
            setShowModal(false);
            onDeleted();
          }}
        />
      )}
    </div>
  );
};
