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
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          marginBottom: 16,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Settings2 size={16} color="#0d9488" />
        <h2
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#0f172a',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            margin: 0,
          }}
        >
          Cài đặt sau khi hoàn tất &amp; Chứng từ ký duyệt
        </h2>
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
            padding: '10px 14px',
            backgroundColor: settings.createApInvoice ? '#f0fdfa' : '#f8fafc',
            border: `1px solid ${settings.createApInvoice ? '#ccfbf1' : '#e2e8f0'}`,
            borderRadius: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={settings.createApInvoice}
            disabled={readOnly}
            onChange={(e) => onSettingChange('createApInvoice', e.target.checked)}
            style={{ width: 17, height: 17, cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
          />
          <FileCheck2 size={18} color="#0f766e" />
          <div style={{ fontSize: 13, color: '#1e293b' }}>
            <strong>Tự động tạo Phiếu chi / Ghi nhận Sổ nợ AP (Accounts Payable)</strong>{' '}
            <span
              style={{
                color: '#0f766e',
                fontWeight: 800,
                backgroundColor: '#ccfbf1',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #99f6e4',
                marginLeft: 4,
              }}
            >
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </label>

        {/* Barcode Sticker Option */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: readOnly ? 'default' : 'pointer',
            padding: '10px 14px',
            backgroundColor: settings.printShelfLabels ? '#f0fdfa' : '#f8fafc',
            border: `1px solid ${settings.printShelfLabels ? '#ccfbf1' : '#e2e8f0'}`,
            borderRadius: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={settings.printShelfLabels}
            disabled={readOnly}
            onChange={(e) => onSettingChange('printShelfLabels', e.target.checked)}
            style={{ width: 17, height: 17, cursor: readOnly ? 'default' : 'pointer', accentColor: '#0f766e' }}
          />
          <Printer size={18} color="#0f766e" />
          <div style={{ fontSize: 13, color: '#1e293b' }}>
            <strong>In tem giá / mã vạch dán kệ</strong>{' '}
            <span style={{ color: '#64748b', marginLeft: 4 }}>
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
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Paperclip size={16} color="#64748b" />
            <span style={{ fontWeight: 600, color: '#334155' }}>
              Đính kèm ảnh hóa đơn / biên bản giao nhận:
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 6,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                color: '#1d4ed8',
              }}
            >
              <Receipt size={14} />
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
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 12.5,
            }}
          >
            <span>Xem tài liệu</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};
