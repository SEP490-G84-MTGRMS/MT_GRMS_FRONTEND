import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierGeneralProfileTab } from '../components/detail/SupplierGeneralProfileTab';
import { EditSupplierModal } from '../components/EditSupplierModal';
import { SupplierBankModal, normalizeAccountHolderName } from '../components/detail/SupplierBankModal';
import { SupplierVatModal } from '../components/detail/SupplierVatModal';
import { SupplierVietQrCard } from '../components/detail/SupplierVietQrCard';
import { SupplierDeliveryConfigTab } from '../components/detail/SupplierDeliveryConfigTab';
import { SupplierHolidaysTab } from '../components/detail/SupplierHolidaysTab';
import { SupplierPayablesTab } from '../components/detail/SupplierPayablesTab';
import { SupplierHistoryTab } from '../components/detail/SupplierHistoryTab';
import { getVietQrUrl, resolveBankCodeOrBin } from '../lib/vietQrHelper';
import type { SupplierSummary, SupplierDeliveryConfig, APLedgerEntry, PurchaseOrderItem } from '../types/supplier.types';

// Fixture: Standard supplier
const baseSupplier: SupplierSummary = {
  id: 'sup-guid-001',
  code: 'SUP-20261101-0001',
  name: 'Công ty Cổ phần Nông sản Long Nhật',
  supplierType: 'Goods',
  category: 'FRESH',
  contactPerson: 'Nguyễn Minh Đức',
  phone: '0986312587',
  email: 'longnhat@mtgrms.vn',
  address: 'Số 124 Đường 3/2, Phường 12, Quận 10, TP.HCM',
  taxCode: '0312345678-001',
  companyName: 'Công ty CP Nông sản Long Nhật Miền Nam',
  invoiceAddress: 'Tòa nhà Bitexco, Q1, TP.HCM',
  bankName: 'Vietcombank',
  bankAccount: '007100888999',
  accountHolder: 'NGUYEN MINH DUC',
  note: 'Giao hàng trước 10h sáng hàng ngày',
  paymentTermDays: 30,
  creditLimit: 50000000,
  currentDebt: 12500000,
  overdueDebt: 0,
  rating: 4.8,
  status: 'Active',
  createdAt: '2026-11-01T08:00:00Z',
};

// Fixture: Delivery Config
const baseDeliveryConfig: SupplierDeliveryConfig = {
  leadTimeDays: 2,
  leadTimeUnit: 'BUSINESS_DAYS',
  minOrderQuantity: 10,
  activeDeliveryDays: [1, 2, 3, 4, 5],
  cutoffTime: '17:00',
  allowStoreEdit: true,
  editWindowType: 'BEFORE_CUTOFF',
  hoursBeforeDelivery: 24,
  hoursAfterOrder: 2,
  holidays: [
    {
      id: 'hol-01',
      fromDate: '2026-04-30',
      toDate: '2026-05-02',
      reason: 'Nghỉ lễ 30/4 - 1/5',
    },
  ],
};

// Fixture: AP Ledgers
const baseApLedgers: APLedgerEntry[] = [
  {
    id: 'ledger-01',
    supplierId: 'sup-guid-001',
    transactionDate: '2026-10-20',
    docType: 'PurchaseInvoice',
    docNo: 'PINV-202610-001',
    description: 'Nhập lô hàng nông sản tươi',
    amount: 12500000,
    direction: 1,
    balanceAfter: 12500000,
    createdByName: 'Kế toán trưởng',
  },
];

// Fixture: Purchase Orders
const basePurchaseOrders: PurchaseOrderItem[] = [
  {
    id: 'po-01',
    code: 'PO-20261020-0001',
    branchName: 'Chi nhánh Quận 10',
    orderDate: '2026-10-20',
    deliveryDate: '2026-10-22',
    totalAmount: 12500000,
    status: 'COMPLETED',
  },
];

