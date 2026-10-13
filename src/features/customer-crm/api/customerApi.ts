import type {
  CustomerDto,
  CreateCustomerInput,
  UpdateCustomerInput,
  CollectDebtInput,
  CustomerKpiSummary,
  VietQrConfig,
  DebtFilterStatus,
} from '../types/customer.types';
import { INITIAL_MOCK_CUSTOMERS } from './mockCustomers';

const STORAGE_KEY = 'MT_GRMS_CUSTOMERS_CACHE';

/**
 * Get current customers from local storage cache or fallback to initial dataset
 */
function getStoredCustomers(): CustomerDto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_CUSTOMERS));
      return [...INITIAL_MOCK_CUSTOMERS];
    }
    return JSON.parse(raw) as CustomerDto[];
  } catch (error) {
    console.error('Failed to read customers from localStorage:', error);
    return [...INITIAL_MOCK_CUSTOMERS];
  }
}

/**
 * Save updated customer list to local storage
 */
function saveStoredCustomers(customers: CustomerDto[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error('Failed to save customers to localStorage:', error);
  }
}

/**
 * Customer CRM API Service
 */
export const customerApi = {
  /**
   * Fetch customer list with search and filters
   */
  async getCustomers(params?: {
    search?: string;
    tier?: string;
    debtStatus?: DebtFilterStatus;
  }): Promise<CustomerDto[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = getStoredCustomers();

    if (params?.search) {
      const query = params.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.phoneNumber.includes(query) ||
          c.fullName.toLowerCase().includes(query) ||
          (c.companyName && c.companyName.toLowerCase().includes(query))
      );
    }

    if (params?.tier && params.tier !== 'ALL') {
      list = list.filter((c) => c.membershipTier === params.tier);
    }

    if (params?.debtStatus && params.debtStatus !== 'ALL') {
      if (params.debtStatus === 'NO_DEBT') {
        list = list.filter((c) => c.currentDebtAR <= 0);
      } else if (params.debtStatus === 'IN_LIMIT') {
        list = list.filter((c) => c.currentDebtAR > 0 && c.currentDebtAR <= c.debtLimit);
      } else if (params.debtStatus === 'OVER_LIMIT') {
        list = list.filter((c) => c.currentDebtAR > c.debtLimit);
      }
    }

    return list;
  },

  /**
   * Fetch a single customer by ID
   */
  async getCustomerById(id: string): Promise<CustomerDto | null> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const list = getStoredCustomers();
    const customer = list.find((c) => c.id === id);
    return customer || null;
  },

  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const list = getStoredCustomers();

    // Check duplicate phone number in same tenant
    const existing = list.find((c) => c.phoneNumber === input.phoneNumber.trim());
    if (existing) {
      throw new Error(`Số điện thoại ${input.phoneNumber} đã được đăng ký bởi khách hàng: ${existing.fullName}`);
    }

    const newCustomer: CustomerDto = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      tenantId: 'taphoa-hoangmai',
      phoneNumber: input.phoneNumber.trim(),
      fullName: input.fullName.trim(),
      email: input.email?.trim() || '',
      address: input.address?.trim() || '',
      taxCode: input.taxCode?.trim() || '',
      loyaltyPoints: 0,
      membershipTier: input.membershipTier || 'Standard',
      currentDebtAR: 0,
      debtLimit: Number(input.debtLimit) || 0,
      totalSpending: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
      invoices: [],
      payments: [],
    };

    const updated = [newCustomer, ...list];
    saveStoredCustomers(updated);
    return newCustomer;
  },

  /**
   * Update existing customer information
   */
  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<CustomerDto> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const list = getStoredCustomers();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Khách hàng không tồn tại');
    }

    const current = list[index];
    const updatedCustomer: CustomerDto = {
      ...current,
      fullName: input.fullName !== undefined ? input.fullName.trim() : current.fullName,
      email: input.email !== undefined ? input.email.trim() : current.email,
      address: input.address !== undefined ? input.address.trim() : current.address,
      taxCode: input.taxCode !== undefined ? input.taxCode.trim() : current.taxCode,
      debtLimit: input.debtLimit !== undefined ? Number(input.debtLimit) : current.debtLimit,
      membershipTier: input.membershipTier !== undefined ? input.membershipTier : current.membershipTier,
      status: input.status !== undefined ? input.status : current.status,
    };

    list[index] = updatedCustomer;
    saveStoredCustomers(list);
    return updatedCustomer;
  },

  /**
   * Execute debt collection receipt
   */
  async collectDebt(input: CollectDebtInput): Promise<CustomerDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const list = getStoredCustomers();
    const index = list.findIndex((c) => c.id === input.customerId);
    if (index === -1) {
      throw new Error('Khách hàng không tồn tại');
    }

    const current = list[index];
    if (input.amount <= 0) {
      throw new Error('Số tiền thu nợ phải lớn hơn 0 VNĐ');
    }
    if (input.amount > current.currentDebtAR) {
      throw new Error(`Số tiền thu (${input.amount.toLocaleString('vi-VN')} đ) không được lớn hơn số nợ hiện tại (${current.currentDebtAR.toLocaleString('vi-VN')} đ)`);
    }

    const newPayment = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().slice(0, 10),
      amount: input.amount,
      method: input.method,
      staffName: 'Trường An (Store Owner)',
      note: input.note || 'Thu hồi công nợ',
    };

    const updatedCustomer: CustomerDto = {
      ...current,
      currentDebtAR: Math.max(0, current.currentDebtAR - input.amount),
      payments: [newPayment, ...(current.payments || [])],
    };

    list[index] = updatedCustomer;
    saveStoredCustomers(list);
    return updatedCustomer;
  },

  /**
   * Calculate KPI totals for the customer CRM summary
   */
  async getKpiSummary(): Promise<CustomerKpiSummary> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const list = getStoredCustomers();
    const totalCustomers = list.length;
    const totalDebtAR = list.reduce((sum, c) => sum + (c.currentDebtAR || 0), 0);
    const overLimitCount = list.filter((c) => c.currentDebtAR > c.debtLimit).length;
    const totalLoyaltyPoints = list.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);

    return {
      totalCustomers,
      totalDebtAR,
      overLimitCount,
      totalLoyaltyPoints,
    };
  },

  /**
   * Generate VietQR configuration payload
   */
  generateVietQr(customer: CustomerDto, amount: number): VietQrConfig {
    const bankId = '970422'; // MB Bank Napas Bin
    const bankName = 'MB Bank (Ngân hàng Quân Đội)';
    const accountNo = '090123456789';
    const accountName = 'NGUYEN TRUONG AN';
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    const description = `THUNO ${cleanPhone}`;
    const safeAmount = Math.max(0, Math.round(amount));

    // Dynamic QR URL using quickchart / vietqr standard
    const qrDataUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${safeAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      bankId,
      bankName,
      accountNo,
      accountName,
      amount: safeAmount,
      description,
      qrDataUrl,
    };
  },
};