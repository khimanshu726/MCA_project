import { Router } from "express";
import { getCurrentAuthUser } from "../controllers/authController.js";
import { authenticateAdmin } from "../middleware/authenticateAdmin.js";

const router = Router();

router.get("/me", authenticateAdmin, getCurrentAuthUser);

export default router;
