export type VoiceToken =
  | 'da-nhan'
  | 'con-thieu'
  | 'dong'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'linh'
  | 'muoi'
  | 'muoi-s'
  | 'mot-s'
  | 'tu'
  | 'lam'
  | 'tram'
  | 'nghin'
  | 'trieu'
  | 'ty';

const VOICE_STORAGE_KEY = 'mtgrms_pos_voice_alert_enabled';
const VOICE_CHANGED_EVENT = 'mtgrms:pos-voice-alert-changed';

const TOKEN_TEXT_MAP: Record<VoiceToken, string> = {
  'da-nhan': 'Đã nhận',
  'con-thieu': 'còn thiếu',
  dong: 'đồng',
  '0': 'không',
  '1': 'một',
  '2': 'hai',
  '3': 'ba',
  '4': 'bốn',
  '5': 'năm',
  '6': 'sáu',
  '7': 'bảy',
  '8': 'tám',
  '9': 'chín',
  linh: 'linh',
  muoi: 'mười',
  'muoi-s': 'mươi',
  'mot-s': 'mốt',
  tu: 'tư',
  lam: 'lăm',
  tram: 'trăm',
  nghin: 'nghìn',
  trieu: 'triệu',
  ty: 'tỷ',
};

const DIGIT_TOKENS: VoiceToken[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const COMMON_PRELOAD_TOKENS: VoiceToken[] = [
  'da-nhan',
  'dong',
  'nghin',
  'tram',
  'trieu',
  'muoi',
  'muoi-s',
  'linh',
  'lam',
  'mot-s',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
];

function readThreeDigitGroup(groupValue: number, readZeroHundreds: boolean): VoiceToken[] {
  const tokens: VoiceToken[] = [];
  const hundreds = Math.floor(groupValue / 100);
  const tens = Math.floor((groupValue % 100) / 10);
  const ones = groupValue % 10;

  if (hundreds > 0 || readZeroHundreds) {
    tokens.push(DIGIT_TOKENS[hundreds], 'tram');
  }

  if (tens === 0) {
    if (ones > 0) {
      if (hundreds > 0 || readZeroHundreds) {
        tokens.push('linh');
      }
      tokens.push(DIGIT_TOKENS[ones]);
    }
    return tokens;
  }

  if (tens === 1) {
    tokens.push('muoi');
    if (ones === 5) {
      tokens.push('lam');
    } else if (ones > 0) {
      tokens.push(DIGIT_TOKENS[ones]);
    }
    return tokens;
  }

  tokens.push(DIGIT_TOKENS[tens], 'muoi-s');
  if (ones === 1) {
    tokens.push('mot-s');
  } else if (ones === 4) {
    tokens.push('tu');
  } else if (ones === 5) {
    tokens.push('lam');
  } else if (ones > 0) {
    tokens.push(DIGIT_TOKENS[ones]);
  }

  return tokens;
}

/**
 * Chuyển số tiền VNĐ nguyên dương sang danh sách từ vựng tiếng Việt chuẩn.
 */
export function amountToVietnameseTokens(rawAmount: number): VoiceToken[] {
  const amount = Number.isFinite(rawAmount) ? Math.max(0, Math.round(rawAmount)) : 0;
  if (amount === 0) {
    return ['0', 'dong'];
  }

  const scaleUnits: Array<VoiceToken | null> = [null, 'nghin', 'trieu', 'ty'];
  const groups: number[] = [];
  let remaining = amount;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const highestIndex = groups.length - 1;
  const result: VoiceToken[] = [];

  for (let i = highestIndex; i >= 0; i--) {
    const groupValue = groups[i];
    const scaleIndex = i % 3;
    const isBillionBoundary = i > 0 && scaleIndex === 0;

    if (groupValue > 0) {
      const readZeroHundreds = i < highestIndex;
      result.push(...readThreeDigitGroup(groupValue, readZeroHundreds));
      if (isBillionBoundary) {
        const tyCount = Math.floor(i / 3);
        for (let b = 0; b < tyCount; b++) {
          result.push('ty');
        }
      } else {
        const unit = scaleUnits[scaleIndex];
        if (unit) {
          result.push(unit);
        }
      }
    } else if (isBillionBoundary) {
      // Hỗ trợ trường hợp tròn hàng nghìn tỷ nếu phát sinh
      const hasNonZeroInBillionBlock =
        (groups[i + 1] ?? 0) > 0 || (groups[i + 2] ?? 0) > 0;
      if (hasNonZeroInBillionBlock) {
        result.push('ty');
      }
    }
  }

  result.push('dong');
  return result;
}

export interface PaymentAnnouncementInput {
  orderCode: string;
  amountReceived?: number;
  totalPaid: number;
  remainingAmount?: number;
  isFullPayment: boolean;
}

export function buildPaymentAnnouncementTokens(params: {
  amountReceived: number;
  remainingAmount?: number;
  isFullPayment: boolean;
}): VoiceToken[] {
  const received = Math.max(0, Math.round(params.amountReceived));
  const tokens: VoiceToken[] = ['da-nhan', ...amountToVietnameseTokens(received)];

  const remaining = Math.max(0, Math.round(params.remainingAmount ?? 0));
  if (!params.isFullPayment && remaining > 0) {
    tokens.push('con-thieu', ...amountToVietnameseTokens(remaining));
  }

  return tokens;
}

export function tokensToVietnameseText(tokens: VoiceToken[]): string {
  return tokens.map((t) => TOKEN_TEXT_MAP[t]).join(' ');
}

export function normalizeOrderCodeForVoice(orderCode: string): string {
  const cleaned = String(orderCode || '').trim().toUpperCase();
  const hdMatch = cleaned.match(/(HD\d+)/i);
  if (hdMatch) {
    return hdMatch[1].toUpperCase();
  }
  return cleaned;
}

export function isPaymentVoiceEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(VOICE_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setPaymentVoiceEnabled(enabled: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VOICE_STORAGE_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      stopCurrentVoicePlayback();
    }
    window.dispatchEvent(new CustomEvent(VOICE_CHANGED_EVENT, { detail: { enabled } }));
  } catch {
    // Bỏ qua nếu trình duyệt khóa localStorage
  }
}

