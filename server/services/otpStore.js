import bcrypt from "bcryptjs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeMobile } from "../utils/authHelpers.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MIN_INTERVAL_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_REQUESTS_PER_WINDOW = 5;
const otpFilePath = path.resolve(process.cwd(), "server", "data", "otps.json");

const ensureOtpFile = async () => {
  await mkdir(path.dirname(otpFilePath), { recursive: true });

  try {
    await access(otpFilePath);
  } catch {
    await writeFile(otpFilePath, "[]", "utf8");
  }
};

const readOtpRecords = async () => {
  await ensureOtpFile();
  const rawValue = await readFile(otpFilePath, "utf8");

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeOtpRecords = async (records) => {
  await ensureOtpFile();
  await writeFile(otpFilePath, JSON.stringify(records, null, 2), "utf8");
};

const cleanupOtpRecords = (records) => {
  const now = Date.now();

  return records
    .map((record) => ({
      ...record,
      requestHistory: (record.requestHistory || []).filter((value) => now - Number(value) < OTP_WINDOW_MS),
    }))
    .filter((record) => new Date(record.expiresAt).getTime() > now || (record.requestHistory || []).length > 0);
};

export const saveOtpForMobile = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);
  const now = Date.now();
  const records = cleanupOtpRecords(await readOtpRecords());
  const existingRecord = records.find((record) => record.mobile === normalizedMobile);
  const recentHistory = (existingRecord?.requestHistory || []).filter((value) => now - Number(value) < OTP_WINDOW_MS);

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
  const nextRecord = {
    mobile: normalizedMobile,
    codeHash,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    requestHistory: [...recentHistory, now],
  };

  const nextRecords = records.filter((record) => record.mobile !== normalizedMobile);
  nextRecords.push(nextRecord);
  await writeOtpRecords(nextRecords);

  return {
    ok: true,
    expiresAt: nextRecord.expiresAt,
  };
};

export const verifyOtpForMobile = async (mobile, otp) => {
  const normalizedMobile = normalizeMobile(mobile);
  const records = cleanupOtpRecords(await readOtpRecords());
  const targetRecord = records.find((record) => record.mobile === normalizedMobile);

  if (!targetRecord) {
    await writeOtpRecords(records);
    return false;
  }

  const matches = await bcrypt.compare(String(otp), targetRecord.codeHash);

  if (!matches) {
    return false;
  }

  const nextRecords = records.filter((record) => record.mobile !== normalizedMobile);
  await writeOtpRecords(nextRecords);
  return true;
};
