import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Upload,
  Trash2,
  AlertCircle,
  Clock,
  Send,
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
  const [fromBranchId] = useState('1'); // Chi nhánh trung tâm
  const [toBranchId, setToBranchId] = useState('2'); // Chi nhánh HCM
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');

  // Items in current transfer order
  const [items, setItems] = useState<TransferItem[]>([
    {
      ...AVAILABLE_TRANSFER_PRODUCTS[0],
      sentQty: 5,
      amount: 5 * AVAILABLE_TRANSFER_PRODUCTS[0].unitPrice,
    },
    {
      ...AVAILABLE_TRANSFER_PRODUCTS[2], // Sản phẩm có quản lý lô
      sentQty: 2,
      amount: 2 * AVAILABLE_TRANSFER_PRODUCTS[2].unitPrice,
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

  const fromBranch = INITIAL_BRANCHES.find((b) => b.id === fromBranchId);

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
    showToast(`Đã chọn lô ${batch.batchNumber} (HSD: ${batch.expiryDate}) cho sản phẩm.`);
  };

  const totalQty = items.reduce((sum, it) => sum + it.sentQty, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  // Validation
  const isSameBranch = fromBranchId === toBranchId;
  const hasInsufficientStock = items.some((it) => it.sentQty > it.onHandSender);

  const handleSubmit = (status: 'Draft' | 'In-Transit') => {
    if (isSameBranch) {
      showToast('Chi nhánh nhận không được trùng với chi nhánh gửi!', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Vui lòng thêm ít nhất một mặt hàng cần chuyển.', 'error');
      return;
    }
    if (status === 'In-Transit' && hasInsufficientStock) {
      showToast('Có mặt hàng vượt quá tồn kho khả dụng! Vui lòng kiểm tra lại.', 'error');
      return;
    }

    const nextCode = `TRF${Math.floor(100000 + Math.random() * 900000)}`;

    if (status === 'In-Transit') {
      showToast(
        `Đã xuất chuyển hàng ${nextCode} thành công! Đã trừ ${totalQty} sản phẩm khỏi kho gửi theo BR-TRF-01.`
      );
    } else {
      showToast(`Đã lưu tạm phiếu chuyển hàng ${nextCode} (Draft).`);
    }

    setTimeout(() => {
      navigate('/store-owner/transfers');
    }, 1200);
  };

  return (
    <div className="transfer-container">
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '16px 24px', borderRadius: 24, border: '1px solid #edf2f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => navigate('/store-owner/transfers')}
            style={{ padding: '6px 12px' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Tạo phiếu chuyển hàng
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload size={15} /> Thêm từ Excel
          </button>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Cột trái (72%): Bảng hàng hóa */}
        <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Ô tìm kiếm mặt hàng */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 36, fontSize: 14 }}
              placeholder="🔍 Tìm hàng hóa theo mã SKU, mã vạch hoặc tên để thêm vào phiếu..."
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />

            {/* Dropdown kết quả tìm kiếm */}
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
                  zIndex: 20,
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
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                        [{p.productCode}] {p.productName}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Tồn kho gửi: <b>{p.onHandSender}</b> {p.unitName} &bull; Tồn kho nhận: <b>{p.onHandReceiver}</b>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#0F766E' }}>
                      {p.unitPrice.toLocaleString()} đ
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Không tìm thấy hàng hóa phù hợp.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bảng hàng hóa */}
          <div style={{ overflowX: 'auto' }}>
            <table className="transfer-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                  <th style={{ width: 120 }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Tồn gửi</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Tồn nhận</th>
                  <th style={{ width: 100, textAlign: 'center' }}>SL chuyển</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Giá chuyển</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                  <th style={{ width: 40, textAlign: 'center' }} />
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const isExceeded = it.sentQty > it.onHandSender;

                  return (
                    <tr
                      key={it.id}
                      style={{
                        backgroundColor: isExceeded ? '#fef2f2' : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#0F766E' }}>{it.productCode}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                        {it.hasBatchManagement && (
                          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4 }}>
                              Lô: {it.batchNumber || 'Chưa chọn'} (HSD: {it.expiryDate || '—'})
                            </span>
                            <button
                              type="button"
                              onClick={() => setBatchModalItem(it)}
                              style={{ background: 'none', border: 'none', color: '#0F766E', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            >
                              [Đổi lô]
                            </button>
                          </div>
                        )}
                        {isExceeded && (
                          <div style={{ color: '#dc2626', fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <AlertCircle size={12} /> Vượt quá tồn kho khả dụng ({it.onHandSender})
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{it.unitName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.onHandSender}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{it.onHandReceiver}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className="filter-input"
                          style={{
                            width: 65,
                            textAlign: 'center',
                            borderColor: isExceeded ? '#ef4444' : undefined,
                            backgroundColor: isExceeded ? '#fee2e2' : undefined,
                          }}
                          value={it.sentQty}
                          onChange={(e) => handleUpdateQty(it.id, Number(e.target.value))}
                          min={1}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>{it.unitPrice.toLocaleString()} đ</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                        {it.amount.toLocaleString()} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="category-edit-btn"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleRemoveItem(it.id)}
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Chưa có sản phẩm nào. Hãy tìm kiếm ở trên để thêm vào phiếu chuyển hàng.
                    </td>
                  </tr>
                )}

                {/* Dòng tổng cộng */}
                {items.length > 0 && (
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={6} style={{ textAlign: 'right', padding: 12 }}>
                      Tổng số lượng:
                    </td>
                    <td style={{ textAlign: 'center', color: '#0F766E' }}>{totalQty}</td>
                    <td style={{ textAlign: 'right' }}>Tổng tiền:</td>
                    <td style={{ textAlign: 'right', color: '#0F766E' }}>
                      {totalAmount.toLocaleString()} đ
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải (28%): Thông tin điều chuyển */}
        <div style={{ background: '#ffffff', borderRadius: 24, border: '1px solid #edf2f9', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            Thông tin điều chuyển
          </h3>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Chuyển từ (Kho gửi)
            </label>
            <div style={{ padding: '9px 14px', background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
              {fromBranch?.name || 'Chi nhánh trung tâm'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Chuyển đến (Kho nhận) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="filter-select"
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              style={{
                borderColor: isSameBranch ? '#ef4444' : undefined,
                backgroundColor: isSameBranch ? '#fef2f2' : undefined,
              }}
            >
              {INITIAL_BRANCHES.map((b) => (
                <option key={b.id} value={b.id} disabled={b.id === fromBranchId}>
                  {b.name} {b.id === fromBranchId ? '(Trùng kho gửi)' : ''}
                </option>
              ))}
            </select>
            {isSameBranch && (
              <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>
                Chi nhánh nhận không được trùng với chi nhánh gửi!
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Ngày dự kiến giao
            </label>
            <input
              type="date"
              className="filter-input"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
              Ghi chú điều chuyển
            </label>
            <textarea
              className="filter-input"
              rows={3}
              placeholder="Thông tin xe hàng, lý do điều chuyển..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Nút hành động */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="btn-primary-teal"
              style={{ justifyContent: 'center', padding: '12px' }}
              disabled={isSameBranch || items.length === 0}
              onClick={() => handleSubmit('In-Transit')}
            >
              <Send size={16} /> Xuất chuyển hàng (In-Transit)
            </button>

            <button
              type="button"
              className="btn-secondary-white"
              style={{ justifyContent: 'center', padding: '10px' }}
              onClick={() => handleSubmit('Draft')}
            >
              <Clock size={16} /> Lưu tạm (Draft)
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chọn Lô Date FEFO */}
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
          showToast(`Đã nhập danh sách mặt hàng từ file ${fileName}`);
        }}
      />
    </div>
  );
};