export function subscribePaymentVoiceSetting(listener: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener(isPaymentVoiceEnabled());
  window.addEventListener(VOICE_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(VOICE_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

// Bộ nhớ chống đọc lặp theo mã đơn hàng trong phiên làm việc
const announcedPaidByOrder = new Map<string, number>();

export function resetVoiceAnnouncementDedupe(): void {
  announcedPaidByOrder.clear();
}

/**
 * Kiểm tra & cập nhật mốc tiền đã thông báo cho một đơn hàng.
 * Trả về số tiền thực nhận cần đọc (> 0) hoặc null nếu giao dịch này đã được đọc trước đó.
 */
export function resolveUnannouncedTransferAmount(input: PaymentAnnouncementInput): number | null {
  const canonicalOrder = normalizeOrderCodeForVoice(input.orderCode);
  if (!canonicalOrder) return null;

  const totalPaid = Math.max(0, Math.round(input.totalPaid));
  if (totalPaid <= 0) return null;

  const previouslyAnnounced = announcedPaidByOrder.get(canonicalOrder) ?? 0;
  if (totalPaid <= previouslyAnnounced) {
    return null;
  }

  announcedPaidByOrder.set(canonicalOrder, totalPaid);

  // Giữ kích thước map gọn gàng khi quầy mở liên tục cả ngày
  if (announcedPaidByOrder.size > 500) {
    const oldestKey = announcedPaidByOrder.keys().next().value;
    if (oldestKey) announcedPaidByOrder.delete(oldestKey);
  }

  const delta = totalPaid - previouslyAnnounced;
  const explicitAmountIn =
    typeof input.amountReceived === 'number' && input.amountReceived > 0
      ? Math.round(input.amountReceived)
      : 0;

  return explicitAmountIn > 0 && explicitAmountIn <= totalPaid ? explicitAmountIn : delta;
}

// ============================================================================
// WEB AUDIO ENGINE (100% Chrome / Edge / Safari - Không phụ thuộc OS TTS)
// ============================================================================

let sharedAudioCtx: AudioContext | null = null;
const decodedBufferCache = new Map<VoiceToken, AudioBuffer>();
const pendingBufferLoads = new Map<VoiceToken, Promise<AudioBuffer | null>>();
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeHtmlAudio: HTMLAudioElement | null = null;
let playbackChain: Promise<void> = Promise.resolve();
let hasTriggeredPreload = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedAudioCtx) return sharedAudioCtx;

  const AudioCtxCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxCtor) return null;

  try {
    sharedAudioCtx = new AudioCtxCtor();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function resolveSoundUrl(token: VoiceToken): string {
  const baseUrl = (import.meta.env?.BASE_URL as string | undefined) || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}sounds/vi/${token}.mp3`;
}

function trimAudioBufferSilence(
  ctx: AudioContext,
  buffer: AudioBuffer,
  threshold = 0.008,
  padSeconds = 0.014
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  let startSample = 0;
  while (startSample < length && Math.abs(channelData[startSample]) < threshold) {
    startSample++;
  }

  let endSample = length - 1;
  while (endSample > startSample && Math.abs(channelData[endSample]) < threshold) {
    endSample--;
  }

  if (startSample >= endSample) {
    return buffer;
  }

  const padSamples = Math.floor(sampleRate * padSeconds);
  const trimmedStart = Math.max(0, startSample - padSamples);
  const trimmedEnd = Math.min(length, endSample + padSamples);
  const trimmedLength = Math.max(1, trimmedEnd - trimmedStart);

  const trimmed = ctx.createBuffer(1, trimmedLength, sampleRate);
  const out = trimmed.getChannelData(0);
  for (let i = 0; i < trimmedLength; i++) {
    out[i] = channelData[trimmedStart + i];
  }

  // Làm mượt 3ms đầu/cuối tránh tiếng click nối mẫu
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.003), Math.floor(trimmedLength / 4));
  for (let i = 0; i < fadeSamples; i++) {
    const gain = i / fadeSamples;
    out[i] *= gain;
    out[trimmedLength - 1 - i] *= gain;
  }

  return trimmed;
}

async function loadTokenBuffer(ctx: AudioContext, token: VoiceToken): Promise<AudioBuffer | null> {
  const cached = decodedBufferCache.get(token);
  if (cached) return cached;

  const inflight = pendingBufferLoads.get(token);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const res = await fetch(resolveSoundUrl(token), { cache: 'force-cache' });
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const trimmed = trimAudioBufferSilence(ctx, decoded);
      decodedBufferCache.set(token, trimmed);
      return trimmed;
    } catch {
      return null;
    } finally {
      pendingBufferLoads.delete(token);
    }
  })();

  pendingBufferLoads.set(token, promise);
  return promise;
}

function createTingTingChimeBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const durationSec = 0.44;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const notes = [
    { freq: 987.77, startSec: 0.0, lenSec: 0.16, amp: 0.28 }, // B5
    { freq: 1318.51, startSec: 0.12, lenSec: 0.3, amp: 0.32 }, // E6
  ];

  for (const note of notes) {
    const startIdx = Math.floor(note.startSec * sampleRate);
    const noteSamples = Math.floor(note.lenSec * sampleRate);
    for (let i = 0; i < noteSamples && startIdx + i < totalSamples; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.006));
      const decay = Math.exp(-t * 10.5);
      const fundamental = Math.sin(2 * Math.PI * note.freq * t);
      const harmonic = 0.25 * Math.sin(2 * Math.PI * note.freq * 2 * t);
      data[startIdx + i] += (fundamental + harmonic) * note.amp * attack * decay;
    }
  }

  return buffer;
}

function stitchBuffers(
  ctx: AudioContext,
  chimeBuffer: AudioBuffer,
  wordBuffers: AudioBuffer[]
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const postChimeGap = Math.floor(sampleRate * 0.07);
  const interWordGap = Math.floor(sampleRate * 0.022);

  let totalLength = chimeBuffer.length + postChimeGap;
  for (let i = 0; i < wordBuffers.length; i++) {
    totalLength += wordBuffers[i].length;
    if (i < wordBuffers.length - 1) {
      totalLength += interWordGap;
    }
  }

  const combined = ctx.createBuffer(1, totalLength, sampleRate);
  const output = combined.getChannelData(0);

  output.set(chimeBuffer.getChannelData(0), 0);
  let offset = chimeBuffer.length + postChimeGap;

  for (let i = 0; i < wordBuffers.length; i++) {
    const channel = wordBuffers[i].getChannelData(0);
    output.set(channel, offset);
    offset += channel.length + (i < wordBuffers.length - 1 ? interWordGap : 0);
  }

  return combined;
}

async function playTokensViaHtmlAudioFallback(tokens: VoiceToken[]): Promise<void> {
  if (typeof Audio === 'undefined') return;
  for (const token of tokens) {
    if (!isPaymentVoiceEnabled()) break;
    await new Promise<void>((resolve) => {
      try {
        const audio = new Audio(resolveSoundUrl(token));
        activeHtmlAudio = audio;
        const done = () => {
          if (activeHtmlAudio === audio) activeHtmlAudio = null;
          resolve();
        };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      } catch {
        resolve();
      }
    });
  }
}

async function playTokensSequence(tokens: VoiceToken[]): Promise<void> {
  if (!isPaymentVoiceEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) {
    await playTokensViaHtmlAudioFallback(tokens);
    return;
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const loadedBuffers = await Promise.all(tokens.map((t) => loadTokenBuffer(ctx, t)));
    const validWordBuffers = loadedBuffers.filter((b): b is AudioBuffer => b !== null);

    // Nếu không tải được đủ từ vựng qua fetch/AudioContext thì chuyển qua fallback HTMLAudio
    if (validWordBuffers.length !== tokens.length && ctx.state !== 'running') {
      await playTokensViaHtmlAudioFallback(tokens);
      return;
    }

    if (!isPaymentVoiceEnabled()) return;

    const chimeBuffer = createTingTingChimeBuffer(ctx);
    const fullBuffer = stitchBuffers(ctx, chimeBuffer, validWordBuffers);

    await new Promise<void>((resolve) => {
      try {
        const source = ctx.createBufferSource();
        source.buffer = fullBuffer;
        source.connect(ctx.destination);
        activeSourceNode = source;
        source.onended = () => {
          if (activeSourceNode === source) activeSourceNode = null;
          resolve();
        };
        source.start(0);
      } catch {
        resolve();
      }
    });
  } catch {
    // Bảo vệ tuyệt đối: không bao giờ ném lỗi ra luồng thanh toán POS
  }
}

export function stopCurrentVoicePlayback(): void {
  try {
    if (activeSourceNode) {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
      activeSourceNode = null;
    }
  } catch {
    activeSourceNode = null;
  }

  try {
    if (activeHtmlAudio) {
      activeHtmlAudio.pause();
      activeHtmlAudio = null;
    }
  } catch {
    activeHtmlAudio = null;
  }
}

/**
 * Gọi trong sự kiện click của người dùng (mở modal QR / bật loa) để mở khóa AudioContext
 * và nạp trước từ điển âm thanh vào RAM.
 */
export function unlockPaymentAudio(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    if (!hasTriggeredPreload) {
      hasTriggeredPreload = true;
      void Promise.all(COMMON_PRELOAD_TOKENS.map((t) => loadTokenBuffer(ctx, t))).catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Phát âm thanh thông báo nhận tiền chuyển khoản ngân hàng (chống đọc lặp tự động).
 * Hàm chạy bất đồng bộ an toàn, không chặn luồng đóng modal hay in hóa đơn.
 */
export function announcePaymentReceived(input: PaymentAnnouncementInput): boolean {
  try {
    const unannouncedAmount = resolveUnannouncedTransferAmount(input);
    if (unannouncedAmount === null || unannouncedAmount <= 0) {
      return false;
    }

    if (!isPaymentVoiceEnabled()) {
      return false;
    }

    const tokens = buildPaymentAnnouncementTokens({
      amountReceived: unannouncedAmount,
      remainingAmount: input.remainingAmount,
      isFullPayment: input.isFullPayment,
    });

    playbackChain = playbackChain
      .catch(() => {})
      .then(() => playTokensSequence(tokens));

    return true;
  } catch {
    return false;
  }
}
