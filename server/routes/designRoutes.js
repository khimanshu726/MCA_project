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
import { requireDurableStorage } from "../config/uploadStorage.js";

const router = Router();

router.get("/", getDesigns);
router.post("/", postDesign);
// Guarded before multer: the file is the whole point of this route, so
// there is nothing to do if we cannot keep it.
router.post("/assets", requireDurableStorage, uploadDesignAsset, postDesignAsset);
router.get("/:id", getDesignById);
router.put("/:id", putDesign);
router.post("/:id/duplicate", postDuplicateDesign);
router.delete("/:id", deleteDesignById);

export default router;
