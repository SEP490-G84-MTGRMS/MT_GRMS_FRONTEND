// src/pages/store/components/BranchManagementTab.tsx
import { useState, useEffect, useMemo, useRef, type FC } from 'react';
import {
  Search,
  Building2,
  Power,
  RefreshCw,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  branchManagementApi,
  type BranchItemResponse,
  type BranchQuotaResponse,
} from '../api/branchManagementApi';
import { SupplierStatusBadge } from '../../../features/supplier/components/SupplierStatusBadge';
import { BranchQuotaBar } from './BranchQuotaBar';
import { BranchFormModal } from './BranchFormModal';
import { BranchUpgradeModal } from './BranchUpgradeModal';
import { BranchDetailModal } from './BranchDetailModal';

interface BranchManagementTabProps {
  onGoToSubscriptions: () => void;
}

type SortField = 'code' | 'name' | 'address' | 'phone' | 'managerName' | 'status';
type SortDirection = 'asc' | 'desc';

export const BranchManagementTab: FC<BranchManagementTabProps> = ({
  onGoToSubscriptions,
}) => {
  const [branches, setBranches] = useState<BranchItemResponse[]>([]);
  const [quota, setQuota] = useState<BranchQuotaResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'upgrade' | 'detail' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchItemResponse | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Đóng dropdown thao tác khi click ra ngoài
  useEffect(() => {
    const handleOutsideClick = () => setOpenActionId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedBranches = useMemo(() => {
    if (!sortField) return branches;

    return [...branches].sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortField) {
        case 'code':
          valA = (a.code || '').toLowerCase();
          valB = (b.code || '').toLowerCase();
          break;
        case 'name':
          valA = (a.name || '').toLowerCase();
          valB = (b.name || '').toLowerCase();
          break;
        case 'address':
          valA = (a.address || '').toLowerCase();
          valB = (b.address || '').toLowerCase();
          break;
        case 'phone':
          valA = (a.phone || '').toLowerCase();
          valB = (b.phone || '').toLowerCase();
          break;
        case 'managerName':
          valA = (a.managerName || '').toLowerCase();
          valB = (b.managerName || '').toLowerCase();
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [branches, sortField, sortDir]);

  const totalCount = sortedBranches.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

  const pagedBranches = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return sortedBranches.slice(start, start + pageSize);
  }, [sortedBranches, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(1);
  }, [keyword, statusFilter]);

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [pagedBranches, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '13%' }} />
      <col style={{ width: '22%' }} />
      <col style={{ width: '25%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '7%' }} />
    </colgroup>
  );

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 8px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: 1.25,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  // 1. Tải hạn mức chi nhánh (Quota) - chỉ cần gọi 1 lần khi mount hoặc khi thêm/sửa chi nhánh
  const fetchQuota = async () => {
    try {
      const quotaRes = await branchManagementApi.getQuota();
      if (quotaRes.success && quotaRes.data) {
        setQuota(quotaRes.data);
      }
    } catch (err) {
      console.error('Failed to load branch quota:', err);
    }
  };

  // 2. Tải danh sách chi nhánh (có hỗ trợ tìm kiếm & lọc)
  const fetchBranches = async (searchKw: string, status: string) => {
    setIsLoading(true);
    try {
      const branchRes = await branchManagementApi.getBranches({
        keyword: searchKw.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        pageSize: 50,
      });

      if (branchRes.success && branchRes.data?.items) {
        setBranches(branchRes.data.items);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Tải quota ban đầu khi vào màn hình
  useEffect(() => {
    fetchQuota();
  }, []);

  // Tải danh sách chi nhánh với Debounce 350ms khi gõ tìm kiếm hoặc đổi bộ lọc
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBranches(keyword, statusFilter);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, statusFilter]);

  const loadData = async () => {
    await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
  };

  const handleToggleStatus = async (branch: BranchItemResponse) => {
    const isCurrentlyActive = branch.status.toLowerCase() === 'active';
    const nextActive = !isCurrentlyActive;
    try {
      const res = await branchManagementApi.toggleStatus(branch.id, nextActive);
      if (res.success) {
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
      } else {
        alert(res.message || 'Không thể thay đổi trạng thái chi nhánh.');
      }
    } catch (err: unknown) {
      console.error('Toggle status error:', err);
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Lỗi khi thay đổi trạng thái chi nhánh.';
      alert(msg);
    }
  };

  const handleDeleteBranch = async (branch: BranchItemResponse) => {
    if (branch.isHeadquarter) {
      alert('Không thể xóa chi nhánh chính (Trụ sở chính) của chuỗi cửa hàng.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa chi nhánh "${branch.name}" (${branch.code})?\n\nHành động này sẽ xóa chi nhánh và giải phóng hạn mức chi nhánh đang sử dụng của chuỗi cửa hàng.`
    );
    if (!confirmed) return;

    try {
      const res = await branchManagementApi.deleteBranch(branch.id);
      if (res.success) {
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter)]);
      } else {
        alert(res.message || 'Không thể xóa chi nhánh.');
      }
    } catch (err: unknown) {
      console.error('Delete branch error:', err);
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = anyErr?.response?.data?.message || anyErr?.message || 'Lỗi khi xóa chi nhánh.';
      alert(msg);
    }
  };

  return (
    <div>
      {/* 1. Quota Bar */}
      <BranchQuotaBar
        quota={quota}
        isLoading={isLoading}
        onOpenCreateModal={() => {
          setSelectedBranch(null);
          setActiveModal('create');
        }}
        onOpenUpgradeModal={() => setActiveModal('upgrade')}
        onGoToSubscriptions={onGoToSubscriptions}
      />

      {/* 2. Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search
              size={17}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: 11 }}
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm theo mã, tên, địa chỉ, người quản lý..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                fontSize: 13.5,
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Tạm ngưng</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#475569',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 3. Bảng danh sách chi nhánh (Chuẩn giao diện như http://localhost:5173/store-owner/stores/products) */}
      <div className="so-list-table-card">
        <div
          ref={headerRef}
          className="so-list-table-head"
          style={{
            paddingRight: hasScrollY ? 6 : 0,
            boxSizing: 'border-box',
          }}
        >
          <table className="so-list-table" style={{ minWidth: 1000, tableLayout: 'fixed' }}>
            {tableColGroup}
            <thead>
              <tr>
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('code')}
                  title="Sắp xếp theo mã chi nhánh"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Mã Chi Nhánh</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'code' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                  </div>
                </th>

                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('name')}
                  title="Sắp xếp theo tên chi nhánh"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Tên Chi Nhánh</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'name' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                  </div>
                </th>

                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('address')}
                  title="Sắp xếp theo địa chỉ"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Địa Chỉ</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'address' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                  </div>
                </th>

                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('phone')}
                  title="Sắp xếp theo hotline"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Hotline</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'phone' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                  </div>
                </th>

                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => handleSort('managerName')}
                  title="Sắp xếp theo quản lý phụ trách"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Quản Lý Phụ Trách</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'managerName' ? '#0f766e' : '#94a3b8', flexShrink: 0 }} />
                  </div>
                </th>

                <th style={{ ...thStyle, textAlign: 'right', paddingRight: 8 }}>
                  Trạng Thái
                </th>

                <th style={{ ...thStyle, textAlign: 'right', paddingRight: 14 }}>
                  Thao Tác
                </th>
              </tr>
            </thead>
          </table>
        </div>

        {/* ── Scrollable Table Body: cuộn trong table khi danh sách dài, header và pager cố định ── */}
        <div
          ref={bodyRef}
          className="so-list-table-body supplier-table-scroll-container"
          onScroll={handleBodyScroll}
          style={{
            maxHeight: 'calc(100vh - 380px)',
            minHeight: 220,
            overflowY: 'auto',
          }}
        >
          <table className="so-list-table" style={{ minWidth: 1000, tableLayout: 'fixed' }}>
            {tableColGroup}
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    Đang tải danh sách chi nhánh...
                  </td>
                </tr>
              ) : pagedBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B' }}>
                    <Building2 size={36} color="#CBD5E1" style={{ margin: '0 auto 12px auto' }} />
                    <div style={{ fontWeight: 600, fontSize: 15, color: '#334155' }}>Chưa có chi nhánh nào</div>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                      Hãy bấm nút "Thêm chi nhánh mới" để mở rộng chuỗi cửa hàng của bạn.
                    </div>
                  </td>
                </tr>
              ) : (
                pagedBranches.map((b) => {
                  const isActive = b.status.toLowerCase() === 'active';
                  return (
                    <tr
                      key={b.id}
                      className="so-list-row"
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                      onClick={() => {
                        setSelectedBranch(b);
                        setActiveModal('detail');
                      }}
                      title="Bấm vào hàng để xem chi tiết thông số chi nhánh"
                    >
                      {/* Mã chi nhánh */}
                      <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#0f766e',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                          title={b.code}
                        >
                          {b.code}
                        </span>
                      </td>

                      {/* Tên chi nhánh */}
                      <td className="so-list-td--wrap" style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="so-list-name" title={b.name} style={{ fontWeight: 600, color: '#0f172a' }}>
                            {b.name}
                          </span>
                          {b.isHeadquarter && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#B45309',
                                backgroundColor: '#FEF3C7',
                                padding: '1px 6px',
                                borderRadius: 4,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Trụ sở chính
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Địa chỉ */}
                      <td className="so-list-td--wrap" style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: 12.5 }}>
                        <span title={b.address || ''}>{b.address || '---'}</span>
                      </td>

                      {/* Hotline */}
                      <td style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5, color: '#334155' }}>
                          {b.phone || '---'}
                        </span>
                      </td>

                      {/* Quản lý phụ trách */}
                      <td className="so-list-td--wrap" style={{ padding: '8px 8px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', color: '#334155', fontSize: 12.5 }}>
                        <span>{b.managerName || 'Chưa phân công'}</span>
                      </td>

                      {/* Trạng thái (Pill monochrome + dot xanh/xám, chuẩn KiotViet không emoji) */}
                      <td
                        style={{
                          textAlign: 'right',
                          verticalAlign: 'middle',
                          padding: '8px 8px 8px 4px',
                          borderBottom: '1px solid #f1f5f9',
                          overflow: 'visible',
                          textOverflow: 'clip',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <SupplierStatusBadge status={isActive ? 'Active' : 'Inactive'} />
                      </td>

                      {/* Thao tác (Chuẩn 1 nút Thao tác pill như StoreProductTable) */}
                      <td
                        style={{
                          padding: '8px 14px 8px 4px',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                          borderBottom: '1px solid #f1f5f9',
                          position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            className="so-list-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionId(openActionId === b.id ? null : b.id);
                            }}
                            title="Mở menu thao tác chi nhánh"
                          >
                            Thao tác
                          </button>

                          {/* Menu thao tác nổi thanh lịch */}
                          {openActionId === b.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: 4,
                                backgroundColor: '#FFFFFF',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                zIndex: 60,
                                minWidth: 180,
                                padding: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '8px 10px',
                                  border: 'none',
                                  background: 'none',
                                  fontSize: 12.5,
                                  color: '#334155',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontWeight: 500,
                                  transition: 'background-color 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                onClick={() => {
                                  setOpenActionId(null);
                                  setSelectedBranch(b);
                                  setActiveModal('detail');
                                }}
                              >
                                <Eye size={14} color="#0F766E" />
                                <span>Chi tiết & Chỉnh sửa</span>
                              </button>

                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '8px 10px',
                                  border: 'none',
                                  background: 'none',
                                  fontSize: 12.5,
                                  color: isActive ? '#D97706' : '#059669',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontWeight: 500,
                                  transition: 'background-color 0.12s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                                onClick={() => {
                                  setOpenActionId(null);
                                  handleToggleStatus(b);
                                }}
                              >
                                <Power size={14} />
                                <span>{isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt chi nhánh'}</span>
                              </button>

                              {!b.isHeadquarter && (
                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 10px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: 12.5,
                                    color: '#DC2626',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontWeight: 500,
                                    transition: 'background-color 0.12s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                  onClick={() => {
                                    setOpenActionId(null);
                                    handleDeleteBranch(b);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  <span>Xóa chi nhánh</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer Phân trang (Paging) tích hợp đồng bộ theo chuẩn http://localhost:5173/store-owner/stores/products ── */}
        <div className="so-list-pager">
          {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> chi nhánh
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
              <select
                className="so-list-pager-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
              >
                <option value={15}>15</option>
                <option value={24}>24</option>
                <option value={36}>36</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>

          {/* Bên phải: Nút Trước / Trang x / y / Sau */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="so-list-pager-btn"
              disabled={pageIndex <= 1}
              onClick={() => setPageIndex(pageIndex - 1)}
            >
              <ChevronLeft size={13} />
              <span>Trước</span>
            </button>

            <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
              Trang {pageIndex} / {totalPages}
            </span>

            <button
              type="button"
              className="so-list-pager-btn"
              disabled={pageIndex >= totalPages}
              onClick={() => setPageIndex(pageIndex + 1)}
            >
              <span>Sau</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(activeModal === 'create' || activeModal === 'edit') && (
        <BranchFormModal
          branch={selectedBranch}
          quota={quota}
          existingBranches={branches}
          onUpgrade={() => setActiveModal('upgrade')}
          onClose={() => {
            setActiveModal(null);
            setSelectedBranch(null);
          }}
          onSuccess={() => {
            setActiveModal(null);
            setSelectedBranch(null);
            loadData();
          }}
        />
      )}

      {activeModal === 'upgrade' && (
        <BranchUpgradeModal
          quota={quota}
          onClose={() => setActiveModal(null)}
          onGoToUpgrade={() => {
            setActiveModal(null);
            onGoToSubscriptions();
          }}
        />
      )}

      {/* Modal Chi tiết & Chỉnh sửa trực tiếp chi nhánh */}
      {activeModal === 'detail' && selectedBranch && (
        <BranchDetailModal
          branch={selectedBranch}
          onClose={() => {
            setActiveModal(null);
            setSelectedBranch(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

