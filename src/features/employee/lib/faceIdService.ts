import * as faceapi from '@vladmandic/face-api';

export const DISTANCE_THRESHOLD = 0.45;

let modelsLoaded = false;
let modelsLoadingPromise: Promise<void> | null = null;

/**
 * 1. Tải các model nhận diện từ /models
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL).catch(() => {}),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return modelsLoadingPromise;
}

export interface StaffFaceData {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  faceDescriptor?: string | number[] | null;
  faceImageUrls?: string | string[] | null;
  scheduleId?: string | null;
  shiftCode?: string | null;
  shiftName?: string | null;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: string | null;
}

/**
 * 2. Nạp dữ liệu training cho LabeledFaceDescriptors từ danh sách nhân viên
 * Theo chuẩn tutorial: mỗi nhãn (label) đi kèm mảng descriptors trích xuất từ nhiều ảnh mẫu.
 */
export function buildLabeledFaceDescriptors(
  staffList: StaffFaceData[]
): faceapi.LabeledFaceDescriptors[] {
  const labeledList: faceapi.LabeledFaceDescriptors[] = [];

  for (const staff of staffList) {
    if (!staff.faceDescriptor) continue;

    try {
      const parsed = typeof staff.faceDescriptor === 'string'
        ? JSON.parse(staff.faceDescriptor)
        : staff.faceDescriptor;

      const descriptors: Float32Array[] = [];

      // Trường hợp 1: Mảng đơn 128 số thực [n1, n2, ..., n128] (1 ảnh)
      if (Array.isArray(parsed) && parsed.length === 128 && typeof parsed[0] === 'number') {
        descriptors.push(new Float32Array(parsed));
      }
      // Trường hợp 2: Danh sách các vector training đa ảnh [[n1..n128], [n1..n128], ...] (Nhiều ảnh)
      else if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
        for (const item of parsed) {
          if (Array.isArray(item) && item.length === 128) {
            descriptors.push(new Float32Array(item));
          }
        }
      }

      if (descriptors.length > 0) {
        const label = `${staff.employeeCode}:::${staff.fullName}:::${staff.employeeId}`;
        labeledList.push(new faceapi.LabeledFaceDescriptors(label, descriptors));
      }
    } catch (e) {
      console.warn(`Lỗi nạp training data của ${staff.employeeCode}:`, e);
    }
  }

  return labeledList;
}

/**
 * Khởi tạo FaceMatcher so khớp với ngưỡng 0.6
 */
export function createFaceMatcher(
  labeledDescriptors: faceapi.LabeledFaceDescriptors[],
  threshold: number = DISTANCE_THRESHOLD
): faceapi.FaceMatcher | null {
  if (!labeledDescriptors || labeledDescriptors.length === 0) return null;
  return new faceapi.FaceMatcher(labeledDescriptors, threshold);
}

/**
 * 3. Trích xuất vector 128 số từ ảnh mẫu để lưu vào training data
 */
export async function extractDescriptorFromImage(
  imageInput: HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> {
  await loadFaceApiModels();

  let detection = await faceapi
    .detectSingleFace(imageInput)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
    detection = await faceapi
      .detectSingleFace(imageInput, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  return detection?.descriptor ? Array.from(detection.descriptor) : null;
}

export interface MatchResult {
  employeeId?: string;
  employeeCode?: string;
  fullName?: string;
  distance: number;
  matchScore: number;
  isMatched: boolean;
  rawLabel: string;
}

/**
 * 4. Nhận diện khuôn mặt từ video camera và vẽ bounding box lên canvas
 * Hỗ trợ chế độ 1:1 Verification: đối chiếu với tài khoản cá nhân đang đăng nhập.
 */
export async function detectAndDrawMatches(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  faceMatcher: faceapi.FaceMatcher | null,
  _expectedStaff?: { fullName: string; employeeCode?: string; employeeId?: string }
): Promise<{ bestMatch: MatchResult | null; detectedCount: number }> {
  if (!video || !canvas || video.paused || video.ended || video.readyState < 2) {
    return { bestMatch: null, detectedCount: 0 };
  }

  const size = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
  faceapi.matchDimensions(canvas, size);

  const detections = await faceapi
    .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!detections || detections.length === 0) {
    return { bestMatch: null, detectedCount: 0 };
  }

  const resizedDetections = faceapi.resizeResults(detections, size);
  let bestMatch: MatchResult | null = null;
  let minDistance = 999;

  for (const detection of resizedDetections) {
    const box = detection.detection.box;
    let label = 'Người lạ';
    let isMatched = false;
    let distance = 1.0;
    let matchScore = 0;
    let empId: string | undefined;
    let empCode: string | undefined;
    let fullName: string | undefined;

    if (faceMatcher) {
      const match = faceMatcher.findBestMatch(detection.descriptor);
      distance = match.distance;
      matchScore = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));

      if (match.label !== 'unknown' && distance <= DISTANCE_THRESHOLD) {
        isMatched = true;
        const parts = match.label.split(':::');
        empCode = parts[0];
        fullName = parts[1] || parts[0];
        empId = parts[2];
        label = `${fullName} (d: ${distance.toFixed(2)})`;
      } else {
        label = `Không khớp (d: ${distance.toFixed(2)})`;
      }
    }

    const drawBox = new faceapi.draw.DrawBox(box, {
      label,
      boxColor: isMatched ? '#10B981' : '#EF4444', // Xanh lá nếu trùng khớp chính chủ, Đỏ nếu người khác / không khớp
      lineWidth: 2,
    });
    drawBox.draw(canvas);

    if (isMatched && distance < minDistance) {
      minDistance = distance;
      bestMatch = {
        employeeId: empId,
        employeeCode: empCode,
        fullName,
        distance,
        matchScore,
        isMatched: true,
        rawLabel: label,
      };
    } else if (!isMatched && (!bestMatch || distance < bestMatch.distance)) {
      // Lưu lại thông tin mặt gần nhất nhưng không khớp để báo lỗi chính xác
      bestMatch = {
        employeeId: undefined,
        employeeCode: undefined,
        fullName: undefined,
        distance,
        matchScore,
        isMatched: false,
        rawLabel: label,
      };
    }
  }

  return { bestMatch, detectedCount: detections.length };
}

/**
 * Chụp ảnh snapshot nén JPEG từ video camera để gửi Backend lưu bằng chứng
 */
export function captureCompressedSnapshot(
  video: HTMLVideoElement,
  maxWidth: number = 640
): string | null {
  if (!video || video.readyState < 2) return null;

  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxWidth / (video.videoWidth || 640));
    canvas.width = (video.videoWidth || 640) * scale;
    canvas.height = (video.videoHeight || 480) * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    console.error('Lỗi chụp snapshot:', e);
    return null;
  }
}
