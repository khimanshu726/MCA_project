import { Router } from "express";
import { getCollection, listCollections } from "../controllers/collectionController.js";

const router = Router();

router.get("/", listCollections);
router.get("/:slug", getCollection);

export default router;
