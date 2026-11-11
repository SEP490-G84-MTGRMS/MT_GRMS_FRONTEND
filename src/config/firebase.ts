import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: (
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyBpw6Ccr940XU_Te424VeRtq5zXL8kkuOw"
  ).trim(),
  authDomain: (
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "mt-grms-retail.firebaseapp.com"
  ).trim(),
  projectId: (
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "mt-grms-retail"
  ).trim(),
  storageBucket: (
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "mt-grms-retail.firebasestorage.app"
  ).trim(),
  messagingSenderId: (
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "740301801734"
  ).trim(),
  appId: (
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:740301801734:web:7bffd5fab24b11732e3687"
  ).trim(),
};

export function isFirebasePhoneAuthConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.startsWith("YOUR_") &&
      !firebaseConfig.projectId.startsWith("YOUR_")
  );
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebasePhoneAuthConfigured()) {
    throw new Error(
      "Chưa cấu hình VITE_FIREBASE_API_KEY và VITE_FIREBASE_PROJECT_ID trong file .env."
    );
  }

  if (!cachedApp) {
    cachedApp =
      getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
    cachedAuth.languageCode = "vi";
  }

  return cachedAuth;
}

export function formatPhoneToE164(rawPhone: string): string {
  const trimmed = (rawPhone || "").trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.startsWith("84") && digits.length >= 10) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length >= 9) {
    return `+84${digits.slice(1)}`;
  }
  return `+84${digits}`;
}

export function clearRecaptchaVerifier(): void {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      // Bỏ qua lỗi khi DOM container đã unmount
    }
    activeRecaptchaVerifier = null;
  }

  const container = document.getElementById("recaptcha-verifier-container");
  if (container) {
    container.innerHTML = "";
  }
}

export function translateFirebaseSmsError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  const message = (err as { message?: string })?.message || "";

  if (code === "auth/billing-not-enabled" || message.includes("BILLING_NOT_ENABLED")) {
    return "Dự án Firebase đang ở gói Spark ($0): Google yêu cầu bật gói Blaze (Pay-as-you-go) để bắn SMS thật ra nhà mạng, HOẶC thêm số điện thoại vào mục 'Phone numbers for testing' trong Firebase Authentication -> Sign-in method -> Phone.";
  }
  if (
    message.includes("SMS unable to be sent until this region enabled") ||
    message.includes("region enabled by the app developer")
  ) {
    return "Bạn chưa bật vùng Việt Nam (+84) trong Firebase: Vào Firebase Console -> Authentication -> tab Settings -> SMS region policy -> Chọn 'Allow' và thêm 'Vietnam (+84)' -> Bấm Save.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Bạn chưa bật phương thức 'Phone' hoặc chưa bật vùng Việt Nam (+84) trong Firebase Console (Vào Authentication -> Settings -> SMS region policy -> Thêm Vietnam (+84)).";
  }
  if (code === "auth/invalid-phone-number") {
    return "Số điện thoại không đúng định dạng quốc tế (+84...).";
  }
  if (code === "auth/quota-exceeded" || code === "auth/too-many-requests") {
    return "Đã vượt quá hạn mức gửi SMS miễn phí trong ngày của Google Firebase hoặc gửi quá nhiều lần.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Tên miền hiện tại chưa được thêm vào mục Authorized domains trong Firebase Authentication -> Settings.";
  }
  return `Lỗi từ Google Firebase (${code || "unknown"}): ${message}`;
}

export async function sendFirebasePhoneOtp(
  rawPhone: string,
  containerId = "recaptcha-verifier-container"
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const e164Phone = formatPhoneToE164(rawPhone);

  clearRecaptchaVerifier();

  // Tạo một thẻ div con mới hoàn toàn mỗi lần gọi để tránh lỗi "reCAPTCHA has already been rendered in this element"
  let targetElementOrId: HTMLElement | string = containerId;
  const parentContainer = document.getElementById(containerId);
  if (parentContainer) {
    parentContainer.innerHTML = "";
    const freshChild = document.createElement("div");
    freshChild.id = `recaptcha-widget-${Date.now()}`;
    parentContainer.appendChild(freshChild);
    targetElementOrId = freshChild;
  }

  activeRecaptchaVerifier = new RecaptchaVerifier(auth, targetElementOrId, {
    size: "invisible",
  });

  return signInWithPhoneNumber(auth, e164Phone, activeRecaptchaVerifier);
}
