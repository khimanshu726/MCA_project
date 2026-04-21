import bcrypt from "bcryptjs";
import { normalizeMobile } from "../utils/authHelpers.js";
import { OTP } from "../models/OTP.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MIN_INTERVAL_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 5;

const cleanupOtpRecord = async (record) => {
  if (!record) return null;
  const now = Date.now();
  
  const recentHistory = (record.requestHistory || []).filter((value) => now - Number(value) < OTP_WINDOW_MS);
  const isValid = new Date(record.expiresAt).getTime() > now || recentHistory.length > 0;

  if (!isValid) {
    await OTP.findOneAndDelete({ mobile: record.mobile });
    return null;
  }

  if (recentHistory.length !== record.requestHistory.length) {
    record.requestHistory = recentHistory;
    await record.save();
  }

  return record;
};

export const saveOtpForMobile = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);
  const now = Date.now();
  
  let existingRecord = await OTP.findOne({ mobile: normalizedMobile });
  existingRecord = await cleanupOtpRecord(existingRecord);

  const recentHistory = existingRecord?.requestHistory || [];

  if (recentHistory.length >= OTP_MAX_REQUESTS_PER_WINDOW) {
    return {
      ok: false,
      message: "Too many OTP requests. Please try again in a little while.",
    };
  }

  if (recentHistory.length > 0 && now - Number(recentHistory[recentHistory.length - 1]) < OTP_MIN_INTERVAL_MS) {
    return {
      ok: false,
      message: "Please wait a minute before requesting another OTP.",
    };
  }

  const codeHash = await bcrypt.hash(String(otp), 10);
  const expiresAt = new Date(now + OTP_TTL_MS);
  
  if (existingRecord) {
    existingRecord.codeHash = codeHash;
    existingRecord.expiresAt = expiresAt;
    existingRecord.requestHistory.push(now);
    await existingRecord.save();
  } else {
    existingRecord = new OTP({
      mobile: normalizedMobile,
      codeHash,
      expiresAt,
      requestHistory: [now]
    });
    await existingRecord.save();
  }

  return {
    ok: true,
    expiresAt: existingRecord.expiresAt.toISOString(),
  };
};

export const verifyOtpForMobile = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);
  
  let targetRecord = await OTP.findOne({ mobile: normalizedMobile });
  targetRecord = await cleanupOtpRecord(targetRecord);

  if (!targetRecord) {
    return false;
  }
  
  const now = Date.now();
  if (new Date(targetRecord.expiresAt).getTime() <= now) {
    await OTP.findOneAndDelete({ mobile: normalizedMobile });
    return false;
  }

  const matches = await bcrypt.compare(String(otp), targetRecord.codeHash);

  if (!matches) {
    return false;
  }

  await OTP.findOneAndDelete({ mobile: normalizedMobile });
  return true;
};
