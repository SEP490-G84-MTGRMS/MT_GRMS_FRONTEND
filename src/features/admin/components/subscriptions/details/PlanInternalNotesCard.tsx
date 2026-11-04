import React, { useState } from 'react';
import { FileText, Save } from 'lucide-react';

interface PlanInternalNotesCardProps {
  initialNote?: string;
  onSaveNote?: (note: string) => void;
}

export const PlanInternalNotesCard: React.FC<PlanInternalNotesCardProps> = ({
  initialNote = 'Gói dịch vụ chủ lực của nền tảng MT-GRMS dành cho chuỗi tạp hóa và siêu thị mini bán lẻ. Dự kiến điều chỉnh tăng dung lượng lưu trữ trong Quý 4.',
  onSaveNote,
}) => {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSaveNote) {
      onSaveNote(note);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '20px 22px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14.5,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <FileText size={17} color="var(--blue-primary)" />
        <span>C. Ghi chú Quản trị Nội bộ</span>
      </div>

      <div>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhập ghi chú hoặc quy định đặc thù về gói cước này..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontFamily: 'inherit',
            fontSize: 13,
            color: 'var(--text-main)',
            boxSizing: 'border-box',
            resize: 'vertical',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            style={{
              padding: '6px 14px',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={14} />
            <span>{saved ? 'Đã lưu ghi chú!' : 'Lưu ghi chú'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
