import { describe, expect, it } from "vitest";
import { validateRegistration, type RegistrationValidationInput } from "./authValidation";

const valid = (): RegistrationValidationInput => ({
  fullName: "Nguyễn Văn A",
  storeName: "Cửa hàng A",
  phone: "0912345678",
  email: "owner@example.com",
  password: "Password@1",
  confirmPassword: "Password@1",
  agreeTerms: true,
});

describe("validateRegistration", () => {
  it("accepts valid registration", () => expect(validateRegistration(valid())).toBeNull());

  it.each(["password@1", "PASSWORD@1", "Password@@", "Password11", "Pass word@1", "Short@1"])(
    "rejects weak password %s",
    (password) => expect(validateRegistration({ ...valid(), password, confirmPassword: password })).toContain("Mật khẩu"),
  );

  it("rejects invalid phone and email", () => {
    expect(validateRegistration({ ...valid(), phone: "0212345678" })).toContain("Số điện thoại");
    expect(validateRegistration({ ...valid(), email: "invalid" })).toContain("email");
  });

  it("requires explicit terms", () =>
    expect(validateRegistration({ ...valid(), agreeTerms: false })).toContain("Điều khoản"));
});
