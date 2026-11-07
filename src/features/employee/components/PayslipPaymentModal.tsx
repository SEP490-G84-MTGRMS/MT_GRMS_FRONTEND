import React, { useState } from 'react';
import { Copy, Check, CreditCard, Banknote } from 'lucide-react';
import type { PayslipDetailedRecord } from '../types';

interface PayslipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayslipDetailedRecord | null;
  onConfirmPayment: (payslipId: string, paymentMethod: 'VIETQR' | 'CASH', notes?: string) => void;
}

// Chuyển đổi số tiền thành chữ tiếng Việt chuẩn
function numberToVietnameseWords(n: number): string {
  if (n === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group: number): string {
    const hundred = Math.floor(group / 100);
    const ten = Math.floor((group % 100) / 10);
    const unit = group % 10;
    let res = '';

    if (hundred > 0 || group >= 100) {
      res += digits[hundred] + ' trăm ';
    }
    if (ten > 1) {
      res += digits[ten] + ' mươi ';
      if (unit === 1) res += 'mốt';
      else if (unit === 5) res += 'lăm';
      else if (unit > 0) res += digits[unit];
    } else if (ten === 1) {
      res += 'mười ';
      if (unit === 5) res += 'lăm';
      else if (unit > 0) res += digits[unit];
    } else {
      if (hundred > 0 && unit > 0) res += 'lẻ ';
      if (unit > 0) res += digits[unit];
    }
    return res.trim();
  }

  let num = Math.abs(Math.round(n));
  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let textResult = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal > 0) {
      const groupText = readGroup(groupVal);
      textResult += groupText + ' ' + units[i] + ' ';
    }
  }

  textResult = textResult.trim();
  if (!textResult) return 'Không đồng';
  return textResult.charAt(0).toUpperCase() + textResult.slice(1) + ' đồng';
}

export const PayslipPaymentModal: React.FC<PayslipPaymentModalProps> = ({
  isOpen,
  onClose,
  payslip,
  onConfirmPayment,
}) => {
  const [method, setMethod] = useState<'VIETQR' | 'CASH'>('VIETQR');
  const [notes, setNotes] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !payslip) return null;

  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0 đ';
    return `${Math.round(num).toLocaleString('vi-VN')} đ`;
  };

  const wordsAmount = numberToVietnameseWords(payslip.netSalary);

  const handleCopyAccount = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmPayment(payslip.id, method, notes);
    onClose();
  };

  return (
    <div className="emp-modal-overlay">
      <div className="emp-modal-card" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div
          className="emp-modal-header"
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Xác nhận thanh toán lương
              </h3>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                #{payslip.id}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
              Nhân viên: <strong style={{ color: '#1E293B' }}>{payslip.employeeName}</strong> ({payslip.employeeCode})
              <span style={{ margin: '0 8px', color: '#CBD5E1' }}>•</span>
              Kỳ lương: <strong style={{ color: '#1E293B' }}>{payslip.periodMonth}</strong>
            </div>
          </div>

          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body" style={{ padding: '20px 24px', background: '#FAFAFA' }}>
            {/* Khối tóm tắt số tiền chi trả */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Số tiền thực chi
                </div>
                <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>
                  Bằng chữ: {wordsAmount}
                </div>
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F766E' }}>
                {formatVND(payslip.netSalary)}
              </div>
            </div>

            {/* Chọn phương thức thanh toán */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '16px 18px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 12 }}>
                Phương thức thanh toán
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${method === 'VIETQR' ? '#0F766E' : '#E2E8F0'}`,
                    background: method === 'VIETQR' ? '#F0FDFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VIETQR"
                    checked={method === 'VIETQR'}
                    onChange={() => setMethod('VIETQR')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: method === 'VIETQR' ? '#0F766E' : '#334155' }}>
                    <CreditCard size={16} />
                    <span>Chuyển khoản / QR</span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${method === 'CASH' ? '#0F766E' : '#E2E8F0'}`,
                    background: method === 'CASH' ? '#F0FDFA' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={method === 'CASH'}
                    onChange={() => setMethod('CASH')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: method === 'CASH' ? '#0F766E' : '#334155' }}>
                    <Banknote size={16} />
                    <span>Tiền mặt</span>
                  </div>
                </label>
              </div>

              {/* Thông tin tài khoản Chuyển khoản / QR: CHỈ HIỂN THỊ ĐÚNG 3 DÒNG THEO YÊU CẦU */}
              {method === 'VIETQR' ? (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  {/* 1. Ngân hàng thụ hưởng */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Ngân hàng thụ hưởng:</span>
                    <strong style={{ color: '#0F172A' }}>
                      {payslip.bankName || 'Techcombank'}
                    </strong>
                  </div>

                  {/* 2. Số tài khoản (STK) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Số tài khoản (STK):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: '#0F766E', fontSize: 14, letterSpacing: '0.5px' }}>
                        {payslip.bankAccountNumber || 'Chưa cập nhật'}
                      </span>
                      {payslip.bankAccountNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(payslip.bankAccountNumber!)}
                          style={{
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: isCopied ? '#059669' : '#475569',
                          }}
                          title="Sao chép số tài khoản"
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Chủ tài khoản */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Chủ tài khoản:</span>
                    <strong style={{ color: '#0F172A', textTransform: 'uppercase' }}>
                      {payslip.bankAccountName || payslip.employeeName}
                    </strong>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 12,
                    color: '#475569',
                    lineHeight: 1.5,
                  }}
                >
                  Thanh toán trực tiếp bằng tiền mặt từ quỹ quầy chi nhánh <strong>{payslip.branchName || 'Chi nhánh'}</strong>. Hệ thống sẽ tự động hạch toán Phiếu chi tương ứng vào Sổ quỹ.
                </div>
              )}
            </div>

            {/* Ghi chú chi tiền */}
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Ghi chú thanh toán (Tùy chọn)
              </label>
              <input
                type="text"
                className="emp-form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder={`Ví dụ: Đã chi trả lương kỳ ${payslip.periodMonth}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="emp-modal-footer"
            style={{
              padding: '14px 24px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button type="button" className="emp-btn emp-btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="emp-btn emp-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={15} />
              <span>Xác nhận thanh toán</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
