import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupplierGeneralProfileTab } from '../components/detail/SupplierGeneralProfileTab';
import { normalizeAccountHolderName } from '../components/detail/SupplierBankModal';
import { getVietQrUrl } from '../lib/vietQrHelper';
import type { SupplierSummary } from '../types/supplier.types';

// Sample test data per user prompt
const sampleSupplier: SupplierSummary = {
  id: 'sup-0002',
  code: 'SUP-20261101-0002',
  name: 'Nhà Cung Cấp Long Nhật',
  supplierType: 'Goods',
  category: 'FRESH',
  contactPerson: 'Minh Đức',
  phone: '0986312587',
  email: 'minhkun01ad@gmail.com',
  address: 'Vạn Hòa Nông Cống Thanh Hóa',
  note: '',
  taxCode: '',
  paymentTermDays: 30,
  creditLimit: 0,
  currentDebt: 0,
  overdueDebt: 0,
  rating: 5,
  status: 'Active',
  createdAt: '2026-11-01T00:00:00Z',
};

describe('Supplier General Profile Tab Refactor Tests (R1 - R5)', () => {
  it('R1: renders card title as "Thông tin chung" and NOT "Thông tin liên hệ"', () => {
    render(<SupplierGeneralProfileTab supplier={sampleSupplier} />);

    // R1 requirement: Card title reads exactly "Thông tin chung"
    const cardTitle = screen.getByTestId('general-info-card-title');
    expect(cardTitle.textContent).toContain('Thông tin chung');

    // "Thông tin liên hệ" must not exist anywhere in DOM
    const oldText = screen.queryByText(/Thông tin liên hệ/i);
    expect(oldText).toBeNull();
  });

  it('R2: displays status badge inside the General Info card', () => {
    const { rerender } = render(<SupplierGeneralProfileTab supplier={sampleSupplier} />);

    // Active status
    const badge = screen.getByTestId('field-status-badge');
    expect(badge.textContent).toContain('Đang hoạt động');
    expect(badge.className).toContain('admin-badge-active');

    // Inactive status
    const inactiveSupplier: SupplierSummary = {
      ...sampleSupplier,
      status: 'Inactive',
    };
    rerender(<SupplierGeneralProfileTab supplier={inactiveSupplier} />);
    const inactiveBadge = screen.getByTestId('field-status-badge');
    expect(inactiveBadge.textContent).toContain('Ngưng hoạt động');
    expect(inactiveBadge.className).toContain('admin-badge-inactive');
  });

  it('R3: shows "Sửa thông tin chung" button and handles click; hides when canEdit is false (RBAC)', () => {
    const onEditGeneralMock = vi.fn();
    const { rerender } = render(
      <SupplierGeneralProfileTab
        supplier={sampleSupplier}
        canEdit={true}
        onEditGeneral={onEditGeneralMock}
      />
    );

    const editBtn = screen.getByTestId('btn-edit-general-info');
    expect(editBtn.textContent).toContain('Sửa thông tin chung');
    editBtn.click();
    expect(onEditGeneralMock).toHaveBeenCalledTimes(1);

    // RBAC: Employee mode (canEdit = false) hides edit buttons
    rerender(
      <SupplierGeneralProfileTab
        supplier={sampleSupplier}
        canEdit={false}
        onEditGeneral={onEditGeneralMock}
      />
    );
    expect(screen.queryByTestId('btn-edit-general-info')).toBeNull();
    expect(screen.queryByTestId('btn-add-bank-header')).toBeNull();
    expect(screen.queryByTestId('btn-add-vat-header')).toBeNull();
    expect(screen.queryByTestId('btn-add-bank-empty')).toBeNull();
  });

  it('R4: renders bank empty state and opens bank modal callback when clicked', () => {
    const onEditBankMock = vi.fn();
    render(
      <SupplierGeneralProfileTab
        supplier={sampleSupplier}
        canEdit={true}
        onEditBank={onEditBankMock}
      />
    );

    expect(screen.getByTestId('bank-empty-state').textContent).toContain(
      'Chưa cập nhật thông tin tài khoản ngân hàng.'
    );

    const addBankEmptyBtn = screen.getByTestId('btn-add-bank-empty');
    expect(addBankEmptyBtn.textContent).toContain('+ Cập nhật tài khoản ngân hàng');
    addBankEmptyBtn.click();
    expect(onEditBankMock).toHaveBeenCalledTimes(1);

    const addBankHeaderBtn = screen.getByTestId('btn-add-bank-header');
    expect(addBankHeaderBtn.textContent).toContain('+ Thêm ngân hàng');
    addBankHeaderBtn.click();
    expect(onEditBankMock).toHaveBeenCalledTimes(2);
  });

  it('R4: renders saved bank account with uppercase holder name, monospace STK, and copy button', () => {
    const supplierWithBank: SupplierSummary = {
      ...sampleSupplier,
      bankName: 'MB Bank',
      bankAccount: '0986312587999',
      accountHolder: 'Nguyễn Minh Đức',
    };

    render(<SupplierGeneralProfileTab supplier={supplierWithBank} canEdit={true} />);

    expect(screen.getByTestId('bank-name-display').textContent).toContain('MB Bank');
    expect(screen.getByTestId('bank-account-display').textContent).toContain('0986312587999');
    expect(screen.getByTestId('bank-holder-display').textContent).toContain('NGUYỄN MINH ĐỨC');
    expect(screen.getByTestId('btn-copy-bank-account')).toBeDefined();
    expect(screen.getByTestId('btn-edit-bank-header').textContent).toContain('Sửa ngân hàng');
  });

  it('Verifies VAT button and VAT empty state are completely removed from General Profile tab', () => {
    render(<SupplierGeneralProfileTab supplier={sampleSupplier} canEdit={true} />);

    // Nút "+ Thêm VAT" không còn tồn tại
    expect(screen.queryByTestId('btn-add-vat-header')).toBeNull();
    expect(screen.queryByTestId('btn-edit-vat-header')).toBeNull();

    // Dòng "Chưa có thông tin xuất hóa đơn VAT" và nút "+ Thêm hóa đơn VAT" không còn tồn tại
    expect(screen.queryByTestId('vat-empty-state')).toBeNull();
    expect(screen.queryByTestId('btn-add-vat-bottom')).toBeNull();
    expect(screen.queryByText(/Chưa có thông tin xuất hóa đơn VAT/i)).toBeNull();
  });

  it('Normalizes bank account holder name: strips diacritics and forces uppercase', () => {
    expect(normalizeAccountHolderName('nguyễn văn long nhật')).toBe('NGUYEN VAN LONG NHAT');
    expect(normalizeAccountHolderName('Đặng Trần Đức')).toBe('DANG TRAN DUC');
    expect(normalizeAccountHolderName('Phạm Thị Ánh Tuyết')).toBe('PHAM THI ANH TUYET');
  });

  it('Generates VietQR with proper description TT NCC {Code}', () => {
    const url = getVietQrUrl({
      bankName: 'MB Bank',
      accountNo: '0986312587999',
      accountHolder: 'NGUYEN MINH DUC',
      description: 'TT NCC SUP-20261101-0002',
    });

    expect(url).toContain('https://img.vietqr.io/image/MB-0986312587999-compact2.png');
    expect(url).toContain('accountName=NGUYEN%20MINH%20DUC');
    expect(url).toContain('addInfo=TT%20NCC%20SUP-20261101-0002');
  });
});
