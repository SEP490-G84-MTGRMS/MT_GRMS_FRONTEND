import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Barcode,
  ShoppingCart,
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Store,
  Tag,
} from 'lucide-react';
import { mockProductsStockLookup } from '../mock/inventoryMockData';
import type {
  ProductStockLookupDTO,
  FefoBatchDTO,
} from '../types/inventory.types';
import '../pos.css';

export const InventoryLookupPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Route gốc quay lại POS
  const salesPath = location.pathname.startsWith('/employee/pos')
    ? '/employee/pos'
    : location.pathname.startsWith('/employee')
      ? '/employee/pos'
      : '/pos';

  // State tìm kiếm & Danh mục
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Sản phẩm đang được chọn xem chi tiết
  const [selectedProduct, setSelectedProduct] = useState<ProductStockLookupDTO>(
    mockProductsStockLookup[0]
  );

  // Danh sách Lô hàng của sản phẩm đang chọn
  const [currentBatches, setCurrentBatches] = useState<FefoBatchDTO[]>(
    mockProductsStockLookup[0].batches
  );

  // Modals state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [selectedBatchForClearance, setSelectedBatchForClearance] = useState<FefoBatchDTO | null>(null);

  // Form chuyển kho
  const [transferFromBranch, setTransferFromBranch] = useState('Tổng Kho Trung Tâm Mê Linh');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [transferNotes, setTransferNotes] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Lọc danh sách gợi ý sản phẩm
  const filteredProducts = useMemo(() => {
    return mockProductsStockLookup.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.categoryCode === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery.trim());
      return matchCat && matchQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Đổi sản phẩm được chọn
  const handleSelectProduct = (product: ProductStockLookupDTO) => {
    setSelectedProduct(product);
    setCurrentBatches(product.batches);
    showToast(`Đã chọn xem tồn kho & lô của ${product.name}`);
  };

  // Đưa vào giỏ hàng POS
  const handleAddToCartPOS = (product: ProductStockLookupDTO, batch?: FefoBatchDTO) => {
    try {
      const payload = {
        productId: product.productId,
        productName: product.name,
        barcode: product.barcode,
        batchId: batch ? batch.batchId : product.batches[0]?.batchId,
        unitPrice: product.prices[0]?.retailPrice || 10000,
        unitName: product.baseUnit,
        quantity: 1,
      };
      sessionStorage.setItem('pos_selected_product_batch', JSON.stringify(payload));
      showToast(`Đã chọn ${product.name} (Lô ${payload.batchId}) đưa vào quầy POS!`);
      setTimeout(() => {
        navigate(salesPath);
      }, 600);
    } catch {
      navigate(salesPath);
    }
  };

  // Mở modal xả hàng cho lô
  const handleOpenClearance = (batch: FefoBatchDTO) => {
    setSelectedBatchForClearance(batch);
    setIsClearanceModalOpen(true);
  };

  // Xác nhận xả hàng
  const handleConfirmClearance = () => {
    if (!selectedBatchForClearance) return;
    setCurrentBatches((prev) =>
      prev.map((b) =>
        b.batchId === selectedBatchForClearance.batchId
          ? { ...b, isClearanceDiscountApplied: true, clearanceDiscountPercent: 20 }
          : b
      )
    );
    setIsClearanceModalOpen(false);
    showToast(`Đã kích hoạt xả hàng -20% cho lô ${selectedBatchForClearance.batchId}!`);
  };

  // Gửi yêu cầu chuyển kho
  const handleSubmitTransfer = () => {
    setIsTransferModalOpen(false);
    showToast(`Đã lập yêu cầu chuyển ${transferQty} ${selectedProduct.baseUnit} từ ${transferFromBranch}!`);
    setTransferNotes('');
  };

  return (
    <div className="pos-shift-page-root flex flex-col h-full w-full min-h-0 overflow-hidden bg-[#F7FAFF]">
      {/* 1. UNIFIED SINGLE HEADER - ĐỒNG BỘ 100% VỚI SỔ QUỸ & CA THU NGÂN */}
      <header className="pos-shift-unified-header">
        {/* Khối trái: Nút quay lại bán hàng + Tên màn hình */}
        <div className="unified-header-left">
          <button
            type="button"
            className="pos-back-to-sales-btn"
            onClick={() => navigate(salesPath)}
            title="Quay lại quầy bán hàng POS"
          >
            <ArrowLeft size={15} />
            <span>Bán Hàng</span>
          </button>

          <div className="unified-header-divider" />

          <div className="unified-header-title-box">
            <h1 className="unified-header-title">Tra Cứu Tồn Kho &amp; Lô Hạn Dùng FEFO</h1>
            <div className="unified-header-subtitle">
              Chi nhánh trung tâm &bull; Xuất trước hết hạn trước &bull; Đồng bộ thời gian thực
            </div>
          </div>
        </div>


        {/* Khối phải: Thao tác & Thu ngân badge */}
        <div className="unified-header-right">
          <button
            type="button"
            className="pos-btn-secondary-pill"
            onClick={() => setIsTransferModalOpen(true)}
            title="Tạo phiếu yêu cầu điều chuyển kho nội bộ"
          >
            <ArrowRightLeft size={14} />
            <span>Yêu Cầu Chuyển Kho</span>
          </button>

          <button
            type="button"
            className="pos-btn-primary-pill"
            onClick={() => handleAddToCartPOS(selectedProduct)}
            title="Đưa sản phẩm đang chọn về giỏ hàng POS"
          >
            <ShoppingCart size={14} />
            <span>Bán Hàng [F1]</span>
          </button>

          <div className="pos-cashier-badge">
            NV: <b>Nguyễn Bá Sơn (NV004)</b>
          </div>
        </div>
      </header>

      {/* TOAST THÔNG BÁO TẠI QUẦY */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            right: 20,
            zIndex: 99999,
            backgroundColor: '#0f766e',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 9999,
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. BODY CONTAINER CUỘN CHÍNH - ĐỒNG BỘ LAYOUT SHIFT CONTENT */}
      <main className="pos-shift-body-container flex-1 min-h-0 overflow-y-auto">
        <div className="shift-content-layout">
          {/* THANH TRẠNG THÁI (INFO BAR CARD) CHUẨN POS */}
          <div className="shift-info-bar-card">
            <div className="info-bar-item">
              <span className="info-label">Điểm bán quầy:</span>
              <span className="info-value font-semibold">Chi nhánh trung tâm (Quầy #01)</span>
            </div>
            <div className="info-bar-item">
              <span className="info-label">Nguyên tắc xuất kho:</span>
              <span className="info-value text-teal-700 font-semibold">FEFO (Hạn gần xuất trước)</span>
            </div>
            <div className="info-bar-item">
              <span className="info-label">Tình trạng đồng bộ:</span>
              <span className="info-value font-semibold">Thời gian thực toàn hệ thống</span>
            </div>
          </div>

          {/* KHUNG TÌM KIẾM NHANH VỚI GỢI Ý AUTOCOMPLETE */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <h3 className="pos-shift-card-title">
                <Search size={16} className="text-teal-700" />
                <span>Tra cứu sản phẩm &amp; Quét mã Barcode</span>
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px auto', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="filter-select w-full"
                  style={{ paddingLeft: 34, height: 36 }}
                  placeholder="Nhập tên sản phẩm, mã SKU (SP652399), hoặc mã vạch barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="filter-select"
                style={{ height: 36 }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">Tất cả nhóm ngành hàng</option>
                <option value="MILK">Sữa &amp; Chế phẩm từ sữa</option>
                <option value="BREAD">Bánh kẹo &amp; Bánh tươi</option>
                <option value="DRINK">Nước giải khát &amp; Trà</option>
                <option value="FRESH">Thực phẩm tươi sống</option>
              </select>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="pos-btn-secondary-pill"
                  onClick={() => {
                    handleSelectProduct(mockProductsStockLookup[0]);
                    showToast(`Quét Barcode 8934567890123: Khớp sản phẩm ${mockProductsStockLookup[0].name}`);
                  }}
                  title="Mô phỏng quét mã vạch bằng máy quét"
                >
                  <Barcode size={14} />
                  <span>Quét Barcode</span>
                </button>
              </div>
            </div>

            {/* DANH SÁCH GỢI Ý TRA CỨU NHANH - CĂN CỘT BẢNG CỐ ĐỊNH CHỐNG THÒ THỤT */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Danh sách gợi ý tra cứu nhanh (Click để chọn xem tồn kho &amp; các lô tương ứng):
              </div>
              <div className="pos-autocomplete-box">
                <table className="pos-autocomplete-table">
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr className="pos-autocomplete-header-tr">
                      <th style={{ textAlign: 'left', padding: '8px 14px' }}>Sản phẩm &amp; Mã vạch</th>
                      <th style={{ textAlign: 'center', padding: '8px 14px' }}>Đơn giá niêm yết</th>
                      <th style={{ textAlign: 'center', padding: '8px 14px' }}>Tồn quầy hiện tại</th>
                      <th style={{ textAlign: 'center', padding: '8px 14px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const isSelected = selectedProduct.productId === p.productId;
                      const avail = p.branchStocks[0]?.availableStock || 0;
                      return (
                        <tr
                          key={p.productId}
                          className={`pos-autocomplete-row ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelectProduct(p)}
                        >
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12.5 }}>
                              {p.sku} - {p.name}
                            </div>
                            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                              Barcode: {p.barcode} &bull; Quy cách: {p.baseUnit}
                            </div>
                          </td>

                          <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                            <span style={{ fontWeight: 700, color: '#15803d', fontSize: 13 }}>
                              {p.prices[0]?.retailPrice.toLocaleString('vi-VN')} đ
                            </span>
                            <span style={{ color: '#64748b', fontSize: 11 }}> / {p.baseUnit}</span>
                          </td>

                          <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <span
                                className={`shift-status-badge ${avail > 15 ? 'on-duty' : ''}`}
                                style={{
                                  minWidth: 130,
                                  justifyContent: 'center',
                                  ...(avail <= 15
                                    ? { backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }
                                    : {}),
                                }}
                              >
                                Tồn quầy: {avail} {p.baseUnit}
                              </span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center', padding: '8px 14px' }}>
                            <button
                              type="button"
                              className={isSelected ? 'pos-btn-primary-pill' : 'pos-btn-secondary-pill'}
                              style={{ height: 28, padding: '0 12px', fontSize: 11, minWidth: 80 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectProduct(p);
                              }}
                            >
                              {isSelected ? 'Đang chọn' : 'Chọn xem'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CARD TÓM TẮT SẢN PHẨM ĐANG CHỌN */}
          <div
            className="pos-shift-card"
            style={{
              borderColor: '#99f6e4',
              backgroundColor: '#f0fdfa',
              borderLeft: '4px solid #0f766e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f766e' }}>
                    {selectedProduct.sku} - {selectedProduct.name}
                  </span>
                  <span className="shift-status-badge on-duty">
                    Tổng hệ thống: {selectedProduct.totalSystemStock.toLocaleString('vi-VN')} {selectedProduct.baseUnit}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 20, marginTop: 6, fontSize: 12, color: '#475569' }}>
                  <div>Mã Barcode: <b style={{ color: '#0f172a' }}>{selectedProduct.barcode}</b></div>
                  <div>Đơn vị tính: <b style={{ color: '#0f172a' }}>{selectedProduct.baseUnit}</b></div>
                  <div>Ngành hàng: <b style={{ color: '#0f172a' }}>{selectedProduct.categoryName}</b></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* GIÁ THEO ĐVT */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {selectedProduct.prices.map((pr) => (
                    <div key={pr.unitId} className="pos-pricing-tier-pill">
                      <span style={{ color: '#64748b' }}>Giá {pr.unitName}</span>
                      <b>{pr.retailPrice.toLocaleString('vi-VN')} đ</b>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="pos-btn-primary-pill"
                  style={{ height: 38, padding: '0 18px', fontSize: 13 }}
                  onClick={() => handleAddToCartPOS(selectedProduct)}
                >
                  <ShoppingCart size={15} />
                  <span>Đưa Vào Giỏ Hàng POS</span>
                </button>
              </div>
            </div>
          </div>

          {/* BẢNG 1: TỒN KHO THỜI GIAN THỰC THEO TỪNG CHI NHÁNH */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <div>
                <h3 className="pos-shift-card-title">
                  <Store size={16} className="text-teal-700" />
                  <span>1. Tồn Kho Thời Gian Thực Theo Từng Chi Nhánh</span>
                </h3>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Dữ liệu phân bổ tồn kho đa điểm bán, cập nhật tự động khi chốt hóa đơn hoặc kiểm kê két.
                </div>
              </div>
            </div>

            <div className="pos-shift-table-responsive">
              <table className="pos-shift-table">
                <thead>
                  <tr>
                    <th>Tên Chi Nhánh / Kho Hàng</th>
                    <th>Địa chỉ kho</th>
                    <th style={{ textAlign: 'right' }}>Tồn kho vật lý</th>
                    <th style={{ textAlign: 'right' }}>Đang giữ đơn</th>
                    <th style={{ textAlign: 'right' }}>Khả dụng bán</th>
                    <th style={{ textAlign: 'center' }}>Định mức min</th>
                    <th style={{ textAlign: 'center' }}>Tình trạng</th>
                    <th style={{ textAlign: 'center' }}>Hành động nghiệp vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.branchStocks.map((b) => (
                    <tr
                      key={b.branchId}
                      style={b.isCurrentBranch ? { backgroundColor: '#f0fdfa' } : undefined}
                    >
                      <td>
                        <b style={{ color: '#0f172a' }}>{b.branchName}</b>
                        {b.isCurrentBranch && (
                          <div style={{ color: '#0f766e', fontSize: 11, fontWeight: 600 }}>
                            Quầy thu ngân đang thao tác
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#64748b' }}>{b.address}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {b.physicalStock} {b.unitName}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {b.onHoldStock} {b.unitName}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: b.availableStock < b.minSafetyThreshold ? '#dc2626' : '#0f766e',
                        }}
                      >
                        {b.availableStock} {b.unitName}
                      </td>
                      <td style={{ textAlign: 'center' }}>{b.minSafetyThreshold} {b.unitName}</td>
                      <td style={{ textAlign: 'center' }}>
                        {b.status === 'low' ? (
                          <span className="shift-status-badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            <AlertTriangle size={12} /> Dưới định mức
                          </span>
                        ) : b.status === 'abundant' ? (
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Kho dồi dào
                          </span>
                        ) : (
                          <span className="shift-status-badge on-duty">
                            <CheckCircle2 size={12} /> Đủ tồn kho bán
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {b.isCurrentBranch ? (
                          <span style={{ color: '#0f766e', fontWeight: 600, fontSize: 12 }}>
                            Đang phục vụ tại quầy
                          </span>
                        ) : b.status === 'low' ? (
                          <button
                            type="button"
                            className="pos-btn-secondary-pill"
                            style={{ height: 28, fontSize: 11, color: '#94a3b8' }}
                            onClick={() => showToast('Chi nhánh đang dưới định mức, không thể trích xuất chuyển!')}
                          >
                            Hạn Chế Chuyển
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pos-btn-secondary-pill"
                            style={{ height: 28, fontSize: 11, borderColor: '#0f766e', color: '#0f766e' }}
                            onClick={() => {
                              setTransferFromBranch(b.branchName);
                              setIsTransferModalOpen(true);
                            }}
                          >
                            Yêu Cầu Chuyển Kho
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BẢNG 2: CHI TIẾT CÁC LÔ HÀNG THEO NGUYÊN TẮC FEFO */}
          <div className="pos-shift-card">
            <div className="pos-shift-card-header">
              <div>
                <h3 className="pos-shift-card-title">
                  <Calendar size={16} className="text-teal-700" />
                  <span>2. Quản Lý Lô &amp; Hạn Sử Dụng FEFO</span>
                </h3>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Tự động sắp xếp: Lô có hạn dùng gần nhất được ưu tiên xuất bán trước để tránh hao hụt hủy date.
                </div>
              </div>

              {/* HUY HIỆU QUY ƯỚC CẢNH BÁO */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="fefo-badge-urgent">&lt; 7 ngày: Khẩn cấp</span>
                <span className="fefo-badge-near">7 - 14 ngày: Cận date cao</span>
                <span className="fefo-badge-clearance">15 - 30 ngày: Ưu tiên xả</span>
                <span className="fefo-badge-safe">&gt; 30 ngày: An toàn</span>
              </div>
            </div>

            <div className="pos-shift-table-responsive">
              <table className="pos-shift-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: 90 }}>Ưu tiên</th>
                    <th>Mã Lô (Batch ID)</th>
                    <th style={{ textAlign: 'center' }}>Ngày Sản Xuất</th>
                    <th style={{ textAlign: 'center' }}>Hạn Dùng </th>
                    <th style={{ textAlign: 'center' }}>Thời gian còn lại</th>
                    <th style={{ textAlign: 'center' }}>Phân loại cảnh báo date</th>
                    <th style={{ textAlign: 'right' }}>Tồn khả dụng</th>
                    <th style={{ textAlign: 'center', width: 260 }}>Thao tác quầy thu ngân</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBatches.map((batch) => {
                    const isUrgent = batch.expiryRiskLevel === 'urgent';
                    const isNear = batch.expiryRiskLevel === 'near_expiry';
                    const isClearance = batch.expiryRiskLevel === 'clearance_priority';

                    return (
                      <tr
                        key={batch.batchId}
                        style={isUrgent || isNear ? { backgroundColor: '#fff7ed' } : undefined}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`fefo-rank-tag ${batch.fefoPriorityRank === 1
                              ? 'rank-1'
                              : batch.fefoPriorityRank === 2
                                ? 'rank-2'
                                : 'rank-3'
                              }`}
                          >
                            [ #{batch.fefoPriorityRank} ]
                          </span>
                        </td>
                        <td>
                          <b>{batch.batchId}</b>
                          <div style={{ color: '#64748b', fontSize: 11 }}>
                            NCC: {batch.supplierName}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                          {batch.mfgDate}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          <span
                            style={{
                              color: isUrgent ? '#dc2626' : isNear ? '#ea580c' : isClearance ? '#b45309' : '#15803d',
                            }}
                          >
                            {batch.expDate}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                              color: isUrgent ? '#dc2626' : isNear ? '#ea580c' : isClearance ? '#b45309' : '#15803d',
                            }}
                          >
                            <Clock size={12} />
                            Còn {batch.daysRemaining} ngày
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isUrgent ? (
                            <span className="fefo-badge-urgent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Khẩn cấp (&lt; 7 ngày)
                            </span>
                          ) : isNear ? (
                            <span className="fefo-badge-near" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={12} /> Cận Date cao
                            </span>
                          ) : isClearance ? (
                            <span className="fefo-badge-clearance">Ưu tiên xả hàng</span>
                          ) : (
                            <span className="fefo-badge-safe" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={12} /> Hạn dùng an toàn
                            </span>
                          )}
                          {batch.isClearanceDiscountApplied && (
                            <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Tag size={11} /> Đã gắn giảm -{batch.clearanceDiscountPercent}%
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {batch.availableQty} {batch.unitName}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="pos-btn-primary-pill"
                              style={{ height: 28, padding: '0 12px', fontSize: 11.5 }}
                              onClick={() => handleAddToCartPOS(selectedProduct, batch)}
                            >
                              <ShoppingCart size={13} />
                              <span>Chọn Lô Bán POS</span>
                            </button>

                            {(isUrgent || isNear || isClearance) && (
                              <button
                                type="button"
                                className="pos-btn-secondary-pill"
                                style={{ height: 28, padding: '0 10px', fontSize: 11, color: '#b45309', borderColor: '#fde68a' }}
                                onClick={() => handleOpenClearance(batch)}
                              >
                                <Tag size={12} />
                                <span>Xả Hàng -20%</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: YÊU CẦU ĐIỀU CHUYỂN KHO NỘI BỘ - CHUẨN POS MODAL */}
      {isTransferModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-teal-700" />
                <h2 className="pos-modal-title">Yêu Cầu Chuyển Kho Nội Bộ</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setIsTransferModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Sản phẩm điều chuyển:</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  value={`${selectedProduct.sku} - ${selectedProduct.name}`}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chi nhánh xuất hàng (Nguồn):</label>
                <select
                  className="filter-select w-full"
                  value={transferFromBranch}
                  onChange={(e) => setTransferFromBranch(e.target.value)}
                >
                  <option value="Tổng Kho Trung Tâm Mê Linh">Tổng Kho Trung Tâm Mê Linh (Tồn: 1.300)</option>
                  <option value="Chi Nhánh Hà Đông">Chi Nhánh Hà Đông (Tồn: 85)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Chi nhánh nhận (Đích):</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  value="Chi Nhánh Trung Tâm (18 Tràng Tiền)"
                  readOnly
                  style={{ backgroundColor: '#f8fafc' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số lượng yêu cầu ({selectedProduct.baseUnit}):</label>
                <input
                  type="number"
                  className="filter-select w-full font-mono font-bold"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ghi chú điều chuyển:</label>
                <input
                  type="text"
                  className="filter-select w-full"
                  placeholder="Ví dụ: Bổ sung quầy bán trước ca chiều..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setIsTransferModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                onClick={handleSubmitTransfer}
              >
                Gửi Yêu Cầu Chuyển Kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: XÁC NHẬN XẢ HÀNG CẬN DATE - CHUẨN POS MODAL */}
      {isClearanceModalOpen && selectedBatchForClearance && (
        <div className="pos-modal-overlay" onClick={() => setIsClearanceModalOpen(false)}>
          <div
            className="pos-modal-dialog"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-amber-600" />
                <h2 className="pos-modal-title">Xác Nhận Thiết Lập Xả Hàng Cận Date</h2>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setIsClearanceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body flex flex-col gap-3">
              <p className="text-xs text-slate-600 m-0">
                Bạn đang chuẩn bị kích hoạt chính sách xả hàng cho lô cận date:
              </p>
              <div
                style={{
                  backgroundColor: '#fefce8',
                  border: '1px solid #fde047',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                }}
              >
                <div>Mã Lô: <b>{selectedBatchForClearance.batchId}</b></div>
                <div>Hạn sử dụng: <b>{selectedBatchForClearance.expDate}</b> (Còn {selectedBatchForClearance.daysRemaining} ngày)</div>
                <div>Số lượng khả dụng áp dụng: <b>{selectedBatchForClearance.availableQty} {selectedBatchForClearance.unitName}</b></div>
                <div style={{ marginTop: 4, color: '#b45309', fontWeight: 700 }}>
                  Mức chiết khấu đề xuất: -20% khi quét bán tại quầy POS
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn-secondary-pill"
                onClick={() => setIsClearanceModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="pos-btn-primary-pill"
                style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
                onClick={handleConfirmClearance}
              >
                Xác Nhận Xả Hàng -20%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
