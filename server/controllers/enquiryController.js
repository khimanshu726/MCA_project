import { Enquiry } from "../models/Enquiry.js";
import { sendEnquiryNotification } from "../services/email/resendService.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTITUTION_TYPES = ["school", "college", "university", "other"];
const clip = (value, max) => String(value ?? "").trim().slice(0, max);

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

    const errors = {};
    if (!institutionName) errors.institutionName = "Institution name is required.";
    if (!contactName) errors.contactName = "Contact name is required.";
    if (!EMAIL_RE.test(email)) errors.email = "A valid email is required.";
    if (!requirements) errors.requirements = "Tell us the items and quantities you need.";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Please check the highlighted fields.", errors });
    }

    const enquiry = await Enquiry.create({
      institutionName,
      institutionType,
      contactName,
      email,
      phone,
      requirements,
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
