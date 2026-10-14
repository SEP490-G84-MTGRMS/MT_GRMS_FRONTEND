import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Info, X, MapPin, CheckCircle2, ShieldCheck, Navigation } from 'lucide-react';

export interface GpsLocationItem {
  id: string;
  stt: number;
  branchName: string;
  address: string;
  coordinates: string;
  radius: number;
  isActive: boolean;
}

interface GpsLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_GPS_LOCATIONS: GpsLocationItem[] = [
  {
    id: 'gps-1',
    stt: 1,
    branchName: 'Chi nhánh trung tâm',
    address: '1B Yết Kiêu, Cửa Nam, Hà Nội',
    coordinates: '21.020689,105.8432034',
    radius: 50,
    isActive: true,
  },
  {
    id: 'gps-2',
    stt: 2,
    branchName: 'HCM',
    address: 'Lầu 6, Khu C, tòa nhà Waseco, số 10 Phổ Quang, Phường 02, Hồ Chí Minh - Quận Tân Bình',
    coordinates: '21.02068899986547,105.8432034',
    radius: 50,
    isActive: true,
  },
  {
    id: 'gps-3',
    stt: 3,
    branchName: 'Nghệ An',
    address: '28, Phường Hưng Bình, Nghệ An - Thành phố Vinh',
    coordinates: '18.6794678,105.6805273',
    radius: 500,
    isActive: true,
  },
  {
    id: 'gps-4',
    stt: 4,
    branchName: 'Nha Trang',
    address: '1053, Phường Vạn Thạnh, Khánh Hòa - Thành phố Nha Trang',
    coordinates: '12.2527092,109.191673',
    radius: 500,
    isActive: true,
  },
];

export const SYSTEM_BRANCHES = [
  { id: 'b1', name: 'Chi nhánh trung tâm', address: '1B Yết Kiêu, Cửa Nam, Hà Nội', coordinates: '21.020689,105.8432034' },
  { id: 'b2', name: 'HCM', address: 'Lầu 6, Khu C, tòa nhà Waseco, số 10 Phổ Quang, Phường 02, Hồ Chí Minh - Quận Tân Bình', coordinates: '21.02068899986547,105.8432034' },
  { id: 'b3', name: 'Nghệ An', address: '28, Phường Hưng Bình, Nghệ An - Thành phố Vinh', coordinates: '18.6794678,105.6805273' },
  { id: 'b4', name: 'Nha Trang', address: '1053, Phường Vạn Thạnh, Khánh Hòa - Thành phố Nha Trang', coordinates: '12.2527092,109.191673' },
  { id: 'b5', name: 'Chi nhánh 2', address: 'Số 15 Lê Văn Lương, Q. Thanh Xuân, Hà Nội', coordinates: '21.0028,105.8012' },
  { id: 'b6', name: 'Chi nhánh 3 (Đà Nẵng)', address: 'Số 88 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng', coordinates: '16.0612,108.2185' },
  { id: 'b7', name: 'Chi nhánh Cần Thơ', address: 'Số 12 Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ', coordinates: '10.0336,105.7877' },
];

