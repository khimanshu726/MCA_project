export const validateCheckoutFile = (file) => {
  if (!file) {
    return "";
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

  if (!allowedTypes.includes(file.type)) {
    return "Only PDF, PNG, and JPG files are allowed.";
  }

  if (file.size > 10 * 1024 * 1024) {
    return "The design file must be smaller than 10 MB.";
  }

  return "";
};
