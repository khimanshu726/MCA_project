import { Router } from "express";
import { createEnquiry } from "../controllers/enquiryController.js";

const router = Router();

// Public — institutional bulk-quote requests. No auth: institutions submitting a
// quote request may not have (or want) a storefront account.
router.post("/", createEnquiry);

export default router;
