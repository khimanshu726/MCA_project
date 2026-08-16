import cloudinary from "../config/cloudinary.js";
import { Enquiry } from "../models/Enquiry.js";
import { sendEnquiryNotification } from "../services/email/resendService.js";
import { createUploadedFileUrl } from "../utils/orderHelpers.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTION_TYPES = ["school", "college", "university", "other"];
const clip = (value, max) => String(value ?? "").trim().slice(0, max);
const MAX_ITEMS = 20;
const MAX_OPTIONS_PER_ITEM = 12;

// Best-effort cleanup of a just-uploaded Cloudinary sample when the submission
// is then rejected, so a bounced request doesn't leave an orphan asset. Mirrors
// the order controller; no-ops for disk uploads (nothing to call) and never
// throws.
const extractPublicId = (url) => {
  if (!url || !url.includes("/upload/")) return null;
  const parts = url.split("/upload/")[1].split("/");
  return parts.slice(1).join("/").replace(/\.[^/.]+$/, "");
};

const deleteSampleFile = async (file) => {
  const url = file?.path;
  if (!url || !/^https?:\/\//i.test(url)) return;
  try {
    const publicId = extractPublicId(url);
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("[enquiry] sample cleanup failed:", error?.message || error);
  }
};

// The client sends `items` as a JSON string under multipart, or as a real array
// under a plain JSON body. Parse tolerantly, then normalize each line: a product
// name is required (blank rows are dropped), options are trimmed {label, value}
// pairs keyed by a non-empty label, and quantity is a positive integer.
const parseItems = (raw) => {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const productName = clip(item?.productName, 200);
      const options = (Array.isArray(item?.options) ? item.options : [])
        .slice(0, MAX_OPTIONS_PER_ITEM)
        .map((option) => ({ label: clip(option?.label, 80), value: clip(option?.value, 200) }))
        .filter((option) => option.label && option.value);
      const quantity = Math.max(1, Math.floor(Number(item?.quantity) || 1));
      return { productId: clip(item?.productId, 120), productName, options, quantity };
    })
    .filter((item) => item.productName);
};

/**
 * Public endpoint. Persists an institutional bulk-quote request and notifies the
 * shop by email. Validation is defensive (the frontend validates too); the email
 * is fire-and-forget so a mail outage never fails the customer's submission.
 */
export const createEnquiry = async (req, res, next) => {
  try {
    const institutionName = clip(req.body.institutionName, 200);
    const contactName = clip(req.body.contactName, 120);
    const email = clip(req.body.email, 200).toLowerCase();
    const phone = clip(req.body.phone, 40);
    const requirements = clip(req.body.requirements, 4000);
    const message = clip(req.body.message, 4000);
    const institutionType = INSTITUTION_TYPES.includes(req.body.institutionType) ? req.body.institutionType : "other";
    const items = parseItems(req.body.items);

    const errors = {};
    if (!institutionName) errors.institutionName = "Institution name is required.";
    if (!contactName) errors.contactName = "Contact name is required.";
    if (!EMAIL_RE.test(email)) errors.email = "A valid email is required.";
    if (!requirements) errors.requirements = "Tell us the items and quantities you need.";

    if (Object.keys(errors).length > 0) {
      // A rejected submission must not leave its just-uploaded sample orphaned.
      await deleteSampleFile(req.file);
      return res.status(400).json({ message: "Please check the highlighted fields.", errors });
    }

    const enquiry = await Enquiry.create({
      institutionName,
      institutionType,
      contactName,
      email,
      phone,
      requirements,
      items,
      sampleUrl: createUploadedFileUrl(req, req.file),
      sampleName: req.file ? clip(req.file.originalname, 260) : "",
      message,
    });

    // Never block the response on email delivery.
    sendEnquiryNotification(enquiry).catch(() => {});

    return res.status(201).json({
      message: "Thanks — we've received your request and will be in touch shortly.",
      id: enquiry._id,
    });
  } catch (error) {
    return next(error);
  }
};
