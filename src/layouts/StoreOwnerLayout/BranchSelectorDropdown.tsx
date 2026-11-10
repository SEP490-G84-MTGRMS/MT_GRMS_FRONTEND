// src/layouts/StoreOwnerLayout/BranchSelectorDropdown.tsx
import { useState, useEffect, useRef, useCallback, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Check, Settings } from "lucide-react";
import {
  branchManagementApi,
  BRANCHES_UPDATED_EVENT,
  type BranchItemResponse,
  type BranchesUpdatedEventDetail,
} from "../../pages/store/api/branchManagementApi";

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  address?: string;
  isHeadquarter?: boolean;
}

const DEFAULT_BRANCHES: BranchOption[] = [
  {
    id: "01a181dc-5902-7b21-b424-1c9ea18e917d",
    code: "BR-HCM-01",
    name: "MT-Mart Chi Nhánh Quận 1",
    address: "Số 45 Lê Duẩn, Bến Nghé, Quận 1",
    isHeadquarter: true,
  },
  {
    id: "01a181dc-5902-71fe-ba6d-aeb9700b4743",
    code: "BR-HN-01",
    name: "MT-Mart Chi Nhánh Cầu Giấy",
    address: "Số 88 Cầu Giấy, Quan Hoa, Cầu Giấy",
    isHeadquarter: false,
  },
];

const ALL_BRANCHES_OPTION: BranchOption = {
  id: "ALL",
  code: "ALL",
  name: "Toàn hệ thống",
  address: "Dữ liệu gộp toàn chuỗi",
};

const STORAGE_KEY = "mtgrms_active_branch";

