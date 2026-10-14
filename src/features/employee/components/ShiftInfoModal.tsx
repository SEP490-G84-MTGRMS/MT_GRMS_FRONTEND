import React from 'react';
import { Clock, Info, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import type { WorkShiftDefinition } from '../types';

interface ShiftInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  shifts: WorkShiftDefinition[];
}

export const ShiftInfoModal: React.FC<ShiftInfoModalProps> = ({ isOpen, onClose, shifts }) => {
  if (!isOpen) return null;

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 640 }}>
        {/* Header Modal */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="#0F766E" />
              <span>Thông tin các ca làm việc cố định</span>
            </h3>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Quy định khung giờ chuẩn của cửa hàng (3 ca cố định + 1 ca tùy chọn linh hoạt)
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card thông báo chính sách cố định ca */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 10,
            }}
          >
            <ShieldCheck size={20} color="#0F766E" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: '#115E59', lineHeight: 1.5 }}>
              <b>Chính sách ca làm việc:</b> Hệ thống áp dụng 3 ca cố định liên tục 24/7 để vận hành chuỗi cửa hàng, kèm 15 phút giao nhận ca giữa các ca làm việc. Ngoài ra hỗ trợ 1 ca tùy chọn thời gian cho nhân viên part-time hoặc điều phối linh hoạt.
            </div>
          </div>

          {/* Danh sách 4 ca làm việc */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shifts.map((sh) => {
              const isCustom = sh.id === 'custom';
              return (
                <div
                  key={sh.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: sh.color,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{sh.name}</span>
                        {isCustom && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: '#FEF3C7',
                              color: '#B45309',
                              padding: '2px 8px',
                              borderRadius: 9999,
                            }}
                          >
                            Linh hoạt
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#0F766E', fontWeight: 600, marginTop: 3 }}>
                        {isCustom ? 'Thời gian linh hoạt theo phân công' : `${sh.startTime} - ${sh.endTime}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                      {isCustom ? 'Tùy biến giờ' : `${sh.totalHours} giờ / ca`}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {isCustom ? 'Tùy chọn giờ vào - ra' : 'Bao gồm 15p giao ca'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ghi chú chấm công & bàn giao ca */}
          <div
            style={{
              padding: '12px 16px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 12,
              color: '#64748B',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={14} color="#0F766E" />
              <span>Quy định chấm công & bàn giao ca:</span>
            </div>
            <div>&bull; <b>Ca sáng:</b> 06:00 - 14:15 (Giao ca chiều lúc 14:00 - 14:15).</div>
            <div>&bull; <b>Ca chiều:</b> 14:00 - 22:15 (Giao ca đêm lúc 22:00 - 22:15).</div>
            <div>&bull; <b>Ca đêm:</b> 22:00 - 06:15 (Giao ca sáng lúc 06:00 - 06:15).</div>
            <div>&bull; <b>Ca tùy chọn:</b> Quản lý chỉ định giờ bắt đầu và kết thúc khi phân ca.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="emp-modal-footer">
          <button type="button" className="emp-btn emp-btn-primary" onClick={onClose} style={{ minWidth: 100 }}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
