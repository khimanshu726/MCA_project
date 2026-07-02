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

  it("should validate the full address form object", () => {
    const validForm = {
      fullName: "Jane Doe",
      phoneNumber: "1234567890",
      email: "test@example.com",
      address: "123 Main St",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
    };
    
    const errors = validateAddressForm(validForm);
    expect(hasAddressErrors(errors)).toBe(false);

    const invalidForm = { ...validForm, phoneNumber: "abc", postalCode: "123" };
    const invalidErrors = validateAddressForm(invalidForm);
    expect(hasAddressErrors(invalidErrors)).toBe(true);
    expect(invalidErrors.phoneNumber).not.toBe("");
  });
});
