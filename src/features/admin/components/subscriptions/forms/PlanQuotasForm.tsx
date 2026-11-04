import React from "react";
import type {
  PlanQuotaConfig,
  BackupFrequency,
} from "../../../types/plan.types";

interface PlanQuotasFormProps {
  quotas: PlanQuotaConfig;
  errors?: Record<string, string>;
  onChange: (quotas: Partial<PlanQuotaConfig>) => void;
}

export const PlanQuotasForm: React.FC<PlanQuotasFormProps> = ({
  quotas,
  errors = {},
  onChange,
}) => {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid var(--border-light, #e2e8f0)",
        borderRadius: "12px",
        padding: "14px 18px",
        boxShadow: "0 1px 4px rgba(0, 30, 90, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            background: "var(--blue-light, #f0f6ff)",
            color: "var(--blue-primary, #0066ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            2. Hạn Mức Tài Nguyên Hệ Thống
          </h3>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px 14px",
        }}
      >
        {/* Max Branches */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "3px",
            }}
          >
            Số chi nhánh <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={quotas.maxBranches}
              onChange={(e) =>
                onChange({ maxBranches: Number(e.target.value) })
              }
              placeholder="1"
              style={{
                width: "100%",
                padding: "6px 42px 6px 12px",
                fontSize: "13px",
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: "9999px",
                border: `1px solid ${errors.maxBranches ? "#ef4444" : "#cbd5e1"}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              cửa hàng
            </span>
          </div>
          {errors.maxBranches && (
            <p
              style={{ margin: "2px 0 0", fontSize: "11px", color: "#ef4444" }}
            >
              {errors.maxBranches}
            </p>
          )}
        </div>

        {/* Max Employees */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "3px",
            }}
          >
            Số tài khoản nhân viên <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={quotas.maxEmployees}
              onChange={(e) =>
                onChange({ maxEmployees: Number(e.target.value) })
              }
              placeholder="3"
              style={{
                width: "100%",
                padding: "6px 42px 6px 12px",
                fontSize: "13px",
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: "9999px",
                border: `1px solid ${errors.maxEmployees ? "#ef4444" : "#cbd5e1"}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              nhân sự
            </span>
          </div>
          {errors.maxEmployees && (
            <p
              style={{ margin: "2px 0 0", fontSize: "11px", color: "#ef4444" }}
            >
              {errors.maxEmployees}
            </p>
          )}
        </div>

        {/* Max Storage */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "3px",
            }}
          >
            Dung lượng Cloud <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              min={1}
              value={quotas.maxStorageGb || ""}
              onChange={(e) =>
                onChange({ maxStorageGb: Math.max(1, Number(e.target.value)) })
              }
              placeholder="5"
              style={{
                width: "100%",
                padding: "6px 36px 6px 12px",
                fontSize: "13px",
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 600,
                borderRadius: "9999px",
                border: `1px solid ${errors.maxStorageGb ? "#ef4444" : "#cbd5e1"}`,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "11px",
                color: "#64748b",
              }}
            >
              GB
            </span>
          </div>
          {errors.maxStorageGb && (
            <p
              style={{ margin: "2px 0 0", fontSize: "11px", color: "#ef4444" }}
            >
              {errors.maxStorageGb}
            </p>
          )}
        </div>

        {/* Backup Frequency */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              marginBottom: "3px",
            }}
          >
            Tần suất sao lưu
          </label>
          <select
            value={quotas.backupFrequency}
            onChange={(e) =>
              onChange({ backupFrequency: e.target.value as BackupFrequency })
            }
            style={{
              width: "100%",
              padding: "6px 12px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "9999px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          >
            <option value="Daily">Hàng ngày (Daily Automated)</option>
            <option value="Weekly">Hàng tuần (Weekly Snapshot)</option>
            <option value="Hourly">Mỗi giờ (Realtime Cloud Sync)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
