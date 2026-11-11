// src/pages/store/components/BranchManagementTab.tsx
import { useState, useEffect, type FC } from 'react';
import {
  Search,
  Building2,
  Power,
  RefreshCw,
  MapPin,
  Phone,
  User,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  branchManagementApi,
  type BranchItemResponse,
  type BranchQuotaResponse,
} from '../api/branchManagementApi';
import { BranchQuotaBar } from './BranchQuotaBar';
import { BranchFormModal } from './BranchFormModal';
import { BranchUpgradeModal } from './BranchUpgradeModal';
import { BranchDetailModal } from './BranchDetailModal';
import { TablePagination } from '../../../components/common/TablePagination/TablePagination';

interface BranchManagementTabProps {
  onGoToSubscriptions: () => void;
}

export const BranchManagementTab: FC<BranchManagementTabProps> = ({
  onGoToSubscriptions,
}) => {
  const [branches, setBranches] = useState<BranchItemResponse[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [quota, setQuota] = useState<BranchQuotaResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'upgrade' | 'detail' | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchItemResponse | null>(null);

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

  // 2. Tải danh sách chi nhánh (có hỗ trợ tìm kiếm & lọc & phân trang)
  const fetchBranches = async (searchKw: string, status: string, page: number, size: number) => {
    setIsLoading(true);
    try {
      const branchRes = await branchManagementApi.getBranches({
        keyword: searchKw.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        pageIndex: page,
        pageSize: size,
      });

      if (branchRes.success && branchRes.data?.items) {
        setBranches(branchRes.data.items);
        setTotalItems(branchRes.data.totalItems ?? branchRes.data.items.length);
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

  // Tải danh sách chi nhánh với Debounce 350ms khi gõ tìm kiếm hoặc đổi bộ lọc / trang
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBranches(keyword, statusFilter, pageIndex, pageSize);
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword, statusFilter, pageIndex, pageSize]);

  const loadData = async () => {
    await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter, pageIndex, pageSize)]);
  };

  const handleToggleStatus = async (branch: BranchItemResponse) => {
    const isCurrentlyActive = branch.status.toLowerCase() === 'active';
    const nextActive = !isCurrentlyActive;
    try {
      const res = await branchManagementApi.toggleStatus(branch.id, nextActive);
      if (res.success) {
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter, pageIndex, pageSize)]);
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
        await Promise.all([fetchQuota(), fetchBranches(keyword, statusFilter, pageIndex, pageSize)]);
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', left: 12, top: 10 }}
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPageIndex(1);
              }}
              placeholder="Tìm kiếm theo mã, tên, địa chỉ, người quản lý..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                fontSize: 13,
                backgroundColor: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPageIndex(1);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid #CBD5E1',
              fontSize: 13,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
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
            padding: '7px 14px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#475569',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Tải lại danh sách"
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 3. Bảng danh sách chi nhánh chuẩn thống nhất toàn dự án */}
      <div className="so-list-table-card">
        <div className="so-list-table-body supplier-table-scroll-container">
          <table className="so-list-table" style={{ minWidth: 880 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th className="so-list-th" style={{ width: 52, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>#</th>
                <th className="so-list-th" style={{ width: 150, position: 'sticky', top: 0, zIndex: 10 }}>Mã chi nhánh</th>
                <th className="so-list-th" style={{ position: 'sticky', top: 0, zIndex: 10 }}>Tên & Địa chỉ chi nhánh</th>
                <th className="so-list-th" style={{ width: 160, position: 'sticky', top: 0, zIndex: 10 }}>Hotline</th>
                <th className="so-list-th" style={{ width: 170, position: 'sticky', top: 0, zIndex: 10 }}>Quản lý phụ trách</th>
                <th className="so-list-th" style={{ width: 135, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th className="so-list-th" style={{ width: 130, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    Đang tải danh sách chi nhánh...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
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
                branches.map((b, index) => {
                  const isActive = b.status.toLowerCase() === 'active';
                  const rowNum = (pageIndex - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={b.id}
                      className="so-list-row"
                      onClick={() => {
                        setSelectedBranch(b);
                        setActiveModal('detail');
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Bấm vào hàng để xem chi tiết thông số chi nhánh"
                    >
                      <td className="so-list-td" style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {rowNum}
                      </td>

                      {/* Mã */}
                      <td className="so-list-td">
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: 12.5,
                            color: '#0F766E',
                          }}
                        >
                          {b.code}
                        </span>
                      </td>

                      {/* Tên & Địa chỉ */}
                      <td className="so-list-td" style={{ whiteSpace: 'normal' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#0F172A',
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{b.name}</span>
                          {b.isHeadquarter && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#B45309',
                                backgroundColor: '#FEF3C7',
                                border: '1px solid #FDE68A',
                                padding: '1px 7px',
                                borderRadius: 9999,
                              }}
                            >
                              Trụ sở chính
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            color: '#64748B',
                            marginTop: 2,
                          }}
                        >
                          <MapPin size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                          <span>{b.address || 'Chưa cập nhật địa chỉ'}</span>
                        </div>
                      </td>

                      {/* Hotline */}
                      <td className="so-list-td" style={{ color: '#334155', fontFamily: 'var(--font-mono)' }}>
                        {b.phone ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={12.5} color="#94A3B8" />
                            <span>{b.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>

                      {/* Quản lý */}
                      <td className="so-list-td" style={{ color: '#334155' }}>
                        {b.managerName ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <User size={13} color="#94A3B8" />
                            <span>{b.managerName}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Chưa phân công</span>
                        )}
                      </td>

                      {/* Trạng thái chuẩn badge đồng nhất */}
                      <td className="so-list-td" style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: isActive ? '#f0fdf4' : '#f8fafc',
                            color: isActive ? '#15803d' : '#64748b',
                            border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="so-list-td so-list-td--actions" style={{ textAlign: 'center' }}>
                        <div
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBranch(b);
                              setActiveModal('detail');
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            title="Xem chi tiết các thông số chi nhánh"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(b)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: isActive ? '#d97706' : '#0f766e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            title={isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt hoạt động'}
                          >
                            <Power size={14} />
                          </button>

                          {/* Xóa chi nhánh */}
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(b)}
                            disabled={b.isHeadquarter}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: `1px solid ${b.isHeadquarter ? '#e2e8f0' : '#fecaca'}`,
                              background: b.isHeadquarter ? '#f8fafc' : '#ffffff',
                              color: b.isHeadquarter ? '#cbd5e1' : '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: b.isHeadquarter ? 'not-allowed' : 'pointer',
                              opacity: b.isHeadquarter ? 0.6 : 1,
                            }}
                            title={b.isHeadquarter ? 'Không thể xóa chi nhánh chính (Trụ sở chính)' : 'Xóa chi nhánh'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pageIndex}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 15, 20, 50]}
          onPageChange={(page) => setPageIndex(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(1);
          }}
          itemLabel="chi nhánh"
          isLoading={isLoading}
        />
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

