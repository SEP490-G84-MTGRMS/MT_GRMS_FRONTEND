import { useState, useId } from "react";
import type { FC, FormEvent } from "react";
import { X } from "lucide-react";
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
      ? "Doanh Nghiệp"
      : tenant.plan === "advanced"
        ? "Nâng Cao"
        : "Cơ Bản";

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
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        className="admin-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "860px",
          borderRadius: "20px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.15)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Header - Phong cách hệt như ảnh tham khảo */}
        <div
          style={{
            padding: "20px 24px 16px 24px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.015em",
              }}
            >
              Áp dụng lệnh khóa khách hàng
            </h2>
            <div
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600, color: "#334155" }}>
                {tenant.name}
              </span>
              <span style={{ color: "#CBD5E1" }}>|</span>
              <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {tenant.subdomain}.mtgrms.vn
              </span>
              <span style={{ color: "#CBD5E1" }}>|</span>
              <span>Gói {planLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94A3B8";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body - Bố cục Ngang 2 Cột (Horizontal Layout) giữ trọn vẹn style ảnh mẫu */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* Hàng trên: Bố cục 2 Cột ngang */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.1fr",
                gap: "24px",
                alignItems: "stretch",
              }}
            >
              {/* ═══ CỘT TRÁI: Chọn hình thức khóa (Dài xuống ngang bằng cột phải) ═══ */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#0F172A",
                    marginBottom: "10px",
                  }}
                >
                  Chọn hình thức khóa
                </label>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "12px",
                    border: "1px solid #DCE6F1",
                    overflow: "hidden",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {/* Row 1: Khóa Mềm (Soft-Lock) */}
                  <div
                    onClick={() => setLockType("soft")}
                    style={{
                      flex: 1,
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      cursor: "pointer",
                      backgroundColor:
                        lockType === "soft" ? "#F0F5FF" : "#FFFFFF",
                      borderBottom: "1px solid #E2E8F0",
                      transition: "background-color 0.15s ease",
                      justifyContent: "center",
                      flexDirection: "row",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "4px",
                        backgroundColor:
                          lockType === "soft" ? "#2563EB" : "#FFFFFF",
                        border:
                          lockType === "soft"
                            ? "1px solid #2563EB"
                            : "1.5px solid #94A3B8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        marginTop: 2,
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {lockType === "soft" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            color: lockType === "soft" ? "#1D4ED8" : "#0F172A",
                          }}
                        >
                          Khóa mềm (Soft-Lock)
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              lockType === "soft" ? "#DBEAFE" : "#F1F5F9",
                            color: lockType === "soft" ? "#1E40AF" : "#64748B",
                          }}
                        >
                          Chỉ đọc dữ liệu
                        </span>
                      </div>
                      <div
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "12px",
                          color: "#64748B",
                          lineHeight: 1.5,
                        }}
                      >
                        Chuyển sang chế độ chỉ đọc. Vẫn tra cứu dữ liệu nhưng
                        chặn toàn bộ bán hàng mới tại POS.
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Khóa Cứng (Hard-Lock) */}
                  <div
                    onClick={() => setLockType("hard")}
                    style={{
                      flex: 1,
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      cursor: "pointer",
                      backgroundColor:
                        lockType === "hard" ? "#FEF2F2" : "#FFFFFF",
                      transition: "background-color 0.15s ease",
                      justifyContent: "center",
                      flexDirection: "row",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "4px",
                        backgroundColor:
                          lockType === "hard" ? "#DC2626" : "#FFFFFF",
                        border:
                          lockType === "hard"
                            ? "1px solid #DC2626"
                            : "1.5px solid #94A3B8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        marginTop: 2,
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {lockType === "hard" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            color: lockType === "hard" ? "#DC2626" : "#0F172A",
                          }}
                        >
                          Khóa cứng (Hard-Lock)
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              lockType === "hard" ? "#FEE2E2" : "#F1F5F9",
                            color: lockType === "hard" ? "#B91C1C" : "#64748B",
                          }}
                        >
                          Cấm truy cập
                        </span>
                      </div>
                      <div
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "12px",
                          color: "#64748B",
                          lineHeight: 1.5,
                        }}
                      >
                        Đình chỉ toàn bộ quyền truy cập. Hủy tức thì token đăng
                        nhập và khóa subdomain.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ CỘT PHẢI: Lý do giải trình & Gợi ý nhanh ═══ */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <label
                    htmlFor={reasonInputId}
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#0F172A",
                    }}
                  >
                    Lý do giải trình (Audit Log){" "}
                    <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <span
                    style={{
                      fontSize: "12px",
                      color: isReasonValid ? "#16A34A" : "#94A3B8",
                      fontWeight: 500,
                    }}
                  >
                    {reason.trim().length} / {minReasonLength} ký tự
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 2px 0",
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                >
                  Chọn nhanh nguyên nhân khóa hoặc nhập chi tiết phục vụ đối soát:
                </p>

                {/* Các nút chọn nhanh tương tự các nút Thứ 2..Chủ nhật */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {QUICK_REASONS.map((item, idx) => {
                    const isSelected = reason === item;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectQuickReason(item)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "8px",
                          border: isSelected
                            ? "1.5px solid #0066FF"
                            : "1px solid #CBD5E1",
                          backgroundColor: "#FFFFFF",
                          color: isSelected ? "#0066FF" : "#334155",
                          fontWeight: isSelected ? 600 : 400,
                          fontSize: "11.5px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textAlign: "left",
                          lineHeight: 1.35,
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  id={reasonInputId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập nội dung giải trình phục vụ đối soát..."
                  required
                  minLength={minReasonLength}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical",
                    color: "#0F172A",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Hàng dưới: Xác nhận thi hành lệnh khóa (Công tắc Toggle Switch kiểu iOS trải rộng một dòng bên dưới) */}
            <div
              onClick={() => setIsConfirmed((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                backgroundColor: isConfirmed ? "#F0FDF4" : "#F8FAFC",
                transition: "all 0.15s ease",
                gap: 16,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#0F172A",
                  }}
                >
                  Xác nhận thi hành lệnh khóa
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: 2,
                  }}
                >
                  Tôi đã kiểm tra đối soát và chịu trách nhiệm áp dụng lệnh
                  khóa này trên hệ thống
                </div>
              </div>

              {/* iOS Style Toggle Switch */}
              <div
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: "9999px",
                  backgroundColor: isConfirmed ? "#0066FF" : "#CBD5E1",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                  transition: "background-color 0.2s ease",
                  flexShrink: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
                    transform: isConfirmed
                      ? "translateX(20px)"
                      : "translateX(0px)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer - Phong cách nút 'Bỏ qua' và 'Lưu' dạng Pill như trong ảnh */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #F1F5F9",
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 22px",
                borderRadius: "9999px",
                fontSize: "13.5px",
                fontWeight: 500,
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                color: "#334155",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8FAFC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "8px 26px",
                borderRadius: "9999px",
                border: "none",
                backgroundColor: canSubmit ? "#0D7A68" : "#E2E8F0",
                color: canSubmit ? "#FFFFFF" : "#94A3B8",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: canSubmit
                  ? "0 4px 12px rgba(13, 122, 104, 0.25)"
                  : "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
