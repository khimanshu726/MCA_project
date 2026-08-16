import { Router } from "express";
import { createEnquiry } from "../controllers/enquiryController.js";
import { uploadEnquirySampleFile } from "../middleware/enquiryUpload.js";
import { rejectFileWhenStorageNotDurable } from "../config/uploadStorage.js";

const router = Router();

// Public — institutional bulk-quote requests. No auth: institutions submitting a
// quote request may not have (or want) a storefront account.
//
// An optional sample file rides in as multipart (field "sampleFile"); multer
// passes plain JSON bodies straight through, so callers without a file are
// unaffected. rejectFileWhenStorageNotDurable refuses an upload we couldn't
// store durably rather than accepting a file that will vanish on redeploy.
router.post("/", uploadEnquirySampleFile, rejectFileWhenStorageNotDurable, createEnquiry);

export default router;
