import { useState, useId } from "react";
import type { FC, FormEvent } from "react";
import {
  Lock,
  ShieldAlert,
  AlertOctagon,
  X,
  Store,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { Tenant, LockType } from "../../types/admin.types";

interface ApplyLockModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: Tenant, lockType: LockType, reason: string) => void;
}

const QUICK_REASONS = [
  "Nợ cước dịch vụ quá hạn thanh toán theo quy định",
  "Vi phạm điều khoản bảo mật và chính sách an toàn dữ liệu",
  "Đại diện pháp luật của chuỗi yêu cầu tạm dừng hoạt động",
  "Phát hiện dấu hiệu bất thường trong phiên giao dịch POS",
];

export const ApplyLockModal: FC<ApplyLockModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [lockType, setLockType] = useState<LockType>("soft");
  const [reason, setReason] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const reasonInputId = useId();
  const confirmCheckboxId = useId();

  if (!isOpen || !tenant) return null;

  const minReasonLength = 10;
  const isReasonValid = reason.trim().length >= minReasonLength;
  const canSubmit = isReasonValid && isConfirmed;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(tenant, lockType, reason.trim());
    onClose();
  };

  const handleSelectQuickReason = (text: string) => {
    setReason(text);
  };

  const planLabel =
    tenant.plan === "enterprise"
      ? "Gói Doanh Nghiệp"
      : tenant.plan === "advanced"
        ? "Gói Nâng Cao"
        : "Gói Cơ Bản";

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="admin-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "960px",
          borderRadius: "24px",
          boxShadow: "0 25px 65px -12px rgba(15, 23, 42, 0.28)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FAFCFF 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "#FEF2F2",
                border: "1px solid #FEE2E2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#DC2626",
                flexShrink: 0,
              }}
            >
              <Lock size={20} strokeWidth={2} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "16.5px",
                  fontWeight: 800,
                  color: "#0F172A",
                  letterSpacing: "-0.01em",
                }}
              >
                Áp dụng Lệnh Khóa Khách Hàng (Tenant Lockout)
              </h2>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12.5px",
                  color: "#64748B",
                }}
              >
                Cưỡng chế thu hồi quyền truy cập hoặc giới hạn quyền kinh doanh theo quy chế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
              color: "#64748B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body - Bố cục Ngang 2 Cột (2-Column Horizontal Layout) */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "20px 24px",
              display: "grid",
              gridTemplateColumns: "1.05fr 1fr",
              gap: "20px",
              alignItems: "start",
            }}
          >
            {/* ═══ CỘT TRÁI: Hồ sơ khách hàng & Hình thức khóa ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Thẻ hồ sơ Tenant */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "14px",
                  backgroundColor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      backgroundColor: "#EEF2F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#334155",
                      flexShrink: 0,
                    }}
                  >
                    <Store size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                        {tenant.name}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "1px 7px",
                          borderRadius: "9999px",
                          backgroundColor: "#EFF6FF",
                          border: "1px solid #DBEAFE",
                          color: "#1D4ED8",
                          fontSize: "11px",
                          fontWeight: 600,
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        {tenant.subdomain}.mtgrms.vn
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: 2 }}>
                      Chủ chuỗi: <b style={{ color: "#334155" }}>{tenant.ownerName}</b> • MST:{" "}
                      <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        {tenant.taxCode}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: "9999px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {planLabel}
                </span>
              </div>

              {/* Lựa chọn hình thức khóa (2 Thẻ xếp dọc nhau) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#1E293B",
                    marginBottom: 8,
                  }}
                >
                  Hình thức khóa tài khoản <span style={{ color: "#DC2626" }}>*</span>
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Option 1: Soft-Lock */}
                  <div
                    onClick={() => setLockType("soft")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border:
                        lockType === "soft"
                          ? "2px solid #F59E0B"
                          : "1px solid #E2E8F0",
                      backgroundColor:
                        lockType === "soft" ? "#FFFBEB" : "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: lockType === "soft" ? "#B45309" : "#64748B",
                        }}
                      >
                        <ShieldAlert size={16} />
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1E293B" }}>
                          Khóa Mềm (Soft-Lock)
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "9999px",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            color: "#B45309",
                            fontWeight: 600,
                          }}
                        >
                          Chỉ đọc dữ liệu
                        </span>
                      </div>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border:
                            lockType === "soft"
                              ? "5px solid #F59E0B"
                              : "2px solid #CBD5E1",
                          backgroundColor: "#FFFFFF",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>
                      Chuyển tenant sang chế độ <b>Chỉ đọc (Read-Only)</b>. Vẫn tra cứu dữ liệu nhưng chặn toàn bộ bán hàng mới tại POS.
                    </p>
                  </div>

                  {/* Option 2: Hard-Lock */}
                  <div
                    onClick={() => setLockType("hard")}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      border:
                        lockType === "hard"
                          ? "2px solid #DC2626"
                          : "1px solid #E2E8F0",
                      backgroundColor:
                        lockType === "hard" ? "#FEF2F2" : "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: lockType === "hard" ? "#DC2626" : "#64748B",
                        }}
                      >
                        <AlertOctagon size={16} />
                        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1E293B" }}>
                          Khóa Cứng (Hard-Lock)
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "9999px",
                            backgroundColor: "rgba(220, 38, 38, 0.15)",
                            color: "#DC2626",
                            fontWeight: 600,
                          }}
                        >
                          Cấm truy cập
                        </span>
                      </div>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border:
                            lockType === "hard"
                              ? "5px solid #DC2626"
                              : "2px solid #CBD5E1",
                          backgroundColor: "#FFFFFF",
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: 1.4 }}>
                      <b>Đình chỉ toàn bộ</b> quyền truy cập. Hủy tức thì mọi token đăng nhập, khóa toàn bộ subdomain của chuỗi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cảnh báo tác động thực tế */}
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  backgroundColor: lockType === "hard" ? "#FEF2F2" : "#FFFBEB",
                  border: `1px solid ${lockType === "hard" ? "#FCA5A5" : "#FDE68A"}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    color: lockType === "hard" ? "#DC2626" : "#D97706",
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  {lockType === "hard" ? <AlertTriangle size={16} /> : <Info size={16} />}
                </div>
                <div style={{ fontSize: "11.5px", lineHeight: 1.45 }}>
                  {lockType === "hard" ? (
                    <span style={{ color: "#991B1B" }}>
                      <b>Cảnh báo nghiêm trọng:</b> Thu hồi toàn bộ phiên làm việc tại quầy POS, chặn truy cập cổng quản trị Store Owner và API VietQR.
                    </span>
                  ) : (
                    <span style={{ color: "#92400E" }}>
                      <b>Lưu ý vận hành:</b> Cho phép nhân viên đối chiếu hóa đơn nhưng chặn thông báo lỗi <code>403 ReadOnly Lockout</code> khi bán hàng mới.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ CỘT PHẢI: Lý do giải trình & Cam kết đối soát ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label
                  htmlFor={reasonInputId}
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#1E293B",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileText size={14} color="#475569" />
                  Lý do giải trình bắt buộc (Audit Log) <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: isReasonValid ? "#16A34A" : "#94A3B8",
                  }}
                >
                  {reason.trim().length} / {minReasonLength} ký tự
                </span>
              </div>

              {/* Gợi ý lý do nhanh (Quick Chips) */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {QUICK_REASONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickReason(item)}
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "9999px",
                      border: "1px solid #E2E8F0",
                      backgroundColor: reason === item ? "#EFF6FF" : "#F8FAFC",
                      color: reason === item ? "#1D4ED8" : "#475569",
                      borderColor: reason === item ? "#93C5FD" : "#E2E8F0",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      fontWeight: reason === item ? 600 : 500,
                      textAlign: "left",
                    }}
                  >
                    + {item}
                  </button>
                ))}
              </div>

              <textarea
                id={reasonInputId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập chi tiết biên bản / quyết định khóa để phục vụ đối soát kiểm toán hệ thống..."
                required
                minLength={minReasonLength}
                rows={4}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: isReasonValid ? "1px solid #CBD5E1" : "1px solid #FCA5A5",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.45,
                  transition: "border-color 0.15s ease",
                }}
              />

              {/* Checkbox xác nhận trách nhiệm */}
              <div
                onClick={() => setIsConfirmed(!isConfirmed)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: "12px",
                  backgroundColor: isConfirmed ? "#F0FDF4" : "#F8FAFC",
                  border: isConfirmed ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  id={confirmCheckboxId}
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 15,
                    height: 15,
                    marginTop: 2,
                    accentColor: "#16A34A",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <label
                  htmlFor={confirmCheckboxId}
                  style={{
                    fontSize: "12px",
                    color: isConfirmed ? "#166534" : "#475569",
                    cursor: "pointer",
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  Tôi xác nhận đã kiểm tra đối soát và chịu trách nhiệm thi hành lệnh khóa này trên hệ thống.
                </label>
              </div>

              {/* Tóm tắt hiệu lực */}
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: "#F1F5F9",
                  fontSize: "11.5px",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  Hiệu lực lệnh: <b>Tức thời</b>
                </span>
                <span>
                  Trạng thái đích:{" "}
                  <b style={{ color: lockType === "hard" ? "#DC2626" : "#D97706" }}>
                    {lockType === "hard" ? "Bị Khóa (Hard-Lock)" : "Bị Khóa (Soft-Lock)"}
                  </b>
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid #F1F5F9",
              backgroundColor: "#FAFCFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "8px 20px",
                borderRadius: "9999px",
                border: "none",
                backgroundColor: canSubmit ? "#DC2626" : "#CBD5E1",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: canSubmit ? "0 4px 12px rgba(220, 38, 38, 0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Lock size={15} />
              <span>Xác nhận Thi hành Lệnh Khóa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
