import { Router } from "express";
import {
  addCartItem,
  clearCartItems,
  getCart,
  mergeCart,
  removeCartItem,
  toggleSaveForLater,
  updateCartItem,
} from "../controllers/cartController.js";

const router = Router();

router.get("/", getCart);
router.post("/items", addCartItem);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.patch("/items/:productId/save-for-later", toggleSaveForLater);
router.delete("/", clearCartItems);
router.post("/merge", mergeCart);

export default router;
