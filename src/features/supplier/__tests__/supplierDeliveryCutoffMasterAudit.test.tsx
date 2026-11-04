import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierDeliveryConfigTab } from '../components/detail/SupplierDeliveryConfigTab';
import type { SupplierSummary, SupplierDeliveryConfig } from '../types/supplier.types';

describe('MASTER AUDIT SUITE – Supplier Delivery & Cutoff Configuration', () => {
  const mockSupplier: SupplierSummary = {
    id: 'sup-delivery-001',
    code: 'SUP-DEL-001',
    name: 'Công ty Thực Phẩm Tươi Sống Nam An',
    supplierType: 'Goods',
    category: 'FRESH',
    contactPerson: 'Trần Văn Nam',
    phone: '0901234567',
    paymentTermDays: 30,
    creditLimit: 50000000,
    currentDebt: 0,
    overdueDebt: 0,
    rating: 4.8,
    status: 'Active',
    createdAt: '2026-11-01T08:00:00Z',
  };

  const initialValidConfig: SupplierDeliveryConfig = {
    leadTimeDays: 2,
    leadTimeUnit: 'BUSINESS_DAYS',
    minOrderQuantity: 10,
    activeDeliveryDays: [1, 2, 3, 4, 5], // T2 to T6
    cutoffTime: '17:00',
    allowStoreEdit: true,
    editWindowType: 'BEFORE_CUTOFF',
    hoursBeforeDelivery: 24,
    hoursAfterOrder: 2,
    holidays: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 3. LEAD TIME TESTING (TC-LT-001 to TC-LT-008)
  // =========================================================================
  describe('3. Lead Time Configuration (TC-LT-001..008)', () => {
    it('TC-LT-001: Correctly loads existing Lead Time and unit from initialConfig', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const leadTimeInput = screen.getByTestId('input-lead-time') as HTMLInputElement;
      const unitSelect = screen.getByTestId('select-lead-time-unit') as HTMLSelectElement;

      expect(leadTimeInput.value).toBe('2');
      expect(unitSelect.value).toBe('BUSINESS_DAYS');
    });

    it('TC-LT-002: Accepts valid numeric values (0, 1, 7, 30)', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const leadTimeInput = screen.getByTestId('input-lead-time') as HTMLInputElement;

      fireEvent.change(leadTimeInput, { target: { value: '0' } });
      expect(leadTimeInput.value).toBe('0');

      fireEvent.change(leadTimeInput, { target: { value: '7' } });
      expect(leadTimeInput.value).toBe('7');

      fireEvent.change(leadTimeInput, { target: { value: '30' } });
      expect(leadTimeInput.value).toBe('30');
    });

    it('TC-LT-003: Rejects invalid values (> 30 days) upon saving', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      const leadTimeInput = screen.getByTestId('input-lead-time');
      fireEvent.change(leadTimeInput, { target: { value: '45' } }); // exceeds max 30

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain(
          'Thời gian chuẩn bị (Lead Time) phải nằm trong khoảng từ 0 đến 30 ngày.'
        );
      });
      expect(onSaveMock).not.toHaveBeenCalled();
    });

    it('TC-LT-004: Unit selection between Business Days and Calendar Days persists', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const unitSelect = screen.getByTestId('select-lead-time-unit') as HTMLSelectElement;

      fireEvent.change(unitSelect, { target: { value: 'CALENDAR_DAYS' } });
      expect(unitSelect.value).toBe('CALENDAR_DAYS');

      fireEvent.change(unitSelect, { target: { value: 'BUSINESS_DAYS' } });
      expect(unitSelect.value).toBe('BUSINESS_DAYS');
    });
  });

  // =========================================================================
  // 4. MOQ TESTING (TC-MOQ-001 to TC-MOQ-007)
  // =========================================================================
  describe('4. MOQ Configuration (TC-MOQ-001..007)', () => {
    it('TC-MOQ-001 & TC-MOQ-002: Loads existing MOQ and accepts valid zero and positive values', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const moqInput = screen.getByTestId('input-moq') as HTMLInputElement;
      expect(moqInput.value).toBe('10');

      fireEvent.change(moqInput, { target: { value: '0' } });
      expect(moqInput.value).toBe('0');

      fireEvent.change(moqInput, { target: { value: '100' } });
      expect(moqInput.value).toBe('100');
    });

    it('TC-MOQ-006: Helper text updates dynamically in real-time when MOQ changes', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const moqInput = screen.getByTestId('input-moq');
      const helperText = screen.getByTestId('moq-helper-text');

      expect(helperText.textContent).toContain('10');

      fireEvent.change(moqInput, { target: { value: '25' } });
      expect(helperText.textContent).toContain('25');
    });
  });

  // =========================================================================
  // 5. DAILY ORDER CUTOFF TIME TESTING (TC-CUTOFF-001 to TC-CUTOFF-008)
  // =========================================================================
  describe('5. Daily Order Cutoff Time (TC-CUTOFF-001..008)', () => {
    it('TC-CUTOFF-001: Loads configured Cutoff Time (default 17:00)', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const cutoffInput = screen.getByTestId('input-cutoff-time') as HTMLInputElement;
      expect(cutoffInput.value).toBe('17:00');
    });

    it('TC-CUTOFF-002 & TC-CUTOFF-008: Valid times update input and dynamic helper text in real-time', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const cutoffInput = screen.getByTestId('input-cutoff-time');
      const helperText = screen.getByTestId('cutoff-helper-text');

      fireEvent.change(cutoffInput, { target: { value: '15:30' } });
      expect(helperText.textContent).toContain('15:30');

      fireEvent.change(cutoffInput, { target: { value: '23:59' } });
      expect(helperText.textContent).toContain('23:59');
    });

    it('TC-CUTOFF-003: Rejects empty Cutoff Time upon saving and preserves valid time', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      const cutoffInput = screen.getByTestId('input-cutoff-time');
      const saveBtn = screen.getByTestId('btn-save-delivery-config');

      // 1. Empty cutoff triggers error
      fireEvent.change(cutoffInput, { target: { value: '' } });
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain('Vui lòng nhập giờ chốt đơn');
      });
      expect(onSaveMock).not.toHaveBeenCalled();

      // 2. Setting back valid cutoff clears error and saves successfully
      fireEvent.change(cutoffInput, { target: { value: '18:30' } });
      fireEvent.click(saveBtn);
      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalledWith(
          expect.objectContaining({ cutoffTime: '18:30' })
        );
      });
    });
  });

  // =========================================================================
  // 6. ACTIVE DELIVERY DAYS TESTING (TC-DAY-001 to TC-DAY-010)
  // =========================================================================
  describe('6. Active Delivery Days (TC-DAY-001..010)', () => {
    it('TC-DAY-001 & TC-DAY-010: Selected weekdays display active checkmark and aria-pressed', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      // T2 is active (val = 1)
      const t2Btn = screen.getByTestId('btn-weekday-1');
      expect(t2Btn.getAttribute('aria-pressed')).toBe('true');
      expect(t2Btn.textContent).toContain('✓');

      // CN is inactive (val = 0)
      const cnBtn = screen.getByTestId('btn-weekday-0');
      expect(cnBtn.getAttribute('aria-pressed')).toBe('false');
      expect(cnBtn.textContent).not.toContain('✓');
    });

    it('TC-DAY-002: Toggles individual delivery days on and off', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      const t2Btn = screen.getByTestId('btn-weekday-1');
      expect(t2Btn.getAttribute('aria-pressed')).toBe('true');

      // Deselect T2
      fireEvent.click(t2Btn);
      expect(t2Btn.getAttribute('aria-pressed')).toBe('false');

      // Re-select T2
      fireEvent.click(t2Btn);
      expect(t2Btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('TC-DAY-004: Deselecting all days blocks saving with a validation error', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={{
            ...initialValidConfig,
            activeDeliveryDays: [1], // Only T2
          }}
          onSaveConfig={onSaveMock}
        />
      );

      // Deselect T2 so that 0 days are active
      const t2Btn = screen.getByTestId('btn-weekday-1');
      fireEvent.click(t2Btn);
      expect(t2Btn.getAttribute('aria-pressed')).toBe('false');

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain(
          'Vui lòng chọn ít nhất một ngày giao hàng hoạt động trong tuần (Active Delivery Days).'
        );
      });
      expect(onSaveMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. PO MODIFICATION RULES TESTING (Main Options & Sub-rules)
  // =========================================================================
  describe('7. PO Modification Rules Testing', () => {
    it('Main Option: Toggling between Allow Edit and Lock Immediately shows/hides sub-options', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
        />
      );

      // Initially allowStoreEdit is true, sub-options visible
      expect(screen.getByTestId('po-edit-sub-options')).toBeDefined();

      // Switch to Lock Immediately
      const lockRadio = screen.getByTestId('radio-lock-immediately');
      fireEvent.click(lockRadio);

      // Sub-options box must be hidden
      expect(screen.queryByTestId('po-edit-sub-options')).toBeNull();

      // Switch back to Allow Edit
      const allowRadio = screen.getByTestId('radio-allow-store-edit');
      fireEvent.click(allowRadio);
      expect(screen.getByTestId('po-edit-sub-options')).toBeDefined();
    });

    it('Sub-rule 1: Before Cutoff displays dynamic cutoff time in explanation text', () => {
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={{
            ...initialValidConfig,
            cutoffTime: '15:45',
            editWindowType: 'BEFORE_CUTOFF',
          }}
        />
      );

      const subOptions = screen.getByTestId('po-edit-sub-options');
      expect(subOptions.textContent).toContain('15:45');
    });

    it('Sub-rule 2: Before Delivery validates hours range (1 to 72)', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      // Select Before Delivery
      fireEvent.click(screen.getByTestId('radio-edit-hours-before-delivery'));

      const hoursInput = screen.getByTestId('input-hours-before-delivery');
      fireEvent.change(hoursInput, { target: { value: '99' } }); // exceeds max 72

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain(
          'Số giờ cho phép sửa trước ngày giao hàng phải từ 1 đến 72 giờ.'
        );
      });
      expect(onSaveMock).not.toHaveBeenCalled();
    });

    it('Sub-rule 3: After Order Placement validates hours range (1 to 24)', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      // Select After Order
      fireEvent.click(screen.getByTestId('radio-edit-hours-after-order'));

      const hoursInput = screen.getByTestId('input-hours-after-order');
      fireEvent.change(hoursInput, { target: { value: '48' } }); // exceeds max 24

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain(
          'Số giờ cho phép sửa sau khi đặt đơn phải từ 1 đến 24 giờ.'
        );
      });
      expect(onSaveMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. CONFIGURATION SAVE TESTING (TC-SAVE-001 to TC-SAVE-005)
  // =========================================================================
  describe('8. Configuration Save Testing (TC-SAVE-001..005)', () => {
    it('TC-SAVE-001: Submits full configuration and displays success alert', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      // Modify Lead Time & Cutoff
      fireEvent.change(screen.getByTestId('input-lead-time'), { target: { value: '3' } });
      fireEvent.change(screen.getByTestId('input-cutoff-time'), { target: { value: '16:00' } });

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalledWith(
          expect.objectContaining({
            leadTimeDays: 3,
            cutoffTime: '16:00',
            activeDeliveryDays: [1, 2, 3, 4, 5],
          })
        );
        expect(screen.getByTestId('save-delivery-success-alert')).toBeDefined();
      });
    });

    it('TC-SAVE-004: API failure displays explicit error alert without false success', async () => {
      const onSaveMock = vi.fn().mockRejectedValue(new Error('Lỗi kết nối cơ sở dữ liệu khi lưu cấu hình.'));
      render(
        <SupplierDeliveryConfigTab
          supplier={mockSupplier}
          initialConfig={initialValidConfig}
          onSaveConfig={onSaveMock}
        />
      );

      const saveBtn = screen.getByTestId('btn-save-delivery-config');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('save-delivery-error-alert').textContent).toContain(
          'Lỗi kết nối cơ sở dữ liệu khi lưu cấu hình.'
        );
      });
      expect(screen.queryByTestId('save-delivery-success-alert')).toBeNull();
    });
  });
});
