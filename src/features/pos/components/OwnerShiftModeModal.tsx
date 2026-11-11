import React from 'react';
import { Store, ShoppingCart, Lock, Lightbulb, Check, X } from 'lucide-react';
import type { ShiftDetailResponse } from '../types/posShift.types';

export type OwnerShiftMode = 'attach' | 'shiftless';

interface OwnerShiftModeModalProps {
  isOpen: boolean;
  shift: ShiftDetailResponse | null;
  currentMode?: OwnerShiftMode | null;
  onSelectMode: (mode: OwnerShiftMode) => void;
  canDismiss?: boolean;
  onDismiss?: () => void;
}

export const OwnerShiftModeModal: React.FC<OwnerShiftModeModalProps> = ({
  isOpen,
  shift,
  currentMode,
  onSelectMode,
  canDismiss = false,
  onDismiss,
}) => {
  if (!isOpen || !shift) return null;

  const uniqueParticipants = shift.participants && shift.participants.length > 0
    ? Array.from(new Map(shift.participants.map((p) => [(p.userId || p.fullName || p.userName || '').trim(), p])).values())
    : [];

  const participantsList = uniqueParticipants.length > 0
    ? uniqueParticipants.map(p => p.fullName || p.userName || 'Nhân viên').join(', ')
    : 'Nhân viên trực quầy';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && canDismiss && onDismiss) {
          onDismiss();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '680px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "var(--font-sans, 'Be Vietnam Pro', sans-serif)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            padding: '24px 28px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Chi Nhánh Đang Có Ca Bán Hàng Hoạt Động
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#ccfbf1', opacity: 0.95 }}>
                Vui lòng chọn chế độ bán hàng và luồng tiền mặt phù hợp với thực tế tại quầy
              </p>
            </div>
          </div>

          {canDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          )}

          {/* Shift Context Info Banner */}
          <div
            style={{
              marginTop: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '12.5px',
            }}
          >
            <div>
              <span style={{ opacity: 0.8 }}>Mã ca: </span>
              <strong>{shift.shiftCode}</strong> ({shift.shiftName})
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>Nhân viên trực ca: </span>
              <strong>{participantsList}</strong>
            </div>
          </div>
        </div>

        {/* Modal Body / Selection Cards */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            Bạn đang đăng nhập với vai trò <strong>Chủ cửa hàng / Quản trị viên</strong>. Hãy chọn cách xử lý tiền mặt khi thu của khách:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Card 1: Bán vào ca quầy */}
            <div
              onClick={() => onSelectMode('attach')}
              style={{
                border: currentMode === 'attach' ? '2px solid #0f766e' : '1.5px solid #e2e8f0',
                backgroundColor: currentMode === 'attach' ? '#f0fdfa' : '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: currentMode === 'attach' ? '0 8px 20px rgba(15, 118, 110, 0.12)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentMode !== 'attach') {
                  e.currentTarget.style.borderColor = '#99f6e4';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentMode !== 'attach') {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#ccfbf1',
                      color: '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingCart size={18} color="#0f766e" />
                  </div>
                  {currentMode === 'attach' && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      Đang chọn
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Bỏ chung ngăn kéo quầy
                </h4>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f766e', marginBottom: '8px' }}>
                  Bán vào ca #{shift.shiftCode}
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                  Tiền mặt thu từ khách được bỏ vào ngăn kéo thu ngân. Doanh thu tiền mặt sẽ cộng vào tiền kiểm đếm ca và bạn cùng trực ca với nhân viên.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMode('attach');
                }}
                style={{
                  marginTop: '18px',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: currentMode === 'attach' ? '#0f766e' : '#0f766e',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {currentMode === 'attach' && <Check size={15} />}
                {currentMode === 'attach' ? 'Đang áp dụng' : 'Chọn bán vào ca'}
              </button>
            </div>

            {/* Card 2: Bán riêng két sắt */}
            <div
              onClick={() => onSelectMode('shiftless')}
              style={{
                border: currentMode === 'shiftless' ? '2px solid #475569' : '1.5px solid #e2e8f0',
                backgroundColor: currentMode === 'shiftless' ? '#f8fafc' : '#ffffff',
                borderRadius: '18px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: currentMode === 'shiftless' ? '0 8px 20px rgba(71, 85, 105, 0.12)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentMode !== 'shiftless') {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentMode !== 'shiftless') {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock size={18} color="#475569" />
                  </div>
                  {currentMode === 'shiftless' && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: '#475569',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      Đang chọn
                    </span>
                  )}
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Tự giữ / Cất két sắt
                </h4>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                  Bán riêng không gắn ca
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                  Tiền mặt bạn tự giữ hoặc cất thẳng vào két sắt. Ngăn kéo quầy của nhân viên giữ nguyên độc lập, nhân viên không phải kiểm đếm tiền này.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMode('shiftless');
                }}
                style={{
                  marginTop: '18px',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: currentMode === 'shiftless' ? '#475569' : '#334155',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {currentMode === 'shiftless' && <Check size={15} />}
                {currentMode === 'shiftless' ? 'Đang áp dụng' : 'Chọn bán riêng'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Tip */}
        <div
          style={{
            padding: '14px 28px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            Bạn có thể đổi lại chế độ này bất cứ lúc nào qua nút trên thanh tiêu đề POS.
          </span>
          {canDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Giữ nguyên & Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

