// src/pages/store/components/BranchDetailModal.tsx
import { useState, useEffect, type FC, type FormEvent } from "react";
import {
  AlertTriangle,
  Clock,
  Loader2,
  Package,
  Save,
  Users,
  X,
} from "lucide-react";
import { AdminToast } from "../../../features/admin/components/common/AdminToast";
import {
  branchManagementApi,
  type BranchDetailResponse,
  type BranchItemResponse,
  type UpdateBranchPayload,
} from "../api/branchManagementApi";

interface BranchDetailModalProps {
  branch: BranchItemResponse;
  isOnlyBranch: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BranchDetailModal: FC<BranchDetailModalProps> = ({
  branch,
  isOnlyBranch,
  onClose,
  onSuccess,
}) => {
  const [detail, setDetail] = useState<BranchDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form input states
  const [name, setName] = useState<string>(branch.name || "");
  const [address, setAddress] = useState<string>(branch.address || "");
  const [phone, setPhone] = useState<string>(branch.phone || "");
  const [email, setEmail] = useState<string>(branch.email || "");
  const [managerName, setManagerName] = useState<string>(
    branch.managerName || "",
  );
  const [headquarterSelected, setIsHeadquarter] = useState<boolean>(
    Boolean(branch.isHeadquarter),
  );
  const isHeadquarter = isOnlyBranch || headquarterSelected;

  // Submission & feedback states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNameInvalid, setIsNameInvalid] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await branchManagementApi.getBranchDetail(branch.id);
        if (res.success && res.data && isMounted) {
          const d = res.data;
          setDetail(d);
          // Đồng bộ các trường input từ dữ liệu chi tiết
          setName(d.name || branch.name);
          setAddress(d.address || branch.address);
          setPhone(d.phone || branch.phone || "");
          setEmail(d.email || branch.email || "");
          setManagerName(d.managerName || branch.managerName || "");
          setIsHeadquarter(Boolean(d.isHeadquarter ?? branch.isHeadquarter));
        } else if (isMounted) {
          // Fallback an toàn nếu API detail trả dữ liệu khác
          setName(branch.name);
          setAddress(branch.address);
          setPhone(branch.phone || "");
          setEmail(branch.email || "");
          setManagerName(branch.managerName || "");
          setIsHeadquarter(Boolean(branch.isHeadquarter));
        }
      } catch (err) {
        console.error("Failed to load branch detail:", err);
        // Fallback an toàn nếu gặp lỗi mạng
        if (isMounted) {
          setName(branch.name);
          setAddress(branch.address);
          setPhone(branch.phone || "");
          setEmail(branch.email || "");
          setManagerName(branch.managerName || "");
          setIsHeadquarter(Boolean(branch.isHeadquarter));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [branch]);

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (name.trim().length < 2) {
      setIsNameInvalid(true);
      setErrorMessage("Tên chi nhánh phải có ít nhất 2 ký tự.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: UpdateBranchPayload = {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        managerName: managerName.trim() || undefined,
        isHeadquarter,
      };

      const res = await branchManagementApi.updateBranch(branch.id, payload);
      if (res.success) {
        setSaveSuccess(true);

        // Update local detail state
        if (detail) {
          setDetail({
            ...detail,
            name: name.trim(),
            address: address.trim(),
            phone: phone.trim(),
            email: email.trim(),
            managerName: managerName.trim(),
            isHeadquarter,
          });
        }

        // Notify parent to refresh branch list & quota
        onSuccess?.();

        // Auto clear success indicator after 3.5 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3500);
      } else {
        setErrorMessage(res.message || "Không thể lưu thay đổi chi nhánh.");
      }
    } catch (err: unknown) {
      console.error("Update branch error:", err);
      const anyErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        "Lỗi khi lưu thông tin chi nhánh.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Chưa có";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const isActive = (detail?.status || branch.status).toLowerCase() === "active";

  const stats = [
    {
      label: "Sản phẩm kinh doanh",
      value: detail?.totalProducts ?? 0,
      unit: "SKU",
      note: `Tổng tồn kho: ${(detail?.totalStock ?? 0).toLocaleString("vi-VN")} SOH`,
      icon: Package,
    },
    {
      label: "Cảnh báo thiếu hàng",
      value: detail?.lowStockCount ?? 0,
      unit: "mặt hàng",
      note: detail?.lowStockCount ? "Cần nhập hàng bổ sung" : "Tồn kho ổn định",
      icon: AlertTriangle,
    },
    {
      label: "Nhân sự chi nhánh",
      value: detail?.totalEmployees ?? 0,
      unit: "nhân viên",
      note: `${detail?.activeEmployees ?? 0} đang làm việc`,
      icon: Users,
    },
    {
      label: "Đơn hàng và giao dịch",
      value: detail?.pendingOrdersCount ?? branch.pendingOrdersCount ?? 0,
      unit: "đơn chờ",
      note: `Gần nhất: ${formatDate(detail?.lastOrderDate || branch.lastOrderDate)}`,
      icon: Clock,
    },
  ];

  return (
    <div
      className="store-modal-backdrop"
      onClick={isSaving ? undefined : onClose}
    >
      <form
        className="store-modal-dialog branch-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-detail-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSave}
      >
        <header className="store-modal-header">
          <div>
            <h2 className="store-modal-title" id="branch-detail-title">
              {detail?.name ?? branch.name}
            </h2>
            <div className="branch-detail-badges">
              <span>{detail?.code ?? branch.code}</span>
              {isHeadquarter && <span>Trụ sở chính</span>}
              <span>{isActive ? "Đang hoạt động" : "Tạm ngưng"}</span>
            </div>
          </div>
          <button
            className="branch-detail-close"
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="store-modal-body">
          {isLoading ? (
            <p className="branch-detail-loading" role="status">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Đang tải thông tin chi nhánh...
            </p>
          ) : (
            <>
              <section aria-labelledby="branch-detail-info">
                <h3 id="branch-detail-info">Thông tin chi nhánh</h3>
                <div className="branch-detail-fields">
                  <label>
                    <span>
                      Tên chi nhánh{" "}
                      <span className="branch-detail-required">*</span>
                    </span>
                    <input
                      value={name}
                      aria-invalid={isNameInvalid || undefined}
                      onChange={(event) => {
                        setName(event.target.value);
                        if (
                          isNameInvalid &&
                          event.target.value.trim().length >= 2
                        ) {
                          setIsNameInvalid(false);
                          setErrorMessage(null);
                        }
                      }}
                      placeholder="Nhập tên chi nhánh"
                    />
                  </label>
                  <label>
                    <span>Mã chi nhánh</span>
                    <input value={detail?.code ?? branch.code} disabled />
                  </label>
                  <label className="branch-detail-address">
                    <span>Địa chỉ hoạt động </span>
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã, tỉnh/thành phố"
                    />
                  </label>
                  <label>
                    <span>Số điện thoại hotline</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Email liên hệ</span>
                    <input
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Quản lý phụ trách</span>
                    <input
                      value={managerName}
                      onChange={(event) => setManagerName(event.target.value)}
                    />
                  </label>
                  <label className="branch-detail-headquarter">
                    <input
                      type="checkbox"
                      checked={isHeadquarter}
                      disabled={isOnlyBranch}
                      onChange={(event) =>
                        setIsHeadquarter(event.target.checked)
                      }
                    />
                    {isOnlyBranch
                      ? "Trụ sở chính (chi nhánh duy nhất)"
                      : "Đặt làm trụ sở chính"}
                  </label>
                </div>
                <p className="branch-detail-created">
                  Ngày tạo: {formatDate(detail?.createdAt || branch.createdAt)}
                </p>
              </section>

              <section aria-labelledby="branch-detail-stats">
                <h3 id="branch-detail-stats">Thông số hoạt động</h3>
                <dl className="branch-detail-stats">
                  {stats.map(({ label, value, unit, note, icon: Icon }) => (
                    <div key={label}>
                      <dt>
                        <Icon size={16} aria-hidden="true" />
                        {label}
                      </dt>
                      <dd>
                        <strong>{value.toLocaleString("vi-VN")}</strong> {unit}
                      </dd>
                      <dd>{note}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </>
          )}
        </div>

        <footer className="store-modal-footer">
          <button
            className="store-btn-secondary"
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Đóng
          </button>
          <button
            className="store-btn-primary branch-detail-save"
            type="submit"
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </footer>
      </form>
      <AdminToast
        toast={
          errorMessage
            ? {
                id: "branch-detail-error",
                message: errorMessage,
                type: "error",
              }
            : saveSuccess
              ? {
                  id: "branch-detail-success",
                  message: "Đã lưu thông tin chi nhánh.",
                  type: "success",
                }
              : null
        }
        onClose={() => {
          setErrorMessage(null);
          setSaveSuccess(false);
        }}
      />
    </div>
  );
};
