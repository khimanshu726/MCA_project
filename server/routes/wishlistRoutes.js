import { Router } from "express";
import {
  addWishlistItem,
  clearWishlistItems,
  getWishlist,
  removeWishlistItem,
} from "../controllers/wishlistController.js";

const router = Router();

router.get("/", getWishlist);
router.post("/items", addWishlistItem);
router.delete("/items/:productId", removeWishlistItem);
router.delete("/", clearWishlistItems);

export default router;
