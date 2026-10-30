import { useRef, useCallback } from 'react';

/**
 * Custom Hook quản lý Idempotency-Key cho các thao tác tài chính, két quỹ, chi phí
 * Tự động giữ nguyên key khi Retry cùng payload (phòng ngừa double-spending do lag mạng)
 * Tự động đổi key mới khi người dùng chỉnh sửa dữ liệu biểu mẫu (tránh lỗi 409 IDEMPOTENCY_PAYLOAD_MISMATCH)
 */
export function useIdempotentAction() {
  const currentKeyRef = useRef<string>(crypto.randomUUID());
  const lastPayloadHashRef = useRef<string>('');

  /**
   * Tính mã băm đơn giản của payload để so khớp thay đổi
   */
  const computeSimpleHash = (payload: unknown): string => {
    try {
      return JSON.stringify(payload);
    } catch {
      return String(Date.now());
    }
  };

  /**
   * Lấy Idempotency-Key phù hợp với payload hiện tại
   */
  const getOrRotateKey = useCallback((payload: unknown): string => {
    const newHash = computeSimpleHash(payload);

    // Nếu payload thay đổi so với lần submit trước -> sinh key mới
    if (newHash !== lastPayloadHashRef.current) {
      currentKeyRef.current = crypto.randomUUID();
      lastPayloadHashRef.current = newHash;
    }

    return currentKeyRef.current;
  }, []);

  /**
   * Cưỡng chế làm mới key (sau khi giao dịch đã thành công hoàn toàn)
   */
  const resetKey = useCallback(() => {
    currentKeyRef.current = crypto.randomUUID();
    lastPayloadHashRef.current = '';
  }, []);

  return {
    getOrRotateKey,
    resetKey,
    currentKey: currentKeyRef.current,
  };
}
