import type { FC } from 'react';
import {
  Settings2,
  FileCheck2,
  Printer,
  Paperclip,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import type { GrnPostSettings } from '../../types/grn.types';

interface GrnPostSettingsCardProps {
  settings: GrnPostSettings;
  grandTotal: number;
  totalLabels: number;
  onSettingChange: (key: keyof GrnPostSettings, value: boolean) => void;
  readOnly?: boolean;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};

export const GrnPostSettingsCard: FC<GrnPostSettingsCardProps> = ({
  settings,
  grandTotal,
  totalLabels,
  onSettingChange,
  readOnly = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        <Settings2 size={18} color="#0f766e" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
          Cài đặt sau khi hoàn tất & Chứng từ ký duyệt (Post Settings & Attachments)
        </span>
      </div>

      {/* Checkbox Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* AP Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: readOnly ? 'default' : 'pointer',
            padding: '8px 12px',
            backgroundColor: settings.createApInvoice ? '#f0fdfa' : '#f8fafc',
            border: `1px solid ${settings.createApInvoice ? '#ccfbf1' : '#e2e8f0'}`,
            borderRadius: 6,
          }}
        >
          <input
            type="checkbox"
            checked={settings.createApInvoice}
            disabled={readOnly}
            onChange={(e) => onSettingChange('createApInvoice', e.target.checked)}
            style={{ width: 16, height: 16, cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
          />
          <FileCheck2 size={17} color="#0f766e" />
          <div style={{ fontSize: 13, color: '#1e293b' }}>
            <strong>Tự động tạo Phiếu chi / Ghi nhận Sổ nợ AP (Accounts Payable)</strong>{' '}
            <span style={{ color: '#0f766e', fontWeight: 700 }}>({formatCurrency(grandTotal)})</span>
          </div>
        </label>

        {/* Barcode Sticker Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: readOnly ? 'default' : 'pointer',
            padding: '8px 12px',
            backgroundColor: settings.printShelfLabels ? '#f0fdfa' : '#f8fafc',
            border: `1px solid ${settings.printShelfLabels ? '#ccfbf1' : '#e2e8f0'}`,
            borderRadius: 6,
          }}
        >
          <input
            type="checkbox"
            checked={settings.printShelfLabels}
            disabled={readOnly}
            onChange={(e) => onSettingChange('printShelfLabels', e.target.checked)}
            style={{ width: 16, height: 16, cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
          />
          <Printer size={17} color="#0f766e" />
          <div style={{ fontSize: 13, color: '#1e293b' }}>
            <strong>In tem giá / mã vạch dán kệ</strong>{' '}
            <span style={{ color: '#64748b' }}>
              (Tự động tạo <strong>{totalLabels} tem</strong> tương ứng {totalLabels} sản phẩm nhập kho)
            </span>
          </div>
        </label>

        {/* Attachment Item */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Paperclip size={16} color="#64748b" />
            <span style={{ fontWeight: 600, color: '#334155' }}>
              Đính kèm ảnh hóa đơn / biên bản giao hàng:
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                color: '#1d4ed8',
              }}
            >
              <Receipt size={13} />
              <span>{settings.attachmentName || 'Bill_TuoiSach_2609.jpg'}</span>
              <span style={{ color: '#94a3b8' }}>({settings.attachmentSize || '1.2 MB'})</span>
            </span>
          </div>

          <a
            href="#view-invoice"
            onClick={(e) => {
              e.preventDefault();
              alert(`Xem tệp đính kèm: ${settings.attachmentName || 'Bill_TuoiSach_2609.jpg'}`);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: '#0f766e',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 12,
            }}
          >
            <span>Xem tài liệu</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
