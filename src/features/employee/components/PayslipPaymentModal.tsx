import React, { useState } from 'react';
import { Check, Lightbulb, Banknote } from 'lucide-react';
import type { PayslipDetailedRecord } from '../types';

interface PayslipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: PayslipDetailedRecord | null;
  onConfirmPayment: (payslipId: string, paymentMethod: 'VIETQR' | 'CASH', notes?: string) => void;
}

// Chuyển đổi số tiền thành chữ tiếng Việt
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
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  const transferContent = `${payslip.id} LUONG ${payslip.periodMonth}`;
  const wordsAmount = numberToVietnameseWords(payslip.netSalary);

  const handleCopy = (text: string) => {
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
      <div className="emp-modal-card" style={{ maxWidth: 820 }}>
        {/* Header */}
        <div className="emp-modal-header">
          <div>
            <h3 style={{ margin: 0, color: '#0F766E' }}>Thanh toán Phiếu lương nhân viên</h3>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Xác nhận phương thức chi trả tiền lương và tự động ghi nhận bút toán chi quỹ.
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="emp-modal-body">
            {/* 1. Tóm tắt thông tin thanh toán */}
            <div className="emp-section-card" style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
              <div className="emp-section-title">1. Thông tin phiếu lương cần chi trả</div>
              <div className="emp-grid-3" style={{ fontSize: 13, marginBottom: 16 }}>
                <div>
                  <span style={{ color: '#64748B' }}>Mã phiếu lương:</span>
                  <div style={{ fontWeight: 700, color: '#0F766E' }}>{payslip.id}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Kỳ lương:</span>
                  <div style={{ fontWeight: 600 }}>{payslip.periodMonth}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Nhân viên thụ hưởng:</span>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>
                    {payslip.employeeName} ({payslip.employeeCode})
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Chi nhánh:</span>
                  <div style={{ fontWeight: 500 }}>{payslip.branchName || 'Chi nhánh trung tâm'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Công thực tế:</span>
                  <div style={{ fontWeight: 600 }}>{payslip.workedDays} công ({payslip.otHours || 0}h OT)</div>
                </div>
              </div>

              {/* Banner Số tiền */}
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1.5px dashed #059669',
                  borderRadius: 12,
                  padding: '14px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                    Số tiền thực nhận cần chi trả (NetSalary)
                  </div>
                  <div style={{ fontSize: 12, color: '#047857', fontStyle: 'italic', marginTop: 4 }}>
                    Bằng chữ: {wordsAmount}
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#047857' }}>
                  {formatVND(payslip.netSalary)}
                </div>
              </div>
            </div>

            {/* 2. Phương thức thanh toán */}
            <div className="emp-section-card">
              <div className="emp-section-title">2. Lựa chọn phương thức thanh toán</div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="VIETQR"
                    checked={method === 'VIETQR'}
                    onChange={() => setMethod('VIETQR')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Chuyển khoản nhanh VietQR / Ngân hàng (Khuyên dùng)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={method === 'CASH'}
                    onChange={() => setMethod('CASH')}
                    style={{ accentColor: '#0F766E' }}
                  />
                  <span>Tiền mặt tại quầy (CASH)</span>
                </label>
              </div>

              {/* Panel VietQR */}
              {method === 'VIETQR' && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '220px 1fr',
                    gap: 20,
                    padding: 16,
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    borderRadius: 12,
                  }}
                >
                  {/* Mã QR giả lập */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #0284C7',
                      borderRadius: 12,
                      padding: 12,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', marginBottom: 8 }}>
                      VIETQR &bull; NAPAS 247
                    </div>
                    {/* QR Code SVG / Box */}
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        padding: 8,
                      }}
                    >
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                        <rect x="14" y="14" width="3" height="3"></rect>
                        <rect x="18" y="18" width="3" height="3"></rect>
                      </svg>
                      <span style={{ fontSize: 10, marginTop: 4, letterSpacing: 1 }}>QUÉT MÃ TRẢ LƯƠNG</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0284C7', marginTop: 8 }}>
                      {formatVND(payslip.netSalary)}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{transferContent}</div>
                  </div>

                  {/* Thông tin tài khoản nhận */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Ngân hàng thụ hưởng:</span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        {payslip.bankName || 'Vietcombank (VCB)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Số tài khoản (STK):</span>
                      <span style={{ fontWeight: 800, color: '#0F766E', fontSize: 15 }}>
                        {payslip.bankAccountNumber || '01234567890'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Chủ tài khoản:</span>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        {payslip.bankAccountName || payslip.employeeName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                      <span style={{ color: '#64748B' }}>Nội dung chuyển khoản:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {transferContent}
                        </code>
                        <button
                          type="button"
                          className="emp-btn-subtle"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleCopy(transferContent)}
                        >
                          {isCopied ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Check size={12} />
                              <span>Đã chép</span>
                            </span>
                          ) : (
                            'Sao chép'
                          )}
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#0284C7', fontStyle: 'italic', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lightbulb size={14} />
                      <span>Tiền sẽ được chuyển thẳng vào tài khoản của nhân viên và tự động đánh dấu đã thanh toán.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel CASH */}
              {method === 'CASH' && (
                <div
                  style={{
                    padding: 16,
                    background: '#FEFCE8',
                    border: '1px solid #FEF08A',
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#854D0E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Banknote size={16} />
                    <span>Chi trả lương trực tiếp bằng tiền mặt tại quỹ quầy</span>
                  </div>
                  <div style={{ color: '#713F12', lineHeight: 1.5 }}>
                    Nhân viên ký nhận trực tiếp vào phiếu chi lương. Hệ thống sẽ tạo một bút toán chi vào Sổ quỹ tiền mặt
                    tại chi nhánh <b>{payslip.branchName || 'Chi nhánh trung tâm'}</b> với số tiền <b>{formatVND(payslip.netSalary)}</b>.
                  </div>
                </div>
              )}
            </div>

            {/* 3. Ghi chú thêm */}
            <div className="emp-section-card">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Ghi chú thanh toán / Chứng từ chi:
              </label>
              <input
                type="text"
                className="emp-input"
                placeholder="VD: Chi trả lương kỳ 10/2026 qua VietQR lúc 09:30"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="emp-modal-footer">
            <button type="button" className="emp-btn-subtle" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="emp-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} />
              <span>Xác nhận đã thanh toán ({formatVND(payslip.netSalary)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
