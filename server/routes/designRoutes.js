import { Router } from "express";
import {
  deleteDesignById,
  getDesignById,
  getDesigns,
  postDesign,
  postDesignAsset,
  postDuplicateDesign,
  putDesign,
} from "../controllers/designController.js";
import { uploadDesignAsset } from "../middleware/designAssetUpload.js";

const router = Router();

router.get("/", getDesigns);
router.post("/", postDesign);
router.post("/assets", uploadDesignAsset, postDesignAsset);
router.get("/:id", getDesignById);
router.put("/:id", putDesign);
router.post("/:id/duplicate", postDuplicateDesign);
router.delete("/:id", deleteDesignById);

export default router;
