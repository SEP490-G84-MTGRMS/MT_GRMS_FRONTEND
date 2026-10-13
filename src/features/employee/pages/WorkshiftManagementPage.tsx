import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkShiftDefinition } from '../types';
import { MOCK_WORK_SHIFTS } from '../services/mockData';
import { ShiftFormModal } from '../components/ShiftFormModal';
import '../employee.css';

export const WorkshiftManagementPage: React.FC = () => {
  const [shifts, setShifts] = useState<WorkShiftDefinition[]>(MOCK_WORK_SHIFTS);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShiftDefinition | null>(null);

  const filteredShifts = shifts.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateNew = () => {
    setEditingShift(null);
    setShowShiftModal(true);
  };

  const handleEdit = (shift: WorkShiftDefinition) => {
    setEditingShift(shift);
    setShowShiftModal(true);
  };

  const handleSaveShift = (savedShift: WorkShiftDefinition) => {
    setShifts((prev) => {
      const exists = prev.some((s) => s.id === savedShift.id);
      if (exists) {
        return prev.map((s) => (s.id === savedShift.id ? savedShift : s));
      }
      return [...prev, savedShift];
    });
  };

  const handleToggleStatus = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          return { ...s, status: s.status === 'active' ? 'inactive' : 'active' };
        }
        return s;
      })
    );
  };

  const handleDelete = (shiftId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    }
  };

  return (
    <div className="emp-page-container">
      {/* Header Bar */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            to="/store-owner/employees/schedule"
            style={{ textDecoration: 'none', color: '#0F766E', fontWeight: 600, fontSize: 13 }}
          >
            &larr; Lịch làm việc
          </Link>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <h2 className="emp-header-title" style={{ margin: 0 }}>
            <span>Ca làm việc</span>
            <span className="count-badge">{filteredShifts.length}</span>
          </h2>

          <div className="emp-search-box">
            <span className="emp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên ca làm việc..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          <select
            className="emp-filter-select"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang sử dụng</option>
            <option value="inactive">Ngừng sử dụng</option>
          </select>
        </div>

        <div className="emp-header-actions">
          <button type="button" className="emp-btn emp-btn-primary" onClick={handleCreateNew}>
            + Tạo ca làm việc
          </button>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={() => alert('Xuất danh sách ca làm việc ra Excel thành công!')}
          >
            📥 Xuất file
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="emp-table-container">
        <table className="emp-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>STT</th>
              <th style={{ width: 200 }}>Tên ca làm việc</th>
              <th style={{ width: 140, textAlign: 'center' }}>Giờ làm việc</th>
              <th style={{ width: 90, textAlign: 'center' }}>Số giờ</th>
              <th style={{ width: 180, textAlign: 'center' }}>Giờ cho phép chấm công</th>
              <th style={{ width: 120, textAlign: 'center' }}>Nghỉ giữa ca</th>
              <th style={{ width: 120, textAlign: 'center' }}>Màu nhận diện</th>
              <th style={{ width: 130, textAlign: 'center' }}>Trạng thái</th>
              <th style={{ width: 120, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.length ? (
              filteredShifts.map((sh, idx) => (
                <tr key={sh.id}>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 9999,
                          background: sh.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{sh.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#0F766E' }}>
                    {sh.startTime} - {sh.endTime}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{sh.totalHours}h</td>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{sh.checkInAllowance}</td>
                  <td style={{ textAlign: 'center', color: '#64748B' }}>{sh.breakTime || 'Không'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 6,
                        background: `${sh.color}20`,
                        color: sh.color,
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {sh.color}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`emp-status-pill ${
                        sh.status === 'active' ? 'active' : 'inactive'
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(sh.id)}
                      title="Nhấn để đổi trạng thái"
                    >
                      {sh.status === 'active' ? 'Đang sử dụng' : 'Ngừng dùng'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#0F766E',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                        onClick={() => handleEdit(sh)}
                        title="Sửa ca làm việc"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                        onClick={() => handleDelete(sh.id)}
                        title="Xóa ca"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#94A3B8', padding: 36 }}>
                  Không tìm thấy ca làm việc nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal tạo/sửa ca */}
      <ShiftFormModal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false);
          setEditingShift(null);
        }}
        shift={editingShift}
        onSave={handleSaveShift}
      />
    </div>
  );
};
