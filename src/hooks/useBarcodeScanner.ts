import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enableBeep?: boolean;
}

/**
 * Hook lắng nghe máy quét mã vạch USB HID phần cứng
 * Máy quét mã vạch USB hoạt động như một bàn phím tốc độ cao (<50ms giữa các phím) và kết thúc bằng phím Enter.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 50,
  enableBeep = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Phát âm thanh beep ngắn 100ms khi quét thành công
  const playBeep = () => {
    if (!enableBeep) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2 kHz beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // AudioContext có thể bị chặn nếu chưa có tương tác người dùng
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Nếu khoảng cách giữa 2 phím quá lâu (> maxIntervalMs), xóa bộ đệm cũ coi như bắt đầu quét mới
      if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const scannedCode = bufferRef.current.trim();
        if (scannedCode.length >= minChars) {
          e.preventDefault();
          e.stopPropagation();
          playBeep();
          onScan(scannedCode);
        }
        bufferRef.current = '';
        return;
      }

      // Chỉ gom các ký tự có thể in được (1 ký tự độ dài)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, minChars, maxIntervalMs, enableBeep]);
}

