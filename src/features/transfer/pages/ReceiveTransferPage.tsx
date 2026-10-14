import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  User,
  Check,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { INITIAL_TRANSFERS } from '../services/mockData';
import type { TransferOrder, TransferItem } from '../types';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const ReceiveTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const foundTransfer = INITIAL_TRANSFERS.find((t) => t.id === id) || INITIAL_TRANSFERS[0];
  const [transfer, setTransfer] = useState<TransferOrder>(foundTransfer);
  const [items, setItems] = useState<TransferItem[]>([
    {
      id: 'ti-1',
      productId: 'prod-102',
      productCode: 'SP000063',
      productName: 'Bộ 3 bình gốm sứ - Gốm sứ',
      unitName: 'Chiếc',
      onHandSender: 10,
      onHandReceiver: 0,
      sentQty: 5,
      receivedQty: 5,
      unitPrice: 1600000,
      amount: 8000000,
    },
    {
      id: 'ti-2',
      productId: 'prod-101',
      productCode: 'SP652379',
      productName: 'Bình hoa decor',
      unitName: 'Cái',
      onHandSender: 18,
      onHandReceiver: 0,
      sentQty: 10,
      receivedQty: 9, // Lệch 1 theo đúng ảnh wireframe
      unitPrice: 200000,
      amount: 1800000,
    },
  ]);

  // Tab filter: 'all' | 'match' | 'mismatch' | 'unreceived'
  const [activeTab, setActiveTab] = useState<'all' | 'match' | 'mismatch' | 'unreceived'>('all');
  const [searchKw, setSearchKw] = useState('');
  const [receiveNote, setReceiveNote] = useState('Thiếu 1 bình hoa decor');
  const [receiveTime] = useState('15/10/2025 12:09');

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateReceivedQty = (itemId: string, qty: number) => {
    setItems(
      items.map((it) => {
        if (it.id === itemId) {
          const validQty = Math.max(0, Math.min(it.sentQty, qty));
          return {
            ...it,
            receivedQty: validQty,
            amount: validQty * it.unitPrice,
          };
        }
        return it;
      })
    );
  };

  // Filtered rows
  const filteredItems = items.filter((it) => {
    if (searchKw.trim()) {
      const kw = searchKw.trim().toLowerCase();
      const match = it.productCode.toLowerCase().includes(kw) || it.productName.toLowerCase().includes(kw);
      if (!match) return false;
    }

    const recv = it.receivedQty ?? it.sentQty;
    if (activeTab === 'match') return recv === it.sentQty;
    if (activeTab === 'mismatch') return recv < it.sentQty;
    if (activeTab === 'unreceived') return recv === 0;
    return true;
  });

  const totalSent = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalReceived = items.reduce((sum, it) => sum + (it.receivedQty ?? it.sentQty), 0);
  const totalDifference = totalSent - totalReceived;
  const totalAmountReceived = items.reduce(
    (sum, it) => sum + (it.receivedQty ?? it.sentQty) * it.unitPrice,
    0
  );

  const countMatch = items.filter((it) => (it.receivedQty ?? it.sentQty) === it.sentQty).length;
  const countMismatch = items.filter((it) => (it.receivedQty ?? it.sentQty) < it.sentQty).length;
  const countUnreceived = items.filter((it) => (it.receivedQty ?? it.sentQty) === 0).length;

  const handleConfirm = () => {
    if (totalDifference > 0 && !receiveNote.trim()) {
      showToast('Bắt buộc nhập lý do chênh lệch nhận hàng vào ô "Ghi chú nhận"!', 'warning');
      return;
    }

    const updated: TransferOrder = {
      ...transfer,
      status: 'Received',
      receiveDate: receiveTime,
      discrepancyNote: receiveNote.trim(),
      items,
    };

    setTransfer(updated);
    showToast(
      `Xác nhận nhận hàng thành công cho phiếu ${transfer.transferCode}! Tồn kho chi nhánh nhận đã được tự động cộng thêm.`
    );

    setTimeout(() => {
      navigate(`/store-owner/transfers/${transfer.id}`);
    }, 1200);
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Top Header Toolbar (Khớp Ảnh 3: Receive transfer) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '16px 24px',
          borderRadius: 24,
          border: '1px solid #edf2f9',
          boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Trái: Link quay lại + Ô tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 600 }}>
          <button
            type="button"
            onClick={() => navigate('/store-owner/transfers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#0F766E',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <ArrowLeft size={16} /> Chuyển hàng
          </button>

          {/* Ô tìm kiếm hàng hóa */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 36, borderRadius: 9999 }}
              placeholder="🔍 Tìm hàng hóa theo mã hoặc tên (F3)..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          </div>
        </div>

        {/* Phải: Người thực hiện & Ngày giờ nhận */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b' }}>
            <User size={16} color="#0F766E" />
            <span>Admin</span>
          </div>
          <span
            style={{
              padding: '4px 10px',
              backgroundColor: '#f1f5f9',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            {receiveTime}
          </span>
        </div>
      </div>

      {/* Main 2-column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* CỘT TRÁI: Bảng nhận hàng */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Tabs phân loại tình trạng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'all' ? 700 : 500,
                color: activeTab === 'all' ? '#0F766E' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'all' ? '2px solid #0F766E' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Tất cả ({items.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('match')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'match' ? 700 : 500,
                color: activeTab === 'match' ? '#16a34a' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'match' ? '2px solid #16a34a' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Khớp ({countMatch})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mismatch')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'mismatch' ? 700 : 500,
                color: activeTab === 'mismatch' ? '#ea580c' : '#ea580c',
                fontSize: 13.5,
                borderBottom: activeTab === 'mismatch' ? '2px solid #ea580c' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Lệch ({countMismatch})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unreceived')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === 'unreceived' ? 700 : 500,
                color: activeTab === 'unreceived' ? '#0F766E' : '#64748b',
                fontSize: 13.5,
                borderBottom: activeTab === 'unreceived' ? '2px solid #0F766E' : 'none',
                paddingBottom: 6,
                marginBottom: -10,
              }}
            >
              Chưa nhận ({countUnreceived})
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 110 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 60, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Tồn kho</th>
                  <th style={{ width: 80, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 100, textAlign: 'center', backgroundColor: '#e0f2fe' }}>SL nhận</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Giá chuyển</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => {
                  const recvQty = it.receivedQty ?? it.sentQty;
                  const diff = it.sentQty - recvQty;
                  const isDiff = diff > 0;

                  return (
                    <tr
                      key={it.id}
                      style={{
                        backgroundColor: isDiff ? '#fffbeb' : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td>
                        <span className="transfer-link">{it.productCode}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                          ✏ Ghi chú...
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.unitName}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{it.onHandReceiver}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.sentQty}</td>

                      {/* Ô nhập SL nhận kèm badge Lệch nếu có */}
                      <td style={{ textAlign: 'center', backgroundColor: isDiff ? '#fef3c7' : '#f0f9ff' }}>
                        <input
                          type="number"
                          className="filter-input"
                          style={{
                            width: 55,
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: 6,
                            borderColor: isDiff ? '#f59e0b' : '#cbd5e1',
                            fontWeight: 700,
                          }}
                          value={recvQty}
                          onChange={(e) => handleUpdateReceivedQty(it.id, Number(e.target.value))}
                          min={0}
                          max={it.sentQty}
                        />
                        {isDiff && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: '#b45309',
                              fontWeight: 700,
                              marginTop: 2,
                            }}
                          >
                            Lệch -{diff}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {(recvQty * it.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {/* Dòng tổng cộng */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: 12 }}>
                    Tổng:
                  </td>
                  <td style={{ textAlign: 'center' }}>{totalSent}</td>
                  <td style={{ textAlign: 'center', color: '#0F766E', fontSize: 14 }}>
                    {totalReceived}
                  </td>
                  <td />
                  <td style={{ textAlign: 'right', color: '#0F766E', fontSize: 14 }}>
                    {totalAmountReceived.toLocaleString()} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Khung Hướng dẫn xác nhận nhận hàng */}
          <div
            style={{
              padding: 16,
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              fontSize: 12.5,
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
              Hướng dẫn xác nhận nhận hàng
            </div>
            <div>&bull; <b>SL nhận:</b> Hệ thống mặc định điền đủ số lượng chuyển. Hãy kiểm đếm và sửa lại số lượng thực tế nhận được.</div>
            <div>&bull; <b>Trường hợp có chênh lệch:</b> Bắt buộc phải điền rõ lý do hư hỏng, thất lạc hoặc giao thiếu vào ô "Ghi chú nhận" bên cột phải.</div>
            <div>&bull; <b>Cập nhật kho tự động:</b> Sau khi nhấn "Nhận hàng", hệ thống sẽ tự động ghi tăng tồn kho tại chi nhánh nhận và kết thúc phiếu chuyển.</div>
          </div>
        </div>

        {/* CỘT PHẢI: Thông tin phiếu & Ghi chú nhận */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Mã chuyển hàng:</span>
            <span style={{ fontWeight: 700, color: '#0F766E' }}>{transfer.transferCode}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Trạng thái:</span>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>Đang chuyển</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Chi nhánh gửi:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{transfer.fromBranchName}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Ngày chuyển:</span>
            <span>{transfer.transferDate}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Ghi chú chuyển:</span>
            <span style={{ fontStyle: 'italic', color: '#64748b' }}>
              {transfer.note || '(Không có)'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Tổng SL chuyển:</span>
            <span style={{ fontWeight: 700 }}>{totalSent}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
            <span style={{ color: '#64748b' }}>Tổng SL nhận:</span>
            <span style={{ fontWeight: 700, color: totalDifference > 0 ? '#ea580c' : '#16a34a' }}>
              {totalReceived} {totalDifference > 0 && `(Lệch ${totalDifference})`}
            </span>
          </div>

          {/* Ghi chú nhận * */}
          <div style={{ paddingTop: 4 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Ghi chú nhận *:
            </label>
            <textarea
              className="filter-input"
              style={{
                width: '100%',
                minHeight: 70,
                borderRadius: 12,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="Nhập lý do chênh lệch nhận hàng..."
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
            />
          </div>

          {/* Cảnh báo thời gian nhận */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              border: '1px solid #fee2e2',
              fontSize: 11.5,
              color: '#b91c1c',
              lineHeight: 1.5,
              display: 'flex',
              gap: 6,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>Lưu ý:</b> Thời gian nhận hàng không được sớm hơn thời gian chuyển hàng ({transfer.transferDate}).
            </span>
          </div>

          {/* Nút bấm Lưu tạm & Nhận hàng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => showToast('Đã lưu tạm thông tin kiểm đếm nhận hàng.')}
              style={{ justifyContent: 'center' }}
            >
              <Save size={15} /> Lưu tạm
            </button>

            <button
              type="button"
              className="btn-primary-teal"
              onClick={handleConfirm}
              style={{ justifyContent: 'center' }}
            >
              <Check size={15} /> Nhận hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
