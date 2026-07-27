import bcrypt from "bcryptjs";
import { normalizeEmail, normalizeMobile } from "../utils/authHelpers.js";
import { OTP } from "../models/OTP.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MIN_INTERVAL_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 5;

// The delete filter for a record, using whichever key it was stored under.
const recordFilter = (record) => (record.email ? { email: record.email } : { mobile: record.mobile });

const cleanupOtpRecord = async (record) => {
  if (!record) return null;
  const now = Date.now();

  const recentHistory = (record.requestHistory || []).filter((value) => now - Number(value) < OTP_WINDOW_MS);
  const isValid = new Date(record.expiresAt).getTime() > now || recentHistory.length > 0;

  if (!isValid) {
    await OTP.findOneAndDelete(recordFilter(record));
    return null;
  }

  if (recentHistory.length !== record.requestHistory.length) {
    record.requestHistory = recentHistory;
    await record.save();
  }

  return record;
};

/**
 * Store an OTP under a key filter — { mobile } or { email }. Same bcrypt hash,
 * 5-minute TTL, and 1/min + 5/hour rate limits regardless of channel.
 */
const saveOtp = async (filter, otp) => {
  const now = Date.now();

  let existingRecord = await OTP.findOne(filter);
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
    existingRecord = new OTP({ ...filter, codeHash, expiresAt, requestHistory: [now] });
    await existingRecord.save();
  }

  return {
    ok: true,
    expiresAt: existingRecord.expiresAt.toISOString(),
  };
};

const verifyOtp = async (filter, otp) => {
  let targetRecord = await OTP.findOne(filter);
  targetRecord = await cleanupOtpRecord(targetRecord);

  if (!targetRecord) {
    return false;
  }

  const now = Date.now();
  if (new Date(targetRecord.expiresAt).getTime() <= now) {
    await OTP.findOneAndDelete(filter);
    return false;
  }

  const matches = await bcrypt.compare(String(otp), targetRecord.codeHash);

  if (!matches) {
    return false;
  }

  await OTP.findOneAndDelete(filter);
  return true;
};

export const saveOtpForMobile = (mobile, otp) => saveOtp({ mobile: normalizeMobile(mobile) }, otp);
export const verifyOtpForMobile = (mobile, otp) => verifyOtp({ mobile: normalizeMobile(mobile) }, otp);

export const saveOtpForEmail = (email, otp) => saveOtp({ email: normalizeEmail(email) }, otp);
export const verifyOtpForEmail = (email, otp) => verifyOtp({ email: normalizeEmail(email) }, otp);
