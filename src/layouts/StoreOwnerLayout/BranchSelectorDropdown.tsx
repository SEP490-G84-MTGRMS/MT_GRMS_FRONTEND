// src/layouts/StoreOwnerLayout/BranchSelectorDropdown.tsx
import { useState, useEffect, useRef, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, Settings } from 'lucide-react';
import { branchManagementApi, type BranchItemResponse } from '../../pages/store/api/branchManagementApi';

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  address?: string;
  isHeadquarter?: boolean;
}

const DEFAULT_BRANCHES: BranchOption[] = [
  {
    id: '01a181dc-5902-7b21-b424-1c9ea18e917d',
    code: 'BR-HCM-01',
    name: 'MT-Mart Chi Nhánh Quận 1',
    address: 'Số 45 Lê Duẩn, Bến Nghé, Quận 1',
    isHeadquarter: true,
  },
  {
    id: '01a181dc-5902-71fe-ba6d-aeb9700b4743',
    code: 'BR-HN-01',
    name: 'MT-Mart Chi Nhánh Cầu Giấy',
    address: 'Số 88 Cầu Giấy, Quan Hoa, Cầu Giấy',
    isHeadquarter: false,
  },
];

const ALL_BRANCHES_OPTION: BranchOption = {
  id: 'ALL',
  code: 'ALL',
  name: 'Toàn hệ thống (Tất cả chi nhánh)',
  address: 'Dữ liệu gộp toàn chuỗi',
};

const STORAGE_KEY = 'mtgrms_active_branch';

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
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
      try {
        const res = await branchManagementApi.getBranches({ pageSize: 50 });
        if (isMounted && res.success && res.data?.items && res.data.items.length > 0) {
          const mapped: BranchOption[] = res.data.items.map((b: BranchItemResponse) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            address: b.address,
          }));
          setBranches(mapped);

          // Nếu chi nhánh đang chọn không còn tồn tại, cập nhật về chi nhánh đầu tiên
          setSelectedBranch((current) => {
            if (current.id === 'ALL') return current;
            const exists = mapped.find((b) => b.id === current.id);
            if (exists) return exists;
            const fallback = mapped[0];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
            return fallback;
          });
        }
      } catch {
        // Giữ mock fallback nếu mạng lỗi
      }
    };

    fetchBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Click outside để đóng dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 3. Chọn chi nhánh
  const handleSelectBranch = (branch: BranchOption) => {
    setSelectedBranch(branch);
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
      // Bắn event để các trang khác trong hệ thống có thể cập nhật
      window.dispatchEvent(new CustomEvent('mtgrms:branch-changed', { detail: branch }));
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {/* Nút bấm trên Header (không có icon và không có mã, chỉ tên và mũi tên) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: isOpen ? 'rgba(0, 0, 0, 0.32)' : 'rgba(0, 0, 0, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 'var(--radius-pill, 9999px)',
          padding: '6px 14px',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          maxWidth: 280,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isOpen
            ? 'rgba(0, 0, 0, 0.32)'
            : 'rgba(0, 0, 0, 0.22)';
        }}
        title={`Chi nhánh làm việc hiện tại: ${selectedBranch.name}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Menu thả xuống (Dropdown Card) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 300,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0, 30, 90, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #EDF2F9',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeInMenu 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #EDF2F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748B',
                letterSpacing: '0.04em',
              }}
            >
              Chi nhánh thao tác
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#E2E8F0',
                padding: '2px 8px',
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
              overflowY: 'auto',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {/* Tùy chọn Toàn hệ thống */}
            <button
              type="button"
              onClick={() => handleSelectBranch(ALL_BRANCHES_OPTION)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: selectedBranch.id === 'ALL' ? '#F0FDF4' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.12s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (selectedBranch.id !== 'ALL') {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBranch.id !== 'ALL') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: selectedBranch.id === 'ALL' ? 700 : 600,
                    color: selectedBranch.id === 'ALL' ? '#15803D' : '#0F172A',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Toàn hệ thống (Tất cả chi nhánh)
                </span>
                <span style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Dữ liệu gộp toàn chuỗi
                </span>
              </div>
              {selectedBranch.id === 'ALL' && (
                <Check size={16} color="#15803D" strokeWidth={2.5} style={{ flexShrink: 0, marginLeft: 8 }} />
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.12s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? '#15803D' : '#0F172A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b.name}
                    </span>
                    {b.address && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#64748B',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 2,
                        }}
                      >
                        {b.address}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={16} color="#15803D" strokeWidth={2.5} style={{ flexShrink: 0, marginLeft: 8 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: Liên kết nhanh đến trang Quản lý chi nhánh */}
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #EDF2F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/store-owner/subscriptions?tab=branches');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                color: 'var(--blue-primary, #0066FF)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
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
