import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  amountToVietnameseTokens,
  announcePaymentReceived,
  buildPaymentAnnouncementTokens,
  isPaymentVoiceEnabled,
  normalizeOrderCodeForVoice,
  resetVoiceAnnouncementDedupe,
  resolveUnannouncedTransferAmount,
  setPaymentVoiceEnabled,
  tokensToVietnameseText,
} from '../utils/paymentVoiceAlert';

describe('paymentVoiceAlert', () => {
  beforeEach(() => {
    resetVoiceAnnouncementDedupe();
    window.localStorage.clear();
  });

  describe('amountToVietnameseTokens & tokensToVietnameseText', () => {
    it('reads 0 dong properly', () => {
      expect(tokensToVietnameseText(amountToVietnameseTokens(0))).toBe('không đồng');
    });

    it('reads sub-thousand and simple thousand amounts accurately', () => {
      expect(tokensToVietnameseText(amountToVietnameseTokens(500))).toBe('năm trăm đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(5_000))).toBe('năm nghìn đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(10_000))).toBe('mười nghìn đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(15_000))).toBe('mười lăm nghìn đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(11_000))).toBe('mười một nghìn đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(14_000))).toBe('mười bốn nghìn đồng');
    });

    it('handles Vietnamese positional variants mươi / mốt / tư / lăm / linh', () => {
      expect(tokensToVietnameseText(amountToVietnameseTokens(20_000))).toBe('hai mươi nghìn đồng');
      expect(tokensToVietnameseText(amountToVietnameseTokens(21_000))).toBe(
        'hai mươi mốt nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(24_000))).toBe(
        'hai mươi tư nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(25_000))).toBe(
        'hai mươi lăm nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(105_000))).toBe(
        'một trăm linh năm nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(101_000))).toBe(
        'một trăm linh một nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(150_000))).toBe(
        'một trăm năm mươi nghìn đồng'
      );
    });

    it('handles millions, zero-hundred groups, and billions cleanly', () => {
      expect(tokensToVietnameseText(amountToVietnameseTokens(1_000_000))).toBe(
        'một triệu đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(1_050_000))).toBe(
        'một triệu không trăm năm mươi nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(1_005_000))).toBe(
        'một triệu không trăm linh năm nghìn đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(1_250_500))).toBe(
        'một triệu hai trăm năm mươi nghìn năm trăm đồng'
      );
      expect(tokensToVietnameseText(amountToVietnameseTokens(2_000_000_000))).toBe(
        'hai tỷ đồng'
      );
    });
  });

  describe('buildPaymentAnnouncementTokens', () => {
    it('builds full payment announcement sentence', () => {
      const tokens = buildPaymentAnnouncementTokens({
        amountReceived: 150_000,
        remainingAmount: 0,
        isFullPayment: true,
      });
      expect(tokensToVietnameseText(tokens)).toBe('Đã nhận một trăm năm mươi nghìn đồng');
    });

    it('builds partial payment announcement with remaining amount', () => {
      const tokens = buildPaymentAnnouncementTokens({
        amountReceived: 100_000,
        remainingAmount: 50_000,
        isFullPayment: false,
      });
      expect(tokensToVietnameseText(tokens)).toBe(
        'Đã nhận một trăm nghìn đồng còn thiếu năm mươi nghìn đồng'
      );
    });
  });

  describe('deduplication & order code normalization', () => {
    it('normalizes prefixed and unprefixed order codes to the same key', () => {
      expect(normalizeOrderCodeForVoice('AN02HD261128001')).toBe('HD261128001');
      expect(normalizeOrderCodeForVoice('AN02_HD261128001')).toBe('HD261128001');
      expect(normalizeOrderCodeForVoice('hd261128001')).toBe('HD261128001');
    });

    it('announces full payment only once even if SignalR and polling both trigger', () => {
      const first = resolveUnannouncedTransferAmount({
        orderCode: 'AN02HD1005',
        amountReceived: 150_000,
        totalPaid: 150_000,
        isFullPayment: true,
      });
      expect(first).toBe(150_000);

      // Polling arrives 500ms later for same order
      const second = resolveUnannouncedTransferAmount({
        orderCode: 'HD1005',
        totalPaid: 150_000,
        isFullPayment: true,
      });
      expect(second).toBeNull();
    });

    it('announces partial payment then subsequent top-up transfer accurately', () => {
      const partial1 = resolveUnannouncedTransferAmount({
        orderCode: 'HD2009',
        amountReceived: 100_000,
        totalPaid: 100_000,
        remainingAmount: 50_000,
        isFullPayment: false,
      });
      expect(partial1).toBe(100_000);

      // Duplicate poll on same partial deposit -> ignored
      expect(
        resolveUnannouncedTransferAmount({
          orderCode: 'HD2009',
          totalPaid: 100_000,
          remainingAmount: 50_000,
          isFullPayment: false,
        })
      ).toBeNull();

      // Customer transfers remaining 50,000 VND (detected via polling without amountIn)
      const secondTransfer = resolveUnannouncedTransferAmount({
        orderCode: 'HD2009',
        totalPaid: 150_000,
        remainingAmount: 0,
        isFullPayment: true,
      });
      expect(secondTransfer).toBe(50_000);
    });
  });

  describe('mute setting', () => {
    it('defaults to enabled and respects mute toggle without losing dedupe', () => {
      expect(isPaymentVoiceEnabled()).toBe(true);
      setPaymentVoiceEnabled(false);
      expect(isPaymentVoiceEnabled()).toBe(false);

      const spy = vi.spyOn(window, 'fetch');
      const didPlay = announcePaymentReceived({
        orderCode: 'HD3001',
        amountReceived: 80_000,
        totalPaid: 80_000,
        isFullPayment: true,
      });
      expect(didPlay).toBe(false);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