export const GpsLocationsModal: React.FC<GpsLocationsModalProps> = ({ isOpen, onClose }) => {
  const [locations, setLocations] = useState<GpsLocationItem[]>(INITIAL_GPS_LOCATIONS);

  // State form Thêm / Sửa
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GpsLocationItem | null>(null);
  const [formBranchName, setFormBranchName] = useState('');
  const [isCustomBranch, setIsCustomBranch] = useState(false);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCoordinates, setFormCoordinates] = useState('');
  const [formRadius, setFormRadius] = useState<number>(50);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormBranchName(SYSTEM_BRANCHES[0].name);
    setIsCustomBranch(false);
    setCustomBranchInput('');
    setFormAddress(SYSTEM_BRANCHES[0].address);
    setFormCoordinates(SYSTEM_BRANCHES[0].coordinates);
    setFormRadius(50);
    setFormIsActive(true);
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: GpsLocationItem) => {
    setEditingItem(item);
    const isKnown = SYSTEM_BRANCHES.some((b) => b.name === item.branchName);
    if (isKnown) {
      setFormBranchName(item.branchName);
      setIsCustomBranch(false);
      setCustomBranchInput('');
    } else {
      setFormBranchName('custom');
      setIsCustomBranch(true);
      setCustomBranchInput(item.branchName);
    }
    setFormAddress(item.address);
    setFormCoordinates(item.coordinates);
    setFormRadius(item.radius);
    setFormIsActive(item.isActive);
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa địa chỉ GPS này?')) {
      setLocations((prev) =>
        prev
          .filter((item) => item.id !== id)
          .map((item, idx) => ({ ...item, stt: idx + 1 }))
      );
    }
  };

  const handleToggleStatus = (id: string) => {
    setLocations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBranchName = isCustomBranch ? customBranchInput.trim() : formBranchName.trim();
    if (!finalBranchName || !formCoordinates.trim()) {
      alert('Vui lòng chọn hoặc nhập tên chi nhánh và tọa độ GPS!');
      return;
    }

    if (editingItem) {
      // Cập nhật
      setLocations((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                branchName: finalBranchName,
                address: formAddress.trim(),
                coordinates: formCoordinates.trim(),
                radius: formRadius,
                isActive: formIsActive,
              }
            : item
        )
      );
    } else {
      // Thêm mới
      const newItem: GpsLocationItem = {
        id: `gps-${Date.now()}`,
        stt: locations.length + 1,
        branchName: finalBranchName,
        address: formAddress.trim(),
        coordinates: formCoordinates.trim(),
        radius: formRadius,
        isActive: formIsActive,
      };
      setLocations((prev) => [...prev, newItem]);
    }

    setShowFormModal(false);
  };

  const handleGetDeviceLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormCoordinates(
            `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`
          );
        },
        () => {
          alert('Không thể truy cập GPS thiết bị hoặc quyền bị từ chối.');
        }
      );
    } else {
      alert('Trình duyệt không hỗ trợ Geolocation API.');
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 940 }}>
        {/* Header Modal chuẩn Design System */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0F766E',
                flexShrink: 0,
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                Địa chỉ chấm công & Vị trí GPS
              </h3>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                Quản lý các tọa độ hợp lệ cho phép nhân viên quét mã QR và check-in / check-out
              </div>
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} title="Đóng">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Thanh Toolbar hướng dẫn & Nút thêm mới */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 10,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0F766E' }}>
              <Navigation size={18} style={{ flexShrink: 0 }} />
              <span>
                Cấu hình bán kính GPS cho phép nhân viên quét mã QR và xác thực vị trí khi Check-in / Check-out.
              </span>
            </div>
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={handleOpenAdd}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 13 }}
            >
              <Plus size={16} />
              <span>Thêm địa chỉ GPS</span>
            </button>
          </div>

          {/* Bảng danh sách địa chỉ GPS */}
          <div className="emp-table-container" style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
            <table className="emp-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 55, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 170 }}>Chi nhánh làm việc</th>
                  <th>Địa chỉ</th>
                  <th style={{ width: 220 }}>Tọa độ Gps</th>
                  <th style={{ width: 130, textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      Khoảng cách <Info size={13} color="#64748B" />
                    </span>
                  </th>
                  <th style={{ width: 110, textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: 95, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((item) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748B' }}>
                      {item.stt}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {item.branchName}
                    </td>
                    <td style={{ color: '#334155', lineHeight: 1.45 }}>
                      {item.address}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          background: '#F1F5F9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          wordBreak: 'break-all',
                        }}
                      >
                        {item.coordinates}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          background: '#ECFDF5',
                          color: '#059669',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {item.radius} m
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: item.isActive ? '#ECFDF5' : '#F1F5F9',
                          border: item.isActive ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                          borderRadius: 9999,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          color: item.isActive ? '#059669' : '#64748B',
                          transition: 'all 0.15s ease',
                        }}
                        title="Nhấn để Bật / Tắt"
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: item.isActive ? '#10B981' : '#94A3B8',
                            display: 'inline-block',
                          }}
                        />
                        <span>{item.isActive ? 'Bật' : 'Tắt'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          title="Chỉnh sửa"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: '#F0FDFA',
                            border: '1px solid #99F6E4',
                            color: '#0F766E',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#CCFBF1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F0FDFA';
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Xóa"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FEE2E2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FEF2F2';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="emp-modal-footer">
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={onClose}
            style={{ minWidth: 100 }}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal Con: Thêm / Sửa địa chỉ GPS */}
      {showFormModal && (
        <div className="emp-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="emp-modal-card" style={{ maxWidth: 520 }}>
            <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="#0F766E" />
                <span>{editingItem ? 'Chỉnh sửa địa chỉ GPS' : 'Thêm mới địa chỉ GPS'}</span>
              </h3>
              <button type="button" className="emp-modal-close-btn" onClick={() => setShowFormModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="emp-form-group" style={{ marginBottom: 0 }}>
                  <label className="emp-form-label">
                    Chi nhánh làm việc <span className="required">*</span>
                  </label>
                  <select
                    className="emp-form-select"
                    value={isCustomBranch ? 'custom' : formBranchName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setIsCustomBranch(true);
                        setFormBranchName('custom');
                        if (!customBranchInput) setCustomBranchInput('');
                      } else {
                        setIsCustomBranch(false);
                        setFormBranchName(val);
                        const found = SYSTEM_BRANCHES.find((b) => b.name === val);
                        if (found) {
                          setFormAddress(found.address);
                          setFormCoordinates(found.coordinates);
                        }
                      }
                    }}
                    required
                  >
                    <option value="" disabled>-- Chọn chi nhánh làm việc --</option>
                    {SYSTEM_BRANCHES.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    <option value="custom">-- Chi nhánh khác (Tự nhập) --</option>
                  </select>

                  {isCustomBranch && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        className="emp-form-input"
                        placeholder="Nhập tên chi nhánh mới..."
                        value={customBranchInput}
                        onChange={(e) => setCustomBranchInput(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="emp-form-group" style={{ marginBottom: 0 }}>
                  <label className="emp-form-label">Địa chỉ chi tiết</label>
                  <textarea
                    className="emp-form-input"
                    rows={2}
                    placeholder="VD: 1B Yết Kiêu, Cửa Nam, Hà Nội..."
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                <div className="emp-form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="emp-form-label" style={{ margin: 0 }}>
                      Tọa độ GPS (Vĩ độ, Kinh độ) <span className="required">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetDeviceLocation}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0F766E',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <MapPin size={12} />
                      <span>Lấy tọa độ hiện tại</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="emp-form-input"
                    placeholder="VD: 21.020689,105.8432034"
                    value={formCoordinates}
                    onChange={(e) => setFormCoordinates(e.target.value)}
                    required
                  />
                </div>

                <div className="emp-grid-2">
                  <div className="emp-form-group" style={{ marginBottom: 0 }}>
                    <label
                      className="emp-form-label"
                      style={{
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        marginBottom: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Bán kính cho phép <span className="required" style={{ marginLeft: 3 }}>*</span>
                    </label>
                    <select
                      className="emp-form-select"
                      style={{ height: 38, width: '100%' }}
                      value={formRadius}
                      onChange={(e) => setFormRadius(Number(e.target.value))}
                    >
                      <option value={50}>50 mét</option>
                      <option value={100}>100 mét</option>
                      <option value={200}>200 mét</option>
                      <option value={500}>500 mét</option>
                      <option value={1000}>1.000 mét (1 km)</option>
                    </select>
                  </div>

                  <div className="emp-form-group" style={{ marginBottom: 0 }}>
                    <label
                      className="emp-form-label"
                      style={{
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        marginBottom: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Trạng thái kích hoạt
                    </label>
                    <select
                      className="emp-form-select"
                      style={{ height: 38, width: '100%' }}
                      value={formIsActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormIsActive(e.target.value === 'active')}
                    >
                      <option value="active">Bật</option>
                      <option value="inactive">Tắt</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="emp-btn emp-btn-secondary"
                  onClick={() => setShowFormModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="emp-btn emp-btn-primary">
                  {editingItem ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
