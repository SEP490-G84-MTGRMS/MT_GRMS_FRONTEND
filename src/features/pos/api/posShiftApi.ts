import { httpClient } from '../../../api/httpClient';
import { generateUuidV7 } from '../../../utils/uuid';
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
  StartClosingShiftRequest,
  CancelClosingShiftRequest,
  UpdateCountedCashRequest,
  ConfirmCloseShiftRequest,
  ForceCloseShiftRequest,
  CashierShiftEligibilityDto,
} from '../types/posShift.types';

export const posShiftApi = {
  /**
   * Mở ca làm việc POS mới (Yêu cầu Idempotency-Key UUIDv7)
   */
  async openShift(request: OpenShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post('/pos/shifts/open', request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
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
   * Thêm phiếu thu/chi trong ca (Nạp tiền, Chi vặt, Rút két nộp chủ...) (Yêu cầu Idempotency-Key)
   */
  async addCashMovement(shiftId: string, request: CashMovementRequest): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/cash-movements`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Chốt ca bán hàng POS và kết toán kiểm đếm (Yêu cầu Idempotency-Key)
   */
  async closeShift(shiftId: string, request: CloseShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/close`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Xác nhận bàn giao ca (CONFIRMED hoặc DISPUTED) (Yêu cầu Idempotency-Key)
   */
  async confirmHandover(shiftId: string, request: ConfirmHandoverRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/confirm-handover`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
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
   * Chủ cửa hàng phê duyệt phiếu chi (Yêu cầu Idempotency-Key)
   */
  async approveCashMovement(movementId: string, note?: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/approve`, { note }, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Chủ cửa hàng từ chối phiếu chi (Yêu cầu Idempotency-Key)
   */
  async rejectCashMovement(movementId: string, reason: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/reject`, { reason }, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Nhân viên hủy yêu cầu chi đang pending (Yêu cầu Idempotency-Key)
   */
  async cancelCashMovement(movementId: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/cancel`, {}, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Chủ cửa hàng xác nhận đã nhận tiền rút két (CashDrop) (Yêu cầu Idempotency-Key)
   */
  async confirmCashDrop(movementId: string): Promise<ShiftCashMovementDto> {
    const res = await httpClient.post(`/pos/cash-movements/${movementId}/confirm-drop`, {}, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
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
   * Cập nhật cấu hình hạn mức duyệt chi két (Yêu cầu Idempotency-Key)
   */
  async updateCashMovementSettings(request: UpdateCashMovementSettingsRequest): Promise<CashMovementSettingsDto> {
    const res = await httpClient.put('/pos/settings/cash-movement', request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Bắt đầu kiểm đếm chốt ca (chuyển sang Closing và khóa bán hàng toàn chi nhánh)
   */
  async startClosingShift(shiftId: string, request?: StartClosingShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/start-closing`, request || {}, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Hủy kiểm đếm chốt ca (trả ca về Open để tiếp tục bán hàng)
   */
  async cancelClosingShift(shiftId: string, request?: CancelClosingShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/cancel-closing`, request || {}, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Cập nhật số tiền thực đếm trong két khi ca đang Closing
   */
  async updateCountedCash(shiftId: string, request: UpdateCountedCashRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.put(`/pos/shifts/${shiftId}/counted-cash`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Nhân viên xác nhận số đếm và đóng ca chung
   */
  async confirmCloseShift(shiftId: string, request: ConfirmCloseShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/confirm-close`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Chủ cửa hàng đóng ca cưỡng bức kèm số đếm và lý do bắt buộc
   */
  async forceCloseShift(shiftId: string, request: ForceCloseShiftRequest): Promise<ShiftDetailResponse> {
    const res = await httpClient.post(`/pos/shifts/${shiftId}/force-close`, request, {
      headers: { 'Idempotency-Key': generateUuidV7() },
    });
    return res.data?.data || res.data;
  },

  /**
   * Kiểm tra xem thu ngân hiện tại có đủ điều kiện trực ca (có lịch làm việc hợp lệ) để bán hàng POS hay không (REQ-STRICT-SCHEDULE-VALIDATION)
   */
  async checkCashierEligibility(branchId?: string): Promise<CashierShiftEligibilityDto> {
    const res = await httpClient.get('/pos/shifts/cashier-eligibility', {
      params: { branchId },
    });
    return res.data?.data || res.data;
  },
};

