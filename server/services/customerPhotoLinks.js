import crypto from "node:crypto";
import { appConfig } from "../config.js";

/**
 * Time-limited links to a customer's photo. Only the admin can ask for one
 * (GET /api/admin/customer-photos/:id/link); the link then opens in a new tab
 * or an <img> without a login, until it expires.
 */
export const PHOTO_LINK_TTL_SECONDS = 15 * 60;

const signatureFor = (id, expires) =>
  crypto.createHmac("sha256", appConfig.jwtSecret).update(`customer-photo:${id}:${expires}`).digest("base64url");

export const signPhotoLink = (id, { now = Date.now(), ttlSeconds = PHOTO_LINK_TTL_SECONDS } = {}) => {
  const expires = Math.floor(now / 1000) + ttlSeconds;
  return {
    url: `/api/customer-photos/${encodeURIComponent(id)}/view?expires=${expires}&sig=${signatureFor(id, expires)}`,
    expiresAt: new Date(expires * 1000).toISOString(),
    expires,
  };
};

export const verifyPhotoLink = (id, expires, sig, { now = Date.now() } = {}) => {
  const expiresNumber = Number(expires);
  if (!id || !Number.isInteger(expiresNumber) || typeof sig !== "string") return false;
  if (expiresNumber * 1000 < now) return false;
  const expected = Buffer.from(signatureFor(id, expiresNumber));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};
