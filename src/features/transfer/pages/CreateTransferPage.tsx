import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Upload,
  Trash2,
  AlertTriangle,
  User,
  Check,
  Save,
} from 'lucide-react';
import type { TransferItem, BatchItem } from '../types';
import { INITIAL_BRANCHES, AVAILABLE_TRANSFER_PRODUCTS } from '../services/mockData';
import { SelectBatchModal } from '../components/SelectBatchModal';
import { ImportTransferExcelModal } from '../components/ImportTransferExcelModal';
import { AdminToast, type ToastState } from '../../admin/components';
import '../transfer.css';

export const CreateTransferPage: React.FC = () => {
  const navigate = useNavigate();

  // Branch Selection
  const [fromBranchId, setFromBranchId] = useState('1'); // Kho chính (Trung tâm)
  const [toBranchId, setToBranchId] = useState('2'); // Chi nhánh HCM
  const [transferCode] = useState(''); // Tự động
  const [note, setNote] = useState('');

  // Items in current transfer order
  const [items, setItems] = useState<TransferItem[]>([
    {
      ...AVAILABLE_TRANSFER_PRODUCTS[0],
      productCode: 'SP652379',
      productName: 'Bình hoa decor',
      unitName: 'Cái',
      onHandSender: 23,
      onHandReceiver: 0,
      sentQty: 5,
      unitPrice: 200000,
      amount: 1000000,
    },
    {
      ...AVAILABLE_TRANSFER_PRODUCTS[2],
      productCode: 'SP000093',
      productName: 'Sữa tươi tiệt trùng',
      unitName: 'Thùng',
      onHandSender: 10,
      onHandReceiver: 0,
      sentQty: 10,
      unitPrice: 200000,
      amount: 2000000,
      hasBatchManagement: true,
      batchNumber: 'SX010925',
      expiryDate: '02/03/2026',
    },
  ]);

  // Product Search to add
  const [searchKw, setSearchKw] = useState('');
  const [batchModalItem, setBatchModalItem] = useState<TransferItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter available products to add
  const searchResults = AVAILABLE_TRANSFER_PRODUCTS.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchKw.trim().toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchKw.trim().toLowerCase())
  );

  const handleAddItem = (prod: TransferItem) => {
    if (items.some((it) => it.productId === prod.productId)) {
      showToast(`Sản phẩm "${prod.productName}" đã có trong danh sách!`, 'warning');
      return;
    }
    const newItem: TransferItem = {
      ...prod,
      sentQty: 1,
      amount: prod.unitPrice,
    };
    setItems([...items, newItem]);
    setSearchKw('');
    showToast(`Đã thêm "${prod.productName}" vào phiếu chuyển.`);
  };

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setItems(
      items.map((it) =>
        it.id === id ? { ...it, sentQty: qty, amount: qty * it.unitPrice } : it
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleSelectBatch = (batch: BatchItem, qty: number) => {
    if (!batchModalItem) return;
    setItems(
      items.map((it) =>
        it.id === batchModalItem.id
          ? {
              ...it,
              batchNumber: batch.batchNumber,
              expiryDate: batch.expiryDate,
              sentQty: qty,
              amount: qty * it.unitPrice,
            }
          : it
      )
    );
    showToast(`Đã chọn lô ${batch.batchNumber} (HSD: ${batch.expiryDate}) cho ${batchModalItem.productName}.`);
  };

  const totalQty = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  const handleSubmit = (status: 'Draft' | 'In-Transit') => {
    if (items.length === 0) {
      showToast('Vui lòng thêm ít nhất một mặt hàng để tạo phiếu chuyển!', 'warning');
      return;
    }
    if (fromBranchId === toBranchId) {
      showToast('Chi nhánh gửi và chi nhánh nhận không được trùng nhau!', 'warning');
      return;
    }

    const actionText = status === 'Draft' ? 'Lưu tạm' : 'Hoàn thành và xuất chuyển';
    showToast(`Đã ${actionText} phiếu chuyển hàng thành công!`);

    setTimeout(() => {
      navigate('/store-owner/transfers');
    }, 1200);
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Top Header Row (Khớp Ảnh 2: Create Transfer) */}
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
        {/* Trái: Link quay lại + Ô tìm kiếm hàng hóa + Nút thêm từ Excel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 750 }}>
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

          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 36, borderRadius: 9999 }}
              placeholder="🔍 Tìm hàng hóa theo mã hoặc tên (F3)..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />

            {/* Dropdown gợi ý sản phẩm */}
            {searchKw.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: '#ffffff',
                  borderRadius: 14,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  zIndex: 30,
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p.productId}
                    onClick={() => handleAddItem(p)}
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdfa')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                        [{p.productCode}] {p.productName}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        Tồn gửi: <b>{p.onHandSender}</b> {p.unitName} &bull; Tồn nhận: <b>{p.onHandReceiver}</b>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>
                      {p.unitPrice.toLocaleString()} đ
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Không tìm thấy sản phẩm phù hợp.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thêm từ Excel */}
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => setIsImportModalOpen(true)}
            style={{ padding: '6px 14px', borderRadius: 9999, whiteSpace: 'nowrap' }}
          >
            <Upload size={14} style={{ color: '#0284c7' }} /> Thêm từ Excel
          </button>
        </div>

        {/* Phải: Người tạo & Ngày giờ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#1e293b' }}>
            <User size={16} color="#0F766E" />
            <span>Admin</span>
          </div>
          <span>15/10/2025 11:37</span>
        </div>
      </div>

      {/* Main 2-column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* CỘT TRÁI: Bảng hàng hóa chuyển */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            border: '1px solid #edf2f9',
            boxShadow: '0 4px 16px rgba(15, 118, 110, 0.05)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <Trash2 size={14} style={{ opacity: 0.6 }} />
                  </th>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 110 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 60, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Tồn kho</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Tồn kho nhận</th>
                  <th style={{ width: 100, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Giá chuyển</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id}>
                    {/* Xóa */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          padding: 4,
                        }}
                        title="Xóa hàng khỏi phiếu"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>

                    {/* STT */}
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>

                    {/* Mã hàng link */}
                    <td>
                      <span className="transfer-link">{it.productCode}</span>
                    </td>

                    {/* Tên hàng + Ghi chú dòng + Lô */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                        ✏ Ghi chú...
                      </div>

                      {/* Thông tin Lô & Link chọn lô khác */}
                      {it.hasBatchManagement && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            {it.batchNumber} - {it.expiryDate} (SL: {it.sentQty}) &times;
                          </span>
                          <button
                            type="button"
                            onClick={() => setBatchModalItem(it)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0F766E',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            [+ Chọn lô khác]
                          </button>
                        </div>
                      )}
                    </td>

                    {/* ĐVT */}
                    <td style={{ textAlign: 'center' }}>{it.unitName}</td>

                    {/* Tồn kho gửi */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.onHandSender}</td>

                    {/* Tồn kho nhận */}
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{it.onHandReceiver}</td>

                    {/* Ô nhập SL chuyển */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        className="filter-input"
                        style={{ width: 60, textAlign: 'center', padding: '4px', borderRadius: 6 }}
                        value={it.sentQty}
                        onChange={(e) => handleUpdateQty(it.id, Number(e.target.value))}
                        min={1}
                      />
                    </td>

                    {/* Giá chuyển */}
                    <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()}</td>

                    {/* Thành tiền */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                      {it.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Dòng tổng cộng */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={7} style={{ textAlign: 'right', padding: 12 }}>
                    Tổng cộng:
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 15, color: '#0f172a' }}>
                    {totalQty}
                  </td>
                  <td />
                  <td style={{ textAlign: 'right', fontSize: 15, color: '#0F766E' }}>
                    {totalAmount.toLocaleString()} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Khung Hướng dẫn luân chuyển hàng hóa */}
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
              Hướng dẫn luân chuyển hàng hóa
            </div>
            <div>&bull; <b>Hàng thông thường:</b> Tìm theo tên hoặc mã và nhập số lượng cần chuyển.</div>
            <div>&bull; <b>Hàng có Lô - Hạn sử dụng:</b> Nhấn "Chọn lô" để mở hộp thoại phân bổ số lượng từ từng lô cụ thể.</div>
            <div>&bull; <b>File Excel:</b> Nhấn "Thêm từ Excel" để tải hàng loạt mã sản phẩm và số lượng từ file dữ liệu mẫu.</div>
          </div>
        </div>

        {/* CỘT PHẢI: Thông tin phiếu chuyển & Hành động */}
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
          {/* Kho chuyển đi */}
          <div className="filter-group-card" style={{ borderTop: 'none', paddingTop: 0 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Kho chuyển đi:
            </label>
            <select
              className="filter-select"
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
            >
              {INITIAL_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mã chuyển hàng */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Mã chuyển hàng:
            </label>
            <input
              type="text"
              className="filter-input"
              placeholder="Mã phiếu tự động"
              value={transferCode}
              readOnly
              style={{ backgroundColor: '#f8fafc' }}
            />
          </div>

          {/* Trạng thái */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Trạng thái:</span>
            <span style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>Phiếu tạm</span>
          </div>

          {/* Tổng số lượng */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Tổng số lượng:</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{totalQty}</span>
          </div>

          {/* Chuyển tới * */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Chuyển tới *:
            </label>
            <select
              className="filter-select"
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
            >
              {INITIAL_BRANCHES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú */}
          <div className="filter-group-card" style={{ paddingTop: 10 }}>
            <label className="filter-group-title" style={{ display: 'block', marginBottom: 6 }}>
              Ghi chú:
            </label>
            <textarea
              className="filter-input"
              style={{ width: '100%', minHeight: 80, borderRadius: 12, resize: 'vertical' }}
              placeholder="✏ Nhập ghi chú luân chuyển kho, lý do điều chuyển..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Cảnh báo khóa sổ */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              border: '1px solid #fee2e2',
              fontSize: 12,
              color: '#b91c1c',
              lineHeight: 1.5,
              display: 'flex',
              gap: 6,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>Lưu ý:</b> Hệ thống sẽ không cho phép tạo phiếu nếu ngày chuyển hàng nằm trong khoảng thời gian đã khóa sổ.
            </span>
          </div>

          {/* Hàng nút bấm Lưu tạm & Hoàn thành */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className="btn-secondary-white"
              onClick={() => handleSubmit('Draft')}
              style={{ justifyContent: 'center' }}
            >
              <Save size={15} /> Lưu tạm
            </button>

            <button
              type="button"
              className="btn-primary-teal"
              onClick={() => handleSubmit('In-Transit')}
              style={{ justifyContent: 'center' }}
            >
              <Check size={15} /> Hoàn thành
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chọn Lô */}
      {batchModalItem && (
        <SelectBatchModal
          isOpen={Boolean(batchModalItem)}
          productName={batchModalItem.productName}
          batches={batchModalItem.batches || []}
          selectedBatchNumber={batchModalItem.batchNumber}
          onClose={() => setBatchModalItem(null)}
          onSelectBatch={handleSelectBatch}
        />
      )}

      {/* Modal Import Excel */}
      <ImportTransferExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmUpload={(fileName) => {
          showToast(`Đã nạp thành công dữ liệu từ file Excel: ${fileName}`);
        }}
      />
    </div>
  );
};
