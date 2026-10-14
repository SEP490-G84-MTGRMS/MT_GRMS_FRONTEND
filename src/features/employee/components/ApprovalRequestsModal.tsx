import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ApprovalRequest } from '../types';

interface ApprovalRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ApprovalRequest[];
  onApprove: (requestIds: string[]) => void;
  onReject: (requestIds: string[]) => void;
}

export const ApprovalRequestsModal: React.FC<ApprovalRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onApprove,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'profile'>('attendance');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved'>('pending');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const filteredRequests = requests.filter((r) => {
    const matchType = r.type === activeTab;
    const matchStatus = r.status === statusFilter;
    const matchKeyword =
      !searchKeyword ||
      r.employeeName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      r.title.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchType && matchStatus && matchKeyword;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    onApprove(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkReject = () => {
    if (selectedIds.length === 0) return;
    onReject(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 1050 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>Yêu cầu chờ duyệt</h3>
            <span className="count-badge" style={{ background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 700 }}>
              {requests.filter((r) => r.status === 'pending').length} chờ xử lý
            </span>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="emp-modal-tabs">
          <button
            type="button"
            className={`emp-modal-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('attendance');
              setSelectedIds([]);
            }}
          >
            Chấm công (
            {requests.filter((r) => r.type === 'attendance' && r.status === 'pending').length}
            )
          </button>
          <button
            type="button"
            className={`emp-modal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              setSelectedIds([]);
            }}
          >
            Hồ sơ nhân viên (
            {requests.filter((r) => r.type === 'profile' && r.status === 'pending').length}
            )
          </button>
        </div>

        {/* Body Layout: Sidebar Lọc + Bảng Yêu Cầu */}
        <div className="emp-modal-body" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: 420 }}>
            {/* Cột trái: Bộ lọc */}
            <div style={{ background: '#F8FAFC', borderRight: '1px solid #E2E8F0', padding: 20 }}>
              <div className="emp-form-group">
                <label className="emp-form-label">Trạng thái xử lý</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label className="emp-radio-label">
                    <input
                      type="radio"
                      name="appr_st"
                      checked={statusFilter === 'pending'}
                      onChange={() => setStatusFilter('pending')}
                    />
                    <span>Chưa duyệt</span>
                  </label>
                  <label className="emp-radio-label">
                    <input
                      type="radio"
                      name="appr_st"
                      checked={statusFilter === 'approved'}
                      onChange={() => setStatusFilter('approved')}
                    />
                    <span>Đã duyệt</span>
                  </label>
                </div>
              </div>

              <div className="emp-form-group" style={{ marginTop: 16 }}>
                <label className="emp-form-label">Tìm kiếm</label>
                <input
                  type="text"
                  className="emp-form-input"
                  placeholder="Tên NV hoặc nội dung"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>

            {/* Cột phải: Bảng yêu cầu */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              {statusFilter === 'pending' && selectedIds.length > 0 && (
                <div
                  style={{
                    background: '#F0FDFA',
                    border: '1px solid #99F6E4',
                    padding: '8px 16px',
                    borderRadius: 8,
                    marginBottom: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>
                    Đã chọn {selectedIds.length} yêu cầu
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="emp-btn emp-btn-primary"
                      style={{ height: 32, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={handleBulkApprove}
                    >
                      <Check size={14} />
                      <span>Duyệt hàng loạt</span>
                    </button>
                    <button
                      type="button"
                      className="emp-btn emp-btn-danger-outline"
                      style={{ height: 32, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={handleBulkReject}
                    >
                      <X size={14} />
                      <span>Từ chối hàng loạt</span>
                    </button>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="emp-table" style={{ border: '1px solid #E2E8F0', borderRadius: 8 }}>
                  <thead>
                    <tr>
                      {statusFilter === 'pending' && (
                        <th style={{ width: 36 }}>
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={
                              filteredRequests.length > 0 &&
                              selectedIds.length === filteredRequests.length
                            }
                            style={{ accentColor: '#0F766E' }}
                          />
                        </th>
                      )}
                      <th>Thời gian</th>
                      <th>Nhân viên</th>
                      <th>Chi nhánh</th>
                      <th>Loại yêu cầu</th>
                      <th>Nội dung chi tiết</th>
                      {statusFilter === 'pending' && <th style={{ width: 110 }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length ? (
                      filteredRequests.map((req) => (
                        <tr key={req.id}>
                          {statusFilter === 'pending' && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(req.id)}
                                onChange={() => handleToggleSelect(req.id)}
                                style={{ accentColor: '#0F766E' }}
                              />
                            </td>
                          )}
                          <td style={{ color: '#64748B', whiteSpace: 'nowrap' }}>{req.createdAt}</td>
                          <td style={{ fontWeight: 600 }}>{req.employeeName}</td>
                          <td>{req.branchName}</td>
                          <td style={{ color: '#0F766E', fontWeight: 600 }}>{req.title}</td>
                          <td style={{ fontSize: 12, color: '#475569' }}>{req.description}</td>
                          {statusFilter === 'pending' && (
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  type="button"
                                  style={{
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#059669',
                                    borderRadius: 9999,
                                    width: 28,
                                    height: 28,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Duyệt yêu cầu"
                                  onClick={() => onApprove([req.id])}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    borderRadius: 9999,
                                    width: 28,
                                    height: 28,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Từ chối yêu cầu"
                                  onClick={() => onReject([req.id])}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={statusFilter === 'pending' ? 7 : 5}
                          style={{ textAlign: 'center', color: '#94A3B8', padding: 36 }}
                        >
                          Không có yêu cầu nào phù hợp điều kiện lọc
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="emp-modal-footer">
          <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
