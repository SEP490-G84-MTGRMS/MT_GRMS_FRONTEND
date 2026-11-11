import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { scheduleApi } from '../api/scheduleApi';
import { getVietnamToday } from '../lib/vietnamTime';

export type ScopeActionType = 'update' | 'delete';
export type ScheduleScopeType = 'single' | 'following' | 'all';

export interface ScheduleScopeDateRange {
  fromDate?: string;     // YYYY-MM-DD
  toDate?: string;       // YYYY-MM-DD
  fromDateStr?: string;  // dd/MM/yyyy
  toDateStr?: string;    // dd/MM/yyyy
}

interface ScheduleScopeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: ScopeActionType;
  employeeId?: string;
  branchId?: string;
  shiftId?: string;
  shiftName?: string;
  dayOfWeek?: string;
  dateStr?: string;
  startDateStr?: string;
  endDateStr?: string;
  selectedDays?: string[];
  onConfirm: (scope: ScheduleScopeType, dateRange?: ScheduleScopeDateRange) => void;
}

const parseDate = (str?: string): Date => {
  if (!str) return getVietnamToday();
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parts.length >= 3 ? parseInt(parts[2], 10) : getVietnamToday().getFullYear();
    return new Date(y, m, d);
  }
  return getVietnamToday();
};

const formatDateStr = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatIsoStr = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const getEndOfMonth = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

const parseWorkDate = (s: { workDate?: string; dateStr?: string }): Date | null => {
  if (s.workDate) {
    const raw = s.workDate.includes('T') ? s.workDate.split('T')[0] : s.workDate;
    const parts = raw.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const dt = new Date(s.workDate);
    if (!isNaN(dt.getTime())) return dt;
  }
  if (s.dateStr) {
    return parseDate(s.dateStr);
  }
  return null;
};

