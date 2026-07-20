import { Router } from "express";
import {
  getFrequentlyBoughtTogetherHandler,
  getProductDetail,
  getProducts,
} from "../controllers/productController.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id/frequently-bought-together", getFrequentlyBoughtTogetherHandler);
router.get("/:id", getProductDetail);

export default router;
