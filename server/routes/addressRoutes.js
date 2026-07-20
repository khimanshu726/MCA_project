import { Router } from "express";
import {
  createAddressHandler,
  deleteAddressHandler,
  getAddresses,
  setDefaultAddressHandler,
  updateAddressHandler,
} from "../controllers/addressController.js";

const router = Router();

router.get("/", getAddresses);
router.post("/", createAddressHandler);
router.put("/:id", updateAddressHandler);
router.delete("/:id", deleteAddressHandler);
router.patch("/:id/default", setDefaultAddressHandler);

export default router;
