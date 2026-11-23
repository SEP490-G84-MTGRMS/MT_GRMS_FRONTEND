import { describe, expect, it } from "vitest";
import { getRegistrationPasswordStrength, validateRegistration, type RegistrationValidationInput } from "./authValidation";

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
    (password) => expect(validateRegistration({ ...valid(), password, confirmPassword: password })).toMatchObject({ field: "password" }),
  );

  it.each([
    ["fullName", "A"],
    ["storeName", "A"],
    ["phone", "0212345678"],
    ["email", "invalid"],
    ["confirmPassword", "Different@1"],
  ] as const)("reports the correct field for an invalid %s", (field, value) =>
    expect(validateRegistration({ ...valid(), [field]: value })).toMatchObject({ field }));

  it("checks terms before missing or invalid fields", () =>
    expect(validateRegistration({ ...valid(), agreeTerms: false, fullName: "", password: "weak" }))
      .toMatchObject({ field: "agreeTerms" }));
});

it.each([
  ["", 0],
  ["Short@1", 1],
  ["Pass word@1", 1],
  ["Password@1".padEnd(65, "a"), 1],
  ["Nhatlc123", 2],
  ["password@1", 2],
  ["Password@@", 2],
  ["Password@1", 3],
] as const)("rates %s consistently with registration", (password, strength) => {
  expect(getRegistrationPasswordStrength(password)).toBe(strength);
  expect(validateRegistration({ ...valid(), password, confirmPassword: password }) === null)
    .toBe(strength === 3);
});
