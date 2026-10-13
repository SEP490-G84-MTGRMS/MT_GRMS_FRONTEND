import { useState } from 'react';
import type { FC } from 'react';
import { ClipboardCheck, Printer, Lock } from 'lucide-react';
import type { ShiftHandoverData } from '../types/pos.types';

interface Props {
  actualCash: number;
  onOpenZReportModal: () => void;
  onCloseShift: (data: ShiftHandoverData) => void;
}

export const ShiftHandoverForm: FC<Props> = ({
  actualCash,
  onOpenZReportModal,
  onCloseShift,
}) => {
  const [receiverName, setReceiverName] = useState('Trần Thị Hoa (Thu ngân Ca Chiều - NV002)');
  const [floatRetained, setFloatRetained] = useState(1500000);
  const [notes, setNotes] = useState(
    'Bàn giao đầy đủ chìa khóa két và cuộn in K80, số tiền khớp 100%.'
  );

  const cashHandedOver = Math.max(0, actualCash - floatRetained);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn chốt số liệu và ĐÓNG CA bán hàng?\n- Người nhận: ${receiverName}\n- Để lại két: ${floatRetained.toLocaleString(
        'vi-VN'
      )} đ\n- Nộp lại: ${cashHandedOver.toLocaleString('vi-VN')} đ`
    );
    if (confirmed) {
      onCloseShift({
        receiverName,
        floatRetained,
        cashHandedOver,
        notes,
      });
    }
  };

  return (
    <form className="pos-handover-card" onSubmit={handleSubmit}>
      <div className="pos-shift-card-header">
        <h3 className="pos-shift-card-title">
          <ClipboardCheck size={16} className="text-teal-700" />
          <span>Thông Tin Bàn Giao Ca Sau</span>
        </h3>
      </div>

      <div className="handover-grid">
        <div className="handover-field">
          <label className="handover-label">
            Người nhận bàn giao <span className="text-rose-500">*</span>:
          </label>
          <select
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            className="handover-select"
          >
            <option value="Trần Thị Hoa (Thu ngân Ca Chiều - NV002)">
              Trần Thị Hoa (Thu ngân Ca Chiều - NV002)
            </option>
            <option value="Nguyễn Long Nhật (Quản lý cửa hàng - NV001)">
              Nguyễn Long Nhật (Quản lý cửa hàng - NV001)
            </option>
            <option value="Lê Hoàng Nam (Thu ngân Ca Tối - NV003)">
              Lê Hoàng Nam (Thu ngân Ca Tối - NV003)
            </option>
          </select>
        </div>

        <div className="handover-field">
          <label className="handover-label">Tiền để lại két ca sau (Float):</label>
          <input
            type="number"
            value={floatRetained === 0 ? '' : floatRetained}
            onChange={(e) => setFloatRetained(Math.max(0, Number(e.target.value) || 0))}
            className="handover-input font-mono tabular-nums"
            placeholder="1.500.000"
          />
        </div>

        <div className="handover-field">
          <label className="handover-label">
            Tiền mặt nộp lại cho Quản lý:
          </label>
          <input
            type="text"
            readOnly
            value={`${cashHandedOver.toLocaleString('vi-VN')} đ`}
            className="handover-input readonly font-mono tabular-nums font-bold text-teal-800"
          />
        </div>

        <div className="handover-field">
          <label className="handover-label">Ghi chú bàn giao ca:</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="handover-input"
            placeholder="Nhập ghi chú bàn giao..."
          />
        </div>
      </div>

      <div className="handover-actions">
        <button
          type="button"
          onClick={onOpenZReportModal}
          className="pos-btn-secondary-pill"
          title="In báo cáo chốt ca"
          style={{ height: '34px', fontSize: '12px' }}
        >
          <Printer size={14} />
          <span>In Báo Cáo Z-Report</span>
        </button>
        <button
          type="submit"
          className="pos-btn-danger-pill"
          title="Chốt số liệu và đóng ca hiện tại"
          style={{ height: '34px', fontSize: '12px' }}
        >
          <Lock size={14} />
          <span>ĐÓNG CA &amp; BÀN GIAO</span>
        </button>
      </div>
    </form>
  );
};
