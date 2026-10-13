import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import type { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  categoryToEdit?: Category | null;
  onClose: () => void;
  onSave: (name: string, id?: string) => void;
  onDelete?: (id: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  categoryToEdit,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setShowDeleteConfirm(false);
      setErrorMsg('');
    } else {
      setName('');
      setShowDeleteConfirm(false);
      setErrorMsg('');
    }
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên nhóm hàng');
      return;
    }
    onSave(name.trim(), categoryToEdit?.id);
    onClose();
  };

  const handleDelete = () => {
    if (!categoryToEdit || !onDelete) return;
    if (categoryToEdit.productCount > 0) {
      setErrorMsg(`Không thể xóa nhóm hàng "${categoryToEdit.name}" vì đang chứa ${categoryToEdit.productCount} sản phẩm.`);
      setShowDeleteConfirm(false);
      return;
    }
    onDelete(categoryToEdit.id);
    onClose();
  };

  return (
    <div className="custom-modal-backdrop">
      <div className="custom-modal-box" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>{categoryToEdit ? 'Sửa nhóm hàng' : 'Tạo nhóm hàng'}</h3>
          <button type="button" className="custom-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="custom-modal-body">
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: 12,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {!showDeleteConfirm ? (
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: '#334155' }}>
                  Tên nhóm <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ padding: '10px 14px', fontSize: 14 }}
                  placeholder="Ví dụ: Áo sơ mi nam, Bánh ngọt..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrorMsg('');
                  }}
                  autoFocus
                />
                {categoryToEdit && (
                  <div style={{ marginTop: 12, fontSize: 12.5, color: '#64748b' }}>
                    Mã nhóm: <b>{categoryToEdit.code}</b> &bull; Đang có: <b>{categoryToEdit.productCount}</b> sản phẩm
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '10px 0', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                  <Trash2 size={24} />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#0f172a' }}>Xác nhận xóa nhóm hàng?</h4>
                <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>
                  Bạn có chắc muốn xóa nhóm hàng <b>"{categoryToEdit?.name}"</b>? Thao tác này không thể hoàn tác.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="custom-modal-footer" style={{ justifyContent: 'space-between' }}>
            {categoryToEdit && !showDeleteConfirm ? (
              <button
                type="button"
                className="btn-danger-soft"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={15} /> Xóa
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              {showDeleteConfirm ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary-white"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-primary-teal"
                    style={{ backgroundColor: '#dc2626' }}
                    onClick={handleDelete}
                  >
                    Đồng ý xóa
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-secondary-white" onClick={onClose}>
                    Bỏ qua
                  </button>
                  <button type="submit" className="btn-primary-teal">
                    Lưu
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
