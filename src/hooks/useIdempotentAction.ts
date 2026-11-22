import { useRef, useCallback } from 'react';
import { generateUuidV7 } from '../utils/uuid';

/**
 * Custom Hook quản lý Idempotency-Key cho các thao tác tài chính, két quỹ, chi phí
 * Tự động giữ nguyên key khi Retry cùng payload (phòng ngừa double-spending do lag mạng)
 * Tự động đổi key mới khi người dùng chỉnh sửa dữ liệu biểu mẫu (tránh lỗi 409 IDEMPOTENCY_PAYLOAD_MISMATCH)
 */
export function useIdempotentAction() {
  const actionRef = useRef<{ key: string; payload: string } | null>(null);

  /**
   * Lấy Idempotency-Key phù hợp với payload hiện tại
   */
  const getOrRotateKey = useCallback((payload: unknown): string => {
    const serialized = JSON.stringify(payload);
    if (!actionRef.current || actionRef.current.payload !== serialized) {
      actionRef.current = { key: generateUuidV7(), payload: serialized };
    }

    return actionRef.current.key;
  }, []);

  /**
   * Cưỡng chế làm mới key (sau khi giao dịch đã thành công hoàn toàn)
   */
  const resetKey = useCallback(() => {
    actionRef.current = null;
  }, []);

  return {
    getOrRotateKey,
    resetKey,
  };
}
