import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import type { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  categoryToEdit?: Category | null;
  onClose: () => void;
  onSave: (name: string, id?: string, code?: string, description?: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  categoryToEdit,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState<{ name?: boolean; code?: boolean; description?: boolean }>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      setCode(categoryToEdit.code || '');
      setDescription(categoryToEdit.description || '');
      setTouched({});
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setIsSubmitting(false);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setTouched({});
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const nameError =
    touched.name && !trimmedName
      ? 'Vui lòng nhập tên nhóm hàng.'
      : trimmedName.length > 100
      ? 'Tên nhóm hàng không được vượt quá 100 ký tự.'
      : '';

  const trimmedCode = code.trim().toUpperCase();
  const codeError =
    !categoryToEdit && code !== ''
      ? trimmedCode.length > 30
        ? 'Mã nhóm hàng không được vượt quá 30 ký tự.'
        : /\s/.test(code) || !/^[A-Z0-9_-]+$/.test(trimmedCode)
        ? 'Mã nhóm hàng chỉ gồm chữ cái không dấu, số, gạch ngang (-) hoặc gạch dưới (_).'
        : ''
      : '';

  const descError =
    description.trim().length > 500
      ? 'Mô tả nhóm hàng không được vượt quá 500 ký tự.'
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, code: true, description: true });
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên nhóm hàng.');
      return;
    }
    if (trimmedName.length > 100) {
      setErrorMsg('Tên nhóm hàng không được vượt quá 100 ký tự.');
      return;
    }

    if (!categoryToEdit && code !== '') {
      if (trimmedCode.length > 30 || /\s/.test(code) || !/^[A-Z0-9_-]+$/.test(trimmedCode)) {
        setErrorMsg('Mã nhóm hàng chỉ gồm chữ cái không dấu, số, gạch ngang/dưới và tối đa 30 ký tự.');
        return;
      }
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 500) {
      setErrorMsg('Mô tả nhóm hàng không được vượt quá 500 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSave(
        trimmedName,
        categoryToEdit?.id,
        trimmedCode || undefined,
        trimmedDesc || undefined
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu nhóm hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit || !onDelete) return;
    if (categoryToEdit.productCount > 0) {
      setErrorMsg(`Không thể xóa nhóm hàng "${categoryToEdit.name}" vì đang chứa ${categoryToEdit.productCount} sản phẩm.`);
      setShowDeleteConfirm(false);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onDelete(categoryToEdit.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể xóa nhóm hàng.');
      setShowDeleteConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="custom-modal-backdrop"
      style={{
        zIndex: 1200,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <div
        className="custom-modal-box"
        style={{
          maxWidth: 480,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div className="custom-modal-header">
          <h3>{categoryToEdit ? 'Sửa nhóm hàng' : 'Tạo nhóm hàng mới'}</h3>
          <button type="button" className="custom-modal-close" onClick={onClose} disabled={isSubmitting}>
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
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {!showDeleteConfirm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tên nhóm hàng */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13.5, color: '#334155' }}>
                      Tên nhóm hàng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: 11.5, color: name.length > 100 ? '#dc2626' : '#94a3b8' }}>
                      {name.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    className="filter-input"
                    style={{
                      padding: '8px 12px',
                      fontSize: 13.5,
                      borderColor: nameError ? '#ef4444' : undefined,
                      boxShadow: nameError ? '0 0 0 2px rgba(239, 68, 68, 0.12)' : undefined,
                    }}
                    placeholder="Ví dụ: Rau Củ Sạch, Đồ Uống Pha Chế..."
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setTouched((prev) => ({ ...prev, name: true }));
                      setErrorMsg('');
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    autoFocus
                  />
                  {nameError && (
                    <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{nameError}</span>
                    </div>
                  )}
                </div>

                {/* Mã nhóm hàng (tùy chọn hoặc tự sinh) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13.5, color: '#334155' }}>
                      Mã nhóm hàng {categoryToEdit ? '' : <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>(Tự sinh nếu để trống)</span>}
                    </label>
                    {!categoryToEdit && (
                      <span style={{ fontSize: 11.5, color: code.length > 30 ? '#dc2626' : '#94a3b8' }}>
                        {code.length}/30
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="filter-input"
                    style={{
                      padding: '8px 12px',
                      fontSize: 13.5,
                      textTransform: 'uppercase',
                      borderColor: codeError ? '#ef4444' : undefined,
                      boxShadow: codeError ? '0 0 0 2px rgba(239, 68, 68, 0.12)' : undefined,
                    }}
                    placeholder="Ví dụ: FRESH, BEV, DRY..."
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setTouched((prev) => ({ ...prev, code: true }));
                      setErrorMsg('');
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, code: true }))}
                    disabled={Boolean(categoryToEdit)}
                  />
                  {codeError && (
                    <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{codeError}</span>
                    </div>
                  )}
                </div>

                {/* Mô tả nhóm hàng */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: 13.5, color: '#334155' }}>
                      Mô tả
                    </label>
                    <span style={{ fontSize: 11.5, color: description.length > 500 ? '#dc2626' : '#94a3b8' }}>
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    className="filter-input"
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      resize: 'vertical',
                      borderColor: descError ? '#ef4444' : undefined,
                      boxShadow: descError ? '0 0 0 2px rgba(239, 68, 68, 0.12)' : undefined,
                    }}
                    placeholder="Ghi chú ngắn về nhóm sản phẩm này..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setTouched((prev) => ({ ...prev, description: true }));
                      setErrorMsg('');
                    }}
                  />
                  {descError && (
                    <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{descError}</span>
                    </div>
                  )}
                </div>

                {categoryToEdit && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#475569',
                      background: '#F8FAFC',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        Mã hệ thống: <b style={{ color: '#0f172a' }}>{categoryToEdit.code}</b>
                      </span>
                      <span>
                        Đang có: <b style={{ color: categoryToEdit.productCount > 0 ? '#0F766E' : '#64748b' }}>{categoryToEdit.productCount}</b> sản phẩm
                      </span>
                    </div>
                    {categoryToEdit.productCount > 0 && (
                      <div style={{ fontSize: 11.5, color: '#d97706', marginTop: 4 }}>
                        * Nhóm hàng đang chứa sản phẩm liên kết nên chưa thể xóa.
                      </div>
                    )}
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
                  Bạn có chắc muốn xóa nhóm hàng <b>"{categoryToEdit?.name}"</b>? Thao tác này sẽ cập nhật trạng thái đã xóa trên máy chủ.
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
                onClick={() => {
                  if (categoryToEdit.productCount > 0) {
                    setErrorMsg(`Không thể xóa nhóm hàng "${categoryToEdit.name}" vì đang chứa ${categoryToEdit.productCount} sản phẩm liên kết.`);
                    return;
                  }
                  setShowDeleteConfirm(true);
                }}
                disabled={isSubmitting}
                title={categoryToEdit.productCount > 0 ? 'Không thể xóa vì còn sản phẩm trong nhóm' : 'Xóa nhóm hàng'}
              >
                <Trash2 size={15} /> Xóa nhóm hàng
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
                    disabled={isSubmitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-primary-teal"
                    style={{ backgroundColor: '#dc2626' }}
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang xóa...' : 'Đồng ý xóa'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-secondary-white" onClick={onClose} disabled={isSubmitting}>
                    Bỏ qua
                  </button>
                  <button type="submit" className="btn-primary-teal" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : (categoryToEdit ? 'Cập nhật' : 'Tạo mới')}
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
