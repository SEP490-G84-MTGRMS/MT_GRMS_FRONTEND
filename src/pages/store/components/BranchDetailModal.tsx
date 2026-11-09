// src/pages/store/components/BranchDetailModal.tsx
import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Package,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Store,
  Layers,
  Lock,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  branchManagementApi,
  type BranchDetailResponse,
  type BranchItemResponse,
  type UpdateBranchPayload,
} from '../api/branchManagementApi';

interface BranchDetailModalProps {
  branch: BranchItemResponse;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BranchDetailModal: FC<BranchDetailModalProps> = ({
  branch,
  onClose,
  onSuccess,
}) => {
  const [detail, setDetail] = useState<BranchDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'products' | 'employees'>('products');

  // Form input states
  const [name, setName] = useState<string>(branch.name || '');
  const [address, setAddress] = useState<string>(branch.address || '');
  const [phone, setPhone] = useState<string>(branch.phone || '');
  const [email, setEmail] = useState<string>(branch.email || '');
  const [managerName, setManagerName] = useState<string>(branch.managerName || '');
  const [isHeadquarter, setIsHeadquarter] = useState<boolean>(
    Boolean(branch.isHeadquarter ?? branch.name?.toLowerCase().includes('chính'))
  );

  // Submission & feedback states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          setPhone(d.phone || branch.phone || '');
          setEmail(d.email || branch.email || '');
          setManagerName(d.managerName || branch.managerName || '');
          setIsHeadquarter(Boolean(d.isHeadquarter ?? branch.isHeadquarter));
        } else if (isMounted) {
          // Fallback an toàn nếu API detail trả dữ liệu khác
          setName(branch.name);
          setAddress(branch.address);
          setPhone(branch.phone || '');
          setEmail(branch.email || '');
          setManagerName(branch.managerName || '');
          setIsHeadquarter(Boolean(branch.isHeadquarter));
        }
      } catch (err) {
        console.error('Failed to load branch detail:', err);
        // Fallback an toàn nếu gặp lỗi mạng
        if (isMounted) {
          setName(branch.name);
          setAddress(branch.address);
          setPhone(branch.phone || '');
          setEmail(branch.email || '');
          setManagerName(branch.managerName || '');
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

    if (!name.trim()) {
      setErrorMessage('Tên chi nhánh không được để trống.');
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
        setErrorMessage(res.message || 'Không thể lưu thay đổi chi nhánh.');
      }
    } catch (err: unknown) {
      console.error('Update branch error:', err);
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Lỗi khi lưu thông tin chi nhánh.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Chưa có';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const isActive = (detail?.status || branch.status).toLowerCase() === 'active';

  return (
    <div
      className="store-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="store-modal-card"
        style={{
          width: '100%',
          maxWidth: '890px',
          maxHeight: '94vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header */}
        <div
          className="store-modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: isHeadquarter ? '#FEF3C7' : '#ECFDF5',
                color: isHeadquarter ? '#D97706' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              {isHeadquarter ? <Building2 size={24} /> : <Store size={24} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                  }}
                >
                  {name || detail?.name || branch.name}
                </h3>

                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    letterSpacing: '0.5px',
                  }}
                >
                  {detail?.code || branch.code}
                </span>

                {isHeadquarter && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    <ShieldCheck size={13} />
                    Trụ sở chính
                  </span>
                )}

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9',
                    color: isActive ? '#059669' : '#64748B',
                  }}
                >
                  {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                </span>
              </div>

              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '13px',
                  color: '#64748B',
                }}
              >
                Chỉnh sửa trực tiếp thông tin cơ bản và xem các thông số hoạt động vận hành của chi nhánh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease',
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Body Scrollable */}
        <div
          className="store-modal-body"
          style={{
            padding: '22px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {isLoading && !detail ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 0',
                gap: 12,
                color: '#64748B',
              }}
            >
              <Loader2 size={32} className="animate-spin" color="#0F766E" />
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>Đang tải thông số chi nhánh...</span>
            </div>
          ) : (
            <>
              {/* PHẦN TRÊN: Thông tin cơ bản của chi nhánh (GRID 2 CỘT CHUẨN, KHÔNG BỊ LỆCH) */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '18px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '14.5px',
                    }}
                  >
                    <Building2 size={17} color="#0F766E" />
                    <span>Thông tin cơ bản chi nhánh</span>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 400 }}>
                      (Chỉnh sửa trực tiếp tại các ô dưới đây)
                    </span>
                  </div>

                  {saveSuccess && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: '#ECFDF5',
                        color: '#059669',
                        border: '1px solid #A7F3D0',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      Đã lưu thành công!
                    </span>
                  )}
                </div>

                {/* Form Inputs: 2 Columns Disciplined Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '14px 20px',
                  }}
                >
                  {/* HÀNG 1, CỘT 1: Tên chi nhánh */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Tên chi nhánh <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Store
                        size={15}
                        color="#64748B"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="Nhập tên chi nhánh..."
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 1, CỘT 2: Mã chi nhánh (Khóa cố định) */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <label
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        Mã chi nhánh
                      </label>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#64748B',
                          backgroundColor: '#E2E8F0',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        Mã hệ thống
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={15}
                        color="#94A3B8"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        value={detail?.code || branch.code}
                        disabled
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#F1F5F9',
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: '#64748B',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 2: Địa chỉ hoạt động (Trải rộng 2 cột) */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Địa chỉ hoạt động <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin
                        size={15}
                        color="#64748B"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13.5,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 3, CỘT 1: Hotline */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Số điện thoại hotline
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone
                        size={15}
                        color="#64748B"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: 0369880798"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13.5,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 3, CỘT 2: Email liên hệ */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Email liên hệ
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={15}
                        color="#64748B"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="chinhanh@cuahang.com"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13.5,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 4, CỘT 1: Quản lý phụ trách */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Quản lý phụ trách
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={15}
                        color="#64748B"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        placeholder="Họ và tên người quản lý..."
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 12px 0 36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: 13.5,
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  {/* HÀNG 4, CỘT 2: Phân cấp Trụ sở chính (Card gọn gàng, đồng đều chiều cao) */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Quy mô & Phân cấp
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: `1px solid ${isHeadquarter ? '#FDE68A' : '#CBD5E1'}`,
                        backgroundColor: isHeadquarter ? '#FFFBEB' : '#FFFFFF',
                        cursor: 'pointer',
                        userSelect: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isHeadquarter}
                        onChange={(e) => setIsHeadquarter(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#0F766E', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                        <ShieldCheck size={15} color={isHeadquarter ? '#B45309' : '#64748B'} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isHeadquarter ? '#B45309' : '#0F172A',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Đặt làm Trụ sở chính (Cơ sở đầu não)
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* HÀNG 5: Ngày khởi tạo (Trải rộng 2 cột) */}
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      paddingTop: 8,
                      borderTop: '1px dashed #E2E8F0',
                      fontSize: 12,
                      color: '#64748B',
                    }}
                  >
                    <Calendar size={13} color="#94A3B8" />
                    <span>Ngày khởi tạo cơ sở: {formatDate(detail?.createdAt || branch.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* PHẦN DƯỚI: Các thông số tổng quát */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: '14.5px',
                  }}
                >
                  <Layers size={17} color="#0F766E" />
                  <span>Các thông số tổng quát chi nhánh</span>
                </div>

                {/* 4 Cards Chỉ số */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {/* Card 1: Sản phẩm kinh doanh */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: '#F0FDF4',
                          color: '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Package size={17} />
                      </div>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Sản phẩm kinh doanh</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
                      {detail?.totalProducts ?? 0}{' '}
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>SKU</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#16A34A', marginTop: 4, fontWeight: 500 }}>
                      Tổng tồn kho: {(detail?.totalStock ?? 0).toLocaleString('vi-VN')} SOH
                    </div>
                  </div>

                  {/* Card 2: Cảnh báo tồn kho */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: '#FFF7ED',
                          color: '#EA580C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AlertTriangle size={17} />
                      </div>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Cảnh báo thiếu hàng</span>
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: (detail?.lowStockCount ?? 0) > 0 ? '#EA580C' : '#0F172A',
                      }}
                    >
                      {detail?.lowStockCount ?? 0}{' '}
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>mặt hàng</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: (detail?.lowStockCount ?? 0) > 0 ? '#EA580C' : '#64748B',
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      {(detail?.lowStockCount ?? 0) > 0 ? 'Cần nhập hàng bổ sung' : 'Tồn kho ổn định'}
                    </div>
                  </div>

                  {/* Card 3: Đội ngũ nhân sự */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Users size={17} />
                      </div>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Nhân sự chi nhánh</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
                      {detail?.totalEmployees ?? 0}{' '}
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>nhân viên</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#2563EB', marginTop: 4, fontWeight: 500 }}>
                      {detail?.activeEmployees ?? 0} đang làm việc
                    </div>
                  </div>

                  {/* Card 4: Đơn hàng & giao dịch */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          backgroundColor: '#FAF5FF',
                          color: '#9333EA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Clock size={17} />
                      </div>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Đơn hàng & Giao dịch</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>
                      {detail?.pendingOrdersCount ?? branch.pendingOrdersCount ?? 0}{' '}
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B' }}>đơn chờ</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: 500 }}>
                      Gần nhất: {formatDate(detail?.lastOrderDate || branch.lastOrderDate)}
                    </div>
                  </div>
                </div>

                {/* Tabs điều hướng danh sách */}
                <div style={{ marginTop: 22 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      borderBottom: '1px solid #E2E8F0',
                      paddingBottom: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'products' ? '2.5px solid #0F766E' : '2.5px solid transparent',
                        color: activeTab === 'products' ? '#0F766E' : '#64748B',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Package size={15} />
                      <span>Sản phẩm kinh doanh</span>
                      <span
                        style={{
                          backgroundColor: activeTab === 'products' ? '#CCFBF1' : '#F1F5F9',
                          color: activeTab === 'products' ? '#0F766E' : '#64748B',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: 11.5,
                        }}
                      >
                        {detail?.totalProducts ?? 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('employees')}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'employees' ? '2.5px solid #0F766E' : '2.5px solid transparent',
                        color: activeTab === 'employees' ? '#0F766E' : '#64748B',
                        fontSize: 13.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Users size={15} />
                      <span>Đội ngũ nhân viên</span>
                      <span
                        style={{
                          backgroundColor: activeTab === 'employees' ? '#CCFBF1' : '#F1F5F9',
                          color: activeTab === 'employees' ? '#0F766E' : '#64748B',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: 11.5,
                        }}
                      >
                        {detail?.totalEmployees ?? 0}
                      </span>
                    </button>
                  </div>

                  {/* Tab Content: Products */}
                  {activeTab === 'products' && (
                    <div style={{ marginTop: 14 }}>
                      {detail?.recentProducts && detail.recentProducts.length > 0 ? (
                        <div
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Mã SKU</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Tên sản phẩm</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>ĐVT</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Giá bán</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.recentProducts.map((p) => (
                                <tr key={p.productId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2563EB' }}>{p.sku}</td>
                                  <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>{p.productName}</td>
                                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.unit}</td>
                                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A', textAlign: 'right' }}>
                                    {p.sellingPrice.toLocaleString('vi-VN')} đ
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: p.status === 'Active' ? '#ECFDF5' : '#F1F5F9',
                                        color: p.status === 'Active' ? '#059669' : '#64748B',
                                      }}
                                    >
                                      {p.status === 'Active' ? 'Đang bán' : 'Tạm ngưng'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '32px 16px',
                            textAlign: 'center',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '10px',
                            border: '1px dashed #CBD5E1',
                            color: '#64748B',
                          }}
                        >
                          <Package size={28} color="#94A3B8" style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
                            Chưa có sản phẩm nào tại chi nhánh này
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                            Hãy phân phối hàng hóa vào chi nhánh từ phân hệ Hàng hóa & Danh mục.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Content: Employees */}
                  {activeTab === 'employees' && (
                    <div style={{ marginTop: 14 }}>
                      {detail?.recentEmployees && detail.recentEmployees.length > 0 ? (
                        <div
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                            <thead>
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Mã NV</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Họ và tên</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Số điện thoại</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600 }}>Ngày vào làm</th>
                                <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.recentEmployees.map((e) => (
                                <tr key={e.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2563EB' }}>{e.employeeCode}</td>
                                  <td style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 600 }}>{e.fullName}</td>
                                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{e.phone || 'Chưa có'}</td>
                                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{formatDate(e.startDate)}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        backgroundColor: e.status === 'Active' ? '#ECFDF5' : '#F1F5F9',
                                        color: e.status === 'Active' ? '#059669' : '#64748B',
                                      }}
                                    >
                                      {e.status === 'Active' ? 'Đang làm' : 'Đã nghỉ'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '32px 16px',
                            textAlign: 'center',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '10px',
                            border: '1px dashed #CBD5E1',
                            color: '#64748B',
                          }}
                        >
                          <Users size={28} color="#94A3B8" style={{ marginBottom: 6 }} />
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
                            Chưa có nhân viên trực thuộc chi nhánh này
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                            Hãy thêm mới hoặc điều chuyển nhân viên sang chi nhánh này trong phân hệ Nhân sự.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Footer (NÚT LƯU CHỈNH SỬA TRỰC TIẾP TẠI ĐÂY) */}
        <div
          className="store-modal-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          {/* Thông báo lỗi hoặc gợi ý bên trái */}
          <div style={{ flex: 1, marginRight: 16 }}>
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#DC2626',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}
            {saveSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#059669',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={15} />
                <span>Đã lưu cập nhật thông tin chi nhánh thành công!</span>
              </div>
            )}
            {!errorMessage && !saveSuccess && (
              <span style={{ fontSize: 12.5, color: '#64748B' }}>
                Chỉnh sửa các ô ở trên và bấm "Lưu thay đổi" để cập nhật ngay.
              </span>
            )}
          </div>

          {/* Nhóm nút bên phải */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                background: '#0F766E',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
                opacity: isSaving ? 0.75 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
