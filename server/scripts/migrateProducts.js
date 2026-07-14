import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { migrateLegacyProducts } from "../services/productMigration.js";

const run = async () => {
  await connectDB();
  const result = await migrateLegacyProducts();

  console.log("[migrate:products] Storefront seed:", result.storefront);
  console.log("[migrate:products] Admin JSON seed:", result.adminJson);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error("[migrate:products] Failed:", error);
  process.exit(1);
});