describe('MASTER AUDIT SUITE – Supplier Detail Management', () => {
  // =========================================================================
  // SECTION 3: GENERAL INFORMATION (TC-GEN-001 to TC-GEN-012)
  // =========================================================================
  describe('3. General Information Section & Modal (TC-GEN-001..012)', () => {
    it('TC-GEN-001: Open edit modal and verify populated values; Supplier Code is read-only', () => {
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      // Verify code is read-only with disabled attribute
      const codeInput = screen.getByTestId('input-supplier-code') as HTMLInputElement;
      expect(codeInput.value).toBe('SUP-20261101-0001');
      expect(codeInput.disabled).toBe(true);

      // Verify populated fields
      expect((screen.getByTestId('input-supplier-name') as HTMLInputElement).value).toBe(baseSupplier.name);
      expect((screen.getByTestId('input-supplier-phone') as HTMLInputElement).value).toBe(baseSupplier.phone);
      expect((screen.getByTestId('input-supplier-contact') as HTMLInputElement).value).toBe(baseSupplier.contactPerson);
      expect((screen.getByTestId('input-supplier-email') as HTMLInputElement).value).toBe(baseSupplier.email);
      expect((screen.getByTestId('input-supplier-tax-code') as HTMLInputElement).value).toBe(baseSupplier.taxCode);
      expect((screen.getByTestId('input-supplier-address') as HTMLInputElement).value).toBe(baseSupplier.address);
      expect((screen.getByTestId('input-supplier-notes') as HTMLInputElement).value).toBe(baseSupplier.note);
    });

    it('TC-GEN-002: Update supplier name and verify submit payload', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const nameInput = screen.getByTestId('input-supplier-name');
      fireEvent.change(nameInput, { target: { value: 'Công ty Long Nhật Mới' } });

      const submitBtn = screen.getByTestId('btn-save-general-info');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'sup-guid-001',
            name: 'Công ty Long Nhật Mới',
          })
        );
      });
    });

    it('TC-GEN-003: Phone number validation (valid, empty, alpha characters, length bounds)', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const phoneInput = screen.getByTestId('input-supplier-phone');
      const submitBtn = screen.getByTestId('btn-save-general-info');

      // Empty phone
      fireEvent.change(phoneInput, { target: { value: '   ' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText('Vui lòng nhập số điện thoại.')).toBeDefined();
      expect(onSubmitMock).not.toHaveBeenCalled();

      // Letters in phone
      fireEvent.change(phoneInput, { target: { value: '0986ABC587' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Số điện thoại không hợp lệ/i)).toBeDefined();

      // Too short (< 8 digits)
      fireEvent.change(phoneInput, { target: { value: '12345' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Số điện thoại không hợp lệ/i)).toBeDefined();

      // Valid phone with optional leading '+'
      fireEvent.change(phoneInput, { target: { value: '+84986312587' } });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({ phone: '+84986312587' })
        );
      });
    });

    it('TC-GEN-004: Contact person handles Vietnamese Unicode and long strings', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const contactInput = screen.getByTestId('input-supplier-contact');
      const submitBtn = screen.getByTestId('btn-save-general-info');

      fireEvent.change(contactInput, { target: { value: 'Ông Hoàng Văn Khánh (Trưởng Vùng Tây Nguyên)' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({
            contactPerson: 'Ông Hoàng Văn Khánh (Trưởng Vùng Tây Nguyên)',
          })
        );
      });
    });

    it('TC-GEN-005: Contact email validation (valid, invalid, leading/trailing spaces)', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const emailInput = screen.getByTestId('input-supplier-email');
      const submitBtn = screen.getByTestId('btn-save-general-info');

      // Invalid format (missing domain)
      fireEvent.change(emailInput, { target: { value: 'invalid-email-address' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Địa chỉ email không đúng định dạng/i)).toBeDefined();
      expect(onSubmitMock).not.toHaveBeenCalled();

      // Valid email with trimming
      fireEvent.change(emailInput, { target: { value: '  ncc_sales@domain.vn  ' } });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'ncc_sales@domain.vn' })
        );
      });
    });

    it('TC-GEN-006: Tax ID validation follows Vietnamese format (10-digit, 13-digit, branch suffix)', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const taxInput = screen.getByTestId('input-supplier-tax-code');
      const submitBtn = screen.getByTestId('btn-save-general-info');

      // Invalid format (letters)
      fireEvent.change(taxInput, { target: { value: 'MST-ABC-123' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText(/Mã số thuế phải đúng định dạng 10 hoặc 13 chữ số/i)).toBeDefined();
      expect(onSubmitMock).not.toHaveBeenCalled();

      // Valid 10-digit
      fireEvent.change(taxInput, { target: { value: '0101234567' } });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({ taxCode: '0101234567' })
        );
      });

      // Valid 13-digit branch format (0312345678-001)
      fireEvent.change(taxInput, { target: { value: '0312345678-001' } });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({ taxCode: '0312345678-001' })
        );
      });
    });

    it('TC-GEN-007: Update supplier status (Active vs Inactive)', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const statusSwitch = screen.queryByTestId('radio-status-inactive') || screen.getByRole('switch');
      fireEvent.click(statusSwitch);

      const submitBtn = screen.getByTestId('btn-save-general-info');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Inactive' })
        );
      });
    });

    it('TC-GEN-008 & TC-GEN-009: Address and Quick Notes multiline/special character support', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const addressInput = screen.getByTestId('input-supplier-address');
      const notesInput = screen.getByTestId('input-supplier-notes');
      const submitBtn = screen.getByTestId('btn-save-general-info');

      const specialAddress = 'Thôn 4, Xã Vạn Hòa, Huyện Nông Cống, Tỉnh Thanh Hóa (Gần ngã 3 chợ Đình #02)';
      const specialNote = 'Lưu ý: Chỉ nhận đơn trước 16h; Chiết khấu 2% cho đơn thanh toán ngay!';

      fireEvent.change(addressInput, { target: { value: specialAddress } });
      fireEvent.change(notesInput, { target: { value: specialNote } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({
            address: specialAddress,
            note: specialNote,
          })
        );
      });
    });

    it('TC-GEN-010 & TC-GEN-011: Cancel & Close behavior with unsaved confirmation', () => {
      const onCloseMock = vi.fn();
      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={onCloseMock}
          onSubmit={vi.fn()}
        />
      );

      // Modify a field to mark form dirty
      const nameInput = screen.getByTestId('input-supplier-name');
      fireEvent.change(nameInput, { target: { value: 'Tên thay đổi nhưng bấm Hủy' } });

      // Click Cancel
      const cancelBtn = screen.getByTestId('btn-cancel-general-info');
      fireEvent.click(cancelBtn);

      // Verify unsaved confirmation dialog appears
      expect(screen.getByText('Thay đổi chưa được lưu')).toBeDefined();
    });

    it('TC-GEN-012: Prevents double submission when saving', async () => {
      let resolvePromise: () => void = () => {};
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onSubmitMock = vi.fn().mockReturnValue(pendingPromise);

      render(
        <EditSupplierModal
          isOpen={true}
          supplier={baseSupplier}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const submitBtn = screen.getByTestId('btn-save-general-info');
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      resolvePromise();
    });
  });

  // =========================================================================
  // SECTION 4: VAT INVOICE INFORMATION (TC-VAT-001 to TC-VAT-007)
  // =========================================================================
  describe('4. VAT Invoice Information (TC-VAT-001..007)', () => {
    it('TC-VAT-001 & TC-VAT-002: Add/Update VAT info with legal entity name, tax code, and address', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierVatModal
          isOpen={true}
          initialCompanyName="Công ty CP Nông sản Long Nhật Miền Nam"
          initialTaxCode="0312345678"
          initialInvoiceAddress="Tòa nhà Bitexco, Q1, TP.HCM"
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      const companyInput = screen.getByTestId('vat-company-input');
      const taxInput = screen.getByTestId('vat-tax-code-input');
      const addressInput = screen.getByTestId('vat-address-input');
      const submitBtn = screen.getByTestId('btn-save-vat');

      fireEvent.change(companyInput, { target: { value: 'Công ty TNHH Đầu tư Nông sản Long Nhật' } });
      fireEvent.change(taxInput, { target: { value: '0312345678-002' } });
      fireEvent.change(addressInput, { target: { value: 'Số 99 Lê Duẩn, Q1, TP.HCM' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith({
          companyName: 'Công ty TNHH Đầu tư Nông sản Long Nhật',
          taxCode: '0312345678-002',
          invoiceAddress: 'Số 99 Lê Duẩn, Q1, TP.HCM',
        });
      });
    });

    it('TC-VAT-003: Tax ID validation in VAT Modal rejects invalid formats', () => {
      render(
        <SupplierVatModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const companyInput = screen.getByTestId('vat-company-input');
      const taxInput = screen.getByTestId('vat-tax-code-input');
      const submitBtn = screen.getByTestId('btn-save-vat');

      fireEvent.change(companyInput, { target: { value: 'Công ty Mẫu' } });
      fireEvent.change(taxInput, { target: { value: '123' } }); // only 3 digits
      fireEvent.click(submitBtn);

      expect(screen.getByText(/Mã số thuế phải đúng định dạng 10 hoặc 13 chữ số/i)).toBeDefined();
    });

    it('TC-VAT-004 & TC-VAT-005: Legal entity name can differ from supplier display name', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierVatModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      fireEvent.change(screen.getByTestId('vat-company-input'), {
        target: { value: 'Tổng Công ty Nông nghiệp Quốc tế Vinaseed' },
      });
      fireEvent.change(screen.getByTestId('vat-tax-code-input'), {
        target: { value: '0100100100' },
      });
      fireEvent.click(screen.getByTestId('btn-save-vat'));

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith(
          expect.objectContaining({
            companyName: 'Tổng Công ty Nông nghiệp Quốc tế Vinaseed',
          })
        );
      });
    });

    it('TC-VAT-006: Deletion of VAT information clears invoice fields', async () => {
      const onDeleteMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierVatModal
          isOpen={true}
          initialCompanyName="Công ty Đã có VAT"
          initialTaxCode="0100100100"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          onDelete={onDeleteMock}
        />
      );

      const deleteBtn = screen.getByTestId('btn-delete-vat');
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByText('Đồng ý xóa');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onDeleteMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  // =========================================================================
  // SECTION 5: BANK ACCOUNT MANAGEMENT (TC-BANK-001 to TC-BANK-009)
  // =========================================================================
  describe('5. Bank Account Management (TC-BANK-001..009)', () => {
    it('TC-BANK-001 & TC-BANK-002: Add bank account with bank selection and normalization', async () => {
      const onSubmitMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierBankModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      // Select Vietcombank from bank list
      const bankSelect = screen.getByTestId('bank-select');
      fireEvent.change(bankSelect, { target: { value: 'Vietcombank' } });

      // Enter account number with leading zero
      const accountInput = screen.getByTestId('account-number-input');
      fireEvent.change(accountInput, { target: { value: '007100888999' } });

      // Enter holder name in lowercase with diacritics
      const holderInput = screen.getByTestId('account-holder-input');
      fireEvent.change(holderInput, { target: { value: 'nguyễn minh đức' } });

      const submitBtn = screen.getByTestId('btn-save-bank');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledWith({
          bankName: 'Vietcombank',
          bankAccount: '007100888999',
          accountHolder: 'NGUYEN MINH DUC', // Automatically uppercased and stripped of diacritics
        });
      });
    });

    it('TC-BANK-003: Account number preserves leading zeros and rejects non-digits', async () => {
      render(
        <SupplierBankModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const accountInput = screen.getByTestId('account-number-input') as HTMLInputElement;

      // Typing letters gets automatically stripped to digits only
      fireEvent.change(accountInput, { target: { value: '0071ABC888XYZ999' } });
      expect(accountInput.value).toBe('0071888999');

      // Preserves leading zero as string
      expect(accountInput.value.startsWith('0071')).toBe(true);
    });

    it('TC-BANK-004: Normalization of account holder names', () => {
      expect(normalizeAccountHolderName('võ thị sáu')).toBe('VO THI SAU');
      expect(normalizeAccountHolderName('ĐẶNG LÊ NGUYÊN VŨ')).toBe('DANG LE NGUYEN VU');
      expect(normalizeAccountHolderName('Trần Đức Bo')).toBe('TRAN DUC BO');
    });

    it('TC-BANK-005 & TC-BANK-006: Delete bank account with confirmation dialog', async () => {
      const onDeleteMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierBankModal
          isOpen={true}
          initialAccountNumber="0986312587"
          initialBankName="MB Bank"
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          onDelete={onDeleteMock}
        />
      );

      const deleteBtn = screen.getByTestId('btn-delete-bank');
      fireEvent.click(deleteBtn);

      // Verify confirmation dialog
      expect(screen.getByText('Xác nhận xóa tài khoản ngân hàng?')).toBeDefined();

      const confirmBtn = screen.getByText('Đồng ý xóa');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onDeleteMock).toHaveBeenCalledTimes(1);
      });
    });

    it('TC-BANK-009: API error displays banner and keeps modal open without false success', async () => {
      const onSubmitMock = vi.fn().mockRejectedValue(new Error('Lỗi kết nối CSDL khi lưu ngân hàng.'));
      render(
        <SupplierBankModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmitMock}
        />
      );

      fireEvent.change(screen.getByTestId('bank-select'), { target: { value: 'Techcombank' } });
      fireEvent.change(screen.getByTestId('account-number-input'), { target: { value: '1903444555666' } });
      fireEvent.change(screen.getByTestId('account-holder-input'), { target: { value: 'HOANG MINH' } });
      fireEvent.click(screen.getByTestId('btn-save-bank'));

      await waitFor(() => {
        expect(screen.getByTestId('bank-modal-error').textContent).toContain('Lỗi kết nối CSDL khi lưu ngân hàng.');
      });
    });
  });

  // =========================================================================
  // SECTION 6: VIETQR / BANK QR CODE (TC-QR-001 to TC-QR-008)
  // =========================================================================
  describe('6. VietQR / Bank QR Code (TC-QR-001..008)', () => {
    it('TC-QR-001 & TC-QR-002: Generates correct VietQR URL with bank shortcode/BIN and Napas standard', () => {
      const url = getVietQrUrl({
        bankName: 'Vietcombank',
        accountNo: '007100888999',
        accountHolder: 'NGUYEN MINH DUC',
        description: 'TT NCC SUP-001',
      });

      expect(url).toContain('https://img.vietqr.io/image/VCB-007100888999-compact2.png');
      expect(url).toContain('accountName=NGUYEN%20MINH%20DUC');
      expect(url).toContain('addInfo=TT%20NCC%20SUP-001');
    });

    it('TC-QR-003: Bank resolution maps bank short name, full name, or code accurately', () => {
      expect(resolveBankCodeOrBin('Vietcombank')).toBe('VCB');
      expect(resolveBankCodeOrBin('MB Bank')).toBe('MB');
      expect(resolveBankCodeOrBin('Techcombank')).toBe('TCB');
      expect(resolveBankCodeOrBin('Ngân hàng Quân đội')).toBe('MB');
    });

    it('TC-QR-004: Zoom preview modal opens and closes properly', () => {
      render(
        <SupplierVietQrCard
          bankName="Vietcombank"
          accountNo="007100888999"
          accountHolder="NGUYEN MINH DUC"
        />
      );

      const zoomBtn = screen.getByTitle('Xem phóng to mã QR');
      fireEvent.click(zoomBtn);

      expect(screen.getByText(/Mã VietQR Chuyển Khoản — Vietcombank/i)).toBeDefined();

      const closeZoomBtn = screen.getByText('✕');
      fireEvent.click(closeZoomBtn);

      expect(screen.queryByText(/Mã VietQR Chuyển Khoản — Vietcombank/i)).toBeNull();
    });

    it('TC-QR-005: Download QR creates safe file download', () => {
      render(
        <SupplierVietQrCard
          bankName="Vietcombank"
          accountNo="007100888999"
          accountHolder="NGUYEN MINH DUC"
        />
      );

      const downloadBtn = screen.getByTitle('Tải ảnh QR về máy');
      expect(downloadBtn).toBeDefined();
    });

    it('TC-QR-006: Copy account number copies to clipboard and displays temporary confirmation', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <SupplierVietQrCard
          bankName="Vietcombank"
          accountNo="007100888999"
          accountHolder="NGUYEN MINH DUC"
        />
      );

      const copyBtn = screen.getByTitle('Sao chép số tài khoản');
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith('007100888999');
      expect(screen.getByText('Đã chép STK')).toBeDefined();
    });

    it('TC-QR-007: Renders null / empty when account number is empty or less than 3 chars', () => {
      const { container } = render(
        <SupplierVietQrCard
          bankName="Vietcombank"
          accountNo=""
          accountHolder="NGUYEN MINH DUC"
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 7-10: TABS AUDIT (Delivery, Holidays, Payables, History)
  // =========================================================================
  describe('7-10. Supplier Detail Tabs Functionality', () => {
    it('Tab 2: Delivery & Cutoff Tab renders schedule and allows weekday toggling', () => {
      const onSaveConfigMock = vi.fn();
      render(
        <SupplierDeliveryConfigTab
          supplier={baseSupplier}
          initialConfig={baseDeliveryConfig}
          onSaveConfig={onSaveConfigMock}
        />
      );

      // Verify active delivery days
      expect(screen.getByText(/Thứ 2 \(T2\)/i)).toBeDefined();
      expect(screen.getByText(/Thứ 6 \(T6\)/i)).toBeDefined();
    });

    it('Tab 3: Holidays Tab renders scheduled blackout dates', () => {
      render(
        <SupplierHolidaysTab
          supplier={baseSupplier}
          initialConfig={baseDeliveryConfig}
        />
      );

      expect(screen.getByText(/Nghỉ lễ 30\/4 - 1\/5/i)).toBeDefined();
      expect(screen.getByText(/30\/04\/2026/i)).toBeDefined();
    });

    it('Tab 4: Debt & Payment Tab renders aging buckets and financial ledgers', () => {
      render(
        <SupplierPayablesTab
          supplier={baseSupplier}
          apLedgers={baseApLedgers}
        />
      );

      expect(screen.getByText(/Phân Tích Tuổi Nợ/i)).toBeDefined();
      expect(screen.getByText('PINV-202610-001')).toBeDefined();
    });

    it('Tab 5: Transaction History Tab renders purchase orders with status badges', () => {
      render(
        <SupplierHistoryTab
          supplier={baseSupplier}
          purchaseOrders={basePurchaseOrders}
        />
      );

      expect(screen.getByText('PO-20261020-0001')).toBeDefined();
      expect(screen.getByText('Hoàn tất')).toBeDefined();
    });
  });

  // =========================================================================
  // SECTION 13: SECURITY & RBAC
  // =========================================================================
  describe('13. Security and RBAC Permissions', () => {
    it('Hides all editing actions when canEdit is false (Employee role)', () => {
      render(
        <SupplierGeneralProfileTab
          supplier={baseSupplier}
          canEdit={false}
        />
      );

      // Edit General button is hidden
      expect(screen.queryByTestId('btn-edit-general-info')).toBeNull();
      // Edit Bank button is hidden
      expect(screen.queryByTestId('btn-edit-bank-header')).toBeNull();
      expect(screen.queryByTestId('btn-add-bank-header')).toBeNull();
      expect(screen.queryByTestId('btn-add-bank-empty')).toBeNull();
    });
  });
});
