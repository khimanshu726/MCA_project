export const sendOtpSms = async (mobile, otp) => {
  console.log(`[MOCK OTP] Elite Empressions -> ${mobile}: ${otp}`);

  return {
    delivered: true,
    provider: "mock",
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
};
