import { httpClient } from '../../../api/httpClient';
import type {
  ShiftDetailResponse,
  OpenShiftRequest,
  CashMovementRequest,
  ShiftCashMovementDto,
  CloseShiftRequest,
  ConfirmHandoverRequest,
  ZReportResponse,
  CashMovementSettingsDto,
  UpdateCashMovementSettingsRequest,
  PendingMovementsSummaryResponse,
} from '../types/posShift.types';

export const posShiftApi = {
  /**
   * Mở ca làm việc POS mới
   */
  async openShift(request: OpenShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post('/pos/shifts/open', request);
    return res.data?.data || res.data;
  },

  /**
   * Lấy ca làm việc đang mở của chi nhánh / quầy thu ngân
   */
  async getCurrentShift(branchId: string, tillId?: string): Promise<ShiftDetailResponse | null> {
    try {
      const res = await httpClient.get('/pos/shifts/current', {
        params: { branchId, tillId },
      });
      return res.data?.data || res.data || null;
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.code === 'NO_ACTIVE_SHIFT') {
        return null;
      }
      throw err;
    }
  },

  /**
   * Lấy chi tiết ca theo ID
   */
  async getShiftById(id: string): Promise<ShiftDetailResponse> {
    const res = await httpClient.get(`/pos/shifts/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Thêm phiếu thu/chi trong ca (Nạp tiền, Chi vặt, Rút két nộp chủ...)
   */
  async addCashMovement(shiftId: string, request: CashMovementRequest): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/cash-movements`, request);
    return res.data?.data || res.data;
  },

  /**
   * Chốt ca bán hàng POS và kết toán kiểm đếm
   */
  async closeShift(shiftId: string, request: CloseShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/close`, request);
    return res.data?.data || res.data;
  },

  /**
   * Xác nhận bàn giao ca (CONFIRMED hoặc DISPUTED)
   */
  async confirmHandover(shiftId: string, request: ConfirmHandoverRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/confirm-handover`, request);
    return res.data?.data || res.data;
  },

  /**
   * Lấy báo cáo Z-Report
   */
  async getZReport(shiftId: string): Promise<ZReportResponse> {
    const res = await httpClient.get(`/pos/shifts/${shiftId}/z-report`);
    return res.data?.data || res.data;
  },

  /**
   * Tra cứu lịch sử ca làm việc của chi nhánh
   */
  async getShiftHistory(branchId: string, fromDate?: string, toDate?: string): Promise<ShiftDetailResponse[]> {
    const res = await httpClient.get('/pos/shifts/history', {
      params: { branchId, fromDate, toDate },
    });
    return res.data?.data || res.data || [];
  },

  /**
   * Chủ cửa hàng phê duyệt phiếu chi
   */
  async approveCashMovement(movementId: string, note?: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/approve`, { note });
    return res.data?.data || res.data;
  },

  /**
   * Chủ cửa hàng từ chối phiếu chi
   */
  async rejectCashMovement(movementId: string, reason: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/reject`, { reason });
    return res.data?.data || res.data;
  },

  /**
   * Nhân viên hủy yêu cầu chi đang pending
   */
  async cancelCashMovement(movementId: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/cancel`);
    return res.data?.data || res.data;
  },

  /**
   * Chủ cửa hàng xác nhận đã nhận tiền rút két (CashDrop)
   */
  async confirmCashDrop(movementId: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/confirm-drop`);
    return res.data?.data || res.data;
  },

  /**
   * Lấy danh sách các phiếu chờ chủ xử lý
   */
  async getPendingMovements(branchId: string): Promise<PendingMovementsSummaryResponse> {
    const res = await httpClient.get('/pos/cash-movements/pending', {
      params: { branchId },
    });
    return res.data?.data || res.data || { pendingApprovalsCount: 0, unconfirmedDropsCount: 0, movements: [] };
  },

  /**
   * Lấy cấu hình hạn mức duyệt chi két
   */
  async getCashMovementSettings(): Promise<CashMovementSettingsDto> {
    const res = await httpClient.get('/pos/settings/cash-movement');
    return res.data?.data || res.data || { cashOutApprovalThreshold: 200000, cashOutShiftTotalLimit: 0 };
  },

  /**
   * Cập nhật cấu hình hạn mức duyệt chi két
   */
  async updateCashMovementSettings(request: UpdateCashMovementSettingsRequest): Promise<CashMovementSettingsDto> {
    const res = await httpClient.put('/pos/settings/cash-movement', request);
    return res.data?.data || res.data;
  },
};