export const ScheduleScopeConfirmModal: React.FC<ScheduleScopeConfirmModalProps> = ({
  isOpen,
  onClose,
  actionType = 'update',
  employeeId,
  branchId,
  shiftId: _shiftId,
  shiftName: _shiftName,
  dayOfWeek: _dayOfWeek,
  dateStr = '16/10/2026',
  startDateStr,
  endDateStr,
  selectedDays,
  onConfirm,
}) => {
  const [selectedScope, setSelectedScope] = useState<ScheduleScopeType>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [maxAssignedDate, setMaxAssignedDate] = useState<Date | null>(null);

  // Fetch data từ backend khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    setSelectedScope('single');

    let isMounted = true;
    const fetchEmployeeSchedules = async () => {
      if (!employeeId) return;

      try {
        setIsLoading(true);
        // Tra cứu danh sách ca làm việc của nhân viên để tìm ca cuối cùng
        let schedules = await scheduleApi.getSchedules({
          employeeId,
          pageSize: 1000,
        });

        // Nếu filter không kèm branchId rỗng nhưng có branchId cụ thể, fallback thử lại
        if ((!schedules || schedules.length === 0) && branchId && branchId !== 'all') {
          schedules = await scheduleApi.getSchedules({
            employeeId,
            branchId,
            pageSize: 1000,
          });
        }

        if (!isMounted) return;

        if (schedules && schedules.length > 0) {
          let maxD: Date | null = null;
          for (const s of schedules) {
            const d = parseWorkDate(s);
            if (d && !isNaN(d.getTime())) {
              if (!maxD || d > maxD) {
                maxD = d;
              }
            }
          }
          setMaxAssignedDate(maxD);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách lịch từ backend cho modal phạm vi:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEmployeeSchedules();

    return () => {
      isMounted = false;
    };
  }, [isOpen, employeeId, branchId]);

  if (!isOpen) return null;

  // Tính toán các mốc ngày cho 3 Options
  const currDate = parseDate(dateStr);
  const currentDateFormatted = formatDateStr(currDate);

  // Option 2: Từ ngày mai - Hết tháng
  const tomorrow = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate() + 1);
  const tomorrowFormatted = formatDateStr(tomorrow);
  const endOfCurrentMonth = getEndOfMonth(currDate);
  const endOfCurrentMonthFormatted = formatDateStr(endOfCurrentMonth);

  // Option 3: Tất cả các ngày. Hết tháng cuối cùng được phân ca
  const effectiveStart = startDateStr ? parseDate(startDateStr) : currDate;
  const effectiveStartFormatted = formatDateStr(effectiveStart);

  // Xét ca cuối cùng của nhân viên này vào tháng nào
  const lastAssignedDate = maxAssignedDate || (endDateStr ? parseDate(endDateStr) : null);
  const targetDateForMonth = (lastAssignedDate && lastAssignedDate >= currDate)
    ? lastAssignedDate
    : currDate;

  // Ngày cuối cùng của tháng chứa ca cuối cùng
  const endOfLastMonth = new Date(
    targetDateForMonth.getFullYear(),
    targetDateForMonth.getMonth() + 1,
    0
  );
  const endOfLastMonthFormatted = formatDateStr(endOfLastMonth);

  const handleConfirm = () => {
    let dateRange: ScheduleScopeDateRange;

    if (selectedScope === 'single') {
      dateRange = {
        fromDate: formatIsoStr(currDate),
        toDate: formatIsoStr(currDate),
        fromDateStr: currentDateFormatted,
        toDateStr: currentDateFormatted,
      };
    } else if (selectedScope === 'following') {
      dateRange = {
        fromDate: formatIsoStr(tomorrow),
        toDate: formatIsoStr(endOfCurrentMonth),
        fromDateStr: tomorrowFormatted,
        toDateStr: endOfCurrentMonthFormatted,
      };
    } else {
      dateRange = {
        fromDate: formatIsoStr(effectiveStart),
        toDate: formatIsoStr(endOfLastMonth),
        fromDateStr: effectiveStartFormatted,
        toDateStr: endOfLastMonthFormatted,
      };
    }

    onConfirm(selectedScope, dateRange);
    onClose();
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div
        className="emp-modal-card"
        style={{ padding: '24px 28px', justifyContent: 'space-between', width: '100%', maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.2px',
              }}
            >
              {actionType === 'delete' ? 'Áp dụng xóa ca cho' : 'Áp dụng thay đổi này cho'}
            </h3>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: '#0F766E' }} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Radio Options: 3 lựa chọn với kích thước đồng nhất */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              scope: 'single' as const,
              title: actionType === 'delete'
                ? `Chỉ xóa ca ngày hiện tại (${currentDateFormatted})`
                : `Chỉ ngày hiện tại (${currentDateFormatted})`,
            },
            {
              scope: 'following' as const,
              title: actionType === 'delete'
                ? `Xóa từ ngày mai - Hết tháng (${tomorrowFormatted} - ${endOfCurrentMonthFormatted})`
                : `Từ ngày mai - Hết tháng (${tomorrowFormatted} - ${endOfCurrentMonthFormatted})`,
            },
            {
              scope: 'all' as const,
              title: actionType === 'delete'
                ? `Xóa tất cả các ngày. Hết tháng cuối cùng được phân ca (${effectiveStartFormatted} - ${endOfLastMonthFormatted})`
                : `Tất cả các ngày. Hết tháng cuối cùng được phân ca (${effectiveStartFormatted} - ${endOfLastMonthFormatted})`,
            },
          ].map((item) => {
            const isSelected = selectedScope === item.scope;
            return (
              <label
                key={item.scope}
                onClick={() => setSelectedScope(item.scope)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderRadius: 8,
                  border: isSelected ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#F0FDFA' : '#FFFFFF',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <input
                  type="radio"
                  name="schedule_scope"
                  checked={isSelected}
                  onChange={() => setSelectedScope(item.scope)}
                  style={{
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    minHeight: 18,
                    maxWidth: 18,
                    maxHeight: 18,
                    flexShrink: 0,
                    accentColor: '#0F766E',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#0F766E' : '#1E293B',
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </span>
              </label>
            );
          })}
        </div>

        {/* Lưu ý */}
        <div style={{ marginTop: 20, marginBottom: 24, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
          <strong>Lưu ý:</strong> Chỉ áp dụng thay đổi trên các Chi tiết ca làm việc chưa chấm công
          {selectedDays && selectedDays.length > 0 && (
            <span> thuộc các thứ được chọn (<strong>{selectedDays.join(', ')}</strong>)</span>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              background: '#0F766E',
              border: 'none',
              borderRadius: 8,
              padding: '8px 22px',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#115E59';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0F766E';
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
};
