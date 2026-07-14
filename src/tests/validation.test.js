import { describe, it, expect } from "vitest";
import {
  sanitizeName,
  sanitizeDigits,
  validateField,
  validateAddressForm,
  hasAddressErrors,
} from "../utils/addressValidation";

describe("Frontend Address Validation Utilities", () => {
  it("should extract only digits from strings", () => {
    expect(sanitizeDigits("Phone: (555) 123-4567!", 10)).toBe("5551234567");
  });

  it("should sanitize names correctly", () => {
    expect(sanitizeName("John Doe 123 @")).toBe("John Doe ");
  });

  it("should validate phone numbers correctly", () => {
    expect(validateField("phoneNumber", "123")).not.toBe("");
    expect(validateField("phoneNumber", "1234567890")).toBe("");
  });

  it("should validate pincode format", () => {
    expect(validateField("pincode", "123")).not.toBe("");
    expect(validateField("pincode", "400001")).toBe("");
  });

  it("should only require email when requireEmail is set", () => {
    expect(validateField("email", "", { requireEmail: false })).toBe("");
    expect(validateField("email", "", { requireEmail: true })).not.toBe("");
    expect(validateField("email", "test@example.com", { requireEmail: true })).toBe("");
  });

  it("should not throw when validating boolean fields like isDefault", () => {
    // Regression: (value || "").trim() crashes on `true` because `true || ""`
    // short-circuits to `true`, which has no .trim(). Editing an existing
    // default address (isDefault: true) hit this on every save.
    expect(() => validateField("isDefault", true)).not.toThrow();
    expect(validateField("isDefault", true)).toBe("");
    expect(() => validateAddressForm({ isDefault: true, addressType: "home" })).not.toThrow();
  });

  it("should validate the full address form object", () => {
    const validForm = {
      fullName: "Jane Doe",
      phoneNumber: "1234567890",
      email: "test@example.com",
      pincode: "400001",
      addressLine1: "123 Main St",
      addressLine2: "",
      landmark: "",
      city: "Mumbai",
      district: "Mumbai",
      state: "Maharashtra",
    };

    const errors = validateAddressForm(validForm, { requireEmail: true });
    expect(hasAddressErrors(errors)).toBe(false);

    const invalidForm = { ...validForm, phoneNumber: "abc", pincode: "123" };
    const invalidErrors = validateAddressForm(invalidForm, { requireEmail: true });
    expect(hasAddressErrors(invalidErrors)).toBe(true);
    expect(invalidErrors.phoneNumber).not.toBe("");
    expect(invalidErrors.pincode).not.toBe("");
  });
});