export const BranchSelectorDropdown: FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>(DEFAULT_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return DEFAULT_BRANCHES[0];
  });

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 1. Tải danh sách chi nhánh thực tế từ API Backend
  const fetchBranches = useCallback(
    async (options?: { selectBranchId?: string }) => {
      try {
        const res = await branchManagementApi.getBranches({ pageSize: 50 });
        if (
          res.success &&
          res.data?.items &&
          res.data.items.length > 0
        ) {
          const mapped: BranchOption[] = res.data.items.map(
            (b: BranchItemResponse) => ({
              id: b.id,
              code: b.code,
              name: b.name,
              address: b.address,
              isHeadquarter: b.isHeadquarter,
            }),
          );
          setBranches(mapped);

          // Cập nhật selectedBranch
          setSelectedBranch((current) => {
            // 1. Nếu có branchId được chỉ định ưu tiên chọn (ví dụ vừa thêm chi nhánh mới)
            if (options?.selectBranchId) {
              const target = mapped.find((b) => b.id === options.selectBranchId);
              if (target) {
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
                  window.dispatchEvent(
                    new CustomEvent("mtgrms:branch-changed", { detail: target }),
                  );
                } catch {
                  // ignore
                }
                return target;
              }
            }

            // 2. Nếu đang chọn "ALL", giữ nguyên
            if (current.id === "ALL") return current;

            // 3. Nếu chi nhánh đang chọn có trong danh sách
            const exists = mapped.find((b) => b.id === current.id);
            if (exists) {
              if (
                exists.name !== current.name ||
                exists.address !== current.address ||
                exists.code !== current.code
              ) {
                try {
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(exists));
                } catch {
                  // ignore
                }
              }
              return exists;
            }

            // 4. Nếu không còn tồn tại (hoặc là mock cũ), fallback về chi nhánh đầu tiên
            const fallback = mapped[0];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
              window.dispatchEvent(
                new CustomEvent("mtgrms:branch-changed", { detail: fallback }),
              );
            } catch {
              // ignore
            }
            return fallback;
          });
        }
      } catch {
        // Giữ mock fallback nếu mạng lỗi
      }
    },
    [],
  );

  // 2. Tải danh sách chi nhánh ban đầu & lắng nghe sự kiện cập nhật chi nhánh toàn cục
  useEffect(() => {
    fetchBranches();

    const handleBranchesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<BranchesUpdatedEventDetail>;
      const detail = customEvent.detail;

      // Cập nhật lạc quan (optimistic UI) tức thì
      if (detail?.action === "create" && detail.branch) {
        const createdBranch: BranchOption = {
          id: detail.branch.id,
          code: detail.branch.code,
          name: detail.branch.name,
          address: detail.branch.address,
          isHeadquarter: detail.branch.isHeadquarter,
        };

        setBranches((prev) => {
          const exists = prev.some((b) => b.id === createdBranch.id);
          if (exists) return prev;
          const cleanPrev = prev.filter(
            (b) =>
              b.id !== DEFAULT_BRANCHES[0].id && b.id !== DEFAULT_BRANCHES[1].id,
          );
          return [createdBranch, ...cleanPrev];
        });

        if (detail.selectCreated) {
          setSelectedBranch(createdBranch);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(createdBranch));
            window.dispatchEvent(
              new CustomEvent("mtgrms:branch-changed", { detail: createdBranch }),
            );
          } catch {
            // ignore
          }
        }
      } else if (detail?.action === "update" && detail.branch) {
        const updated = detail.branch;
        setBranches((prev) =>
          prev.map((b) =>
            b.id === updated.id
              ? {
                  ...b,
                  code: updated.code,
                  name: updated.name,
                  address: updated.address,
                  isHeadquarter: updated.isHeadquarter,
                }
              : b,
          ),
        );
        setSelectedBranch((current) => {
          if (current.id === updated.id) {
            const next: BranchOption = {
              ...current,
              code: updated.code,
              name: updated.name,
              address: updated.address,
              isHeadquarter: updated.isHeadquarter,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {
              // ignore
            }
            return next;
          }
          return current;
        });
      } else if (detail?.action === "delete" && detail.branchId) {
        const deletedId = detail.branchId;
        setBranches((prev) => prev.filter((b) => b.id !== deletedId));
        setSelectedBranch((current) => {
          if (current.id === deletedId) {
            return ALL_BRANCHES_OPTION;
          }
          return current;
        });
      }

      // Luôn đồng bộ dữ liệu chuẩn xác với backend
      const targetId =
        detail?.selectCreated && detail?.branch ? detail.branch.id : undefined;
      fetchBranches({ selectBranchId: targetId });
    };

    window.addEventListener(BRANCHES_UPDATED_EVENT, handleBranchesUpdated);
    return () => {
      window.removeEventListener(BRANCHES_UPDATED_EVENT, handleBranchesUpdated);
    };
  }, [fetchBranches]);

  // 3. Lắng nghe thay đổi chi nhánh từ tab khác qua localStorage hoặc sự kiện nội bộ
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSelectedBranch(parsed);
        } catch {
          // ignore
        }
      }
    };

    const handleBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<BranchOption>;
      if (customEvent.detail) {
        setSelectedBranch((current) => {
          if (current.id === customEvent.detail.id) return current;
          return customEvent.detail;
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("mtgrms:branch-changed", handleBranchChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("mtgrms:branch-changed", handleBranchChange);
    };
  }, []);

  // 4. Click outside để đóng dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // 5. Chọn chi nhánh
  const handleSelectBranch = (branch: BranchOption) => {
    setSelectedBranch(branch);
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
      // Bắn event để các trang khác trong hệ thống có thể cập nhật
      window.dispatchEvent(
        new CustomEvent("mtgrms:branch-changed", { detail: branch }),
      );
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {/* Nút bấm trên Header (không có icon và không có mã, chỉ tên và mũi tên) */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) {
              fetchBranches();
            }
            return next;
          });
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: isOpen
            ? "rgba(0, 0, 0, 0.32)"
            : "rgba(0, 0, 0, 0.22)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "var(--radius-pill, 9999px)",
          padding: "6px 14px",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          maxWidth: 280,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isOpen
            ? "rgba(0, 0, 0, 0.32)"
            : "rgba(0, 0, 0, 0.22)";
        }}
        title={`Chi nhánh làm việc hiện tại: ${selectedBranch.name}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedBranch.name}
        </span>
        <ChevronDown
          size={14}
          color="#ffffff"
          strokeWidth={2}
          style={{
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Menu thả xuống (Dropdown Card) */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 300,
            backgroundColor: "#ffffff",
            borderRadius: 14,
            boxShadow:
              "0 12px 32px rgba(0, 30, 90, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)",
            border: "1px solid #EDF2F9",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeInMenu 0.15s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#F8FAFC",
              borderBottom: "1px solid #EDF2F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#64748B",
                letterSpacing: "0.04em",
              }}
            >
              Chi nhánh thao tác
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#475569",
                backgroundColor: "#E2E8F0",
                padding: "2px 8px",
                borderRadius: 9999,
              }}
            >
              {branches.length} chi nhánh
            </span>
          </div>

          {/* Danh sách các chi nhánh */}
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              padding: "6px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {/* Tùy chọn Toàn hệ thống */}
            <button
              type="button"
              onClick={() => handleSelectBranch(ALL_BRANCHES_OPTION)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                backgroundColor:
                  selectedBranch.id === "ALL" ? "#F0FDF4" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "background-color 0.12s ease",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (selectedBranch.id !== "ALL") {
                  e.currentTarget.style.backgroundColor = "#F8FAFC";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBranch.id !== "ALL") {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: selectedBranch.id === "ALL" ? 700 : 600,
                    color: selectedBranch.id === "ALL" ? "#15803D" : "#0F172A",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Toàn hệ thống
                </span>
                <span style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Dữ liệu gộp toàn chuỗi
                </span>
              </div>
              {selectedBranch.id === "ALL" && (
                <Check
                  size={16}
                  color="#15803D"
                  strokeWidth={2.5}
                  style={{ flexShrink: 0, marginLeft: 8 }}
                />
              )}
            </button>

            {/* Từng chi nhánh cụ thể (Bỏ icon và bỏ mã chi nhánh, chỉ hiển thị tên & địa chỉ) */}
            {branches.map((b) => {
              const isSelected = selectedBranch.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelectBranch(b)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor: isSelected ? "#F0FDF4" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.12s ease",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "#F8FAFC";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? "#15803D" : "#0F172A",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.name}
                    </span>
                    {b.address && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: 2,
                        }}
                      >
                        {b.address}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check
                      size={16}
                      color="#15803D"
                      strokeWidth={2.5}
                      style={{ flexShrink: 0, marginLeft: 8 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: Liên kết nhanh đến trang Quản lý chi nhánh */}
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "#F8FAFC",
              borderTop: "1px solid #EDF2F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/store-owner/subscriptions?tab=branches");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "var(--blue-primary, #0066FF)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Settings size={14} />
              <span>Thiết lập & Thêm chi nhánh</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
