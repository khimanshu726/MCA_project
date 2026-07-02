const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[A-Za-z][A-Za-z\s'-]*$/;

export const sanitizeNameInput = (value = "") =>
  value
    .replace(/[^A-Za-z\s'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 40);

export const normalizeEmailInput = (value = "") => value.trim().toLowerCase();

export const isValidEmail = (value = "") => emailPattern.test(normalizeEmailInput(value));

export const getPasswordChecks = (password = "") => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export const isStrongPassword = (password = "") =>
  Object.values(getPasswordChecks(password)).every(Boolean);

export const getNameError = (value = "", label = "Name") => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return `${label} is required.`;
  }

  if (trimmedValue.length < 2) {
    return `${label} must be at least 2 characters.`;
  }

  if (!namePattern.test(trimmedValue)) {
    return `${label} can only include letters, spaces, apostrophes, and hyphens.`;
  }

  return "";
};

export const getEmailError = (value = "") => {
  if (!value.trim()) {
    return "Email address is required.";
  }

  if (!isValidEmail(value)) {
    return "Enter a valid email address.";
  }

  return "";
};

export const getPasswordError = (value = "") => {
  if (!value) {
    return "Password is required.";
  }

  if (!isStrongPassword(value)) {
    return "Use at least 8 characters, including uppercase, lowercase, a number, and a special character.";
  }

  return "";
};

export const getConfirmPasswordError = (password = "", confirmPassword = "") => {
  if (!confirmPassword) {
    return "Confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
};

export const getTermsError = (accepted) =>
  accepted ? "" : "You must agree to the Terms & Privacy Policy to continue.";

export const buildRegisterErrors = ({
  firstName = "",
  lastName = "",
  email = "",
  password = "",
  confirmPassword = "",
  acceptedTerms = false,
}) => ({
  firstName: getNameError(firstName, "First name"),
  lastName: getNameError(lastName, "Last name"),
  email: getEmailError(email),
  password: getPasswordError(password),
  confirmPassword: getConfirmPasswordError(password, confirmPassword),
  acceptedTerms: getTermsError(acceptedTerms),
});

export const buildLoginErrors = ({ email = "", password = "" }) => ({
  email: getEmailError(email),
  password: password ? "" : "Password is required.",
});

export const hasErrors = (errors) => Object.values(errors).some(Boolean);
