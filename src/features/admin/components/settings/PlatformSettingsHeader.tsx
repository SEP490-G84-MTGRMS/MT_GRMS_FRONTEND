import { Save, RotateCcw } from 'lucide-react';

interface PlatformSettingsHeaderProps {
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onReset: () => void;
  lastUpdated?: string | null;
  updatedBy?: string | null;
}

export const PlatformSettingsHeader = ({ isSaving, isDirty, onSave, onReset }: PlatformSettingsHeaderProps) => (
  <header className="plans-hero">
    <div>
      <p className="plans-eyebrow">CẤU HÌNH TOÀN CẦU</p>
      <h1>Thiết lập nền tảng</h1>
      <p>Thiết lập chính sách SaaS, tài khoản Master VietQR, liên hệ CSKH và bảo trì hệ thống.</p>
    </div>
    <div className="plans-toolbar-actions">
      <button type="button" className="admin-btn admin-btn-secondary" onClick={onReset} disabled={!isDirty || isSaving}>
        <RotateCcw size={15} /> Hoàn tác
      </button>
      <button type="button" className="admin-btn admin-btn-primary" onClick={onSave} disabled={!isDirty || isSaving}>
        <Save size={15} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  </header>
);
