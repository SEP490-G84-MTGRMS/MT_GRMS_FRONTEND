export interface RegistrationValidationInput {
  fullName: string;
  storeName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface RegistrationValidationError {
  field: keyof RegistrationValidationInput;
  message: string;
}

export const getRegistrationPasswordStrength = (password: string): 0 | 1 | 2 | 3 => {
  if (!password) return 0;
  if (password.length < 8 || password.length > 64 || /\s/.test(password)) return 1;

  const missing = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/]
    .filter((rule) => !rule.test(password)).length;
  if (missing === 0) return 3;
  return missing === 1 ? 2 : 1;
};

export const validateRegistration = (input: RegistrationValidationInput): RegistrationValidationError | null => {
  if (!input.agreeTerms)
    return { field: "agreeTerms", message: "Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật để tiếp tục." };

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 100 || !/^[\p{L}][\p{L}\p{M}' -]*$/u.test(fullName))
    return { field: "fullName", message: "Họ tên phải từ 2–100 ký tự và chỉ gồm chữ, khoảng trắng, dấu nháy hoặc gạch nối." };

  const storeName = input.storeName.trim();
  if (storeName.length < 2 || storeName.length > 150)
    return { field: "storeName", message: "Tên cửa hàng phải từ 2–150 ký tự." };

  const phone = input.phone.trim().replace(/\D/g, "");
  if (!/^(03|05|07|08|09)[0-9]{8}$/.test(phone))
    return { field: "phone", message: "Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số bắt đầu bằng 03, 05, 07, 08 hoặc 09." };

  const email = input.email.trim();
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { field: "email", message: "Vui lòng nhập địa chỉ email hợp lệ, tối đa 100 ký tự." };

  const password = input.password;
  if (getRegistrationPasswordStrength(password) !== 3)
    return { field: "password", message: "Mật khẩu phải có 8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng." };
  if (password !== input.confirmPassword)
    return { field: "confirmPassword", message: "Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại." };
  return null;
};
