import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import type { Product } from '../../types/pos.types';
import { httpClient } from '../../../../api/httpClient';
import { PosProductSearchInput } from '../PosProductSearchInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentBranchId: string;
  currentBranchName: string;
  products: Product[];
  onSelectBatchToCart?: (product: Product, batchId?: string, batchCode?: string, expiryDate?: string, discountPercent?: number) => void;
}
interface InventoryBatch {
  batchId: string;
  batchCode: string;
  mfgDate?: string | null;
  expiryDate?: string | null;
  daysLeft?: number | null;
  quantityOnHand: number;
  reservedQty: number;
  availableQty: number;
  status: string;
  fefoDiscountPercent?: number;
  isFefoDiscountActive?: boolean;
}

const formatQuantity = (value: number) => new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 3,
}).format(value);

const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('vi-VN')
  : 'Không giới hạn';

export const PosInventoryLookupModal: FC<Props> = ({
  isOpen, onClose, currentBranchId, currentBranchName, products, onSelectBatchToCart,
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchResult, setBatchResult] = useState<{ key: string; items: InventoryBatch[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedProductId('');
    }
  }, [isOpen]);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );
  const requestKey = `${currentBranchId}:${selectedProduct?.id || ''}`;
  const batches = batchResult?.key === requestKey ? batchResult.items : [];

  useEffect(() => {
    setBatchResult(null);
    setError('');
    if (!isOpen || !currentBranchId || !selectedProduct?.id) return;
    const controller = new AbortController();
    setLoading(true);
    httpClient.get(`/inventory/${selectedProduct.id}/batches`, {
      params: { branchId: currentBranchId }, signal: controller.signal,
    }).then(response => {
      if (controller.signal.aborted) return;
      const data = response.data?.data ?? response.data;
      if (!Array.isArray(data)) throw new Error('Dữ liệu lô hàng không hợp lệ.');
      setBatchResult({ key: requestKey, items: [...data].sort((a, b) => {
        const firstExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY;
        const secondExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY;
        return firstExpiry - secondExpiry;
      }) });
    }).catch(err => {
      if (!controller.signal.aborted) setError(err?.response?.data?.message || 'Không thể tải lô hàng của chi nhánh.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isOpen, currentBranchId, selectedProduct?.id, requestKey]);

  if (!isOpen) return null;
  return (
    <div className="pos-modal-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="pos-modal-dialog pos-inventory-dialog" role="dialog" aria-modal="true" aria-label="Tra cứu tồn kho và lô FEFO">
        <div className="pos-modal-header">
          <div><b>Tra Cứu Tồn Kho &amp; Lô Hạn Dùng FEFO</b><div>Chi nhánh: {currentBranchName}</div></div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div className="pos-modal-body">
          <div style={{ marginBottom: 14 }}>
            <PosProductSearchInput
              products={products}
              onSelectProduct={(product) => setSelectedProductId(product.id)}
              placeholder="Quét Barcode, SKU, tên sản phẩm..."
              ariaLabel="Tìm sản phẩm tại chi nhánh"
              resetTrigger={isOpen}
            />
          </div>
          {selectedProduct ? <>
            <p><b>{selectedProduct.name}</b> · Các lô thực tế tại <b>{currentBranchName}</b></p>
            <p>Mỗi dòng là tồn riêng của một lô, xếp theo hạn dùng tăng dần. Khi bán, hệ thống tự động phân bổ FEFO.</p>
            {loading ? <p role="status">Đang tải lô hàng…</p> : error ? <p role="alert" style={{ color: '#b91c1c' }}>{error}</p> :
              batches.length === 0 ? <p>Chưa có dữ liệu lô hàng tại chi nhánh này.</p> :
              <div style={{ overflowX: 'auto' }}>
                <table className="pos-shift-table" style={{ minWidth: 800 }} aria-label={`Danh sách ${batches.length} lô của ${selectedProduct.name}`}>
                  <thead><tr><th>Ưu tiên FEFO</th><th>Mã lô</th><th>Ngày sản xuất</th><th>Hạn sử dụng</th><th>Còn hạn</th><th>Giảm FEFO</th><th>Khả dụng</th><th>Thao tác</th></tr></thead>
                  <tbody>{batches.map((batch, index) => <tr key={batch.batchId}>
                    <td>#{index + 1}</td>
                    <td><b>{batch.batchCode}</b></td>
                    <td>{formatDate(batch.mfgDate)}</td>
                    <td>{formatDate(batch.expiryDate)}</td>
                    <td>{batch.daysLeft == null ? 'Không giới hạn' : batch.daysLeft < 0 ? 'Đã hết hạn' : batch.daysLeft === 0 ? 'Hết hạn hôm nay' : `${batch.daysLeft} ngày`}</td>
                    <td>{batch.isFefoDiscountActive ? `-${batch.fefoDiscountPercent || 0}%` : '—'}</td>
                    <td><b>{formatQuantity(batch.availableQty)} {selectedProduct.baseUnit}</b></td>
                    <td><button type="button" className="pos-btn-secondary"
                      disabled={batch.availableQty <= 0 || (batch.daysLeft != null && batch.daysLeft < 0)}
                      onClick={() => {
                        onSelectBatchToCart?.(selectedProduct, batch.batchId, batch.batchCode, batch.expiryDate || undefined,
                          batch.isFefoDiscountActive ? batch.fefoDiscountPercent || 0 : 0);
                        onClose();
                      }}>Chọn lô</button></td>
                  </tr>)}</tbody>
                </table>
              </div>}
          </> : <p style={{ color: '#64748b', fontSize: 13.5, margin: '8px 0 0' }}>Quét mã vạch, SKU hoặc nhập tên sản phẩm ở trên để tra cứu tồn kho theo lô FEFO tại <b>{currentBranchName}</b>.</p>}
        </div>
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary" onClick={onClose}>Đóng</button>
          {selectedProduct && onSelectBatchToCart && <button type="button" className="pos-btn-primary"
            disabled={loading || Boolean(error) || !batches.some(batch => batch.availableQty > 0 && (batch.daysLeft == null || batch.daysLeft > 0))}
            onClick={() => { onSelectBatchToCart(selectedProduct); onClose(); }}>Thêm vào đơn · tự động FEFO</button>}
        </div>
      </div>
    </div>
  );
};
