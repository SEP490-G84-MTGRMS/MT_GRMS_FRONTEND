export interface RegistrationValidationInput {
  fullName: string;
  storeName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export const validateRegistration = (input: RegistrationValidationInput): string | null => {
  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 100 || !/^[\p{L}][\p{L}\p{M}' -]*$/u.test(fullName))
    return "Họ tên phải từ 2–100 ký tự và chỉ gồm chữ, khoảng trắng, dấu nháy hoặc gạch nối.";

  const storeName = input.storeName.trim();
  if (storeName.length < 2 || storeName.length > 150)
    return "Tên cửa hàng phải từ 2–150 ký tự.";

  const phone = input.phone.trim().replace(/\D/g, "");
  if (!/^(03|05|07|08|09)[0-9]{8}$/.test(phone))
    return "Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09.";

  const email = input.email.trim();
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Vui lòng nhập địa chỉ email hợp lệ, tối đa 100 ký tự.";

  const password = input.password;
  if (password.length < 8 || password.length > 64 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password) || /\s/.test(password))
    return "Mật khẩu phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.";
  if (password !== input.confirmPassword) return "Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.";
  if (!input.agreeTerms) return "Vui lòng xác nhận đồng ý với Điều khoản dịch vụ để tiếp tục.";
  return null;
};
