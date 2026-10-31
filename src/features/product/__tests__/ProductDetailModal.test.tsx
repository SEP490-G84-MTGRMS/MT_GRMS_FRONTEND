import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductDetailModal } from '../components/ProductDetailModal';
import type { ProductItem } from '../types';

const mockProduct: ProductItem = {
  id: 'prod-001',
  productCode: 'SP000008',
  barcode: '8930000001',
  productName: 'Bia Tiger Crystal',
  categoryId: 'cat-01',
  categoryName: 'Đồ uống',
  baseUnit: 'chai',
  sellingPrice: 20000,
  costPrice: 15000,
  onHand: 50,
  committed: 0,
  status: 'Active',
  createdAt: '23/07/2026',
  updatedAt: '23/07/2026',
  uomConversions: [
    {
      id: 'uom-01',
      unitName: 'thung',
      conversionRate: 24,
      price: 450000,
      barcode: '8930000009',
      productCode: 'SP000008-THUNG',
    },
  ],
};

describe('ProductDetailModal - Chức năng Switch Đơn vị tính (REQ-08)', () => {
  it('hiển thị mặc định theo đơn vị cơ bản khi mở modal', () => {
    render(
      <ProductDetailModal
        isOpen={true}
        product={mockProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="StoreOwner"
      />
    );

    // Giá bán mặc định của chai
    const prices = screen.getAllByText('20.000 đ');
    expect(prices.length).toBeGreaterThan(0);

    // Giá vốn mặc định của chai (StoreOwner)
    const costs = screen.getAllByText('15.000 đ');
    expect(costs.length).toBeGreaterThan(0);

    // Tồn kho: 50 chai
    const stocks = screen.getAllByText(/50 chai/i);
    expect(stocks.length).toBeGreaterThan(0);

    // Mã hàng & Mã vạch mặc định
    const codes = screen.getAllByText('SP000008');
    expect(codes.length).toBeGreaterThan(0);
    expect(screen.getByText('8930000001')).toBeDefined();
  });

  it('chuyển đổi sang đơn vị thùng khi click Pill trên Header và cập nhật toàn bộ thông số', () => {
    render(
      <ProductDetailModal
        isOpen={true}
        product={mockProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="StoreOwner"
      />
    );

    // Bấm pill chọn "thung (x24)"
    const thungPill = screen.getByRole('button', { name: /thung \(x24\)/i });
    fireEvent.click(thungPill);

    // Giá bán chuyển sang 450.000 đ
    const newPrices = screen.getAllByText('450.000 đ');
    expect(newPrices.length).toBeGreaterThan(0);

    // Giá vốn quy đổi: 15.000 * 24 = 360.000 đ
    const newCosts = screen.getAllByText('360.000 đ');
    expect(newCosts.length).toBeGreaterThan(0);

    // Tồn kho quy đổi: floor(50 / 24) = 2 thung (Dư 2 chai)
    const newStocks = screen.getAllByText(/2 thung/i);
    expect(newStocks.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/dư 2 chai/i).length).toBeGreaterThan(0);

    // Mã hàng và Mã vạch riêng của thùng
    expect(screen.getAllByText('SP000008-THUNG').length).toBeGreaterThan(0);
    expect(screen.getByText('8930000009')).toBeDefined();
  });

  it('chuyển đổi đơn vị tính khi click trực tiếp vào dòng trong Bảng Đơn vị tính', () => {
    render(
      <ProductDetailModal
        isOpen={true}
        product={mockProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="StoreOwner"
      />
    );

    // Tìm và click dòng quy đổi "thung" trong bảng ĐVT
    const thungCell = screen.getByRole('cell', { name: /thung/i });
    fireEvent.click(thungCell);

    // Xác nhận đã chuyển sang thùng
    expect(screen.getAllByText('450.000 đ').length).toBeGreaterThan(0);

    // Click lại dòng đơn vị cơ bản "chai" để phục hồi
    const chaiCell = screen.getByRole('cell', { name: /chai \(Đơn vị cơ bản\)/i });
    fireEvent.click(chaiCell);

    // Giá bán trở lại 20.000 đ
    expect(screen.getAllByText('20.000 đ').length).toBeGreaterThan(0);
  });

  it('tuân thủ phân quyền BR-SEC-01: Thu ngân (Cashier) bị ẩn hoàn toàn giá vốn khi chuyển đổi đơn vị', () => {
    render(
      <ProductDetailModal
        isOpen={true}
        product={mockProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="Cashier"
      />
    );

    // Ban đầu chữ "Giá vốn" không xuất hiện
    expect(screen.queryByText('Giá vốn')).toBeNull();
    expect(screen.queryByText('15.000 đ')).toBeNull();

    // Chuyển sang đơn vị thùng
    const thungPill = screen.getByRole('button', { name: /thung \(x24\)/i });
    fireEvent.click(thungPill);

    // Giá bán hiển thị đúng 450.000 đ
    expect(screen.getAllByText('450.000 đ').length).toBeGreaterThan(0);

    // Giá vốn và giá vốn quy đổi (360.000 đ) vẫn bị ẩn tuyệt đối
    expect(screen.queryByText('Giá vốn')).toBeNull();
    expect(screen.queryByText('360.000 đ')).toBeNull();
  });

  it('hiển thị mô tả thực tế và ghi chú nội bộ từ data sản phẩm (không dùng text mock tĩnh)', () => {
    const customProduct: ProductItem = {
      ...mockProduct,
      description: 'Mô tả thực tế hàng hóa chính hãng cao cấp',
      internalNote: 'Ghi chú nội bộ chỉ quản lý xem',
    };

    render(
      <ProductDetailModal
        isOpen={true}
        product={customProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="StoreOwner"
      />
    );

    // Chuyển sang tab Mô tả, ghi chú
    const notesTabBtn = screen.getByRole('button', { name: /Mô tả, ghi chú/i });
    fireEvent.click(notesTabBtn);

    expect(screen.getByText('Mô tả thực tế hàng hóa chính hãng cao cấp')).toBeDefined();
    expect(screen.getByText('Ghi chú nội bộ chỉ quản lý xem')).toBeDefined();
  });

  it('hỗ trợ hiển thị nhiều ảnh và mở modal phóng to ảnh (Lightbox)', () => {
    const multiImageProduct: ProductItem = {
      ...mockProduct,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      imageUrls: [
        'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      ],
    };

    render(
      <ProductDetailModal
        isOpen={true}
        product={multiImageProduct}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleStatus={vi.fn()}
        onDuplicate={vi.fn()}
        userRole="StoreOwner"
      />
    );

    // Đếm số ảnh hiển thị và nút thumbnail
    expect(screen.getByText(/\(2 ảnh/i)).toBeDefined();

    // Click thumbnail ảnh thứ 2
    const thumb2 = screen.getByTitle('Xem ảnh 2');
    fireEvent.click(thumb2);

    // Click vào ảnh chính để mở Lightbox
    const mainImgContainer = screen.getByTitle('Nhấn để phóng to ảnh');
    fireEvent.click(mainImgContainer);

    // Modal phóng to ảnh xuất hiện
    expect(screen.getByAltText('Phóng to ảnh hàng hóa')).toBeDefined();

    // Đóng modal phóng to ảnh
    const closeLightboxBtn = screen.getByTitle('Đóng xem ảnh');
    fireEvent.click(closeLightboxBtn);
    expect(screen.queryByAltText('Phóng to ảnh hàng hóa')).toBeNull();
  });
});
