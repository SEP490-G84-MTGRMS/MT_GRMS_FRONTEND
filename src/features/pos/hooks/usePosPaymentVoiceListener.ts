import { useEffect, useMemo, useRef } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { httpClient } from '../../../api/httpClient';
import {
  announcePaymentReceived,
  normalizeOrderCodeForVoice,
} from '../utils/paymentVoiceAlert';

function resolveHubUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, '')}/hubs/notifications`;
  }
  return '/hubs/notifications';
}

export interface PendingVietQrOrderEntry {
  id: string;
  orderCode: string;
  finalAmount: number;
  qrExpiresAtMs?: number;
}

interface UsePosPaymentVoiceListenerOptions {
  pendingOrdersByTab: Record<number, PendingVietQrOrderEntry | null>;
  tabs: Array<{ id: number; name: string }>;
  activeBranchId?: string;
  openModalOrderCode?: string;
  onNotify?: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

/**
 * Lắng nghe xác nhận tiền về cho các đơn VietQR đang chờ ở nền
 * (khi thu ngân đóng tạm modal QR để sang tab khác bán cho khách tiếp theo).
 */
export function usePosPaymentVoiceListener({
  pendingOrdersByTab,
  tabs,
  activeBranchId,
  openModalOrderCode,
  onNotify,
}: UsePosPaymentVoiceListenerOptions): void {
  const notifiedMilestoneRef = useRef<Map<string, number>>(new Map());
  const paidOrderCodesRef = useRef<Set<string>>(new Set());
  const onNotifyRef = useRef(onNotify);
  const tabsRef = useRef(tabs);
  const activeBranchIdRef = useRef(activeBranchId);

  useEffect(() => {
    onNotifyRef.current = onNotify;
    tabsRef.current = tabs;
    activeBranchIdRef.current = activeBranchId;
  }, [onNotify, tabs, activeBranchId]);

  const backgroundOrders = useMemo(() => {
    const openCanonical = openModalOrderCode
      ? normalizeOrderCodeForVoice(openModalOrderCode)
      : '';

    const result: Array<{ tabId: number; orderCode: string; canonicalCode: string; finalAmount: number }> = [];
    for (const [rawTabId, entry] of Object.entries(pendingOrdersByTab)) {
      if (!entry?.orderCode) continue;
      const canonicalCode = normalizeOrderCodeForVoice(entry.orderCode);
      if (!canonicalCode || canonicalCode === openCanonical) continue;
      result.push({
        tabId: Number(rawTabId),
        orderCode: entry.orderCode,
        canonicalCode,
        finalAmount: entry.finalAmount,
      });
    }
    return result;
  }, [pendingOrdersByTab, openModalOrderCode]);

  const backgroundKey = useMemo(
    () => backgroundOrders.map((o) => `${o.tabId}:${o.orderCode}:${o.finalAmount}`).join('|'),
    [backgroundOrders]
  );

  useEffect(() => {
    if (backgroundOrders.length === 0) return;

    const notifyBackgroundUpdate = (
      matched: { tabId: number; orderCode: string; canonicalCode: string; finalAmount: number },
      params: {
        amountReceived?: number;
        totalPaid: number;
        remainingAmount: number;
        isFullPayment: boolean;
      }
    ) => {
      announcePaymentReceived({
        orderCode: matched.orderCode,
        amountReceived: params.amountReceived,
        totalPaid: params.totalPaid,
        remainingAmount: params.remainingAmount,
        isFullPayment: params.isFullPayment,
      });

      if (params.isFullPayment) {
        paidOrderCodesRef.current.add(matched.canonicalCode);
      }

      const prevToastPaid = notifiedMilestoneRef.current.get(matched.canonicalCode) ?? 0;
      if (params.totalPaid <= prevToastPaid) return;
      notifiedMilestoneRef.current.set(matched.canonicalCode, params.totalPaid);

      const tabName =
        tabsRef.current.find((t) => t.id === matched.tabId)?.name || `Đơn ${matched.tabId}`;

      if (params.isFullPayment) {
        onNotifyRef.current?.(
          `Đã nhận đủ ${params.totalPaid.toLocaleString('vi-VN')} VNĐ chuyển khoản cho đơn ${matched.orderCode} (${tabName}). Mở lại tab để hoàn tất & in hóa đơn.`,
          'success'
        );
      } else {
        const receivedDisplay = params.amountReceived || params.totalPaid;
        onNotifyRef.current?.(
          `Đơn ${matched.orderCode} (${tabName}) vừa nhận ${receivedDisplay.toLocaleString('vi-VN')} VNĐ, còn thiếu ${params.remainingAmount.toLocaleString('vi-VN')} VNĐ.`,
          'warning'
        );
      }
    };

    // 1. Lắng nghe SignalR realtime cho các đơn chờ nền
    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    let disposed = false;

    connection.on(
      'PaymentReceived',
      (data: {
        orderCode?: string;
        branchId?: string;
        isFullPayment?: boolean;
        amountIn?: number;
        totalPaid?: number;
        remaining?: number;
        finalAmount?: number;
      }) => {
        if (disposed || !data?.orderCode) return;

        // Nếu payload có branchId và quầy đang chọn chi nhánh xác định thì lọc đúng chi nhánh
        if (
          data.branchId &&
          activeBranchIdRef.current &&
          data.branchId.toLowerCase() !== activeBranchIdRef.current.toLowerCase()
        ) {
          return;
        }

        const incomingCanonical = normalizeOrderCodeForVoice(data.orderCode);
        const matched = backgroundOrders.find((o) => o.canonicalCode === incomingCanonical);
        if (!matched) return;

        const isFull = Boolean(data.isFullPayment);
        const totalPaid =
          data.totalPaid ?? (isFull ? data.finalAmount ?? matched.finalAmount : data.amountIn ?? 0);

        notifyBackgroundUpdate(matched, {
          amountReceived: data.amountIn,
          totalPaid,
          remainingAmount: data.remaining ?? 0,
          isFullPayment: isFull,
        });
      }
    );

    connection
      .start()
      .then(() => {
        if (disposed) return;
        for (const ord of backgroundOrders) {
          connection.invoke('JoinOrderGroup', ord.orderCode).catch(() => {});
        }
      })
      .catch(() => {});

    // 2. Polling dự phòng mỗi 3 giây cho các đơn chờ nền (dừng poll các đơn đã báo thanh toán đủ)
    const pollTimer = window.setInterval(async () => {
      if (disposed) return;
      for (const ord of backgroundOrders) {
        if (paidOrderCodesRef.current.has(ord.canonicalCode)) continue;
        try {
          const res = await httpClient.get(
            `/payments/check-order/${encodeURIComponent(ord.orderCode)}`
          );
          if (disposed) return;
          if (res.data?.isPaid) {
            const paidTotal = res.data.finalAmount || res.data.depositAmount || ord.finalAmount;
            notifyBackgroundUpdate(ord, {
              totalPaid: paidTotal,
              remainingAmount: 0,
              isFullPayment: true,
            });
          } else if (res.data?.paymentStatus === 'PARTIALLY_PAID' && res.data.depositAmount > 0) {
            notifyBackgroundUpdate(ord, {
              totalPaid: res.data.depositAmount,
              remainingAmount: res.data.remainingAmount || 0,
              isFullPayment: false,
            });
          }
        } catch {
          // Bỏ qua lỗi mạng tạm thời
        }
      }
    }, 3000);

    return () => {
      disposed = true;
      window.clearInterval(pollTimer);
      for (const ord of backgroundOrders) {
        connection.invoke('LeaveOrderGroup', ord.orderCode).catch(() => {});
      }
      void connection.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backgroundKey]);
}
